<template>
  <div class="space-y-6">
    <SuperAdminPageHeader :title="t('superAdmin.analytics.title')" />

    <!-- Revenue Overview -->
    <div class="ui-card p-6">
      <h2 class="mb-2 text-sm font-semibold uppercase tracking-wider" style="color: var(--text-tertiary)">
        {{ t('superAdmin.analytics.revenue.title') }}
      </h2>
      <div class="text-4xl font-bold sm:text-5xl" style="color: var(--brand)">
        {{ formatMoney(revenueStats?.totalRevenue) }}
      </div>
      <p class="mt-2 text-sm" style="color: var(--text-tertiary)">
        {{ t('superAdmin.analytics.revenue.subtitle') }}
      </p>
    </div>

    <!-- Platform Stats Grid -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        icon="lucide:building"
        color="lime"
        :label="t('superAdmin.analytics.stats.tenants')"
        :value="platformStats?.tenants || 0"
      />
      <StatsCard
        icon="lucide:users"
        color="blue"
        :label="t('superAdmin.analytics.stats.users')"
        :value="platformStats?.users || 0"
      />
      <StatsCard
        icon="lucide:package"
        color="indigo"
        :label="t('superAdmin.analytics.stats.products')"
        :value="platformStats?.products || 0"
      />
      <StatsCard
        icon="lucide:shopping-cart"
        color="amber"
        :label="t('superAdmin.analytics.stats.orders')"
        :value="platformStats?.orders || 0"
      />
    </div>

    <!-- Revenue by Tenant -->
    <div class="ui-card p-6">
      <h2 class="mb-4 text-base font-semibold" style="color: var(--text-primary)">
        {{ t('superAdmin.analytics.byTenant.title') }}
      </h2>

      <SuperAdminLoadingState
        v-if="loading"
        :label="t('superAdmin.analytics.byTenant.loading')"
      />
      <SuperAdminEmptyState
        v-else-if="!revenueByTenant || revenueByTenant.length === 0"
        icon="lucide:bar-chart-2"
        :title="t('superAdmin.analytics.byTenant.empty')"
      />
      <div
        v-else
        class="space-y-4"
      >
        <div
          v-for="item in sortedRevenueByTenant"
          :key="item.tenantId"
        >
          <div class="flex items-baseline justify-between gap-4">
            <div class="min-w-0">
              <p class="truncate font-medium" style="color: var(--text-primary)">
                {{ getTenantName(item.tenantId) }}
              </p>
              <p class="text-xs" style="color: var(--text-tertiary)">
                {{ item.tenantSlug }}
              </p>
            </div>
            <div class="shrink-0 text-end">
              <p class="font-semibold" style="color: var(--brand)">
                {{ formatMoney(item.revenue) }}
              </p>
              <p class="text-xs" style="color: var(--text-tertiary)">
                {{ revenueShare(item.revenue) }}%
              </p>
            </div>
          </div>
          <div class="mt-2 h-1.5 overflow-hidden rounded-full" style="background: var(--surface-2)">
            <div
              class="h-full rounded-full transition-all"
              style="background: var(--brand)"
              :style="{ width: `${revenueShare(item.revenue)}%` }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Top Performing Tenants -->
    <div class="ui-card overflow-hidden">
      <div class="ui-card-header">
        <h2 class="text-base font-semibold" style="color: var(--text-primary)">
          {{ t('superAdmin.analytics.topTenants.title') }}
        </h2>
      </div>

      <SuperAdminLoadingState
        v-if="loading"
        :label="t('superAdmin.analytics.byTenant.loading')"
      />
      <SuperAdminEmptyState
        v-else-if="topTenants.length === 0"
        icon="lucide:trophy"
        :title="t('superAdmin.analytics.byTenant.empty')"
      />
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="ui-table">
          <thead class="ui-thead border-b border-slate-200">
            <tr>
              <th class="ui-th">
                {{ t('superAdmin.analytics.topTenants.table.rank') }}
              </th>
              <th class="ui-th">
                {{ t('superAdmin.analytics.topTenants.table.tenant') }}
              </th>
              <th class="ui-th text-end">
                {{ t('superAdmin.analytics.topTenants.table.revenue') }}
              </th>
              <th class="ui-th text-end">
                {{ t('superAdmin.analytics.topTenants.table.orders') }}
              </th>
              <th class="ui-th text-end">
                {{ t('superAdmin.analytics.topTenants.table.products') }}
              </th>
            </tr>
          </thead>
          <tbody class="ui-tbody">
            <tr
              v-for="(tenant, index) in topTenants"
              :key="tenant.id"
              class="ui-tr transition-colors"
            >
              <td class="ui-td">
                <span
                  class="ui-badge"
                  :class="index < 3 ? 'ui-badge--lime' : 'ui-badge--slate'"
                >
                  #{{ index + 1 }}
                </span>
              </td>
              <td class="ui-td">
                <p class="font-medium" style="color: var(--text-primary)">
                  {{ tenant.name }}
                </p>
                <p class="text-sm" style="color: var(--text-tertiary)">
                  {{ tenant.slug }}
                </p>
              </td>
              <td class="ui-td text-end font-semibold" style="color: var(--brand)">
                {{ formatMoney(tenant.revenue) }}
              </td>
              <td class="ui-td text-end" style="color: var(--text-secondary)">
                {{ tenant._count?.orders || 0 }}
              </td>
              <td class="ui-td text-end" style="color: var(--text-secondary)">
                {{ tenant._count?.products || 0 }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { formatPriceAmount } from '~/shared/pricing/money-format'
import StatsCard from '~/components/StatsCard.vue'
import SuperAdminPageHeader from '~/components/super-admin/SuperAdminPageHeader.vue'
import SuperAdminEmptyState from '~/components/super-admin/SuperAdminEmptyState.vue'
import SuperAdminLoadingState from '~/components/super-admin/SuperAdminLoadingState.vue'

definePageMeta({
  middleware: 'super-admin',
  layout: 'super-admin'
})

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const loading = ref(true)
const platformStats = ref<any>(null)
const revenueStats = ref<any>(null)
const revenueByTenant = ref<any[]>([])
const tenants = ref<any[]>([])

const sortedRevenueByTenant = computed(() => {
  if (!revenueByTenant.value) return []
  return [...revenueByTenant.value]
    .sort((a, b) => b.revenue - a.revenue)
})

const topTenants = computed(() => {
  if (!tenants.value || !revenueByTenant.value) return []

  return tenants.value
    .map(tenant => {
      const revenueData = revenueByTenant.value.find(r => r.tenantId === tenant.id)
      return {
        ...tenant,
        revenue: revenueData?.revenue || 0
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
})

const getTenantName = (tenantId: string) => {
  const tenant = tenants.value.find(t => t.id === tenantId)
  return tenant?.name || t('superAdmin.analytics.byTenant.unknownTenant')
}

const revenueShare = (amount: number) => {
  const total = revenueStats.value?.totalRevenue || 0
  if (!total) return '0.0'
  return ((amount / total) * 100).toFixed(1)
}

const formatMoney = (amount: number | null | undefined) => {
  return `${formatPriceAmount(amount ?? 0)} DA`
}

onMounted(async () => {
  try {
    loading.value = true
    const token = authStore.token

    // Fetch all data in parallel
    const [statsRes, revenueRes, tenantsRes] = await Promise.all([
      $fetch('/api/super-admin/stats/platform', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      $fetch('/api/super-admin/stats/revenue', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      $fetch<any[]>('/api/super-admin/tenants', {
        headers: { Authorization: `Bearer ${token}` }
      })
    ])

    platformStats.value = statsRes
    revenueStats.value = revenueRes
    tenants.value = tenantsRes

    // Extract revenue by tenant and enrich with tenant info
    if (revenueRes.byTenant) {
      revenueByTenant.value = revenueRes.byTenant.map((item: any) => {
        const tenant = tenantsRes.find(t => t.id === item.tenantId)
        return {
          ...item,
          tenantSlug: tenant?.slug || 'unknown'
        }
      })
    }
  } catch (error) {
    console.error('Failed to load analytics:', error)
  } finally {
    loading.value = false
  }
})
</script>
