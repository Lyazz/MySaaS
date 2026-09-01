<template>
  <span class="ui-badge" :class="`ui-badge--${tone}`">
    <Icon v-if="icon" :name="icon" class="me-1 h-3 w-3 shrink-0" />
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
/** Status pill. Tones map to the `.ui-badge--*` variants, which are theme-aware. */
withDefaults(defineProps<{
  tone?: 'slate' | 'emerald' | 'indigo' | 'lime' | 'amber' | 'red'
  label?: string | number
  icon?: string
}>(), { tone: 'slate' })
</script>
