<template>
  <section class="relative isolate overflow-hidden py-24 md:py-32">
    <MarketingCinematicLightRays />
    <div class="cinematic-grid-bg" />

    <div class="cinematic-container relative">
      <div class="mx-auto max-w-3xl text-center">
        <span class="cinematic-pill">
          <span class="cinematic-pill__dot" />
          {{ eyebrow }}
        </span>
        <h2 class="cinematic-headline mt-6">
          <template v-if="headlinePre">{{ headlinePre }} </template>
          <em v-if="headlineAccent">{{ headlineAccent }}</em>
          <template v-if="headlinePost"> {{ headlinePost }}</template>
        </h2>
        <p v-if="subhead" class="cinematic-subhead mt-5 mx-auto">{{ subhead }}</p>
        <div class="mt-9 flex flex-wrap items-center justify-center gap-3">
          <NuxtLink :to="primaryCta.to" class="cinematic-button cinematic-button--primary">
            {{ primaryCta.label }}
            <Icon name="lucide:arrow-right" class="h-4 w-4" />
          </NuxtLink>
          <NuxtLink v-if="secondaryCta" :to="secondaryCta.to" class="cinematic-button cinematic-button--ghost">
            {{ secondaryCta.label }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow: string
  headlinePre?: string
  headlineAccent?: string
  headlinePost?: string
  subhead?: string
  primaryCta: { label: string; to: string }
  secondaryCta?: { label: string; to: string }
}>()
</script>
