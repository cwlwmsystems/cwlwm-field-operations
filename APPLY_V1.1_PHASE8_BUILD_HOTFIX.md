# v1.1 Phase 8 Build Hotfix

Fixes the Phase 8 production build error:

`Cannot find name 'serviceFilter'`

The Phase 8 field workspace added filtering logic that referenced `serviceFilter`,
but the React state declaration was missing.

Also replaces `align-items:end` with `align-items:flex-end` to remove the
Autoprefixer warning.

Apply over the project root, then run:

```powershell
npm run build
```
