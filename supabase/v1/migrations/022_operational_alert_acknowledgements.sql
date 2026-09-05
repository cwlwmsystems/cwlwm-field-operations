begin;

create table if not exists public.operational_alert_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_key text not null,
  state text not null default 'acknowledged'
    check (state in ('acknowledged','dismissed')),
  acknowledged_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, alert_key)
);

create index if not exists operational_alert_ack_org_user_idx
  on public.operational_alert_acknowledgements (organization_id, user_id);

alter table public.operational_alert_acknowledgements enable row level security;

drop policy if exists operational_alert_ack_select on public.operational_alert_acknowledgements;
create policy operational_alert_ack_select
on public.operational_alert_acknowledgements
for select
to authenticated
using (
  user_id = auth.uid()
  and public.is_org_member(organization_id)
);

drop policy if exists operational_alert_ack_insert on public.operational_alert_acknowledgements;
create policy operational_alert_ack_insert
on public.operational_alert_acknowledgements
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_org_member(organization_id)
);

drop policy if exists operational_alert_ack_update on public.operational_alert_acknowledgements;
create policy operational_alert_ack_update
on public.operational_alert_acknowledgements
for update
to authenticated
using (
  user_id = auth.uid()
  and public.is_org_member(organization_id)
)
with check (
  user_id = auth.uid()
  and public.is_org_member(organization_id)
);

grant select, insert, update on public.operational_alert_acknowledgements to authenticated;

commit;
