# Phase 15.7 — Representative Sale Redirect Fix

## Symptom

A representative successfully submits a sale and appointment, then is
immediately redirected to an unauthorized page.

## Cause

The sale wizard always redirected to:

`/sales/orders/{orderId}`

That route belongs to the Sales management area. Representatives are
intentionally allowed to use `/sales/new/...` for field sales capture, but they
are intentionally blocked from the general Sales management/order-detail area.

So the sale saved correctly, and then the app navigated the rep into a route
their role should not be allowed to open.

## Fix

The post-sale flow is now role-aware.

For a representative:

`Submit Order → appointment booked → /field`

The Field Workspace shows a success banner:

`Sale submitted successfully.`

For managers/admins:

`Submit Order → appointment booked → /sales/orders/{id}`

The detailed management workflow is unchanged.

Additional rep-safe cleanup:
- Abandon Sale returns a rep to `/field`, not `/sales`
- sale breadcrumbs send reps back to `Field`, not `Locations`
- location-not-found return action is also role-aware

No Supabase migration is required.

## Test

1. `npm run build`
2. Log in as a representative.
3. Clock in.
4. Start a sale.
5. Submit the order and book an install.
6. Confirm the rep is returned to Field Workspace.
7. Confirm the success banner appears.
8. Confirm the rep is not sent to `/sales/orders/...`.
