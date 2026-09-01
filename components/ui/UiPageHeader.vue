<template>
  <div class="mb-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <p v-if="section" class="ui-eyebrow mb-1">{{ section }}</p>
        <h1 class="truncate text-xl font-semibold tracking-tight text-primary">{{ title }}</h1>
        <p v-if="subtitle" class="mt-0.5 text-xs text-tertiary">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.default" class="mt-0.5 flex flex-wrap items-center gap-2">
        <slot />
      </div>
    </div>

    <div v-if="stats && stats.length" class="mt-3 flex flex-wrap items-center gap-2">
      <span
        v-for="stat in stats"
        :key="stat.label"
        class="ui-badge gap-1.5"
        :class="`ui-badge--${toneClass(stat.tone)}`"
      >
        <span class="stat-number">{{ stat.value }}</span>
        <span class="font-medium opacity-75">{{ stat.label }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The title block every admin screen opens with: optional section kicker,
 * page title, subtitle, an action slot and a row of stat pills.
 *
 * Pills reuse `.ui-badge--*` rather than carrying their own inline colours, so
 * a "delivered" count here is the same green as a delivered row in a table.
 */
type StatTone = 'default' | 'green' | 'amber' | 'red' | 'blue'

interface Stat {
  label: string
  value: string | number
  tone?: StatTone
}

defineProps<{
  title: string
  subtitle?: string
  section?: string
  stats?: Stat[]
}>()

const TONES: Record<StatTone, string> = {
  default: 'slate',
  green: 'emerald',
  amber: 'amber',
  red: 'red',
  blue: 'indigo'
}

const toneClass = (tone?: StatTone) => TONES[tone || 'default']
</script>
