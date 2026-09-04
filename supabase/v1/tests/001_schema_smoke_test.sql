select
  to_regclass('public.organizations') is not null as organizations_exists,
  to_regclass('public.orders') is not null as orders_exists,
  to_regclass('public.appointments') is not null as appointments_exists,
  to_regclass('public.lifecycle_events') is not null as lifecycle_events_exists,
  to_regclass('public.invoice_batches') is not null as invoice_batches_exists,
  to_regclass('public.audit_log') is not null as audit_log_exists;

select count(*) as seeded_organizations from public.organizations;
select count(*) as seeded_lifecycle_stages from public.lifecycle_stages;
select count(*) as seeded_products from public.products;
