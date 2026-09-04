begin;

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  integration_type text not null
    check(integration_type in ('crm','order_system','billing','data_warehouse','webhook','other')),
  status text not null default 'inactive'
    check(status in ('active','inactive','error')),
  external_system_label text not null,
  configuration jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lifecycle_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  category text not null default 'other'
    check(category in ('submitted','accepted','scheduled','installed','activated','cancelled','exception','closed','other')),
  sort_order integer not null default 0,
  is_terminal boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code)
);

create table public.lifecycle_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  external_status text not null,
  lifecycle_stage_id uuid not null references public.lifecycle_stages(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(integration_id,external_status)
);

create table public.external_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  entity_type text not null check(entity_type in ('order','location','customer','invoice','other')),
  internal_entity_id uuid not null,
  external_id text not null,
  external_status text,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(integration_id,entity_type,internal_entity_id),
  unique(integration_id,entity_type,external_id)
);

create table public.lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  integration_id uuid references public.integrations(id) on delete set null,
  lifecycle_stage_id uuid not null references public.lifecycle_stages(id) on delete restrict,
  external_status text,
  external_event_id text,
  source text not null default 'system'
    check(source in ('manual','integration','system')),
  detail text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index lifecycle_events_external_event_uq
  on public.lifecycle_events(integration_id,external_event_id)
  where integration_id is not null and external_event_id is not null;

create index lifecycle_events_order_idx on public.lifecycle_events(organization_id,order_id,occurred_at desc);

create table public.lifecycle_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  integration_id uuid references public.integrations(id) on delete set null,
  exception_type text not null
    check(exception_type in ('unmapped_status','missing_external_id','invalid_transition','sync_error','manual_review')),
  message text not null,
  external_status text,
  status text not null default 'open'
    check(status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

commit;
