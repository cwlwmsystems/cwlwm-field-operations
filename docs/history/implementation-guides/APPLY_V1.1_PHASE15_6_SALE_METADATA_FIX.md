# Phase 15.6 — Rep Sale Metadata Fix

## Symptom

After selecting an available install slot, sale submission shows:

`Cannot coerce the result to a single JSON object`

## Cause

The order itself was being created successfully by `submit_order`.

Immediately afterward, the frontend performed a direct:

`UPDATE orders ... .select("id").single()`

to save:
- notes
- installDate
- installTime

Production hardening intentionally allows representatives to create orders but
does **not** give representatives general UPDATE permission on `orders`.

RLS therefore returned zero rows to the `.single()` call, which PostgREST
reported as:

`Cannot coerce the result to a single JSON object`

## Fix

Run:

`supabase/v1/migrations/028_rep_order_metadata_rpc.sql`

This adds a narrow `SECURITY DEFINER` RPC:

`set_submitted_order_metadata`

It only permits a representative to update metadata for an order that:
- belongs to the same organization
- belongs to the signed-in representative
- is being updated while the rep has an active shift
- is not being updated while the rep is on break

Managers with operational roles remain supported.

The frontend now calls this RPC instead of directly updating the `orders` table.

General representative UPDATE access to orders remains blocked.

## Test

1. Run migration 028.
2. Apply the frontend patch.
3. `npm run build`
4. Sign in as the representative.
5. Clock in.
6. Start a sale.
7. Pick an install date/time.
8. Submit the sale.
9. Confirm there is no JSON coercion error.
10. Confirm the order, notes, and install metadata are saved.
