# Cwlwm Field Operations v0.5 — Sales Capture

v0.5 adds the first complete local sales workflow to the clean generic platform.

## Workflow

Location → Start Sale → Customer → Product → Offer → Appointment → Review → Submit → Order → Sales Review

## Local persistence

Sales attempts and orders are stored in the shared browser localStorage key:

`cwlwm-platform-data:v0.5`

The store migrates existing v0.4 local configuration into v0.5 automatically the first time the application loads.

## Capabilities

- Start sale from a location.
- Resume an in-progress sales attempt.
- Save partial progress.
- Abandon an attempt.
- Choose from a generic product catalog.
- Filter active offers by product.
- Snapshot offer pricing into the submitted order.
- Select a local appointment date/time.
- Use a stable `clientAttemptId` as the local idempotency key.
- Convert an attempt when an order is submitted.
- Mark the location disposition as Sale.
- View order details and pricing snapshot.
- Approve or flag orders in Admin → Sales Review.

## Not production backend logic

The local v0.5 flow is intentionally a UI/product workflow prototype. The Supabase v0.2 foundation already contains the direction for transaction-safe order submission and appointment capacity. When Supabase is available, local store operations will be replaced with database RPCs and RLS-protected queries.
