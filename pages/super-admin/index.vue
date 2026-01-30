<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">
        Platform Overview
      </h2>
      <p class="text-gray-600 mt-1">
        Manage your multi-tenant SaaS platform
      </p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div class="bg-white p-6 rounded-lg shadow border border-slate-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">
              Total Tenants
            </p>
            <p class="text-3xl font-bold text-gray-800 mt-1">
              {{ platformStats?.tenants || 0 }}
            </p>
          </div>
          <div class="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center">
            <Icon name="lucide:building" class="w-6 h-6 text-teal-600" />
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow border border-slate-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">
              Total Users
            </p>
            <p class="text-3xl font-bold text-gray-800 mt-1">
              {{ platformStats?.users || 0 }}
            </p>
          </div>
          <div class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
            <Icon name="lucide:users" class="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow border border-slate-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">
              Total Products
            </p>
            <p class="text-3xl font-bold text-gray-800 mt-1">
              {{ platformStats?.products || 0 }}
            </p>
          </div>
          <div class="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center">
             <Icon name="lucide:package" class="w-6 h-6 text-indigo-600" />
          </div>
        </div>
      </div>

       <div class="bg-white p-6 rounded-lg shadow border border-slate-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">
              Total Revenue
            </p>
             <p class="text-2xl font-bold text-gray-800 mt-1"> <!-- Smaller text for currency -->
              ${{ revenueStats?.totalRevenue?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0' }}
            </p>
          </div>
          <div class="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
            <Icon name="lucide:dollar-sign" class="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Activity -->
      <div class="bg-white rounded-lg shadow border border-slate-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 class="text-lg font-semibold text-gray-800">
            Recent Activity
          </h3>
          <NuxtLink
            to="/super-admin/audit-logs"
            class="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline"
          >
            View All
          </NuxtLink>
        </div>
        
        <div class="divide-y divide-slate-100">
          <div
            v-if="loading"
            class="p-8 text-center text-gray-400"
          >
            Loading...
          </div>
          <div
            v-else-if="recentLogs.length === 0"
            class="p-8 text-center text-gray-400"
          >
            No recent activity
          </div>
          <div
            v-else
            v-for="log in recentLogs"
            :key="log.id"
            class="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4"
          >
            <div class="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-lg">
              {{ getActionIcon(log.action) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900">
                {{ formatAction(log.action) }}
              </p>
              <p class="text-sm text-gray-500 truncate">
                {{ log.details }}
              </p>
              <p class="text-xs text-gray-400 mt-1">
                {{ formatDate(log.createdAt) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white rounded-lg shadow border border-slate-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 class="text-lg font-semibold text-gray-800">
            Quick Actions
          </h3>
        </div>
        <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NuxtLink
            to="/super-admin/tenants" 
            class="flex items-center p-4 border rounded-lg hover:border-teal-500 hover:bg-teal-50 hover:shadow-sm transition-all group bg-white"
          >
            <div class="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center group-hover:bg-teal-200 text-teal-600 transition-colors">
              <Icon name="lucide:plus" class="w-6 h-6" />
            </div>
            <div class="ml-4">
              <p class="font-medium text-gray-900">Create Tenant</p>
              <p class="text-xs text-gray-500 mt-0.5">Add a new store</p>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/super-admin/tenants" 
            class="flex items-center p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 hover:shadow-sm transition-all group bg-white"
          >
             <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 text-blue-600 transition-colors">
              <Icon name="lucide:building" class="w-6 h-6" />
            </div>
            <div class="ml-4">
              <p class="font-medium text-gray-900">Manage Tenants</p>
              <p class="text-xs text-gray-500 mt-0.5">View all stores</p>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/super-admin/analytics" 
            class="flex items-center p-4 border rounded-lg hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-sm transition-all group bg-white"
          >
             <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 text-indigo-600 transition-colors">
              <Icon name="lucide:bar-chart-2" class="w-6 h-6" />
            </div>
            <div class="ml-4">
              <p class="font-medium text-gray-900">View Analytics</p>
              <p class="text-xs text-gray-500 mt-0.5">Platform insights</p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

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

const formatAction = (action: string) => {
  return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
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
