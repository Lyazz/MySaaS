<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div class="min-w-0">
      <nav
 v-if="$slots.breadcrumb"
 class="mb-1 flex flex-wrap items-center gap-2 text-sm text-tertiary"
 
>
        <slot name="breadcrumb" />
      </nav>
      <h1
 class="truncate text-2xl font-bold tracking-tight text-primary"
 
>
        {{ title }}
      </h1>
      <p
 v-if="subtitle"
 class="mt-1 text-sm text-secondary"
 
>
        {{ subtitle }}
      </p>
    </div>
    <div
      v-if="$slots.actions"
      class="flex shrink-0 flex-wrap items-center gap-2"
    >
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>
