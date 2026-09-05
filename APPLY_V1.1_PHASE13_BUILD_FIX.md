# Phase 13 Build Fix

Fixes the TypeScript error in `components/AppShell.tsx`:

`Argument of type 'string' is not assignable to parameter of type OrganizationRole`

The current membership role is narrowed to the centralized `OrganizationRole`
union before calling `item.roles.includes(...)`.

Apply over the current Phase 13 project and run:

```powershell
npm run build
```
