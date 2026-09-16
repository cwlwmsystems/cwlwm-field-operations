# v1.0 App Integration — Phase 1

Phase 1 adds real Supabase authentication and organization context while preserving the existing local operational store.

## Real in Phase 1

- Email/password sign-in via Supabase Auth
- Session persistence
- Sign-out
- `organization_memberships` lookup
- Organization lookup through RLS
- Active organization/role context
- Protected `AppShell`
- `/connection` verification page

## Intentionally still local

With:

```env
NEXT_PUBLIC_USE_MOCK_DATA=true
```

these modules still use the existing browser store:

- Teams
- Markets
- Territories
- Representatives
- Locations
- Interactions
- Sales
- Scheduling
- Lifecycle
- Finance
- Reporting

## Security expectation

The frontend uses only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

No service-role key belongs in the browser application.

## Test sequence

1. Restart Next.js after applying the update.
2. Open `/login`.
3. Sign in using the Supabase Auth user that was bootstrapped as organization owner.
4. Confirm `/connection` displays:
   - your authenticated email
   - your Supabase user UUID
   - Northstar Field Services
   - organization owner
   - mock operational data
5. Refresh the browser and confirm the login session persists.
6. Visit `/dashboard` and several operational pages.
7. Confirm the existing v0.9 functionality still works.
8. Sign out and confirm protected pages redirect to `/login`.

## Next phase

Phase 2 will move Admin & Configuration to Supabase:

- teams
- markets
- territories
- representatives
- representative territories
- dispositions
- locations

The mock store remains available until each module is verified.
