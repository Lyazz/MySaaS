# Project Decisions (living doc)

## Confirmed
- Multi-tenant SaaS, single shared Postgres DB
- Tenant resolution: subdomain + custom domain
- E-commerce V1: products/variants, categories, COD checkout without account
- Payment V1: COD
- Payment V2: Chargily
- Delivery V1: manual
- Delivery V2+: integrate Algerian delivery companies one-by-one
- Frontend: Nuxt 3 + Tailwind, SEO-first

## Pending decisions
- RBAC roles final list (draft exists in spec/04-roles-permissions.md)
- Whether to enforce tenant isolation with Postgres RLS vs app-level enforcement
- Hosting choice (Vercel vs Docker VPS/cloud)
