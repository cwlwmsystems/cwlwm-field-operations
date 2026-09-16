# v1.1 Large Territory Map Hotfix

Fixes the field map when loading full territories with 1,000+ locations.

## Changes

- Supabase location loading now paginates until every location has been fetched.
  The previous request stopped at Supabase/PostgREST's 1,000-row response limit.
- Removes the route polyline that connected every visible address and created the
  dense green criss-cross pattern.
- Removes 1..1000 numbering from territory-wide pins.
- Adds Leaflet marker clustering so large territories show clean cluster counts
  while zoomed out and individual status-colored pins as you zoom in.
- Keeps selected locations visually emphasized.
- Only applies route styling when the route is small enough to represent an
  intentional route (50 stops or fewer).
- Preserves `service_status` loading.

No database migration is required.

After applying:

```powershell
npm run build
npm run dev
```
