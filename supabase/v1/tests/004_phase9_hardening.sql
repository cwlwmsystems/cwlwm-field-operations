-- Phase 9 hardening inventory. Read-only.
select 'rls_disabled' as check_name, count(*)::text as result
from pg_tables
where schemaname='public'
  and tablename in (
    'organizations','organization_memberships','teams','markets','territories',
    'representatives','locations','location_interactions','sales_attempts','orders',
    'appointments','lifecycle_events','invoice_batches','invoice_items','adjustments',
    'invoice_exports','audit_log'
  )
  and rowsecurity=false;

select 'required_functions' as check_name, count(*)::text as result
from information_schema.routines
where routine_schema='public'
  and routine_name in (
    'is_org_member','has_org_role','can_admin_org','can_operate_org',
    'record_location_interaction','submit_order','book_appointment',
    'record_lifecycle_stage','create_invoice_batch','record_invoice_export'
  );

select tablename, policyname, cmd
from pg_policies
where schemaname='public'
  and tablename in (
    'locations','location_interactions','sales_attempts','orders','appointments',
    'lifecycle_events','invoice_batches','invoice_exports','audit_log'
  )
order by tablename,policyname;
