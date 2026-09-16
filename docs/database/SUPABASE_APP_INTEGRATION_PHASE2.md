# v1.0 App Integration — Phase 2

Phase 2 moves the platform configuration layer to Supabase.

## Supabase-backed now

- Organization settings
- Teams
- Markets
- Territories
- Representatives
- Representative ↔ territory assignments
- Interaction dispositions
- Locations
- CSV location import

## Compatibility bridge

After Supabase configuration loads, it hydrates the existing `PlatformStore` configuration records.

That keeps the current operational pages compatible while transactional modules remain local.

```text
Supabase configuration
        ↓
SupabaseConfigProvider
        ↓
PlatformStore configuration snapshot
        ↓
Existing operational UI
```

## Still local in Phase 2

- Interactions
- Products/offers
- Sales attempts/orders
- Scheduling transactions
- Lifecycle events
- Finance
- Reporting aggregates

## Test sequence

1. Sign in.
2. Open `/admin/teams`.
3. Create a team.
4. Refresh and confirm it remains.
5. Verify the row exists in Supabase Table Editor.
6. Create a market.
7. Create a territory assigned to the new market/team.
8. Create a representative and assign the territory.
9. Create/edit a disposition.
10. Add a location assigned to the territory/rep.
11. Refresh the app.
12. Confirm all records persist.
13. Open the normal `/territories`, `/representatives`, and `/locations` pages and confirm the Supabase configuration is visible there through the compatibility bridge.
14. Sign out/in and confirm configuration reloads from Supabase.

Keep:

```env
NEXT_PUBLIC_USE_MOCK_DATA=true
```

until transactional modules are migrated.
