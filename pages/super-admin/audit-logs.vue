<template>
  <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-800">
          {{ t('superAdmin.auditLogs.title') }}
        </h1>
        <button
          class="px-4 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg text-teal-700 transition-colors"
          @click="loadLogs"
        >
          <Icon name="lucide:refresh-cw" class="h-5 w-5 inline-block mr-2" />
          {{ t('superAdmin.auditLogs.actions.refresh') }}
        </button>
      </div>

      <!-- Filters -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('superAdmin.auditLogs.filters.search.label') }}</label>
          <BaseInput
            v-model="searchQuery"
            type="text"
            :placeholder="t('superAdmin.auditLogs.filters.search.placeholder')"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('superAdmin.auditLogs.filters.actionType') }}</label>
          <BaseSelect
            v-model="filterAction"
          >
            <option value="">
              {{ t('superAdmin.auditLogs.filters.allActions') }}
            </option>
            <option value="CREATE_TENANT">
              {{ t('superAdmin.audit.actions.createTenant') }}
            </option>
            <option value="UPDATE_TENANT">
              {{ t('superAdmin.audit.actions.updateTenant') }}
            </option>
            <option value="DELETE_TENANT">
              {{ t('superAdmin.audit.actions.deleteTenant') }}
            </option>
            <option value="SUSPEND_TENANT">
              {{ t('superAdmin.audit.actions.suspendTenant') }}
            </option>
            <option value="UNSUSPEND_TENANT">
              {{ t('superAdmin.audit.actions.unsuspendTenant') }}
            </option>
            <option value="IMPERSONATE_USER">
              {{ t('superAdmin.audit.actions.impersonateUser') }}
            </option>
          </BaseSelect>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('superAdmin.auditLogs.filters.sortBy') }}</label>
          <BaseSelect
            v-model="sortOrder"
          >
            <option value="desc">
              {{ t('superAdmin.auditLogs.filters.sort.newestFirst') }}
            </option>
            <option value="asc">
              {{ t('superAdmin.auditLogs.filters.sort.oldestFirst') }}
            </option>
          </BaseSelect>
        </div>
      </div>

      <!-- Logs Table -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div
          v-if="loading"
          class="p-8 text-center text-gray-500"
        >
          {{ t('superAdmin.auditLogs.loading') }}
        </div>
        <div
          v-else-if="filteredLogs.length === 0"
          class="p-8 text-center text-gray-500"
        >
          {{ t('superAdmin.auditLogs.empty') }}
        </div>
        <div
          v-else
          class="overflow-x-auto"
        >
          <table class="ui-table">
            <thead class="ui-thead border-b border-slate-200">
              <tr>
                <th class="ui-th">
                  {{ t('superAdmin.auditLogs.table.timestamp') }}
                </th>
                <th class="ui-th">
                  {{ t('superAdmin.auditLogs.table.action') }}
                </th>
                <th class="ui-th">
                  {{ t('superAdmin.auditLogs.table.details') }}
                </th>
                <th class="ui-th">
                  {{ t('superAdmin.auditLogs.table.userId') }}
                </th>
                <th class="ui-th">
                  {{ t('superAdmin.auditLogs.table.target') }}
                </th>
              </tr>
            </thead>
            <tbody class="ui-tbody">
              <tr
                v-for="log in paginatedLogs"
                :key="log.id"
                class="ui-tr transition-colors"
                >
                <td class="ui-td text-slate-600 text-sm whitespace-nowrap">
                  {{ formatDateTime(log.createdAt) }}
                </td>
                <td class="ui-td">
                  <span
                    class="ui-badge"
                    :class="getActionBadgeClass(log.action)"
                  >
                    {{ getActionIcon(log.action) }} {{ getActionLabel(log.action) }}
                  </span>
                </td>
                <td class="ui-td text-slate-600 text-sm">
                  {{ log.details || '-' }}
                </td>
                <td class="ui-td text-slate-500 font-mono text-xs">
                  {{ log.userId ? log.userId.substring(0, 8) + '...' : '-' }}
                </td>
                <td class="ui-td text-slate-500 font-mono text-xs">
                  {{ log.targetId ? log.targetId.substring(0, 8) + '...' : '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="filteredLogs.length > 0"
          class="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50"
        >
          <p class="text-sm text-gray-500">
            {{ t('superAdmin.auditLogs.pagination.showing', { from: (currentPage - 1) * perPage + 1, to: Math.min(currentPage * perPage, filteredLogs.length), total: filteredLogs.length }) }}
          </p>
          <div class="flex space-x-2">
            <button
              :disabled="currentPage === 1"
              class="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 rounded text-gray-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              @click="currentPage--"
            >
              {{ t('superAdmin.auditLogs.pagination.previous') }}
            </button>
            <button
              :disabled="currentPage >= totalPages"
              class="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 rounded text-gray-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              @click="currentPage++"
            >
              {{ t('superAdmin.auditLogs.pagination.next') }}
            </button>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseInput from '~/components/ui/BaseInput.vue'
import BaseSelect from '~/components/ui/BaseSelect.vue'

definePageMeta({
  middleware: 'super-admin',
  layout: 'super-admin'
})

const { t, locale } = useI18n({ useScope: 'global' })
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

const getActionLabel = (action: string) => {
  const map: Record<string, string> = {
    'CREATE_TENANT': t('superAdmin.audit.actions.createTenant'),
    'UPDATE_TENANT': t('superAdmin.audit.actions.updateTenant'),
    'DELETE_TENANT': t('superAdmin.audit.actions.deleteTenant'),
    'SUSPEND_TENANT': t('superAdmin.audit.actions.suspendTenant'),
    'UNSUSPEND_TENANT': t('superAdmin.audit.actions.unsuspendTenant'),
    'IMPERSONATE_USER': t('superAdmin.audit.actions.impersonateUser')
  }
  return map[action] || action.replace(/_/g, ' ')
}

const getActionBadgeClass = (action: string) => {
  const classes: Record<string, string> = {
    'CREATE_TENANT': 'ui-badge--emerald',
    'UPDATE_TENANT': 'ui-badge--indigo',
    'DELETE_TENANT': 'ui-badge--red',
    'SUSPEND_TENANT': 'ui-badge--amber',
    'UNSUSPEND_TENANT': 'ui-badge--emerald',
    'IMPERSONATE_USER': 'ui-badge--teal'
  }
  return classes[action] || 'ui-badge--slate'
}

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString(locale.value, {
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
