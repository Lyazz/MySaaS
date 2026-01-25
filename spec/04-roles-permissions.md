# Roles & Permissions (Draft)

## Tenant roles (initial)
- Owner: full access to tenant settings, users, products, orders
- Admin: manage products/orders/users, limited settings
- Staff: manage orders only (optional)

## Super-admin (platform)
- Manage tenants: create, suspend, delete
- Manage plans and limits
- View platform revenue dashboards
- Impersonate tenant users (audit-logged)

## Notes
This role model is a draft and may evolve. Implement RBAC so new permissions can be added without refactoring everything.
