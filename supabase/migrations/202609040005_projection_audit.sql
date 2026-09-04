-- Current-location projection + generic audit helper.
create or replace function public.project_location_from_interaction()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  update public.locations
  set current_disposition_id=new.disposition_id,
      current_representative_id=coalesce(new.representative_id,current_representative_id),
      updated_at=now()
  where id=new.location_id and organization_id=new.organization_id;
  return new;
end; $$;
create trigger interaction_project_location after insert on public.location_interactions for each row execute function public.project_location_from_interaction();

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_id uuid;
begin
  v_org := coalesce((to_jsonb(new)->>'organization_id')::uuid,(to_jsonb(old)->>'organization_id')::uuid);
  v_id := coalesce((to_jsonb(new)->>'id')::uuid,(to_jsonb(old)->>'id')::uuid);
  insert into public.audit_log(organization_id,actor_user_id,actor_email,action,entity_type,entity_id,old_value,new_value)
  values(v_org,auth.uid(),lower(coalesce(auth.jwt()->>'email','')),TG_OP, TG_TABLE_NAME,v_id,
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT','UPDATE') then to_jsonb(new) else null end);
  return coalesce(new,old);
end; $$;

create trigger teams_audit after insert or update or delete on public.teams for each row execute function public.write_audit_log();
create trigger territories_audit after insert or update or delete on public.territories for each row execute function public.write_audit_log();
create trigger representatives_audit after insert or update or delete on public.representatives for each row execute function public.write_audit_log();
create trigger orders_audit after insert or update or delete on public.orders for each row execute function public.write_audit_log();
