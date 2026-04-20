<template>
  <div class="min-h-screen bg-slate-50 flex font-sans text-slate-600" :style="superAdminStyle">
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
          <div 
            class="w-8 h-8 rounded-lg flex items-center justify-center font-sans font-bold text-white shadow-lg shrink-0 transition-colors [background:var(--brand)]"
          >
            S
          </div>
          <span 
            class="font-sans font-semibold text-lg tracking-wide truncate transition-all duration-300"
            :class="sidebarOpen ? 'opacity-100' : 'opacity-0 lg:hidden'"
          >
            {{ t('superAdmin.layout.brand') }}
          </span>
        </div>
        <button 
          @click="toggleSidebar" 
          class="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors lg:hidden"
          :aria-label="t('superAdmin.layout.closeSidebar')"
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
            class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full [background:var(--brand)]"
          ></div>

          <div class="relative shrink-0">
            <Icon 
              :name="item.icon" 
              class="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
              :class="route.path === item.path ? '[color:rgba(var(--brand-rgb)/0.85)]' : ''"
            />
            <!-- Pending badge on collapsed icon -->
            <span
              v-if="item.badge && !sidebarOpen"
              class="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 bg-amber-400 text-slate-900 text-[9px] font-bold rounded-full flex items-center justify-center leading-none"
            >
              {{ item.badge }}
            </span>
          </div>

          <span 
            class="font-medium text-sm transition-all duration-300 whitespace-nowrap overflow-hidden flex-1"
            :class="sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'"
          >
            {{ item.label }}
          </span>

          <!-- Pending badge on expanded label -->
          <span
            v-if="item.badge && sidebarOpen"
            class="ml-auto shrink-0 min-w-[20px] h-5 px-1.5 bg-amber-400 text-slate-900 text-[10px] font-bold rounded-full flex items-center justify-center leading-none"
          >
            {{ item.badge }}
          </span>
          
          <!-- Tooltip for collapsed state -->
          <div 
            v-if="!sidebarOpen" 
            class="fixed left-16 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl border border-white/10 ml-2"
          >
            {{ item.label }}
            <span v-if="item.badge" class="ml-1.5 bg-amber-400 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {{ item.badge }}
            </span>
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
            <p class="text-xs text-slate-500 truncate mt-0.5">{{ t('superAdmin.layout.role') }}</p>
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
              :aria-label="t('superAdmin.layout.toggleSidebar')"
            >
              <Icon name="lucide:menu" class="w-6 h-6" />
            </button>
            <h1 class="text-xl font-sans font-semibold text-slate-800 tracking-tight">{{ pageTitle }}</h1>
          </div>
          
          <div class="flex items-center gap-4">
            <button 
              @click="handleLogout" 
              class="ui-btn ui-btn--danger ui-btn--md"
              :aria-label="t('superAdmin.actions.logout')"
              :title="t('superAdmin.actions.logout')"
            >
              <Icon name="lucide:log-out" class="w-4 h-4" />
              <span class="hidden sm:inline">{{ t('superAdmin.actions.logout') }}</span>
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

const authStore = useAuthStore()
const route = useRoute()
const sidebarOpen = ref(false)
const { t } = useI18n({ useScope: 'global' })
const pendingPaymentsCount = ref(0)
const superAdminStyle = {
  '--brand': '#FF7A45',
  '--brand-rgb': '255 122 69'
} as Record<string, string>

onMounted(async () => {
  if (window.innerWidth >= 1024) {
    sidebarOpen.value = true
  }
  await loadPendingCount()
})

async function loadPendingCount() {
  try {
    const res = await $fetch('/api/super-admin/billing/pending-payments', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    }) as { payments: any[] }
    pendingPaymentsCount.value = res?.payments?.length ?? 0
  } catch {
    // silently fail — badge is non-critical
  }
}

const userInitial = computed(() => authStore.user?.email?.charAt(0).toUpperCase() || 'S')

const pageTitle = computed(() => {
  const meta = route.meta.title as string
  return meta || t('superAdmin.layout.defaultTitle')
})

const navItems = computed(() => [
  {
    path: '/super-admin',
    label: t('superAdmin.nav.dashboard'),
    icon: 'lucide:layout-dashboard',
    badge: 0
  },
  {
    path: '/super-admin/tenants',
    label: t('superAdmin.nav.tenants'),
    icon: 'lucide:building',
    badge: 0
  },
  {
    path: '/super-admin/payments',
    label: t('superAdmin.nav.payments', 'Payments'),
    icon: 'lucide:clock',
    badge: pendingPaymentsCount.value
  },
  {
    path: '/super-admin/analytics',
    label: t('superAdmin.nav.analytics'),
    icon: 'lucide:bar-chart-2',
    badge: 0
  },
  {
    path: '/super-admin/audit-logs',
    label: t('superAdmin.nav.auditLogs'),
    icon: 'lucide:history',
    badge: 0
  }
])

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function handleLogout() {
  authStore.logout()
  navigateTo('/super-admin/login')
}
</script>
