# v1.1 Phase 12 — Invite / Password Setup Flow Fix

This hotfix replaces the fragile browser-only invite session flow with a proper
server-side Supabase token exchange.

## What changed

- Adds `/auth/confirm`
- Verifies Supabase `token_hash` values on the server
- Stores the resulting Supabase session in cookies
- Redirects the user to `/accept-invite`
- `/accept-invite` then allows the user to create a password
- New invitations use `/auth/confirm` as the redirect target
- Admins can send an existing user a fresh **Password Setup Email**
- Includes the cumulative Phase 12 TypeScript build fixes

## IMPORTANT — Supabase Dashboard Changes

The application code and the Supabase email templates must both be updated.

### 1. Authentication → URL Configuration → Redirect URLs

Add:

Production:

`https://cwlwm-field-operations.vercel.app/auth/confirm`

Local testing:

`http://localhost:3000/auth/confirm`

You can leave the existing `/accept-invite` redirect URL in place.

### 2. Authentication → Email Templates → Invite User

The invite button/link must point to:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite&next=/accept-invite">
  Accept invitation
</a>
```

Do not use `{{ .ConfirmationURL }}` for this app's SSR invite flow.

### 3. Authentication → Email Templates → Reset Password / Recovery

The password setup/reset button/link must point to:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery&next=/accept-invite">
  Set password
</a>
```

This allows an administrator to recover an account where the original invite
was already clicked but no password was created.

## Existing affected user

For the account whose invite was already clicked:

1. Deploy this hotfix.
2. Update the Invite User and Recovery email templates above.
3. Open **Admin → Users & Invitations**.
4. Manage that user.
5. Click **Send Password Setup Email**.
6. Open the newest email.
7. The link should pass through `/auth/confirm`, establish the session, and land
   on `/accept-invite` with the password form visible.

## Build

```powershell
npm run build
```
