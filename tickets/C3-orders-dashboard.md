# C3 — Orders Dashboard (Tenant Admin)

## Goal
Tenant admin can:
- list orders
- change status (new/confirmed/shipped/delivered/cancelled)

## Requirements
- RBAC + tenant scoping
- Basic filtering by status

## Tests
- Change status under tenant A
- tenant B cannot modify tenant A orders
