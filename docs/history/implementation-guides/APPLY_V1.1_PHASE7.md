# v1.1 Phase 7 — Rep / Dispatcher Live Activity + Map Visibility

This phase adds true authenticated presence plus last-known map visibility to the manager/dispatcher workspace.

## What changes

- authenticated app heartbeat every 60 seconds
- dispatcher auto-refresh every 30 seconds
- live/offline rep status based on heartbeat
- current app path visibility for managers
- optional GPS visibility when a rep explicitly uses **Use my location** in Field Workspace
- fallback to the rep's latest mapped field event when fresh GPS is not available
- interactive live rep map in `/dispatch`
- recent field-event map dots
- rep selection directly from the map
- manual refresh and pause/resume live refresh controls

## Privacy behavior

GPS is **not requested automatically**. A rep's precise coordinates are only written when that rep explicitly uses the existing location-services control in Field Workspace. Otherwise Dispatch uses the location of the rep's most recent recorded field interaction, if that location has coordinates.

## Database migration

Run:

`supabase/v1/migrations/019_live_presence.sql`

in Supabase before deploying the app update.

The migration adds:

- `public.live_presence`
- organization-scoped RLS
- `touch_live_presence(...)`
- supporting indexes

Managers (`organization_owner`, `organization_admin`, `operations_manager`, `team_manager`) can read presence for their organization. Users can only write their own presence row.

## Apply

After the migration, apply the source update and run:

```powershell
npm run build
npm run dev
```

Open `/dispatch` in a manager account. Then open `/field` in a representative account. Presence should appear automatically; use **Use my location** if you also want the rep's current GPS point shown to Dispatch.
