-- Cwlwm Field Operations
-- Clean generic schema foundation v0.1
-- Intended for a NEW Supabase/Postgres project.
-- Do not run against the existing employer production database.

create extension if not exists pgcrypto;

-- ============================================================
-- HELPERS
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- ORGANIZATIONS / ACCESS
-- ============================================================

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active'
    check (status in ('active','suspended','archived')),
  timezone text not null default 'America/New_York',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer'
    check (role in (
      'organization_owner',
      'organization_admin',
      'operations_manager',
      'team_manager',
      'representative',
      'analyst',
      'viewer'
    )),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  team_type text not null default 'internal'
    check (team_type in ('internal','vendor','partner','contractor','other')),
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_role text not null default 'member'
    check (team_role in ('manager','member','viewer')),
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

-- ============================================================
-- MARKETS / TERRITORIES
-- ============================================================

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
  unique (organization_id, slug)
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
  unique (organization_id, slug)
);

create table public.territory_boundaries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  territory_id uuid not null references public.territories(id) on delete cascade,
  storage_bucket text,
  storage_path text,
  file_type text,
  geometry_geojson jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- REPRESENTATIVES
-- ============================================================

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

create unique index representatives_org_external_id_uq
on public.representatives (organization_id, external_id)
where external_id is not null;

create table public.representative_territories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  representative_id uuid not null references public.representatives(id) on delete cascade,
  territory_id uuid not null references public.territories(id) on delete cascade,
  is_primary boolean not null default false,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  unique (representative_id, territory_id)
);

-- ============================================================
-- LOCATIONS / LEADS
-- ============================================================

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
  current_disposition_id uuid,
  current_representative_id uuid references public.representatives(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index locations_org_external_location_id_uq
on public.locations (organization_id, external_location_id)
where external_location_id is not null;

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
  unique (organization_id, code)
);

alter table public.locations
  add constraint locations_current_disposition_fk
  foreign key (current_disposition_id)
  references public.interaction_dispositions(id)
  on delete set null;

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

create unique index location_interactions_submission_uq
on public.location_interactions (organization_id, client_submission_id)
where client_submission_id is not null;

-- ============================================================
-- PRODUCT / OFFER CATALOG
-- ============================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  category text,
  service_level text,
  base_recurring_price numeric(12,2),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  territory_id uuid references public.territories(id) on delete set null,
  code text not null,
  name text not null,
  badge text,
  active_start timestamptz,
  active_end timestamptz,
  is_active boolean not null default true,
  priority integer not null default 0,
  phases jsonb not null default '[]'::jsonb,
  charges jsonb not null default '[]'::jsonb,
  disclosure text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

-- ============================================================
-- SALES ATTEMPTS / ORDERS
-- ============================================================

create table public.sales_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_attempt_id uuid not null,
  location_id uuid not null references public.locations(id) on delete cascade,
  representative_id uuid references public.representatives(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  territory_id uuid references public.territories(id) on delete set null,
  first_name text,
  last_name text,
  phone text,
  email text,
  notes text,
  product_id uuid references public.products(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  offer_snapshot jsonb,
  progress_step integer not null default 0,
  progress_stage text,
  attempt_status text not null default 'in_progress'
    check (attempt_status in ('in_progress','abandoned','converted','expired')),
  final_disposition_id uuid references public.interaction_dispositions(id) on delete set null,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  abandoned_at timestamptz,
  converted_at timestamptz,
  source_system text not null default 'app',
  unique (organization_id, client_attempt_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_submission_id uuid,
  location_id uuid not null references public.locations(id) on delete restrict,
  representative_id uuid references public.representatives(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  territory_id uuid references public.territories(id) on delete set null,
  sales_attempt_id uuid references public.sales_attempts(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  customer_name text,
  phone text,
  email text,
  product_name_snapshot text,
  offer_snapshot jsonb,
  pricing_snapshot jsonb,
  notes text,
  order_status text not null default 'submitted',
  review_status text not null default 'pending',
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  source_system text not null default 'app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index orders_client_submission_uq
on public.orders (organization_id, client_submission_id)
where client_submission_id is not null;

-- ============================================================
-- SCHEDULING
-- ============================================================

create table public.scheduling_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  territory_id uuid references public.territories(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  name text not null,
  allowed_weekdays smallint[] not null default array[1,2,3,4,5],
  default_capacity integer not null default 1 check (default_capacity >= 0),
  minimum_lead_minutes integer not null default 0,
  settings jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointment_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  territory_id uuid not null references public.territories(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  policy_id uuid references public.scheduling_policies(id) on delete set null,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  capacity integer not null default 1 check (capacity >= 0),
  booked_count integer not null default 0 check (booked_count >= 0),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slot_end > slot_start),
  check (booked_count <= capacity)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_slot_id uuid references public.appointment_slots(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  location_id uuid not null references public.locations(id) on delete restrict,
  representative_id uuid references public.representatives(id) on delete set null,
  status text not null default 'booked'
    check (status in ('booked','confirmed','rescheduled','completed','cancelled','no_show')),
  customer_name text,
  phone text,
  email text,
  notes text,
  source_system text not null default 'app',
  external_appointment_id text,
  client_submission_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index appointments_client_submission_uq
on public.appointments (organization_id, client_submission_id)
where client_submission_id is not null;

-- ============================================================
-- LIFECYCLE / INTEGRATIONS
-- ============================================================

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_type text not null,
  name text not null,
  status text not null default 'active'
    check (status in ('active','inactive','error')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lifecycle_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  category text,
  sort_order integer not null default 0,
  is_terminal boolean not null default false,
  is_active boolean not null default true,
  unique (organization_id, code)
);

create table public.order_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  integration_id uuid references public.integrations(id) on delete set null,
  stage_id uuid references public.lifecycle_stages(id) on delete set null,
  external_event_id text,
  external_status text,
  detail text,
  payload jsonb,
  source_updated_at timestamptz,
  received_at timestamptz not null default now()
);

create unique index lifecycle_external_event_uq
on public.order_lifecycle_events (organization_id, integration_id, external_event_id)
where external_event_id is not null;

create table public.external_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  entity_type text not null,
  internal_entity_id uuid not null,
  external_id text not null,
  external_status text,
  payload jsonb,
  synced_at timestamptz,
  unique (integration_id, entity_type, external_id)
);

-- ============================================================
-- FINANCE / ADJUSTMENTS
-- ============================================================

create table public.invoice_sequences (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  prefix text not null default 'INV-',
  next_number bigint not null default 1,
  padding integer not null default 6,
  updated_at timestamptz not null default now()
);

create table public.invoice_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_number bigint not null,
  invoice_id text not null,
  team_id uuid references public.teams(id) on delete set null,
  sales_count integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft','finalized','exported','voided')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  notes text,
  unique (organization_id, invoice_id)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_batch_id uuid not null references public.invoice_batches(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  amount numeric(12,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (invoice_batch_id, order_id)
);

create table public.adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  adjustment_type text not null,
  reason text,
  amount numeric(12,2),
  status text not null default 'open'
    check (status in ('open','approved','credited','voided','closed')),
  source_event_id uuid references public.order_lifecycle_events(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- NOTIFICATIONS / REPORTING / AUDIT
-- ============================================================

create table public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  source_entity_type text,
  source_entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending','processing','sent','failed','cancelled')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.report_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  report_type text not null,
  team_id uuid references public.teams(id) on delete cascade,
  territory_id uuid references public.territories(id) on delete cascade,
  timezone text not null default 'America/New_York',
  send_time time,
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index locations_org_territory_idx
  on public.locations (organization_id, territory_id);

create index location_interactions_location_time_idx
  on public.location_interactions (location_id, occurred_at desc);

create index representative_territories_territory_idx
  on public.representative_territories (territory_id, representative_id);

create index sales_attempts_location_idx
  on public.sales_attempts (location_id, updated_at desc);

create index orders_org_created_idx
  on public.orders (organization_id, created_at desc);

create index appointments_slot_idx
  on public.appointments (appointment_slot_id, status);

create index lifecycle_order_time_idx
  on public.order_lifecycle_events (order_id, received_at desc);

create index notification_pending_idx
  on public.notification_queue (organization_id, status, created_at);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations',
    'organization_memberships',
    'teams',
    'markets',
    'territories',
    'representatives',
    'locations',
    'products',
    'offers',
    'sales_attempts',
    'orders',
    'scheduling_policies',
    'appointment_slots',
    'appointments',
    'integrations',
    'adjustments',
    'report_subscriptions'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      'set_' || t || '_updated_at',
      t
    );
  end loop;
end;
$$;

-- ============================================================
-- TENANT AUTHORIZATION HELPERS
-- ============================================================

create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.is_active = true
  );
$$;

create or replace function public.organization_role(p_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.organization_memberships m
  where m.organization_id = p_organization_id
    and m.user_id = auth.uid()
    and m.is_active = true
  limit 1;
$$;

create or replace function public.can_admin_organization(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.organization_role(p_organization_id) in (
      'organization_owner',
      'organization_admin'
    ),
    false
  );
$$;

-- ============================================================
-- RLS FOUNDATION
-- ============================================================

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.teams enable row level security;
alter table public.markets enable row level security;
alter table public.territories enable row level security;
alter table public.territory_boundaries enable row level security;
alter table public.representatives enable row level security;
alter table public.representative_territories enable row level security;
alter table public.locations enable row level security;
alter table public.interaction_dispositions enable row level security;
alter table public.location_interactions enable row level security;
alter table public.products enable row level security;
alter table public.offers enable row level security;
alter table public.sales_attempts enable row level security;
alter table public.orders enable row level security;
alter table public.scheduling_policies enable row level security;
alter table public.appointment_slots enable row level security;
alter table public.appointments enable row level security;
alter table public.integrations enable row level security;
alter table public.lifecycle_stages enable row level security;
alter table public.order_lifecycle_events enable row level security;
alter table public.external_records enable row level security;
alter table public.invoice_sequences enable row level security;
alter table public.invoice_batches enable row level security;
alter table public.invoice_items enable row level security;
alter table public.adjustments enable row level security;
alter table public.notification_queue enable row level security;
alter table public.report_subscriptions enable row level security;
alter table public.audit_log enable row level security;

-- Generic member read policy.
-- More restrictive write/team/representative policies should be added
-- per module before production use.

create policy organizations_member_select
on public.organizations
for select
to authenticated
using (public.is_organization_member(id));

-- Example reusable policy generation is intentionally not automated here.
-- Each table should receive explicit SELECT/INSERT/UPDATE/DELETE policies
-- appropriate to its business sensitivity before production deployment.

-- ============================================================
-- IMPORTANT
-- ============================================================
-- This is a clean STARTING schema, not a production-complete migration.
-- Next steps:
-- 1. Add explicit RLS policies for every table.
-- 2. Add tenant-consistency constraints/triggers.
-- 3. Add order transaction RPC.
-- 4. Add slot-capacity transaction RPC.
-- 5. Add lifecycle projection.
-- 6. Add audit triggers.
-- 7. Add synthetic seed data.
