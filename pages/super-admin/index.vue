<template>
  <div class="space-y-6">
    <SuperAdminPageHeader
      :title="t('superAdmin.dashboard.overview.title')"
      :subtitle="t('superAdmin.dashboard.overview.subtitle')"
    />

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        icon="lucide:building"
        color="lime"
        :label="t('superAdmin.dashboard.stats.tenants')"
        :value="platformStats?.tenants || 0"
      />
      <StatsCard
        icon="lucide:users"
        color="blue"
        :label="t('superAdmin.dashboard.stats.users')"
        :value="platformStats?.users || 0"
      />
      <StatsCard
        icon="lucide:package"
        color="indigo"
        :label="t('superAdmin.dashboard.stats.products')"
        :value="platformStats?.products || 0"
      />
      <StatsCard
        icon="lucide:dollar-sign"
        color="emerald"
        :label="t('superAdmin.dashboard.stats.revenue')"
        :value="formatMoney(revenueStats?.totalRevenue)"
      />
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Recent Activity -->
      <div class="ui-card overflow-hidden">
        <div class="ui-card-header flex items-center justify-between">
          <h3
 class="text-base font-semibold text-primary"
 
>
            {{ t('superAdmin.dashboard.recentActivity.title') }}
          </h3>
          <NuxtLink
 to="/super-admin/audit-logs"
 class="text-sm font-medium hover:underline text-brand"
 
>
            {{ t('superAdmin.dashboard.recentActivity.viewAll') }}
          </NuxtLink>
        </div>

        <SuperAdminLoadingState
          v-if="loading"
          :label="t('admin.common.loading')"
        />
        <SuperAdminEmptyState
          v-else-if="recentLogs.length === 0"
          icon="lucide:history"
          :title="t('superAdmin.dashboard.recentActivity.empty')"
        />
        <div
 v-else
 class="divide-y border-line"
 
>
          <div
            v-for="log in recentLogs"
            :key="log.id"
            class="flex items-start gap-4 p-4 transition-colors"
            style="--tw-bg-opacity: 1"
            @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)' }"
            @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }"
          >
            <div
              class="ui-icon-tile h-10 w-10 shrink-0"
              :class="`ui-icon-tile--${getAuditActionMeta(log.action).color}`"
            >
              <Icon
                :name="getAuditActionMeta(log.action).icon"
                class="h-4 w-4"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p
 class="text-sm font-medium text-primary"
 
>
                {{ formatAction(log.action) }}
              </p>
              <p
 class="truncate text-sm text-secondary"
 
>
                {{ log.details }}
              </p>
              <p
 class="mt-1 text-xs text-tertiary"
 
>
                {{ formatDate(log.createdAt) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="ui-card overflow-hidden">
        <div class="ui-card-header">
          <h3
 class="text-base font-semibold text-primary"
 
>
            {{ t('superAdmin.dashboard.quickActions.title') }}
          </h3>
        </div>
        <div class="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <NuxtLink
 v-for="action in quickActions"
 :key="action.to"
 :to="action.to"
 class="group flex items-center gap-4 rounded-xl p-4 transition-all border border-line surface-2"
 
 @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--surface-border-hover)' }"
 @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--surface-border)' }"
>
            <div
              class="ui-icon-tile"
              :class="`ui-icon-tile--${action.color}`"
            >
              <Icon
                :name="action.icon"
                class="h-5 w-5"
              />
            </div>
            <div class="min-w-0">
              <p
 class="font-medium text-primary"
 
>
                {{ action.title }}
              </p>
              <p
 class="mt-0.5 text-xs text-tertiary"
 
>
                {{ action.subtitle }}
              </p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { formatPriceAmount } from '~/shared/pricing/money-format'
import { getAuditActionMeta } from '~/composables/superAdminAuditAction'
import StatsCard from '~/components/StatsCard.vue'
import SuperAdminPageHeader from '~/components/super-admin/SuperAdminPageHeader.vue'
import SuperAdminEmptyState from '~/components/super-admin/SuperAdminEmptyState.vue'
import SuperAdminLoadingState from '~/components/super-admin/SuperAdminLoadingState.vue'

const { t, locale } = useI18n({ useScope: 'global' })

definePageMeta({
  middleware: 'super-admin',
  layout: 'super-admin', // Explicitly use super-admin layout
  title: 'Platform Dashboard'
})

const loading = ref(true)
const platformStats = ref<any>(null)
const revenueStats = ref<any>(null)
const recentLogs = ref<any[]>([])

const authStore = useAuthStore()

const formatMoney = (amount: number | null | undefined) => `${formatPriceAmount(amount ?? 0)} DA`

onMounted(async () => {
  try {
    // Fetch platform stats
    const statsResponse = await $fetch('/api/super-admin/stats/platform', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    platformStats.value = statsResponse

    // Fetch revenue stats
    const revenueResponse = await $fetch('/api/super-admin/stats/revenue', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    revenueStats.value = revenueResponse

    // Fetch recent audit logs
    const logsResponse = await $fetch<any[]>('/api/super-admin/audit-logs', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    recentLogs.value = logsResponse.slice(0, 5) // Show only 5 most recent
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  } finally {
    loading.value = false
  }
})

const quickActions = computed(() => [
  {
    to: '/super-admin/tenants',
    icon: 'lucide:plus',
    color: 'lime' as const,
    title: t('superAdmin.dashboard.quickActions.createTenant.title'),
    subtitle: t('superAdmin.dashboard.quickActions.createTenant.subtitle')
  },
  {
    to: '/super-admin/tenants',
    icon: 'lucide:building',
    color: 'blue' as const,
    title: t('superAdmin.dashboard.quickActions.manageTenants.title'),
    subtitle: t('superAdmin.dashboard.quickActions.manageTenants.subtitle')
  },
  {
    to: '/super-admin/analytics',
    icon: 'lucide:bar-chart-2',
    color: 'indigo' as const,
    title: t('superAdmin.dashboard.quickActions.viewAnalytics.title'),
    subtitle: t('superAdmin.dashboard.quickActions.viewAnalytics.subtitle')
  }
])

const formatAction = (action: string) => {
  const meta = getAuditActionMeta(action)
  if (meta.labelKey) return t(meta.labelKey)
  return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

const formatDate = (date: string) => {
  const iso = locale.value === 'fr' ? 'fr-FR' : locale.value === 'ar' ? 'ar-DZ' : 'en-US'
  return new Date(date).toLocaleString(iso, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
