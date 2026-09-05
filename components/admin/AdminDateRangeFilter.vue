<template>
  <Popover v-slot="{ open }" class="relative">
    <PopoverButton
      class="ui-btn ui-btn--secondary h-9 py-0 text-sm"
      :data-testid="props.testid ? `${props.testid}-range` : undefined"
    >
      <Icon name="lucide:calendar" class="h-4 w-4 shrink-0" />
      <span class="max-w-[180px] truncate">{{ buttonLabel }}</span>
      <Icon
        name="lucide:chevron-down"
        class="h-3.5 w-3.5 shrink-0 transition-transform"
        :class="open ? 'rotate-180' : ''"
      />
    </PopoverButton>

    <PopoverPanel
 v-slot="{ close }"
 class="absolute end-0 z-30 mt-2 w-[250px] max-w-[calc(100vw-2rem)] rounded-xl p-2 shadow-lg surface-1 border border-line"
 
>
      <div class="flex flex-col">
        <button
          v-for="preset in presets"
          :key="preset"
          type="button"
          class="flex items-center justify-between rounded-lg px-2.5 py-2 text-start text-sm transition-colors"
          :class="selectedRange === preset ? 'range-option--active' : 'range-option'"
          :data-testid="props.testid ? `${props.testid}-range-${preset}` : undefined"
          @click="selectPreset(preset, close)"
        >
          {{ t(`admin.pages.dashboard.filters.ranges.${preset}`) }}
          <Icon v-if="selectedRange === preset" name="lucide:check" class="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          class="flex items-center justify-between rounded-lg px-2.5 py-2 text-start text-sm transition-colors"
          :class="selectedRange === 'custom' ? 'range-option--active' : 'range-option'"
          @click="selectCustom"
        >
          {{ t('admin.pages.dashboard.filters.ranges.custom') }}
          <Icon v-if="selectedRange === 'custom'" name="lucide:check" class="h-3.5 w-3.5" />
        </button>

        <div
 v-if="selectedRange === 'custom'"
 class="mt-2 grid grid-cols-1 gap-2 pt-2 border-t border-line"
 
>
          <input
            type="date"
            :value="props.startDate"
            class="ui-input h-9 py-0 text-xs"
            :aria-label="t('admin.common.startDate')"
            :data-testid="props.testid ? `${props.testid}-custom-from` : undefined"
            @input="updateStartDate(($event.target as HTMLInputElement).value)"
          >
          <input
            type="date"
            :value="props.endDate"
            class="ui-input h-9 py-0 text-xs"
            :aria-label="t('admin.common.endDate')"
            :data-testid="props.testid ? `${props.testid}-custom-to` : undefined"
            @input="updateEndDate(($event.target as HTMLInputElement).value)"
          >
        </div>
      </div>
    </PopoverPanel>
  </Popover>
</template>

<style scoped>
.range-option {
  color: var(--text-secondary);
}

.range-option:hover {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.range-option--active {
  background: rgba(var(--brand-rgb) / 0.12);
  color: var(--admin-active-color);
}
</style>

<script setup lang="ts">
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import {
  dashboardPresetRanges,
  defaultCustomDateRange,
  getDashboardPresetDateRange,
  resolveDashboardRangeFromDates,
  type DashboardPresetRange,
  type DashboardRange
} from '~/composables/admin/dashboardRange'

const { t, locale } = useI18n({ useScope: 'global' })

const props = defineProps<{
  startDate?: string
  endDate?: string
  range?: DashboardRange
  testid?: string
}>()

const emit = defineEmits<{
  (e: 'update:startDate', value: string): void
  (e: 'update:endDate', value: string): void
  (e: 'update:range', value: DashboardRange): void
}>()

const presets = dashboardPresetRanges

const selectedRange = ref<DashboardRange>(props.range || resolveDashboardRangeFromDates(props.startDate, props.endDate))

const shortDate = (value?: string) => {
  if (!value) return '—'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString(locale.value, { day: 'numeric', month: 'short' })
}

const buttonLabel = computed(() => {
  if (selectedRange.value !== 'custom') {
    return t(`admin.pages.dashboard.filters.ranges.${selectedRange.value}`)
  }
  if (!props.startDate && !props.endDate) return t('admin.pages.dashboard.filters.range')
  return `${shortDate(props.startDate)} – ${shortDate(props.endDate)}`
})

function emitRange(range: { from: string; to: string }) {
  emit('update:startDate', range.from)
  emit('update:endDate', range.to)
}

function selectPreset(preset: DashboardPresetRange, close: () => void) {
  selectedRange.value = preset
  emit('update:range', preset)
  emitRange(getDashboardPresetDateRange(preset))
  close()
}

function selectCustom() {
  selectedRange.value = 'custom'
  emit('update:range', 'custom')
  if (!props.startDate || !props.endDate) emitRange(defaultCustomDateRange())
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
