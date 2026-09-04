begin;

create table if not exists public.invoice_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_batch_id uuid not null references public.invoice_batches(id) on delete cascade,
  export_format text not null check(export_format in ('pdf','csv')),
  filename text not null,
  exported_by uuid references auth.users(id) on delete set null,
  exported_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists invoice_exports_org_batch_idx
  on public.invoice_exports(organization_id,invoice_batch_id,exported_at desc);

alter table public.invoice_exports enable row level security;

drop policy if exists invoice_exports_select on public.invoice_exports;
create policy invoice_exports_select
on public.invoice_exports
for select to authenticated
using (public.is_org_member(organization_id));

drop policy if exists invoice_exports_insert on public.invoice_exports;
create policy invoice_exports_insert
on public.invoice_exports
for insert to authenticated
with check (public.is_org_member(organization_id));

drop policy if exists invoice_exports_delete on public.invoice_exports;
create policy invoice_exports_delete
on public.invoice_exports
for delete to authenticated
using (
  public.has_org_role(
    organization_id,
    array['organization_owner','organization_admin','operations_manager']
  )
);

create or replace function public.record_invoice_export(
  p_organization_id uuid,
  p_invoice_batch_id uuid,
  p_export_format text,
  p_filename text,
  p_metadata jsonb default '{}'::jsonb
)
returns public.invoice_exports
language plpgsql
security invoker
set search_path = public
as $$
declare
  result public.invoice_exports;
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'not authorized for organization';
  end if;

  if p_export_format not in ('pdf','csv') then
    raise exception 'unsupported export format';
  end if;

  if not exists (
    select 1
    from public.invoice_batches
    where id=p_invoice_batch_id
      and organization_id=p_organization_id
  ) then
    raise exception 'invoice batch not found';
  end if;

  insert into public.invoice_exports(
    organization_id,
    invoice_batch_id,
    export_format,
    filename,
    exported_by,
    metadata
  )
  values(
    p_organization_id,
    p_invoice_batch_id,
    p_export_format,
    p_filename,
    auth.uid(),
    coalesce(p_metadata,'{}'::jsonb)
  )
  returning * into result;

  return result;
end;
$$;

grant execute on function public.record_invoice_export(uuid,uuid,text,text,jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
