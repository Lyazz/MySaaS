<template>
  <NuxtLayout name="super-admin">
    <div class="space-y-6">
      <h1 class="text-3xl font-bold text-gray-800">
        Platform Analytics
      </h1>

      <!-- Revenue Overview -->
      <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">
          Total Platform Revenue
        </h2>
        <div class="text-5xl font-bold text-teal-600">
          ${{ revenueStats?.totalRevenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00' }}
        </div>
        <p class="text-gray-500 mt-2">
          From confirmed, shipped, and delivered orders
        </p>
      </div>

      <!-- Platform Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          icon="🏢"
          label="Active Tenants"
          :value="platformStats?.tenants || 0"
          color="teal"
          class="bg-white border border-slate-200 shadow-sm"
        />
        <StatsCard
          icon="👥"
          label="Total Users"
          :value="platformStats?.users || 0"
          color="blue"
          class="bg-white border border-slate-200 shadow-sm"
        />
        <StatsCard
          icon="📦"
          label="Total Products"
          :value="platformStats?.products || 0"
          color="green"
          class="bg-white border border-slate-200 shadow-sm"
        />
        <StatsCard
          icon="🛒"
          label="Total Orders"
          :value="platformStats?.orders || 0"
          color="orange"
          class="bg-white border border-slate-200 shadow-sm"
        />
      </div>

      <!-- Revenue by Tenant -->
      <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">
          Revenue by Tenant
        </h2>
        
        <div
          v-if="loading"
          class="text-center text-gray-500 py-8"
        >
          Loading...
        </div>
        <div
          v-else-if="!revenueByTenant || revenueByTenant.length === 0" 
          class="text-center text-gray-500 py-8"
        >
          No revenue data available
        </div>
        <div
          v-else
          class="space-y-3"
        >
          <div
            v-for="item in sortedRevenueByTenant"
            :key="item.tenantId"
            class="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-100"
          >
            <div class="flex-1">
              <p class="text-gray-800 font-medium">
                {{ getTenantName(item.tenantId) }}
              </p>
              <p class="text-gray-500 text-sm">
                {{ item.tenantSlug }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-2xl font-bold text-teal-600">
                ${{ item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </p>
              <p class="text-gray-500 text-sm">
                {{ ((item.revenue / (revenueStats?.totalRevenue || 1)) * 100).toFixed(1) }}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Performing Tenants -->
      <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">
          Top Performing Tenants
        </h2>
        
        <div class="overflow-x-auto">
          <table class="ui-table">
            <thead class="ui-thead border-b border-slate-200">
              <tr>
                <th class="ui-th">
                  Rank
                </th>
                <th class="ui-th">
                  Tenant
                </th>
                <th class="ui-th text-right">
                  Revenue
                </th>
                <th class="ui-th text-right">
                  Orders
                </th>
                <th class="ui-th text-right">
                  Products
                </th>
              </tr>
            </thead>
            <tbody class="ui-tbody">
              <tr
                v-for="(tenant, index) in topTenants"
                :key="tenant.id"
                class="ui-tr transition-colors"
              >
                <td class="px-4 py-3 text-gray-800">
                  <span
                    v-if="index === 0"
                    class="text-2xl"
                  >🥇</span>
                  <span
                    v-else-if="index === 1"
                    class="text-2xl"
                  >🥈</span>
                  <span
                    v-else-if="index === 2"
                    class="text-2xl"
                  >🥉</span>
                  <span
                    v-else
                    class="text-gray-500 ml-2"
                  >{{ index + 1 }}</span>
                </td>
                <td class="px-4 py-3">
                  <p class="text-gray-800 font-medium">
                    {{ tenant.name }}
                  </p>
                  <p class="text-gray-500 text-sm">
                    {{ tenant.slug }}
                  </p>
                </td>
                <td class="px-4 py-3 text-right text-teal-600 font-semibold">
                  ${{ tenant.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                </td>
                <td class="px-4 py-3 text-right text-gray-600">
                  {{ tenant._count?.orders || 0 }}
                </td>
                <td class="px-4 py-3 text-right text-gray-600">
                  {{ tenant._count?.products || 0 }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'super-admin'
})

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
  return tenant?.name || 'Unknown Tenant'
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
