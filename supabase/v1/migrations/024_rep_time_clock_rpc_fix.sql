-- Cwlwm Field Operations v1.1 Phase 15.1
-- Fix time-clock audit writes for databases where migration 023 is already installed.
--
-- audit_log uses after_data, not new_value.

create or replace function public.clock_in_rep_shift(
  p_organization_id uuid,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_meters double precision default null
)
returns public.rep_shift_sessions
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_rep uuid;
  v_row public.rep_shift_sessions;
begin
  if v_uid is null then
    raise exception 'Authentication required.';
  end if;

  select m.role into v_role
  from public.organization_memberships m
  where m.organization_id = p_organization_id
    and m.user_id = v_uid
    and m.is_active
  limit 1;

  if v_role <> 'representative' then
    raise exception 'Only representative accounts use the field time clock.';
  end if;

  v_rep := public.current_rep_id(p_organization_id);
  if v_rep is null then
    raise exception 'This account is not linked to an active representative profile.';
  end if;

  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'Latitude and longitude must be supplied together.';
  end if;

  select * into v_row
  from public.rep_shift_sessions
  where organization_id = p_organization_id
    and user_id = v_uid
    and ended_at is null
  limit 1;

  if v_row.id is not null then
    return v_row;
  end if;

  insert into public.rep_shift_sessions (
    organization_id, user_id, representative_id,
    start_latitude, start_longitude, start_accuracy_meters
  ) values (
    p_organization_id, v_uid, v_rep,
    p_latitude, p_longitude, p_accuracy_meters
  )
  returning * into v_row;

  insert into public.audit_log (
    organization_id, actor_user_id, action, entity_type, entity_id, after_data
  ) values (
    p_organization_id, v_uid, 'rep_clocked_in', 'rep_shift_session', v_row.id::text,
    jsonb_build_object(
      'representative_id', v_rep,
      'started_at', v_row.started_at
    )
  );

  return v_row;
end;
$$;

create or replace function public.clock_out_rep_shift(
  p_organization_id uuid,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_meters double precision default null
)
returns public.rep_shift_sessions
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.rep_shift_sessions;
begin
  if v_uid is null then
    raise exception 'Authentication required.';
  end if;

  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'Latitude and longitude must be supplied together.';
  end if;

  select * into v_row
  from public.rep_shift_sessions
  where organization_id = p_organization_id
    and user_id = v_uid
    and ended_at is null
  order by started_at desc
  limit 1
  for update;

  if v_row.id is null then
    raise exception 'No active shift found.';
  end if;

  update public.rep_shift_sessions
  set
    ended_at = now(),
    end_latitude = p_latitude,
    end_longitude = p_longitude,
    end_accuracy_meters = p_accuracy_meters
  where id = v_row.id
  returning * into v_row;

  insert into public.audit_log (
    organization_id, actor_user_id, action, entity_type, entity_id, after_data
  ) values (
    p_organization_id, v_uid, 'rep_clocked_out', 'rep_shift_session', v_row.id::text,
    jsonb_build_object(
      'representative_id', v_row.representative_id,
      'started_at', v_row.started_at,
      'ended_at', v_row.ended_at,
      'duration_seconds', extract(epoch from (v_row.ended_at - v_row.started_at))::bigint
    )
  );

  return v_row;
end;
$$;

revoke all on function public.clock_in_rep_shift(uuid,double precision,double precision,double precision) from public;
revoke all on function public.clock_out_rep_shift(uuid,double precision,double precision,double precision) from public;
grant execute on function public.clock_in_rep_shift(uuid,double precision,double precision,double precision) to authenticated;
grant execute on function public.clock_out_rep_shift(uuid,double precision,double precision,double precision) to authenticated;
