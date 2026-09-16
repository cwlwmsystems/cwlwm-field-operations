# Admin & Configuration v0.4

v0.4 replaces hard-coded configuration screens with a shared browser-local platform store.

## Added

- Admin navigation and overview
- Organization settings
- Team CRUD
- Market CRUD
- Territory CRUD
- Representative CRUD
- Representative-to-territory assignments
- Configurable disposition CRUD and behavior flags
- Manual location creation/editing
- CSV location import
- Shared local configuration persistence
- Operational Teams, Markets, Territories, Representatives and Locations pages read the same store
- Territory and location detail pages reflect configuration changes
- Saving a new field interaction updates the location's current disposition in the local store

## Local storage

Configuration is stored under:

`cwlwm-platform-data:v0.4`

Location interaction history remains under the v0.3 per-location interaction keys.

## CSV import

Recognized header aliases:

- `address`, `address1`, `street_address`
- `city`
- `state`, `state_region`
- `postal_code`, `zip`, `zip_code`
- `external_id`, `externalid`, `location_id`
- `territory`, `territory_name`

Territory names are matched against configured territories. Unknown territory names import as unassigned/label-only records and can be edited afterward.

## Supabase transition

The UI intentionally talks to a store abstraction rather than directly to mock constants. When Supabase is available, the local store can be replaced by repository/server actions while preserving the screens and business flow.
