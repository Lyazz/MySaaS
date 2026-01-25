# A2 — Tenant Isolation Enforcement

## Goal
Ensure no cross-tenant data access is possible.

## Requirements
Choose enforcement:
- Prefer Postgres RLS OR a strict application query layer.
Document the choice in DECISIONS.md.

## Tests
- Create tenant A and B
- Create a product for tenant A
- Attempt to fetch it under tenant B host => must fail / return not found

## Acceptance criteria
- Tenancy acceptance tests (spec/10) pass
