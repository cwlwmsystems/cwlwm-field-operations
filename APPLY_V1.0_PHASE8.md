# Apply v1.0 Phase 8 - Reporting, PDF/CSV, Export Audit

## 1. Run migration 017 first

Supabase SQL Editor:

```text
supabase/v1/migrations/017_reporting_exports.sql
```

Verify:

```sql
select routine_name
from information_schema.routines
where routine_schema='public'
  and routine_name='record_invoice_export';
```

And:

```sql
select table_name
from information_schema.tables
where table_schema='public'
  and table_name='invoice_exports';
```

## 2. Apply app update

Stop Next.js, copy this ZIP over the project root, replace matching files.

## 3. Start

```powershell
npm run dev
```

## 4. Invoice PDF test

Open an existing invoice:

```text
/finance
```

Then open the invoice and click:

```text
Download PDF
```

Expected:
- browser downloads `<invoice-number>.pdf`
- PDF opens normally
- export history shows a PDF row
- Supabase `invoice_exports` contains `export_format='pdf'`

## 5. CSV test

Click:

```text
Download CSV
```

Expected:
- browser downloads `<invoice-number>.csv`
- CSV contains invoice metadata and order lines
- export history shows CSV
- Supabase records it

## 6. Reporting test

Open:

```text
/reports
```

Confirm the counts agree with the records you created in Phases 3-7.

Then check:
- `/reports/reps`
- `/reports/territories`
- `/reports/lifecycle`
- `/reports/scheduling`
- `/reports/finance`

## 7. Persistence

Hard-refresh and sign out/in.
Export history and all report data should reload from Supabase.

## 8. Commit

```powershell
git status
git add .
git commit -m "Add Supabase reporting and invoice exports v1.0 phase 8"
git push
```

Do not commit `.env.local`.
