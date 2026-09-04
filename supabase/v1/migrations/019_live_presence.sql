-- Cwlwm Field Operations v1.1 Phase 7 — live presence and dispatcher map visibility

create table if not exists public.live_presence (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  representative_id uuid references public.representatives(id) on delete set null,
  email text,
  role text,
  page_path text,
  latitude double precision,
  longitude double precision,
  accuracy_meters double precision,
  location_updated_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table public.live_presence enable row level security;

drop policy if exists live_presence_select on public.live_presence;
create policy live_presence_select on public.live_presence
for select to authenticated
using (
  user_id = auth.uid()
  or public.has_org_role(
    organization_id,
    array['organization_owner','organization_admin','operations_manager','team_manager']
  )
);

drop policy if exists live_presence_insert on public.live_presence;
create policy live_presence_insert on public.live_presence
for insert to authenticated
with check (user_id = auth.uid() and public.is_org_member(organization_id));

drop policy if exists live_presence_update on public.live_presence;
create policy live_presence_update on public.live_presence
for update to authenticated
using (user_id = auth.uid() and public.is_org_member(organization_id))
with check (user_id = auth.uid() and public.is_org_member(organization_id));

create index if not exists live_presence_org_seen_idx
  on public.live_presence (organization_id, last_seen_at desc);
create index if not exists live_presence_rep_idx
  on public.live_presence (organization_id, representative_id)
  where representative_id is not null;

create or replace function public.touch_live_presence(
  p_organization_id uuid,
  p_page_path text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_meters double precision default null
)
returns public.live_presence
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := nullif(auth.jwt()->>'email', '');
  v_role text;
  v_rep uuid;
  v_row public.live_presence;
begin
  if v_uid is null then
    raise exception 'Authentication required.';
  end if;

  select m.role
    into v_role
  from public.organization_memberships m
  where m.organization_id = p_organization_id
    and m.user_id = v_uid
    and m.is_active
  limit 1;

  if v_role is null then
    raise exception 'Active organization membership required.';
  end if;

  if v_email is not null then
    select r.id
      into v_rep
    from public.representatives r
    where r.organization_id = p_organization_id
      and lower(r.email) = lower(v_email)
      and r.status = 'active'
    limit 1;
  end if;

  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'Latitude and longitude must be supplied together.';
  end if;

  insert into public.live_presence (
    organization_id,
    user_id,
    representative_id,
    email,
    role,
    page_path,
    latitude,
    longitude,
    accuracy_meters,
    location_updated_at,
    last_seen_at
  ) values (
    p_organization_id,
    v_uid,
    v_rep,
    v_email,
    v_role,
    nullif(trim(p_page_path), ''),
    p_latitude,
    p_longitude,
    p_accuracy_meters,
    case when p_latitude is not null then now() else null end,
    now()
  )
  on conflict (organization_id, user_id)
  do update set
    representative_id = coalesce(excluded.representative_id, public.live_presence.representative_id),
    email = coalesce(excluded.email, public.live_presence.email),
    role = excluded.role,
    page_path = coalesce(excluded.page_path, public.live_presence.page_path),
    latitude = coalesce(excluded.latitude, public.live_presence.latitude),
    longitude = coalesce(excluded.longitude, public.live_presence.longitude),
    accuracy_meters = coalesce(excluded.accuracy_meters, public.live_presence.accuracy_meters),
    location_updated_at = case
      when excluded.latitude is not null then now()
      else public.live_presence.location_updated_at
    end,
    last_seen_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.touch_live_presence(uuid,text,double precision,double precision,double precision) to authenticated;
