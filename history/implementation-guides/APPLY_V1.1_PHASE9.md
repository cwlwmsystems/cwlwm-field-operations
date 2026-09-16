# v1.1 Phase 9 — Notifications & Operational Alerts

Adds a manager-facing `/alerts` attention queue.

## Alert sources
- open lifecycle exceptions
- orders with `needs_attention`
- past-due install appointments
- install no-shows
- stale rep presence (30+ minutes)
- active assigned reps with no presence record
- large/unassigned prospect workload by territory

## Alert workflow
Alerts are generated from live operational data. Each user can:
- acknowledge an alert
- dismiss an alert
- restore an acknowledged/dismissed alert
- filter by severity and category
- show/hide acknowledged items
- manually refresh or use 60-second auto-refresh

Acknowledgement state is per user and does not modify the underlying operational record.

## Database
Run:

`supabase/v1/migrations/022_operational_alert_acknowledgements.sql`

This creates the small acknowledgement table and RLS policies.

## Test
Run:

`supabase/v1/tests/008_operational_alert_acknowledgements.sql`

## App
After applying:

```powershell
npm run build
npm run dev
```

Open `/alerts` as an owner/admin/operations manager/team manager.
