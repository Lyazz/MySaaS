<template>
  <div>
    <div class="flex items-baseline justify-between gap-3">
      <span class="text-sm font-medium text-secondary">{{ label }}</span>
      <span class="text-sm font-semibold tabular-nums" :style="{ color: valueColor }">
        {{ count(metric.used) }}
        <span class="font-normal text-muted">/ {{ limitLabel }}</span>
      </span>
    </div>

    <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full surface-3">
      <div
        class="h-full rounded-full transition-[width] duration-700 ease-out"
        :style="{ width: `${barWidth}%`, background: barColor }"
      />
    </div>

    <p v-if="hint" class="mt-1.5 text-mini text-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBillingFormat } from '~/composables/useBillingFormat'

type Metric = { used: number; limit: number; percent: number; exceeded: boolean; unlimited: boolean }

const props = defineProps<{
  label: string
  metric: Metric
  hint?: string
}>()

const { count, limit } = useBillingFormat()

const limitLabel = computed(() => limit(props.metric.limit))

/** Warn before the wall, not at it — 80% is where a merchant can still act. */
const NEAR_LIMIT_PERCENT = 80

const barWidth = computed(() => (props.metric.unlimited ? 0 : Math.min(100, props.metric.percent)))

const barColor = computed(() => {
  if (props.metric.exceeded) return '#ef4444'
  if (props.metric.percent >= NEAR_LIMIT_PERCENT) return '#f59e0b'
  return 'var(--brand)'
})

const valueColor = computed(() =>
  props.metric.exceeded ? '#ef4444' : 'var(--text-primary)'
)
</script>
