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
import { DEFAULT_EXPORT_COLUMNS } from '~/composables/useOrderExport'

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

const PREFS_KEY = computed(() => `orders_export_prefs_${props.tenantId}`)

const dropdownOpen = ref(false)
const modalOpen = ref(false)
const exporting = ref(false)

const formats = [
  { value: 'csv',    label: 'CSV',          icon: 'lucide:file-text' },
  { value: 'xlsx',   label: 'Excel (.xlsx)', icon: 'lucide:table-2' },
  { value: 'pdf',    label: 'PDF',           icon: 'lucide:file-type-2' },
  { value: 'txt',    label: 'Text (.txt)',   icon: 'lucide:align-left' },
  { value: 'gsheet', label: 'Google Sheets ↗', icon: 'lucide:external-link' },
]

function loadPrefs(): { format: string; columns: string[] } {
  try {
    const raw = localStorage.getItem(PREFS_KEY.value)
    if (raw) {
      const p = JSON.parse(raw)
      if (p.format && Array.isArray(p.columns) && p.columns.length > 0) {
        return p
      }
    }
  } catch {
    // ignore
  }
  return { format: 'csv', columns: DEFAULT_EXPORT_COLUMNS }
}

function openModal() {
  dropdownOpen.value = false
  modalOpen.value = true
}

async function exportAs(format: string) {
  dropdownOpen.value = false
  const { columns } = loadPrefs()
  await triggerExport(format, columns)
}

async function quickExport() {
  const prefs = loadPrefs()
  if (!prefs.columns.length) {
    modalOpen.value = true
    return
  }
  await triggerExport(prefs.format, prefs.columns)
}

async function triggerExport(format: string, columns: string[]) {
  if (format === 'gsheet') {
    const params = new URLSearchParams()
    params.set('format', 'gsheet')
    params.set('columns', columns.join(','))
    if (props.filters.status) params.set('status', props.filters.status)
    if (props.filters.search) params.set('search', props.filters.search)
    if (props.filters.startDate) params.set('startDate', props.filters.startDate)
    if (props.filters.endDate) params.set('endDate', props.filters.endDate)
    window.open(`/api/admin/orders/export/google-auth-url?${params.toString()}`, '_blank')
    return
  }

  exporting.value = true
  try {
    const params = new URLSearchParams()
    params.set('format', format)
    params.set('columns', columns.join(','))
    if (props.filters.status) params.set('status', props.filters.status)
    if (props.filters.search) params.set('search', props.filters.search)
    if (props.filters.startDate) params.set('startDate', props.filters.startDate)
    if (props.filters.endDate) params.set('endDate', props.filters.endDate)

    const response = await fetch(`/api/admin/orders/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      alert(err.statusMessage ?? 'Export failed')
      return
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date().toISOString().split('T')[0]
    a.download = `orders-export-${date}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}
</script>
