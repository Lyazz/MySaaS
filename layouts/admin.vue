<template>
  <div class="admin-shell h-screen overflow-hidden flex" style="background: var(--admin-content-bg); font-family: 'DM Sans', system-ui, sans-serif;" :style="adminStyle">

    <!-- Mobile Backdrop -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 bg-black/70 backdrop-blur-sm z-20 lg:hidden"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside :class="[
      'flex flex-col z-30 shrink-0',
      'fixed inset-y-0 left-0 lg:relative transition-all duration-300',
      sidebarOpen
        ? 'translate-x-0 w-[220px]'
        : '-translate-x-full w-[220px] lg:translate-x-0 lg:w-[64px]'
    ]" style="background: var(--admin-sidebar-bg); border-right: 1px solid var(--admin-sidebar-border);">

      <!-- Logo -->
      <div
        class="h-[52px] flex items-center shrink-0 overflow-hidden"
        :class="sidebarOpen ? 'px-3 gap-2.5' : 'justify-center px-0 gap-0'"
        style="border-bottom: 1px solid var(--admin-sidebar-border)"
      >
        <template v-if="storeSettings?.logoUrl">
          <img
            :src="storeSettings.logoUrl"
            :alt="tenantName"
            class="h-6 object-contain shrink-0 transition-all duration-300"
            :class="sidebarOpen ? 'max-w-[90px]' : 'max-w-[24px]'"
          >
        </template>
        <template v-else>
          <div
            class="w-7 h-7 rounded-lg flex items-center justify-center font-bold shrink-0 text-xs"
            style="background: var(--brand); color: #0a0a0a;"
          >
            {{ tenantInitial }}
          </div>
        </template>

        <div
          class="min-w-0 transition-all duration-300 overflow-hidden"
          :class="sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 pointer-events-none'"
        >
          <p class="font-semibold text-[12.5px] truncate leading-tight" style="color: var(--text-primary)">{{ tenantName }}</p>
          <p class="text-[10px] truncate leading-tight mt-0.5" style="color: var(--text-tertiary)">{{ tenantSlug }}.swekly.com</p>
        </div>

        <button
          @click="sidebarOpen = false"
          class="ml-auto p-1 rounded-lg transition-colors lg:hidden shrink-0"
          style="color: var(--text-tertiary)"
        >
          <Icon name="lucide:x" class="w-4 h-4" />
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 py-2.5 overflow-y-auto custom-scrollbar" :class="sidebarOpen ? 'px-2.5' : 'px-2'">
        <div v-for="entry in visibleNavGroups" :key="entry.originalIndex" class="mb-3">
          <!-- Group label (expanded) -->
          <div
            v-if="entry.group.titleKey && sidebarOpen"
            class="px-2 mb-1"
          >
            <span class="text-[9px] font-bold uppercase tracking-[0.12em]" style="color: var(--text-muted)">
              {{ t(entry.group.titleKey) }}
            </span>
          </div>
          <!-- Group divider (collapsed) -->
          <div
            v-else-if="entry.group.titleKey && !sidebarOpen"
            class="mx-auto w-5 h-px mb-2"
            style="background: var(--surface-border)"
          />

          <div class="space-y-px">
            <NuxtLink
              v-for="item in entry.items"
              :key="item.path"
              :to="item.path"
              class="group relative flex items-center h-8 rounded-lg transition-all duration-150"
              :class="[
                sidebarOpen ? 'px-2.5 gap-2.5' : 'justify-center px-0',
                isActive(item.path) ? 'nav-item-active' : 'nav-item-idle'
              ]"
            >
              <Icon
                :name="item.icon"
                class="w-[15px] h-[15px] shrink-0"
                :style="isActive(item.path) ? 'color: var(--sidebar-active-color)' : 'color: var(--text-tertiary)'"
              />

              <span
                class="text-[12.5px] font-medium truncate transition-all duration-300 whitespace-nowrap leading-none"
                :class="sidebarOpen ? 'opacity-100 flex-1' : 'opacity-0 w-0 pointer-events-none flex-none'"
                :style="isActive(item.path) ? 'color: var(--sidebar-active-color)' : 'color: var(--text-secondary)'"
              >
                {{ t(item.labelKey) }}
              </span>

              <!-- Pending orders badge -->
              <span
                v-if="sidebarOpen && item.path === '/admin/orders' && pendingOrdersCount > 0"
                class="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                style="background: rgba(239,68,68,0.15); color: #f87171;"
              >{{ pendingOrdersCount }}</span>

              <!-- Tooltip (collapsed) -->
              <div
                v-if="!sidebarOpen"
                class="fixed left-[72px] px-2.5 py-1.5 text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl"
                style="background: var(--surface-3); border: 1px solid var(--surface-border); color: var(--text-primary); top: auto"
              >
                {{ t(item.labelKey) }}
              </div>
            </NuxtLink>
          </div>
        </div>
      </nav>

      <!-- User -->
      <div class="shrink-0 p-2" style="border-top: 1px solid var(--admin-sidebar-border)">
        <div
          class="flex items-center rounded-lg px-2 py-1.5 cursor-pointer transition-all duration-150 group"
          :class="sidebarOpen ? 'gap-2.5' : 'justify-center'"
          @mouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)'"
          @mouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = ''"
        >
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
            style="background: rgba(var(--brand-rgb) / 0.15); border: 1px solid rgba(var(--brand-rgb) / 0.3); color: var(--brand)"
          >
            {{ userInitial }}
          </div>
          <div
            class="min-w-0 transition-all duration-300 overflow-hidden"
            :class="sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'"
          >
            <p class="text-[11.5px] font-medium truncate leading-tight" style="color: var(--text-primary)">{{ authStore.user?.email }}</p>
            <p class="text-[10px] truncate mt-0.5 capitalize" style="color: var(--text-tertiary)">{{ authStore.user?.role }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col overflow-hidden min-w-0">

      <!-- Topbar -->
      <header
        class="shrink-0 flex items-center px-4 h-[52px] gap-3"
        style="background: var(--admin-topbar-bg); border-bottom: 1px solid var(--admin-topbar-border);"
      >
        <button
          @click="toggleSidebar"
          class="p-1.5 rounded-lg transition-all duration-150 shrink-0"
          style="color: var(--text-tertiary); border: 1px solid transparent"
          @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }"
          @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }"
          :aria-label="t('admin.actions.toggleSidebar')"
        >
          <Icon name="lucide:panel-left" class="w-4 h-4" />
        </button>

        <div class="w-px h-4 shrink-0" style="background: var(--surface-border)" />

        <h1
          class="text-[13px] font-semibold truncate"
          style="color: var(--text-primary); letter-spacing: -0.01em"
        >
          {{ pageTitle }}
        </h1>

        <div class="flex items-center gap-1.5 ml-auto shrink-0">
          <a
            :href="storefrontUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1.5 px-2.5 py-1.5 text-[11.5px] font-medium rounded-lg transition-all duration-150"
            style="color: var(--text-secondary); border: 1px solid var(--surface-border); background: transparent"
            :aria-label="t('admin.actions.viewStore')"
            @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }"
            @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }"
          >
            <Icon name="lucide:external-link" class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">{{ t('admin.actions.viewStore') }}</span>
          </a>

          <LocaleSwitcher />
          <AdminThemeToggle />

          <div class="w-px h-4 shrink-0" style="background: var(--surface-border)" />

          <button
            @click="showLogoutModal = true"
            class="flex items-center gap-1.5 px-2.5 py-1.5 text-[11.5px] font-medium rounded-lg transition-all duration-150"
            style="color: var(--text-secondary); border: 1px solid var(--surface-border); background: transparent"
            :aria-label="t('admin.actions.logout')"
            @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }"
            @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }"
          >
            <Icon name="lucide:log-out" class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">{{ t('admin.actions.logout') }}</span>
          </button>
        </div>

        <!-- Logout Confirmation Modal -->
        <Teleport to="body">
          <div
            v-if="showLogoutModal"
            class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px)"
            @click.self="showLogoutModal = false"
          >
            <div
              class="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
              style="background: var(--admin-sidebar-bg); border: 1px solid var(--surface-border)"
            >
              <div class="flex items-center gap-3 mb-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background: rgba(239,68,68,0.12)">
                  <Icon name="lucide:log-out" class="w-4.5 h-4.5" style="color: #ef4444" />
                </div>
                <h2 class="text-[15px] font-semibold" style="color: var(--text-primary)">{{ t('admin.actions.logoutConfirmTitle') }}</h2>
              </div>
              <p class="text-[13px] mb-5 leading-relaxed" style="color: var(--text-secondary)">{{ t('admin.actions.logoutConfirmMessage') }}</p>
              <div class="flex gap-2 justify-end">
                <button
                  @click="showLogoutModal = false"
                  class="px-4 py-2 text-[12px] font-medium rounded-lg transition-all duration-150"
                  style="color: var(--text-secondary); border: 1px solid var(--surface-border); background: transparent"
                  @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)' }"
                  @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = '' }"
                >
                  {{ t('admin.common.cancel') }}
                </button>
                <button
                  @click="handleLogout"
                  class="px-4 py-2 text-[12px] font-medium rounded-lg transition-all duration-150"
                  style="background: #ef4444; border: 1px solid transparent; color: #fff"
                  @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = '#dc2626' }"
                  @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = '#ef4444' }"
                >
                  {{ t('admin.actions.logout') }}
                </button>
              </div>
            </div>
          </div>
        </Teleport>
      </header>

      <!-- Content -->
      <main
        class="flex-1 overflow-y-auto custom-scrollbar"
        style="background: var(--admin-content-bg)"
        :class="route.path.startsWith('/admin/pos') ? 'p-0' : 'p-5 md:p-6'"
      >
        <div
          class="animate-fadeIn"
          :class="route.path.startsWith('/admin/pos') ? 'h-full max-w-none' : 'max-w-7xl mx-auto'"
        >
          <slot />
        </div>
      </main>
    </div>

    <HelpCenterWidget />
  </div>
</template>

<style scoped>
.nav-item-active {
  background: rgba(var(--brand-rgb) / 0.1);
  border: 1px solid rgba(var(--brand-rgb) / 0.16);
}

.nav-item-idle:hover {
  background: var(--nav-hover-bg);
}
</style>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useUiStore } from '~/stores/ui'
import { toTenantHost, useRequestOrigin } from '~/composables/host'
import { usePlatformBaseDomain } from '~/composables/platformBaseDomain'
import LocaleSwitcher from '~/components/LocaleSwitcher.vue'
import AdminThemeToggle from '~/components/admin/AdminThemeToggle.vue'
import HelpCenterWidget from '~/components/admin/HelpCenterWidget.vue'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const uiStore = useUiStore()
const route = useRoute()
const sidebarOpen = ref(false)
const showLogoutModal = ref(false)
const storeSettings = useState<any>('storeSettings')

const { data: settings } = await useAsyncData('storeSettings', () =>
  $fetch('/api/admin/store-settings', {
    headers: { Authorization: `Bearer ${authStore.token}` }
  }).catch(() => null),
  { lazy: true }
)

if (settings.value) {
  storeSettings.value = settings.value
}

onMounted(() => {
  uiStore.initTheme()
  if (window.innerWidth >= 1024) {
    sidebarOpen.value = route.path !== '/admin/pos'
  }
})

watch(() => route.path, (newPath) => {
  if (window.innerWidth >= 1024) {
    sidebarOpen.value = newPath !== '/admin/pos'
  } else {
    sidebarOpen.value = false
  }
})

const tenantName = computed(() => authStore.user?.tenant?.name || 'Swekly')
const tenantInitial = computed(() => tenantName.value.charAt(0).toUpperCase())
const userInitial = computed(() => authStore.user?.email.charAt(0).toUpperCase() || 'U')
const tenantSlug = computed(() => authStore.user?.tenant?.slug as string | undefined)
const pendingOrdersCount = ref(0)

function isActive(path: string) {
  if (path === '/admin') return route.path === '/admin'
  return route.path.startsWith(path)
}

const storefrontUrl = computed(() => {
  const slug = tenantSlug.value
  if (!slug) return '/'
  const { protocol, host } = useRequestOrigin()
  const platformBaseDomain = usePlatformBaseDomain()
  const tenantHost = toTenantHost(host, slug, { platformBaseDomain })
  return `${protocol}://${tenantHost}/`
})

function hexToRgb(hex: string) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b)
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
    : '79 70 229'
}

function getBrandContrast(hex: string) {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return '#05070A'

  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000

  return yiq >= 150 ? '#05070A' : '#F8FAFC'
}

const adminStyle = computed(() => {
  const primaryColor = '#C6F432'
  return {
    '--brand': primaryColor,
    '--brand-rgb': hexToRgb(primaryColor),
    '--brand-contrast': getBrandContrast(primaryColor)
  } as Record<string, string>
})

const pageTitle = computed(() => {
  const metaTitleKey = route.meta.titleKey as string | undefined
  if (metaTitleKey) return t(metaTitleKey)
  const metaTitle = route.meta.title as string | undefined
  return metaTitle || t('admin.layout.defaultTitle')
})

type AdminRole = 'owner' | 'admin' | 'staff'
type NavAccess = 'admin' | 'member'
type NavItem = { path: string; labelKey: string; icon: string; access?: NavAccess }
type NavGroup = { titleKey?: string; collapsed: boolean; items: NavItem[] }

const currentRole = computed<AdminRole>(() => {
  const role = authStore.user?.role
  if (role === 'owner' || role === 'admin' || role === 'staff') return role
  return 'staff'
})

const staffPerms = computed<string[]>(() => authStore.staffPermissions || [])

const pathToResource = (path: string): string | null => {
  if (path === '/admin' || path.startsWith('/admin/dashboard')) return 'dashboard'
  if (path.startsWith('/admin/products')) return 'products'
  if (path.startsWith('/admin/inventory')) return 'inventory'
  if (path.startsWith('/admin/categories')) return 'categories'
  if (path.startsWith('/admin/suppliers')) return 'suppliers'
  if (path.startsWith('/admin/purchases')) return 'purchases'
  if (path.startsWith('/admin/orders')) return 'orders'
  if (path.startsWith('/admin/sales')) return 'sales'
  if (path.startsWith('/admin/pos')) return 'pos'
  if (path.startsWith('/admin/customers')) return 'customers'
  if (path.startsWith('/admin/delivery')) return 'delivery'
  if (path.startsWith('/admin/cash')) return 'cash'
  if (path.startsWith('/admin/billing')) return 'billing'
  if (path.startsWith('/admin/settings/appearance')) return 'storeSettings'
  if (path.startsWith('/admin/settings/homepage')) return 'homepageSettings'
  if (path.startsWith('/admin/settings/contact')) return 'contactInfos'
  if (path.startsWith('/admin/settings/functional')) return 'storeSettings'
  if (path.startsWith('/admin/integrations')) return 'integrations'
  if (path.startsWith('/admin/meta-pixels')) return 'metaPixels'
  if (path.startsWith('/admin/users')) return 'users'
  return null
}

const hasAccess = (item: NavItem, role: AdminRole): boolean => {
  if (role === 'staff') {
    if (staffPerms.value.length === 0) return item.path.startsWith('/admin/orders')
    const resource = pathToResource(item.path)
    if (!resource) return false
    return staffPerms.value.includes(`${resource}:read`)
  }
  if (item.access === 'member') return true
  return role === 'owner' || role === 'admin'
}

const navGroups = ref<NavGroup[]>([
  {
    titleKey: 'admin.nav.overview',
    collapsed: false,
    items: [
      { path: '/admin', labelKey: 'admin.nav.dashboard', icon: 'lucide:layout-dashboard', access: 'admin' }
    ]
  },
  {
    titleKey: 'admin.nav.sales',
    collapsed: false,
    items: [
      { path: '/admin/orders', labelKey: 'admin.nav.orders', icon: 'lucide:shopping-bag', access: 'member' },
      { path: '/admin/pos', labelKey: 'admin.nav.pos', icon: 'lucide:monitor-smartphone', access: 'admin' },
      { path: '/admin/delivery', labelKey: 'admin.nav.deliveryItem', icon: 'lucide:truck', access: 'admin' },
      { path: '/admin/sales', labelKey: 'admin.nav.salesItem', icon: 'lucide:badge-dollar-sign', access: 'admin' },
      { path: '/admin/cash', labelKey: 'admin.nav.cash', icon: 'lucide:wallet', access: 'admin' }
    ]
  },
  {
    titleKey: 'admin.nav.catalog',
    collapsed: false,
    items: [
      { path: '/admin/products', labelKey: 'admin.nav.products', icon: 'lucide:package', access: 'admin' },
      { path: '/admin/categories', labelKey: 'admin.nav.categories', icon: 'lucide:tags', access: 'admin' },
      { path: '/admin/inventory', labelKey: 'admin.nav.inventory', icon: 'lucide:warehouse', access: 'admin' },
      { path: '/admin/suppliers', labelKey: 'admin.nav.suppliers', icon: 'lucide:building-2', access: 'admin' },
      { path: '/admin/purchases', labelKey: 'admin.nav.purchases', icon: 'lucide:shopping-cart', access: 'admin' }
    ]
  },
  {
    titleKey: 'admin.nav.storeParameters',
    collapsed: false,
    items: [
      { path: '/admin/customers', labelKey: 'admin.nav.customers', icon: 'lucide:users', access: 'admin' },
      { path: '/admin/marketing/landing-page/new', labelKey: 'admin.nav.landingPage', icon: 'lucide:megaphone', access: 'admin' },
      { path: '/admin/settings/appearance', labelKey: 'admin.nav.appearance', icon: 'lucide:palette', access: 'admin' },
      { path: '/admin/settings/homepage', labelKey: 'admin.nav.homepage', icon: 'lucide:home', access: 'admin' },
      { path: '/admin/settings/contact', labelKey: 'admin.nav.contactInfo', icon: 'lucide:phone', access: 'admin' },
      { path: '/admin/settings/functional', labelKey: 'admin.nav.functional', icon: 'lucide:sliders', access: 'admin' },
      { path: '/admin/billing', labelKey: 'admin.nav.billing', icon: 'lucide:credit-card', access: 'admin' },
      { path: '/admin/users', labelKey: 'admin.nav.users', icon: 'lucide:user-cog', access: 'admin' },
      { path: '/admin/integrations', labelKey: 'admin.nav.integrations', icon: 'lucide:puzzle', access: 'admin' }
    ]
  }
])

const visibleNavGroups = computed(() =>
  navGroups.value
    .map((group, originalIndex) => ({
      group,
      originalIndex,
      items: group.items.filter((item) => hasAccess(item, currentRole.value))
    }))
    .filter((entry) => entry.items.length > 0)
)

function toggleGroup(index: number) {
  navGroups.value[index].collapsed = !navGroups.value[index].collapsed
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function handleLogout() {
  showLogoutModal.value = false
  authStore.logout()
}
</script>
