begin;

create or replace function public.record_lifecycle_stage(
  p_organization_id uuid,
  p_order_id uuid,
  p_lifecycle_stage_id uuid,
  p_detail text default null,
  p_occurred_at timestamptz default now()
)
returns public.lifecycle_events
language plpgsql
security invoker
set search_path = public
as $$
declare
  order_row public.orders;
  stage_row public.lifecycle_stages;
  current_row record;
  appointment_row public.appointments;
  result public.lifecycle_events;
begin
  if not public.has_org_role(
    p_organization_id,
    array['organization_owner','organization_admin','operations_manager']
  ) then
    raise exception 'not authorized for lifecycle operation';
  end if;

  select *
  into order_row
  from public.orders
  where id = p_order_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  select *
  into stage_row
  from public.lifecycle_stages
  where id = p_lifecycle_stage_id
    and organization_id = p_organization_id
    and is_active;

  if not found then
    raise exception 'active lifecycle stage not found';
  end if;

  select *
  into current_row
  from public.order_lifecycle_current
  where organization_id = p_organization_id
    and order_id = p_order_id;

  if current_row.lifecycle_stage_id = stage_row.id then
    raise exception 'order is already in lifecycle stage %', stage_row.name;
  end if;

  if current_row.lifecycle_category in ('activated','cancelled','closed') then
    raise exception 'terminal lifecycle stage % cannot be changed', current_row.lifecycle_name;
  end if;

  -- Operational side-effects remain in the same transaction as the lifecycle event.
  if stage_row.category in ('installed','activated') then
    select *
    into appointment_row
    from public.appointments
    where organization_id = p_organization_id
      and order_id = p_order_id
      and status in ('scheduled','no_show')
    order by service_date desc, slot_time desc
    limit 1
    for update;

    if found then
      update public.appointments
      set status = 'completed', updated_at = now()
      where id = appointment_row.id;
    end if;
  elsif stage_row.category = 'cancelled' then
    update public.appointments
    set status = 'cancelled', updated_at = now()
    where organization_id = p_organization_id
      and order_id = p_order_id
      and status = 'scheduled';

    update public.orders
    set status = 'cancelled', updated_at = now()
    where id = p_order_id
      and organization_id = p_organization_id;
  end if;

  if stage_row.category = 'activated' then
    update public.orders
    set status = 'closed', updated_at = now()
    where id = p_order_id
      and organization_id = p_organization_id;
  end if;

  insert into public.lifecycle_events(
    organization_id,
    order_id,
    lifecycle_stage_id,
    source,
    detail,
    occurred_at
  )
  values(
    p_organization_id,
    p_order_id,
    stage_row.id,
    'manual',
    coalesce(nullif(trim(p_detail),''),'Manual lifecycle update.'),
    coalesce(p_occurred_at,now())
  )
  returning * into result;

  return result;
end;
$$;

create or replace function public.resolve_lifecycle_exception(
  p_organization_id uuid,
  p_exception_id uuid,
  p_status text
)
returns public.lifecycle_exceptions
language plpgsql
security invoker
set search_path = public
as $$
declare
  result public.lifecycle_exceptions;
begin
  if not public.has_org_role(
    p_organization_id,
    array['organization_owner','organization_admin','operations_manager']
  ) then
    raise exception 'not authorized for lifecycle operation';
  end if;

  if p_status not in ('resolved','dismissed') then
    raise exception 'unsupported exception status';
  end if;

  update public.lifecycle_exceptions
  set
    status = p_status,
    resolved_at = case when p_status = 'resolved' then now() else resolved_at end
  where id = p_exception_id
    and organization_id = p_organization_id
  returning * into result;

  if not found then
    raise exception 'lifecycle exception not found';
  end if;

  return result;
end;
$$;

grant execute on function public.record_lifecycle_stage(uuid,uuid,uuid,text,timestamptz) to authenticated;
grant execute on function public.resolve_lifecycle_exception(uuid,uuid,text) to authenticated;

notify pgrst, 'reload schema';

commit;
