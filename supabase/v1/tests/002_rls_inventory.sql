select schemaname, tablename, rowsecurity
from pg_tables
where schemaname='public'
order by tablename;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname='public'
order by tablename,policyname;
