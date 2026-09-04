begin;

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.organization_memberships m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.is_active
  );
$$;

create or replace function public.has_org_role(target_org uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.organization_memberships m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.is_active
      and m.role = any(allowed_roles)
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid,text[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid,text[]) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;

create policy organizations_select on public.organizations
for select to authenticated
using (public.is_org_member(id));

create policy organizations_update_admin on public.organizations
for update to authenticated
using (public.has_org_role(id,array['organization_owner','organization_admin']))
with check (public.has_org_role(id,array['organization_owner','organization_admin']));

create policy org_memberships_select on public.organization_memberships
for select to authenticated
using (public.is_org_member(organization_id));

create policy org_memberships_admin on public.organization_memberships
for all to authenticated
using (public.has_org_role(organization_id,array['organization_owner','organization_admin']))
with check (public.has_org_role(organization_id,array['organization_owner','organization_admin']));

do $$
declare t text;
begin
  foreach t in array array[
    'teams','team_memberships','markets','territories','representatives',
    'representative_territories','interaction_dispositions','locations',
    'location_interactions','products','offers','sales_attempts','orders',
    'scheduling_policies','scheduling_overrides','appointments','integrations',
    'lifecycle_stages','lifecycle_mappings','external_records','lifecycle_events',
    'lifecycle_exceptions','invoice_batches','invoice_items','adjustments'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I_select on public.%I for select to authenticated using (public.is_org_member(organization_id))',
      t,t
    );
    execute format(
      'create policy %I_insert on public.%I for insert to authenticated with check (public.is_org_member(organization_id))',
      t,t
    );
    execute format(
      'create policy %I_update on public.%I for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))',
      t,t
    );
    execute format(
      'create policy %I_delete on public.%I for delete to authenticated using (public.has_org_role(organization_id,array[''organization_owner'',''organization_admin'',''operations_manager'']))',
      t,t
    );
  end loop;
end $$;


alter table public.audit_log enable row level security;

create policy audit_log_select on public.audit_log
for select to authenticated
using (public.is_org_member(organization_id));

alter table public.invoice_settings enable row level security;

create policy invoice_settings_select on public.invoice_settings
for select to authenticated using (public.is_org_member(organization_id));

create policy invoice_settings_write on public.invoice_settings
for all to authenticated
using (public.has_org_role(organization_id,array['organization_owner','organization_admin','operations_manager']))
with check (public.has_org_role(organization_id,array['organization_owner','organization_admin','operations_manager']));

commit;
