<template>
  <div class="w-full min-w-0">
    <label class="ui-label block mb-1">
      {{ label || t('admin.pages.dashboard.filters.range', 'Range') }}
    </label>
    <div
      class="flex w-full min-w-0 flex-col gap-2 rounded-xl px-3 py-2 sm:flex-row sm:items-center"
      style="background: var(--surface-1); border: 1px solid var(--surface-border)"
    >
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <Icon name="lucide:calendar" class="h-4 w-4 shrink-0" style="color: var(--text-muted)" />
        <select
          v-model="selectedRange"
          class="ui-input h-9 min-w-0 flex-1 py-1 text-[12px] sm:h-7 sm:min-w-[128px] sm:flex-none sm:text-[11.5px]"
          :data-testid="testid ? `${testid}-range-select` : undefined"
          @change="handleRangeChange"
        >
          <option value="today">{{ t('admin.pages.dashboard.filters.ranges.today', 'Today') }}</option>
          <option value="7d">{{ t('admin.pages.dashboard.filters.ranges.7d') }}</option>
          <option value="30d">{{ t('admin.pages.dashboard.filters.ranges.30d') }}</option>
          <option value="90d">{{ t('admin.pages.dashboard.filters.ranges.90d') }}</option>
          <option value="custom">{{ t('admin.pages.dashboard.filters.ranges.custom') }}</option>
        </select>
      </div>

      <div
        v-if="selectedRange === 'custom'"
        class="grid w-full min-w-0 grid-cols-1 gap-2 sm:w-auto sm:min-w-[260px] sm:grid-cols-2"
      >
        <input
          type="date"
          :value="startDate"
          class="ui-input h-9 min-w-0 py-1 text-[12px] sm:h-7 sm:text-[11.5px]"
          :aria-label="t('admin.common.startDate')"
          :data-testid="testid ? `${testid}-custom-from` : undefined"
          @input="updateStartDate(($event.target as HTMLInputElement).value)"
        >
        <input
          type="date"
          :value="endDate"
          class="ui-input h-9 min-w-0 py-1 text-[12px] sm:h-7 sm:text-[11.5px]"
          :aria-label="t('admin.common.endDate')"
          :data-testid="testid ? `${testid}-custom-to` : undefined"
          @input="updateEndDate(($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  defaultCustomDateRange,
  getDashboardPresetDateRange,
  resolveDashboardRangeFromDates,
  type DashboardRange
} from '~/composables/admin/dashboardRange'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
  startDate?: string
  endDate?: string
  range?: DashboardRange
  label?: string
  testid?: string
}>()

const emit = defineEmits<{
  (e: 'update:startDate', value: string): void
  (e: 'update:endDate', value: string): void
  (e: 'update:range', value: DashboardRange): void
}>()

const selectedRange = ref<DashboardRange>(props.range || resolveDashboardRangeFromDates(props.startDate, props.endDate))

function emitRange(range: { from: string; to: string }) {
  emit('update:startDate', range.from)
  emit('update:endDate', range.to)
}

function handleRangeChange() {
  emit('update:range', selectedRange.value)

  if (selectedRange.value === 'custom') {
    if (!props.startDate || !props.endDate) emitRange(defaultCustomDateRange())
    return
  }

  emitRange(getDashboardPresetDateRange(selectedRange.value))
}

function updateStartDate(val: string) {
  selectedRange.value = 'custom'
  emit('update:range', 'custom')
  emit('update:startDate', val)
}

function updateEndDate(val: string) {
  selectedRange.value = 'custom'
  emit('update:range', 'custom')
  emit('update:endDate', val)
}

watch(
  () => [props.startDate, props.endDate, props.range] as const,
  ([start, end, range]) => {
    selectedRange.value = range || resolveDashboardRangeFromDates(start, end)
  }
)
</script>
