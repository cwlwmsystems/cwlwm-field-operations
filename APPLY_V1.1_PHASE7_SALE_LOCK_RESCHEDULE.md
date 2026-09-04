# v1.1 Phase 7 — Sale-State Locking & Install Rescheduling

## What changed

### Sold locations
Once a non-cancelled order exists for a location:
- the route card shows **SALE**
- normal arrival / skip actions are disabled
- the location is removed from the normal Today field queue
- Start Sale / Resume Sale is hidden
- normal field dispositions are replaced with a protected **Sale completed** panel
- history remains available
- the sale can still be handled through scheduling, order review, lifecycle, and admin workflows

### Install rescheduling
A booked install can be rescheduled from the field location panel or Scheduling.
The existing appointment row is moved to the selected date/time, which releases the original slot from capacity.

Migration `020_sale_lock_reschedule_sync.sql` additionally synchronizes the linked order's install snapshot so the order does not keep displaying the old install date/time.

## Apply
1. Run `supabase/v1/migrations/020_sale_lock_reschedule_sync.sql` in Supabase.
2. Apply the update files over the project.
3. Run:

```powershell
npm run build
npm run dev
```

## Verification
- Submit a sale.
- Confirm the location displays SALE / Sale completed.
- Confirm dispositions, arrival, skip, and starting a second sale are unavailable.
- Reschedule the install.
- Confirm the original slot capacity increases and the new slot capacity decreases.
- Confirm the appointment and linked order show the new date/time.
