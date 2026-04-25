<template>
  <div class="relative overflow-hidden">
    <div class="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[color:var(--m-bg)] to-transparent" />
    <div class="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[color:var(--m-bg)] to-transparent" />
    <Vue3Marquee :duration="duration" :gradient="false" :direction="direction" pause-on-hover>
      <slot />
    </Vue3Marquee>
  </div>
</template>

<script setup lang="ts">
import { Vue3Marquee } from 'vue3-marquee'

withDefaults(defineProps<{
  duration?: number
  direction?: 'normal' | 'reverse'
}>(), {
  duration: 45,
  direction: 'normal'
})
</script>
