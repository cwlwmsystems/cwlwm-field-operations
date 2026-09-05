# Cwlwm Field Operations

**Current release:** `v1.1.0`  
**Current development checkpoint:** Phase 14 - Security & Audit Administration  
**Stack:** Next.js 15, React 19, TypeScript, Supabase, Vercel  
**Architecture:** Multi-tenant, organization-scoped field operations platform

Cwlwm Field Operations is a clean-room, company-agnostic field operations platform designed to manage the full operational lifecycle of distributed field teams. It brings territory management, representative workflows, sales capture, scheduling, lifecycle tracking, finance operations, reporting, user administration, role-based access, and security auditing into a single system.

The platform is built as a reusable multi-tenant SaaS foundation rather than for one specific company. Every tenant-owned record is scoped to an organization, access is controlled through organization memberships and roles, and Supabase Row Level Security provides the primary data-isolation boundary.

> **Clean-room development notice:** This repository is intentionally company-agnostic. Do not add former-employer customer data, private pricing, proprietary network information, private credentials, internal documentation, branded assets, or copied proprietary code.

---

## Table of Contents

- [Platform Overview](#platform-overview)
- [Core Capabilities](#core-capabilities)
- [Current v1.1 Features](#current-v11-features)
- [System Architecture](#system-architecture)
- [Data Model](#data-model)
- [Application Areas](#application-areas)
- [Roles and Permissions](#roles-and-permissions)
- [Field Operations Workflow](#field-operations-workflow)
- [Sales and Order Workflow](#sales-and-order-workflow)
- [Scheduling and Capacity](#scheduling-and-capacity)
- [Lifecycle Operations](#lifecycle-operations)
- [Finance and Invoicing](#finance-and-invoicing)
- [Reporting and Analytics](#reporting-and-analytics)
- [Operational Alerts](#operational-alerts)
- [User Management](#user-management)
- [Security and Audit Administration](#security-and-audit-administration)
- [Supabase Security Model](#supabase-security-model)
- [Repository Structure](#repository-structure)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Supabase Installation](#supabase-installation)
- [Database Migrations](#database-migrations)
- [Database Tests](#database-tests)
- [Production Deployment](#production-deployment)
- [Release Validation](#release-validation)
- [Git and Release Workflow](#git-and-release-workflow)
- [Clean-Room Rules](#clean-room-rules)
- [Current Release Status](#current-release-status)
- [Roadmap](#roadmap)

---

## Platform Overview

Cwlwm Field Operations is designed around a simple operational hierarchy:

```text
Organization
├── Users / Memberships
├── Teams / Vendors / Partners
├── Markets
│   └── Territories
│       ├── Representatives
│       └── Locations / Leads
│           ├── Interactions / Dispositions
│           ├── Sales Attempts
│           ├── Orders
│           ├── Appointments
│           └── Lifecycle History
├── Products / Offers
├── Scheduling Policies
├── Lifecycle Integrations
├── Finance / Invoicing
├── Reporting / Analytics
├── Alerts
└── Security / Audit History
```

The application is tenant-first. Business records belong to an organization, and users receive access through organization membership plus optional team and representative relationships.

---

## Core Capabilities

The platform currently supports:

- multi-tenant organization management
- organization-scoped authentication and authorization
- teams, markets, territories, and representative configuration
- location and lead management
- CSV location import
- service-status classification
- territory assignment and workload management
- field representative work queues
- interactive field mapping
- route planning and route optimization
- representative location presence
- customer interaction and disposition logging
- follow-up management
- partial sales capture and resume
- product and offer selection
- order submission and duplicate protection
- sales review
- install appointment scheduling
- scheduling capacity policies
- appointment rescheduling and cancellation
- post-sale lifecycle tracking
- lifecycle exception handling
- finance and invoicing workflows
- invoice batch creation
- invoice adjustments and clawbacks
- invoice export tracking
- reporting and analytics
- operational alerts
- organization setup/readiness checks
- user account administration
- manual password administration
- role-based navigation
- direct-route permission enforcement
- security and audit administration

---

## Current v1.1 Features

### v1.1 Phase 1 - Application UX

Introduced the management-focused application shell and Command Center.

Includes:

- grouped navigation
- Workspace, Revenue Operations, Intelligence, and Configuration sections
- role-aware navigation
- quick actions
- organization footprint summary
- recent order visibility
- appointment visibility
- invoice readiness
- lifecycle exception visibility
- responsive/mobile application shell

### v1.1 Phase 2 - Field Workspace

Introduced the primary field representative workspace at:

```text
/field
```

Includes:

- Today queue
- follow-ups
- appointments
- open sales
- unvisited locations
- service-status filtering
- location focus view
- quick dispositions
- interaction notes
- sales entry
- map handoff
- representative-scoped workflow

### v1.1 Phase 3 - Map and Route Operations

Added interactive field routing and geographic workflow support.

Includes:

- field map
- route stops
- route tracer
- manual stop reordering
- nearest-stop optimization
- optional representative GPS
- Google Maps navigation handoff
- map-linked location selection
- route modes
- Save & Next workflow

### v1.1 Phase 4 - Representative Map UX

Improved map usability for field teams.

Includes:

- status-colored pins
- selected-location emphasis
- map tooltips
- route line visualization
- legend
- mobile bottom sheet

### v1.1 Phase 5 - Representative Workflow

Standardized the primary field process:

```text
Today
  ↓
Navigate
  ↓
Arrive
  ↓
Record Outcome
  ↓
Sale or Follow-Up
  ↓
Complete
  ↓
Next Location
```

Follow-up behavior uses the latest interaction state so outdated interactions do not incorrectly keep a location in an active follow-up state.

### v1.1 Phase 6 - Manager and Dispatcher Command Center

Added manager-facing operations at:

```text
/dispatch
```

Includes:

- team filters
- market filters
- territory filters
- representative filters
- daily worked counts
- sales counts
- appointments
- lifecycle exceptions
- representative productivity
- territory movement
- needs-attention records
- activity feed

### v1.1 Phase 7 - Live Dispatch, Presence, Sale Locking, and Rescheduling

Added authenticated live presence and dispatcher visibility.

Includes:

- organization-scoped representative presence
- optional precise GPS sharing
- dispatcher refresh
- live representative/activity map
- sale-complete location protection
- sold-location removal from normal route queues
- appointment rescheduling
- automatic original-slot release
- order metadata synchronization after reschedule

Representative precise location is only shared when the representative explicitly uses the location-sharing control. Otherwise, dispatcher location can fall back to recent mapped field activity.

### v1.1 Phase 8 - Territory Intelligence and Workload

Expanded territory operations into a workload and penetration dashboard.

Includes:

- territory totals
- prospect counts
- current customer counts
- penetration
- unworked prospects
- assigned workload
- unassigned workload
- worked counts
- conversion metrics
- service-status filters
- representative workload counts
- bulk prospect assignment
- bulk assignment clearing

Supported location service statuses currently include:

```text
prospect
current_customer
do_not_knock
vacant
business
```

### v1.1 Phase 9 - Operational Alerts

Added manager attention management at:

```text
/alerts
```

Alert sources include:

- open lifecycle exceptions
- orders requiring attention
- past-due installs
- no-shows
- stale representative presence
- assigned representatives with no presence
- large or unassigned territory workload

Users can acknowledge, dismiss, and restore alerts. Alert acknowledgement state is organization- and user-scoped.

### v1.1 Phase 10 - Reporting and Analytics

Added reporting at:

```text
/reports
```

Supported time windows:

- 7 days
- 30 days
- 90 days
- all time

Reporting includes:

- sales attempts
- order trends
- conversion
- territory penetration
- install completion
- lifecycle exceptions
- invoice value
- top representatives
- top territories
- lifecycle funnel

Detailed reporting areas include:

```text
/reports/reps
/reports/territories
/reports/scheduling
/reports/lifecycle
/reports/finance
```

CSV export is available for reporting workflows.

### v1.1 Phase 11 - Setup and Admin Readiness

Added a guided setup center at:

```text
/admin/setup
```

The Setup Center evaluates configuration readiness for:

- organization
- teams
- markets
- territories
- dispositions
- representatives
- locations
- products
- offers
- scheduling
- lifecycle

It also provides:

- readiness percentage
- prerequisite status
- record counts
- suggested next step
- active representative count
- unassigned prospect count
- territory assignment coverage

### v1.1 Phase 12 - User Management and Manual Account Administration

Added organization user management at:

```text
/admin/users
```

Current account-management workflow does **not require SMTP**.

Authorized administrators can:

- create user accounts manually
- assign temporary passwords
- assign organization roles
- assign team access
- link a login to a representative record
- activate or deactivate memberships
- manually set a new password
- view account status
- view last sign-in information

The server-side user administration API uses the Supabase service-role key. That key is never exposed to browser code.

SMTP-based invitation support can be added later without replacing the current manual-account workflow.

### v1.1 Phase 13 - Role and Permission Hardening

Centralized application permissions in:

```text
lib/auth/permissions.ts
```

The centralized permission model now controls:

- sidebar visibility
- direct-route access
- role descriptions
- admin access matrix

A user who manually enters a protected URL without permission receives an access-denied view rather than the protected page.

The access matrix is available at:

```text
/admin/access
```

### v1.1 Phase 14 - Security and Audit Administration

Added the Security & Audit Center at:

```text
/admin/security
```

Includes:

- active user count
- inactive user count
- owner count
- admin count
- recent role-change summary
- recent manual password-change summary
- recent deactivation summary
- organization user posture
- last sign-in visibility
- audit-history filtering
- 7-, 30-, and 90-day audit windows

Manual user creation and manual password changes are recorded in the existing audit log.

Current security audit events include:

```text
user_created_manually
password_set_manually
```

---

## System Architecture

### Frontend

- Next.js 15 App Router
- React 19
- TypeScript
- server and client components as appropriate
- browser-safe Supabase client
- responsive application shell

### Backend

- Supabase PostgreSQL
- Supabase Auth
- Row Level Security
- PostgreSQL functions / RPCs
- server-side Supabase service-role administration for privileged user-management operations

### Deployment

- Vercel application hosting
- Supabase managed backend
- GitHub source control

### Architectural Principles

1. **Tenant-first design**  
   Every tenant-owned operational record is organization-scoped.

2. **Defense in depth**  
   Navigation permissions, route permissions, server-side authorization, database RLS, and role-aware database functions work together.

3. **Server-only privileged credentials**  
   The Supabase service-role key is only used in server execution contexts.

4. **Transactional operational workflows**  
   Important operations use database functions where race conditions or atomicity matter.

5. **History preservation**  
   Operational history is preserved instead of overwriting important historical facts.

6. **Generic SaaS foundation**  
   No tenant-specific assumptions are required in core platform architecture.

---

## Data Model

The current domain model includes the following major areas.

### Access and Organizations

- organizations
- organization memberships
- teams
- team memberships

### Geographic Operations

- markets
- territories
- representatives
- representative-territory relationships
- locations

### Field Activity

- dispositions
- interactions
- live presence
- operational alert acknowledgements

### Revenue Operations

- products
- offers
- sales attempts
- orders

### Scheduling

- scheduling policies
- scheduling overrides
- appointments

### Lifecycle and Integrations

- integrations
- lifecycle stages
- lifecycle mappings
- external records
- lifecycle events
- lifecycle exceptions

### Finance

- invoice settings
- invoice batches
- invoice items
- adjustments
- invoice exports

### Governance

- audit log

---

## Application Areas

Primary application routes include:

| Area | Route | Purpose |
|---|---|---|
| Command Center | `/dashboard` | High-level operational overview |
| Dispatch | `/dispatch` | Manager and dispatcher visibility |
| Alerts | `/alerts` | Operational attention queue |
| Field Workspace | `/field` | Representative day-to-day workflow |
| Locations | `/locations` | Location and lead management |
| Territories | `/territories` | Territory intelligence and assignment |
| Representatives | `/representatives` | Representative management |
| Sales | `/sales` | Sales review and management |
| Scheduling | `/scheduling` | Appointment and capacity operations |
| Lifecycle | `/lifecycle` | Post-sale fulfillment and exceptions |
| Finance | `/finance` | Invoice and financial operations |
| Reports | `/reports` | Analytics and reporting |
| Teams | `/teams` | Team configuration |
| Markets | `/markets` | Market configuration |
| Organizations | `/organizations` | Organization administration |
| Setup Center | `/admin/setup` | Configuration readiness |
| Users & Access | `/admin/users` | User account administration |
| Access Matrix | `/admin/access` | Role/permission visibility |
| Security & Audit | `/admin/security` | Security and audit administration |

---

## Roles and Permissions

Supported organization roles:

```text
organization_owner
organization_admin
operations_manager
team_manager
representative
analyst
viewer
```

### Organization Owner

Full tenant control, including:

- organization administration
- users and access
- security administration
- configuration
- operations
- finance
- reporting

### Organization Admin

Broad administrative and operational access, subject to owner-protection rules.

### Operations Manager

Operational management access including:

- field operations
- dispatch
- alerts
- territories
- representatives
- sales
- scheduling
- lifecycle
- finance
- reporting
- operational configuration
- security/audit visibility

Does not receive organization ownership privileges.

### Team Manager

Operational team-management access including:

- dispatch
- alerts
- field operations
- locations
- territories
- representatives
- sales
- scheduling
- lifecycle
- reporting

Does not receive tenant-level administration or finance administration.

### Representative

Focused field access:

- Command Center
- Field Workspace

Representative operational access is further constrained by assignments and RLS-backed organization scope.

### Analyst

Read-oriented access to:

- Command Center
- Reports
- Lifecycle
- Finance

### Viewer

Read-oriented visibility into approved dashboards and reporting areas.

### Permission Enforcement

Application permissions are centralized in:

```text
lib/auth/permissions.ts
```

This policy drives both visible navigation and direct-route access.

> Hiding a navigation item is not treated as the security boundary. Supabase RLS remains the primary data-layer isolation control.

---

## Field Operations Workflow

Representative workflow is designed around fast completion of territory work.

```text
Assigned Territory
      ↓
Today's Queue
      ↓
Select Location
      ↓
Navigate
      ↓
Arrive
      ↓
Record Interaction / Disposition
      ↓
┌────────────────┬────────────────┐
│ Follow-Up      │ Sale Attempt   │
└────────────────┴────────────────┘
      ↓
Complete Location
      ↓
Next Stop
```

Locations with completed sales are protected from normal knock/disposition workflows while preserving historical interaction visibility.

---

## Sales and Order Workflow

The sales process supports partial capture and final submission.

Core concepts:

- sales attempts
- resumable partial sales
- product selection
- offer selection
- install preference capture
- order submission
- duplicate submission protection
- order lifecycle creation
- location sale-state locking

The `submit_order` database function handles important submission behavior, including idempotency and validation.

---

## Scheduling and Capacity

Scheduling supports configurable operational capacity rather than hardcoded appointment availability.

Capabilities include:

- scheduling policies
- time slots
- capacity limits
- blackout/override behavior
- live slot availability
- appointment booking
- appointment rescheduling
- cancellation
- completion

The system uses database-side operations and locking where necessary to reduce overbooking risk.

Rescheduling a linked install updates the appointment and releases the original slot.

---

## Lifecycle Operations

Lifecycle operations track what happens after an order is submitted.

Examples of lifecycle stages include:

```text
Submitted
Entered / Processing
Scheduled
Installed
Activated
Cancelled
```

The system supports:

- lifecycle stage configuration
- external system mappings
- lifecycle event history
- current lifecycle state
- external identifiers
- exception tracking
- exception resolution

Lifecycle history is preserved for operational traceability.

---

## Finance and Invoicing

Finance operations support invoice-ready workflows and batch processing.

Current capabilities include:

- invoice eligibility
- invoice settings
- invoice numbering
- batch creation
- invoice items
- adjustments
- clawbacks
- finalization
- exported status
- void status
- CSV/PDF export tracking

Current invoice batch statuses include:

```text
draft
finalized
exported
void
```

Export activity is recorded so invoice delivery history can be audited.

---

## Reporting and Analytics

Reporting is intended for operational decision-making rather than only raw data display.

Metrics include:

- attempts
- orders
- conversion
- penetration
- installs
- lifecycle exceptions
- finance value
- representative performance
- territory performance
- scheduling performance
- lifecycle funnel

Reporting supports multiple date ranges and CSV export.

---

## Operational Alerts

The alert engine surfaces records requiring operational attention.

Current alert categories include:

- lifecycle exceptions
- orders marked as needs-attention
- past-due appointments
- no-shows
- stale representative presence
- representatives with assignments but no presence
- high or unassigned territory workload

Alert acknowledgement is user-specific so one manager's acknowledgement does not erase another manager's visibility.

---

## User Management

User administration is available at:

```text
/admin/users
```

The current preferred workflow is manual account creation.

An administrator can:

1. create a login email
2. set a temporary password
3. assign an organization role
4. assign team access
5. optionally link a representative
6. activate the account immediately

An administrator can also manually set a new password later.

### SMTP

SMTP is **not required** for the current account-management flow.

Future email invitation and password-recovery workflows can be enabled later when custom SMTP is configured.

---

## Security and Audit Administration

Security administration is available at:

```text
/admin/security
```

The page is intended to help administrators answer questions such as:

- How many users currently have access?
- Which accounts are inactive?
- Who are the owners/admins?
- When did a user last sign in?
- Have passwords recently been changed manually?
- Have account roles or statuses changed?
- What security-sensitive administrative events occurred recently?

The audit view supports filtering and multiple time windows.

---

## Supabase Security Model

Security is built around multiple layers.

### Authentication

Supabase Auth establishes user identity.

### Organization Membership

Authenticated users must have an active organization membership to access tenant data.

### Row Level Security

Tenant tables use Supabase RLS so a browser user cannot bypass UI restrictions to retrieve another organization's data.

### Role-Aware Database Functions

Privileged operational functions enforce organization and role requirements where appropriate.

### Application Permissions

The application shell checks the current organization role before rendering protected routes.

### Server-Side Administration

Privileged user account management uses a server-only Supabase client with:

```text
SUPABASE_SERVICE_ROLE_KEY
```

This variable must never use the `NEXT_PUBLIC_` prefix.

### Tenant Isolation

Tenant isolation has been tested using multiple organizations and users. Users must only be able to access records belonging to organizations where they hold an active membership.

---

## Repository Structure

```text
cwlwm-field-operations/
├── app/
│   ├── admin/
│   │   ├── access/
│   │   ├── security/
│   │   ├── setup/
│   │   └── users/
│   ├── alerts/
│   ├── dashboard/
│   ├── dispatch/
│   ├── field/
│   ├── finance/
│   ├── lifecycle/
│   ├── locations/
│   ├── login/
│   ├── markets/
│   ├── organizations/
│   ├── reports/
│   ├── representatives/
│   ├── sales/
│   ├── scheduling/
│   ├── teams/
│   ├── territories/
│   └── api/
│       └── admin/
│           ├── security/
│           └── users/
├── components/
│   ├── admin/
│   ├── field/
│   └── territory/
├── docs/
├── lib/
│   ├── admin/
│   ├── alerts/
│   ├── auth/
│   ├── config/
│   ├── exports/
│   ├── finance/
│   ├── lifecycle/
│   ├── operations/
│   ├── presence/
│   ├── reporting/
│   ├── sales/
│   ├── scheduling/
│   ├── supabase/
│   └── types/
├── public/
├── supabase/
│   └── v1/
│       ├── migrations/
│       └── tests/
├── package.json
└── README.md
```

---

## Environment Variables

Create a local `.env.local` file.

Required browser-safe variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
NEXT_PUBLIC_APP_NAME=Cwlwm Field Operations
```

Required server-only variable for administrative account operations:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Critical Security Rule

Never expose the service-role key in browser code.

Do **not** create:

```env
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=...
```

The service-role key bypasses RLS and must remain server-only.

### Do Not Commit `.env.local`

Confirm the file remains ignored:

```powershell
git status
git ls-files | Select-String "\.env"
```

---

## Local Development

### Requirements

Recommended development environment:

- Node.js 20+ or current supported Node release
- npm
- Git
- Supabase project

### Install Dependencies

```powershell
npm install
```

### Start Development Server

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

### Production Build Validation

```powershell
npm run build
```

A successful TypeScript/Next.js build is treated as a release requirement.

---

## Supabase Installation

For a fresh installation, use the migration set under:

```text
supabase/v1/migrations/
```

Do not use the older root migration set as the primary current installation path.

The installation is designed to be applied in numeric order.

Create the first Supabase Auth user before running the bootstrap template migration.

See:

```text
docs/SUPABASE_V1_INSTALL.md
```

for detailed installation instructions.

---

## Database Migrations

Current v1 migration sequence:

```text
001_extensions_helpers.sql
002_organizations_access.sql
003_field_operations.sql
004_sales.sql
005_scheduling.sql
006_lifecycle_integrations.sql
007_finance.sql
008_audit_projection.sql
009_rls.sql
010_tenant_integrity.sql
011_transactions.sql
012_seed_demo.sql
013_bootstrap_first_user_TEMPLATE.sql
014_scheduling_operations.sql
015_lifecycle_operations.sql
016_finance_operations.sql
017_reporting_exports.sql
018_production_hardening.sql
019_live_presence.sql
020_sale_lock_reschedule_sync.sql
021_location_service_status.sql
022_operational_alert_acknowledgements.sql
```

### Migration 018 - Production Hardening

Adds production-focused security and operational hardening.

### Migration 019 - Live Presence

Adds organization-scoped representative live presence.

### Migration 020 - Sale Lock and Reschedule Synchronization

Synchronizes install rescheduling and sold-location behavior.

### Migration 021 - Location Service Status

Adds explicit location classification.

### Migration 022 - Operational Alert Acknowledgements

Adds per-user acknowledgement state for alerts.

---

## Database Tests

Database test files are located under:

```text
supabase/v1/tests/
```

Current tests include:

```text
001_schema_smoke_test.sql
002_rls_inventory.sql
003_function_inventory.sql
004_phase9_hardening.sql
005_phase7_live_presence.sql
006_sale_lock_reschedule.sql
007_location_service_status.sql
008_operational_alert_acknowledgements.sql
```

Important production checks include:

- required tables exist
- required functions exist
- RLS is enabled on tenant-owned tables
- tenant isolation works
- live presence behaves correctly
- sale/reschedule synchronization works
- service-status behavior works
- alert acknowledgement behavior works

---

## Production Deployment

The current production hosting model is:

```text
GitHub
  ↓
Vercel
  ↓
Next.js Application
  ↓
Supabase Auth + PostgreSQL
```

### Vercel Environment Variables

Configure:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_NAME
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` must remain server-only.

### Supabase Authentication URL Configuration

Production application URL:

```text
https://cwlwm-field-operations.vercel.app/
```

Authentication URL configuration should match the production domain being used.

The current manual user creation/password workflow does not depend on custom SMTP.

---

## Release Validation

Before tagging or deploying a release, validate at minimum:

### Build

```powershell
npm run build
```

### Authentication

- sign in
- sign out
- refresh persistence
- invalid credentials
- deactivated membership behavior

### User Administration

- create a manual account
- assign a role
- assign teams
- link a representative if needed
- set/reset password manually
- sign in as the new user

### Permissions

Test multiple roles.

Representative example:

- Field Workspace visible
- Admin hidden
- Finance hidden
- direct navigation to `/admin/users` denied

Team Manager example:

- operations available
- reporting available
- tenant administration unavailable

Owner/Admin example:

- full expected administrative access

### Field Operations

- load territory
- open map
- select location
- record disposition
- add notes
- create follow-up
- complete field workflow

### Sales

- begin sales attempt
- resume partial attempt
- submit order
- confirm duplicate submission protection
- confirm sold-location protection

### Scheduling

- view capacity
- book appointment
- reschedule appointment
- verify previous capacity is released
- cancel/complete where appropriate

### Lifecycle

- create/update lifecycle state
- verify history
- verify exceptions
- resolve exception

### Finance

- identify invoice-ready records
- create batch
- apply adjustment
- finalize
- export
- verify export audit

### Reporting

- verify 7/30/90/all-time views
- verify representative reporting
- verify territory reporting
- verify scheduling reporting
- verify lifecycle reporting
- verify finance reporting
- test CSV export

### Alerts

- open alert queue
- acknowledge alert
- dismiss alert
- restore alert

### Security

- open `/admin/security`
- verify account posture
- verify last sign-in values
- create account and confirm audit record
- manually set password and confirm audit record

### Tenant Isolation

Use at least two organizations and confirm each user can only retrieve their own organization's data.

---

## Git and Release Workflow

Typical release checkpoint:

```powershell
git status
git add .
git commit -m "Describe release changes"
git pull --rebase origin main
git push
git status
```

Create an annotated release tag:

```powershell
git tag -a v1.1.0 -m "Cwlwm Field Operations v1.1.0"
git push origin v1.1.0
```

Verify tags:

```powershell
git tag
```

Expected current milestone tags include:

```text
v1.0.0
v1.1.0
```

---

## Clean-Room Rules

This project must remain independently developed and company-agnostic.

Do not commit:

- customer names or customer datasets from a former employer
- internal pricing that is not public or independently created
- former-employer credentials
- API keys or passwords
- private network maps
- proprietary database exports
- private operational manuals
- copied source code
- private branded assets
- internal communications
- confidential business logic copied from another system

Synthetic/demo data should be used for development, screenshots, documentation, and testing.

See:

```text
docs/CLEAN_ROOM_RULES.md
```

---

## Current Release Status

### v1.0.0

Established the production-capable Supabase architecture and migrated the major operational domains from the original prototype into the live backend.

### v1.1.0

Current stable checkpoint adds the major management and SaaS-operability layer around the core backend:

- improved application UX
- field workspace
- maps and routing
- live dispatch
- representative presence
- sale-state protection
- rescheduling synchronization
- territory intelligence
- service-status classification
- operational alerts
- reporting and analytics
- guided setup
- user administration
- manual account creation
- manual password management
- centralized role permissions
- direct-route access protection
- access matrix
- security and audit administration

This release represents a strong checkpoint before beginning the next operations and platform-administration milestone.

---

## Roadmap

The next planned development area is **system health and diagnostics**.

Potential Phase 15 scope:

- system health dashboard
- Supabase connectivity status
- environment configuration checks
- application/backend readiness
- recent failed operation visibility
- database/RPC availability checks
- lifecycle exception health
- alert health
- representative presence health
- invoice/export health
- deployment diagnostics
- administrator troubleshooting information

Future platform areas may include:

- configurable organization branding
- richer partner/vendor support
- configurable workflows
- expanded integration framework
- API/webhook administration
- automated background synchronization
- configurable notification delivery
- custom SMTP/email workflows
- SSO options
- advanced permission customization
- organization billing/subscriptions
- production observability
- expanded automated tests

---

## Project Principles

Cwlwm Field Operations is being built around a few long-term principles:

**Operational clarity** - field teams should know what to do next without digging through multiple systems.

**Data integrity** - important state transitions should be explicit, validated, and historically traceable.

**Tenant isolation** - one organization's operational data must never be exposed to another organization.

**Role clarity** - representatives, managers, analysts, administrators, and owners should see the tools appropriate to their responsibilities.

**Configuration over hardcoding** - products, offers, territories, capacity, lifecycle behavior, and future workflows should be configurable wherever practical.

**Clean-room portability** - the platform should remain reusable across organizations and industries without relying on proprietary implementation details from another business.

---

## License / Distribution

This repository is currently a private Cwlwm Systems development project unless explicitly released under another license. No license or redistribution rights should be assumed unless a license file is added to the repository.

---

**Cwlwm Field Operations**  
Multi-tenant field operations infrastructure by Cwlwm Systems.
