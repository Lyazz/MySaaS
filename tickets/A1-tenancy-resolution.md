# A1 — Tenant Resolution (Host -> Tenant)

## Goal
Resolve tenant from request Host for both:
- {slug}.swekly.com
- custom domains mapped to a tenant

## Requirements
- Add tenants table/model
- Add middleware that resolves tenant early
- Make tenant available in request context for API handlers
- Return 404 if tenant not found

## Tests
- Unit test: host parsing
- Integration test: requesting /api/store/categories on tenantA host returns tenantA context

## Acceptance criteria
- Must pass Tenancy acceptance tests (spec/10)
