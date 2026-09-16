# Phase 9 — Production Readiness

Phase 9 removes the application runtime dependency on the legacy browser mock
store and hardens the Supabase write surface.

## Runtime architecture

```text
Supabase Auth
  -> Organization membership
  -> Supabase configuration
  -> Territory Operations
  -> Sales
  -> Scheduling
  -> Lifecycle
  -> Finance
  -> Reporting / Exports
```

`PlatformStoreProvider` is no longer in `app/layout.tsx`.

The old `lib/mock` and `lib/store/platformStore.tsx` files may remain in the
repository temporarily for historical reference, but production pages/providers
no longer import them.

## Access model

Management roles:
- organization_owner
- organization_admin
- operations_manager

Field operation roles:
- team_manager
- representative

Read-oriented roles:
- analyst
- viewer

Phase 9 restricts configuration, lifecycle, finance, audit, and destructive
writes more tightly than the original generic member-write RLS policies.

## Atomic location interactions

Field interactions and Sales-to-location state synchronization now call
`record_location_interaction`.

The RPC:
- validates organization access
- validates the location
- validates representative/disposition organization ownership
- upserts idempotently using `client_submission_id`
- updates current disposition
- updates current representative
- performs the operation in one database transaction

## Production UI

Phase 9 also:
- converts Dashboard, Teams, Markets, Organization, Finance settings, and
  Lifecycle admin pages to Supabase data
- removes the local "Reset Demo Data" workflow
- adds an Admin role gate
- adds an Audit Log page
- adds production health checks
- adds global error/loading/not-found states
- removes `NEXT_PUBLIC_USE_MOCK_DATA`

## Release gate

Before production deployment:

1. `npm run build` succeeds locally.
2. `grep`/IDE search shows no active page/provider imports of `lib/mock` or
   `lib/store/platformStore`.
3. Migration 018 is applied.
4. Phase 9 SQL inventory returns:
   - `rls_disabled = 0`
   - required function count = 10
5. Owner/admin workflows pass.
6. Representative can record interaction, save sale, submit order, and book.
7. Representative cannot access Admin configuration.
8. Analyst can read reports but cannot mutate operations.
9. Viewer cannot mutate.
10. Cross-organization records cannot be read or changed.
11. `.env.local` is not tracked in Git.
12. Supabase service-role key is not present in frontend code or Git history.
13. Seed/demo SQL is not run in the production tenant unless intentionally
    provisioning a demo organization.
