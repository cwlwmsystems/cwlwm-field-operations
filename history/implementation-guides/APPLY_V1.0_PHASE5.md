# Apply v1.0 Phase 5 — Scheduling & Capacity

Apply only after your working Phase 4 is committed and pushed.

## 1. Apply the database migration FIRST

In Supabase SQL Editor, run:

```text
supabase/v1/migrations/014_scheduling_operations.sql
```

It upgrades slot validation and adds safe reschedule/status RPCs.

## 2. Verify functions

Confirm these exist:

- `get_slot_capacity`
- `book_appointment`
- `reschedule_appointment`
- `set_appointment_status`

## 3. Stop Next.js

Press `Ctrl+C`.

## 4. Copy this ZIP over the project root

Replace matching files.

## 5. Keep

```env
NEXT_PUBLIC_USE_MOCK_DATA=true
```

Lifecycle, finance, and reporting still have local pieces.

## 6. Start

```powershell
npm run dev
```

## 7. Admin test

Open:

```text
/admin/scheduling
```

Confirm the seeded scheduling policies appear.

Create a harmless test capacity override on a future date, refresh, and verify it remains in Supabase.

## 8. Availability test

Open:

```text
/scheduling
```

Choose a territory/date. Confirm remaining capacity matches Supabase appointments.

## 9. Sales booking test

Open a location and Start Sale.

Select:
- customer
- product
- offer
- future installation date
- one live available slot

Submit.

Verify:
- order exists
- sales attempt = converted
- Submitted lifecycle event exists
- Sale interaction exists
- appointment exists
- appointment.order_id = order UUID
- appointment.location_id = location UUID
- appointment.representative_id = rep UUID
- appointment.territory_id = territory UUID

## 10. Capacity test

Return to `/scheduling`.
The selected slot should show one fewer remaining.

## 11. Reschedule

Reschedule the appointment.

Verify:
- same appointment UUID
- new date/time
- old slot capacity returns
- new slot capacity decreases

## 12. Cancel

Cancel the appointment.

Verify status = `cancelled` and capacity returns.

## 13. Commit

```powershell
git status
git add .
git commit -m "Move scheduling and capacity to Supabase v1.0 phase 5"
git push
```

Do not commit `.env.local`.
