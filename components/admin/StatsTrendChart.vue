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
        {{ points.length }}
      </span>
    </div>

    <div class="mt-4">
      <div v-if="loading" class="h-[200px] rounded-xl animate-pulse" style="background: rgba(255,255,255,0.04)" />
      <div
        v-else-if="points.length === 0"
        class="h-[200px] rounded-xl flex items-center justify-center text-[12px]"
        style="color: var(--text-tertiary); background: var(--surface-2); border: 1px dashed var(--surface-border)"
      >
        {{ emptyLabel }}
      </div>

      <div v-else class="rounded-xl p-3" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
        <div class="flex gap-2">
          <!-- Y-axis ticks -->
          <div class="flex flex-col justify-between h-[160px] text-end shrink-0" style="min-width: 44px">
            <span v-for="tick in reversedTicks" :key="tick" class="text-[10px] font-mono-nums leading-none" style="color: var(--text-muted)">
              {{ formatValue(tick) }}
            </span>
          </div>

          <!-- Chart area -->
          <div
            ref="chartAreaRef"
            class="relative flex-1 h-[160px] cursor-crosshair"
            @mousemove="onMouseMove"
            @mouseleave="onMouseLeave"
            @click="onClick"
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="absolute inset-0 w-full h-full" style="overflow: visible">
              <defs>
                <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" :stop-color="color" stop-opacity="0.32" />
                  <stop offset="100%" :stop-color="color" stop-opacity="0" />
                </linearGradient>
              </defs>
              <line
                v-for="tick in ticks"
                :key="`grid-${tick}`"
                :x1="0" :x2="100"
                :y1="yForValue(tick)" :y2="yForValue(tick)"
                stroke="rgba(148,163,184,0.14)"
                stroke-width="0.4"
                vector-effect="non-scaling-stroke"
              />
              <path :d="areaPath" :fill="`url(#${gradientId})`" stroke="none" />
              <path :d="linePath" fill="none" :stroke="color" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />

              <line
                v-if="activeIndex !== null"
                :x1="pointsPct[activeIndex].xPct" :x2="pointsPct[activeIndex].xPct"
                y1="0" y2="100"
                stroke="rgba(148,163,184,0.35)"
                stroke-width="0.4"
                stroke-dasharray="2,2"
                vector-effect="non-scaling-stroke"
              />
            </svg>

            <!-- Marker: real HTML circle, unaffected by the SVG's non-uniform scaling -->
            <div
              v-if="activeIndex !== null"
              class="absolute w-2.5 h-2.5 rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
              :style="{ left: pointsPct[activeIndex].xPct + '%', top: pointsPct[activeIndex].yPct + '%', background: color, boxShadow: `0 0 0 3px ${color}33` }"
            />

            <!-- Tooltip -->
            <div
              v-if="activeIndex !== null"
              class="absolute z-10 pointer-events-none rounded-lg px-2.5 py-1.5 text-[11px] whitespace-nowrap -translate-x-1/2"
              :style="tooltipStyle"
            >
              <div class="font-medium" style="color: var(--text-tertiary)">{{ points[activeIndex].date }}</div>
              <div class="font-semibold font-mono-nums" style="color: var(--text-primary)">{{ formatValue(values[activeIndex]) }}</div>
            </div>
          </div>
        </div>

        <div class="mt-2 flex items-center justify-between text-[11px] font-mono-nums ps-[52px]" style="color: var(--text-tertiary)">
          <span>{{ firstLabel }}</span>
          <span>{{ lastLabel }}</span>
        </div>

        <div v-if="selectedDate" class="mt-3 flex items-center justify-between rounded-lg px-3 py-2" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
          <span class="text-[11.5px] font-medium" style="color: var(--text-secondary)">{{ selectedDate }}</span>
          <span class="text-[12px] font-semibold font-mono-nums" style="color: var(--text-primary)">{{ formatValue(selectedValue) }}</span>
          <button type="button" class="text-[11px] font-medium" style="color: var(--brand)" @click="emit('update:selectedDate', null)">
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { buildSmoothPath, niceTicks } from '~/utils/adminChart'

type Point = { date: string; value: number }

const props = withDefaults(defineProps<{
  title: string
  hint: string
  points: Point[]
  color?: string
  loading?: boolean
  emptyLabel?: string
  selectedDate?: string | null
  formatValue?: (value: number) => string
}>(), {
  color: '#FF7A45',
  loading: false,
  emptyLabel: 'No data',
  selectedDate: null,
  formatValue: (value: number) => String(value)
})

const emit = defineEmits<{
  'update:selectedDate': [value: string | null]
}>()

const gradientId = computed(() => `stats-trend-fill-${Math.random().toString(36).slice(2, 9)}`)

const values = computed(() => props.points.map((p) => (Number.isFinite(p.value) ? p.value : 0)))
const maxValue = computed(() => Math.max(...values.value, 0))
const ticks = computed(() => niceTicks(maxValue.value, 4))
const reversedTicks = computed(() => [...ticks.value].reverse())
const chartMax = computed(() => ticks.value[ticks.value.length - 1] || 1)

function yForValue(value: number) {
  if (chartMax.value <= 0) return 100
  return 100 - (value / chartMax.value) * 94
}

const pointsPct = computed(() => {
  const denominator = Math.max(values.value.length - 1, 1)
  return props.points.map((p, index) => ({
    xPct: (index / denominator) * 100,
    yPct: yForValue(values.value[index])
  }))
})

const linePath = computed(() => buildSmoothPath(pointsPct.value.map((p) => ({ x: p.xPct, y: p.yPct }))))
const areaPath = computed(() => {
  if (pointsPct.value.length === 0) return ''
  const first = pointsPct.value[0]
  const last = pointsPct.value[pointsPct.value.length - 1]
  return `${linePath.value} L ${last.xPct} 100 L ${first.xPct} 100 Z`
})

const firstLabel = computed(() => props.points[0]?.date ?? '—')
const lastLabel = computed(() => props.points[props.points.length - 1]?.date ?? '—')

const chartAreaRef = ref<HTMLElement | null>(null)
const hoveredIndex = ref<number | null>(null)

const selectedIndex = computed(() => {
  if (!props.selectedDate) return null
  const idx = props.points.findIndex((p) => p.date === props.selectedDate)
  return idx >= 0 ? idx : null
})

const activeIndex = computed(() => hoveredIndex.value ?? selectedIndex.value)
const selectedValue = computed(() => (selectedIndex.value !== null ? values.value[selectedIndex.value] : 0))

function indexFromClientX(clientX: number): number | null {
  const el = chartAreaRef.value
  if (!el || props.points.length === 0) return null
  const rect = el.getBoundingClientRect()
  if (rect.width === 0) return null
  const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
  const denominator = Math.max(props.points.length - 1, 1)
  return Math.round(ratio * denominator)
}

function onMouseMove(event: MouseEvent) {
  hoveredIndex.value = indexFromClientX(event.clientX)
}

function onMouseLeave() {
  hoveredIndex.value = null
}

function onClick(event: MouseEvent) {
  const index = indexFromClientX(event.clientX)
  if (index === null) return
  const date = props.points[index]?.date
  if (!date) return
  emit('update:selectedDate', props.selectedDate === date ? null : date)
}

const tooltipStyle = computed(() => {
  if (activeIndex.value === null) return {}
  const p = pointsPct.value[activeIndex.value]
  const nearTop = p.yPct < 30
  return {
    left: `${p.xPct}%`,
    top: nearTop ? `${p.yPct}%` : undefined,
    bottom: nearTop ? undefined : `${100 - p.yPct}%`,
    marginTop: nearTop ? '14px' : undefined,
    marginBottom: nearTop ? undefined : '14px',
    background: 'var(--surface-1)',
    border: '1px solid var(--surface-border)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
  }
})
</script>
