# v1.0 App Integration — Phase 6: Lifecycle Operations

Phase 6 moves the post-sale lifecycle workflow to Supabase.

## Supabase-backed now

- lifecycle stages
- lifecycle event history
- current lifecycle stage
- fulfillment queue
- lifecycle exception queue
- manual lifecycle transitions
- order/location/representative/appointment context
- Installed transition
- Activated transition
- Cancelled transition

## Database-owned operational side effects

`record_lifecycle_stage` performs the lifecycle event and related operational
updates in one transaction.

### Installed

- creates the Installed lifecycle event
- marks the linked active appointment `completed`

### Activated

- creates the Activated lifecycle event
- completes the linked appointment if needed
- moves `orders.status` to `closed`

### Cancelled

- creates the Cancelled lifecycle event
- cancels scheduled appointments
- moves `orders.status` to `cancelled`

Terminal lifecycle states cannot be changed again through the RPC.

## Finance boundary

The existing `create_invoice_batch` backend function already uses
`order_lifecycle_current` and accepts lifecycle categories:

- installed
- activated

Therefore, after Phase 6, moving an order to Installed makes it eligible for
the Finance migration in Phase 7.

## Test

1. Run migration 015.
2. Open `/lifecycle`.
3. Find the existing test order.
4. Open it.
5. Move it to Installed.
6. Verify `lifecycle_events` has the Installed row.
7. Verify `order_lifecycle_current.lifecycle_category = installed`.
8. Verify the linked appointment is `completed`.
9. Refresh and sign out/in; Installed must persist.
