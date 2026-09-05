# v1.1 Phase 10 — Reporting & Analytics Refinement

## Main dashboard
`/reports` now includes:
- reporting window selector (7 / 30 / 90 days / all time)
- sales attempts and order trend
- attempt-to-order conversion
- customer penetration
- install completion
- open lifecycle exceptions
- invoice value
- top representatives
- top territories
- lifecycle funnel
- links into detailed reports

## Representative report
Adds:
- reporting window
- team filter
- field interactions
- conversion
- appointment completion
- sales per 100 interactions
- CSV export

## Territory report
Adds:
- reporting window
- market filter
- prospects and current customers
- penetration
- unworked prospect opportunity
- conversion
- CSV export

## Scheduling
Adds:
- date-window filter
- completion, cancellation, and no-show rates
- per-territory outcome rates
- CSV export

## Lifecycle
Adds:
- terminal-stage share
- stage share of orders
- exception summary

## Finance
Adds:
- finalized/exported rates
- CSV export

No database migration is required.

After applying:

```powershell
npm run build
npm run dev
```
