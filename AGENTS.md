# Instructions for AI Agents

You are implementing a multi-tenant SaaS e-commerce platform (Algeria) with Nuxt 3 + Tailwind + SEO.
please adde express as backend framework

## Non-negotiable rules
1) Multi-tenancy isolation is mandatory:
   - All tenant-owned data tables MUST include `tenant_id` (UUID) NOT NULL.
   - Every query MUST be scoped by tenant_id.
   - Never allow a tenant to access another tenant’s data.

2) Tenant resolution:
   - Tenant is resolved from request Host header:
     - {tenant}.platform.com (subdomain)
     - custom domain (mapped to tenant)
   - Tenant context MUST be attached to request lifecycle.

3) Security basics:
   - Authentication required for tenant admin routes
   - Role-based access control (RBAC)
   - Super-admin can impersonate tenant (audit logged)

4) SEO:
   - Public storefront must be SSR/hybrid and generate correct meta tags
   - Canonical URLs and sitemaps per tenant

5) Quality gate:
   - Provide tests for anything related to tenancy, auth, checkout.
   - Do not ship TODOs in core logic. If something is deferred, document it.

## What to read before coding
- /spec/01-overview.md
- /spec/03-tenancy.md
- /spec/10-acceptance-tests.md
- Your assigned ticket in /tickets

## Output format required from agents (every PR)
- Summary of changes
- Files changed (list)
- How to run / test locally
- Tests added/updated
- Any assumptions and decisions

## Architectural preference
- Keep modules small and composable
- Prefer explicit types and validated input
- Prefer “secure by default” patterns (tenant scoping cannot be forgotten)

## Backend Architecture Standards (SOLID & DRY)
To ensure scalability and maintainability, all backend modules must follow a **Service-Controller** architecture.

### 1. Controllers (`*.controller.ts`)
- **Responsibility**: Handle HTTP requests, parse input (body, params, query), and send responses.
- **Rules**:
  - NO business logic.
  - NO database calls directly (use Services).
  - Extract `tenant` and `user` from request context.
  - Return standard HTTP status codes.

### 2. Services (`*.service.ts`)
- **Responsibility**: Contain all business logic and database interactions.
- **Rules**:
  - Receives pure data (not `req` or `res` objects).
  - Returns data or throws typed errors.
  - MUST enforce tenant isolation explicitly in every DB query (`where: { tenantId }`).

### 3. Routes (`routes.ts`)
- **Responsibility**: Map HTTP endpoints to Controller methods.
- **Rules**:
  - Apply middleware (Auth, RBAC).
  - No inline function definitions.

### 4. General Principles
- **DRY (Don't Repeat Yourself)**: Extract common logic (e.g., validation, error handling) into utilities or middleware.
- **SOLID**:
  - **Single Responsibility**: Each class/file does one thing.
  - **Dependency Injection**: Pass dependencies (like Prisma client) if needed for testing (optional but encouraged).
