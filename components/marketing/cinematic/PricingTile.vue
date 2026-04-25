<template>
  <div
    class="cinematic-card relative flex flex-col p-7 md:p-8"
    :class="featured ? 'cinematic-card--featured' : ''"
  >
    <div v-if="featured" class="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-lime-neon px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--m-bg)]">
      <Icon name="lucide:star" class="h-3 w-3" />
      {{ popularLabel }}
    </div>

    <div class="cinematic-eyebrow">{{ name }}</div>

    <div class="mt-5 flex items-baseline gap-2">
      <span class="font-cinematic font-medium tracking-[-0.04em] text-white" style="font-size: clamp(2.5rem, 4vw, 3.25rem); line-height: 1;">
        {{ price }}
      </span>
      <span v-if="currency" class="text-[color:var(--m-text-dim)] text-sm font-mono">{{ currency }}</span>
    </div>
    <div v-if="period" class="mt-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--m-text-faint)] font-mono">
      {{ period }}
    </div>

    <p class="mt-5 text-[15px] leading-relaxed text-[color:var(--m-text-dim)] min-h-[3rem]">
      {{ description }}
    </p>

    <div class="my-6 cinematic-divider" />

    <ul v-if="features?.length" class="space-y-3 mb-8">
      <li v-for="feat in features" :key="feat" class="flex items-start gap-2.5 text-sm text-[color:var(--m-text)]/85">
        <Icon name="lucide:check" class="mt-0.5 h-4 w-4 flex-none text-lime-neon" />
        <span>{{ feat }}</span>
      </li>
    </ul>

    <div class="mt-auto">
      <NuxtLink
        :to="ctaTo"
        class="cinematic-button w-full"
        :class="featured ? 'cinematic-button--primary' : 'cinematic-button--ghost'"
      >
        {{ cta }}
        <Icon name="lucide:arrow-right" class="h-4 w-4" />
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  price: string
  currency?: string
  period?: string
  description: string
  features?: string[]
  cta: string
  ctaTo: string
  featured?: boolean
  popularLabel: string
}>()
</script>
