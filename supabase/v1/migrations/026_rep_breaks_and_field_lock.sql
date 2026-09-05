-- Cwlwm Field Operations v1.1 Phase 15.3
-- Unpaid break tracking, break-gated field data, and net worked-time support.

create table if not exists public.rep_shift_breaks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shift_session_id uuid not null references public.rep_shift_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  representative_id uuid not null references public.representatives(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create unique index if not exists rep_shift_breaks_one_open_break_uq
  on public.rep_shift_breaks (shift_session_id)
  where ended_at is null;

create index if not exists rep_shift_breaks_org_started_idx
  on public.rep_shift_breaks (organization_id, started_at desc);

alter table public.rep_shift_breaks enable row level security;

drop policy if exists rep_shift_breaks_select on public.rep_shift_breaks;
create policy rep_shift_breaks_select on public.rep_shift_breaks
for select to authenticated
using (
  user_id = auth.uid()
  or public.has_org_role(
    organization_id,
    array['organization_owner','organization_admin','operations_manager','team_manager']
  )
);

create or replace function public.current_rep_break(p_organization_id uuid)
returns public.rep_shift_breaks
language sql
stable
security definer
set search_path=public
as $$
  select b
  from public.rep_shift_breaks b
  join public.rep_shift_sessions s on s.id = b.shift_session_id
  where b.organization_id = p_organization_id
    and b.user_id = auth.uid()
    and b.ended_at is null
    and s.ended_at is null
  order by b.started_at desc
  limit 1;
$$;

create or replace function public.rep_field_access_active(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
    from public.rep_shift_sessions s
    where s.organization_id = p_organization_id
      and s.user_id = auth.uid()
      and s.ended_at is null
  )
  and not exists (
    select 1
    from public.rep_shift_breaks b
    join public.rep_shift_sessions s on s.id = b.shift_session_id
    where b.organization_id = p_organization_id
      and b.user_id = auth.uid()
      and b.ended_at is null
      and s.ended_at is null
  );
$$;

create or replace function public.start_rep_break(p_organization_id uuid)
returns public.rep_shift_breaks
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_shift public.rep_shift_sessions;
  v_row public.rep_shift_breaks;
begin
  if v_uid is null then
    raise exception 'Authentication required.';
  end if;

  select * into v_shift
  from public.rep_shift_sessions
  where organization_id = p_organization_id
    and user_id = v_uid
    and ended_at is null
  order by started_at desc
  limit 1
  for update;

  if v_shift.id is null then
    raise exception 'Clock in before starting a break.';
  end if;

  select * into v_row
  from public.rep_shift_breaks
  where shift_session_id = v_shift.id
    and ended_at is null
  limit 1;

  if v_row.id is not null then
    return v_row;
  end if;

  insert into public.rep_shift_breaks (
    organization_id,
    shift_session_id,
    user_id,
    representative_id
  ) values (
    p_organization_id,
    v_shift.id,
    v_uid,
    v_shift.representative_id
  )
  returning * into v_row;

  insert into public.audit_log (
    organization_id, actor_user_id, action, entity_type, entity_id, after_data
  ) values (
    p_organization_id,
    v_uid,
    'rep_break_started',
    'rep_shift_break',
    v_row.id::text,
    jsonb_build_object(
      'shift_session_id', v_shift.id,
      'representative_id', v_shift.representative_id,
      'started_at', v_row.started_at
    )
  );

  return v_row;
end;
$$;

create or replace function public.end_rep_break(p_organization_id uuid)
returns public.rep_shift_breaks
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.rep_shift_breaks;
begin
  if v_uid is null then
    raise exception 'Authentication required.';
  end if;

  select b.* into v_row
  from public.rep_shift_breaks b
  join public.rep_shift_sessions s on s.id = b.shift_session_id
  where b.organization_id = p_organization_id
    and b.user_id = v_uid
    and b.ended_at is null
    and s.ended_at is null
  order by b.started_at desc
  limit 1
  for update of b;

  if v_row.id is null then
    raise exception 'No active break found.';
  end if;

  update public.rep_shift_breaks
  set ended_at = now()
  where id = v_row.id
  returning * into v_row;

  insert into public.audit_log (
    organization_id, actor_user_id, action, entity_type, entity_id, after_data
  ) values (
    p_organization_id,
    v_uid,
    'rep_break_ended',
    'rep_shift_break',
    v_row.id::text,
    jsonb_build_object(
      'shift_session_id', v_row.shift_session_id,
      'representative_id', v_row.representative_id,
      'started_at', v_row.started_at,
      'ended_at', v_row.ended_at,
      'duration_seconds', extract(epoch from (v_row.ended_at - v_row.started_at))::bigint
    )
  );

  return v_row;
end;
$$;

-- If a rep clocks out while a break is open, close the break at the same moment.
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
  v_now timestamptz := now();
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

  update public.rep_shift_breaks
  set ended_at = v_now
  where shift_session_id = v_row.id
    and ended_at is null;

  update public.rep_shift_sessions
  set
    ended_at = v_now,
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

-- Replace the representative location policy so an unpaid break locks field data.
drop policy if exists locations_shift_gated_select on public.locations;
create policy locations_shift_gated_select on public.locations
for select to authenticated
using (
  public.is_org_member(organization_id)
  and (
    not public.has_org_role(organization_id, array['representative'])
    or (
      public.rep_field_access_active(organization_id)
      and exists (
        select 1
        from public.representatives r
        where r.id = public.current_rep_id(organization_id)
          and r.organization_id = locations.organization_id
          and (
            locations.current_representative_id = r.id
            or exists (
              select 1
              from public.representative_territories rt
              where rt.organization_id = locations.organization_id
                and rt.representative_id = r.id
                and rt.territory_id = locations.territory_id
                and rt.unassigned_at is null
            )
          )
      )
    )
  )
);

revoke all on function public.current_rep_break(uuid) from public;
revoke all on function public.rep_field_access_active(uuid) from public;
revoke all on function public.start_rep_break(uuid) from public;
revoke all on function public.end_rep_break(uuid) from public;

grant execute on function public.current_rep_break(uuid) to authenticated;
grant execute on function public.rep_field_access_active(uuid) to authenticated;
grant execute on function public.start_rep_break(uuid) to authenticated;
grant execute on function public.end_rep_break(uuid) to authenticated;
