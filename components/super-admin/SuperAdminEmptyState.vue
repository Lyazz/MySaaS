<template>
  <div class="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
    <div class="ui-icon-tile ui-icon-tile--slate h-14 w-14">
      <Icon :name="icon" class="h-6 w-6" />
    </div>
    <div>
      <p
        class="text-sm font-semibold"
        style="color: var(--text-primary)"
      >
        {{ title }}
      </p>
      <p
        v-if="subtitle"
        class="mt-1 text-sm"
        style="color: var(--text-tertiary)"
      >
        {{ subtitle }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  subtitle?: string
}>()
</script>
