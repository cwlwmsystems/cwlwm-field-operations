# v1.1 Phase 15 — Representative Experience & Field Readiness

Phase 15 changes the priority from adding more administration to making the
application practical for real field representatives on a phone.

## Rep dashboard

Representatives now get a role-specific Command Center instead of the manager
dashboard.

It shows:
- visits saved today
- sales submitted today
- appointments today
- follow-ups due
- assigned footprint
- a single primary CTA into Field Workspace

Manager/admin dashboards are unchanged.

## Start Day / End Day

The field workspace now has lightweight rep shift state:
- Start Day
- End Day
- start time display
- persisted locally by authenticated user

This is intentionally a workflow state, not payroll/timekeeping.

## First-login onboarding

Each representative sees a concise first-use walkthrough covering:
1. start the day
2. navigate / arrive
3. record every outcome
4. capture a sale

Completion is stored locally per authenticated user.

## Refresh/reopen persistence

Rep field state persists on the device:
- selected territory
- queue mode
- service-status filter
- selected stop
- route order
- completed stops
- skipped stops
- arrived stop

Refreshing or reopening the app no longer wipes the current route state.

## Connectivity awareness

The rep workspace now shows Online / Offline state.

When offline:
- the rep can still view what is already rendered
- saving a field outcome is blocked with a clear message

This phase does NOT claim true offline write synchronization. That should be a
separate future feature using an explicit durable queue.

## Mobile action dock

On small screens, the selected stop gets a fixed action dock:
- Navigate
- Arrive
- Outcome
- Sale / Resume Sale

This keeps the core workflow reachable with one thumb.

## Permission correction for sales capture

Phase 13 correctly blocked reps from the Sales management area, but that also
blocked `/sales/new/...`, which the Field Workspace uses to capture a sale.

Phase 15 fixes that distinction:
- representatives MAY open `/sales/new/...`
- representatives still MAY NOT open the general `/sales` management area

## Dead-link cleanup for reps

Representative Field Workspace no longer sends reps to routes they do not have:
- no general Scheduling link
- no manager Location History link

Appointment rescheduling remains available directly inside Field Workspace when
an appointment exists.

## No database migration

No Supabase migration is required.

## Acceptance test

Use a real representative account on a phone or narrow browser window:

1. Sign in.
2. Confirm rep-specific dashboard.
3. Open Field Workspace.
4. Complete the first-use walkthrough.
5. Start Day.
6. Share location if desired.
7. Navigate to a stop.
8. Mark Arrived.
9. Record an outcome.
10. Confirm next stop is selected.
11. Start or resume a sale through `/sales/new/...`.
12. Refresh the browser and confirm route progress remains.
13. Simulate offline mode and confirm saving is blocked clearly.
14. End Day.
15. Confirm the rep cannot open `/sales`, `/admin/users`, `/finance`, or other
    manager/admin routes directly.
