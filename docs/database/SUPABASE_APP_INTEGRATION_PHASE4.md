# v1.0 App Integration — Phase 4: Sales

Supabase-backed:
- products and offers used by sales
- in-progress/abandoned sales attempts
- resume after refresh/sign-in
- order submission through `submit_order`
- idempotency via `client_submission_id`
- product/offer snapshots
- preferred install date/time and notes in metadata
- automatic attempt conversion
- automatic Submitted lifecycle event from the backend RPC
- Sales Review approve/flag writes

Still intentionally not migrated:
- appointment capacity/reservations (Phase 5)
- lifecycle operations UI
- finance
- reporting aggregates

## Verification
1. Start a sale from a Supabase location.
2. Enter customer data and click Save Progress.
3. Refresh; resume the same attempt.
4. Confirm `sales_attempts` contains it.
5. Select a product/offer and submit.
6. Confirm `orders` contains exactly one order.
7. Confirm attempt status became `converted`.
8. Confirm a Submitted row exists in `lifecycle_events`.
9. Approve/flag in Sales Review and confirm `orders.review_status`.
10. Sign out/in and verify all sales records remain.
