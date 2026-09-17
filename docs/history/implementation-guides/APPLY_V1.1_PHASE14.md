# v1.1 Phase 14 — Security & Audit Administration

Adds a dedicated security administration area at:

`/admin/security`

## Included

- active/inactive user counts
- owner/admin counts
- recent role change count
- recent manual password change count
- recent deactivation count
- organization user posture table
- last sign-in visibility
- security/audit event history
- period selector: 7 / 30 / 90 days
- action filtering
- role-gated direct route access
- new `security.view` permission
- manual account creation audit event
- manual password reset audit event

## Access

Allowed:
- organization_owner
- organization_admin
- operations_manager

Not allowed:
- team_manager
- representative
- analyst
- viewer

## Data

Uses the existing `audit_log` table and existing organization membership records.
No Supabase migration is required.

## Required server environment

`SUPABASE_SERVICE_ROLE_KEY`

## Test

```powershell
npm run build
npm run dev
```

Then:
1. Sign in as owner/admin/operations manager and open `/admin/security`.
2. Confirm user counts and last sign-in values.
3. Create a manual account and verify `user_created_manually` appears.
4. Set a password manually and verify `password_set_manually` appears.
5. Sign in as a representative and manually visit `/admin/security`; access should be denied.
