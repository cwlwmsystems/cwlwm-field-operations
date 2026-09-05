# v1.1 Phase 12 Build Hotfix

Fixes the TypeScript build error in:

`app/api/admin/users/route.ts`

Error:

`Argument of type 'User' is not assignable to parameter of type 'never'.`

The paginated Supabase Auth user collection was being inferred as `never[]`.
The hotfix imports Supabase's `User` type and declares the accumulator as:

```ts
const users: User[] = [];
```

Apply over the current Phase 12 project, then run:

```powershell
npm run build
```
