# Phase 12 Manual User Setup Build Fix

Fixes the TypeScript error:

`Cannot find name 'resetPassword'.`

The manual password reset UI referenced `resetPassword` and
`resetConfirmPassword` without declaring their React state.

Apply over the current project, then run:

```powershell
npm run build
```
