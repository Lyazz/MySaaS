<template>
  <div class="min-h-screen bg-slate-50 flex font-sans text-slate-600" :style="adminStyle">
    <!-- Sidebar -->
    <!-- Mobile Backdrop -->
    <div 
      v-if="sidebarOpen" 
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 lg:hidden transition-opacity"
      @click="sidebarOpen = false"
    ></div>

    <!-- Sidebar -->
    <aside :class="[
      'bg-slate-950 text-white transition-all duration-300 flex flex-col shadow-2xl z-30',
      'fixed inset-y-0 left-0 lg:static', // Mobile fixed, Desktop static
      sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0 lg:w-20'
    ]">
      <!-- Logo/Brand -->
      <div class="h-16 flex items-center justify-between px-6 bg-slate-950 border-b border-white/5">
        <div class="flex items-center gap-3 overflow-hidden">
          <template v-if="storeSettings?.logoUrl">
            <img 
              :src="storeSettings.logoUrl" 
              :alt="tenantName" 
              class="h-8 max-w-[32px] object-contain shrink-0"
              :class="sidebarOpen ? 'max-w-[120px]' : 'max-w-[32px]'"
            >
          </template>
          <template v-else>
            <div 
              class="w-8 h-8 rounded-lg flex items-center justify-center font-sans font-bold text-white shadow-lg shrink-0 transition-colors"
              :style="{ backgroundColor: 'var(--brand)' }"
            >
              {{ tenantInitial }}
            </div>
          </template>
          <span 
            class="font-sans font-semibold text-lg tracking-wide truncate transition-all duration-300"
            :class="sidebarOpen ? 'opacity-100' : 'opacity-0 lg:hidden'"
          >
            {{ tenantName }}
          </span>
        </div>
        <button 
          @click="toggleSidebar" 
          class="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors lg:hidden"
          aria-label="Close sidebar"
        >
          <Icon name="lucide:x" class="w-5 h-5" />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="group flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 mb-1 relative overflow-hidden h-11"
          active-class="text-white bg-white/10 shadow-sm ring-1 ring-white/20"
          :class="['text-slate-400 hover:text-white hover:bg-white/5', sidebarOpen ? 'justify-start gap-3' : 'justify-center gap-0']"
        >
          <!-- Active Indicator Strip -->
          <div 
            v-if="route.path === item.path"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
            :style="{ backgroundColor: 'var(--brand)' }"
          ></div>

          <Icon 
            :name="item.icon" 
            class="w-5 h-5 transition-transform duration-300 group-hover:scale-110 shrink-0"
            :style="route.path === item.path ? { color: 'var(--brand)' } : {}"
          />
          <span 
            class="font-medium text-sm transition-all duration-300 whitespace-nowrap overflow-hidden"
            :class="sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'"
          >
            {{ item.label }}
          </span>
          
          <!-- Tooltip for collapsed state -->
          <div 
            v-if="!sidebarOpen" 
            class="fixed left-16 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl border border-white/10 ml-2"
          >
            {{ item.label }}
          </div>
        </NuxtLink>
      </nav>

      <!-- User Section -->
      <div class="p-4 border-t border-white/5 bg-black/20">
        <div 
          class="flex items-center rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
          :class="sidebarOpen ? 'gap-3 p-2' : 'gap-0 justify-center p-2'"
        >
          <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-300 ring-2 ring-transparent group-hover:ring-white/20 transition-all shrink-0">
            {{ userInitial }}
          </div>
          <div 
            class="min-w-0 transition-all duration-300 overflow-hidden"
            :class="sidebarOpen ? 'w-auto opacity-100 ml-3' : 'w-0 opacity-0 ml-0'"
          >
            <p class="text-sm font-medium text-slate-200 truncate">{{ authStore.user?.email }}</p>
            <p class="text-xs text-slate-500 truncate mt-0.5">{{ authStore.user?.role }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden relative">
      <!-- Top Bar -->
      <header class="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/60 shadow-sm">
        <div class="px-6 h-16 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button 
              @click="toggleSidebar" 
              class="p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              <Icon name="lucide:menu" class="w-6 h-6" />
            </button>
            <h1 class="text-xl font-sans font-semibold text-slate-800 tracking-tight">{{ pageTitle }}</h1>
          </div>
          
          <div class="flex items-center gap-4">
            <a
              :href="storefrontUrl"
              class="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand bg-slate-50 rounded-lg transition-all border border-slate-200 hover:border-brand"
            >
              <Icon name="lucide:external-link" class="w-4 h-4" />
              <span>View Store</span>
            </a>
            
            <div class="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            <button 
              @click="handleLogout" 
              class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <Icon name="lucide:log-out" class="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 custom-scrollbar">
        <div class="max-w-7xl mx-auto animate-fadeIn">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { toTenantHost, useRequestOrigin } from '~/composables/host'

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
    sidebarOpen.value = true
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
  const tenantHost = toTenantHost(host, slug)
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
  const meta = route.meta.title as string
  return meta || 'Admin Dashboard'
})

// Navigation items with icon components
const navItems = [
  {
    path: '/admin',
    label: 'Dashboard',
    icon: 'lucide:layout-dashboard'
  },
  {
    path: '/admin/products',
    label: 'Products',
    icon: 'lucide:package'
  },
  {
    path: '/admin/categories',
    label: 'Categories',
    icon: 'lucide:tags'
  },
  {
    path: '/admin/orders',
    label: 'Orders',
    icon: 'lucide:handbag' // or clipboard-list
  },
  {
    path: '/admin/settings/appearance',
    label: 'Appearance Settings',
    icon: 'lucide:palette'
  },
  {
    path: '/admin/settings/functional',
    label: 'Functional Settings',
    icon: 'lucide:sliders'
  },
  {
    path: '/admin/delivery',
    label: 'Delivery',
    icon: 'lucide:truck'
  }
]

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function handleLogout() {
  authStore.logout()
}
</script>
