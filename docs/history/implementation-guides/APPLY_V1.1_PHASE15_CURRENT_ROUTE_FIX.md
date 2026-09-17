# Phase 15 — Current Route Stop Fix

## Problem

In **All Locations**, the app was marking the first visible location as
`Current` even when that address already had a saved disposition.

That happened because route state only considered:
- sale locks
- locally completed stop IDs
- locally skipped stop IDs

It did not treat an existing saved interaction/disposition from Supabase as
completed work.

## Fix

`Current` now means **next actionable field stop**.

A location is eligible to become Current only when it is:
- unvisited with no saved interaction, or
- due for a follow-up, or
- has an appointment today, or
- has an open sales attempt

A location that already has a saved disposition will no longer become Current
just because it appears near the top of All Locations.

If new work becomes due later, such as a follow-up, it becomes actionable again.

No database migration is required.
