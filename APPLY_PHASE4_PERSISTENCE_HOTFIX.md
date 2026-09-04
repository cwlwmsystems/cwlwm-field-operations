# Phase 4 Sales Persistence Verification Hotfix

This replaces the optimistic "saved" behavior with a verified Supabase write.

## What changes

- Updates are scoped by both `organization_id` and sales-attempt `id`.
- New attempts use an upsert on `(organization_id, client_attempt_id)`.
- Supabase must return the saved row.
- The app immediately reads the row back.
- Core form fields are compared with the database values.
- The success message appears only after verification.
- Resumed attempts hydrate the form even when the attempt arrives after initial render.

## Apply

1. Stop Next.js.
2. Copy the ZIP contents over the project root.
3. Restart:

```powershell
npm run dev
```

## Test

1. Resume the attempt.
2. Change something obvious, such as the phone number or Notes.
3. Click **Save Progress**.
4. You should see:

```text
Progress saved and verified in Supabase.
```

5. Refresh Supabase Table Editor and inspect that exact row in `sales_attempts`.
6. Check:
   - `customer_phone`
   - `customer_email`
   - `metadata`
   - `progress_step`
   - `progress_stage`
   - `last_saved_at`
   - `updated_at`
7. Hard-refresh the app. The changed value should reload from Supabase.

If the database does not contain the values, the app should now show an error instead of claiming it synced.
