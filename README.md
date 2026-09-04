# Cwlwm Field Operations

Current local prototype: **v0.7 — Scheduling & Capacity Management**.

This is a clean, company-agnostic field operations platform scaffold. Development currently runs in browser-local mode so product work can continue without a Supabase project.

## Current modules

- organization, team, market, territory and representative configuration
- location management and CSV import
- configurable dispositions and field interaction timeline
- partial sales capture and resume
- products / offers and order submission
- sales review
- scheduling policies, blackout/capacity overrides, live slot availability
- appointment booking, rescheduling, cancellation and completion

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Important

All demo records are synthetic. Do not place former-employer customer data, credentials, private pricing, proprietary network data, or branded assets in this repository.


## v0.7

Lifecycle & Integrations adds configurable post-sale stages, external-system mappings, lifecycle history, external IDs, and an exception queue. See `docs/LIFECYCLE_INTEGRATIONS_V0.7.md`.
