# Cwlwm Field Operations

Current local prototype: **v0.9 — Scheduling & Capacity Management**.

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


## v0.9

Lifecycle & Integrations adds configurable post-sale stages, external-system mappings, lifecycle history, external IDs, and an exception queue. See `docs/LIFECYCLE_INTEGRATIONS_V0.7.md`.


## v0.9

Finance Operations adds invoice-ready queues, configurable invoice numbering, batch creation, CSV export, order-to-invoice tracking, and adjustment/clawback workflows. See `docs/FINANCE_OPERATIONS_V0.8.md`.


## v0.9

Reporting & Analytics adds management dashboards for sales, representatives, territories, scheduling, lifecycle, exceptions, and finance. See `docs/REPORTING_ANALYTICS_V0.9.md`.


## v1.0 Phase 1

Supabase Auth + organization context is now integrated while operational modules remain in mock/local mode. See `docs/SUPABASE_APP_INTEGRATION_PHASE1.md`.


## v1.0 Phase 2

Admin & Configuration now read/write Supabase while the existing operational store remains as a compatibility layer for transactional modules. See `docs/SUPABASE_APP_INTEGRATION_PHASE2.md`.


## v1.0 Phase 3

Territory Operations now uses Supabase for field interactions, current location disposition/rep assignment, follow-up data, and operational timelines. See `docs/SUPABASE_APP_INTEGRATION_PHASE3.md`.


## v1.0 Phase 4
Sales attempts, product/offer selection, order submission, duplicate protection, and Sales Review now use Supabase.


## v1.0 Phase 5
Scheduling policies, live capacity, appointments, rescheduling, cancellation, and sales-to-appointment booking now use Supabase.


## v1.0 Phase 6
Lifecycle Operations now uses Supabase for fulfillment state, Installed/Activated/Cancelled transitions, lifecycle history, and exception handling.


## v1.0 Phase 7
Finance & Invoicing now uses Supabase for eligibility, invoice batches, numbering, items, adjustments, totals, and invoice status history.


## v1.0 Phase 8
Live Supabase reporting, invoice PDF/CSV downloads, and audited export history are now integrated.


## v1.0 Phase 9
Production hardening removes the runtime mock-store dependency, tightens Supabase write permissions, adds atomic field-interaction writes, admin/audit controls, health checks, and deployment verification.
