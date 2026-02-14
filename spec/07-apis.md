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
- GET /api/admin/cashboxes
- POST /api/admin/cashboxes
- PATCH /api/admin/cashboxes/:id
- GET /api/admin/cash-sessions?cashboxId=&status=&startDate=&endDate=
- POST /api/admin/cashboxes/:id/sessions/open
- POST /api/admin/cash-sessions/:id/close
- GET /api/admin/cash-transactions?cashboxId=&sessionId=&type=&direction=&startDate=&endDate=
- POST /api/admin/cash-transactions
- POST /api/admin/cash-transfers
- GET /api/admin/products
- POST /api/admin/products
- PATCH /api/admin/products/:id
- DELETE /api/admin/products/:id
- GET /api/admin/products/export.csv?ids=comma,separated,ids
- POST /api/admin/products/import.csv (multipart form-data: file)
- PATCH /api/admin/products/bulk
- POST /api/admin/products/:id/duplicate

- GET /api/admin/orders?status=
- PATCH /api/admin/orders/:id/status

- GET /api/admin/inventory/variants
- GET /api/admin/inventory/variants/export.csv
- POST /api/admin/inventory/variants/import.csv (multipart form-data: file)
- PATCH /api/admin/inventory/variants/bulk
- PATCH /api/admin/inventory/variants/:id

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
