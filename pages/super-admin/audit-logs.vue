<template>
  <div class="space-y-6">
      <SuperAdminPageHeader :title="t('superAdmin.auditLogs.title')">
        <template #actions>
          <button
            class="ui-btn ui-btn--secondary ui-btn--md"
            @click="loadLogs"
          >
            <Icon name="lucide:refresh-cw" class="h-4 w-4" />
            {{ t('superAdmin.auditLogs.actions.refresh') }}
          </button>
        </template>
      </SuperAdminPageHeader>

      <!-- Filters -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="ui-label">{{ t('superAdmin.auditLogs.filters.search.label') }}</label>
          <BaseInput
            v-model="searchQuery"
            type="text"
            :placeholder="t('superAdmin.auditLogs.filters.search.placeholder')"
          />
        </div>
        <div>
          <label class="ui-label">{{ t('superAdmin.auditLogs.filters.actionType') }}</label>
          <BaseSelect v-model="filterAction">
            <option value="">
              {{ t('superAdmin.auditLogs.filters.allActions') }}
            </option>
            <option
              v-for="actionType in AUDIT_ACTION_TYPES"
              :key="actionType"
              :value="actionType"
            >
              {{ t(getAuditActionMeta(actionType).labelKey) }}
            </option>
          </BaseSelect>
        </div>
        <div>
          <label class="ui-label">{{ t('superAdmin.auditLogs.filters.sortBy') }}</label>
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
      <div class="ui-card overflow-hidden">
        <SuperAdminLoadingState
          v-if="loading"
          :label="t('superAdmin.auditLogs.loading')"
        />
        <SuperAdminEmptyState
          v-else-if="filteredLogs.length === 0"
          icon="lucide:history"
          :title="t('superAdmin.auditLogs.empty')"
        />
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
                    class="ui-badge inline-flex items-center gap-1"
                    :class="`ui-badge--${getAuditActionMeta(log.action).color}`"
                  >
                    <Icon :name="getAuditActionMeta(log.action).icon" class="h-3 w-3" />
                    {{ getActionLabel(log.action) }}
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
          class="flex items-center justify-between px-5 py-4"
          style="border-top: 1px solid var(--surface-border); background: var(--surface-2)"
        >
          <p class="text-sm" style="color: var(--text-tertiary)">
            {{ t('superAdmin.auditLogs.pagination.showing', { from: (currentPage - 1) * perPage + 1, to: Math.min(currentPage * perPage, filteredLogs.length), total: filteredLogs.length }) }}
          </p>
          <div class="flex gap-2">
            <button
              type="button"
              :disabled="currentPage === 1"
              class="ui-btn ui-btn--secondary ui-btn--sm"
              @click="currentPage--"
            >
              {{ t('superAdmin.auditLogs.pagination.previous') }}
            </button>
            <button
              type="button"
              :disabled="currentPage >= totalPages"
              class="ui-btn ui-btn--secondary ui-btn--sm"
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
import SuperAdminPageHeader from '~/components/super-admin/SuperAdminPageHeader.vue'
import SuperAdminEmptyState from '~/components/super-admin/SuperAdminEmptyState.vue'
import SuperAdminLoadingState from '~/components/super-admin/SuperAdminLoadingState.vue'
import { getAuditActionMeta, AUDIT_ACTION_TYPES } from '~/composables/superAdminAuditAction'

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

const getActionLabel = (action: string) => {
  const meta = getAuditActionMeta(action)
  if (meta.labelKey) return t(meta.labelKey)
  return action.replace(/_/g, ' ')
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
