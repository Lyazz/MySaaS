<template>
  <component
    :is="to ? NuxtLink : 'div'"
    v-bind="to ? { to } : {}"
    class="group block rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:shadow-md"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="text-sm font-medium text-slate-600">
          {{ label }}
        </p>

        <div
          v-if="loading"
          class="mt-2 h-9 w-24 rounded-lg bg-slate-100 animate-pulse"
        />
        <p
          v-else
          class="mt-2 text-3xl font-semibold tracking-tight text-slate-900"
        >
          {{ value }}
        </p>

        <p
          v-if="hint"
          class="mt-1 text-xs text-slate-500"
        >
          {{ hint }}
        </p>
      </div>

      <div
        class="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center border"
        :class="iconWrapClass"
      >
        <Icon
          :name="icon"
          class="h-5 w-5"
          :class="iconClass"
        />
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

const iconWrapClass = computed(() => {
  const tones: Record<Tone, string> = {
    brand: 'bg-teal-50 border-teal-200',
    teal: 'bg-teal-50 border-teal-200',
    blue: 'bg-blue-50 border-blue-200',
    amber: 'bg-amber-50 border-amber-200',
    slate: 'bg-slate-50 border-slate-200',
    red: 'bg-red-50 border-red-200'
  }
  return tones[props.tone]
})

const iconClass = computed(() => {
  const tones: Record<Tone, string> = {
    brand: 'text-teal-700',
    teal: 'text-teal-700',
    blue: 'text-blue-700',
    amber: 'text-amber-700',
    slate: 'text-slate-700',
    red: 'text-red-700'
  }
  return tones[props.tone]
})
</script>
