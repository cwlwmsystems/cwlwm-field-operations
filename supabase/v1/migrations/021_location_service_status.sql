begin;

alter table public.locations
  add column if not exists service_status text not null default 'prospect';

alter table public.locations
  drop constraint if exists locations_service_status_check;

alter table public.locations
  add constraint locations_service_status_check
  check (service_status in (
    'prospect',
    'current_customer',
    'do_not_knock',
    'vacant',
    'business'
  ));

create index if not exists locations_org_service_status_idx
  on public.locations (organization_id, service_status);

commit;
