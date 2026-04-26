<script setup lang="ts">
type LogoSize = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  size?: LogoSize
  showWordmark?: boolean
  alt?: string
}>(), {
  size: 'md',
  showWordmark: true,
  alt: 'Swekly'
})

const imageHeightClass = computed(() => {
  if (props.size === 'sm') return 'h-6'
  if (props.size === 'lg') return 'h-9'
  return 'h-7'
})

const wordmarkClass = computed(() => {
  if (props.size === 'sm') return 'text-[14px]'
  if (props.size === 'lg') return 'text-[20px]'
  return 'text-[17px]'
})
</script>

<template>
  <span
    class="inline-flex items-center gap-2.5"
    data-testid="saas-logo"
    :data-size="size"
    :data-wordmark="showWordmark ? 'on' : 'off'"
  >
    <img
      src="/swekly-logo-mark.svg"
      :alt="alt"
      data-testid="saas-logo-image"
      class="w-auto shrink-0 object-contain"
      :class="imageHeightClass"
    >
    <span
      v-if="showWordmark"
      data-testid="saas-logo-wordmark"
      class="font-medium tracking-tight text-white"
      :class="wordmarkClass"
    >
      Swekly
    </span>
  </span>
</template>
