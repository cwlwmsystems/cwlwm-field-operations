begin;

create or replace function public.get_slot_capacity(
  p_organization_id uuid,
  p_territory_id uuid,
  p_service_date date,
  p_slot_time time
)
returns integer
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  policy_row public.scheduling_policies%rowtype;
  override_capacity integer;
  is_blackout boolean;
  weekday_number integer;
  requested_at timestamptz;
begin
  select *
  into policy_row
  from public.scheduling_policies
  where organization_id = p_organization_id
    and territory_id = p_territory_id
    and is_active
  order by created_at desc
  limit 1;

  if not found then return 0; end if;

  weekday_number := extract(dow from p_service_date)::integer;

  if not (weekday_number = any(policy_row.allowed_weekdays)) then
    return 0;
  end if;

  if not (p_slot_time = any(policy_row.slot_times)) then
    return 0;
  end if;

  requested_at := (p_service_date::text || ' ' || p_slot_time::text)::timestamp
    at time zone policy_row.timezone;

  if requested_at < now() + make_interval(mins => policy_row.minimum_lead_minutes) then
    return 0;
  end if;

  select exists(
    select 1
    from public.scheduling_overrides
    where organization_id = p_organization_id
      and territory_id = p_territory_id
      and service_date = p_service_date
      and override_type = 'blackout'
      and (slot_time is null or slot_time = p_slot_time)
  ) into is_blackout;

  if is_blackout then return 0; end if;

  select capacity
  into override_capacity
  from public.scheduling_overrides
  where organization_id = p_organization_id
    and territory_id = p_territory_id
    and service_date = p_service_date
    and slot_time = p_slot_time
    and override_type = 'capacity'
  limit 1;

  return coalesce(override_capacity, policy_row.default_capacity);
end;
$$;

create or replace function public.reschedule_appointment(
  p_organization_id uuid,
  p_appointment_id uuid,
  p_service_date date,
  p_slot_time time
)
returns public.appointments
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_row public.appointments;
  capacity integer;
  booked integer;
  result public.appointments;
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'not authorized for organization';
  end if;

  select *
  into current_row
  from public.appointments
  where id = p_appointment_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'appointment not found';
  end if;

  if current_row.status in ('cancelled','completed') then
    raise exception 'appointment cannot be rescheduled from status %', current_row.status;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_organization_id::text || ':' ||
    current_row.territory_id::text || ':' ||
    p_service_date::text || ':' ||
    p_slot_time::text, 0
  ));

  capacity := public.get_slot_capacity(
    p_organization_id,
    current_row.territory_id,
    p_service_date,
    p_slot_time
  );

  if capacity <= 0 then
    raise exception 'slot unavailable';
  end if;

  select count(*)
  into booked
  from public.appointments
  where organization_id = p_organization_id
    and territory_id = current_row.territory_id
    and service_date = p_service_date
    and slot_time = p_slot_time
    and status in ('scheduled','completed')
    and id <> p_appointment_id;

  if booked >= capacity then
    raise exception 'slot capacity reached';
  end if;

  update public.appointments
  set
    service_date = p_service_date,
    slot_time = p_slot_time,
    status = 'scheduled',
    updated_at = now()
  where id = p_appointment_id
    and organization_id = p_organization_id
  returning * into result;

  return result;
end;
$$;

create or replace function public.set_appointment_status(
  p_organization_id uuid,
  p_appointment_id uuid,
  p_status text
)
returns public.appointments
language plpgsql
security invoker
set search_path = public
as $$
declare
  result public.appointments;
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'not authorized for organization';
  end if;

  if p_status not in ('scheduled','completed','cancelled','no_show') then
    raise exception 'unsupported appointment status';
  end if;

  update public.appointments
  set status = p_status, updated_at = now()
  where id = p_appointment_id
    and organization_id = p_organization_id
  returning * into result;

  if not found then
    raise exception 'appointment not found';
  end if;

  return result;
end;
$$;

grant execute on function public.reschedule_appointment(uuid,uuid,date,time) to authenticated;
grant execute on function public.set_appointment_status(uuid,uuid,text) to authenticated;

commit;
