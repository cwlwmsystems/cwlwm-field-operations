# v1.1 Phase 12 Build Hotfix 2

Fixes the next TypeScript inference error in:

`app/api/admin/users/route.ts`

Error:

`Property 'id' does not exist on type 'never'.`

The Supabase query result for valid team IDs was being inferred as `never[]`.
This hotfix explicitly treats the selected rows as:

```ts
Array<{ id: string }>
```

Apply over the current Phase 12 project, then run:

```powershell
npm run build
```
