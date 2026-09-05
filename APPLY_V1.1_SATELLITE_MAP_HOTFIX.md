# v1.1 Satellite / Rooftop Map Hotfix

Changes the Field Workspace map to use aerial/satellite imagery by default.

## Behavior
- Satellite imagery is the default basemap.
- Place/road labels are overlaid on the imagery.
- A layer switcher in the top-right lets users switch back to the street map.
- Existing clustering, status dots, selection, GPS, and large-territory pagination stay intact.
- No database migration is required.

The imagery source is Esri World Imagery. Imagery resolution and recency vary by location,
so rooftop detail will be strongest where higher-resolution aerial imagery is available.

After applying:

```powershell
npm run build
npm run dev
```
