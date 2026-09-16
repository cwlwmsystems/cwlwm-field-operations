# Apply Cwlwm Field Operations v0.6

Use this update on top of your committed, working v0.5 checkout.

## 1. Stop the dev server

Press `Ctrl+C`.

## 2. Confirm v0.5 is committed

```powershell
git status
```

Your working tree should be clean.

## 3. Apply the update

Copy everything from this ZIP into the root of your existing
`cwlwm-field-operations` folder and allow replacement of matching files.

## 4. Start the app

```powershell
npm run dev
```

No Supabase project is required.

## 5. Test scheduling configuration

Open:

```text
http://localhost:3000/admin/scheduling
```

Test:

1. Edit an existing territory scheduling policy.
2. Change its capacity.
3. Add or remove a weekday.
4. Add a blackout date.
5. Add a capacity override for a specific date/time.

## 6. Test sales booking

1. Open `/locations/loc_1`.
2. Start a sale.
3. Complete customer, rep, product and offer.
4. Choose an appointment date.
5. Confirm only policy-approved slots appear.
6. Choose an available slot.
7. Submit the order.
8. Open `/scheduling`.
9. Confirm the appointment appears.
10. Re-open the same date in the capacity viewer and confirm booked count increased.

## 7. Test capacity

Set a territory policy capacity to `1`.

Create one appointment in a slot.

Start another sale for the same territory/date and confirm that slot is unavailable.

## 8. Test appointment operations

From `/scheduling`:

- reschedule an appointment
- verify the new slot has capacity
- cancel an appointment and confirm its old slot becomes available
- mark an appointment completed

Rescheduling also updates the linked order's install/appointment date and time.

## Local data migration

v0.6 stores data under:

```text
cwlwm-platform-data:v0.6
```

If no v0.6 record exists, it automatically upgrades your existing v0.5 or v0.4 browser data and adds:

- scheduling policies
- scheduling overrides
- appointments

## Important concurrency note

The local browser store enforces capacity for prototype testing. True multi-device
concurrency protection will use the transaction-safe PostgreSQL/Supabase booking
function in the production backend.

## Commit when verified

```powershell
git status
git add .
git commit -m "Add Scheduling and Capacity workflow v0.6"
```
