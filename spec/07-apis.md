# API Contracts (Draft)

All requests must be tenant-scoped by resolved tenant (server-side).

## Public Storefront
- GET /api/store/products?category=&q=&page=
- GET /api/store/product/:slug
- GET /api/store/categories
- GET /api/store/settings
- POST /api/checkout
  - body: { customer_name, phone, wilaya, address?, items: [{product_id, variant_id?, qty}] }
  - returns: { order_id, status }

## Tenant Admin (auth required)
- GET /api/admin/me
- GET /api/admin/products
- POST /api/admin/products
- PATCH /api/admin/products/:id
- DELETE /api/admin/products/:id

- GET /api/admin/orders?status=
- PATCH /api/admin/orders/:id/status

- GET /api/admin/settings/theme
- PATCH /api/admin/settings/theme
- GET /api/admin/store-settings
- PATCH /api/admin/store-settings
- GET /api/admin/store-settings/agent-summary

## Super-admin (auth required)
- GET /api/super/tenants
- POST /api/super/tenants
- PATCH /api/super/tenants/:id (suspend/activate)
- DELETE /api/super/tenants/:id
- POST /api/super/impersonate (tenant_id, user_id)
- GET /api/super/revenue/summary
