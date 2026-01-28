<template>
  <NuxtLayout name="super-admin">
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-white">
          Audit Logs
        </h1>
        <button
          class="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg text-purple-300 transition-colors"
          @click="loadLogs"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 inline-block mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clip-rule="evenodd"
            />
          </svg>
          Refresh
        </button>
      </div>

      <!-- Filters -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Search</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search logs..."
            class="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Action Type</label>
          <select
            v-model="filterAction"
            class="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">
              All Actions
            </option>
            <option value="CREATE_TENANT">
              Create Tenant
            </option>
            <option value="UPDATE_TENANT">
              Update Tenant
            </option>
            <option value="DELETE_TENANT">
              Delete Tenant
            </option>
            <option value="SUSPEND_TENANT">
              Suspend Tenant
            </option>
            <option value="UNSUSPEND_TENANT">
              Unsuspend Tenant
            </option>
            <option value="IMPERSONATE_USER">
              Impersonate User
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
          <select
            v-model="sortOrder"
            class="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="desc">
              Newest First
            </option>
            <option value="asc">
              Oldest First
            </option>
          </select>
        </div>
      </div>

      <!-- Logs Table -->
      <div class="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
        <div
          v-if="loading"
          class="p-8 text-center text-gray-400"
        >
          Loading logs...
        </div>
        <div
          v-else-if="filteredLogs.length === 0"
          class="p-8 text-center text-gray-400"
        >
          No logs found
        </div>
        <div
          v-else
          class="overflow-x-auto"
        >
          <table class="w-full">
            <thead class="bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Timestamp
                </th>
                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Action
                </th>
                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Details
                </th>
                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  User ID
                </th>
                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Target
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700">
              <tr
                v-for="log in paginatedLogs"
                :key="log.id"
                class="hover:bg-slate-900/30 transition-colors"
              >
                <td class="px-6 py-4 text-gray-300 text-sm whitespace-nowrap">
                  {{ formatDateTime(log.createdAt) }}
                </td>
                <td class="px-6 py-4">
                  <span
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    :class="getActionBadgeClass(log.action)"
                  >
                    {{ getActionIcon(log.action) }} {{ log.action.replace(/_/g, ' ') }}
                  </span>
                </td>
                <td class="px-6 py-4 text-gray-300">
                  {{ log.details || '-' }}
                </td>
                <td class="px-6 py-4 text-gray-300 font-mono text-xs">
                  {{ log.userId ? log.userId.substring(0, 8) + '...' : '-' }}
                </td>
                <td class="px-6 py-4 text-gray-300 font-mono text-xs">
                  {{ log.targetId ? log.targetId.substring(0, 8) + '...' : '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="filteredLogs.length > 0"
          class="flex items-center justify-between px-6 py-4 border-t border-slate-700"
        >
          <p class="text-sm text-gray-400">
            Showing {{ (currentPage - 1) * perPage + 1 }} to {{ Math.min(currentPage * perPage, filteredLogs.length) }} of {{ filteredLogs.length }} logs
          </p>
          <div class="flex space-x-2">
            <button
              :disabled="currentPage === 1"
              class="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              @click="currentPage--"
            >
              Previous
            </button>
            <button
              :disabled="currentPage >= totalPages"
              class="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              @click="currentPage++"
            >
              Next
            </button>
          </div>
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
const logs = ref<any[]>([])
const searchQuery = ref('')
const filterAction = ref('')
const sortOrder = ref('desc')
const currentPage = ref(1)
const perPage = 20

const filteredLogs = computed(() => {
  let result = [...logs.value]

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(log => 
      log.action.toLowerCase().includes(query) ||
      log.details?.toLowerCase().includes(query) ||
      log.userId?.toLowerCase().includes(query)
    )
  }

  // Filter by action type
  if (filterAction.value) {
    result = result.filter(log => log.action === filterAction.value)
  }

  // Sort
  result.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return sortOrder.value === 'desc' ? dateB - dateA : dateA - dateB
  })

  return result
})

const totalPages = computed(() => Math.ceil(filteredLogs.value.length / perPage))

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * perPage
  const end = start + perPage
  return filteredLogs.value.slice(start, end)
})

const loadLogs = async () => {
  try {
    loading.value = true
    const response = await $fetch<any[]>('/api/super-admin/audit-logs', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    logs.value = response
  } catch (error) {
    console.error('Failed to load audit logs:', error)
  } finally {
    loading.value = false
  }
}

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

const getActionBadgeClass = (action: string) => {
  const classes: Record<string, string> = {
    'CREATE_TENANT': 'bg-green-500/20 border border-green-500/50 text-green-300',
    'UPDATE_TENANT': 'bg-blue-500/20 border border-blue-500/50 text-blue-300',
    'DELETE_TENANT': 'bg-red-500/20 border border-red-500/50 text-red-300',
    'SUSPEND_TENANT': 'bg-orange-500/20 border border-orange-500/50 text-orange-300',
    'UNSUSPEND_TENANT': 'bg-green-500/20 border border-green-500/50 text-green-300',
    'IMPERSONATE_USER': 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
  }
  return classes[action] || 'bg-gray-500/20 border border-gray-500/50 text-gray-300'
}

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Reset pagination when filters change
watch([searchQuery, filterAction, sortOrder], () => {
  currentPage.value = 1
})

onMounted(() => {
  loadLogs()
})
</script>
