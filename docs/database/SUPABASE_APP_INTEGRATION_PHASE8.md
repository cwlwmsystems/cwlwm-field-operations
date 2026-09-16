# v1.0 App Integration - Phase 8: Reporting, PDF/CSV Exports, Export Audit

Phase 8 completes the operational reporting and invoice artifact layer.

## Invoice artifacts

Each invoice can now generate:

- PDF invoice
- CSV finance export

No additional PDF npm dependency is required. The PDF generator uses built-in
PDF Helvetica and creates a standards-compatible PDF directly in the browser.

## Export audit

Migration 017 adds `invoice_exports`.

Every PDF or CSV download records:

- organization
- invoice batch
- format
- filename
- authenticated exporting user
- timestamp

## Reporting

All `/reports` pages now use the live Supabase-backed providers instead of the
legacy PlatformStore reporting data.

Reports include:

- overview
- representative performance
- territory performance
- lifecycle stage counts
- appointment outcomes
- finance value and export counts

## Boundary after Phase 8

The core application workflow is now Supabase-backed through reporting/export:

Location
-> Interaction
-> Sales
-> Order
-> Scheduling
-> Lifecycle
-> Installed / Activated
-> Invoice
-> PDF / CSV export
-> Reporting

The remaining local mock store can now be removed in a cleanup/hardening phase
after regression testing.
