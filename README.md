# Cwlwm Field Operations

Clean, company-agnostic field sales and territory operations platform scaffold.

**Current milestone:** v0.4 Admin & Configuration.

## Run locally

```powershell
npm install
npm run dev
```

No Supabase project is required for v0.4. Configuration is persisted in browser localStorage.

## v0.4 workflows

- Configure organization settings
- Create/edit teams and markets
- Create/edit territories and assign primary teams
- Add representatives and assign them to one or more territories
- Create configurable interaction dispositions
- Add individual field locations or import a CSV
- View all configuration changes immediately in the operational pages
- Record location interactions and update the location's current disposition

Open `/admin` to manage configuration.

See `docs/ADMIN_CONFIGURATION_V0.4.md` for details.


## v0.5 Sales Capture

Adds resumable partial sales, generic products/offers, local appointment selection, submitted order detail, and Admin Sales Review. See `docs/SALES_CAPTURE_V0.5.md`.
