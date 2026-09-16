# Cwlwm Field Operations v0.9 — Reporting & Analytics

v0.9 adds a management reporting layer across the platform.

## Added

- Operations dashboard
- Sales attempt/order conversion
- Representative performance report
- Territory performance report
- Appointment outcome report
- Lifecycle funnel
- Open lifecycle exception counts
- Finance batch/value reporting
- Adjustment impact
- Cross-navigation into operational records

## Prototype design

Reports calculate directly from the shared local operational store. There is no fake second analytics database.

## Production direction

When Supabase is connected, high-volume reporting should move to organization-scoped SQL views, materialized views, or aggregate tables. Suggested views include rep performance, territory performance, lifecycle funnel, scheduling outcomes, finance summary, and daily operations summary.
