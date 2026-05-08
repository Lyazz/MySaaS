<script setup lang="ts">
import type { MarketingStat, MarketingTone } from '~/shared/marketing/types'

defineProps<{
  items: MarketingStat[]
}>()

const toneClasses: Record<MarketingTone, string> = {
  cobalt: 'from-[#3559ff]/25 to-transparent text-[#8fa7ff]',
  lime: 'from-[#84CC16]/25 to-transparent text-[#BEF264]',
  orange: 'from-[#ff8a4c]/25 to-transparent text-[#ffb38e]',
  neutral: 'from-white/10 to-transparent text-white/75'
}
</script>

<template>
  <div class="grid gap-4 md:grid-cols-3">
    <article
      v-for="item in items"
      :key="`${item.label}-${item.value}`"
      class="group relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1"
    >
      <div class="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br opacity-80" :class="toneClasses[item.tone || 'neutral']" />
      <div class="relative z-10">
        <div class="flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.28em] text-white/50">
          <Icon v-if="item.icon" :name="item.icon" class="h-3.5 w-3.5" />
          <span>{{ item.label }}</span>
        </div>
        <div class="mt-4 text-3xl font-display font-semibold tracking-[-0.04em] text-white md:text-[2.3rem]">
          {{ item.value }}
        </div>
        <p v-if="item.detail" class="mt-2 max-w-xs text-sm leading-relaxed text-slate-300">
          {{ item.detail }}
        </p>
      </div>
    </article>
  </div>
</template>
