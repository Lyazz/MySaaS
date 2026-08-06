<script setup lang="ts">
import type { MarketingTone } from '~/shared/marketing/types'

const props = withDefaults(defineProps<{
  tone?: MarketingTone
  compact?: boolean
}>(), {
  tone: 'cobalt',
  compact: false
})

const toneClasses: Record<MarketingTone, string> = {
  cobalt: 'from-[#3559ff1f] via-[#0d1633] to-[#0b1020]',
  lime: 'from-[#84CC161a] via-[#0b1820] to-[#09131f]',
  orange: 'from-[#ff8a4c26] via-[#14111d] to-[#0b1020]',
  neutral: 'from-white/8 via-white/3 to-white/0'
}
</script>

<template>
  <div
    class="marketing-frame relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#0b1020]/88 shadow-[0_30px_120px_-50px_rgba(53,89,255,0.7)] backdrop-blur-md"
    :class="[compact ? 'p-4 md:p-5' : 'p-5 md:p-7']"
  >
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_36%)]" />
    <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_22%,transparent_78%,rgba(255,255,255,0.04))]" />
    <div class="pointer-events-none absolute -end-16 top-0 h-40 w-40 rounded-full blur-3xl" :class="`bg-gradient-to-br ${toneClasses[props.tone]}`" />

    <div class="relative z-10">
      <slot />
    </div>
  </div>
</template>

