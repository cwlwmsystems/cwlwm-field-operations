# Phase 4 Sales Location Context Hotfix

Fixes the false `Location not found.` error when saving an otherwise valid
Supabase-backed sale.

## Cause

The Sales context value was memoized before Supabase configuration finished
loading. `saveAttempt()` therefore retained the startup/empty location array.

The location page itself had the current configuration, so the form rendered,
but the stale Sales callback could not find that same location.

## Apply

1. Stop Next.js with `Ctrl+C`.
2. Copy this ZIP over the project root, replacing:
   `lib/sales/SupabaseSalesProvider.tsx`
3. Restart:

```powershell
npm run dev
```

4. Return to the same location.
5. Start Sale.
6. Enter customer details.
7. Click **Save Progress**.

Expected message:

```text
Progress saved to Supabase.
```

Then hard-refresh and verify the same attempt is resumable.
