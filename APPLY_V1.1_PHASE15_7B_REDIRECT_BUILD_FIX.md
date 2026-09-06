# Phase 15.7b — Redirect Build Fix

The Phase 15.7 patch imported `useSearchParams` but did not instantiate it inside
`FieldWorkspacePage`.

This caused:

`Cannot find name 'fieldQuery'`

The fix adds:

```ts
const fieldQuery = useSearchParams();
```

inside `FieldWorkspacePage`.

No Supabase migration is required.

Run:

```powershell
npm run build
```
