# Phase 14 Build Fix

Fixes the TypeScript error in `app/admin/security/page.tsx`:

`Property 'organization_id' does not exist on type 'OrganizationMembership'. Did you mean 'organizationId'?`

The AuthProvider membership object uses camelCase:

`organizationId`

Apply this patch over the current Phase 14 project, then run:

```powershell
npm run build
```
