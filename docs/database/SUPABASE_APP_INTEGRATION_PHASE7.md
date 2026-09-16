# v1.0 App Integration — Phase 7: Finance & Invoicing

Phase 7 exposes the existing Supabase finance backend as a complete operational UI.

## Finance workflow

```text
Installed / Activated
        ↓
Invoice eligible
        ↓
Create invoice batch
        ↓
Invoice number assigned
        ↓
Invoice items created
        ↓
Optional adjustments
        ↓
Generated
        ↓
Sent
```

## Supabase-backed now

- invoice settings
- invoice numbering
- invoice batches
- invoice items
- invoice adjustments
- eligible-order detection
- batch total calculation
- generated status
- sent status
- void status
- invoice history

## Eligibility

An order is eligible when:

- current lifecycle category is `installed` or `activated`
- it is not already included in an invoice batch

The existing `create_invoice_batch` function remains authoritative for the database transaction.

## Adjustments

Positive amount = additional charge.

Negative amount = credit.

Adjustments can only be added or removed while the invoice is Draft or Generated.

## Phase 8 boundary

Phase 7 records the invoice operational state, but it does not yet generate a PDF/CSV artifact or deliver it externally.

Phase 8 can add:
- invoice PDF
- finance export CSV
- downloadable batch package
- optional outbound integration
- reporting rollups
