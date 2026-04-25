<template>
  <div ref="el" class="cinematic-card group relative h-full p-7 will-change-transform">
    <div class="cinematic-card-glow" />
    <div class="relative flex h-full flex-col">
      <div class="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
        <Icon :name="icon" class="h-5 w-5 text-lime-neon" />
      </div>

      <div v-if="step" class="cinematic-mono-num mb-3 text-xs uppercase tracking-[0.24em] text-[color:var(--m-text-dim)]">
        {{ step }}
      </div>

      <h3 class="text-xl font-medium tracking-tight text-white">{{ title }}</h3>
      <p class="mt-3 text-[15px] leading-relaxed text-[color:var(--m-text-dim)]">{{ description }}</p>

      <div v-if="bullets?.length" class="mt-6 space-y-2.5 border-t border-white/5 pt-5">
        <div v-for="bullet in bullets" :key="bullet.label" class="flex items-center gap-2.5 text-sm text-[color:var(--m-text)]/85">
          <Icon :name="bullet.icon" class="h-3.5 w-3.5 flex-none text-lime-neon" />
          <span>{{ bullet.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTilt } from '~/composables/useTilt'

defineProps<{
  icon: string
  title: string
  description: string
  step?: string
  bullets?: Array<{ icon: string; label: string }>
}>()

const { el } = useTilt({ max: 5, scale: 1.012 })
</script>
