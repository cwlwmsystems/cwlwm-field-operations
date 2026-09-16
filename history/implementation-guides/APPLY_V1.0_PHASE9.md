# Apply v1.0 Phase 9 — Production Hardening

Apply on top of your committed, working Phase 8 project.

## 1. Commit Phase 8 first

```powershell
git status
```

Do not continue with uncommitted Phase 8 changes.

## 2. Run migration 018

Supabase SQL Editor:

```text
supabase/v1/migrations/018_production_hardening.sql
```

This changes RLS/write permissions and adds `record_location_interaction`.

## 3. Verify migration

Run:

```text
supabase/v1/tests/004_phase9_hardening.sql
```

Important expected result:

```text
rls_disabled = 0
```

The required-function count should be `10`.

## 4. Apply app files

Stop Next.js with `Ctrl+C`.

Copy this ZIP over the project root and replace matching files.

## 5. Update `.env.local`

Remove:

```env
NEXT_PUBLIC_USE_MOCK_DATA=true
```

Optional:

```env
NEXT_PUBLIC_APP_NAME=Cwlwm Field Operations
```

Keep your existing Supabase URL and anon/publishable key.

## 6. Start development server

```powershell
npm run dev
```

Open:

```text
/connection
```

Every module should show Ready.

## 7. Regression test

Test the real workflow:

```text
Location
→ Interaction
→ Save/Resume Sale
→ Submit Order
→ Appointment
→ Installed
→ Invoice
→ PDF / CSV
→ Report
```

Also test:
- Admin Finance settings
- Admin Lifecycle configuration
- Admin Audit
- sign out / sign in

## 8. Production scan

Run:

```powershell
.\scripts\phase9-production-scan.ps1
```

The "Active mock/store imports" section should be empty.

## 9. Production build

```powershell
npm run build
```

Do not commit Phase 9 until the production build succeeds.

## 10. Commit

```powershell
git status
git add .
git commit -m "Harden platform for production v1.0 phase 9"
git push
```

Do not commit `.env.local`.
