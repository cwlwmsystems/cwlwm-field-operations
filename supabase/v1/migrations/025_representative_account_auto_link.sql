-- Cwlwm Field Operations v1.1 Phase 15.2
-- Make a "representative" organization user automatically usable as a field representative.
--
-- Behavior:
-- 1. Prefer an already-linked representative row.
-- 2. Otherwise link an existing unlinked rep row with the same email.
-- 3. Otherwise create a representative profile automatically.
--
-- This removes the confusing split where an administrator could create a user
-- with role=representative but the field time clock still considered that
-- account "not linked to an active representative profile."

create or replace function public.ensure_current_rep_id(p_organization_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_role text;
  v_rep uuid;
  v_name text;
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
    raise exception 'Only representative accounts can be linked to a field representative profile.';
  end if;

  -- Already linked.
  select r.id into v_rep
  from public.representatives r
  where r.organization_id = p_organization_id
    and r.user_id = v_uid
    and r.status = 'active'
  limit 1;

  if v_rep is not null then
    return v_rep;
  end if;

  -- Reuse an existing unlinked rep record with the same email.
  if v_email <> '' then
    select r.id into v_rep
    from public.representatives r
    where r.organization_id = p_organization_id
      and r.user_id is null
      and lower(coalesce(r.email,'')) = v_email
      and r.status = 'active'
    order by r.created_at
    limit 1
    for update;

    if v_rep is not null then
      update public.representatives
      set user_id = v_uid, updated_at = now()
      where id = v_rep;

      return v_rep;
    end if;
  end if;

  -- No rep profile exists yet. Create one so a representative user created in
  -- Admin > Users is immediately a valid representative account.
  v_name := nullif(trim(coalesce(auth.jwt()->'user_metadata'->>'full_name','')), '');
  if v_name is null then
    v_name := initcap(replace(split_part(coalesce(v_email, 'representative'), '@', 1), '.', ' '));
  end if;
  if v_name is null or v_name = '' then
    v_name := 'Representative';
  end if;

  insert into public.representatives (
    organization_id,
    user_id,
    full_name,
    email,
    status,
    metadata
  ) values (
    p_organization_id,
    v_uid,
    v_name,
    nullif(v_email,''),
    'active',
    jsonb_build_object('auto_created_from_user_account', true)
  )
  returning id into v_rep;

  insert into public.audit_log (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data
  ) values (
    p_organization_id,
    v_uid,
    'representative_profile_auto_created',
    'representative',
    v_rep::text,
    jsonb_build_object('email', nullif(v_email,''), 'full_name', v_name)
  );

  return v_rep;
end;
$$;

revoke all on function public.ensure_current_rep_id(uuid) from public;
grant execute on function public.ensure_current_rep_id(uuid) to authenticated;

-- Keep the read-only helper for RLS checks.
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

-- Update clock-in so it repairs/creates the rep linkage before creating shift.
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

  v_rep := public.ensure_current_rep_id(p_organization_id);

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

revoke all on function public.clock_in_rep_shift(uuid,double precision,double precision,double precision) from public;
grant execute on function public.clock_in_rep_shift(uuid,double precision,double precision,double precision) to authenticated;
