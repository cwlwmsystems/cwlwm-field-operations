begin;

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
  unique(organization_id,code)
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  code text not null,
  name text not null,
  recurring_price numeric(12,2),
  one_time_price numeric(12,2),
  term_months integer,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  terms jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code)
);

create table public.sales_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_attempt_id uuid not null,
  location_id uuid not null references public.locations(id) on delete restrict,
  representative_id uuid references public.representatives(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  territory_id uuid references public.territories(id) on delete set null,
  customer_first_name text,
  customer_last_name text,
  customer_email text,
  customer_phone text,
  product_id uuid references public.products(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  progress_step integer not null default 1,
  progress_stage text,
  status text not null default 'in_progress'
    check (status in ('in_progress','abandoned','converted','cancelled')),
  final_disposition text,
  appointment_date date,
  appointment_time time,
  converted_order_id uuid,
  last_saved_at timestamptz not null default now(),
  converted_at timestamptz,
  abandoned_at timestamptz,
  source text not null default 'app',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,client_attempt_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_submission_id uuid not null,
  sales_attempt_id uuid references public.sales_attempts(id) on delete set null,
  location_id uuid not null references public.locations(id) on delete restrict,
  representative_id uuid references public.representatives(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  territory_id uuid references public.territories(id) on delete set null,
  customer_first_name text not null,
  customer_last_name text not null,
  customer_email text,
  customer_phone text,
  product_id uuid references public.products(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  product_snapshot jsonb not null default '{}'::jsonb,
  offer_snapshot jsonb not null default '{}'::jsonb,
  recurring_price numeric(12,2),
  one_time_price numeric(12,2),
  status text not null default 'submitted'
    check (status in ('submitted','review','approved','flagged','cancelled','closed')),
  review_status text not null default 'pending'
    check (review_status in ('pending','approved','flagged')),
  source text not null default 'app',
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,client_submission_id)
);

alter table public.sales_attempts
  add constraint sales_attempts_converted_order_fk
  foreign key (converted_order_id) references public.orders(id) on delete set null;

create index sales_attempts_org_location_idx on public.sales_attempts(organization_id,location_id,updated_at desc);
create index orders_org_location_idx on public.orders(organization_id,location_id,submitted_at desc);
create index orders_org_status_idx on public.orders(organization_id,status,review_status);

commit;
