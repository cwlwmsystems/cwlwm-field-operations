# Apply v1.1 Phase 3 — Map + Route Operations

This phase upgrades `/field` into a map-first rep workspace.

## Includes
- Interactive OpenStreetMap/Leaflet map loaded at runtime
- Live location pins from Supabase latitude/longitude
- Route tracer line and numbered stops
- Manual stop reordering
- Nearest-neighbor route optimization
- Optional browser GPS starting point
- Google Maps driving route handoff
- Today / Follow-ups / Appointments / Open Sales / All modes
- Map-linked location focus
- Save visit and automatically advance to next stop
- Latitude/longitude support in location admin and CSV import
- Mobile responsive map + route layout

## Coordinate columns
The existing `locations.latitude` and `locations.longitude` columns are used. No new migration is required. Existing locations without coordinates remain usable but are marked `No map pin`.

CSV import recognizes `latitude` or `lat`, and `longitude`, `lng`, or `lon`.

## Build
```powershell
npm run build
npm run dev
```

Open `/field`.
