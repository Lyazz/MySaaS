<template>
  <div class="rounded-2xl p-5" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="text-[13.5px] font-semibold" style="color: var(--text-primary)">
          {{ title }}
        </h3>
        <p class="mt-0.5 text-[12px]" style="color: var(--text-tertiary)">
          {{ hint }}
        </p>
      </div>
      <span class="text-[11px] font-mono-nums rounded-md px-2 py-1" style="color: var(--text-secondary); background: var(--surface-2); border: 1px solid var(--surface-border)">
        {{ trends.length }}
      </span>
    </div>

    <div class="mt-4">
      <div v-if="loading" class="h-[180px] rounded-xl animate-pulse" style="background: rgba(255,255,255,0.04)" />
      <div
        v-else-if="trends.length === 0"
        data-testid="trend-empty"
        class="h-[180px] rounded-xl flex items-center justify-center text-[12px]"
        style="color: var(--text-tertiary); background: var(--surface-2); border: 1px dashed var(--surface-border)"
      >
        {{ emptyLabel }}
      </div>
      <div
        v-else
        data-testid="trend-populated"
        class="rounded-xl p-3"
        style="background: var(--surface-2); border: 1px solid var(--surface-border)"
      >
        <svg viewBox="0 0 100 44" preserveAspectRatio="none" class="w-full h-[140px]">
          <defs>
            <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" :stop-color="color" stop-opacity="0.35" />
              <stop offset="100%" :stop-color="color" stop-opacity="0" />
            </linearGradient>
          </defs>
          <polyline
            points="0,43 100,43"
            fill="none"
            stroke="rgba(148,163,184,0.18)"
            stroke-width="0.4"
          />
          <polygon :points="filledPoints" :fill="`url(#${gradientId})`" />
          <polyline
            :points="linePoints"
            fill="none"
            :stroke="color"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>

        <div class="mt-2 flex items-center justify-between text-[11px] font-mono-nums" style="color: var(--text-tertiary)">
          <span>{{ firstLabel }}</span>
          <span>{{ lastLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type TrendPoint = {
  date: string
  ordersCount: number
  ordersRevenue: number
  posRevenue: number
  totalRevenue: number
}

type ValueKey = keyof Omit<TrendPoint, 'date'>

const props = withDefaults(defineProps<{
  title: string
  hint: string
  trends: TrendPoint[]
  valueKey: ValueKey
  color?: string
  loading?: boolean
  emptyLabel?: string
}>(), {
  color: '#FF7A45',
  loading: false,
  emptyLabel: 'No data'
})

const gradientId = computed(() => `trend-fill-${props.valueKey}`)

const values = computed(() =>
  props.trends.map((row) => {
    const n = Number(row[props.valueKey] ?? 0)
    return Number.isFinite(n) ? n : 0
  })
)

const linePoints = computed(() => {
  if (values.value.length === 0) return ''
  const max = Math.max(...values.value, 1)
  const denominator = Math.max(values.value.length - 1, 1)
  return values.value
    .map((value, index) => {
      const x = (index / denominator) * 100
      const y = 2 + (1 - value / max) * 40
      return `${x},${y}`
    })
    .join(' ')
})

const filledPoints = computed(() => {
  if (!linePoints.value) return ''
  return `0,43 ${linePoints.value} 100,43`
})

const firstLabel = computed(() => props.trends[0]?.date ?? '—')
const lastLabel = computed(() => props.trends[props.trends.length - 1]?.date ?? '—')
</script>
