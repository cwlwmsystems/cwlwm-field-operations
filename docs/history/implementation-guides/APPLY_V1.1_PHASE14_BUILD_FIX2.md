# Phase 14 Build Fix 2

Fixes the TypeScript error in `app/api/admin/users/route.ts`:

`Cannot find name 'user'.`

The authenticated administrator returned by `context(request)` is named `actor`,
so the security audit writes now correctly use:

`actor.id`

instead of:

`user.id`

This fixes both:
- `user_created_manually`
- `password_set_manually`

Apply this patch over the current Phase 14 project, then run:

```powershell
npm run build
```
