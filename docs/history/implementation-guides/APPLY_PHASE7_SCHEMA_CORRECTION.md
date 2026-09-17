# Phase 7 Finance Schema Correction

The first Phase 7 migration assumed a different finance schema.

Your actual installed schema uses:

- `invoice_settings`
- `invoice_batches`
- `invoice_items`
- `adjustments`

and invoice batch statuses:

- `draft`
- `finalized`
- `exported`
- `void`

## Apply

1. Do not run the original failing migration again.
2. Run the corrected:

```text
supabase/v1/migrations/016_finance_operations.sql
```

3. Verify:

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

4. Copy the corrected app files over the project root.
5. Restart with:

```powershell
npm run dev
```

The Finance UI now matches the real backend:
Draft → Finalized → Exported.
Credits are stored in `adjustments` with a positive amount and `adjustment_type='credit'`;
the UI displays them as negative values.
