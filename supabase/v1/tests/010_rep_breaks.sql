select to_regclass('public.rep_shift_breaks') as rep_shift_breaks_table;

select proname
from pg_proc
where proname in (
  'current_rep_break',
  'rep_field_access_active',
  'start_rep_break',
  'end_rep_break'
)
order by proname;

select policyname, tablename
from pg_policies
where tablename in ('rep_shift_breaks','locations')
  and policyname in ('rep_shift_breaks_select','locations_shift_gated_select')
order by tablename, policyname;
