begin;

-- Role helpers used by hardened write policies.
create or replace function public.can_admin_org(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.has_org_role(
    target_org,
    array['organization_owner','organization_admin','operations_manager']
  );
$$;

create or replace function public.can_operate_org(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.has_org_role(
    target_org,
    array['organization_owner','organization_admin','operations_manager','team_manager','representative']
  );
$$;

revoke all on function public.can_admin_org(uuid) from public;
revoke all on function public.can_operate_org(uuid) from public;
grant execute on function public.can_admin_org(uuid) to authenticated;
grant execute on function public.can_operate_org(uuid) to authenticated;

-- Field interaction is now an atomic, idempotent database operation.
create or replace function public.record_location_interaction(
  p_organization_id uuid,
  p_location_id uuid,
  p_representative_id uuid,
  p_territory_id uuid,
  p_team_id uuid,
  p_disposition_id uuid,
  p_interaction_type text,
  p_note text,
  p_decision_maker_contacted boolean,
  p_follow_up_needed boolean,
  p_follow_up_at timestamptz,
  p_occurred_at timestamptz,
  p_source_system text,
  p_client_submission_id uuid
)
returns public.location_interactions
language plpgsql
security definer
set search_path=public
as $$
declare
  existing public.location_interactions;
  result public.location_interactions;
begin
  if not public.can_operate_org(p_organization_id) then
    raise exception 'not authorized for field operation';
  end if;

  perform 1 from public.locations
  where id=p_location_id and organization_id=p_organization_id
  for update;
  if not found then raise exception 'location not found in organization'; end if;

  if p_representative_id is not null and not exists(
    select 1 from public.representatives
    where id=p_representative_id and organization_id=p_organization_id
  ) then raise exception 'representative not found in organization'; end if;

  if p_disposition_id is not null and not exists(
    select 1 from public.interaction_dispositions
    where id=p_disposition_id and organization_id=p_organization_id and is_active
  ) then raise exception 'active disposition not found in organization'; end if;

  if p_client_submission_id is not null then
    select * into existing
    from public.location_interactions
    where organization_id=p_organization_id
      and client_submission_id=p_client_submission_id;
  end if;

  if found then
    update public.location_interactions
    set representative_id=p_representative_id,
        territory_id=p_territory_id,
        team_id=p_team_id,
        disposition_id=p_disposition_id,
        interaction_type=coalesce(nullif(trim(p_interaction_type),''),'field_visit'),
        note=nullif(trim(p_note),''),
        decision_maker_contacted=p_decision_maker_contacted,
        follow_up_needed=p_follow_up_needed,
        follow_up_at=p_follow_up_at,
        occurred_at=coalesce(p_occurred_at,now()),
        source_system=coalesce(nullif(trim(p_source_system),''),'app')
    where id=existing.id
    returning * into result;
  else
    insert into public.location_interactions(
      organization_id,location_id,representative_id,territory_id,team_id,
      disposition_id,interaction_type,note,decision_maker_contacted,
      follow_up_needed,follow_up_at,occurred_at,source_system,client_submission_id
    ) values(
      p_organization_id,p_location_id,p_representative_id,p_territory_id,p_team_id,
      p_disposition_id,coalesce(nullif(trim(p_interaction_type),''),'field_visit'),
      nullif(trim(p_note),''),p_decision_maker_contacted,p_follow_up_needed,
      p_follow_up_at,coalesce(p_occurred_at,now()),
      coalesce(nullif(trim(p_source_system),''),'app'),p_client_submission_id
    )
    returning * into result;
  end if;

  update public.locations
  set current_disposition_id=p_disposition_id,
      current_representative_id=p_representative_id,
      updated_at=now()
  where id=p_location_id
    and organization_id=p_organization_id;

  return result;
end;
$$;

revoke all on function public.record_location_interaction(
  uuid,uuid,uuid,uuid,uuid,uuid,text,text,boolean,boolean,timestamptz,timestamptz,text,uuid
) from public;
grant execute on function public.record_location_interaction(
  uuid,uuid,uuid,uuid,uuid,uuid,text,text,boolean,boolean,timestamptz,timestamptz,text,uuid
) to authenticated;

-- Tighten configuration writes.
do $$
declare t text;
begin
  foreach t in array array[
    'teams','team_memberships','markets','territories','representatives',
    'representative_territories','interaction_dispositions','products','offers',
    'scheduling_policies','scheduling_overrides','integrations','lifecycle_stages',
    'lifecycle_mappings','external_records'
  ]
  loop
    execute format('drop policy if exists %I_insert on public.%I',t,t);
    execute format('drop policy if exists %I_update on public.%I',t,t);
    execute format('drop policy if exists %I_delete on public.%I',t,t);
    execute format(
      'create policy %I_insert on public.%I for insert to authenticated with check (public.can_admin_org(organization_id))',
      t,t
    );
    execute format(
      'create policy %I_update on public.%I for update to authenticated using (public.can_admin_org(organization_id)) with check (public.can_admin_org(organization_id))',
      t,t
    );
    execute format(
      'create policy %I_delete on public.%I for delete to authenticated using (public.can_admin_org(organization_id))',
      t,t
    );
  end loop;
end $$;

-- Locations are configuration data. Field state changes go through record_location_interaction.
drop policy if exists locations_insert on public.locations;
drop policy if exists locations_update on public.locations;
drop policy if exists locations_delete on public.locations;
create policy locations_insert on public.locations for insert to authenticated
with check(public.can_admin_org(organization_id));
create policy locations_update on public.locations for update to authenticated
using(public.can_admin_org(organization_id))
with check(public.can_admin_org(organization_id));
create policy locations_delete on public.locations for delete to authenticated
using(public.can_admin_org(organization_id));

-- Interactions themselves are written through the atomic RPC.
drop policy if exists location_interactions_insert on public.location_interactions;
drop policy if exists location_interactions_update on public.location_interactions;
drop policy if exists location_interactions_delete on public.location_interactions;
create policy location_interactions_delete on public.location_interactions for delete to authenticated
using(public.can_admin_org(organization_id));

-- Sales attempts are writable by operational field roles.
drop policy if exists sales_attempts_insert on public.sales_attempts;
drop policy if exists sales_attempts_update on public.sales_attempts;
drop policy if exists sales_attempts_delete on public.sales_attempts;
create policy sales_attempts_insert on public.sales_attempts for insert to authenticated
with check(public.can_operate_org(organization_id));
create policy sales_attempts_update on public.sales_attempts for update to authenticated
using(public.can_operate_org(organization_id))
with check(public.can_operate_org(organization_id));
create policy sales_attempts_delete on public.sales_attempts for delete to authenticated
using(public.can_admin_org(organization_id));

-- Order creation is a field operation; review/changes are management operations.
drop policy if exists orders_insert on public.orders;
drop policy if exists orders_update on public.orders;
drop policy if exists orders_delete on public.orders;
create policy orders_insert on public.orders for insert to authenticated
with check(public.can_operate_org(organization_id));
create policy orders_update on public.orders for update to authenticated
using(public.can_admin_org(organization_id))
with check(public.can_admin_org(organization_id));
create policy orders_delete on public.orders for delete to authenticated
using(public.has_org_role(organization_id,array['organization_owner','organization_admin']));

-- Appointments may be managed by field/management roles.
drop policy if exists appointments_insert on public.appointments;
drop policy if exists appointments_update on public.appointments;
drop policy if exists appointments_delete on public.appointments;
create policy appointments_insert on public.appointments for insert to authenticated
with check(public.can_operate_org(organization_id));
create policy appointments_update on public.appointments for update to authenticated
using(public.can_operate_org(organization_id))
with check(public.can_operate_org(organization_id));
create policy appointments_delete on public.appointments for delete to authenticated
using(public.can_admin_org(organization_id));

-- Lifecycle/finance writes are management-only.
do $$
declare t text;
begin
  foreach t in array array[
    'lifecycle_exceptions','invoice_batches','invoice_items','adjustments'
  ]
  loop
    execute format('drop policy if exists %I_insert on public.%I',t,t);
    execute format('drop policy if exists %I_update on public.%I',t,t);
    execute format('drop policy if exists %I_delete on public.%I',t,t);
    execute format(
      'create policy %I_insert on public.%I for insert to authenticated with check (public.can_admin_org(organization_id))',
      t,t
    );
    execute format(
      'create policy %I_update on public.%I for update to authenticated using (public.can_admin_org(organization_id)) with check (public.can_admin_org(organization_id))',
      t,t
    );
    execute format(
      'create policy %I_delete on public.%I for delete to authenticated using (public.can_admin_org(organization_id))',
      t,t
    );
  end loop;
end $$;

-- Lifecycle events need system-submitted events from field sales, but arbitrary
-- lifecycle changes remain management-only.
drop policy if exists lifecycle_events_insert on public.lifecycle_events;
drop policy if exists lifecycle_events_update on public.lifecycle_events;
drop policy if exists lifecycle_events_delete on public.lifecycle_events;
create policy lifecycle_events_insert on public.lifecycle_events for insert to authenticated
with check(
  public.can_admin_org(organization_id)
  or (
    public.can_operate_org(organization_id)
    and source='system'
    and exists(
      select 1 from public.lifecycle_stages ls
      where ls.id=lifecycle_stage_id
        and ls.organization_id=organization_id
        and ls.code='submitted'
    )
  )
);
create policy lifecycle_events_update on public.lifecycle_events for update to authenticated
using(public.can_admin_org(organization_id))
with check(public.can_admin_org(organization_id));
create policy lifecycle_events_delete on public.lifecycle_events for delete to authenticated
using(public.can_admin_org(organization_id));

-- Finance exports are restricted to finance-capable management roles.
drop policy if exists invoice_exports_insert on public.invoice_exports;
drop policy if exists invoice_exports_delete on public.invoice_exports;
create policy invoice_exports_insert on public.invoice_exports for insert to authenticated
with check(public.can_admin_org(organization_id));
create policy invoice_exports_delete on public.invoice_exports for delete to authenticated
using(public.can_admin_org(organization_id));

-- Audit visibility excludes viewer/field representative roles.
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log for select to authenticated
using(
  public.has_org_role(
    organization_id,
    array['organization_owner','organization_admin','operations_manager','analyst']
  )
);

-- Query-path indexes used by production screens.
create index if not exists representative_territories_org_rep_idx
  on public.representative_territories(organization_id,representative_id);
create index if not exists lifecycle_exceptions_org_status_idx
  on public.lifecycle_exceptions(organization_id,status,created_at desc);
create index if not exists invoice_items_org_batch_idx
  on public.invoice_items(organization_id,invoice_batch_id);
create index if not exists invoice_exports_org_time_idx
  on public.invoice_exports(organization_id,exported_at desc);
create index if not exists sales_attempts_org_status_idx
  on public.sales_attempts(organization_id,status,updated_at desc);
create index if not exists appointments_org_order_idx
  on public.appointments(organization_id,order_id);

notify pgrst, 'reload schema';

commit;
