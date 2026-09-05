# v1.1 Phase 12 — Organization Users, Invitations & Access Control

## New administration page

`/admin/users`

Owners and organization administrators can:
- invite a new user by email
- add an existing Supabase account to the organization
- assign an organization role
- assign one or more teams
- link a login to an existing representative record
- activate or suspend organization membership
- review invitation / active / inactive status
- review last sign-in activity

## Invitation activation

New invitations redirect to:

`/accept-invite`

The invited user can set their password and then enter the application.

## Security

User invitation requires Supabase Auth Admin APIs. Add this **server-only** environment variable locally and in Vercel:

```text
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Do **not** prefix it with `NEXT_PUBLIC_`. The key is only read inside the server route:

`/app/api/admin/users/route.ts`

The browser sends the signed-in user's bearer token to the server. The server verifies that token and confirms the caller has `organization_owner` or `organization_admin` access before any Auth Admin operation.

Additional protections:
- organization admins cannot grant or modify owner access
- the last active organization owner cannot be deactivated or demoted
- users cannot deactivate their own current membership
- representative logins cannot be linked to a representative already linked to another user
- deactivation preserves operational history

## Supabase database

No new database migration is required. Phase 12 uses existing:
- `organization_memberships`
- `team_memberships`
- `representatives.user_id`
- Supabase Auth users

## Apply

1. Apply this update over the project root.
2. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`.
3. Add the same server-only variable to the Vercel project environment.
4. Run:

```powershell
npm run build
npm run dev
```

5. Open `/admin/users`.
