<script setup lang="ts">
import { computed, resolveComponent } from 'vue'

const { t } = useI18n({ useScope: 'global' })

definePageMeta({
  layout: 'marketing'
})

useSeoMeta({
  title: computed(() => `${t('marketing.nav.features')} — Swekly`),
  description: computed(() => t('marketing.featuresPage.hero.subtitle'))
})

const MechanismBuilder = resolveComponent('MarketingCinematicMechanismsMechanismBuilder')
const MechanismPayment = resolveComponent('MarketingCinematicMechanismsMechanismPayment')
const MechanismLogistics = resolveComponent('MarketingCinematicMechanismsMechanismLogistics')
const MechanismAnalytics = resolveComponent('MarketingCinematicMechanismsMechanismAnalytics')

const featureGroups = computed(() => [
  {
    eyebrow: '01 · Storefront',
    title: t('marketing.featuresPage.items.builder.title'),
    description: t('marketing.featuresPage.items.builder.description'),
    icon: 'lucide:layout-template',
    mechanism: MechanismBuilder,
    items: [
      { icon: 'lucide:smartphone', label: t('saasLanding.features.items.templates.title') },
      { icon: 'lucide:globe', label: t('marketing.featuresPage.items.domains.title') },
      { icon: 'lucide:languages', label: t('marketing.featuresPage.items.localization.title') }
    ]
  },
  {
    eyebrow: '02 · Commerce',
    title: t('marketing.featuresPage.items.payments.title'),
    description: t('marketing.featuresPage.items.payments.description'),
    icon: 'lucide:credit-card',
    mechanism: MechanismPayment,
    items: [
      { icon: 'lucide:shield-check', label: t('saasLanding.trust.secure') },
      { icon: 'lucide:badge-dollar-sign', label: t('marketing.featuresPage.bullets.checkout') },
      { icon: 'lucide:repeat', label: t('marketing.featuresPage.items.payments.title') }
    ]
  },
  {
    eyebrow: '03 · Logistics',
    title: t('marketing.featuresPage.items.logistics.title'),
    description: t('marketing.featuresPage.items.logistics.description'),
    icon: 'lucide:truck',
    mechanism: MechanismLogistics,
    items: [
      { icon: 'lucide:send', label: t('marketing.featuresPage.bullets.carriers') },
      { icon: 'lucide:boxes', label: t('marketing.featuresPage.bullets.dispatch') },
      { icon: 'lucide:map-pin', label: t('marketing.featuresPage.items.logistics.title') }
    ]
  },
  {
    eyebrow: '04 · Intelligence',
    title: t('marketing.featuresPage.items.analytics.title'),
    description: t('marketing.featuresPage.items.analytics.description'),
    icon: 'lucide:bar-chart-3',
    mechanism: MechanismAnalytics,
    items: [
      { icon: 'lucide:line-chart', label: t('auth.login.hero.carousel.analytics.title') },
      { icon: 'lucide:sparkles', label: t('saasLanding.features.items.aiTools.title') },
      { icon: 'lucide:target', label: t('marketing.featuresPage.items.analytics.title') }
    ]
  }
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
            {{ t('marketing.nav.features') }}
          </span>
          <h1 class="cinematic-headline mt-6">
            {{ t('marketing.featuresPage.hero.title.prefix') }}
            <em>{{ t('marketing.featuresPage.hero.title.accent') }}</em>
          </h1>
          <p class="cinematic-subhead mx-auto mt-5">{{ t('marketing.featuresPage.hero.subtitle') }}</p>
          <div class="mt-9 flex flex-wrap items-center justify-center gap-3">
            <NuxtLink to="/register" class="cinematic-button cinematic-button--primary">
              {{ t('marketing.actions.getStarted') }}
              <Icon name="lucide:arrow-right" class="h-4 w-4" />
            </NuxtLink>
            <NuxtLink to="/pricing" class="cinematic-button cinematic-button--ghost">
              {{ t('marketing.nav.pricing') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Feature groups ─── -->
    <section class="cinematic-section !pt-12">
      <div class="cinematic-container">
        <div class="space-y-16 md:space-y-24">
          <div
            v-for="group in featureGroups"
            :key="group.title"
            class="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center"
          >
            <div v-motion-slide-visible-once-bottom>
              <div class="cinematic-eyebrow mb-3 flex items-center gap-2">
                <Icon :name="group.icon" class="h-3.5 w-3.5 text-lime-neon" />
                {{ group.eyebrow }}
              </div>
              <h2 class="cinematic-headline !text-4xl md:!text-5xl">{{ group.title }}</h2>
              <p class="cinematic-subhead mt-5">{{ group.description }}</p>
              <div class="mt-7 grid gap-2.5 sm:grid-cols-2">
                <div v-for="item in group.items" :key="item.label" class="cinematic-glass flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm text-white/85">
                  <Icon :name="item.icon" class="h-3.5 w-3.5 flex-none text-lime-neon" />
                  <span>{{ item.label }}</span>
                </div>
              </div>
            </div>

            <div v-motion-slide-visible-once-bottom class="cinematic-card relative aspect-[5/4] overflow-hidden p-0">
              <div class="absolute inset-0 bg-gradient-to-br from-[#0A1014] via-[#06181a] to-[#05070A]" />
              <div class="absolute inset-0 cinematic-grid-bg opacity-50" />
              <div class="absolute inset-0 -m-8 rounded-full bg-lime-neon/10 blur-3xl" />
              <div class="relative h-full p-6 md:p-8">
                <component :is="group.mechanism" size="full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Final CTA ─── -->
    <MarketingCinematicCTABand
      :eyebrow="t('marketing.featuresPage.cta.title')"
      :headline-pre="t('saasLanding.cinematic.cta.headlinePre')"
      :headline-accent="t('saasLanding.cinematic.cta.headlineAccent')"
      :headline-post="t('saasLanding.cinematic.cta.headlinePost')"
      :primary-cta="{ label: t('marketing.featuresPage.cta.button'), to: '/register' }"
      :secondary-cta="{ label: t('marketing.footer.support.contact'), to: '/contact' }"
    />
  </div>
</template>
