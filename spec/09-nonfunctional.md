# Non-functional Requirements

## Scalability
- 100 tenants at launch
- ~50 products per tenant
- hundreds of orders per tenant possible
- horizontal scaling should be possible

## Performance
- Fast storefront on mobile
- Use caching for public pages where safe (tenant-aware)
- Indexes on key access patterns:
  - (tenant_id, slug)
  - (tenant_id, created_at)
  - (tenant_id, status)

## Reliability
- Daily DB backups
- Basic monitoring/logging

## Security
- Tenant isolation enforced
- Rate limiting on checkout/login endpoints
- Audit log for impersonation
