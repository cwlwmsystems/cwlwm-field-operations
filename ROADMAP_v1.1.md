# Cwlwm Field Operations v1.1 Roadmap

**Theme:** Production maturity, usability, observability, and safer administration.

## Priority 1 — Role-Aware UX
- Hide or disable actions users cannot perform
- Refine navigation by role
- Improve team-manager and representative scoping
- Add clear read-only states
- Improve unauthorized-route messaging

## Priority 2 — Error and Validation Experience
- Normalize Supabase errors
- Replace raw RLS errors with friendly permission messages
- Improve required-field and duplicate validation
- Improve scheduling, lifecycle, and invoice error feedback
- Standardize success/error banners

## Priority 3 — Operational Monitoring
- Expand health checks
- Track failed RPCs
- Track lifecycle failures
- Track invoice export failures
- Track scheduling-capacity failures
- Add basic alert thresholds

## Priority 4 — Reporting Improvements
- Date filters
- Market, territory, team, rep, and lifecycle filters
- CSV export
- Better drill-downs
- Better empty states
- Configurable report defaults

## Priority 5 — Admin Convenience Tools
- Bulk rep and territory assignment
- Bulk location updates
- Better CSV import validation and preview
- Duplicate detection
- Safer archive/deactivate workflows
- Confirmation prompts for consequential changes

## Priority 6 — Audit Improvements
- Human-readable audit labels
- Before/after values
- Filters by user, action, entity, and date
- Links to affected records
- Highlight sensitive changes

## Priority 7 — Release and Regression Automation
- Automated build/type checks
- Automated RLS tests
- Automated tenant-isolation tests
- Automated core workflow tests
- Repeatable staging/release procedure

## Priority 8 — Onboarding and Documentation
- Organization setup
- Role permissions
- Market/territory setup
- Rep onboarding
- Sales, scheduling, lifecycle, and finance guides
- Deployment and rollback documentation

## Deferred Beyond v1.1
- Native mobile app
- Offline-first field operations
- Major CRM/billing integrations
- Workflow builder
- Customer-facing portal
- Large-scale GIS expansion
- White-label theming

## v1.1 Release Gate
Before tagging v1.1.0:
- Production build passes
- RLS and role tests pass
- Tenant isolation passes
- Audit logging passes
- Sales, scheduling, lifecycle, finance, and reporting smoke tests pass
- Rollback path is confirmed

## Recommended Order
1. Role-aware UX
2. Error/validation experience
3. Monitoring
4. Reporting
5. Admin convenience tools
6. Audit improvements
7. Automated regression coverage
8. Documentation
