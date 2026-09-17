# Apply Cwlwm Field Operations v0.8

Use this update on top of your committed, working v0.7 checkout.

## 1. Stop the dev server

Press `Ctrl+C`.

## 2. Confirm v0.7 is committed

```powershell
git status
```

Your working tree should be clean.

## 3. Apply the update

Copy everything from this ZIP into the root of your existing
`cwlwm-field-operations` folder and allow Windows to replace matching files.

## 4. Start the app

```powershell
npm run dev
```

No Supabase connection is required.

## 5. Confirm local-data migration

v0.8 stores data under:

```text
cwlwm-platform-data:v0.8
```

If it does not exist, existing v0.7/v0.6/v0.5/v0.4 local data is upgraded.

## 6. Make an order invoice-ready

Open an existing order in Lifecycle.

Move it to:

```text
Installed
```

or:

```text
Activated
```

Then open:

```text
/finance
```

The order should appear in **Ready to invoice**.

## 7. Create an invoice batch

Open:

```text
/finance/new
```

1. Optionally filter by team.
2. Select one or more eligible orders.
3. Create the batch.
4. Confirm the generated invoice number uses your configured prefix/sequence.

## 8. Test invoice settings

Open:

```text
/admin/finance
```

Change:

- prefix
- include year
- padding
- next number
- currency

Save and create another batch to confirm numbering changes.

## 9. Test invoice lifecycle

On an invoice detail page:

1. Confirm included orders are listed.
2. Finalize the batch.
3. Export CSV.
4. Confirm the browser downloads the CSV.
5. Confirm the batch status becomes `exported`.

## 10. Test adjustment / clawback

On an invoice:

1. Choose an included order.
2. Select `Clawback`.
3. Enter a reason.
4. Enter an amount.
5. Save.
6. Apply the adjustment.

The invoice total should decrease.

Then click **Reverse**.

The invoice total should return to its previous value.

A `Debit` works in the opposite direction and increases the invoice total.

## 11. Confirm order linkage

Open an order that belongs to an invoice batch.

The order detail page should now show its invoice number, invoice status, and a link
back to the invoice.

## 12. Commit after testing

```powershell
git status
git add .
git commit -m "Add Finance Operations workflow v0.8"
```

## Production note

Local browser persistence is sufficient for product prototyping, but invoice numbering,
batch finalization, duplicate prevention, and financial adjustments must be performed
transactionally in PostgreSQL once the production backend is connected.
