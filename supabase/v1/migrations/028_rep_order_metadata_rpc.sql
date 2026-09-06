-- Cwlwm Field Operations v1.1 Phase 15.6
-- Allow a representative to save metadata on the order they just submitted
-- without granting general UPDATE access to orders.

create or replace function public.set_submitted_order_metadata(
  p_organization_id uuid,
  p_order_id uuid,
  p_notes text default '',
  p_install_date text default '',
  p_install_time text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_current_rep uuid;
  v_order public.orders;
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

  select * into v_order
  from public.orders
  where id = p_order_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'order not found in organization';
  end if;

  if v_role = 'representative' then
    v_current_rep := public.current_rep_id(p_organization_id);

    if v_current_rep is null then
      raise exception 'representative profile is not linked';
    end if;

    if v_order.representative_id is distinct from v_current_rep then
      raise exception 'representative may only update metadata for their own submitted order';
    end if;

    if not public.has_active_rep_shift(p_organization_id) then
      raise exception 'clock in before updating submitted order details';
    end if;

    if to_regprocedure('public.rep_field_access_active(uuid)') is not null
       and not public.rep_field_access_active(p_organization_id) then
      raise exception 'end your break before updating submitted order details';
    end if;
  elsif v_role not in (
    'organization_owner',
    'organization_admin',
    'operations_manager',
    'team_manager'
  ) then
    raise exception 'not authorized to update submitted order details';
  end if;

  update public.orders
  set metadata =
    coalesce(metadata, '{}'::jsonb)
    || jsonb_build_object(
      'notes', coalesce(p_notes, ''),
      'installDate', coalesce(p_install_date, ''),
      'installTime', coalesce(p_install_time, '')
    )
  where id = p_order_id
    and organization_id = p_organization_id;

  return p_order_id;
end;
$$;

revoke all on function public.set_submitted_order_metadata(uuid,uuid,text,text,text) from public;
grant execute on function public.set_submitted_order_metadata(uuid,uuid,text,text,text) to authenticated;
