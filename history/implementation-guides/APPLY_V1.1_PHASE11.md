# v1.1 Phase 11 — Onboarding, Configuration & Admin Polish

Phase 11 makes the platform easier to configure for a new organization without requiring database knowledge.

## New Setup Center
Route:

`/admin/setup`

The guided checklist evaluates the live tenant configuration and walks an administrator through:

1. Organization profile
2. Teams and partners
3. Markets
4. Territories
5. Field dispositions
6. Representatives
7. Locations / footprint
8. Products and offers
9. Scheduling policies
10. Lifecycle stages

Each step shows:
- complete / action-needed / waiting state
- prerequisite awareness
- current record counts
- direct navigation to the correct admin screen
- next recommended configuration action

## Readiness
The Setup Center includes:
- workspace readiness percentage
- operational readiness state
- location count
- active rep count
- unassigned prospect count
- assignment coverage

## Admin polish
- Setup Center added to the main Configuration navigation
- Setup Center added to Admin tabs
- Admin overview now includes configuration readiness and next action
- Organization page links directly to Setup Center

## Database
No Supabase migration is required.

## Test
After applying:

```powershell
npm run build
npm run dev
```

Then open:

`/admin/setup`
