-- Phase 15.1 smoke checks
select to_regclass('public.rep_shift_sessions') as rep_shift_sessions_table;

select proname
from pg_proc
where proname in (
  'clock_in_rep_shift',
  'clock_out_rep_shift',
  'has_active_rep_shift',
  'current_rep_id'
)
order by proname;

select policyname, tablename
from pg_policies
where tablename in ('rep_shift_sessions','locations')
  and policyname in ('rep_shift_sessions_select','locations_shift_gated_select')
order by tablename, policyname;
