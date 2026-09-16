# Foundation v0.2

## Completed

- Clean tenant architecture
- Organization roles and team memberships
- Explicit RLS policies
- Cross-tenant FK guards
- Generic products/offers/dispositions/lifecycle
- Idempotent order submission
- Appointment slot locking/capacity protection
- Location status projection from interactions
- Audit logging foundation
- Synthetic seed data
- Mock-data UI scaffold

## Before production

- Revoke direct execute on privileged RPCs where appropriate and grant only intended roles.
- Add representative-only territory/location filters.
- Add RPC-specific payload validation using stricter constraints.
- Add integration credential storage through a secrets mechanism rather than database JSON.
- Add full pgTAP auth/RLS test fixtures.
- Add lifecycle current-state materialization.
- Add import jobs with validation/reject reporting.
- Add product/offer eligibility engine.
