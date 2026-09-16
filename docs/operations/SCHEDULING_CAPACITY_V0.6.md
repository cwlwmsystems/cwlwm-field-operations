# Scheduling & Capacity — v0.6

v0.6 replaces arbitrary appointment date/time entry with a configurable scheduling module.

## Capabilities

- scheduling policies per territory
- configurable allowed weekdays
- configurable slot times
- default capacity per slot
- minimum lead time
- full-day and time-specific blackout rules
- one-off capacity overrides
- live availability display
- booking during sales submission
- appointment dashboard
- reschedule / cancel / complete actions
- automatic capacity release when an appointment is cancelled
- linked order date/time updates on reschedule

## Local prototype behavior

The local store rejects booking requests when the selected slot has no remaining capacity. This validates the product flow but is not a substitute for a transactional database lock when multiple devices submit at exactly the same time.

The production Supabase foundation should use the transaction-safe booking RPC from the database layer for concurrency protection.

## Persistence

v0.6 stores browser-local data under:

`cwlwm-platform-data:v0.6`

If no v0.6 record exists, the store automatically upgrades an existing v0.5 or v0.4 record and adds scheduling collections.
