# Phase 15.3 — Breaks, Live Worked Time & Missed Clock-Out Protection

## Required migration

Run:

`supabase/v1/migrations/026_rep_breaks_and_field_lock.sql`

## Representative workflow

A clocked-in rep now sees:
- live worked-time counter
- Start Break
- Clock Out
- visits / sales / route progress

### Break behavior

Breaks are currently modeled as **unpaid breaks**.

When a rep taps Start Break:
- a server-backed break record is created
- addresses and map are locked
- the location RLS policy stops returning field rows
- the rep sees only the break screen
- the break timer and net worked-time timer continue updating

When End Break is tapped:
- the break receives an `ended_at`
- assigned field data unlocks again
- net worked time excludes the break

Clocking out while on break automatically closes the open break at the same
timestamp.

## Time reporting

`/reports/time` now shows:
- gross shift duration
- total break time
- net worked time
- long open-shift warning
- totals by representative use net worked time

## Missed clock-out protection

The system does not silently modify wage/time records.

Instead, an active shift that is open for 14+ hours is visibly flagged to:
- the representative
- managers in Rep Time

The rep is prompted to clock out if they forgot.

A future phase can add manager correction/approval with a full audit trail.

## Important

This makes the time clock much more usable operationally, but before using it as
a payroll system, define company rules for:
- paid vs unpaid breaks
- meal periods
- missed punches
- manager corrections
- approvals
- overtime
- payroll export

No automatic payroll assumptions are made in this phase.
