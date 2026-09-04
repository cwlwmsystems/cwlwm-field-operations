# Phase 2 Loading Loop Hotfix

This fixes the Admin configuration pages repeatedly switching between loaded data
and "Loading..." after Supabase configuration hydration.

## Apply

1. Stop Next.js with `Ctrl+C`.
2. Copy this package over the project root and replace the matching file.
3. Start again:

```powershell
npm run dev
```

4. Open `/admin/teams`.
5. The team table should load once and remain visible.
6. Refresh the browser and confirm it remains stable.

The fix makes the PlatformStore hydration callback stable from the configuration
loader's point of view, preventing the Supabase refresh effect from retriggering
after every hydration update.
