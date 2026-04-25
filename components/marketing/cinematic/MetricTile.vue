<template>
  <div class="relative">
    <div v-motion-slide-visible-once-bottom class="text-left">
      <div class="cinematic-eyebrow mb-3">{{ label }}</div>
      <div class="cinematic-stat-num">{{ value }}</div>
      <div class="mt-3 h-px w-12 bg-lime-neon/70" />
      <p v-if="detail" class="mt-4 text-sm text-[color:var(--m-text-dim)] max-w-xs">
        {{ detail }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string
  detail?: string
}>()
</script>
