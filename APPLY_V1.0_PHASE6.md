# Apply v1.0 Phase 6 — Lifecycle Operations

Apply on top of the working, committed Phase 5 project.

## 1. Run migration 015 FIRST

Supabase → SQL Editor:

```text
supabase/v1/migrations/015_lifecycle_operations.sql
```

## 2. Verify RPCs

Run:

```sql
select routine_name
from information_schema.routines
where routine_schema='public'
  and routine_name in (
    'record_lifecycle_stage',
    'resolve_lifecycle_exception'
  )
order by routine_name;
```

You should see both functions.

## 3. Apply app files

Stop Next.js with `Ctrl+C`, copy this ZIP over the project root, and replace
matching files.

## 4. Start

```powershell
npm run dev
```

## 5. Open lifecycle

```text
/lifecycle
```

Your existing Supabase orders should appear.

## 6. Test Installed

Open the order you created during Phase 4/5.

Choose:

```text
Installed
```

Add an optional note and click:

```text
Record lifecycle stage
```

Expected:

- UI current stage = Installed
- `lifecycle_events` has new Installed row
- `order_lifecycle_current.lifecycle_category` = installed
- linked appointment status = completed

## 7. Refresh persistence

Hard-refresh the page.

Then sign out and back in.

The order must still show Installed.

## 8. Finance eligibility verification

Run:

```sql
select
  o.id,
  o.customer_first_name,
  o.customer_last_name,
  lc.lifecycle_name,
  lc.lifecycle_category
from public.orders o
left join public.order_lifecycle_current lc on lc.order_id=o.id
order by o.submitted_at desc;
```

The test order should show:

```text
Installed | installed
```

That is the state the existing Finance backend considers invoice-eligible.

## 9. Commit

```powershell
git status
git add .
git commit -m "Move lifecycle operations to Supabase v1.0 phase 6"
git push
```

Do not commit `.env.local`.
