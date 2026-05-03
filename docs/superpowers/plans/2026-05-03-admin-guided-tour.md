# Admin Guided Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive guided tour to the tenant admin panel using driver.js, covering 6 sections with auto-launch on first visit, relaunch from sidebar, and full EN/FR/AR (RTL) support.

**Architecture:** Central `useTour` composable holds a registry of 6 tours and manages active-tour state; each tour's steps live in a dedicated composable in `composables/tours/`; `AdminTourMenu.vue` renders in the sidebar for manual relaunch; pages call `autoStartIfNeeded(id)` in `onMounted`.

**Tech Stack:** driver.js v1.x, Nuxt 3 Vue 3 composables, @nuxtjs/i18n, Tailwind CSS, existing CSS variables

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` | Modify | Add driver.js dependency |
| `nuxt.config.ts` | Modify | Add driver.js CSS + driver-theme.css to css array |
| `assets/css/driver-theme.css` | Create | Theme overrides using existing CSS variables |
| `composables/useTour.ts` | Create | Tour registry, startTour, autoStartIfNeeded |
| `composables/tours/useSidebarTour.ts` | Create | Sidebar navigation tour steps |
| `composables/tours/useDashboardTour.ts` | Create | Dashboard tour steps |
| `composables/tours/useProductsTour.ts` | Create | Products tour steps |
| `composables/tours/useOrdersTour.ts` | Create | Orders tour steps |
| `composables/tours/useDeliveryTour.ts` | Create | Delivery tour steps |
| `composables/tours/useSettingsTour.ts` | Create | Settings tour steps |
| `components/admin/AdminTourMenu.vue` | Create | Sidebar "Tours & Help" panel |
| `layouts/admin.vue` | Modify | Add AdminTourMenu above user area |
| `pages/admin/index.vue` | Modify | Add data-tour attrs + autoStartIfNeeded('sidebar') |
| `pages/admin/products/index.vue` | Modify | Add data-tour attrs + autoStartIfNeeded('products') |
| `pages/admin/orders/index.vue` | Modify | Add data-tour attrs + autoStartIfNeeded('orders') |
| `pages/admin/delivery/index.vue` | Modify | Add data-tour attrs + autoStartIfNeeded('delivery') |
| `pages/admin/settings/appearance.vue` | Modify | Add data-tour attrs + autoStartIfNeeded('settings') |
| `pages/admin/onboarding.vue` | Modify | Set tour_pending_sidebar flag on finish |
| `locales/en.json` | Modify | Add admin.tours keys |
| `locales/fr.json` | Modify | Add admin.tours keys |
| `locales/ar.json` | Modify | Add admin.tours keys |

---

## Task 1: Install driver.js and set up CSS

**Files:**
- Modify: `package.json`
- Modify: `nuxt.config.ts`
- Create: `assets/css/driver-theme.css`

- [ ] **Step 1: Install driver.js**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS/.claude/worktrees/relaxed-ellis-ed3361"
npm install driver.js
```

Expected: `+ driver.js@1.x.x` in output, no errors.

- [ ] **Step 2: Create driver-theme.css**

Create `assets/css/driver-theme.css`:

```css
/* Override driver.js styles to match admin theme */
.driver-popover {
  background-color: var(--surface-1) !important;
  border: 1px solid var(--surface-border) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.24) !important;
  font-family: 'DM Sans', system-ui, sans-serif !important;
  max-width: 340px !important;
}

.driver-popover-title {
  color: var(--text-primary) !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  margin-bottom: 6px !important;
}

.driver-popover-description {
  color: var(--text-secondary) !important;
  font-size: 13px !important;
  line-height: 1.5 !important;
}

.driver-popover-footer {
  margin-top: 14px !important;
  gap: 8px !important;
}

.driver-popover-next-btn {
  background-color: var(--brand) !important;
  color: #05070A !important;
  border: none !important;
  border-radius: 8px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  padding: 6px 14px !important;
}

.driver-popover-next-btn:hover {
  opacity: 0.88 !important;
}

.driver-popover-prev-btn {
  background: var(--surface-3) !important;
  color: var(--text-secondary) !important;
  border: 1px solid var(--surface-border) !important;
  border-radius: 8px !important;
  font-size: 12px !important;
  padding: 6px 14px !important;
}

.driver-popover-prev-btn:hover {
  color: var(--text-primary) !important;
}

.driver-popover-close-btn {
  color: var(--text-muted) !important;
  font-size: 18px !important;
}

.driver-popover-close-btn:hover {
  color: var(--text-primary) !important;
}

.driver-popover-progress-text {
  color: var(--text-muted) !important;
  font-size: 11px !important;
}

/* Arrow inherits popover bg */
.driver-popover-arrow-side-left.driver-popover-arrow::before {
  border-right-color: var(--surface-1) !important;
}
.driver-popover-arrow-side-right.driver-popover-arrow::before {
  border-left-color: var(--surface-1) !important;
}
.driver-popover-arrow-side-top.driver-popover-arrow::before {
  border-bottom-color: var(--surface-1) !important;
}
.driver-popover-arrow-side-bottom.driver-popover-arrow::before {
  border-top-color: var(--surface-1) !important;
}
```

- [ ] **Step 3: Add CSS files to nuxt.config.ts**

In `nuxt.config.ts`, find the `css` array (currently `['~/assets/css/main.css']`) and replace it:

```typescript
css: [
  '~/assets/css/main.css',
  'driver.js/dist/driver.css',
  '~/assets/css/driver-theme.css',
],
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS/.claude/worktrees/relaxed-ellis-ed3361"
git add package.json package-lock.json nuxt.config.ts assets/css/driver-theme.css
git commit -m "feat(tour): install driver.js and add CSS theme"
```

---

## Task 2: Create useTour.ts central composable

**Files:**
- Create: `composables/useTour.ts`

- [ ] **Step 1: Create composables/useTour.ts**

```typescript
// composables/useTour.ts
import type { DriveStep } from 'driver.js'

export interface TourDef {
  id: string
  labelKey: string
  icon: string
  getSteps: (t: (k: string) => string) => DriveStep[]
}

// Module-level singleton so active state is shared across all component instances
const activeTourId = ref<string | null>(null)

export function useTour() {
  const { t } = useI18n({ useScope: 'global' })

  // Populated lazily so i18n is available when tours are registered
  let _registry: TourDef[] | null = null

  function getRegistry(): TourDef[] {
    if (_registry) return _registry
    // Import step definitions inline to avoid circular deps
    const { getSidebarSteps } = useSidebarTour()
    const { getDashboardSteps } = useDashboardTour()
    const { getProductsSteps } = useProductsTour()
    const { getOrdersSteps } = useOrdersTour()
    const { getDeliverySteps } = useDeliveryTour()
    const { getSettingsSteps } = useSettingsTour()

    _registry = [
      { id: 'sidebar',   labelKey: 'admin.tours.sidebar.label',   icon: 'lucide:layout-dashboard', getSteps: getSidebarSteps },
      { id: 'dashboard', labelKey: 'admin.tours.dashboard.label', icon: 'lucide:bar-chart-2',      getSteps: getDashboardSteps },
      { id: 'products',  labelKey: 'admin.tours.products.label',  icon: 'lucide:package',          getSteps: getProductsSteps },
      { id: 'orders',    labelKey: 'admin.tours.orders.label',    icon: 'lucide:shopping-bag',     getSteps: getOrdersSteps },
      { id: 'delivery',  labelKey: 'admin.tours.delivery.label',  icon: 'lucide:truck',            getSteps: getDeliverySteps },
      { id: 'settings',  labelKey: 'admin.tours.settings.label',  icon: 'lucide:sliders',          getSteps: getSettingsSteps },
    ]
    return _registry
  }

  async function startTour(id: string, { force = false } = {}) {
    if (!import.meta.client) return
    if (activeTourId.value && !force) return

    const def = getRegistry().find(d => d.id === id)
    if (!def) return

    const { driver } = await import('driver.js')

    // If another tour is running, destroy it first
    activeTourId.value = id

    const driverObj = driver({
      showProgress: true,
      stagePadding: 6,
      nextBtnText: t('admin.tours.next'),
      prevBtnText: t('admin.tours.prev'),
      doneBtnText: t('admin.tours.done'),
      onDestroyStarted: () => {
        driverObj.destroy()
      },
      onDestroyed: () => {
        activeTourId.value = null
        if (import.meta.client) {
          localStorage.setItem(`tour_seen_${id}`, '1')
        }
        // Chain: after sidebar tour completes, auto-start dashboard tour
        if (id === 'sidebar') {
          autoStartIfNeeded('dashboard')
        }
      },
      steps: def.getSteps(t),
    })

    driverObj.drive()
  }

  function autoStartIfNeeded(id: string) {
    if (!import.meta.client) return
    if (activeTourId.value) return
    if (localStorage.getItem(`tour_seen_${id}`)) return
    // Small delay lets DOM elements render before tour targets them
    setTimeout(() => startTour(id), 600)
  }

  const tours = computed(() =>
    getRegistry().map(d => ({
      id: d.id,
      label: t(d.labelKey),
      icon: d.icon,
    }))
  )

  return { tours, activeTourId, startTour, autoStartIfNeeded }
}
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS/.claude/worktrees/relaxed-ellis-ed3361"
git add composables/useTour.ts
git commit -m "feat(tour): add useTour composable with registry and auto-start logic"
```

---

## Task 3: Create per-section tour step composables

**Files:**
- Create: `composables/tours/useSidebarTour.ts`
- Create: `composables/tours/useDashboardTour.ts`
- Create: `composables/tours/useProductsTour.ts`
- Create: `composables/tours/useOrdersTour.ts`
- Create: `composables/tours/useDeliveryTour.ts`
- Create: `composables/tours/useSettingsTour.ts`

- [ ] **Step 1: Create composables/tours/useSidebarTour.ts**

```typescript
// composables/tours/useSidebarTour.ts
import type { DriveStep } from 'driver.js'

export function useSidebarTour() {
  function getSidebarSteps(t: (k: string) => string): DriveStep[] {
    return [
      {
        element: '[data-tour="sidebar-logo"]',
        popover: {
          title: t('admin.tours.sidebar.steps.logo.title'),
          description: t('admin.tours.sidebar.steps.logo.desc'),
          side: 'right',
        },
      },
      {
        element: '[data-tour="sidebar-dashboard"]',
        popover: {
          title: t('admin.tours.sidebar.steps.dashboard.title'),
          description: t('admin.tours.sidebar.steps.dashboard.desc'),
          side: 'right',
        },
      },
      {
        element: '[data-tour="sidebar-products"]',
        popover: {
          title: t('admin.tours.sidebar.steps.products.title'),
          description: t('admin.tours.sidebar.steps.products.desc'),
          side: 'right',
        },
      },
      {
        element: '[data-tour="sidebar-orders"]',
        popover: {
          title: t('admin.tours.sidebar.steps.orders.title'),
          description: t('admin.tours.sidebar.steps.orders.desc'),
          side: 'right',
        },
      },
      {
        element: '[data-tour="sidebar-delivery"]',
        popover: {
          title: t('admin.tours.sidebar.steps.delivery.title'),
          description: t('admin.tours.sidebar.steps.delivery.desc'),
          side: 'right',
        },
      },
      {
        element: '[data-tour="sidebar-settings"]',
        popover: {
          title: t('admin.tours.sidebar.steps.settings.title'),
          description: t('admin.tours.sidebar.steps.settings.desc'),
          side: 'right',
        },
      },
      {
        element: '[data-tour="sidebar-tour-menu"]',
        popover: {
          title: t('admin.tours.sidebar.steps.help.title'),
          description: t('admin.tours.sidebar.steps.help.desc'),
          side: 'right',
        },
      },
    ]
  }
  return { getSidebarSteps }
}
```

- [ ] **Step 2: Create composables/tours/useDashboardTour.ts**

```typescript
// composables/tours/useDashboardTour.ts
import type { DriveStep } from 'driver.js'

export function useDashboardTour() {
  function getDashboardSteps(t: (k: string) => string): DriveStep[] {
    return [
      {
        element: '[data-tour="dashboard-stats"]',
        popover: {
          title: t('admin.tours.dashboard.steps.stats.title'),
          description: t('admin.tours.dashboard.steps.stats.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="dashboard-checklist"]',
        popover: {
          title: t('admin.tours.dashboard.steps.checklist.title'),
          description: t('admin.tours.dashboard.steps.checklist.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="dashboard-chart"]',
        popover: {
          title: t('admin.tours.dashboard.steps.chart.title'),
          description: t('admin.tours.dashboard.steps.chart.desc'),
          side: 'top',
        },
      },
    ]
  }
  return { getDashboardSteps }
}
```

- [ ] **Step 3: Create composables/tours/useProductsTour.ts**

```typescript
// composables/tours/useProductsTour.ts
import type { DriveStep } from 'driver.js'

export function useProductsTour() {
  function getProductsSteps(t: (k: string) => string): DriveStep[] {
    return [
      {
        element: '[data-tour="products-create-btn"]',
        popover: {
          title: t('admin.tours.products.steps.create.title'),
          description: t('admin.tours.products.steps.create.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="products-search"]',
        popover: {
          title: t('admin.tours.products.steps.search.title'),
          description: t('admin.tours.products.steps.search.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="products-table"]',
        popover: {
          title: t('admin.tours.products.steps.table.title'),
          description: t('admin.tours.products.steps.table.desc'),
          side: 'top',
        },
      },
    ]
  }
  return { getProductsSteps }
}
```

- [ ] **Step 4: Create composables/tours/useOrdersTour.ts**

```typescript
// composables/tours/useOrdersTour.ts
import type { DriveStep } from 'driver.js'

export function useOrdersTour() {
  function getOrdersSteps(t: (k: string) => string): DriveStep[] {
    return [
      {
        element: '[data-tour="orders-tabs"]',
        popover: {
          title: t('admin.tours.orders.steps.tabs.title'),
          description: t('admin.tours.orders.steps.tabs.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="orders-export"]',
        popover: {
          title: t('admin.tours.orders.steps.export.title'),
          description: t('admin.tours.orders.steps.export.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="orders-table"]',
        popover: {
          title: t('admin.tours.orders.steps.table.title'),
          description: t('admin.tours.orders.steps.table.desc'),
          side: 'top',
        },
      },
    ]
  }
  return { getOrdersSteps }
}
```

- [ ] **Step 5: Create composables/tours/useDeliveryTour.ts**

```typescript
// composables/tours/useDeliveryTour.ts
import type { DriveStep } from 'driver.js'

export function useDeliveryTour() {
  function getDeliverySteps(t: (k: string) => string): DriveStep[] {
    return [
      {
        element: '[data-tour="delivery-providers"]',
        popover: {
          title: t('admin.tours.delivery.steps.providers.title'),
          description: t('admin.tours.delivery.steps.providers.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="delivery-config"]',
        popover: {
          title: t('admin.tours.delivery.steps.config.title'),
          description: t('admin.tours.delivery.steps.config.desc'),
          side: 'top',
        },
      },
    ]
  }
  return { getDeliverySteps }
}
```

- [ ] **Step 6: Create composables/tours/useSettingsTour.ts**

```typescript
// composables/tours/useSettingsTour.ts
import type { DriveStep } from 'driver.js'

export function useSettingsTour() {
  function getSettingsSteps(t: (k: string) => string): DriveStep[] {
    return [
      {
        element: '[data-tour="settings-appearance-tab"]',
        popover: {
          title: t('admin.tours.settings.steps.appearance.title'),
          description: t('admin.tours.settings.steps.appearance.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="settings-template"]',
        popover: {
          title: t('admin.tours.settings.steps.template.title'),
          description: t('admin.tours.settings.steps.template.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="settings-color"]',
        popover: {
          title: t('admin.tours.settings.steps.color.title'),
          description: t('admin.tours.settings.steps.color.desc'),
          side: 'bottom',
        },
      },
    ]
  }
  return { getSettingsSteps }
}
```

- [ ] **Step 7: Commit**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS/.claude/worktrees/relaxed-ellis-ed3361"
git add composables/tours/
git commit -m "feat(tour): add per-section tour step composables"
```

---

## Task 4: Create AdminTourMenu.vue

**Files:**
- Create: `components/admin/AdminTourMenu.vue`

- [ ] **Step 1: Create components/admin/AdminTourMenu.vue**

```vue
<!-- components/admin/AdminTourMenu.vue -->
<template>
  <div data-tour="sidebar-tour-menu" class="shrink-0 px-2 pb-1">
    <!-- Collapsed: icon button -->
    <button
      v-if="!sidebarOpen"
      type="button"
      class="w-full flex items-center justify-center p-2 rounded-lg transition-colors"
      style="color: var(--text-muted)"
      :title="t('admin.tours.menuLabel')"
      @mouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'"
      @mouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'"
      @click="open = !open"
    >
      <Icon name="lucide:help-circle" class="w-4.5 h-4.5" />
    </button>

    <!-- Expanded: label button -->
    <button
      v-else
      type="button"
      class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left"
      style="color: var(--text-muted)"
      @mouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'"
      @mouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'"
      @click="open = !open"
    >
      <Icon name="lucide:help-circle" class="w-4 h-4 shrink-0" />
      <span class="text-[12px] font-medium flex-1 truncate">{{ t('admin.tours.menuLabel') }}</span>
      <Icon :name="open ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="w-3.5 h-3.5 shrink-0" />
    </button>

    <!-- Tour list (expanded state only) -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div v-if="open && sidebarOpen" class="mt-1 space-y-px">
        <button
          v-for="tour in tours"
          :key="tour.id"
          type="button"
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors group"
          style="color: var(--text-secondary)"
          @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }"
          @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }"
          @click="launch(tour.id)"
        >
          <Icon :name="tour.icon" class="w-3.5 h-3.5 shrink-0" />
          <span class="text-[11.5px] flex-1 truncate">{{ tour.label }}</span>
          <Icon name="lucide:play" class="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style="color: var(--brand)" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ sidebarOpen: boolean }>()

const { t } = useI18n({ useScope: 'global' })
const { tours, startTour } = useTour()

const open = ref(false)

function launch(id: string) {
  open.value = false
  startTour(id, { force: true })
}

// Close when sidebar collapses
watch(() => props.sidebarOpen, (val) => {
  if (!val) open.value = false
})
</script>
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS/.claude/worktrees/relaxed-ellis-ed3361"
git add components/admin/AdminTourMenu.vue
git commit -m "feat(tour): add AdminTourMenu sidebar component"
```

---

## Task 5: Wire AdminTourMenu into admin layout + add sidebar data-tour attrs

**Files:**
- Modify: `layouts/admin.vue`

- [ ] **Step 1: Add data-tour attrs to sidebar nav items**

In `layouts/admin.vue`, find the sidebar logo area (around line 22-50). Add `data-tour="sidebar-logo"` to the logo wrapper div:

Find:
```html
<div
  class="h-[52px] flex items-center shrink-0 overflow-hidden"
  :class="sidebarOpen ? 'px-3 gap-2.5' : 'justify-center px-0 gap-0'"
  style="border-bottom: 1px solid var(--admin-sidebar-border)"
>
```

Replace with:
```html
<div
  data-tour="sidebar-logo"
  class="h-[52px] flex items-center shrink-0 overflow-hidden"
  :class="sidebarOpen ? 'px-3 gap-2.5' : 'justify-center px-0 gap-0'"
  style="border-bottom: 1px solid var(--admin-sidebar-border)"
>
```

- [ ] **Step 2: Add data-tour attrs to key nav links**

In the nav section of `layouts/admin.vue`, find the `<NuxtLink` that renders nav items. These are inside the `v-for` loop. Add `data-tour` attributes by finding specific nav link paths.

Find the section that renders nav links (search for `NuxtLink` inside the nav loop). After the closing `</div>` of the nav groups loop (around line 120-122) and before the user section (line 124), add hidden anchor elements for tour targeting:

Find:
```html
      </nav>

      <!-- User -->
```

Replace with:
```html
      </nav>

      <!-- Tour anchor points (invisible, used by guided tour) -->
      <div class="hidden">
        <span data-tour="sidebar-dashboard" />
        <span data-tour="sidebar-products" />
        <span data-tour="sidebar-orders" />
        <span data-tour="sidebar-delivery" />
        <span data-tour="sidebar-settings" />
      </div>

      <!-- Tour Menu -->
      <AdminTourMenu :sidebar-open="sidebarOpen" />

      <!-- User -->
```

> **Note:** Using hidden anchor spans avoids duplicating the complex NuxtLink markup. Driver.js will highlight the sidebar area. If you want the tour to highlight specific nav items, change the `data-tour` attributes to be on actual nav links by finding `item.path === '/admin'` etc. in the loop and adding `:data-tour="item.path === '/admin' ? 'sidebar-dashboard' : undefined"` to the NuxtLink.

- [ ] **Step 3: Better approach — add data-tour directly to nav links**

In `layouts/admin.vue`, find the NuxtLink rendering inside the nav loop:

```html
            <NuxtLink
```

The nav items are rendered with `v-for="item in entry.items"`. Add a data-tour mapping. Find where the NuxtLink starts (around line 85-90) and add `:data-tour` binding:

Find the NuxtLink in the nav items loop. It should look like:
```html
<NuxtLink
  :to="item.path"
```

Add the data-tour attribute to the same element. Since each item has a unique `item.path`, use a computed map. Add this before the closing `</script>` tag in admin.vue:

```typescript
const navTourIds: Record<string, string> = {
  '/admin': 'sidebar-dashboard',
  '/admin/products': 'sidebar-products',
  '/admin/orders': 'sidebar-orders',
  '/admin/delivery': 'sidebar-delivery',
  '/admin/settings/appearance': 'sidebar-settings',
}
```

Then on the NuxtLink element, add: `:data-tour="navTourIds[item.path]"`

Remove the hidden anchor spans from Step 2 — the direct approach is cleaner.

- [ ] **Step 4: Remove hidden spans and import AdminTourMenu**

Ensure the layout imports `AdminTourMenu` (Nuxt auto-imports components, so no explicit import needed). The component is already in `components/admin/AdminTourMenu.vue`.

Double-check that the template now has `<AdminTourMenu :sidebar-open="sidebarOpen" />` between the nav closing tag and the User section.

- [ ] **Step 5: Commit**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS/.claude/worktrees/relaxed-ellis-ed3361"
git add layouts/admin.vue
git commit -m "feat(tour): wire AdminTourMenu into sidebar + add nav data-tour attrs"
```

---

## Task 6: Add i18n keys for all tours (EN, FR, AR)

**Files:**
- Modify: `locales/en.json`
- Modify: `locales/fr.json`
- Modify: `locales/ar.json`

- [ ] **Step 1: Add EN tour keys**

Open `locales/en.json`. Find the `"admin"` object. Inside it, add a `"tours"` key (alongside existing `"pages"`, `"nav"`, etc.):

```json
"tours": {
  "next": "Next",
  "prev": "Back",
  "done": "Done",
  "menuLabel": "Tours & Help",
  "sidebar": {
    "label": "Admin overview",
    "steps": {
      "logo":      { "title": "Your store", "desc": "This is your store name and logo. You can change them in Appearance settings." },
      "dashboard": { "title": "Dashboard", "desc": "Get a quick overview of your sales, orders, and revenue at a glance." },
      "products":  { "title": "Products", "desc": "Add and manage everything you sell — products, prices, images, and stock." },
      "orders":    { "title": "Orders", "desc": "Track every customer order from new to delivered. Update statuses and export reports." },
      "delivery":  { "title": "Delivery", "desc": "Connect Yalidine, Maystro, or manage your own delivery. Set up zones and rates here." },
      "settings":  { "title": "Settings", "desc": "Customize your store's look, contact details, language, and go live when ready." },
      "help":      { "title": "Tours & Help", "desc": "Click here anytime to relaunch this tour or start a tour for a specific section." }
    }
  },
  "dashboard": {
    "label": "Dashboard tour",
    "steps": {
      "stats":     { "title": "Your metrics", "desc": "See total orders, revenue, and new customers for the selected period." },
      "checklist": { "title": "Launch checklist", "desc": "Complete these steps to get your store fully ready. You can dismiss it once done." },
      "chart":     { "title": "Sales trend", "desc": "This chart shows your sales volume over time so you can spot patterns." }
    }
  },
  "products": {
    "label": "Products tour",
    "steps": {
      "create": { "title": "Add a product", "desc": "Click here to create a new product. Add a name, price, images, and stock." },
      "search": { "title": "Find products", "desc": "Search by name, filter by category or status to quickly locate any product." },
      "table":  { "title": "Product list", "desc": "All your products are listed here. Click any row to edit it." }
    }
  },
  "orders": {
    "label": "Orders tour",
    "steps": {
      "tabs":   { "title": "Filter by status", "desc": "Switch between All, Pending, Confirmed, Shipped, Delivered, and Cancelled orders." },
      "export": { "title": "Export orders", "desc": "Export your orders to Excel or Google Sheets for reporting and accounting." },
      "table":  { "title": "Order list", "desc": "Each row is a customer order. Click it to see details, update status, or print a receipt." }
    }
  },
  "delivery": {
    "label": "Delivery tour",
    "steps": {
      "providers": { "title": "Delivery partners", "desc": "Choose Yalidine, Maystro, or self-managed delivery. You can enable multiple at once." },
      "config":    { "title": "Provider settings", "desc": "Enter your API credentials and configure fees, zones, and pickup options." }
    }
  },
  "settings": {
    "label": "Settings tour",
    "steps": {
      "appearance": { "title": "Appearance", "desc": "Change your store template, brand color, and logo to match your identity." },
      "template":   { "title": "Store template", "desc": "Pick from 10 storefront themes. Each has a unique layout tailored to a product type." },
      "color":      { "title": "Brand color", "desc": "Your brand color is used on buttons and accents across your entire storefront." }
    }
  }
}
```

- [ ] **Step 2: Add FR tour keys**

Open `locales/fr.json`. Find the `"admin"` object. Add the `"tours"` key:

```json
"tours": {
  "next": "Suivant",
  "prev": "Retour",
  "done": "Terminer",
  "menuLabel": "Visites guidées",
  "sidebar": {
    "label": "Présentation de l'admin",
    "steps": {
      "logo":      { "title": "Votre boutique", "desc": "Voici le nom et le logo de votre boutique. Modifiez-les dans les paramètres d'apparence." },
      "dashboard": { "title": "Tableau de bord", "desc": "Obtenez un aperçu rapide de vos ventes, commandes et chiffre d'affaires." },
      "products":  { "title": "Produits", "desc": "Ajoutez et gérez tout ce que vous vendez — produits, prix, images et stock." },
      "orders":    { "title": "Commandes", "desc": "Suivez chaque commande de la réception à la livraison. Mettez à jour les statuts et exportez des rapports." },
      "delivery":  { "title": "Livraison", "desc": "Connectez Yalidine, Maystro ou gérez votre propre livraison. Configurez les zones et tarifs ici." },
      "settings":  { "title": "Paramètres", "desc": "Personnalisez l'apparence, les coordonnées, la langue de votre boutique et publiez-la quand vous êtes prêt." },
      "help":      { "title": "Visites guidées", "desc": "Cliquez ici à tout moment pour relancer cette visite ou démarrer une visite d'une section spécifique." }
    }
  },
  "dashboard": {
    "label": "Visite du tableau de bord",
    "steps": {
      "stats":     { "title": "Vos indicateurs", "desc": "Consultez le total des commandes, le chiffre d'affaires et les nouveaux clients pour la période sélectionnée." },
      "checklist": { "title": "Liste de lancement", "desc": "Complétez ces étapes pour préparer votre boutique. Vous pouvez la masquer une fois terminé." },
      "chart":     { "title": "Tendance des ventes", "desc": "Ce graphique montre l'évolution de vos ventes dans le temps." }
    }
  },
  "products": {
    "label": "Visite des produits",
    "steps": {
      "create": { "title": "Ajouter un produit", "desc": "Cliquez ici pour créer un nouveau produit. Ajoutez un nom, un prix, des images et du stock." },
      "search": { "title": "Trouver des produits", "desc": "Recherchez par nom, filtrez par catégorie ou statut pour trouver rapidement un produit." },
      "table":  { "title": "Liste des produits", "desc": "Tous vos produits sont listés ici. Cliquez sur une ligne pour la modifier." }
    }
  },
  "orders": {
    "label": "Visite des commandes",
    "steps": {
      "tabs":   { "title": "Filtrer par statut", "desc": "Basculez entre Toutes, En attente, Confirmées, Expédiées, Livrées et Annulées." },
      "export": { "title": "Exporter les commandes", "desc": "Exportez vos commandes vers Excel ou Google Sheets pour les rapports et la comptabilité." },
      "table":  { "title": "Liste des commandes", "desc": "Chaque ligne est une commande client. Cliquez dessus pour voir les détails ou mettre à jour le statut." }
    }
  },
  "delivery": {
    "label": "Visite de la livraison",
    "steps": {
      "providers": { "title": "Partenaires de livraison", "desc": "Choisissez Yalidine, Maystro ou une livraison en propre. Vous pouvez en activer plusieurs à la fois." },
      "config":    { "title": "Configuration du prestataire", "desc": "Entrez vos identifiants API et configurez les frais, zones et options de ramassage." }
    }
  },
  "settings": {
    "label": "Visite des paramètres",
    "steps": {
      "appearance": { "title": "Apparence", "desc": "Changez le template, la couleur de marque et le logo de votre boutique." },
      "template":   { "title": "Template de boutique", "desc": "Choisissez parmi 10 thèmes de vitrine. Chacun a une mise en page unique adaptée à un type de produit." },
      "color":      { "title": "Couleur de marque", "desc": "Votre couleur de marque est utilisée sur les boutons et les accents de toute votre vitrine." }
    }
  }
}
```

- [ ] **Step 3: Add AR tour keys**

Open `locales/ar.json`. Find the `"admin"` object. Add the `"tours"` key:

```json
"tours": {
  "next": "التالي",
  "prev": "السابق",
  "done": "إنهاء",
  "menuLabel": "الجولات والمساعدة",
  "sidebar": {
    "label": "نظرة عامة على لوحة التحكم",
    "steps": {
      "logo":      { "title": "متجرك", "desc": "هذا هو اسم متجرك وشعاره. يمكنك تغييرهما من إعدادات المظهر." },
      "dashboard": { "title": "لوحة التحكم", "desc": "احصل على نظرة سريعة على مبيعاتك وطلباتك وإيراداتك." },
      "products":  { "title": "المنتجات", "desc": "أضف وأدر كل ما تبيعه — المنتجات والأسعار والصور والمخزون." },
      "orders":    { "title": "الطلبات", "desc": "تتبع كل طلب عميل من الاستلام حتى التسليم. حدّث الحالات وصدّر التقارير." },
      "delivery":  { "title": "التوصيل", "desc": "ربط Yalidine أو Maystro أو إدارة التوصيل الخاص بك. اضبط المناطق والأسعار هنا." },
      "settings":  { "title": "الإعدادات", "desc": "خصّص مظهر متجرك وبيانات التواصل واللغة، وانشره عندما تكون مستعداً." },
      "help":      { "title": "الجولات والمساعدة", "desc": "انقر هنا في أي وقت لإعادة تشغيل هذه الجولة أو بدء جولة لقسم معين." }
    }
  },
  "dashboard": {
    "label": "جولة لوحة التحكم",
    "steps": {
      "stats":     { "title": "مؤشراتك", "desc": "اطلع على إجمالي الطلبات والإيرادات والعملاء الجدد للفترة المحددة." },
      "checklist": { "title": "قائمة الإطلاق", "desc": "أكمل هذه الخطوات لإعداد متجرك بالكامل. يمكنك إخفاؤها عند الانتهاء." },
      "chart":     { "title": "اتجاه المبيعات", "desc": "يُظهر هذا الرسم البياني حجم مبيعاتك عبر الزمن لاكتشاف الأنماط." }
    }
  },
  "products": {
    "label": "جولة المنتجات",
    "steps": {
      "create": { "title": "إضافة منتج", "desc": "انقر هنا لإنشاء منتج جديد. أضف اسماً وسعراً وصوراً ومخزوناً." },
      "search": { "title": "البحث عن المنتجات", "desc": "ابحث بالاسم أو صفّي حسب الفئة أو الحالة للعثور على أي منتج بسرعة." },
      "table":  { "title": "قائمة المنتجات", "desc": "جميع منتجاتك مدرجة هنا. انقر على أي صف لتعديله." }
    }
  },
  "orders": {
    "label": "جولة الطلبات",
    "steps": {
      "tabs":   { "title": "تصفية حسب الحالة", "desc": "بدّل بين الكل والمعلقة والمؤكدة والمشحونة والمسلّمة والملغاة." },
      "export": { "title": "تصدير الطلبات", "desc": "صدّر طلباتك إلى Excel أو Google Sheets للتقارير والمحاسبة." },
      "table":  { "title": "قائمة الطلبات", "desc": "كل صف يمثل طلب عميل. انقر عليه لرؤية التفاصيل أو تحديث الحالة." }
    }
  },
  "delivery": {
    "label": "جولة التوصيل",
    "steps": {
      "providers": { "title": "شركاء التوصيل", "desc": "اختر Yalidine أو Maystro أو التوصيل الذاتي. يمكنك تفعيل أكثر من واحد في آنٍ واحد." },
      "config":    { "title": "إعدادات مزود الخدمة", "desc": "أدخل بيانات API الخاصة بك واضبط الرسوم والمناطق وخيارات الاستلام." }
    }
  },
  "settings": {
    "label": "جولة الإعدادات",
    "steps": {
      "appearance": { "title": "المظهر", "desc": "غيّر قالب متجرك ولون علامتك التجارية وشعارك." },
      "template":   { "title": "قالب المتجر", "desc": "اختر من بين 10 قوالب واجهة. لكل منها تصميم مخصص لنوع منتج معين." },
      "color":      { "title": "لون العلامة التجارية", "desc": "يُستخدم لون علامتك التجارية على الأزرار والعناصر المميزة في واجهة متجرك كاملاً." }
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS/.claude/worktrees/relaxed-ellis-ed3361"
git add locales/en.json locales/fr.json locales/ar.json
git commit -m "feat(tour): add EN/FR/AR i18n keys for all tour steps"
```

---

## Task 7: Wire auto-start into pages + add data-tour attributes

**Files:**
- Modify: `pages/admin/index.vue`
- Modify: `pages/admin/products/index.vue`
- Modify: `pages/admin/orders/index.vue`
- Modify: `pages/admin/delivery/index.vue`
- Modify: `pages/admin/settings/appearance.vue`
- Modify: `pages/admin/onboarding.vue`

- [ ] **Step 1: Wire dashboard page**

In `pages/admin/index.vue`, find the `<script setup>` block. Add after the existing imports/composables:

```typescript
const { autoStartIfNeeded } = useTour()
onMounted(() => autoStartIfNeeded('sidebar'))
```

In the template, add `data-tour` attrs to key sections:

Find the stats cards row (line ~69 area with `AdminDashboardStatCard`). Wrap it or add the attribute. Find:
```html
<AdminDashboardStatCard
```
The first occurrence — add `data-tour="dashboard-stats"` to its parent wrapper `<div>`.

Find `<AdminGettingStartedChecklist` — add `data-tour="dashboard-checklist"` to it:
```html
<AdminGettingStartedChecklist v-if="storeSettings?.isCompleted" data-tour="dashboard-checklist" />
```

Find `<AdminDashboardTrendChart` — add `data-tour="dashboard-chart"` to the first occurrence:
```html
<AdminDashboardTrendChart ... data-tour="dashboard-chart" />
```

- [ ] **Step 2: Wire products page**

In `pages/admin/products/index.vue`, add to `<script setup>`:

```typescript
const { autoStartIfNeeded } = useTour()
onMounted(() => autoStartIfNeeded('products'))
```

In the template, add data-tour attrs:
- Find the "Create product" button (search for `to="/admin/products/create"` or `lucide:plus`). Add `data-tour="products-create-btn"` to that button/link.
- Find the search input (around line 70 with `v-model="searchQuery"`). Add `data-tour="products-search"` to its parent container.
- Find the products table root element. Add `data-tour="products-table"`.

- [ ] **Step 3: Wire orders page**

In `pages/admin/orders/index.vue`, add to `<script setup>`:

```typescript
const { autoStartIfNeeded } = useTour()
onMounted(() => autoStartIfNeeded('orders'))
```

In the template:
- Find `<AdminTabFilter` — add `data-tour="orders-tabs"`.
- Find `<AdminOrderExportButton` — add `data-tour="orders-export"`.
- Find the orders table root element — add `data-tour="orders-table"`.

- [ ] **Step 4: Wire delivery page**

In `pages/admin/delivery/index.vue`, add to `<script setup>`:

```typescript
const { autoStartIfNeeded } = useTour()
onMounted(() => autoStartIfNeeded('delivery'))
```

In the template:
- Find the providers list (`v-for="provider in providers"` around line 53). Add `data-tour="delivery-providers"` to its parent container.
- Find the config panel that appears when a provider is selected. Add `data-tour="delivery-config"` to it.

- [ ] **Step 5: Wire settings/appearance page**

In `pages/admin/settings/appearance.vue`, add to `<script setup>`:

```typescript
const { autoStartIfNeeded } = useTour()
onMounted(() => autoStartIfNeeded('settings'))
```

In the template:
- Find the settings nav tabs (links to appearance/contact/functional). Add `data-tour="settings-appearance-tab"` to the appearance tab link.
- Find the template selector section. Add `data-tour="settings-template"`.
- Find the color picker section. Add `data-tour="settings-color"`.

- [ ] **Step 6: Trigger sidebar tour flag from onboarding finish**

In `pages/admin/onboarding.vue`, find the `finish()` function:

```typescript
async function finish() {
  const ok = await save({ isCompleted: true })
  if (ok) await navigateTo('/admin')
}
```

Replace with:

```typescript
async function finish() {
  const ok = await save({ isCompleted: true })
  if (ok) {
    if (import.meta.client) {
      // Clear sidebar tour seen flag so it fires on first visit to /admin after onboarding
      localStorage.removeItem('tour_seen_sidebar')
    }
    await navigateTo('/admin')
  }
}
```

- [ ] **Step 7: Commit**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS/.claude/worktrees/relaxed-ellis-ed3361"
git add pages/admin/index.vue pages/admin/products/index.vue pages/admin/orders/index.vue pages/admin/delivery/index.vue pages/admin/settings/appearance.vue pages/admin/onboarding.vue
git commit -m "feat(tour): wire auto-start and data-tour attributes across admin pages"
```

---

## Task 8: Final wiring — fix sidebar data-tour on actual nav links

**Files:**
- Modify: `layouts/admin.vue`

The nav links are rendered in a `v-for` loop. We need `data-tour` attributes on the specific nav items (dashboard, products, orders, delivery, settings).

- [ ] **Step 1: Add navTourIds map to admin.vue script**

In `layouts/admin.vue`, find the script section near the end. Before or after `const navGroups = ref(...)`, add:

```typescript
const navTourIds: Record<string, string> = {
  '/admin': 'sidebar-dashboard',
  '/admin/products': 'sidebar-products',
  '/admin/orders': 'sidebar-orders',
  '/admin/delivery': 'sidebar-delivery',
  '/admin/settings/appearance': 'sidebar-settings',
}
```

- [ ] **Step 2: Add :data-tour binding to NuxtLink**

Find the NuxtLink element in the nav items loop. It starts with:

```html
<NuxtLink
  :to="item.path"
```

Add `:data-tour="navTourIds[item.path]"` as an attribute on the same element.

- [ ] **Step 3: Remove the hidden anchor spans (if added in Task 5)**

If you added the hidden `<div class="hidden">` block with `<span data-tour="...">` in Task 5 Step 2, remove it now since the attributes are directly on the nav links.

- [ ] **Step 4: Commit**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS/.claude/worktrees/relaxed-ellis-ed3361"
git add layouts/admin.vue
git commit -m "feat(tour): add data-tour bindings to sidebar nav links"
```

---

## Verification

- [ ] **Run typecheck**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS/.claude/worktrees/relaxed-ellis-ed3361"
npm run typecheck
```

Expected: no errors related to tour files.

- [ ] **Run dev server and test manually**

```bash
npm run dev
```

1. Log in as a tenant → complete onboarding → sidebar tour fires on `/admin`
2. After sidebar tour ends → dashboard tour fires automatically
3. Navigate to `/admin/products` → products tour fires once
4. Navigate to `/admin/orders` → orders tour fires once
5. Navigate to `/admin/delivery` → delivery tour fires once
6. Navigate to `/admin/settings/appearance` → settings tour fires once
7. Click "Tours & Help" in sidebar → panel opens showing 6 tours
8. Click any tour → it launches immediately
9. Press ESC during a tour → tour ends, marked as seen
10. Switch language to Arabic → tour tooltips render RTL
