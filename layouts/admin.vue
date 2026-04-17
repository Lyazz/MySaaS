<template>
  <div class="h-screen overflow-hidden flex font-sans text-slate-600" style="background: var(--admin-content-bg)" :style="adminStyle">
    <!-- Mobile Backdrop -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-20 lg:hidden"
      @click="sidebarOpen = false"
    ></div>

    <!-- Sidebar -->
    <aside :class="[
      'text-white transition-all duration-300 flex flex-col z-30 relative',
      'fixed inset-y-0 left-0 lg:static',
      sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-[68px]'
    ]" style="background: var(--admin-sidebar-bg)">
      <!-- Subtle gradient overlay for depth -->
      <div class="absolute inset-0 pointer-events-none" style="background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%); border-right: 1px solid var(--admin-sidebar-border);"></div>

      <!-- Logo/Brand -->
      <div class="h-[60px] flex items-center justify-between px-4 shrink-0 relative">
        <div class="flex items-center gap-3 overflow-hidden min-w-0">
          <template v-if="storeSettings?.logoUrl">
            <img
              :src="storeSettings.logoUrl"
              :alt="tenantName"
              class="h-7 object-contain shrink-0 transition-all duration-300"
              :class="sidebarOpen ? 'max-w-[100px]' : 'max-w-[28px]'"
            >
          </template>
          <template v-else>
            <div
              class="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shrink-0 text-sm"
              style="background: var(--brand); box-shadow: 0 0 0 1px rgba(255,255,255,0.12), 0 2px 8px rgba(0,0,0,0.3)"
            >
              {{ tenantInitial }}
            </div>
          </template>
          <span
            class="font-semibold text-[15px] tracking-tight text-white/90 truncate transition-all duration-300"
            :class="sidebarOpen ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0'"
          >
            {{ tenantName }}
          </span>
        </div>
        <button
          @click="toggleSidebar"
          class="p-1 text-slate-500 hover:text-white rounded-lg transition-colors lg:hidden shrink-0"
          :aria-label="t('admin.actions.closeSidebar')"
        >
          <Icon name="lucide:x" class="w-4 h-4" />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 py-3 px-2.5 overflow-y-auto custom-scrollbar space-y-5">
        <div v-for="entry in visibleNavGroups" :key="entry.originalIndex">
          <!-- Group Header -->
          <div v-if="entry.group.titleKey && sidebarOpen" class="px-2 mb-1.5">
            <button
              @click="toggleGroup(entry.originalIndex)"
              class="w-full flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
            >
              <span>{{ t(entry.group.titleKey) }}</span>
              <Icon
                name="lucide:chevron-down"
                class="w-3 h-3 transition-transform duration-200"
                :class="entry.group.collapsed ? '-rotate-90' : 'rotate-0'"
              />
            </button>
          </div>
          <!-- Collapsed group divider -->
          <div v-else-if="entry.group.titleKey && !sidebarOpen" class="mx-2 h-px bg-white/5 my-1"></div>

          <div
            class="space-y-0.5 transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden"
            :class="[(!entry.group.collapsed || !sidebarOpen) ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0']"
          >
            <NuxtLink
              v-for="item in entry.items"
              :key="item.path"
              :to="item.path"
              :class="[
                'group flex items-center rounded-xl transition-all duration-150 relative h-10',
                sidebarOpen ? 'px-3 gap-3' : 'px-0 justify-center',
                route.path === item.path
                  ? 'text-white'
                  : 'text-slate-400 hover:text-white'
              ]"
              :style="route.path === item.path
                ? `background: rgba(var(--brand-rgb) / 0.2); box-shadow: inset 0 0 0 1px rgba(var(--brand-rgb) / 0.3)`
                : ''"
              @mouseenter="(e: MouseEvent) => { if (route.path !== item.path) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }"
              @mouseleave="(e: MouseEvent) => { if (route.path !== item.path) (e.currentTarget as HTMLElement).style.background = '' }"
            >
              <!-- Active left accent -->
              <div
                v-if="route.path === item.path"
                class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                style="background: var(--brand)"
              ></div>

              <Icon
                :name="item.icon"
                class="w-[18px] h-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105"
                :style="route.path === item.path ? `color: var(--brand)` : ''"
              />
              <span
                class="font-medium text-[13.5px] transition-all duration-300 whitespace-nowrap overflow-hidden leading-none"
                :class="sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'"
              >
                {{ t(item.labelKey) }}
              </span>

              <!-- Tooltip (collapsed) -->
              <div
                v-if="!sidebarOpen"
                class="fixed left-[72px] px-2.5 py-1.5 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl ml-1"
                style="background: #1e2533; border: 1px solid rgba(255,255,255,0.1)"
              >
                {{ t(item.labelKey) }}
              </div>
            </NuxtLink>
          </div>
        </div>
      </nav>

      <!-- User Section -->
      <div class="p-2.5 shrink-0" style="border-top: 1px solid var(--admin-sidebar-border)">
        <div
          class="flex items-center rounded-xl p-2 cursor-pointer transition-colors hover:bg-white/6 group"
          :class="sidebarOpen ? 'gap-3' : 'justify-center'"
          style="--tw-hover-bg: rgba(255,255,255,0.06)"
          @mouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'"
          @mouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = ''"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
            style="background: rgba(var(--brand-rgb) / 0.25); box-shadow: 0 0 0 1px rgba(var(--brand-rgb) / 0.4)"
          >
            {{ userInitial }}
          </div>
          <div
            class="min-w-0 transition-all duration-300 overflow-hidden"
            :class="sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'"
          >
            <p class="text-[13px] font-medium text-slate-200 truncate leading-tight">{{ authStore.user?.email }}</p>
            <p class="text-[11px] text-slate-500 truncate mt-0.5 capitalize">{{ authStore.user?.role }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Top Bar -->
      <header class="shrink-0 bg-white sticky top-0 z-10" style="border-bottom: 1px solid #eaecf0; box-shadow: 0 1px 3px rgba(0,0,0,0.04)">
        <div class="px-5 h-[60px] flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <button
              @click="toggleSidebar"
              class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              :aria-label="t('admin.actions.toggleSidebar')"
            >
              <Icon name="lucide:panel-left" class="w-5 h-5" />
            </button>
            <div class="h-5 w-px bg-slate-200 shrink-0"></div>
            <h1 class="text-[15px] font-semibold text-slate-800 tracking-tight truncate">{{ pageTitle }}</h1>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <a
              :href="storefrontUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg border transition-all duration-150 hover:bg-slate-50"
              style="color: var(--brand); border-color: rgba(var(--brand-rgb) / 0.3); background: rgba(var(--brand-rgb) / 0.04)"
            >
              <Icon name="lucide:external-link" class="w-3.5 h-3.5" />
              <span>{{ t('admin.actions.viewStore') }}</span>
            </a>

            <LocaleSwitcher class="hidden sm:inline-flex" />

            <div class="h-6 w-px bg-slate-200 hidden sm:block"></div>

            <button
              @click="handleLogout"
              class="ui-btn ui-btn--secondary ui-btn--sm text-slate-500"
              :aria-label="t('admin.actions.logout')"
              :title="t('admin.actions.logout')"
            >
              <Icon name="lucide:log-out" class="w-3.5 h-3.5" />
              <span class="hidden sm:inline text-[13px]">{{ t('admin.actions.logout') }}</span>
            </button>
          </div>
        </div>
      </header>

      <main
        class="flex-1 overflow-y-auto custom-scrollbar"
        style="background: var(--admin-content-bg)"
        :class="route.path.startsWith('/admin/pos') ? 'p-0' : 'p-5 md:p-7'"
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

// Fetch settings immediately to prevent FOUC
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

// Compute tenant info
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

// Helper to convert hex to space-separated RGB for Tailwind
function hexToRgb(hex: string) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b)

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
    : '79 70 229' // Default teal-600
}

const adminStyle = computed(() => {
  // Use a default color instead of transparent so active icons remain visible
  const primaryColor = storeSettings.value?.primaryColor || '#4F46E5' 
  return { 
    '--brand': primaryColor,
    '--brand-rgb': hexToRgb(primaryColor)
  } as Record<string, string>
})

// Page title from route meta or default
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
    if (staffPerms.value.length === 0) {
      return item.path.startsWith('/admin/orders')
    }
    const resource = pathToResource(item.path)
    if (!resource) return false
    return staffPerms.value.includes(`${resource}:read`)
  }

  if (item.access === 'member') return true
  return role === 'owner' || role === 'admin'
}

// Navigation Groups (base)
const navGroups = ref<NavGroup[]>([
  {
    titleKey: 'admin.nav.overview',
    collapsed: false,
    items: [
      {
        path: '/admin',
        labelKey: 'admin.nav.dashboard',
        icon: 'lucide:layout-dashboard',
        access: 'admin'
      }
    ]
  },
  {
    titleKey: 'admin.nav.sales',
    collapsed: false,
    items: [
      {
        path: '/admin/pos',
        labelKey: 'admin.nav.pos',
        icon: 'lucide:monitor-smartphone',
        access: 'admin'
      },
      {
        path: '/admin/orders',
        labelKey: 'admin.nav.orders',
        icon: 'lucide:handbag',
        access: 'member'
      },
      {
        path: '/admin/sales',
        labelKey: 'admin.nav.salesItem',
        icon: 'lucide:badge-dollar-sign',
        access: 'admin'
      },
      {
        path: '/admin/cash',
        labelKey: 'admin.nav.cash',
        icon: 'lucide:wallet',
        access: 'admin'
      },
      {
        path: '/admin/delivery',
        labelKey: 'admin.nav.deliveryItem',
        icon: 'lucide:truck',
        access: 'admin'
      }
    ]
  },
  {
    titleKey: 'admin.nav.catalog',
    collapsed: false,
    items: [
      {
        path: '/admin/products',
        labelKey: 'admin.nav.products',
        icon: 'lucide:package',
        access: 'admin'
      },
      {
        path: '/admin/categories',
        labelKey: 'admin.nav.categories',
        icon: 'lucide:tags',
        access: 'admin'
      },
      {
        path: '/admin/inventory',
        labelKey: 'admin.nav.inventory',
        icon: 'lucide:warehouse',
        access: 'admin'
      },
      {
        path: '/admin/suppliers',
        labelKey: 'admin.nav.suppliers',
        icon: 'lucide:truck',
        access: 'admin'
      },
      {
        path: '/admin/purchases',
        labelKey: 'admin.nav.purchases',
        icon: 'lucide:shopping-cart',
        access: 'admin'
      }
    ]
  },
  {
    titleKey: 'admin.nav.marketing',
    collapsed: false,
    items: [
      {
        path: '/admin/customers',
        labelKey: 'admin.nav.customers',
        icon: 'lucide:users',
        access: 'admin'
      },
      {
        path: '/admin/marketing/landing-page/new',
        labelKey: 'admin.nav.landingPage',
        icon: 'lucide:megaphone',
        access: 'admin'
      }
    ]
  },
  {
    titleKey: 'admin.nav.finance',
    collapsed: false,
    items: [
      {
        path: '/admin/billing',
        labelKey: 'admin.nav.billing',
        icon: 'lucide:credit-card',
        access: 'admin'
      }
    ]
  },
  {
    titleKey: 'admin.nav.storeParameters',
    collapsed: false,
    items: [
      {
        path: '/admin/settings/appearance',
        labelKey: 'admin.nav.appearance',
        icon: 'lucide:palette',
        access: 'admin'
      },
      {
        path: '/admin/settings/homepage',
        labelKey: 'admin.nav.homepage',
        icon: 'lucide:home',
        access: 'admin'
      },
      {
        path: '/admin/settings/contact',
        labelKey: 'admin.nav.contactInfo',
        icon: 'lucide:phone',
        access: 'admin'
      },
      {
        path: '/admin/settings/functional',
        labelKey: 'admin.nav.functional',
        icon: 'lucide:sliders',
        access: 'admin'
      }
    ]
  },
  {
    titleKey: 'admin.nav.settings',
    collapsed: false,
    items: [
      {
        path: '/admin/users',
        labelKey: 'admin.nav.users',
        icon: 'lucide:user-cog',
        access: 'admin'
      },
      {
        path: '/admin/integrations',
        labelKey: 'admin.nav.integrations',
        icon: 'lucide:puzzle',
        access: 'admin'
      }
    ]
  }
])

const visibleNavGroups = computed(() => {
  const role = currentRole.value
  return navGroups.value
    .map((group, originalIndex) => ({
      group,
      originalIndex,
      items: group.items.filter((item) => hasAccess(item, role))
    }))
    .filter((entry) => entry.items.length > 0)
})

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
