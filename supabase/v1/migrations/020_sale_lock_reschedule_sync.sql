begin;

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
  prior_date date;
  prior_time time;
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

  prior_date := current_row.service_date;
  prior_time := current_row.slot_time;

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

  -- If this appointment belongs to an order, keep the customer-facing
  -- install snapshot synchronized with the active appointment.
  if current_row.order_id is not null then
    update public.orders
    set
      metadata =
        jsonb_set(
          jsonb_set(
            jsonb_set(
              coalesce(metadata, '{}'::jsonb),
              '{installDate}',
              to_jsonb(p_service_date::text),
              true
            ),
            '{installTime}',
            to_jsonb(to_char(p_slot_time, 'HH24:MI')),
            true
          ),
          '{lastInstallReschedule}',
          jsonb_build_object(
            'fromDate', prior_date::text,
            'fromTime', to_char(prior_time, 'HH24:MI'),
            'toDate', p_service_date::text,
            'toTime', to_char(p_slot_time, 'HH24:MI'),
            'appointmentId', p_appointment_id,
            'changedAt', now()
          ),
          true
        ),
      updated_at = now()
    where id = current_row.order_id
      and organization_id = p_organization_id;
  end if;

  return result;
end;
$$;

grant execute on function public.reschedule_appointment(uuid,uuid,date,time) to authenticated;

commit;
