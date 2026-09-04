-- v1.1 Phase 7 sale-lock/reschedule smoke checks.
-- Safe read-only checks; run after migration 020.

select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'reschedule_appointment';

select
  count(*) filter (where status in ('scheduled','rescheduled')) as active_appointments,
  count(*) filter (where order_id is not null) as linked_to_orders
from public.appointments;
