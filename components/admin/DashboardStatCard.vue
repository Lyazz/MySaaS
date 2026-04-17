<template>
  <component
    :is="to ? NuxtLink : 'div'"
    v-bind="to ? { to } : {}"
    class="group block rounded-2xl bg-white p-5 transition-all duration-200 hover:-translate-y-0.5"
    style="border: 1px solid #eaecf0; box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)"
    @mouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)'"
    @mouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)'"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p class="text-[13px] font-medium text-slate-500 tracking-wide">
          {{ label }}
        </p>

        <div v-if="loading" class="mt-2.5 h-8 w-20 rounded-lg bg-slate-100 animate-pulse" />
        <p v-else class="mt-2 text-[28px] font-bold tracking-tight text-slate-900 leading-none">
          {{ value }}
        </p>

        <p v-if="hint" class="mt-1.5 text-xs text-slate-400">
          {{ hint }}
        </p>
      </div>

      <div
        class="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center"
        :style="iconWrapStyle"
      >
        <Icon :name="icon" class="h-5 w-5" :style="iconStyle" />
      </div>
    </div>
  </component>
</template>

<script setup lang="ts">
type Tone = 'brand' | 'teal' | 'blue' | 'amber' | 'slate' | 'red'

interface Props {
  label: string
  value: string | number
  icon: string
  hint?: string
  loading?: boolean
  to?: string
  tone?: Tone
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  tone: 'brand',
  to: undefined,
  hint: undefined
})

const NuxtLink = resolveComponent('NuxtLink')

const iconWrapStyle = computed(() => {
  const tones: Record<Tone, string> = {
    brand: 'background: rgba(var(--brand-rgb) / 0.1); box-shadow: inset 0 0 0 1px rgba(var(--brand-rgb) / 0.2)',
    teal: 'background: rgba(20,184,166,0.1); box-shadow: inset 0 0 0 1px rgba(20,184,166,0.2)',
    blue: 'background: rgba(59,130,246,0.1); box-shadow: inset 0 0 0 1px rgba(59,130,246,0.2)',
    amber: 'background: rgba(245,158,11,0.1); box-shadow: inset 0 0 0 1px rgba(245,158,11,0.2)',
    slate: 'background: rgba(100,116,139,0.1); box-shadow: inset 0 0 0 1px rgba(100,116,139,0.2)',
    red: 'background: rgba(239,68,68,0.1); box-shadow: inset 0 0 0 1px rgba(239,68,68,0.2)'
  }
  return tones[props.tone]
})

const iconStyle = computed(() => {
  const tones: Record<Tone, string> = {
    brand: 'color: var(--brand)',
    teal: 'color: rgb(13,148,136)',
    blue: 'color: rgb(37,99,235)',
    amber: 'color: rgb(217,119,6)',
    slate: 'color: rgb(71,85,105)',
    red: 'color: rgb(220,38,38)'
  }
  return tones[props.tone]
})
</script>
