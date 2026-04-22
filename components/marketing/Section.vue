<script setup lang="ts">
const props = withDefaults(defineProps<{
  eyebrow?: string
  title?: string
  description?: string
  align?: 'left' | 'center'
  width?: 'default' | 'wide' | 'narrow'
}>(), {
  eyebrow: undefined,
  title: undefined,
  description: undefined,
  align: 'left',
  width: 'default'
})

const widthClass = computed(() => {
  switch (props.width) {
    case 'wide':
      return 'max-w-[90rem]'
    case 'narrow':
      return 'max-w-5xl'
    default:
      return 'max-w-7xl'
  }
})
</script>

<template>
  <section class="marketing-section relative">
    <div class="marketing-container" :class="widthClass">
      <div
        v-if="eyebrow || title || description || $slots.header"
        class="mb-10 md:mb-14"
        :class="align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'"
      >
        <p v-if="eyebrow" class="marketing-eyebrow">
          {{ eyebrow }}
        </p>
        <h2 v-if="title" class="marketing-heading mt-4">
          {{ title }}
        </h2>
        <p v-if="description" class="marketing-copy mt-4">
          {{ description }}
        </p>
        <slot name="header" />
      </div>

      <slot />
    </div>
  </section>
</template>
