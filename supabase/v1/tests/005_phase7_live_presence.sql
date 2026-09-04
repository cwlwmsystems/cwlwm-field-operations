-- Phase 7 live presence smoke checks.
-- Run after migration 019.

select to_regclass('public.live_presence') as live_presence_table;

select proname
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'touch_live_presence';

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'live_presence'
order by policyname;
