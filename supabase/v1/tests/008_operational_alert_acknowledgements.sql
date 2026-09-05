-- Phase 9 operational alert acknowledgement smoke checks.

select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'operational_alert_acknowledgements';

select
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'operational_alert_acknowledgements'
order by ordinal_position;

select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'operational_alert_acknowledgements'
order by policyname;
