# Tenancy (Single DB)

## Model
Single shared PostgreSQL database.

### Tenant-owned tables
Must include:
- `tenant_id` UUID NOT NULL
- indexes include tenant_id

Examples: products, variants, categories, orders, order_items, customers, pages, theme_settings, tenant_users, roles.

### Global tables (no tenant_id)
Examples: tenants, plans, feature_flags, integration_catalog.

## Tenant resolution
Tenant is resolved from HTTP Host.
- If host matches `{slug}.platform.com` => slug identifies tenant.
- If host matches a custom domain => map domain -> tenant.

Tenant resolution must run early (middleware).

### Current behavior (dev + MVP)
- `{slug}.localhost` is supported for local development.
- Requests to a tenant subdomain that does not exist in DB must return **404**.
- Admin requests on the SaaS host may derive tenant context from the authenticated user (`user.tenantId`) when no tenant host is present.

## Enforcing isolation
Every query on tenant-owned data MUST be scoped by tenant_id.

Recommended enforcement (choose one):
A) Postgres Row Level Security (RLS), app sets tenant_id for session
B) Application enforcement + tests + query helpers (must be hard to bypass)

If uncertain, default to A (RLS) for strongest safety.

## Constraints
- Unique slugs per tenant: `(tenant_id, slug)`
- Any public content uses tenant-scoped slugs and canonical urls

## Impersonation (super-admin)
- Super-admin can impersonate tenant admin
- Every impersonation event is written to audit_log with:
  - who impersonated
  - which tenant
  - timestamp
  - reason (optional)
