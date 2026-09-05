# Phase 15.1 — Representative Time Clock & Shift-Gated Field Data

This changes Start Day into a real server-backed time clock.

## Required migration

Run:

`supabase/v1/migrations/023_rep_time_clock.sql`

before testing the representative workflow.

## Behavior

Before clock-in, a representative cannot see:
- address rows
- route stops
- the field map
- navigation targets

This is enforced at two layers:
1. Field Workspace renders only the time-clock gate.
2. Supabase RLS does not return `locations` rows to a representative unless an
   active shift exists.

After clock-in, only locations assigned directly to the rep or inside one of the
rep's active territory assignments are returned.

Clock-out immediately locks the field workspace again and refreshes location
data so cached application state is cleared from the visible workspace.

## Time tracking

New table:

`rep_shift_sessions`

Each session records:
- representative
- authenticated user
- clock-in timestamp
- clock-out timestamp
- optional GPS coordinates/accuracy at clock-in
- optional GPS coordinates/accuracy at clock-out

Only one open shift per user per organization is allowed.

Audit actions:
- `rep_clocked_in`
- `rep_clocked_out`

## Manager report

New route:

`/reports/time`

Managers can review:
- open shifts
- completed shifts
- shift durations
- totals by representative
- 7 / 14 / 30 / 90 day periods

## Important note

This is now a work-time record. Before using it for payroll, wage calculations,
discipline, or compliance reporting, define your company's clock-in/out policy,
meal/break handling, missed-punch correction process, and applicable labor-law
requirements. The app records elapsed shift time; it does not yet implement
breaks, approvals, edits, or payroll exports.

## Test order

1. Run migration 023.
2. `npm run build`
3. Sign in as a representative.
4. Confirm `/field` shows only Clock In and no addresses/map.
5. Confirm direct Supabase location reads return no rows before clock-in.
6. Clock in.
7. Confirm assigned addresses/map appear.
8. Work a stop.
9. Clock out.
10. Confirm addresses/map disappear immediately.
11. Sign in as a manager and open `/reports/time`.
