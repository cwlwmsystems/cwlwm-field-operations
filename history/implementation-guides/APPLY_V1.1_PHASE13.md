# v1.1 Phase 13 — Role & Permission Hardening

Phase 13 centralizes application access policy and closes the largest UI-level
authorization gap: hidden navigation links could previously still be opened
directly by URL.

## Central permission policy

New:

`lib/auth/permissions.ts`

Roles:

- organization_owner
- organization_admin
- operations_manager
- team_manager
- representative
- analyst
- viewer

The same permission policy now drives:
- sidebar visibility
- direct route access
- role descriptions
- the admin access matrix

## Hardened role behavior

### Organization Owner
Full access.

### Organization Admin
Full administrative and operational access, subject to owner safeguards.

### Operations Manager
Operational, finance, reporting, and configuration access.
No organization ownership/user-administration control.

### Team Manager
Field operations, territories, reps, sales, scheduling, dispatch, lifecycle,
alerts, and reporting.
No finance or tenant configuration.

### Representative
Command Center + Field Workspace only.

### Analyst
Command Center + Reports + Lifecycle + Finance.

### Viewer
Command Center + Reports + Lifecycle + Finance.

## Direct-route protection

`AppShell` now checks the current pathname against the permission matrix.
A user who manually enters a URL they do not have access to gets an access-denied
screen instead of the protected page.

This applies automatically to nested routes such as:
- `/sales/orders/...`
- `/territories/...`
- `/reports/...`
- `/admin/...`

## Access Matrix

New page:

`/admin/access`

It displays the effective permissions for every organization role.

## Data layer

This phase does not replace Supabase RLS. Existing RLS and role-aware RPCs remain
the data-layer security boundary. Phase 13 adds consistent application-layer
enforcement and removes accidental direct-route exposure.

## Database

No Supabase migration is required.

## Test

```powershell
npm run build
npm run dev
```

Recommended role smoke test:
1. Sign in as organization owner — verify full navigation.
2. Sign in as representative — verify only Command Center and Field Workspace.
3. Manually enter `/admin/users` as representative — verify access denied.
4. Sign in as team manager — verify operations/reports, but no Finance/Admin.
5. Sign in as analyst/viewer — verify reporting/lifecycle/finance only.
