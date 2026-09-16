# Phase 4 Sales → Location State Sync Hotfix

This completes the missing bridge between Sales and Territory Operations.

## Save Progress

Saving an in-progress sales attempt now:

- saves/verifies `sales_attempts`
- creates or updates one `location_interactions` record for that attempt
- uses the configured `Interested` disposition
- sets `locations.current_disposition_id`
- sets `locations.current_representative_id`
- refreshes the location/timeline UI

The interaction uses the sales attempt UUID as its `client_submission_id`, so
repeated saves update one interaction instead of creating duplicates.

## Submit Order

Submitting an order now:

- calls the existing idempotent `submit_order` RPC
- converts the attempt
- creates the backend `Submitted` lifecycle event
- creates one `Sale` location interaction
- updates current disposition to `Sale`
- updates current representative
- refreshes Territory Operations

The order UUID is used as the Sale interaction's `client_submission_id`.

## Configuration loader fix

Locations now load `current_disposition_id` from Supabase instead of displaying
`Unvisited` unconditionally.

## Verification

### Save progress

1. Resume/start a sale.
2. Save Progress.
3. Verify `sales_attempts`.
4. Verify `location_interactions` contains an `interaction_type = sales_attempt`.
5. Verify the interaction disposition is `Interested`.
6. Verify the location's current disposition is `Interested`.
7. Verify current representative matches the selling rep.
8. Refresh the Locations UI and confirm it displays `Interested`.

### Submit

1. Submit the order.
2. Verify the order exists.
3. Verify attempt = `converted`.
4. Verify lifecycle `Submitted` event exists.
5. Verify a second interaction exists with `interaction_type = sale`.
6. Verify its disposition is `Sale`.
7. Verify location current disposition = `Sale`.
8. Verify current representative = the selling rep.
9. Refresh the location detail page; timeline should include both the sales attempt and Sale.
