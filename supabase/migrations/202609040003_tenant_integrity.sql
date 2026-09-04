-- Foundation v0.2: cross-tenant foreign-key defense.
-- UUID foreign keys alone do not guarantee that both records belong to the same tenant.

create or replace function public.assert_same_organization(p_expected uuid, p_table regclass, p_id uuid)
returns void language plpgsql stable security definer set search_path=public as $$
declare v_actual uuid;
begin
  if p_id is null then return; end if;
  execute format('select organization_id from %s where id=$1', p_table) into v_actual using p_id;
  if v_actual is null then raise exception 'Referenced record % does not exist.', p_id using errcode='23503'; end if;
  if v_actual <> p_expected then raise exception 'Cross-organization reference rejected.' using errcode='23514'; end if;
end; $$;

create or replace function public.enforce_location_tenant_integrity()
returns trigger language plpgsql as $$
begin
  perform public.assert_same_organization(new.organization_id,'public.territories'::regclass,new.territory_id);
  perform public.assert_same_organization(new.organization_id,'public.teams'::regclass,new.team_id);
  perform public.assert_same_organization(new.organization_id,'public.representatives'::regclass,new.current_representative_id);
  perform public.assert_same_organization(new.organization_id,'public.interaction_dispositions'::regclass,new.current_disposition_id);
  return new;
end; $$;
create trigger locations_tenant_integrity before insert or update on public.locations for each row execute function public.enforce_location_tenant_integrity();

create or replace function public.enforce_order_tenant_integrity()
returns trigger language plpgsql as $$
begin
  perform public.assert_same_organization(new.organization_id,'public.locations'::regclass,new.location_id);
  perform public.assert_same_organization(new.organization_id,'public.representatives'::regclass,new.representative_id);
  perform public.assert_same_organization(new.organization_id,'public.teams'::regclass,new.team_id);
  perform public.assert_same_organization(new.organization_id,'public.territories'::regclass,new.territory_id);
  perform public.assert_same_organization(new.organization_id,'public.sales_attempts'::regclass,new.sales_attempt_id);
  perform public.assert_same_organization(new.organization_id,'public.products'::regclass,new.product_id);
  perform public.assert_same_organization(new.organization_id,'public.offers'::regclass,new.offer_id);
  return new;
end; $$;
create trigger orders_tenant_integrity before insert or update on public.orders for each row execute function public.enforce_order_tenant_integrity();

create or replace function public.enforce_interaction_tenant_integrity()
returns trigger language plpgsql as $$
begin
  perform public.assert_same_organization(new.organization_id,'public.locations'::regclass,new.location_id);
  perform public.assert_same_organization(new.organization_id,'public.representatives'::regclass,new.representative_id);
  perform public.assert_same_organization(new.organization_id,'public.teams'::regclass,new.team_id);
  perform public.assert_same_organization(new.organization_id,'public.territories'::regclass,new.territory_id);
  perform public.assert_same_organization(new.organization_id,'public.interaction_dispositions'::regclass,new.disposition_id);
  return new;
end; $$;
create trigger interactions_tenant_integrity before insert or update on public.location_interactions for each row execute function public.enforce_interaction_tenant_integrity();

create or replace function public.enforce_appointment_tenant_integrity()
returns trigger language plpgsql as $$
begin
  perform public.assert_same_organization(new.organization_id,'public.appointment_slots'::regclass,new.appointment_slot_id);
  perform public.assert_same_organization(new.organization_id,'public.orders'::regclass,new.order_id);
  perform public.assert_same_organization(new.organization_id,'public.locations'::regclass,new.location_id);
  perform public.assert_same_organization(new.organization_id,'public.representatives'::regclass,new.representative_id);
  return new;
end; $$;
create trigger appointments_tenant_integrity before insert or update on public.appointments for each row execute function public.enforce_appointment_tenant_integrity();
