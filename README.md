# 🛒 Multi-Tenant E-commerce SaaS (Algeria)

A **modern multi-tenant SaaS e-commerce platform** built for **Algerian retailers**, optimized for **high conversion**, **Cash on Delivery (COD)**, **mobile-first UX**, and **SEO**.

Each tenant (society/business) gets its own fully isolated online store with:
- its own domain or subdomain
- admin dashboard
- branded storefront
- shared infrastructure, isolated data

The platform is designed to start with **~100 tenants** and scale safely.

---

## ✨ Key Features

### 🏬 Multi-Tenant SaaS
- One platform, many stores (societies)
- Single shared PostgreSQL database
- Strict data isolation via `tenant_id`
- Tenant automatically resolved from domain:
  - `tenant.platform.com`
  - `www.tenant.com`

### 🛍️ E-commerce Core
- Products with variants (size, color, etc.)
- Categories
- Public storefront:
  - Home
  - Category
  - Product

  - About / Contact
- **Premium SaaS Landing Page**:
  - Modern, responsive design ("Swekly" styling)
  - Features showcase, Pricing, Social Proof
  - SEO optimized
- SEO-friendly URLs and pages

### 💰 Checkout & Payments
- Cash on Delivery (COD) — MVP
- No customer account required
- Phone number required
- Mobile-first, short checkout
- Chargily payment integration planned (V2)

### 📦 Orders & Delivery
- Order lifecycle:
  - NEW → CONFIRMED → SHIPPED → DELIVERED → CANCELLED
- Delivery integrations:
  - Maystro (orders, webhooks)
- Yalidine (parcels via https://api.yalidine.app/v1 with X-API-ID / X-API-TOKEN headers)
  - Self delivery (internal courier)

### 🎨 Tenant Customization
- Logo
- Brand colors
- Custom homepage sections
- Multi-language storefront:
  - Arabic (RTL)
  - French
  - English

### 🌍 Language Switching (i18n)
- **Admin**: use the `FR / AR / EN` switcher in the admin top bar.
- **Storefront**: use the same switcher (when available) or rely on the store’s default language.
- **Persistence**: selection is saved in the `i18n_redirected` cookie.
- **Store default language**: Admin → Settings → Functional → Default Language (used when the cookie is not set).

### 🔐 Admin & SaaS Management
- Tenant admin dashboard:
  - products
  - orders
  - users
  - theme & settings
- Super-admin dashboard:
  - create / suspend / delete tenants
  - revenue overview
  - tenant impersonation (audit logged)

---

## 🧱 Architecture Overview

┌────────────────────┐
│ Frontend │
│ Nuxt 3 + Tailwind │
│ (SEO + UI) │
└─────────▲──────────┘
│ HTTP
┌─────────┴──────────┐
│ Backend │
│ Node.js + Express │
│ (Auth, Tenancy, │
│ Business Logic) │
└─────────▲──────────┘
│
┌─────────┴──────────┐
│ PostgreSQL DB │
│ Single DB, │
│ tenant_id scoped │
└────────────────────┘

---

## 🧠 Core Design Principles

### Multi-Tenancy (Critical)
- Single PostgreSQL database
- All tenant-owned tables include `tenant_id`
- **Frontend NEVER sends tenant_id**
- Backend resolves tenant from **Host header**
- Every query is tenant-scoped

### Security First
- Auth required for all admin routes
- Role-Based Access Control (RBAC)
- Rate limiting on login and checkout
- Super-admin impersonation is always audit-logged

### SEO First
- Server-Side Rendering (SSR) via Nuxt
- Canonical URLs per tenant domain
- Dynamic meta tags
- Product structured data (JSON-LD)
- Sitemap per tenant

### Mobile-First & Responsive Design
- **Mobile-first CSS**: Built with Tailwind's mobile-first breakpoint system
- **Fully responsive UI**: All pages adapt seamlessly from 320px (mobile) to 4K displays
- **Tested viewports**:
  - Mobile: 375px, 414px (iPhone, Android phones)
  - Tablet: 768px, 1024px (iPad, Android tablets)
  - Desktop: 1280px, 1920px, 2560px (laptops, monitors, 4K)
- **Responsive components**:
  - Admin sidebar: Collapsible on mobile with hamburger menu
  - Data tables: Horizontal scroll on mobile, full width on desktop
  - Forms: Single column on mobile, multi-column on desktop
  - Navigation: Collapsed menu on mobile, full nav on desktop
- **Touch-friendly**: All interactive elements sized for touch targets (44px minimum)
- **Performance**: Optimized for 3G networks common in Algeria

### 📱 Mobile App (Android/iOS)
- Capacitor wrapper for native builds (see `MOBILE.md`)

---

## 🚚 Delivery Module (Express + Prisma)

- Adapter interface (`DeliveryProvider`) with providers: Maystro, Yalidine, Self.
- Service/controller split; routes mounted under `/api`:
  - `POST /api/delivery/options`
    - If `provider` is omitted, returns rate-shopping results across offered providers
  - `POST /api/shipments`
  - `GET  /api/shipments/:id`
  - `GET  /api/shipments/:id/tracking`
  - `POST /api/webhooks/maystro`
  - `POST /api/self/shipments/:id/status` (admin)
  - `GET  /api/admin/delivery/providers` (admin)
  - `PUT  /api/admin/delivery/providers/:provider/account` (admin)
- Persistence: `Shipments`, `ShipmentEvents`, `DeliveryRate` (wilaya/commune pricing). Idempotent on `(tenantId, provider, orderId)`.
- Per-tenant carrier credentials: `TenantDeliveryAccount` (secrets are never returned by the API).
- Tenant context resolved from Host; admin routes can derive tenant from the authenticated user; RBAC enforced.

### Quick curl samples

```bash
# Delivery options (fallback to local rates when provider quote missing)
curl -X POST http://localhost:3000/api/delivery/options \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: <tenant-id>" \
  -H "Content-Type: application/json" \
  -d '{ "provider":"SELF", "destination": { "wilayaCode":"16" } }'

# Create a shipment (admin)
curl -X POST http://localhost:3000/api/shipments \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: <tenant-id>" \
  -H "Content-Type: application/json" \
  -d '{ "provider":"SELF", "orderId":"<order-id>", "contactName":"Customer", "contactPhone":"0550...", "wilayaCode":"16", "addressLine1":"12 Rue"}'

# Maystro webhook (double-base64 payload as per docs)
curl -X POST http://localhost:3000/api/webhooks/maystro \
  -H "Content-Type: application/json" \
  -d '{ "payload": "<double-base64-string>" }'
```

---

## 📁 Repository Structure

/
├── frontend/ # Nuxt 3 app (UI + SEO)
│ ├── pages/
│ ├── layouts/
│ ├── middleware/
│ ├── stores/ # Pinia (auth, tenant, cart)
│ ├── components/
│ └── composables/
│
├── backend/ # Node.js + Express API
│ ├── src/
│ │ ├── middleware/ # tenant, auth, rbac
│ │ ├── modules/ # auth, products, orders, tenants
│ │ ├── lib/ # prisma, logger, errors
│ │ └── routes.ts
│ └── prisma/
│ └── schema.prisma
│
├── spec/ # Product & architecture specs
├── tickets/ # Step-by-step implementation tasks
└── README.md

---

## 🔄 Multi-Tenancy Model

### Tenant Resolution
- Storefront (public):
  - `{slug}.platform.com` (or `{slug}.localhost` in local dev) resolves tenant by `slug`
  - If a tenant subdomain does not exist in DB, the request returns **404** (no fallback to SaaS landing)
- SaaS (platform):
  - `platform.com` / `localhost` serves the SaaS landing + tenant auth pages
  - Tenants can only access `/login` and `/register` from the SaaS host (root domain)
- Backend resolution is **server-side only** (frontend never sends tenant identifiers)

### Admin vs Storefront scoping
- Storefront APIs (`/api/products`, `/api/categories`, `/api/orders`) require tenant context from **Host**
- Admin APIs (`/api/admin/*`) resolve tenant context in this order:
  1) Host header (when called from a tenant subdomain)
  2) Authenticated user (`user.tenantId`) when called from the SaaS host

### Database Model
- Global tables:
  - tenants
  - plans
  - feature flags
- Tenant-owned tables:
  - users
  - products
  - variants
  - categories
  - orders
  - settings

---

## 👥 User Roles

### Tenant Roles
- **Owner**: full access
- **Admin**: manage products, orders, users
- **Staff**: manage orders only

### Platform Role
- **Super-Admin**:
  - manage tenants
  - suspend or delete stores
  - view platform metrics
  - impersonate tenants (logged)

---

## 🚀 Getting Started (Local Development)

### Requirements
- Node.js 18+
- PostgreSQL
- npm / pnpm / yarn

---

### Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
🧪 Testing Strategy
Unit tests:
helpers
middleware
Integration tests:
tenant isolation
auth
End-to-End tests (Playwright):
tenant storefront → checkout COD
admin creates product → visible publicly
tenant A cannot access tenant B
🛣️ Roadmap
V1 (MVP)
Multi-tenant stores
COD checkout
Tenant admin dashboard
SEO storefront
Manual delivery
V2
Chargily payments
Delivery companies integration
WhatsApp / SMS confirmation
Advanced analytics
V3
Marketing automation
Abandoned cart recovery
Multi-store per tenant
⚠️ Important Rules
❌ Never trust frontend for tenant identification
❌ Never query tenant data without tenant_id
❌ Never allow cross-tenant access
✅ Always resolve tenant from Host header
✅ Always add tests for tenant isolation
🧠 Intended Audience
SaaS builders
Algerian e-commerce platforms
Teams needing strict multi-tenancy
Developers using AI-assisted workflows
