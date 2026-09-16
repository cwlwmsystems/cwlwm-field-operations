# Apply Cwlwm Field Operations v0.5

Use this update on top of your committed, working v0.4 checkout.

## 1. Stop the dev server

Press `Ctrl+C`.

## 2. Confirm the v0.4 checkpoint is clean

```powershell
git status
```

## 3. Apply the update

Copy all files/folders from this ZIP into the root of the existing
`cwlwm-field-operations` project and allow replacements.

## 4. Run

```powershell
npm run dev
```

No Supabase project is required.

## 5. Test the sales workflow

1. Open `/locations/loc_1`.
2. Click **Start Sale**.
3. Enter first/last name and at least a phone or email.
4. Select a representative.
5. Select a product.
6. Select an offer.
7. Select an appointment date and time.
8. Click **Save progress**.
9. Go to `/sales` and confirm the attempt appears.
10. Resume it.
11. Click **Submit Order**.
12. Confirm the success screen appears.
13. Open `/sales`.
14. Confirm the order is listed.
15. Open `/admin/sales-review`.
16. Approve or flag the order.
17. Refresh and confirm the status persists.

## Partial-sale test

Start another sale and fill only customer/contact details. Click **Save progress**,
leave the page, open `/sales`, and resume it. The form should restore the saved
values.

## Idempotency behavior

Each local sales attempt receives a stable `clientAttemptId`. Order submission
uses that value as `clientSubmissionId`. A repeated submission with the same key
returns the existing order instead of intentionally creating another one.

This is a local product-workflow implementation. The transaction-safe Supabase
RPC remains the production path when the backend becomes available.

## Local storage upgrade

v0.5 uses:

```text
cwlwm-platform-data:v0.5
```

On first load it automatically reads your existing v0.4 configuration if a v0.5
record does not exist, then adds the new product, offer, sales-attempt, and order
collections.

## Commit after testing

```powershell
git status
git add .
git commit -m "Add Sales Capture workflow v0.5"
```
