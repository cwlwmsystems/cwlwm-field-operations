-- Cwlwm Field Operations v1.1 Phase 15.5
-- Fix representative order submission after shift-gated location RLS.
--
-- Why:
-- submit_order was SECURITY INVOKER and did:
--   SELECT ... FROM locations ... FOR UPDATE
--
-- Representatives can SELECT their assigned locations only while clocked in,
-- but the row lock can also be affected by the caller's row-level policies.
-- The result was the misleading:
--   "location not found in organization"
-- even though the rep had just opened the location from Field Workspace.
--
-- Fix:
-- make submit_order SECURITY DEFINER and explicitly enforce authorization,
-- shift state, rep identity, and location assignment inside the function.

create or replace function public.submit_order(
  p_organization_id uuid,
  p_client_submission_id uuid,
  p_sales_attempt_id uuid,
  p_location_id uuid,
  p_representative_id uuid,
  p_team_id uuid,
  p_territory_id uuid,
  p_customer_first_name text,
  p_customer_last_name text,
  p_customer_email text,
  p_customer_phone text,
  p_product_id uuid,
  p_offer_id uuid
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.orders;
  result public.orders;
  location_row public.locations;
  product_row public.products;
  offer_row public.offers;
  submitted_stage uuid;
  v_uid uuid := auth.uid();
  v_role text;
  v_current_rep uuid;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select m.role into v_role
  from public.organization_memberships m
  where m.organization_id = p_organization_id
    and m.user_id = v_uid
    and m.is_active
  limit 1;

  if v_role is null then
    raise exception 'not authorized for organization';
  end if;

  if v_role not in (
    'organization_owner',
    'organization_admin',
    'operations_manager',
    'team_manager',
    'representative'
  ) then
    raise exception 'not authorized to submit orders';
  end if;

  -- Idempotency first.
  select * into existing
  from public.orders
  where organization_id = p_organization_id
    and client_submission_id = p_client_submission_id;

  if found then
    return existing;
  end if;

  -- Lock the actual location row while bypassing caller RLS. Authorization is
  -- enforced explicitly below before any order is created.
  select * into location_row
  from public.locations
  where id = p_location_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'location not found in organization';
  end if;

  if v_role = 'representative' then
    if not public.has_active_rep_shift(p_organization_id) then
      raise exception 'clock in before submitting an order';
    end if;

    if to_regprocedure('public.rep_field_access_active(uuid)') is not null then
      if not public.rep_field_access_active(p_organization_id) then
        raise exception 'end your break before submitting an order';
      end if;
    end if;

    v_current_rep := public.current_rep_id(p_organization_id);

    if v_current_rep is null then
      raise exception 'representative profile is not linked';
    end if;

    if p_representative_id is null or p_representative_id <> v_current_rep then
      raise exception 'order representative does not match signed-in representative';
    end if;

    -- Rep can only sell an address assigned directly to them or in one of
    -- their active territory assignments.
    if not (
      location_row.current_representative_id = v_current_rep
      or exists (
        select 1
        from public.representative_territories rt
        where rt.organization_id = p_organization_id
          and rt.representative_id = v_current_rep
          and rt.territory_id = location_row.territory_id
          and rt.unassigned_at is null
      )
    ) then
      raise exception 'location is not assigned to this representative';
    end if;
  end if;

  -- Never trust route/form snapshots for organization ownership.
  if p_territory_id is not null and p_territory_id <> location_row.territory_id then
    raise exception 'territory does not match location';
  end if;

  if p_team_id is not null
     and location_row.team_id is not null
     and p_team_id <> location_row.team_id then
    raise exception 'team does not match location';
  end if;

  select * into product_row
  from public.products
  where id = p_product_id
    and organization_id = p_organization_id
    and is_active;

  if not found then
    raise exception 'active product not found';
  end if;

  select * into offer_row
  from public.offers
  where id = p_offer_id
    and organization_id = p_organization_id
    and is_active;

  if not found then
    raise exception 'active offer not found';
  end if;

  if offer_row.product_id is not null and offer_row.product_id <> product_row.id then
    raise exception 'offer does not belong to selected product';
  end if;

  if p_sales_attempt_id is not null and not exists (
    select 1
    from public.sales_attempts sa
    where sa.id = p_sales_attempt_id
      and sa.organization_id = p_organization_id
      and sa.location_id = p_location_id
  ) then
    raise exception 'sales attempt does not match organization and location';
  end if;

  insert into public.orders(
    organization_id,
    client_submission_id,
    sales_attempt_id,
    location_id,
    representative_id,
    team_id,
    territory_id,
    customer_first_name,
    customer_last_name,
    customer_email,
    customer_phone,
    product_id,
    offer_id,
    product_snapshot,
    offer_snapshot,
    recurring_price,
    one_time_price
  )
  values(
    p_organization_id,
    p_client_submission_id,
    p_sales_attempt_id,
    p_location_id,
    coalesce(p_representative_id, location_row.current_representative_id),
    coalesce(p_team_id, location_row.team_id),
    coalesce(p_territory_id, location_row.territory_id),
    p_customer_first_name,
    p_customer_last_name,
    p_customer_email,
    p_customer_phone,
    p_product_id,
    p_offer_id,
    jsonb_build_object(
      'id', product_row.id,
      'code', product_row.code,
      'name', product_row.name,
      'category', product_row.category,
      'service_level', product_row.service_level
    ),
    jsonb_build_object(
      'id', offer_row.id,
      'code', offer_row.code,
      'name', offer_row.name,
      'recurring_price', offer_row.recurring_price,
      'one_time_price', offer_row.one_time_price,
      'term_months', offer_row.term_months,
      'terms', offer_row.terms
    ),
    offer_row.recurring_price,
    offer_row.one_time_price
  )
  returning * into result;

  if p_sales_attempt_id is not null then
    update public.sales_attempts
    set
      status = 'converted',
      converted_order_id = result.id,
      converted_at = now(),
      updated_at = now()
    where id = p_sales_attempt_id
      and organization_id = p_organization_id;
  end if;

  select id into submitted_stage
  from public.lifecycle_stages
  where organization_id = p_organization_id
    and code = 'submitted'
    and is_active
  limit 1;

  if submitted_stage is not null then
    insert into public.lifecycle_events(
      organization_id,
      order_id,
      lifecycle_stage_id,
      source,
      detail
    )
    values(
      p_organization_id,
      result.id,
      submitted_stage,
      'system',
      'Order created in Cwlwm Field Operations.'
    );
  end if;

  return result;

exception
  when unique_violation then
    select * into existing
    from public.orders
    where organization_id = p_organization_id
      and client_submission_id = p_client_submission_id;

    if found then
      return existing;
    end if;

    raise;
end;
$$;

revoke all on function public.submit_order(
  uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,uuid,uuid
) from public;

grant execute on function public.submit_order(
  uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,uuid,uuid
) to authenticated;
