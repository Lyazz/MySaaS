# Admin Guided Tour — Design Spec
Date: 2026-05-03

## Overview

Add an interactive guided tour to the tenant admin panel using **driver.js**. Tenants are walked through each admin section step-by-step, with full EN/FR/AR (RTL) support and the ability to quit at any time.

## Goals

- Help new tenants understand the admin UI and launch their store without external support
- Cover all major sections: sidebar, dashboard, products, orders, delivery, settings
- Auto-launch once per section on first visit; never repeat unless manually relaunched
- Allow tenants to relaunch any tour from the sidebar at any time

## Non-Goals

- No backend/DB changes — progress stored in `localStorage` only
- No analytics or tour-completion tracking
- No tours for super-admin or POS sections (out of scope for now)

## Package

**driver.js** v1.x (`npm install driver.js`)

- Framework-agnostic, works cleanly with Nuxt 3
- Built-in RTL support (auto-detects `dir="rtl"` on `<html>`)
- Fully customizable via CSS variables
- Built-in ESC key + close button on every step

## Architecture

### CSS Theme Integration

Override driver.js default styles using the project's existing CSS variables:

```css
--driver-popover-bg: var(--surface-1);
--driver-popover-title-color: var(--text-primary);
--driver-popover-description-color: var(--text-secondary);
--driver-popover-border-color: var(--surface-border);
--driver-popover-btn-next-bg: var(--brand);
--driver-popover-btn-prev-color: var(--text-secondary);
```

Applied globally in `assets/css/driver-theme.css`, imported in `nuxt.config.ts`.

### Tour Registry — `composables/useTour.ts`

Central composable that:
- Holds a registry of all tours with `{ id, labelKey, icon, pages[] }`
- Exposes `startTour(id: string)` — creates driver.js instance with translated steps and starts it
- Exposes `autoStartIfNeeded(tourId: string)` — called `onMounted` on each page; checks `localStorage` key `tour_seen_{tourId}`, launches if not seen, then marks as seen
- Exposes `tours` (reactive list) — used by the sidebar panel to render the tour menu
- Tracks a `activeTourId` ref — if a tour is already running, `autoStartIfNeeded` skips silently (prevents simultaneous tours)
- When the sidebar tour completes/is dismissed, it fires `autoStartIfNeeded('dashboard')` so the dashboard tour follows naturally rather than overlapping

### Per-Section Composables — `composables/tours/`

Each file returns a `getSteps(t)` function receiving the i18n `t()` helper and returning a `DriveStep[]` array targeting real DOM elements by CSS selector or `data-tour` attribute.

```
composables/tours/
  useSidebarTour.ts
  useDashboardTour.ts
  useProductsTour.ts
  useOrdersTour.ts
  useDeliveryTour.ts
  useSettingsTour.ts
```

### data-tour Attributes

Key UI elements get a `data-tour="<id>"` attribute so tour steps can target them reliably (e.g. `data-tour="sidebar-products"`, `data-tour="dashboard-stats"`). This decouples tour targeting from CSS class names that may change.

## Tours & Steps

### 1. Sidebar Tour (`sidebar`)
Auto-launches after the onboarding wizard completes (checked via `authStore.user.tenant.onboardingCompleted`).

Steps:
1. Sidebar logo/store name area — "This is your store"
2. Dashboard nav item — "Your overview"
3. Products nav item — "Manage your catalog"
4. Orders nav item — "Track customer orders"
5. Delivery nav item — "Configure shipping"
6. Settings nav item — "Customize your store"
7. Help item at bottom — "Relaunch any tour here"

### 2. Dashboard Tour (`dashboard`)
Auto-launches on first visit to `/admin`.

Steps:
1. Stats cards row — "Key metrics at a glance"
2. Getting Started checklist — "Your launch checklist"
3. Trend chart — "Sales over time"
4. Quick actions area — "Common shortcuts"

### 3. Products Tour (`products`)
Auto-launches on first visit to `/admin/products`.

Steps:
1. Products table — "All your products"
2. Search/filter bar — "Find products quickly"
3. Create button — "Add a new product"
4. Stock badge — "Track inventory here"

### 4. Orders Tour (`orders`)
Auto-launches on first visit to `/admin/orders`.

Steps:
1. Orders table — "All incoming orders"
2. Status filter tabs — "Filter by order status"
3. Export button — "Export to spreadsheet"
4. Order row — "Click any order for details"

### 5. Delivery Tour (`delivery`)
Auto-launches on first visit to `/admin/delivery`.

Steps:
1. Provider cards (Maystro / Yalidine / Self) — "Choose your delivery partner"
2. Active provider config panel — "Configure rates and zones"
3. Save button — "Changes apply immediately"

### 6. Settings Tour (`settings`)
Auto-launches on first visit to `/admin/settings/appearance` (the default settings entry point).

Steps:
1. Appearance tab — "Logo, colors, template"
2. Contact tab — "Phone, address, social links"
3. Functional tab — "Currency, language, store visibility"
4. Publish toggle — "Go live when you're ready"

## Relaunch Panel (Sidebar)

A `AdminTourMenu.vue` component rendered at the bottom of the admin sidebar layout.

- Shows a "Tours & Help" label with a `?` icon
- On click, expands an inline list of all 6 tours with their name and a "▶ Start" button
- Clicking a tour calls `startTour(id)` directly (no auto-seen check — always launches)
- Collapses when a tour starts or when clicked again

## i18n

All step titles and descriptions added under `admin.tours` in all three locale files:

```json
"tours": {
  "menu": "Tours & Help",
  "sidebar": { "title": "...", "steps": { ... } },
  "dashboard": { "title": "...", "steps": { ... } },
  "products": { "title": "...", "steps": { ... } },
  "orders": { "title": "...", "steps": { ... } },
  "delivery": { "title": "...", "steps": { ... } },
  "settings": { "title": "...", "steps": { ... } }
}
```

RTL is handled automatically by driver.js detecting `<html dir="rtl">` which is already set by your i18n layout logic for Arabic.

## Auto-Launch Flow

```
Tenant finishes onboarding wizard
  → navigateTo('/admin')
  → AdminLayout mounts
  → useTour.autoStartIfNeeded('sidebar') fires
  → sidebar tour runs
  → on close/complete: marked as seen in localStorage

First visit to /admin/products
  → page mounts
  → useTour.autoStartIfNeeded('products') fires
  → products tour runs
  → marked as seen
```

## localStorage Keys

```
tour_seen_sidebar
tour_seen_dashboard
tour_seen_products
tour_seen_orders
tour_seen_delivery
tour_seen_settings
```

All keyed per-browser (not per-tenant). Acceptable for MVP — tenants using a new browser will see tours again, which is fine.

## Files to Create

```
assets/css/driver-theme.css
composables/useTour.ts
composables/tours/useSidebarTour.ts
composables/tours/useDashboardTour.ts
composables/tours/useProductsTour.ts
composables/tours/useOrdersTour.ts
composables/tours/useDeliveryTour.ts
composables/tours/useSettingsTour.ts
components/admin/AdminTourMenu.vue
```

## Files to Modify

```
package.json                          — add driver.js
nuxt.config.ts                        — import driver-theme.css
layouts/admin.vue                     — add AdminTourMenu, call autoStartIfNeeded
pages/admin/index.vue                 — call autoStartIfNeeded('dashboard'), add data-tour attrs
pages/admin/products/index.vue        — call autoStartIfNeeded('products'), add data-tour attrs
pages/admin/orders/index.vue          — call autoStartIfNeeded('orders'), add data-tour attrs
pages/admin/delivery/index.vue        — call autoStartIfNeeded('delivery'), add data-tour attrs
pages/admin/settings/appearance.vue   — call autoStartIfNeeded('settings'), add data-tour attrs
locales/en.json                       — add admin.tours keys
locales/fr.json                       — add admin.tours keys
locales/ar.json                       — add admin.tours keys
pages/admin/onboarding.vue            — trigger sidebar tour after finish()
```

## Acceptance Criteria

1. Sidebar tour auto-launches once after onboarding completes, never again unless relaunched
2. Each section tour auto-launches on first visit to that page
3. Pressing ESC or clicking the close button skips the tour and marks it as seen
4. "Tours & Help" sidebar item opens a panel listing all 6 tours; clicking any starts it immediately
5. All tour text renders correctly in EN, FR, and AR
6. Arabic layout uses RTL tooltip positioning
7. Tour tooltip colors and fonts match the admin theme (light and dark mode)
