<template>
  <div class="mb-4 flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-2">
      <!-- Search -->
      <div v-if="!hideSearch" class="relative w-full sm:w-auto sm:min-w-[220px] sm:flex-1 sm:max-w-xs">
        <Icon
 name="lucide:search"
 class="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary"
 
 />
        <input
          :value="search"
          type="search"
          class="ui-input h-9 py-0 ps-9 text-sm"
          :placeholder="searchPlaceholder || t('admin.common.search')"
          :aria-label="searchLabel || searchPlaceholder || t('admin.common.search')"
          :data-testid="testid ? `${testid}-search` : undefined"
          @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
        >
      </div>

      <!-- Quick controls (date range, short selects…) -->
      <slot />

      <!-- Secondary filters, inline on wide screens -->
      <div
        v-if="$slots.advanced && inlineAdvanced"
        class="fb-inline flex flex-wrap items-center gap-2"
        :data-testid="testid ? `${testid}-inline` : undefined"
      >
        <slot name="advanced" />
      </div>

      <!-- Secondary filters, collapsed into a popover on narrow screens -->
      <Popover v-else-if="$slots.advanced" class="relative">
        <PopoverButton
          class="ui-btn ui-btn--secondary h-9 py-0 text-sm"
          :data-testid="testid ? `${testid}-advanced` : undefined"
        >
          <Icon name="lucide:sliders-horizontal" class="h-4 w-4" />
          <span>{{ t('admin.common.filters') }}</span>
          <span
            v-if="advancedCount"
            class="rounded-full px-1.5 text-micro font-bold leading-4"
            style="background: rgba(var(--brand-rgb) / 0.15); color: var(--admin-active-color)"
          >{{ advancedCount }}</span>
        </PopoverButton>
        <PopoverPanel
 class="absolute end-0 z-30 mt-2 w-[280px] max-w-[calc(100vw-2rem)] rounded-xl p-3 shadow-lg surface-1 border border-line"
 
>
          <div class="flex flex-col gap-3">
            <slot name="advanced" />
          </div>
        </PopoverPanel>
      </Popover>

      <button
        v-if="showClear"
        type="button"
        class="ui-btn ui-btn--ghost h-9 py-0 text-sm"
        :data-testid="testid ? `${testid}-clear` : undefined"
        @click="$emit('clear')"
      >
        <Icon name="lucide:x" class="h-4 w-4" />
        {{ t('admin.common.clearFilters') }}
      </button>

      <!-- Trailing actions (export, view switch…) -->
      <slot name="actions" />
    </div>

    <!-- Active filter chips (only when the filters themselves are hidden) -->
    <div v-if="chips.length && !inlineAdvanced" class="flex flex-wrap items-center gap-1.5">
      <button
 v-for="chip in chips"
 :key="chip.key"
 type="button"
 class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-mini transition-colors surface-2 border border-line text-secondary"
 
 @click="$emit('remove-chip', chip.key)"
>
        <span class="text-tertiary" v-if="chip.label">{{ chip.label }}:</span>
        <span class="font-medium text-primary">{{ chip.value }}</span>
        <Icon name="lucide:x" class="h-3 w-3" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Inline mode: the popover's stacked labelled fields become compact bar controls.
   Every select in that slot carries an "All …" default option, so it still names itself. */
.fb-inline :deep(.ui-label) {
  display: none;
}

.fb-inline :deep(.ui-input) {
  height: 2.25rem;
  width: auto;
  min-width: 9rem;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 13px;
}
</style>

<script setup lang="ts">
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'

export interface FilterChip {
  key: string
  label?: string
  value: string
}

const props = withDefaults(defineProps<{
  search?: string
  searchLabel?: string
  searchPlaceholder?: string
  hideSearch?: boolean
  chips?: FilterChip[]
  advancedCount?: number
  clearable?: boolean
  testid?: string
}>(), {
  search: '',
  chips: () => [],
  advancedCount: 0
})

defineEmits<{
  (e: 'update:search', value: string): void
  (e: 'clear'): void
  (e: 'remove-chip', key: string): void
}>()

const { t } = useI18n({ useScope: 'global' })

/* Desktop-first: render inline on the server, then collapse below the lg breakpoint. */
const inlineAdvanced = ref(true)

onMounted(() => {
  const query = window.matchMedia('(min-width: 1024px)')
  const update = () => {
    inlineAdvanced.value = query.matches
  }
  update()
  query.addEventListener('change', update)
  onUnmounted(() => query.removeEventListener('change', update))
})

const showClear = computed(() => {
  if (props.clearable !== undefined) return props.clearable
  return Boolean(props.search) || props.chips.length > 0 || props.advancedCount > 0
})
</script>
