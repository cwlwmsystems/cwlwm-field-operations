# Cwlwm Field Operations

Clean, configurable field-sales and territory operations platform.

## Current status

Foundation v0.2 is designed to work during the Supabase outage:

- Next.js app scaffold
- mock-data mode
- clean multi-tenant schema
- explicit RLS migration
- cross-tenant integrity guards
- idempotent order submission RPC
- transaction-safe appointment booking/cancellation RPCs
- synthetic seed data
- audit/projection triggers
- tenant-isolation acceptance tests

## Local development without Supabase

1. Copy `.env.example` to `.env.local`.
2. Leave Supabase variables blank.
3. Keep `NEXT_PUBLIC_USE_MOCK_DATA=true`.
4. Run `npm install` and `npm run dev` when package access is available.

The UI will use synthetic mock data until a Supabase project is configured.

## When Supabase returns

Create a brand-new project, then run migrations in filename order:

1. `202609040001_core_schema.sql`
2. `202609040002_rls_policies.sql`
3. `202609040003_tenant_integrity.sql`
4. `202609040004_transactions.sql`
5. `202609040005_projection_audit.sql`
6. `seed.sql` only in development/demo environments

Do **not** run these migrations in the existing employer production project.

## Security note

The migration package is a foundation and should receive a final staging security test before production use, especially RPC execute privileges, service-role integration paths, and representative-level row scoping.
