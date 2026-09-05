# v1.1 Phase 8 — Territory Intelligence & Workload Management

Adds territory-scale operational intelligence for full-footprint imports.

## Included
- Territory list with total locations, prospects, customers, penetration, unworked prospects, and assignment coverage.
- Territory detail command center with service-status KPIs, worked locations, and sales conversion.
- Satellite territory map with service-status filtering.
- Service-status-aware map pin colors.
- Assignment filters and bulk assignment of eligible prospects to territory reps.
- Bulk unassignment for the filtered eligible prospect set.
- Rep workload counts.
- Field workspace service-status filters.
- Persists `service_status` when editing a location.

## Security
Bulk assignment is shown only for organization owner, organization admin, and operations manager roles. Existing Supabase RLS remains authoritative.

## Database
No new migration is required. This phase uses the existing `service_status` and `current_representative_id` fields.

## Apply

```powershell
npm run build
npm run dev
```

Then open `/territories`, choose a territory, and test filters and a small bulk assignment before assigning an entire footprint.
