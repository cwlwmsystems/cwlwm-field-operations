-- Phase 15.5 smoke test: function should now be SECURITY DEFINER.
select
  p.proname,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'submit_order';

-- Verify execute grant remains authenticated-only/useful.
select
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'submit_order'
order by grantee, privilege_type;
