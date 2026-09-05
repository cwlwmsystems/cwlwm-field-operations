# v1.1 Phase 12 Build Hotfix 3

This is a cumulative fix for the Supabase TypeScript `never` errors in:

`app/api/admin/users/route.ts`

Instead of patching each query one by one, the server-side service-role Supabase
client is now explicitly typed as `SupabaseClient<any>`. This route does not use
the project's generated Database type, so leaving it inferred caused inserts,
updates, and selected rows to collapse to `never`.

This hotfix includes the two previous Phase 12 build fixes as well.

Apply it over the current Phase 12 project and run:

```powershell
npm run build
```
