<template>
  <NuxtLayout name="super-admin">
    <div class="space-y-6">
      <h1 class="text-3xl font-bold text-white">
        Platform Dashboard
      </h1>

      <!-- Platform Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          icon="🏢"
          label="Total Tenants"
          :value="platformStats?.tenants || 0"
          color="purple"
        />
        <StatsCard
          icon="👥"
          label="Total Users"
          :value="platformStats?.users || 0"
          color="blue"
        />
        <StatsCard
          icon="📦"
          label="Total Products"
          :value="platformStats?.products || 0"
          color="green"
        />
        <StatsCard
          icon="🛒"
          label="Total Orders"
          :value="platformStats?.orders || 0"
          color="orange"
        />
      </div>

      <!-- Revenue Card -->
      <div class="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
        <h2 class="text-xl font-semibold text-white mb-4">
          Platform Revenue
        </h2>
        <div class="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          ${{ revenueStats?.totalRevenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00' }}
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-white">
            Recent Activity
          </h2>
          <NuxtLink
            to="/super-admin/audit-logs"
            class="text-purple-400 hover:text-purple-300 transition-colors"
          >
            View All →
          </NuxtLink>
        </div>
        
        <div
          v-if="loading"
          class="text-gray-400 text-center py-4"
        >
          Loading...
        </div>
        <div
          v-else-if="recentLogs.length === 0"
          class="text-gray-400 text-center py-4"
        >
          No recent activity
        </div>
        <div
          v-else
          class="space-y-3"
        >
          <div
            v-for="log in recentLogs"
            :key="log.id"
            class="flex items-start space-x-3 p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900/70 transition-colors"
          >
            <div class="flex-shrink-0 w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span class="text-lg">{{ getActionIcon(log.action) }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-white font-medium">
                {{ log.action }}
              </p>
              <p class="text-gray-400 text-sm truncate">
                {{ log.details }}
              </p>
              <p class="text-gray-500 text-xs mt-1">
                {{ formatDate(log.createdAt) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <h2 class="text-xl font-semibold text-white mb-4">
          Quick Actions
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NuxtLink
            to="/super-admin/tenants" 
            class="p-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg transition-all duration-200 group"
          >
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-purple-500/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-purple-300"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p class="text-white font-medium">
                  Create Tenant
                </p>
                <p class="text-gray-400 text-sm">
                  Add a new tenant
                </p>
              </div>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/super-admin/tenants" 
            class="p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg transition-all duration-200 group"
          >
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-blue-500/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-blue-300"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                  <path
                    fill-rule="evenodd"
                    d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p class="text-white font-medium">
                  Manage Tenants
                </p>
                <p class="text-gray-400 text-sm">
                  View all tenants
                </p>
              </div>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/super-admin/analytics" 
            class="p-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg transition-all duration-200 group"
          >
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-green-500/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-green-300"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div>
                <p class="text-white font-medium">
                  View Analytics
                </p>
                <p class="text-gray-400 text-sm">
                  Platform insights
                </p>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'super-admin'
})

const loading = ref(true)
const platformStats = ref<any>(null)
const revenueStats = ref<any>(null)
const recentLogs = ref<any[]>([])

onMounted(async () => {
  try {
    // Fetch platform stats
    const statsResponse = await $fetch('/api/super-admin/stats/platform', {
      headers: {
        Authorization: `Bearer ${useAuthStore().token}`
      }
    })
    platformStats.value = statsResponse

    // Fetch revenue stats
    const revenueResponse = await $fetch('/api/super-admin/stats/revenue', {
      headers: {
        Authorization: `Bearer ${useAuthStore().token}`
      }
    })
    revenueStats.value = revenueResponse

    // Fetch recent audit logs
    const logsResponse = await $fetch<any[]>('/api/super-admin/audit-logs', {
      headers: {
        Authorization: `Bearer ${useAuthStore().token}`
      }
    })
    recentLogs.value = logsResponse.slice(0, 5) // Show only 5 most recent
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  } finally {
    loading.value = false
  }
})

const getActionIcon = (action: string) => {
  const icons: Record<string, string> = {
    'CREATE_TENANT': '➕',
    'UPDATE_TENANT': '✏️',
    'DELETE_TENANT': '🗑️',
    'SUSPEND_TENANT': '⏸️',
    'UNSUSPEND_TENANT': '▶️',
    'IMPERSONATE_USER': '👤'
  }
  return icons[action] || '📝'
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
