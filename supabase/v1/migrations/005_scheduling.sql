begin;

create table public.scheduling_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  territory_id uuid references public.territories(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  name text not null,
  timezone text not null default 'America/New_York',
  allowed_weekdays smallint[] not null default array[1,2,3,4,5]::smallint[],
  slot_times time[] not null default array['08:00'::time,'10:00'::time,'13:00'::time,'15:00'::time],
  default_capacity integer not null default 1 check(default_capacity >= 0),
  minimum_lead_minutes integer not null default 0 check(minimum_lead_minutes >= 0),
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scheduling_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  territory_id uuid not null references public.territories(id) on delete cascade,
  service_date date not null,
  slot_time time,
  override_type text not null
    check (override_type in ('blackout','capacity')),
  capacity integer check (capacity is null or capacity >= 0),
  reason text,
  created_at timestamptz not null default now(),
  unique(territory_id,service_date,slot_time,override_type)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  sales_attempt_id uuid references public.sales_attempts(id) on delete set null,
  location_id uuid not null references public.locations(id) on delete restrict,
  representative_id uuid references public.representatives(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  territory_id uuid not null references public.territories(id) on delete restrict,
  service_date date not null,
  slot_time time not null,
  status text not null default 'scheduled'
    check(status in ('scheduled','completed','cancelled','no_show','rescheduled')),
  customer_name text,
  customer_phone text,
  customer_email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appointments_capacity_idx
  on public.appointments(organization_id,territory_id,service_date,slot_time,status);

commit;
