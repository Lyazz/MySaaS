<template>
  <div class="relative overflow-hidden">
    <div class="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[color:var(--m-bg)] to-transparent" />
    <div class="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[color:var(--m-bg)] to-transparent" />
    <Vue3Marquee :duration="38" :gradient="false" pause-on-hover class="py-2">
      <div
        v-for="(logo, i) in logos"
        :key="logo.name + i"
        class="mx-10 flex items-center gap-2 text-[color:var(--m-text-dim)] hover:text-white transition-colors"
      >
        <Icon :name="logo.icon" class="h-5 w-5" />
        <span class="font-mono text-sm uppercase tracking-[0.22em]">{{ logo.name }}</span>
      </div>
    </Vue3Marquee>
  </div>
</template>

<script setup lang="ts">
import { Vue3Marquee } from 'vue3-marquee'

defineProps<{
  logos: Array<{ name: string; icon: string }>
}>()
</script>
