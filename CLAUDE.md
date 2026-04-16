# CLAUDE.md — Swekly SaaS Platform

## Project Overview
Multi-tenant SaaS e-commerce platform for Algeria. Built with Nuxt 3 (frontend + SSR) + Express.js (backend API) + PostgreSQL (Prisma ORM). Supports ~100 tenants with full data isolation, multiple storefront themes, and Algerian delivery provider integrations (Maystro, Yalidine).

## Tech Stack
- **Frontend:** Nuxt 3, Vue 3, Pinia, Tailwind CSS, @nuxtjs/i18n (EN/FR/AR + RTL)
- **Backend:** Express.js (`backend/src/`) served via Nuxt server proxy (`server/api/[...].ts`)
- **Database:** PostgreSQL 15 via Prisma ORM (`prisma/schema.prisma`)
- **Storage:** AWS S3 / MinIO (file uploads)
- **Mobile:** Capacitor (Android/iOS)
- **Testing:** Vitest (unit/integration), Playwright (E2E), Supertest (API)

## Commands

### Development
```bash
npm run dev          # Start full dev server (Nuxt + Express) on :3000
npm run db:up        # Start PostgreSQL + MinIO via Docker Compose
npm run db:down      # Stop Docker services
```

### Build & Preview
```bash
npm run build        # Production build
npm run preview      # Preview production build
npm run generate     # Static site generation (SSG)
```

### Quality
```bash
npm run test         # Vitest unit + integration tests
npm run typecheck    # Vue-tsc type checking
npm run lint         # ESLint
```

### Mobile
```bash
npm run mobile:build        # SSG for mobile (NUXT_SSR=false)
npm run mobile:sync         # Sync web assets to native
npm run mobile:run:android  # Run on Android emulator
npm run mobile:run:ios      # Run on iOS simulator
```

### Database
```bash
npx prisma migrate dev       # Apply migrations (dev)
npx prisma migrate deploy    # Apply migrations (production)
npx prisma studio            # Open Prisma Studio GUI
```

## Architecture

### Backend Module Structure
Every backend module lives in `backend/src/modules/<module>/` and must follow:

```
<module>.controller.ts   — HTTP layer only (parse req, call service, send res)
<module>.service.ts      — All business logic + Prisma queries
routes.ts                — Route definitions with middleware
```

- Controllers: no business logic, no DB calls, extract `tenant` + `user` from `req`
- Services: receive plain data, return data or throw typed errors, **always scope queries by `tenantId`**
- Routes: apply auth + RBAC middleware, no inline logic

### Multi-Tenancy (NON-NEGOTIABLE)
- Every tenant-owned table has `tenant_id UUID NOT NULL`
- Every Prisma query must include `where: { tenantId }` — never omit this
- Tenant resolved from Host header: `{tenant}.platform.com` or custom domain
- Tenant context attached by middleware — never trust client-sent tenant_id

### Frontend Structure
- `pages/` — Nuxt routes (storefront, `admin/`, `super-admin/`)
- `components/storefront/` — Customer-facing, organized by template theme
- `components/admin/` — Tenant admin dashboard components
- `stores/` — Pinia stores (auth, cart, tenant context)
- `composables/` — Vue 3 composables
- `layouts/` — Nuxt layouts (admin, storefront, auth)
- `locales/` — i18n translations (en.json, fr.json, ar.json)

### Storefront Templates
Located at `components/storefront/templates/<theme>/`. Current themes: activewear, chrono, classic, cozy, cyber, food, minimal, modern, playful, stationnery. Each theme has `Checkout.vue` and `partials/ProductOrderForm.vue` among others.

### Key Backend Modules
| Module | Path |
|--------|------|
| auth | `backend/src/modules/auth/` |
| products | `backend/src/modules/products/` |
| orders | `backend/src/modules/orders/` |
| delivery | `backend/src/modules/delivery/` (Maystro, Yalidine, Self) |
| store-settings | `backend/src/modules/store-settings/` |
| superadmin | `backend/src/modules/superadmin/` |
| cash/pos | `backend/src/modules/cash/`, `backend/src/modules/pos/` |

## Non-Negotiable Rules
1. **Tenant isolation** — Every DB query scoped by `tenantId`. Zero exceptions.
2. **Service-Controller separation** — No business logic in controllers, no HTTP objects in services.
3. **Security** — Auth required on admin routes, RBAC enforced, super-admin impersonation always audit-logged.
4. **SSR/SEO** — Public storefront must SSR with correct meta tags, canonical URLs, sitemaps per tenant.
5. **Tests** — Any changes to tenancy, auth, or checkout require tests.

## Environment Variables
See `.env.example` for the full list. Key vars:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret
- `S3_*` / `MINIO_*` — Object storage credentials
- `MAYSTRO_*` / `YALIDINE_*` — Delivery provider API keys

## Specs & Tickets
- Architecture specs: `spec/` (01-overview, 03-tenancy, 04-roles-permissions, 05-data-model, 07-apis, 10-acceptance-tests)
- Implementation tickets: `tickets/`
- Architecture decisions: `DECISIONS.md`




---Always respond in a very concise and direct manner, providing only relevant information.
