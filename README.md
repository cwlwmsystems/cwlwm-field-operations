# Cwlwm Field Operations

A clean, configurable field-sales and territory-operations platform foundation.

**Current milestone:** v0.3 Territory Operations

## Run locally

```bash
npm install
npm run dev
```

The development scaffold runs with synthetic mock data and does not require a live Supabase project yet.

Open:

- `/dashboard`
- `/territories`
- `/territories/terr_north`
- `/locations`
- `/locations/loc_1`

## v0.3 workflow

Territory → Assigned Representatives → Locations → Location Detail → Record Interaction → Timeline

Interactions created in mock mode are persisted to browser `localStorage`, not to a backend.

## Database

The `supabase/` directory contains the clean multi-tenant v0.2 database foundation. Do not run these migrations against an employer production database. Use a new Supabase project when service availability permits.

See:

- `docs/CLEAN_ROOM_RULES.md`
- `docs/FOUNDATION_V0.2.md`
- `docs/TERRITORY_OPERATIONS_V0.3.md`
