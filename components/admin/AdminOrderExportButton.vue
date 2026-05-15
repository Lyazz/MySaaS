<template>
  <div class="relative flex items-center">
    <!-- Split button: left = quick export, right = dropdown arrow -->
    <div class="flex rounded-lg overflow-hidden" style="border: 1px solid var(--surface-border)">
      <!-- Left: quick export (re-run last settings) -->
      <button
        :disabled="exporting"
        class="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
        style="background: var(--surface-2); color: var(--text-primary)"
        @click="quickExport"
      >
        <Icon v-if="exporting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
        <Icon v-else name="lucide:download" class="w-4 h-4" />
        Export
      </button>

      <!-- Divider -->
      <div class="w-px self-stretch" style="background: var(--surface-border)" />

      <!-- Right: dropdown toggle -->
      <button
        :disabled="exporting"
        class="px-2 py-2 text-sm transition-colors hover:opacity-80"
        style="background: var(--surface-2); color: var(--text-primary)"
        @click="dropdownOpen = !dropdownOpen"
      >
        <Icon name="lucide:chevron-down" class="w-4 h-4" />
      </button>
    </div>

    <!-- Dropdown -->
    <div
      v-if="dropdownOpen"
      class="absolute top-full right-0 mt-1 z-20 w-48 rounded-lg shadow-lg overflow-hidden"
      style="background: var(--surface-1); border: 1px solid var(--surface-border)"
    >
      <button
        v-for="fmt in formats"
        :key="fmt.value"
        class="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:opacity-80 transition-opacity text-left"
        style="color: var(--text-primary)"
        @click="exportAs(fmt.value)"
      >
        <Icon :name="fmt.icon" class="w-4 h-4" style="color: var(--text-tertiary)" />
        {{ fmt.label }}
      </button>

      <div class="h-px mx-3 my-1" style="background: var(--surface-border)" />

      <button
        class="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:opacity-80 transition-opacity text-left"
        style="color: var(--brand)"
        @click="openModal"
      >
        <Icon name="lucide:settings-2" class="w-4 h-4" />
        Export options…
      </button>
    </div>

    <!-- Click-outside to close dropdown -->
    <div
      v-if="dropdownOpen"
      class="fixed inset-0 z-10"
      @click="dropdownOpen = false"
    />

    <!-- Export modal -->
    <AdminOrderExportModal
      v-model="modalOpen"
      :filters="filters"
      :tenant-id="tenantId"
    />
  </div>
</template>

<script setup lang="ts">
import AdminOrderExportModal from '~/components/admin/AdminOrderExportModal.vue'
import {
  EXPORT_FORMATS,
  buildExportParams,
  loadExportPrefs,
  openGoogleSheetsAuthorization,
} from '~/composables/useOrderExport'

const props = defineProps<{
  filters: {
    status?: string
    search?: string
    startDate?: string
    endDate?: string
    sortBy?: string
    sortOrder?: string
  }
  tenantId: string
}>()

const authStore = useAuthStore()

const formats = EXPORT_FORMATS

const dropdownOpen = ref(false)
const modalOpen = ref(false)
const exporting = ref(false)

function openModal() {
  dropdownOpen.value = false
  modalOpen.value = true
}

async function exportAs(format: string) {
  dropdownOpen.value = false
  const { columns } = loadExportPrefs(props.tenantId)
  await triggerExport(format, columns)
}

async function quickExport() {
  const prefs = loadExportPrefs(props.tenantId)
  await triggerExport(prefs.format, prefs.columns)
}

async function triggerExport(format: string, columns: string[]) {
  const params = buildExportParams(format, columns, props.filters)

  if (format === 'gsheet') {
    exporting.value = true
    try {
      await openGoogleSheetsAuthorization(authStore.token, columns, props.filters)
    } catch (error: any) {
      alert(error?.message ?? 'Google Sheets authorization failed.')
    } finally {
      exporting.value = false
    }
    return
  }

  exporting.value = true
  try {
    const response = await fetch(`/api/admin/orders/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      alert(err.statusMessage ?? 'Export failed')
      return
    }

    const truncated = response.headers.get('X-Export-Truncated') === 'true'
    if (truncated) {
      alert('Note: Your export contains more than 10,000 orders. Only the first 10,000 are included.')
    }

    if (process.client) {
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const date = new Date().toISOString().split('T')[0]
      a.download = `orders-export-${date}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    }
  } finally {
    exporting.value = false
  }
}
</script>
