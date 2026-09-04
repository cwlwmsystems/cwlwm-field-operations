# v1.1 Phase 7 Build Hotfix

Fixes the TypeScript build error in `app/dispatch/page.tsx` caused by
`flatMap()` narrowing the map-point `source` type to `"gps"`.

The replacement builds an explicitly typed `DispatchRepPoint[]`, so both
`"gps"` and `"field_event"` points are valid.

Also changes `align-items:end` to `align-items:flex-end` in `app/globals.css`
to remove the Autoprefixer mixed-support warning.

Apply over the project root, then run:

```powershell
npm run build
```
