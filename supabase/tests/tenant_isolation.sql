-- Run after creating two auth test users and memberships.
-- These are acceptance assertions/documented test cases for pgTAP conversion later.

-- EXPECT: an Org A authenticated member selecting public.locations sees only Org A rows.
-- EXPECT: Org A insert referencing Org B territory fails with "Cross-organization reference rejected."
-- EXPECT: Org A order referencing Org B location fails.
-- EXPECT: Org A appointment referencing Org B slot fails.
-- EXPECT: unauthenticated users have no tenant table policies and therefore no access.
-- EXPECT: team-scoped users cannot mutate another team's locations.

-- Integrity check independent of auth:
do $$
begin
  begin
    insert into public.locations(organization_id,territory_id,address1)
    values('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000301','Cross Tenant Test');
    raise exception 'TEST FAILED: cross-tenant location insert was accepted.';
  exception when check_violation then
    raise notice 'PASS: cross-tenant reference rejected.';
  end;
end $$;
