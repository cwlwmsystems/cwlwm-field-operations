# Cwlwm Field Operations — Supabase v1.0 Install

This package is intended for a **new Supabase project**.

Keep the application in mock mode while installing:

```env
NEXT_PUBLIC_USE_MOCK_DATA=true
```

## Do not run the old v0.2 migrations first

The `/supabase/v1/migrations` directory is a fresh install set for the current platform.

## Installation order

In Supabase:

1. Open **SQL Editor**.
2. Create a new query.
3. Copy and run `001_extensions_helpers.sql`.
4. Continue in numeric order through `012_seed_demo.sql`.
5. Stop before `013_bootstrap_first_user_TEMPLATE.sql`.

Run each file separately. Supabase should report success before you move to the next file.

### Files

1. `001_extensions_helpers.sql`
2. `002_organizations_access.sql`
3. `003_field_operations.sql`
4. `004_sales.sql`
5. `005_scheduling.sql`
6. `006_lifecycle_integrations.sql`
7. `007_finance.sql`
8. `008_audit_projection.sql`
9. `009_rls.sql`
10. `010_tenant_integrity.sql`
11. `011_transactions.sql`
12. `012_seed_demo.sql`

## Create your first authenticated user

After the schema is installed:

1. Supabase → **Authentication** → **Users**
2. Create a user for yourself.
3. Copy the user's UUID.
4. Open `013_bootstrap_first_user_TEMPLATE.sql`.
5. Replace `YOUR_AUTH_USER_UUID`.
6. Run that SQL.

That makes the user `organization_owner` of the synthetic Northstar organization.

## Verify

Run:

- `tests/001_schema_smoke_test.sql`
- `tests/002_rls_inventory.sql`
- `tests/003_function_inventory.sql`

## Security model

There are no anonymous read/write policies for tenant data.

Authenticated users only see organizations where they have an active membership.

Destructive operations are restricted to:

- organization_owner
- organization_admin
- operations_manager

Finance settings and invoice batch creation use elevated organization roles.

## Important

The browser uses the publishable/anon key. Never put a service-role key in `.env.local` for the frontend.

## After installation

Do **not** change `NEXT_PUBLIC_USE_MOCK_DATA` to false yet.

The next application milestone should migrate one module at a time:

1. Auth + organization context
2. Admin/configuration
3. Territory/location operations
4. Sales
5. Scheduling
6. Lifecycle
7. Finance
8. Reporting

That keeps the working local prototype available as a fallback throughout the transition.
