<template>
  <component
    :is="to ? NuxtLink : 'div'"
    v-bind="to ? { to } : {}"
    class="stat-card group relative overflow-hidden rounded-2xl transition-all duration-200"
    :class="to ? 'cursor-pointer' : ''"
  >
    <!-- Colored top border -->
    <div class="absolute inset-x-0 top-0 h-[2px]" :style="topLineStyle" />
    <!-- Subtle gradient wash -->
    <div class="absolute inset-x-0 top-0 h-20 pointer-events-none" :style="gradientWashStyle" />

    <div class="relative p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-[9.5px] font-bold uppercase tracking-[0.1em]" style="color: var(--text-muted)">
            {{ label }}
          </p>

          <div v-if="loading" class="mt-3 h-7 w-24 rounded-lg animate-pulse" style="background: rgba(255,255,255,0.06)" />
          <p v-else class="mt-2 text-[24px] font-semibold leading-none font-mono-nums" style="color: var(--text-primary); letter-spacing: -0.02em">
            {{ value }}
          </p>

          <p v-if="hint && !loading" class="mt-1.5 text-[11px]" style="color: var(--text-tertiary)">
            {{ hint }}
          </p>
        </div>

        <div
          class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          :style="iconWrapStyle"
        >
          <Icon :name="icon" class="w-4 h-4" :style="iconStyle" />
        </div>
      </div>

      <div
        v-if="to"
        class="mt-4 pt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style="border-top: 1px solid rgba(255,255,255,0.05)"
      >
        <span class="text-[11px] font-medium" :style="iconStyle">View details</span>
        <Icon name="lucide:arrow-right" class="w-3 h-3 transition-transform group-hover:translate-x-0.5" :style="iconStyle" />
      </div>
    </div>
  </component>
</template>

<style scoped>
.stat-card {
  background: var(--surface-1);
  border: 1px solid var(--surface-border);
}

.stat-card:hover {
  border-color: var(--surface-border-hover);
  background: var(--surface-2);
}
</style>

<script setup lang="ts">
type Tone = 'brand' | 'blue' | 'amber' | 'slate' | 'red' | 'indigo'

interface Props {
  label: string
  value: string | number
  icon: string
  hint?: string
  loading?: boolean
  to?: string
  tone?: Tone
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  tone: 'brand',
  to: undefined,
  hint: undefined
})

const NuxtLink = resolveComponent('NuxtLink')

const toneMap: Record<Tone, { icon: string; wrap: string; topLine: string; wash: string }> = {
  brand: {
    icon: 'color: var(--brand)',
    wrap: 'background: rgba(var(--brand-rgb) / 0.12); border: 1px solid rgba(var(--brand-rgb) / 0.2)',
    topLine: 'background: linear-gradient(90deg, var(--brand) 0%, transparent 70%)',
    wash: 'background: linear-gradient(180deg, rgba(var(--brand-rgb) / 0.05) 0%, transparent 100%)'
  },
  blue: {
    icon: 'color: #60a5fa',
    wrap: 'background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.2)',
    topLine: 'background: linear-gradient(90deg, #3b82f6 0%, transparent 70%)',
    wash: 'background: linear-gradient(180deg, rgba(59,130,246,0.05) 0%, transparent 100%)'
  },
  amber: {
    icon: 'color: #f59e0b',
    wrap: 'background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.2)',
    topLine: 'background: linear-gradient(90deg, #f59e0b 0%, transparent 70%)',
    wash: 'background: linear-gradient(180deg, rgba(245,158,11,0.05) 0%, transparent 100%)'
  },
  slate: {
    icon: 'color: #818cf8',
    wrap: 'background: rgba(129,140,248,0.12); border: 1px solid rgba(129,140,248,0.2)',
    topLine: 'background: linear-gradient(90deg, #818cf8 0%, transparent 70%)',
    wash: 'background: linear-gradient(180deg, rgba(129,140,248,0.05) 0%, transparent 100%)'
  },
  indigo: {
    icon: 'color: #818cf8',
    wrap: 'background: rgba(129,140,248,0.12); border: 1px solid rgba(129,140,248,0.2)',
    topLine: 'background: linear-gradient(90deg, #818cf8 0%, transparent 70%)',
    wash: 'background: linear-gradient(180deg, rgba(129,140,248,0.05) 0%, transparent 100%)'
  },
  red: {
    icon: 'color: #f87171',
    wrap: 'background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.2)',
    topLine: 'background: linear-gradient(90deg, #ef4444 0%, transparent 70%)',
    wash: 'background: linear-gradient(180deg, rgba(239,68,68,0.05) 0%, transparent 100%)'
  }
}

const iconStyle = computed(() => toneMap[props.tone].icon)
const iconWrapStyle = computed(() => toneMap[props.tone].wrap)
const topLineStyle = computed(() => toneMap[props.tone].topLine)
const gradientWashStyle = computed(() => toneMap[props.tone].wash)
</script>
