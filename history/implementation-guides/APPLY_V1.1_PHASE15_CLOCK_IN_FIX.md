# Phase 15.1 Clock-In Fix

The Clock In button was reaching the RPC, but the RPC attempted to write to an
audit_log column named `new_value`.

The existing audit table actually uses:

- `before_data`
- `after_data`
- `metadata`

So the clock-in transaction rolled back when the audit insert ran.

## Required SQL

If migration 023 has already been run, run:

`supabase/v1/migrations/024_rep_time_clock_rpc_fix.sql`

This replaces the clock-in and clock-out RPCs with corrected versions that use
`audit_log.after_data`.

The original migration 023 is also corrected in this patch for future clean
installs.

## UI improvement

Clock In / Clock Out now immediately show:

- `Clocking in…`
- `Clocking out…`

while optional browser location is being requested.

The location request timeout is reduced to 3 seconds so GPS permission does not
make the button look unresponsive.

## Test

1. Run migration 024.
2. Refresh the app.
3. Sign in as a representative.
4. Click Clock In & Start Day.
5. Confirm the button visibly starts processing.
6. Confirm a row appears in `rep_shift_sessions`.
7. Confirm the assigned map/addresses unlock.
8. Clock out and confirm the session gets `ended_at`.
