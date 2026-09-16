# v1.0 App Integration — Phase 5: Scheduling & Capacity

Phase 5 migrates scheduling operations to Supabase.

## Supabase-backed now
- scheduling policies
- allowed weekdays
- slot times
- default capacity
- minimum lead time
- blackout overrides
- capacity overrides
- availability calculation
- appointment booking
- rescheduling
- cancellation
- completion/no-show status
- order/location/rep/territory linkage

## Backend hardening
Migration `014_scheduling_operations.sql` strengthens `get_slot_capacity` so a slot is unavailable when:
- no active scheduling policy exists
- the date is not an allowed weekday
- the time is not one of the policy slot times
- minimum lead time is not met
- a blackout applies
- capacity is zero

`book_appointment` already uses an advisory transaction lock.
Phase 5 adds `reschedule_appointment`, which uses the same locking/capacity pattern.

## Sales integration
The sales form now displays only real Supabase availability.
After order submission it immediately books the selected slot.

The database rechecks capacity at booking time, so a slot that becomes full between display and click cannot be overbooked.

If order submission succeeds but the slot loses a race before the appointment insert, the order remains valid and the UI reports that scheduling still needs attention. This avoids hiding a valid order.

## Verification
1. Run migration 014 in Supabase.
2. Open `/admin/scheduling` and confirm seeded policies load.
3. Open `/scheduling`; check live availability.
4. Start a sale and choose an actual available slot.
5. Submit.
6. Verify `appointments` row links order/location/rep/territory.
7. Confirm booked count/remaining capacity changes.
8. Reschedule and verify old capacity is released/new capacity consumed.
9. Cancel and verify capacity returns.
10. Test a blackout and capacity override.
