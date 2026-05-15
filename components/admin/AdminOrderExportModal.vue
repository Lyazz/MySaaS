<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/50"
        @click="$emit('update:modelValue', false)"
      />

      <!-- Modal panel -->
      <div
        class="relative z-10 w-full max-w-lg rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
        style="background: var(--surface-1); border: 1px solid var(--surface-border)"
      >
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold" style="color: var(--text-primary)">
            Export Orders
          </h2>
          <button
            class="p-1 rounded hover:opacity-70 transition-opacity"
            style="color: var(--text-tertiary)"
            @click="$emit('update:modelValue', false)"
          >
            <Icon name="lucide:x" class="w-5 h-5" />
          </button>
        </div>

        <!-- Format selector -->
        <div class="mb-5">
          <p class="text-sm font-medium mb-2" style="color: var(--text-secondary)">Format</p>
          <div class="grid grid-cols-5 gap-2">
            <button
              v-for="fmt in formats"
              :key="fmt.value"
              :class="[
                'flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-all',
                selectedFormat === fmt.value
                  ? '[border-color:var(--brand)] [background:rgba(var(--brand-rgb)/0.08)] [color:rgba(var(--brand-rgb)/0.9)]'
                  : ''
              ]"
              :style="selectedFormat !== fmt.value ? 'border-color: var(--surface-border); color: var(--text-secondary)' : ''"
              @click="selectedFormat = fmt.value"
            >
              <Icon :name="fmt.icon" class="w-5 h-5" />
              {{ fmt.label }}
            </button>
          </div>
        </div>

        <!-- Column picker -->
        <div class="mb-5">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-medium" style="color: var(--text-secondary)">Columns</p>
            <div class="flex gap-3">
              <button
                class="text-xs hover:opacity-70"
                style="color: var(--brand)"
                @click="selectAll"
              >
                Select all
              </button>
              <button
                class="text-xs hover:opacity-70"
                style="color: var(--text-tertiary)"
                @click="selectNone"
              >
                None
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto pr-1">
            <label
              v-for="col in allColumns"
              :key="col.key"
              class="flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer hover:opacity-80 transition-opacity"
              style="color: var(--text-primary)"
            >
              <input
                type="checkbox"
                class="admin-checkbox"
                :checked="selectedColumns.includes(col.key)"
                @change="toggleColumn(col.key)"
              />
              <span class="text-sm truncate">{{ col.label }}</span>
            </label>
          </div>

          <p v-if="selectedColumns.length === 0" class="text-xs mt-2 text-red-500">
            Select at least one column.
          </p>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <button
            class="ui-btn ui-btn--secondary"
            @click="$emit('update:modelValue', false)"
          >
            Cancel
          </button>
          <button
            :disabled="selectedColumns.length === 0 || exporting"
            class="ui-btn ui-btn--primary flex items-center gap-2"
            @click="doExport"
          >
            <Icon v-if="exporting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
            <Icon v-else name="lucide:download" class="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  EXPORT_COLUMNS_META,
  EXPORT_FORMATS,
  buildExportParams,
  loadExportPrefs,
  openGoogleSheetsAuthorization,
  saveExportPrefs,
} from '~/composables/useOrderExport'

const props = defineProps<{
  modelValue: boolean
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

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const authStore = useAuthStore()

const formats = EXPORT_FORMATS

const allColumns = EXPORT_COLUMNS_META

const selectedFormat = ref('csv')
const selectedColumns = ref<string[]>([...loadExportPrefs(props.tenantId).columns])
const exporting = ref(false)

function loadPrefs() {
  if (!process.client) return
  const prefs = loadExportPrefs(props.tenantId)
  selectedFormat.value = prefs.format
  selectedColumns.value = prefs.columns
}

function toggleColumn(key: string) {
  if (selectedColumns.value.includes(key)) {
    selectedColumns.value = selectedColumns.value.filter(c => c !== key)
  } else {
    selectedColumns.value = [...selectedColumns.value, key]
  }
}

function selectAll() {
  selectedColumns.value = allColumns.map(c => c.key)
}

function selectNone() {
  selectedColumns.value = []
}

async function doExport() {
  if (selectedColumns.value.length === 0) return
  exporting.value = true

  try {
    const params = buildExportParams(selectedFormat.value, selectedColumns.value, props.filters)

    if (selectedFormat.value === 'gsheet') {
      try {
        await openGoogleSheetsAuthorization(authStore.token, selectedColumns.value, props.filters)
        saveExportPrefs(props.tenantId, selectedFormat.value, selectedColumns.value)
        emit('update:modelValue', false)
      } catch (error: any) {
        alert(error?.message ?? 'Google Sheets authorization failed.')
      }
      return
    }

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

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date().toISOString().split('T')[0]
    const ext = selectedFormat.value
    a.download = `orders-export-${date}.${ext}`
    a.click()
    URL.revokeObjectURL(url)

    saveExportPrefs(props.tenantId, selectedFormat.value, selectedColumns.value)
    emit('update:modelValue', false)
  } finally {
    exporting.value = false
  }
}

watch(() => props.modelValue, (open) => {
  if (open) loadPrefs()
})
</script>
