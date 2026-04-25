<template>
  <section class="cinematic-section" :class="{ 'cinematic-section--grid': gridOverlay }">
    <div v-if="gridOverlay" class="cinematic-grid-bg" />
    <div class="cinematic-container">
      <div v-if="eyebrow || titlePre || titleAccent || description" class="mb-12 md:mb-16 max-w-3xl" :class="centered ? 'mx-auto text-center' : ''">
        <span v-if="eyebrow" class="cinematic-pill">
          <span class="cinematic-pill__dot" />
          {{ eyebrow }}
        </span>
        <h2 v-if="titlePre || titleAccent" class="cinematic-headline mt-6">
          <template v-if="titlePre">{{ titlePre }} </template>
          <em v-if="titleAccent">{{ titleAccent }}</em>
          <template v-if="titlePost"> {{ titlePost }}</template>
        </h2>
        <p v-if="description" class="cinematic-subhead mt-5" :class="centered ? 'mx-auto' : ''">
          {{ description }}
        </p>
      </div>
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow?: string
  titlePre?: string
  titleAccent?: string
  titlePost?: string
  description?: string
  centered?: boolean
  gridOverlay?: boolean
}>()
</script>
