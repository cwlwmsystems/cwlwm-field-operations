begin;

create table public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_org_created_idx on public.audit_log(organization_id,created_at desc);

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
  entity text := tg_table_name;
  record_id text;
begin
  if tg_op = 'DELETE' then
    if tg_table_name = 'organizations' then
      org_id := old.id;
    else
      org_id := old.organization_id;
    end if;
    record_id := old.id::text;
    insert into public.audit_log(organization_id,actor_user_id,action,entity_type,entity_id,before_data)
    values(org_id,auth.uid(),'delete',entity,record_id,to_jsonb(old));
    return old;
  elsif tg_op = 'INSERT' then
    if tg_table_name = 'organizations' then
      org_id := new.id;
    else
      org_id := new.organization_id;
    end if;
    record_id := new.id::text;
    insert into public.audit_log(organization_id,actor_user_id,action,entity_type,entity_id,after_data)
    values(org_id,auth.uid(),'insert',entity,record_id,to_jsonb(new));
    return new;
  else
    if tg_table_name = 'organizations' then
      org_id := new.id;
    else
      org_id := new.organization_id;
    end if;
    record_id := new.id::text;
    insert into public.audit_log(organization_id,actor_user_id,action,entity_type,entity_id,before_data,after_data)
    values(org_id,auth.uid(),'update',entity,record_id,to_jsonb(old),to_jsonb(new));
    return new;
  end if;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','teams','markets','territories','representatives','locations',
    'location_interactions','products','offers','sales_attempts','orders','appointments',
    'integrations','lifecycle_stages','lifecycle_mappings','external_records',
    'lifecycle_events','lifecycle_exceptions','invoice_batches','invoice_items','adjustments'
  ]
  loop
    execute format('drop trigger if exists audit_%I on public.%I', t, t);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t, t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','organization_memberships','teams','markets','territories',
    'representatives','interaction_dispositions','locations','products','offers',
    'sales_attempts','orders','scheduling_policies','appointments','integrations',
    'lifecycle_stages','external_records'
  ]
  loop
    execute format('drop trigger if exists set_updated_at_%I on public.%I', t, t);
    execute format('create trigger set_updated_at_%I before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

create or replace view public.order_lifecycle_current
with (security_invoker = true)
as
select distinct on (e.order_id)
  e.organization_id,
  e.order_id,
  e.lifecycle_stage_id,
  s.code as lifecycle_code,
  s.name as lifecycle_name,
  s.category as lifecycle_category,
  e.source,
  e.occurred_at
from public.lifecycle_events e
join public.lifecycle_stages s on s.id = e.lifecycle_stage_id
order by e.order_id, e.occurred_at desc, e.created_at desc;

commit;
