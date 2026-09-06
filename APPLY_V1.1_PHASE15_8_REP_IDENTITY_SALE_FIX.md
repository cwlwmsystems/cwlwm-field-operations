# Phase 15.8 — Representative Identity Sale Fix

## Symptom

A rep logs in, selects their own visible name in the sale form, and receives:

`order representative does not match signed-in representative`

## Cause

There are two separate concepts:

1. the representative selected from the form/configuration list
2. the representative profile tied to the authenticated rep's active shift

For a representative user, the database correctly treats the active shift's
`representative_id` as the authoritative identity.

The sale form was still allowing that user to manually select a representative
row. If there is an older duplicate representative record, a stale assignment,
or a different representative row with the same name/email, the dropdown can
submit an ID that is not the ID attached to the authenticated user's shift.

The names can look identical while the UUIDs are different.

## Fix

Representatives can no longer manually choose the representative on their own
sale.

For role `representative`, the sale wizard now uses:

`shiftClock.activeShift.representativeId`

as the canonical representative ID for:

- saving the sales attempt
- submitting the order
- booking the installation appointment

The Representative field is shown as a locked identity display rather than a
dropdown.

Managers/admins retain the representative dropdown because they may legitimately
enter a sale on behalf of another rep.

## Result

Representative flow is now:

`Login → Clock In → Start Sale → identity comes from active shift → Submit`

A rep can no longer accidentally submit another duplicate/stale representative
UUID just because the visible name is the same.

## No database migration

This is a frontend identity-source fix. Migration 027 should remain in place.

## Test

```powershell
npm run build
npm run dev
```

Then:

1. Log in as the representative.
2. Clock in.
3. Start a sale.
4. Confirm Representative is not a dropdown.
5. Confirm it shows the signed-in/clocked-in representative.
6. Submit the sale.
7. Confirm it saves and returns to Field Workspace.
