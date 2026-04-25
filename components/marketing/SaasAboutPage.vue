<script setup lang="ts">
import { computed } from 'vue'

const { t } = useI18n({ useScope: 'global' })

useSeoMeta({
  title: computed(() => `${t('marketing.nav.about')} — Swekly`),
  description: computed(() => t('marketing.aboutPage.heroSubtitle'))
})

const principles = computed(() => [
  { icon: 'lucide:workflow', title: t('marketing.aboutPage.principles.items.platform.title'), body: t('marketing.aboutPage.principles.items.platform.body') },
  { icon: 'lucide:shield', title: t('marketing.aboutPage.principles.items.tenancy.title'), body: t('marketing.aboutPage.principles.items.tenancy.body') },
  { icon: 'lucide:badge-dollar-sign', title: t('marketing.aboutPage.principles.items.cod.title'), body: t('marketing.aboutPage.principles.items.cod.body') },
  { icon: 'lucide:rocket', title: t('marketing.aboutPage.principles.items.ops.title'), body: t('marketing.aboutPage.principles.items.ops.body') }
])
</script>

<template>
  <div class="pt-24 md:pt-32">
    <!-- ─── Hero ─── -->
    <section class="relative overflow-hidden pb-12">
      <div class="cinematic-grid-bg" />
      <div class="cinematic-container relative">
        <div class="mx-auto max-w-3xl text-center">
          <span class="cinematic-pill">
            <span class="cinematic-pill__dot" />
            {{ t('marketing.nav.about') }}
          </span>
          <h1 class="cinematic-headline mt-6">
            {{ t('marketing.aboutPage.heroTitle') }}
          </h1>
          <p class="cinematic-subhead mx-auto mt-5">{{ t('marketing.aboutPage.heroSubtitle') }}</p>
        </div>
      </div>
    </section>

    <!-- ─── Manifesto ─── -->
    <section class="cinematic-section">
      <div class="cinematic-container">
        <div class="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <div class="cinematic-eyebrow mb-3">{{ t('marketing.aboutPage.context.storyLabel') }}</div>
            <h2 class="cinematic-headline !text-4xl">{{ t('marketing.aboutPage.storyTitle') }}</h2>
            <p class="cinematic-subhead mt-5">{{ t('marketing.aboutPage.storyBody') }}</p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="cinematic-card p-5">
              <Icon name="lucide:smartphone" class="h-5 w-5 text-lime-neon" />
              <p class="mt-4 text-sm leading-relaxed text-white/85">{{ t('marketing.aboutPage.context.mobile') }}</p>
            </div>
            <div class="cinematic-card p-5">
              <Icon name="lucide:truck" class="h-5 w-5 text-lime-neon" />
              <p class="mt-4 text-sm leading-relaxed text-white/85">{{ t('marketing.aboutPage.context.delivery') }}</p>
            </div>
            <div class="cinematic-card p-5">
              <Icon name="lucide:badge-dollar-sign" class="h-5 w-5 text-lime-neon" />
              <p class="mt-4 text-sm leading-relaxed text-white/85">{{ t('marketing.aboutPage.context.cod') }}</p>
            </div>
            <div class="cinematic-card p-5">
              <Icon name="lucide:languages" class="h-5 w-5 text-lime-neon" />
              <p class="mt-4 text-sm leading-relaxed text-white/85">AR · FR · EN — RTL native.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Principles ─── -->
    <MarketingCinematicSectionShell
      :eyebrow="t('marketing.aboutPage.principles.label') || 'Principles'"
      :title="t('marketing.aboutPage.principles.title') || 'How we build'"
    >
      <div class="grid gap-5 md:grid-cols-2">
        <MarketingCinematicFeatureCard3D
          v-for="p in principles"
          :key="p.title"
          v-motion-slide-visible-once-bottom
          :icon="p.icon"
          :title="p.title"
          :description="p.body"
        />
      </div>
    </MarketingCinematicSectionShell>

    <!-- ─── CTA ─── -->
    <MarketingCinematicCTABand
      :eyebrow="t('saasLanding.cinematic.cta.eyebrow')"
      :headline-pre="t('saasLanding.cinematic.cta.headlinePre')"
      :headline-accent="t('saasLanding.cinematic.cta.headlineAccent')"
      :headline-post="t('saasLanding.cinematic.cta.headlinePost')"
      :primary-cta="{ label: t('marketing.actions.getStarted'), to: '/register' }"
      :secondary-cta="{ label: t('marketing.footer.support.contact'), to: '/contact' }"
    />
  </div>
</template>
