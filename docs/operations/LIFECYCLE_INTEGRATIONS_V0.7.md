# Cwlwm Field Operations v0.7 — Lifecycle & Integrations

v0.7 introduces a generic post-sale lifecycle engine.

## Added

- Configurable lifecycle stages
- Configurable external integrations
- External-status → lifecycle-stage mappings
- External record IDs
- Lifecycle event history
- Current lifecycle projection
- Manual lifecycle updates
- Synthetic external-event simulator
- Lifecycle exception queue
- Exception resolution/dismissal
- Automatic `Submitted` lifecycle event on newly submitted orders
- Lifecycle status on order detail

## Integration model

The product does not know about a specific CRM or billing system.

```text
Order
  ↓
Integration
  ↓
External Record
  ↓
External Status
  ↓
Mapping
  ↓
Lifecycle Stage
  ↓
Lifecycle Event
```

An unknown external status does not silently change an order. It creates an exception.

## Local prototype storage

v0.7 stores the complete local platform state under:

```text
cwlwm-platform-data:v0.7
```

If v0.7 storage does not exist, the store automatically upgrades v0.6/v0.5/v0.4 local data.

## Production direction

When Supabase is available, these local types map naturally to:

- `integrations`
- `lifecycle_stages`
- `external_records`
- `order_lifecycle_events`

The backend should perform idempotency, tenant validation, lifecycle projection, and integration authentication.
