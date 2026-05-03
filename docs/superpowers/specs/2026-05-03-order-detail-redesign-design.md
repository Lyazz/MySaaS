# Order Detail Page — Redesign Spec

**Date:** 2026-05-03
**Scope:** `pages/admin/orders/[id].vue` and supporting components
**Goal:** Redesign UI/UX of the admin order detail page, mobile-first, with a desktop layout optimized for power users.

## Context

The current page lives in a single 2530-line file. It serves three personas — phone-based call agents (mobile), operations/dispatch (desktop), and store owners (occasional readers). The dominant flow is **call → confirm**, with editing as an occasional secondary path. Today the page stacks columns on mobile with no sticky controls and no contextual primary action; on desktop it shows a fixed 2/3 + 1/3 grid where the primary action is buried in the sidebar.

## Goals

1. Make the **next best action** (NBA) for the order's current state immediately reachable — one tap on mobile, one click on desktop.
2. Cut vertical scroll on mobile by collapsing low-frequency panels by default.
3. Keep desktop dense and parallel — agents should see items, call panel, and delivery without scrolling.
4. Decompose the monolithic page into focused, testable components.
5. Preserve all current functionality, endpoints, permissions, and i18n keys.

## Non-Goals

- No backend, schema, RBAC, or endpoint changes.
- No new permissions, no new analytics events.
- No new tests beyond manual verification — this is a presentation-layer refactor.
- No new fraud/security logic; the existing placeholder buttons stay placeholders, just relocated.

## Information Architecture

The page has 5 logical zones, ordered by call-agent priority:

1. **Identity strip** — public ID, status pill, customer name, tap-to-call, primary NBA, compact totals (Total · Shipping · Grand total · Items count). Sticky on scroll on both mobile and desktop.
2. **Call panel** — call-status pills (Not called / Called / No answer / Attempt 1-3 / Switched off), tap-to-call, copy phone, internal notes textarea (auto-save). Expanded by default for PENDING orders on mobile.
3. **Items panel** — line items with thumbnails, qty, line totals, totals breakdown. Inline edit toggle. Collapsible on mobile, expanded on tablet+.
4. **Delivery & customer panel** — single card with two stacked sub-sections: address (name, phone, address) and delivery (provider, mode, wilaya, commune, pickup point, shipping fee). Inline edit toggle.
5. **Operational** (collapsed by default) — shipments timeline, audit trail (created/updated), security & fraud actions.

## Next Best Action (NBA) — State Machine

A single computed primary CTA based on order state. Implemented as a pure composable `useOrderNBA(order)` returning `{ primary: { label, icon, action }, secondary: [...] }`.

| State | Primary CTA | Secondary CTAs |
|---|---|---|
| PENDING + callStatus=not_called | **Call customer** (`tel:` link) | Edit, Cancel |
| PENDING + callStatus=called | **Confirm order** | Reschedule, Edit, Cancel |
| PENDING + callStatus=no_answer / attempt_* | **Mark next attempt** | Confirm anyway, Cancel |
| CONFIRMED, no shipment | **Push to {provider}** (or "Choose provider" if none) | Print bordereau, Edit |
| CONFIRMED, shipment created | **Print bordereau** | Track shipment |
| SHIPPED | (locked) Track shipment | View shipment |
| DELIVERED | **View sale** | Print bordereau |
| CANCELLED / RETURNED | (no primary) | Reopen, View history |

When status is carrier-controlled (Maystro lock), the dropdown shows an inline amber note: "Status managed by Maystro." The primary CTA still renders the next reasonable action (e.g. Track shipment) instead of disabling.

The NBA renders in:
- **Desktop:** top-right of the sticky identity strip — a single primary button with a chevron dropdown for secondary actions.
- **Mobile:** sticky bottom action bar (full-width primary button + overflow `⋯` menu), with `safe-area-inset-bottom` padding.

## Layout

### Mobile (<768px)

Single column. Sticky identity strip at top, sticky NBA bar at bottom.

```
┌─────────────────────────┐
│ ← #ABCD12  [PENDING]    │  ← sticky header
│ Yazid · 0555… 📞 📋     │
├─────────────────────────┤
│  📞 CALL PANEL          │  ← expanded for PENDING
│  [Not called] pills…    │
│  Notes: ____________    │
├─────────────────────────┤
│  📦 Items (3) ▾         │  ← collapsible
├─────────────────────────┤
│  🚚 Delivery & Address ▾│  ← collapsible
├─────────────────────────┤
│  ⚙ More ▾               │  ← shipments, audit, fraud
└─────────────────────────┘
│ [📞 Call customer]  ⋯   │  ← sticky bottom bar
└─────────────────────────┘
```

### Tablet (768–1023px)

Single column, but sidebar cards adopt internal 2-column grids where helpful (e.g. delivery info dl pairs).

### Desktop (≥1024px)

Two-pane workspace, 8/12 + 4/12. At 2xl, bumps to 9/12 + 3/12 with denser sidebar typography.

```
┌──────────────────────────────────────────────────────────────┐
│ #ABCD12 [PENDING]  Yazid · 0555…   [📞 Call customer ▾] [⋯] │  ← sticky
├─────────────────────────────────┬────────────────────────────┤
│  Items                          │  Call & Notes              │
│  ┌─ thumb  title  qty  total ─┐ │  [pills]                   │
│  │ …                          │ │  textarea                  │
│  └────────────────────────────┘ ├────────────────────────────┤
│  Subtotal / Shipping / Total    │  Delivery & Customer       │
│                                 │  provider / mode / wilaya  │
│                                 │  address / phone           │
│                                 ├────────────────────────────┤
│                                 │  Shipments timeline        │
│                                 ├────────────────────────────┤
│                                 │  Audit / Security ▾        │
└─────────────────────────────────┴────────────────────────────┘
```

## Visual System

- **Tokens:** reuse existing `--surface-1/2/3`, `--brand`, `--brand-rgb`, `--text-primary/secondary/tertiary`, `--surface-border`. No new color system.
- **Component classes:** reuse `ui-card`, `ui-card-header`, `ui-card-body`, `ui-btn`, `ui-btn--primary/secondary/danger/ghost`, `ui-badge--*`. No new global classes.
- **Status anchor:** 4px left-border accent on the identity card colored by status (amber=PENDING, indigo=CONFIRMED, teal=SHIPPED, emerald=DELIVERED, red=CANCELLED, slate=RETURNED). Reuses the existing badge tone palette via the same CSS variables.
- **Density:** the four big KPI tiles (Total / Shipping / With delivery / Items) collapse into a single horizontal totals strip in the identity card, separated by middle dots. Saves ~80px of vertical real estate on mobile.
- **Iconography:** Lucide (already in use). Each section header has a 16px icon for scannability.
- **Motion:** 200ms ease-out height transition for collapse/expand. The NBA button has a subtle 1.5s pulse on PENDING + callStatus=not_called to draw the eye; respects `prefers-reduced-motion`.
- **RTL:** layout mirrors via the existing `:dir(rtl)` rules. Phone numbers and order IDs keep `dir="ltr"`.
- **Dark mode:** already supported by tokens. Verify left-border accent colors remain legible in dark mode.

## Component Decomposition

Extract from `pages/admin/orders/[id].vue` into focused components under `components/admin/orders/`:

| File | Responsibility |
|---|---|
| `OrderDetailHeader.vue` | Identity strip: public ID, status badge with left accent, customer name, tap-to-call, totals strip, NBA slot. |
| `OrderDetailNBA.vue` | Primary action button + secondary dropdown. Receives `{ primary, secondary }` from `useOrderNBA`. |
| `OrderDetailCallPanel.vue` | Call status pills (radio-group semantics), tap-to-call link, internal notes textarea with debounced auto-save. |
| `OrderDetailItems.vue` | Read mode — line items list/table, totals breakdown. Emits `edit` event. |
| `OrderDetailItemsEditor.vue` | Edit mode — product search, cart, variant selector modal hook. Existing logic moved here. |
| `OrderDetailDelivery.vue` | Read mode — provider, mode, wilaya/commune, pickup point, shipping fee. Emits `edit`. |
| `OrderDetailDeliveryEditor.vue` | Edit mode — provider/mode/wilaya/commune form (existing logic moved here, including Maystro pickup-point flow). |
| `OrderDetailCustomer.vue` | Read mode — name, phone, address with copy buttons. Inline edit form for name/phone/address. |
| `OrderDetailShipments.vue` | Shipments timeline (list of `order.shipments`), retry-Maystro button when applicable. |
| `OrderDetailFraud.vue` | Blacklist placeholder buttons (customer/IP/phone). Collapsed by default. |
| `OrderDetailMobileBar.vue` | Sticky bottom bar (mobile only) — primary CTA + overflow menu. |
| `composables/useOrderDetail.ts` | Fetch order, all mutation calls (status, callStatus, notes, items, customer, delivery, delete, retryMaystro). Owns `loading`, `updating`, `order`, error/success state. |
| `composables/useOrderNBA.ts` | Pure function. Input: `Order`. Output: `{ primary, secondary[] }` per the state machine table. No side effects. |

The page file `pages/admin/orders/[id].vue` becomes a thin layout shell (~150 lines): mounts `useOrderDetail`, composes components, hosts modals (`AdminConfirmModal`, `DeliveryPaymentModal`, `VariantSelectorModal`).

## Behavior

### Edit modes are scoped, not global

Today a single `editing` flag swaps both items and customer panels. New design: each panel owns its own edit toggle. Editing items does not enable customer editing, and vice versa. Reduces accidental changes and clarifies save/cancel scope.

### Tap-to-call is ubiquitous

Phone number is a `tel:` link in three locations: header, call panel, customer card. On mobile this opens the dialer. On desktop, the link still uses `tel:` (browsers handle it) and a copy button is always adjacent.

### Internal notes auto-save

Replace the explicit "save notes" button with a debounced 800ms save on input. Small "Saved ✓" indicator appears next to the field for 2s after each successful save. Existing endpoint reused.

### Keyboard shortcuts (desktop only)

- `C` — focus call panel (set call status quickly)
- `E` — toggle items edit
- `Enter` — trigger primary NBA (when no input is focused)
- `?` — show shortcuts overlay

Listener registered on the page; no shortcuts fire when an input/textarea/select is focused or a modal is open.

### Optimistic updates

Status and call-status changes update the UI immediately and roll back with a toast on error. Notes auto-save is also optimistic.

### Carrier-locked status

When `statusLocked` is true (Maystro-managed), the NBA's primary action remains useful (e.g. "Track shipment" or "Print bordereau") rather than rendering a disabled "Update status" button. The dropdown shows an inline amber note explaining the lock.

### Mobile bottom bar safety

Bottom bar uses `padding-bottom: env(safe-area-inset-bottom)` so it clears the iOS home indicator. It hides when any modal is open.

## What Stays the Same

- All Prisma queries, backend endpoints, RBAC middleware, tenant isolation.
- All existing i18n keys; new keys added under `admin.pages.orders.detail.*` (e.g. `nba.callCustomer`, `nba.confirm`, `nba.pushTo`, `shortcuts.title`).
- Existing modals (`AdminConfirmModal`, `DeliveryPaymentModal`, variant selector) reused as-is.
- Existing UI classes (`ui-card`, `ui-btn`, `ui-badge`, `ui-table`, `ui-label`).
- All current functionality preserved: variant selection, Maystro retry, delete, edit items, edit customer, print bordereau, view sale, blacklist placeholders.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Sticky bottom bar may overlap content on short screens. | Page body gets `padding-bottom` equal to bar height + safe area. |
| NBA state machine may miss edge cases (e.g. partially shipped, cancelled-after-confirmed). | `useOrderNBA` is a pure function — easy to extend. Default fallback when no rule matches: show "Update status" with the existing dropdown. |
| Decomposition breaks subtle coupling between items-edit and customer-edit. | Migrate one panel at a time. Verify the existing inline-customer-edit flow still works after items extraction before touching it. |
| Auto-save notes could fire too often on slow networks. | 800ms debounce + cancel on unmount. Single in-flight request; subsequent edits queue. |
| RTL layout regressions for the new sticky bars and totals strip. | Verify Arabic locale manually; existing layout primitives already RTL-aware. |

## Acceptance Criteria

- All flows that work today still work: status update, call-status update, edit items (incl. variant selection), edit customer, edit delivery (incl. Maystro pickup points), delete, retry Maystro, print bordereau, view sale.
- Mobile (390×844): primary action reachable without scrolling on PENDING orders. No horizontal scroll. Bottom bar visible above iOS home indicator.
- Desktop (1440×900): items + sidebar (call/delivery/customer) all visible without scrolling for a typical order. Sticky header remains visible during scroll.
- Tablet (768×1024): no broken layouts; collapsible sections work.
- Dark mode and RTL both render correctly.
- Page file under 200 lines after extraction.
- No new lint or typecheck errors.

## Open Questions

None — direction confirmed by user before writing this spec.
