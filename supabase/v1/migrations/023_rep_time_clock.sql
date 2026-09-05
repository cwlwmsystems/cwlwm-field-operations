-- Cwlwm Field Operations v1.1 Phase 15.1
-- Representative time clock + shift-gated field data

create table if not exists public.rep_shift_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  representative_id uuid not null references public.representatives(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  start_latitude double precision,
  start_longitude double precision,
  start_accuracy_meters double precision,
  end_latitude double precision,
  end_longitude double precision,
  end_accuracy_meters double precision,
  source text not null default 'field_app',
  created_at timestamptz not null default now(),
  check ((start_latitude is null) = (start_longitude is null)),
  check ((end_latitude is null) = (end_longitude is null)),
  check (ended_at is null or ended_at >= started_at)
);

create unique index if not exists rep_shift_sessions_one_open_shift_uq
  on public.rep_shift_sessions (organization_id, user_id)
  where ended_at is null;

create index if not exists rep_shift_sessions_org_started_idx
  on public.rep_shift_sessions (organization_id, started_at desc);

create index if not exists rep_shift_sessions_rep_started_idx
  on public.rep_shift_sessions (organization_id, representative_id, started_at desc);

alter table public.rep_shift_sessions enable row level security;

drop policy if exists rep_shift_sessions_select on public.rep_shift_sessions;
create policy rep_shift_sessions_select on public.rep_shift_sessions
for select to authenticated
using (
  user_id = auth.uid()
  or public.has_org_role(
    organization_id,
    array['organization_owner','organization_admin','operations_manager','team_manager']
  )
);

create or replace function public.current_rep_id(p_organization_id uuid)
returns uuid
language sql
stable
security definer
set search_path=public
as $$
  select r.id
  from public.representatives r
  where r.organization_id = p_organization_id
    and r.status = 'active'
    and (
      r.user_id = auth.uid()
      or (
        r.user_id is null
        and lower(coalesce(r.email,'')) = lower(coalesce(auth.jwt()->>'email',''))
      )
    )
  order by case when r.user_id = auth.uid() then 0 else 1 end
  limit 1;
$$;

create or replace function public.has_active_rep_shift(p_organization_id uuid)
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
  );
$$;

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
    jsonb_build_object('representative_id', v_rep, 'started_at', v_row.started_at)
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

revoke all on function public.current_rep_id(uuid) from public;
revoke all on function public.has_active_rep_shift(uuid) from public;
revoke all on function public.clock_in_rep_shift(uuid,double precision,double precision,double precision) from public;
revoke all on function public.clock_out_rep_shift(uuid,double precision,double precision,double precision) from public;

grant execute on function public.current_rep_id(uuid) to authenticated;
grant execute on function public.has_active_rep_shift(uuid) to authenticated;
grant execute on function public.clock_in_rep_shift(uuid,double precision,double precision,double precision) to authenticated;
grant execute on function public.clock_out_rep_shift(uuid,double precision,double precision,double precision) to authenticated;

-- Representatives must be clocked in before address/location rows are visible.
drop policy if exists locations_member_select on public.locations;
drop policy if exists locations_select on public.locations;
drop policy if exists locations_shift_gated_select on public.locations;

create policy locations_shift_gated_select on public.locations
for select to authenticated
using (
  public.is_org_member(organization_id)
  and (
    not public.has_org_role(organization_id, array['representative'])
    or (
      public.has_active_rep_shift(organization_id)
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
