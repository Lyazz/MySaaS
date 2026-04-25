<template>
  <section class="relative isolate overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28">
    <div class="cinematic-grid-bg" />
    <ClientOnly>
      <MarketingCinematicHeroCanvas />
    </ClientOnly>
    <MarketingCinematicLightRays />
    <div class="cinematic-noise" />

    <div class="cinematic-container relative">
      <div class="flex flex-col items-center text-center">
        <span class="cinematic-pill cinematic-rise cinematic-rise-d1">
          <span class="cinematic-pill__dot" />
          {{ eyebrow }}
        </span>

        <div class="my-10 cinematic-rise cinematic-rise-d2">
          <MarketingCinematicHeroOrb />
        </div>

        <h1 class="cinematic-headline max-w-5xl cinematic-rise cinematic-rise-d2">
          <template v-if="headlinePre">{{ headlinePre }} </template>
          <em v-if="headlineAccent">{{ headlineAccent }}</em>
          <template v-if="headlinePost"> {{ headlinePost }}</template>
        </h1>

        <p class="cinematic-subhead mt-6 mx-auto cinematic-rise cinematic-rise-d3">
          {{ subhead }}
        </p>

        <div class="mt-9 flex flex-wrap items-center justify-center gap-3 cinematic-rise cinematic-rise-d4">
          <NuxtLink :to="primaryCta.to" class="cinematic-button cinematic-button--primary">
            {{ primaryCta.label }}
            <Icon name="lucide:arrow-right" class="h-4 w-4" />
          </NuxtLink>
          <NuxtLink :to="secondaryCta.to" class="cinematic-button cinematic-button--ghost">
            <Icon name="lucide:play" class="h-3.5 w-3.5" />
            {{ secondaryCta.label }}
          </NuxtLink>
        </div>

        <div class="mt-16 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3 cinematic-rise cinematic-rise-d5">
          <div
            v-for="proof in proofPoints"
            :key="proof.label"
            class="cinematic-glass flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left"
          >
            <Icon :name="proof.icon" class="h-4 w-4 flex-none text-lime-neon" />
            <div class="min-w-0">
              <div class="cinematic-mono-num text-base text-white">{{ proof.value }}</div>
              <div class="text-xs text-[color:var(--m-text-dim)] truncate">{{ proof.label }}</div>
            </div>
          </div>
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
  subhead: string
  primaryCta: { label: string; to: string }
  secondaryCta: { label: string; to: string }
  proofPoints: Array<{ icon: string; value: string; label: string }>
}>()
</script>
