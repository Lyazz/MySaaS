<template>
  <div class="h-screen overflow-hidden flex" style="background: var(--admin-content-bg); font-family: 'DM Sans', system-ui, sans-serif;" :style="adminStyle">

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
        : '-translate-x-full w-[200px] lg:translate-x-0 lg:w-[60px]'
    ]" style="background: var(--admin-sidebar-bg); border-right: 1px solid var(--admin-sidebar-border);">

      <!-- Logo -->
      <div class="h-[56px] flex items-center shrink-0 px-3.5 gap-3 overflow-hidden" style="border-bottom: 1px solid var(--admin-sidebar-border)">
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
            class="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white shrink-0 text-xs"
            style="background: var(--brand);"
          >
            {{ tenantInitial }}
          </div>
        </template>

        <span
          class="font-semibold text-[13.5px] tracking-tight text-white/80 truncate transition-all duration-300 min-w-0"
          :class="sidebarOpen ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0 pointer-events-none'"
        >
          {{ tenantName }}
        </span>

        <button
          @click="sidebarOpen = false"
          class="ml-auto p-1 rounded-lg text-white/30 hover:text-white/60 transition-colors lg:hidden shrink-0"
        >
          <Icon name="lucide:x" class="w-4 h-4" />
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 py-3 overflow-y-auto custom-scrollbar" :class="sidebarOpen ? 'px-2.5' : 'px-2'">
        <div v-for="entry in visibleNavGroups" :key="entry.originalIndex" class="mb-4">
          <!-- Group label -->
          <div
            v-if="entry.group.titleKey && sidebarOpen"
            class="flex items-center justify-between px-2 mb-1"
          >
            <button
              @click="toggleGroup(entry.originalIndex)"
              class="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.12em] transition-colors"
              style="color: var(--text-muted)"
            >
              <span>{{ t(entry.group.titleKey) }}</span>
              <Icon
                name="lucide:chevron-down"
                class="w-2.5 h-2.5 transition-transform duration-200"
                :class="entry.group.collapsed ? '-rotate-90' : ''"
              />
            </button>
          </div>
          <div
            v-else-if="entry.group.titleKey && !sidebarOpen"
            class="mx-auto w-5 h-px mb-2"
            style="background: var(--surface-border)"
          />

          <div
            class="space-y-px transition-[max-height,opacity] duration-250 overflow-hidden"
            :class="(!entry.group.collapsed || !sidebarOpen) ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'"
          >
            <NuxtLink
              v-for="item in entry.items"
              :key="item.path"
              :to="item.path"
              class="group relative flex items-center h-9 rounded-xl transition-all duration-150"
              :class="[
                sidebarOpen ? 'px-2.5 gap-2.5' : 'justify-center px-0',
                route.path === item.path
                  ? 'nav-item-active'
                  : 'nav-item-idle'
              ]"
            >
              <!-- Active accent bar -->
              <div
                v-if="route.path === item.path"
                class="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-5 rounded-r-full"
                style="background: var(--brand)"
              />

              <Icon
                :name="item.icon"
                class="w-[16px] h-[16px] shrink-0 transition-transform duration-150"
                :style="route.path === item.path ? 'color: var(--brand)' : 'color: var(--text-tertiary)'"
              />

              <span
                class="text-[13px] font-medium truncate transition-all duration-300 whitespace-nowrap leading-none"
                :class="sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 pointer-events-none'"
                :style="route.path === item.path ? 'color: var(--text-primary)' : 'color: var(--text-secondary)'"
              >
                {{ t(item.labelKey) }}
              </span>

              <!-- Tooltip -->
              <div
                v-if="!sidebarOpen"
                class="fixed left-[68px] px-2.5 py-1.5 text-[12px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl"
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
          class="flex items-center rounded-xl px-2 py-2 cursor-pointer transition-colors group"
          :class="sidebarOpen ? 'gap-2.5' : 'justify-center'"
          style="color: var(--text-secondary)"
          @mouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.045)'"
          @mouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = ''"
        >
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style="background: rgba(var(--brand-rgb) / 0.2); border: 1px solid rgba(var(--brand-rgb) / 0.3)"
          >
            {{ userInitial }}
          </div>
          <div
            class="min-w-0 transition-all duration-300 overflow-hidden"
            :class="sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'"
          >
            <p class="text-[12px] font-medium truncate leading-tight" style="color: var(--text-primary)">{{ authStore.user?.email }}</p>
            <p class="text-[10px] truncate mt-0.5 capitalize" style="color: var(--text-tertiary)">{{ authStore.user?.role }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col overflow-hidden min-w-0">

      <!-- Topbar -->
      <header
        class="shrink-0 flex items-center px-4 h-[56px] gap-3"
        style="background: var(--admin-topbar-bg); border-bottom: 1px solid var(--admin-topbar-border);"
      >
        <button
          @click="toggleSidebar"
          class="p-1.5 rounded-lg transition-all duration-150"
          style="color: var(--text-tertiary)"
          @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }"
          @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }"
          :aria-label="t('admin.actions.toggleSidebar')"
        >
          <Icon name="lucide:panel-left" class="w-4.5 h-4.5" />
        </button>

        <div class="w-px h-4 shrink-0" style="background: var(--surface-border)" />

        <h1
          class="text-[13.5px] font-semibold truncate"
          style="color: var(--text-primary); letter-spacing: -0.01em"
        >
          {{ pageTitle }}
        </h1>

        <div class="flex items-center gap-1.5 ml-auto shrink-0">
          <a
            :href="storefrontUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-lg transition-all duration-150"
            style="color: var(--text-secondary); border: 1px solid var(--surface-border); background: transparent"
            @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }"
            @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }"
          >
            <Icon name="lucide:external-link" class="w-3 h-3" />
            <span>{{ t('admin.actions.viewStore') }}</span>
          </a>

          <LocaleSwitcher class="hidden sm:inline-flex" />

          <div class="w-px h-4 hidden sm:block" style="background: var(--surface-border)" />

          <button
            @click="handleLogout"
            class="ui-btn ui-btn--sm ui-btn--ghost"
            :aria-label="t('admin.actions.logout')"
          >
            <Icon name="lucide:log-out" class="w-3.5 h-3.5" />
            <span class="hidden sm:inline text-[12px]">{{ t('admin.actions.logout') }}</span>
          </button>
        </div>
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
  background: rgba(var(--brand-rgb) / 0.12);
  box-shadow: inset 0 0 0 1px rgba(var(--brand-rgb) / 0.18);
}

.nav-item-idle:hover {
  background: rgba(255,255,255,0.04);
}
</style>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { toTenantHost, useRequestOrigin } from '~/composables/host'
import { usePlatformBaseDomain } from '~/composables/platformBaseDomain'
import LocaleSwitcher from '~/components/LocaleSwitcher.vue'
import HelpCenterWidget from '~/components/admin/HelpCenterWidget.vue'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const route = useRoute()
const sidebarOpen = ref(false)
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

const adminStyle = computed(() => {
  const primaryColor = storeSettings.value?.primaryColor || '#4F46E5'
  return {
    '--brand': primaryColor,
    '--brand-rgb': hexToRgb(primaryColor)
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
      { path: '/admin/pos', labelKey: 'admin.nav.pos', icon: 'lucide:monitor-smartphone', access: 'admin' },
      { path: '/admin/orders', labelKey: 'admin.nav.orders', icon: 'lucide:shopping-bag', access: 'member' },
      { path: '/admin/sales', labelKey: 'admin.nav.salesItem', icon: 'lucide:badge-dollar-sign', access: 'admin' },
      { path: '/admin/cash', labelKey: 'admin.nav.cash', icon: 'lucide:wallet', access: 'admin' },
      { path: '/admin/delivery', labelKey: 'admin.nav.deliveryItem', icon: 'lucide:truck', access: 'admin' }
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
    titleKey: 'admin.nav.marketing',
    collapsed: false,
    items: [
      { path: '/admin/customers', labelKey: 'admin.nav.customers', icon: 'lucide:users', access: 'admin' },
      { path: '/admin/marketing/landing-page/new', labelKey: 'admin.nav.landingPage', icon: 'lucide:megaphone', access: 'admin' }
    ]
  },
  {
    titleKey: 'admin.nav.finance',
    collapsed: false,
    items: [
      { path: '/admin/billing', labelKey: 'admin.nav.billing', icon: 'lucide:credit-card', access: 'admin' }
    ]
  },
  {
    titleKey: 'admin.nav.storeParameters',
    collapsed: false,
    items: [
      { path: '/admin/settings/appearance', labelKey: 'admin.nav.appearance', icon: 'lucide:palette', access: 'admin' },
      { path: '/admin/settings/homepage', labelKey: 'admin.nav.homepage', icon: 'lucide:home', access: 'admin' },
      { path: '/admin/settings/contact', labelKey: 'admin.nav.contactInfo', icon: 'lucide:phone', access: 'admin' },
      { path: '/admin/settings/functional', labelKey: 'admin.nav.functional', icon: 'lucide:sliders', access: 'admin' }
    ]
  },
  {
    titleKey: 'admin.nav.settings',
    collapsed: false,
    items: [
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
  authStore.logout()
}
</script>
