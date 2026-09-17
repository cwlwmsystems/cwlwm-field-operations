# v1.1 Phase 12 — Manual User Account Setup

This patch makes SMTP/email optional.

## New admin workflow

In `/admin/users`, admins can now create an account directly with:

- email
- temporary password
- organization role
- team assignments
- representative link

The Auth user is created with `email_confirm: true`, so the user can sign in immediately.

## Manual password reset

Admins can also open an existing user and set a new password directly.

This avoids the need for:
- SMTP
- Invite User email templates
- Recovery email templates
- invitation acceptance links

## Existing invite code

The invite / email-based flow remains in the project for future use, but it is no longer required for normal account setup.

## Environment

`SUPABASE_SERVICE_ROLE_KEY` is still required on the server.

## Database

No Supabase migration is required.

## Build

```powershell
npm run build
npm run dev
```

Then open `/admin/users` and create a test account manually.
