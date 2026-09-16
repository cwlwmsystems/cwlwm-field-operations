# Cwlwm Field Operations v0.8 — Finance Operations

v0.8 introduces a generic invoicing and adjustment layer.

## Added

- Invoice-ready order queue
- Eligibility based on installed/activated lifecycle state
- Configurable invoice numbering
- Invoice batch creation
- Team filtering
- Invoice item listing
- Draft/finalized/exported/void statuses
- CSV export
- Order-to-invoice linkage
- Credits, debits, clawbacks, voids, and other adjustments
- Adjustment apply/reverse workflow
- Invoice totals that incorporate applied adjustments
- Finance settings page
- Finance dashboard

## Generic invoice numbering

Example:

```text
INV-2026-0001
```

The prefix, sequence, padding, year behavior, and currency are organization-configurable.

## Adjustment behavior

Credits and clawbacks reduce the invoice total.

Debits increase the invoice total.

Applied adjustments can be reversed.

## Local storage

v0.8 uses:

```text
cwlwm-platform-data:v0.8
```

Existing v0.7/v0.6/v0.5/v0.4 browser data is automatically upgraded.

## Production direction

When the backend is connected, the core tables should include:

- invoice_settings
- invoice_batches
- invoice_items
- adjustments
- adjustment_reasons

Batch numbering and finalization should be transaction-safe on the server.
