begin;

create table public.invoice_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  prefix text not null default 'INV',
  next_number bigint not null default 1 check(next_number > 0),
  padding integer not null default 4 check(padding between 1 and 12),
  include_year boolean not null default true,
  currency text not null default 'USD',
  updated_at timestamptz not null default now()
);

create table public.invoice_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_number text not null,
  team_id uuid references public.teams(id) on delete set null,
  status text not null default 'draft'
    check(status in ('draft','finalized','exported','void')),
  subtotal numeric(12,2) not null default 0,
  adjustments_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  exported_at timestamptz,
  unique(organization_id,invoice_number)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_batch_id uuid not null references public.invoice_batches(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  description text not null,
  amount numeric(12,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(order_id)
);

create table public.adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  invoice_batch_id uuid references public.invoice_batches(id) on delete set null,
  adjustment_type text not null
    check(adjustment_type in ('clawback','credit','debit','void','other')),
  reason text not null,
  amount numeric(12,2) not null check(amount >= 0),
  status text not null default 'open'
    check(status in ('open','applied','reversed')),
  notes text,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  reversed_at timestamptz
);

create index invoice_batches_org_status_idx on public.invoice_batches(organization_id,status,created_at desc);
create index adjustments_org_status_idx on public.adjustments(organization_id,status,created_at desc);

commit;
