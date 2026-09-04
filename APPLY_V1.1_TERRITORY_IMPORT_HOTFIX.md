# v1.1 Territory Import Hotfix

Fixes location CSV imports silently becoming `Unassigned`.

## Changes
- Supports a `territory_id` column directly.
- Still supports `territory` / `territory_name`.
- Territory-name matching is normalized for case, spaces, punctuation, and hyphens.
- If a supplied territory cannot be matched, the import stops and lists the unmatched territory values instead of silently importing them as Unassigned.
- Persists `service_status` during bulk location import.

## Recommended CSV header

```csv
location_id,address,city,state,zip,territory_id,territory,latitude,longitude,service_status
```

`territory_id` is the preferred field because it is unambiguous. The `territory` name can be included for human readability.

No new database migration is required beyond migration 021 for `service_status`.
