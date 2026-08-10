<template>
  <div class="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
    <Icon
      name="lucide:loader-2"
      class="h-6 w-6 animate-spin"
      style="color: var(--text-tertiary)"
    />
    <p
      class="text-sm"
      style="color: var(--text-tertiary)"
    >
      {{ label }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
}>()
</script>
