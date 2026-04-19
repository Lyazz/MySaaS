<template>
  <div class="mb-6">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h2
          class="text-[22px] font-semibold truncate"
          style="color: var(--text-primary); letter-spacing: -0.02em;"
        >
          {{ title }}
        </h2>
        <p
          v-if="subtitle"
          class="mt-0.5 text-[13px]"
          style="color: var(--text-secondary);"
        >
          {{ subtitle }}
        </p>
      </div>
      <div v-if="$slots.default" class="flex items-center gap-2 shrink-0">
        <slot />
      </div>
    </div>

    <!-- Stat pills -->
    <div v-if="stats && stats.length" class="flex flex-wrap items-center gap-2 mt-3">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium"
        :style="pillStyle(stat.tone)"
      >
        <span class="font-bold stat-number">{{ stat.value }}</span>
        <span style="color: inherit; opacity: 0.75;">{{ stat.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type StatTone = 'default' | 'green' | 'amber' | 'red' | 'blue'

interface Stat {
  label: string
  value: string | number
  tone?: StatTone
}

defineProps<{
  title: string
  subtitle?: string
  stats?: Stat[]
}>()

function pillStyle(tone?: StatTone) {
  switch (tone) {
    case 'green':
      return 'background: var(--status-delivered-bg); color: var(--status-delivered-text); border: 1px solid rgba(34,197,94,0.2);'
    case 'amber':
      return 'background: var(--status-pending-bg); color: var(--status-pending-text); border: 1px solid rgba(245,158,11,0.2);'
    case 'red':
      return 'background: var(--status-cancelled-bg); color: var(--status-cancelled-text); border: 1px solid rgba(239,68,68,0.2);'
    case 'blue':
      return 'background: var(--status-confirmed-bg); color: var(--status-confirmed-text); border: 1px solid rgba(59,130,246,0.2);'
    default:
      return 'background: var(--surface-2); color: var(--text-secondary); border: 1px solid var(--surface-border);'
  }
}
</script>
