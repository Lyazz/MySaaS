<template>
  <div class="admin-shell h-[100dvh] overflow-hidden flex" style="background: var(--admin-content-bg); font-family: 'DM Sans', system-ui, sans-serif;" :style="adminStyle">

    <!-- Mobile Backdrop -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 bg-black/70 backdrop-blur-sm z-20 lg:hidden"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside class="bg-sidebar border-e border-sidebar" :class="[
 'flex flex-col z-30 shrink-0',
 'fixed inset-y-0 start-0 lg:relative transition-all duration-300',
 sidebarOpen
 ? 'translate-x-0 w-[220px]'
 : '-translate-x-full w-[220px] lg:translate-x-0 lg:w-[64px]'
 ]">

      <!-- Logo -->
      <div
 data-tour="sidebar-logo"
 class="h-[52px] flex items-center shrink-0 overflow-hidden border-b border-sidebar"
 :class="sidebarOpen ? 'px-3 gap-2.5' : 'justify-center px-0 gap-0'"
 
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
          <p class="font-semibold text-xs truncate leading-tight text-primary">{{ tenantName }}</p>
          <p class="text-micro truncate leading-tight mt-0.5 text-tertiary">{{ tenantSlug }}.swekly.com</p>
        </div>

        <button
 @click="sidebarOpen = false"
 class="ms-auto p-1 rounded-lg transition-colors lg:hidden shrink-0 text-tertiary"
 
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
            <span class="text-micro font-bold uppercase tracking-[0.12em] text-muted">
              {{ t(entry.group.titleKey) }}
            </span>
          </div>
          <!-- Group divider (collapsed) -->
          <div
 v-else-if="entry.group.titleKey && !sidebarOpen"
 class="mx-auto w-5 h-px mb-2 bg-line"
 
 />

          <div class="space-y-px">
            <NuxtLink
              v-for="item in entry.items"
              :key="item.path"
              :to="item.path"
              :data-tour="navTourIds[item.path]"
              class="group relative flex items-center h-8 rounded-lg transition-all duration-150"
              :class="[
                sidebarOpen ? 'px-2.5 gap-2.5' : 'justify-center px-0',
                isActive(item.path) ? 'nav-item-active' : 'nav-item-idle'
              ]"
            >
              <Icon
                :name="item.icon"
                class="w-[15px] h-[15px] shrink-0"
                :style="isActive(item.path) ? 'color: var(--admin-active-color)' : 'color: var(--text-tertiary)'"
              />

              <span
                class="text-xs font-medium truncate transition-all duration-300 whitespace-nowrap leading-none"
                :class="sidebarOpen ? 'opacity-100 flex-1' : 'opacity-0 w-0 pointer-events-none flex-none'"
                :style="isActive(item.path) ? 'color: var(--admin-active-color)' : 'color: var(--text-secondary)'"
              >
                {{ t(item.labelKey) }}
              </span>

              <!-- Pending orders badge -->
              <span
                v-if="sidebarOpen && item.path === '/admin/orders' && unreadOrderCount > 0"
                class="text-micro font-bold px-1.5 py-0.5 rounded-full shrink-0"
                style="background: rgba(239,68,68,0.15); color: #f87171;"
              >{{ unreadOrderCount }}</span>

              <!-- Tooltip (collapsed) -->
              <div
                v-if="!sidebarOpen"
                class="fixed start-[72px] px-2.5 py-1.5 text-mini font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl"
                style="background: var(--surface-3); border: 1px solid var(--surface-border); color: var(--text-primary); top: auto"
              >
                {{ t(item.labelKey) }}
              </div>
            </NuxtLink>
          </div>
        </div>
      </nav>

      <!-- Tour Menu -->
      <AdminTourMenu :sidebar-open="sidebarOpen" />

      <!-- User -->
      <div class="shrink-0 p-2 border-t border-sidebar">
        <div
          class="flex items-center rounded-lg px-2 py-1.5 cursor-pointer transition-all duration-150 group"
          :class="sidebarOpen ? 'gap-2.5' : 'justify-center'"
          @mouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)'"
          @mouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = ''"
        >
          <div
 class="w-7 h-7 rounded-full flex items-center justify-center text-mini font-bold shrink-0 ui-wash ui-wash--bordered"
 
>
            {{ userInitial }}
          </div>
          <div
            class="min-w-0 transition-all duration-300 overflow-hidden"
            :class="sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'"
          >
            <p class="text-mini font-medium truncate leading-tight text-primary">{{ authStore.user?.email }}</p>
            <p class="text-micro truncate mt-0.5 capitalize text-tertiary">{{ authStore.user?.role }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col overflow-hidden min-w-0">

      <!-- Topbar -->
      <header
 class="shrink-0 flex items-center px-4 h-[52px] gap-3 bg-topbar border-b border-topbar"
 
>
        <button
 @click="toggleSidebar"
 class="p-1.5 rounded-lg transition-all duration-150 shrink-0 text-tertiary border border-transparent"
 
 @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }"
 @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }"
 :aria-label="t('admin.actions.toggleSidebar')"
>
          <Icon name="lucide:panel-left" class="w-4 h-4" />
        </button>

        <div class="w-px h-4 shrink-0 bg-line" />

        <h1
 class="text-sm font-semibold truncate text-primary tracking-tight"
 
>
          {{ pageTitle }}
        </h1>

        <div class="flex items-center gap-1.5 ms-auto shrink-0">
          <a
 :href="storefrontUrl"
 target="_blank"
 rel="noopener noreferrer"
 class="flex items-center gap-1.5 px-2.5 py-1.5 text-mini font-medium rounded-lg transition-all duration-150 text-secondary border border-line bg-transparent"
 
 :aria-label="t('admin.actions.viewStore')"
 @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }"
 @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }"
>
            <Icon name="lucide:external-link" class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">{{ t('admin.actions.viewStore') }}</span>
          </a>

          <AdminNotificationsButton />
          <LocaleSwitcher />
          <AdminThemeToggle />

          <div class="w-px h-4 shrink-0 bg-line" />

          <button
 @click="showLogoutModal = true"
 class="flex items-center gap-1.5 px-2.5 py-1.5 text-mini font-medium rounded-lg transition-all duration-150 text-secondary border border-line bg-transparent"
 
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
 class="w-full max-w-sm rounded-2xl p-6 shadow-2xl bg-sidebar border border-line"
 
>
              <div class="flex items-center gap-3 mb-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background: rgba(239,68,68,0.12)">
                  <Icon name="lucide:log-out" class="w-4.5 h-4.5 text-danger" />
                </div>
                <h2 class="text-base font-semibold text-primary">{{ t('admin.actions.logoutConfirmTitle') }}</h2>
              </div>
              <p class="text-sm mb-5 leading-relaxed text-secondary">{{ t('admin.actions.logoutConfirmMessage') }}</p>
              <div class="flex gap-2 justify-end">
                <button
 @click="showLogoutModal = false"
 class="px-4 py-2 text-xs font-medium rounded-lg transition-all duration-150 text-secondary border border-line bg-transparent"
 
 @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)' }"
 @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = '' }"
>
                  {{ t('admin.common.cancel') }}
                </button>
                <button
                  @click="handleLogout"
                  class="px-4 py-2 text-xs font-medium rounded-lg transition-all duration-150"
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
 class="flex-1 overflow-y-auto custom-scrollbar bg-admin"
 
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
import { useOrderUnreadCount } from '~/composables/useOrderUnreadCount'
import LocaleSwitcher from '~/components/LocaleSwitcher.vue'
import AdminThemeToggle from '~/components/admin/AdminThemeToggle.vue'
import AdminNotificationsButton from '~/components/admin/AdminNotificationsButton.vue'
import {
  SETTINGS_NAV_GROUPS,
  adminPathToResource,
  findActiveSettingsNav,
  hasSettingsHubAccess,
  type AdminRole
} from '~/shared/admin/settings-navigation'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const uiStore = useUiStore()
const route = useRoute()
const sidebarOpen = ref(false)
const showLogoutModal = ref(false)
const storeSettings = useState<any>('storeSettings')
const { unreadOrderCount, refreshUnreadOrderCount } = useOrderUnreadCount()

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
  // Settings pages host several destinations behind one route file, so the
  // topbar takes its name from the nav entry the user actually opened rather
  // than the page's static meta title.
  const activeSettings = findActiveSettingsNav(SETTINGS_NAV_GROUPS, {
    path: route.path,
    query: route.query as Record<string, string | undefined>,
    hash: route.hash
  })
  if (activeSettings) return t(activeSettings.item.labelKey)

  const metaTitleKey = route.meta.titleKey as string | undefined
  if (metaTitleKey) return t(metaTitleKey)
  const metaTitle = route.meta.title as string | undefined
  return metaTitle || t('admin.layout.defaultTitle')
})

type NavAccess = 'admin' | 'member'
type NavItem = { path: string; labelKey: string; icon: string; access?: NavAccess }
type NavGroup = { titleKey?: string; collapsed: boolean; items: NavItem[] }

const currentRole = computed<AdminRole>(() => {
  const role = authStore.user?.role
  if (role === 'owner' || role === 'admin' || role === 'staff') return role
  return 'staff'
})

const staffPerms = computed<string[]>(() => authStore.staffPermissions || [])

const hasAccess = (item: NavItem, role: AdminRole): boolean => {
  if (role === 'staff') {
    if (staffPerms.value.length === 0) return item.path.startsWith('/admin/orders')
    if (item.path === '/admin/settings') return hasSettingsHubAccess(role, staffPerms.value)
    const resource = adminPathToResource(item.path)
    if (!resource) return false
    if (resource === 'settingsHub') return hasSettingsHubAccess(role, staffPerms.value)
    return staffPerms.value.includes(`${resource}:read`)
  }
  if (item.access === 'member') return true
  return role === 'owner' || role === 'admin'
}

const navTourIds: Record<string, string> = {
  '/admin': 'sidebar-dashboard',
  '/admin/products': 'sidebar-products',
  '/admin/orders': 'sidebar-orders',
  '/admin/delivery': 'sidebar-delivery',
  '/admin/settings': 'sidebar-settings',
}

const navGroups = ref<NavGroup[]>([
  {
    titleKey: 'admin.nav.overview',
    collapsed: false,
    items: [
      { path: '/admin', labelKey: 'admin.nav.dashboard', icon: 'lucide:layout-dashboard', access: 'admin' },
      { path: '/admin/statistics', labelKey: 'admin.nav.statistics', icon: 'lucide:bar-chart-3', access: 'admin' }
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
      { path: '/admin/devices', labelKey: 'admin.nav.devices', icon: 'lucide:smartphone', access: 'admin' },
      { path: '/admin/marketing/landing-page/new', labelKey: 'admin.nav.landingPage', icon: 'lucide:megaphone', access: 'admin' },
      { path: '/admin/users', labelKey: 'admin.nav.users', icon: 'lucide:user-cog', access: 'admin' },
      { path: '/admin/billing', labelKey: 'admin.nav.billing', icon: 'lucide:credit-card', access: 'admin' },
      { path: '/admin/integrations', labelKey: 'admin.nav.integrations', icon: 'lucide:puzzle', access: 'admin' },
      { path: '/admin/settings', labelKey: 'admin.nav.settingsHub', icon: 'lucide:sliders-horizontal', access: 'admin' }
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

onMounted(() => {
  if (route.path.startsWith('/admin')) {
    refreshUnreadOrderCount().catch((error) => {
      console.error('Failed to refresh unread order count:', error)
    })
  }
})

watch(() => route.fullPath, () => {
  if (!route.path.startsWith('/admin')) return
  refreshUnreadOrderCount().catch((error) => {
    console.error('Failed to refresh unread order count:', error)
  })
})
</script>
