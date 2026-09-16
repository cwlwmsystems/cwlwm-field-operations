# Phase 15.5 — Representative Sale Submission RLS Fix

## Symptom

A representative can:
- clock in
- see an assigned address
- start a sale

but **Submit Order** fails with:

`location not found in organization`

## Cause

The existing `submit_order` RPC was `SECURITY INVOKER` and locked the location
row with `SELECT ... FOR UPDATE`.

Phase 15 introduced stricter representative RLS on `locations`. The sales RPC
was therefore depending on the representative's row policies while performing
a transactional row lock. A valid visible location could be filtered from the
RPC operation and produce the misleading "not found" error.

## Fix

Run migration:

`supabase/v1/migrations/027_rep_sale_submit_rls_fix.sql`

The order RPC is now `SECURITY DEFINER`, but it does **not** blindly bypass
authorization. It explicitly validates:

- authenticated user
- active organization membership
- allowed operational role
- representative is clocked in
- representative is not on break
- submitted representative matches the signed-in rep
- location belongs to the organization
- location is directly assigned to the rep OR belongs to an actively assigned territory
- submitted territory matches the actual location
- submitted team matches the actual location when applicable
- active product belongs to the organization
- active offer belongs to the organization
- offer belongs to the selected product
- sales attempt belongs to the same organization/location

This lets the transaction safely lock the real location row without relying on
caller RLS for the internal lock.

## Test

1. Run migration 027.
2. Sign in with the representative account.
3. Clock in.
4. Open an assigned address.
5. Start Sale.
6. Complete customer/product/offer/install.
7. Submit Order.
8. Confirm the order is created and appointment booking continues.

No frontend code change is required.
