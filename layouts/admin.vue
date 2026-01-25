<template>
  <div class="min-h-screen bg-slate-50 flex font-sans text-slate-600" :style="adminStyle">
    <!-- Sidebar -->
    <aside :class="[
      'bg-slate-900 text-white transition-all duration-300 flex flex-col shadow-xl z-20',
      sidebarOpen ? 'w-72' : 'w-20'
    ]">
      <!-- Logo/Brand -->
      <div class="h-16 flex items-center justify-between px-6 bg-slate-950/50 border-b border-white/5">
        <div class="flex items-center gap-3 overflow-hidden">
          <div class="w-8 h-8 rounded-xl bg-brand flex items-center justify-center font-display font-bold text-white shadow-lg shrink-0">
            {{ tenantInitial }}
          </div>
          <span v-if="sidebarOpen" class="font-display font-semibold text-lg tracking-wide truncate transition-opacity duration-300">{{ tenantName }}</span>
        </div>
        <button 
          @click="toggleSidebar" 
          class="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors lg:hidden"
          aria-label="Toggle sidebar"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="group flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 mb-1"
          active-class="bg-indigo-600/10 text-indigo-400 shadow-sm ring-1 ring-indigo-500/20"
          :class="['text-slate-400 hover:text-white hover:bg-white/5']"
        >
          <component 
            :is="item.icon" 
            class="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
            :class="sidebarOpen ? 'mr-3' : 'mx-auto'"
          />
          <span v-if="sidebarOpen" class="font-medium text-sm transition-opacity duration-300">{{ item.label }}</span>
          
          <!-- Tooltip for collapsed state (optional optimization) -->
          <div v-if="!sidebarOpen" class="absolute left-16 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg border border-white/10">
            {{ item.label }}
          </div>
        </NuxtLink>
      </nav>

      <!-- User Section -->
      <div class="p-4 border-t border-white/5 bg-slate-900/50">
        <div class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
          <div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 ring-2 ring-transparent group-hover:ring-indigo-500/50 transition-all">
            {{ userInitial }}
          </div>
          <div v-if="sidebarOpen" class="flex-1 min-w-0 transition-opacity duration-300">
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
              class="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <h1 class="text-xl font-display font-semibold text-slate-800 tracking-tight">{{ pageTitle }}</h1>
          </div>
          
          <div class="flex items-center gap-4">
            <a
              :href="storefrontUrl"
              class="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand bg-slate-50 rounded-lg transition-all border border-slate-200 hover:border-brand"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>View Store</span>
            </a>
            
            <div class="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            <button 
              @click="handleLogout" 
              class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
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
const sidebarOpen = ref(true)
const storeSettings = useState<any>('storeSettings')

const adminStyle = computed(() => {
  const primaryColor = storeSettings.value?.primaryColor || '#4F46E5'
  return { '--brand': primaryColor } as Record<string, string>
})

// Compute tenant info
const tenantName = computed(() => authStore.user?.tenant?.name || 'MySaaS')
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
    icon: defineComponent({
      template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`
    })
  },
  {
    path: '/admin/onboarding',
    label: 'Store setup',
    icon: defineComponent({
      template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100 4 2 2 0 000-4zm0 0a2 2 0 110 4m0-4v-2m0 6v2m12-6a2 2 0 100 4 2 2 0 000-4zm0 0a2 2 0 110 4m0-4v-2m0 6v2M3 12h2m-2 0a2 2 0 104 0m-4 0a2 2 0 114 0m14 0h2m-2 0a2 2 0 104 0m-4 0a2 2 0 114 0M12 12v2m0 0a2 2 0 100 4m0-4a2 2 0 110 4"/></svg>`
    })
  },
  {
    path: '/admin/products',
    label: 'Products',
    icon: defineComponent({
      template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`
    })
  },
  {
    path: '/admin/categories',
    label: 'Categories',
    icon: defineComponent({
      template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>`
    })
  },
  {
    path: '/admin/orders',
    label: 'Orders',
    icon: defineComponent({
      template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>`
    })
  }
]

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function handleLogout() {
  authStore.logout()
}
</script>
