# Phase 15.2 — Representative Account Auto-Link

## Why the message appeared

A user with organization role `representative` and a row in Supabase Auth is
not automatically the same thing as a row in the `representatives` table.

The time clock correctly requires the field representative profile because that
profile owns territory assignments, field activity attribution, workload, and
reporting.

The Admin > Users workflow should hide that implementation detail from the
administrator. Creating a representative user should make a usable rep account.

## Fix

Run:

`supabase/v1/migrations/025_representative_account_auto_link.sql`

The clock-in RPC now:

1. uses an already-linked representative profile, or
2. links an existing unlinked representative with the same email, or
3. creates an active representative profile automatically.

The Admin Users API is also updated so future manually-created users with role
`representative` get their representative profile created/linked during account
creation rather than waiting for first clock-in.

## Existing representative account

You do NOT need to delete and recreate the user you already made.

After migration 025:
- refresh the app
- sign in with that representative account
- click Clock In & Start Day

The account will be linked automatically.

If the new representative has no territory assignment yet, clock-in will work,
but the rep will correctly have no addresses until an administrator assigns a
territory or locations to that rep.
