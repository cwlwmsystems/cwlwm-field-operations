# Production Deployment Checklist

## Database
- Apply migrations through `018_production_hardening.sql`.
- Run `supabase/v1/tests/004_phase9_hardening.sql`.
- Confirm RLS on all tenant-owned tables.
- Confirm Auth user has exactly the intended organization membership and role.
- Back up the database before the first real client migration.

## Environment
Only public browser-safe values belong in the frontend:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_NAME`

Never expose:
- service-role key
- database password
- private integration credentials

## Build
```powershell
npm install
npm run build
```

Treat TypeScript/build warnings and errors as release blockers.

## Regression
Test:
- sign in / sign out / refresh persistence
- configuration CRUD
- location interaction
- sales save/resume/submit
- sales review
- appointment booking/reschedule/cancel/complete
- lifecycle Installed/Activated/Cancelled
- invoice batch/adjustment/finalize/export
- PDF/CSV download and export audit
- all reports
- admin audit page

## Tenant isolation
Use two test organizations and two users. Confirm each user sees only their own
organization data. Attempt a known UUID from the other tenant through the UI/API
and confirm RLS denies access.

## Git
```powershell
git status
git ls-files | Select-String "\.env"
git grep -n "service_role"
git grep -n "NEXT_PUBLIC_USE_MOCK_DATA"
```

Expected:
- `.env.local` is absent
- no service-role secret
- no active mock-data environment flag
