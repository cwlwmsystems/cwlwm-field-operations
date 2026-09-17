# Cwlwm Field Operations — Location Service Status

Adds a first-class `service_status` field to locations.

Supported values:
- `prospect`
- `current_customer`
- `do_not_knock`
- `vacant`
- `business`

Behavior:
- Prospects remain in normal rep knocking workflows.
- Current customers remain visible but are excluded from normal knocking routes.
- Do-not-knock locations are excluded from normal knocking routes.
- Vacant and business locations are excluded from normal residential knocking routes.
- Status is available for CSV import and location administration.

## Apply
1. Run `supabase/v1/migrations/021_location_service_status.sql` in Supabase.
2. Apply this update over the app.
3. Run `npm run build`.
4. Import using a `service_status` CSV column.

Recommended import header:

```csv
location_id,address,city,state,zip,territory,latitude,longitude,service_status
```
