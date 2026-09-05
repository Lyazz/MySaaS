<template>
  <div
 class="super-admin-shell admin-shell min-h-screen flex font-sans bg-admin text-secondary"
 
 :style="superAdminStyle"
>
    <!-- Mobile Backdrop -->
    <div 
      v-if="sidebarOpen" 
      class="fixed inset-0 surface-1 backdrop-blur-sm z-20 lg:hidden transition-opacity"
      @click="sidebarOpen = false"
    ></div>

    <!-- Sidebar -->
    <aside class="bg-sidebar border-e border-sidebar" :class="[
 'text-primary transition-all duration-300 flex flex-col shadow-2xl z-30',
 'fixed inset-y-0 start-0 lg:static', // Mobile fixed, Desktop static
 sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0 lg:w-20'
 ]">
      <!-- Logo/Brand -->
      <div class="h-16 flex items-center justify-between px-6 border-b border-line bg-sidebar">
        <div class="flex items-center gap-3 overflow-hidden">
          <SaaSLogo
            size="md"
            :show-wordmark="false"
            :alt="t('superAdmin.layout.brand')"
            class="shrink-0"
          />
          <span 
            class="font-sans font-semibold text-lg tracking-wide truncate transition-all duration-300"
            :class="sidebarOpen ? 'opacity-100' : 'opacity-0 lg:hidden'"
          >
            {{ t('superAdmin.layout.brand') }}
          </span>
        </div>
        <button 
          @click="toggleSidebar" 
          class="p-1.5 text-tertiary hover:text-primary hover:bg-hover rounded-lg transition-colors lg:hidden"
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
          active-class="text-primary surface-3 shadow-sm ring-1 ring-white/20"
          :class="['text-tertiary hover:text-primary hover:bg-hover', sidebarOpen ? 'justify-start gap-3' : 'justify-center gap-0']"
        >
          <!-- Active Indicator Strip -->
          <div 
            v-if="route.path === item.path"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-e-full [background:var(--brand)]"
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
 class="absolute -top-1.5 -end-1.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full px-0.5 text-micro font-bold leading-none text-brand-contrast bg-brand"
 
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
 class="ms-auto flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-micro font-bold leading-none text-brand-contrast bg-brand"
 
>
            {{ item.badge }}
          </span>
          
          <!-- Tooltip for collapsed state -->
          <div 
            v-if="!sidebarOpen" 
            class="fixed start-16 px-3 py-1.5 surface-2 text-brand-contrast text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl border border-line ms-2"
          >
            {{ item.label }}
            <span v-if="item.badge" class="ms-1.5 rounded-full px-1.5 py-0.5 text-micro font-bold text-brand-contrast bg-brand">
              {{ item.badge }}
            </span>
          </div>
        </NuxtLink>
      </nav>

      <!-- User Section -->
      <div class="p-4 border-t border-line bg-black/20">
        <div 
          class="flex items-center rounded-xl hover:bg-hover transition-colors cursor-pointer group"
          :class="sidebarOpen ? 'gap-3 p-2' : 'gap-0 justify-center p-2'"
        >
          <div class="w-10 h-10 rounded-full surface-2 flex items-center justify-center text-sm font-bold text-tertiary ring-2 ring-transparent group-hover:ring-white/20 transition-all shrink-0">
            {{ userInitial }}
          </div>
          <div 
            class="min-w-0 transition-all duration-300 overflow-hidden"
            :class="sidebarOpen ? 'w-auto opacity-100 ms-3' : 'w-0 opacity-0 ms-0'"
          >
            <p class="text-sm font-medium text-secondary truncate">{{ authStore.user?.email }}</p>
            <p class="text-xs text-secondary truncate mt-0.5">{{ t('superAdmin.layout.role') }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden relative">
      <!-- Top Bar -->
      <header
        class="backdrop-blur-md sticky top-0 z-10 shadow-sm"
        style="background: color-mix(in srgb, var(--admin-topbar-bg), transparent 8%); border-bottom: 1px solid var(--admin-topbar-border);"
      >
        <div class="px-6 h-16 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button 
 @click="toggleSidebar" 
 class="p-2 -ms-2 rounded-lg transition-colors text-secondary"
 
 @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)' }"
 @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }"
 :aria-label="t('superAdmin.layout.toggleSidebar')"
>
              <Icon name="lucide:menu" class="w-6 h-6" />
            </button>
            <h1 class="text-xl font-sans font-semibold tracking-tight text-primary">{{ pageTitle }}</h1>
            <span
 class="hidden sm:inline-block text-micro font-mono tracking-wide text-muted"
 
 :title="`Build ${buildMarker}`"
>
              {{ buildMarker }}
            </span>
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
      <main class="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-admin">
        <div class="super-admin-content max-w-7xl mx-auto animate-fadeIn">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import SaaSLogo from '~/components/branding/SaaSLogo.vue'

const authStore = useAuthStore()
const route = useRoute()
const sidebarOpen = ref(false)
const { t } = useI18n({ useScope: 'global' })
const pendingPaymentsCount = ref(0)
const pendingDeviceRequestsCount = ref(0)
const previousTheme = ref<string | null>(null)
const superAdminStyle = {
  '--brand': '#C6F432',
  '--brand-rgb': '198 244 50'
} as Record<string, string>

// Visible marker so a fresh deploy is trivially distinguishable from a cached
// build in the browser. Bump this string whenever you need to confirm a new
// deploy actually landed.
const buildMarker = '2026-08-10-2'

onMounted(async () => {
  if (import.meta.client) {
    previousTheme.value = document.documentElement.dataset.theme || null
    document.documentElement.dataset.theme = 'dark'
  }
  if (window.innerWidth >= 1024) {
    sidebarOpen.value = true
  }
  await loadPendingCount()
  await loadPendingDeviceRequests()
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  if (previousTheme.value) {
    document.documentElement.dataset.theme = previousTheme.value
    return
  }
  document.documentElement.removeAttribute('data-theme')
})

async function loadPendingDeviceRequests() {
  try {
    const res = await $fetch('/api/super-admin/activation/requests?status=PENDING', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    }) as { requests: any[] }
    pendingDeviceRequestsCount.value = res?.requests?.length ?? 0
  } catch {
    // silently fail — badge is non-critical
  }
}

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
    path: '/super-admin/devices',
    label: t('superAdmin.nav.devices', 'Devices'),
    icon: 'lucide:smartphone',
    badge: pendingDeviceRequestsCount.value
  },
  {
    path: '/super-admin/ai',
    label: t('superAdmin.nav.ai', 'AI'),
    icon: 'lucide:sparkles',
    badge: 0
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

<style>
/*
 * The shell used to carry ~30 rules whose only job was repainting hardcoded
 * `bg-white` / `text-slate-*` back to dark. Those screens now use the token
 * utilities directly, so the overrides are gone. What is left is the input
 * styling for the handful of native controls that are not `.ui-input` yet.
 */
.super-admin-shell .super-admin-content :is(input, select, textarea):not(.ui-input) {
  background: var(--surface-2);
  border-color: var(--surface-border);
  color: var(--text-primary);
}

.super-admin-shell .super-admin-content code {
  background: var(--surface-2);
  color: var(--text-secondary);
  border-color: var(--surface-border);
}
</style>
