# Apply v1.0 Phase 7 — Finance & Invoicing

Apply on top of the working Phase 6 project.

## 1. Run migration 016 FIRST

Supabase → SQL Editor:

```text
supabase/v1/migrations/016_finance_operations.sql
```

## 2. Verify helper functions

```sql
select routine_name
from information_schema.routines
where routine_schema='public'
  and routine_name in (
    'create_invoice_batch',
    'add_invoice_adjustment',
    'remove_invoice_adjustment',
    'set_invoice_batch_status'
  )
order by routine_name;
```

You should see all four.

## 3. Apply app files

Stop Next.js, copy this ZIP over the project root, and replace matching files.

## 4. Start

```powershell
npm run dev
```

## 5. Open Finance

```text
/finance
```

The order you marked Installed in Phase 6 should appear under:

```text
Invoice Eligibility
```

## 6. Create the first invoice

Check the Installed order and click:

```text
Create invoice batch
```

Expected:
- one `invoice_batches` row
- one or more `invoice_items` rows
- invoice number assigned
- the order disappears from the eligibility list

## 7. Open the invoice

Confirm:
- customer
- location
- description
- line amount
- subtotal
- total

## 8. Adjustment test

Add:

```text
Description: Test credit
Amount: -5.00
```

Confirm `invoice_adjustments` contains the row and invoice total decreases by $5.

Remove it and confirm the total returns.

## 9. Status test

Mark the invoice:

```text
Generated
```

Then:

```text
Sent
```

Verify:
- `invoice_batches.status = sent`
- `generated_at` is populated
- `sent_at` is populated

## 10. Persistence

Hard refresh, sign out/in, and confirm the invoice remains Sent.

## 11. Commit

```powershell
git status
git add .
git commit -m "Move finance and invoicing to Supabase v1.0 phase 7"
git push
```

Do not commit `.env.local`.
