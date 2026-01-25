# Acceptance Tests (Definition of Done)

## Tenancy
1) Given Tenant A and Tenant B,
   - Tenant A cannot read/write any Tenant B products/orders/users.
2) Host resolution:
   - tenantA.platform.com resolves tenant A
   - customdomainA.com resolves tenant A

## Storefront
3) Product page is SSR/hybrid and includes:
   - title/meta description
   - canonical url matching host
4) Sitemap exists per tenant

## Checkout (COD)
5) Checkout without account creates an order with:
   - customer phone required
   - status = "new"
   - tenant_id set correctly

## Admin
6) Tenant admin can:
   - create product with variants
   - change order status

## Super-admin
7) Super-admin can:
   - suspend tenant (storefront/admin becomes inaccessible or read-only as defined)
   - impersonate tenant admin (audit logged)
