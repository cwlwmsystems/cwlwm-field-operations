begin;

create table public.markets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  state_region text,
  country_code text not null default 'US',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,slug)
);

create table public.territories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  market_id uuid references public.markets(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  name text not null,
  slug text not null,
  state_region text,
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,slug)
);

create table public.representatives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  external_id text,
  full_name text not null,
  email text,
  phone text,
  status text not null default 'active'
    check (status in ('active','inactive','suspended','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index representatives_org_external_uq
  on public.representatives(organization_id, external_id)
  where external_id is not null;

create table public.representative_territories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  representative_id uuid not null references public.representatives(id) on delete cascade,
  territory_id uuid not null references public.territories(id) on delete cascade,
  is_primary boolean not null default false,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  unique(representative_id,territory_id)
);

create table public.interaction_dispositions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  is_active boolean not null default true,
  is_terminal boolean not null default false,
  requires_note boolean not null default false,
  requires_follow_up boolean not null default false,
  marks_contact boolean not null default false,
  marks_sale boolean not null default false,
  blocks_revisit boolean not null default false,
  default_follow_up_days integer,
  sort_order integer not null default 0,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  territory_id uuid references public.territories(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  external_location_id text,
  address1 text not null,
  address2 text,
  city text,
  state_region text,
  postal_code text,
  country_code text not null default 'US',
  latitude numeric(10,7),
  longitude numeric(10,7),
  service_type text,
  serviceability text,
  customer_status text,
  current_disposition_id uuid references public.interaction_dispositions(id) on delete set null,
  current_representative_id uuid references public.representatives(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index locations_org_external_uq
  on public.locations(organization_id, external_location_id)
  where external_location_id is not null;

create table public.location_interactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  representative_id uuid references public.representatives(id) on delete set null,
  territory_id uuid references public.territories(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  disposition_id uuid references public.interaction_dispositions(id) on delete set null,
  interaction_type text not null default 'field_visit',
  note text,
  decision_maker_contacted boolean,
  follow_up_needed boolean,
  follow_up_at timestamptz,
  occurred_at timestamptz not null default now(),
  source_system text not null default 'app',
  client_submission_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index location_interactions_client_uq
  on public.location_interactions(organization_id,client_submission_id)
  where client_submission_id is not null;

create index locations_org_territory_idx on public.locations(organization_id,territory_id);
create index interactions_org_location_idx on public.location_interactions(organization_id,location_id,occurred_at desc);

commit;
