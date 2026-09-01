<template>
  <div class="flex flex-col items-center justify-center px-6 py-12 text-center">
    <div v-if="icon" class="ui-icon-tile ui-icon-tile--slate mb-4 h-12 w-12">
      <Icon :name="icon" class="h-5 w-5" />
    </div>
    <p class="text-sm font-semibold text-primary">{{ title }}</p>
    <p v-if="description" class="mt-1 max-w-sm text-xs text-tertiary">{{ description }}</p>
    <div v-if="$slots.default" class="mt-4 flex flex-wrap items-center justify-center gap-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
/** "Nothing here yet" — one shape for the empty branch of every list and table. */
defineProps<{
  title: string
  description?: string
  icon?: string
}>()
</script>
