-- Foundation v0.2: explicit tenant-scoped RLS

create or replace function public.is_org_manager(p_org uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(public.organization_role(p_org) in ('organization_owner','organization_admin','operations_manager'), false);
$$;

create or replace function public.has_team_access(p_org uuid, p_team uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.can_admin_organization(p_org)
  or public.organization_role(p_org) = 'operations_manager'
  or exists (
    select 1 from public.team_memberships tm
    where tm.organization_id=p_org and tm.team_id=p_team and tm.user_id=auth.uid()
  );
$$;

-- Memberships
create policy memberships_self_or_admin_select on public.organization_memberships
for select to authenticated
using (user_id=auth.uid() or public.can_admin_organization(organization_id));

create policy memberships_admin_insert on public.organization_memberships
for insert to authenticated
with check (public.can_admin_organization(organization_id));

create policy memberships_admin_update on public.organization_memberships
for update to authenticated
using (public.can_admin_organization(organization_id))
with check (public.can_admin_organization(organization_id));

create policy memberships_admin_delete on public.organization_memberships
for delete to authenticated
using (public.can_admin_organization(organization_id));

-- Reusable member-read policies for ordinary tenant configuration/data tables.
create policy teams_member_select on public.teams for select to authenticated using (public.is_organization_member(organization_id));
create policy markets_member_select on public.markets for select to authenticated using (public.is_organization_member(organization_id));
create policy territories_member_select on public.territories for select to authenticated using (public.is_organization_member(organization_id));
create policy territory_boundaries_member_select on public.territory_boundaries for select to authenticated using (public.is_organization_member(organization_id));
create policy representatives_member_select on public.representatives for select to authenticated using (public.is_organization_member(organization_id));
create policy representative_territories_member_select on public.representative_territories for select to authenticated using (public.is_organization_member(organization_id));
create policy dispositions_member_select on public.interaction_dispositions for select to authenticated using (public.is_organization_member(organization_id));
create policy products_member_select on public.products for select to authenticated using (public.is_organization_member(organization_id));
create policy offers_member_select on public.offers for select to authenticated using (public.is_organization_member(organization_id));
create policy lifecycle_stages_member_select on public.lifecycle_stages for select to authenticated using (public.is_organization_member(organization_id));

-- Manager writes to configuration.
create policy teams_manager_all on public.teams for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy markets_manager_all on public.markets for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy territories_manager_all on public.territories for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy territory_boundaries_manager_all on public.territory_boundaries for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy representatives_manager_all on public.representatives for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy representative_territories_manager_all on public.representative_territories for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy dispositions_manager_all on public.interaction_dispositions for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy products_manager_all on public.products for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy offers_manager_all on public.offers for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy lifecycle_stages_manager_all on public.lifecycle_stages for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));

-- Team membership records
create policy team_memberships_member_select on public.team_memberships for select to authenticated using (public.is_organization_member(organization_id));
create policy team_memberships_manager_all on public.team_memberships for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));

-- Operational records: org members can read, managers/team users can act.
create policy locations_member_select on public.locations for select to authenticated using (public.is_organization_member(organization_id));
create policy locations_scoped_insert on public.locations for insert to authenticated with check (public.is_org_manager(organization_id) or team_id is null or public.has_team_access(organization_id,team_id));
create policy locations_scoped_update on public.locations for update to authenticated using (public.is_org_manager(organization_id) or team_id is null or public.has_team_access(organization_id,team_id)) with check (public.is_org_manager(organization_id) or team_id is null or public.has_team_access(organization_id,team_id));

create policy interactions_member_select on public.location_interactions for select to authenticated using (public.is_organization_member(organization_id));
create policy interactions_scoped_insert on public.location_interactions for insert to authenticated with check (public.is_org_manager(organization_id) or team_id is null or public.has_team_access(organization_id,team_id));

create policy attempts_member_select on public.sales_attempts for select to authenticated using (public.is_organization_member(organization_id));
create policy attempts_scoped_insert on public.sales_attempts for insert to authenticated with check (public.is_org_manager(organization_id) or team_id is null or public.has_team_access(organization_id,team_id));
create policy attempts_scoped_update on public.sales_attempts for update to authenticated using (public.is_org_manager(organization_id) or team_id is null or public.has_team_access(organization_id,team_id)) with check (public.is_org_manager(organization_id) or team_id is null or public.has_team_access(organization_id,team_id));

create policy orders_member_select on public.orders for select to authenticated using (public.is_organization_member(organization_id));
create policy orders_scoped_insert on public.orders for insert to authenticated with check (public.is_org_manager(organization_id) or team_id is null or public.has_team_access(organization_id,team_id));
create policy orders_manager_update on public.orders for update to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));

create policy scheduling_policies_member_select on public.scheduling_policies for select to authenticated using (public.is_organization_member(organization_id));
create policy scheduling_policies_manager_all on public.scheduling_policies for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy appointment_slots_member_select on public.appointment_slots for select to authenticated using (public.is_organization_member(organization_id));
create policy appointment_slots_manager_all on public.appointment_slots for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy appointments_member_select on public.appointments for select to authenticated using (public.is_organization_member(organization_id));
create policy appointments_scoped_insert on public.appointments for insert to authenticated with check (public.is_organization_member(organization_id));
create policy appointments_scoped_update on public.appointments for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));

-- Integrations and finance are manager-only.
create policy integrations_manager_all on public.integrations for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy lifecycle_events_member_select on public.order_lifecycle_events for select to authenticated using (public.is_organization_member(organization_id));
create policy lifecycle_events_manager_insert on public.order_lifecycle_events for insert to authenticated with check (public.is_org_manager(organization_id));
create policy external_records_manager_all on public.external_records for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy invoice_sequences_admin_all on public.invoice_sequences for all to authenticated using (public.can_admin_organization(organization_id)) with check (public.can_admin_organization(organization_id));
create policy invoice_batches_manager_all on public.invoice_batches for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy invoice_items_manager_all on public.invoice_items for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy adjustments_manager_all on public.adjustments for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));

create policy notifications_manager_select on public.notification_queue for select to authenticated using (public.is_org_manager(organization_id));
create policy reports_member_select on public.report_subscriptions for select to authenticated using (public.is_organization_member(organization_id));
create policy reports_member_insert on public.report_subscriptions for insert to authenticated with check (public.is_organization_member(organization_id) and (user_id is null or user_id=auth.uid() or public.is_org_manager(organization_id)));
create policy reports_member_update on public.report_subscriptions for update to authenticated using (user_id=auth.uid() or public.is_org_manager(organization_id)) with check (user_id=auth.uid() or public.is_org_manager(organization_id));
create policy audit_manager_select on public.audit_log for select to authenticated using (organization_id is not null and public.is_org_manager(organization_id));
