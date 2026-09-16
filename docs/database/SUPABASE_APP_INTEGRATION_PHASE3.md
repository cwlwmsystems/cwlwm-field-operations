# v1.0 App Integration — Phase 3

Phase 3 migrates Territory Operations to Supabase.

## Supabase-backed now

- Authentication
- Organization context
- Organization/Admin configuration
- Teams / markets / territories
- Representatives and territory assignments
- Dispositions
- Locations
- Location detail
- Location interaction timeline
- Field interaction writes
- Current location disposition
- Current representative on location
- Follow-up-needed / follow-up date
- CSV location import

## Territory interaction flow

```text
Location
  ↓
Representative
  ↓
Disposition
  ↓
Interaction insert
  ↓
locations.current_disposition_id updated
  ↓
locations.current_representative_id updated
  ↓
Timeline reloads from Supabase
```

## Still local after Phase 3

- Product/offer catalog usage in sales
- Partial sales
- Orders
- Scheduling transaction writes
- Lifecycle events
- Finance
- Reporting aggregates

Sales can still be started from a Supabase location, but its transaction remains in the existing local workflow until Phase 4.

## Test sequence

1. Open `/territories`.
2. Confirm territories come from Supabase.
3. Open a territory and confirm reps/locations.
4. Open a location.
5. Record `Not Home`.
6. Refresh and confirm the timeline persists.
7. Confirm `location_interactions` contains the row in Supabase.
8. Confirm the location's `current_disposition_id` changed.
9. Record `Interested` with a note/follow-up.
10. Refresh and verify it persists.
11. Sign out/in and verify the timeline reloads from Supabase.
