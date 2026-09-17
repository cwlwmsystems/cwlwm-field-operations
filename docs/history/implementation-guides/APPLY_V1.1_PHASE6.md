# v1.1 Phase 6 — Manager & Dispatcher Command Center

Adds a desktop-first manager/dispatcher workspace at `/dispatch`.

## Included
- live rep activity inferred from field interactions
- team / market / territory / rep filters
- today's worked locations, sales, appointments, and lifecycle exceptions
- rep status and productivity rows
- territory movement / coverage view
- intervention queue for exceptions, review items, no-shows, and quiet reps
- recent field activity feed
- role-aware navigation and access control
- responsive tablet/mobile layouts

No database migration is required. The command center is built from the existing Supabase-backed providers and organization-scoped data.

After applying:

```powershell
npm run build
npm run dev
```

Open `/dispatch` as an owner, admin, operations manager, or team manager.
