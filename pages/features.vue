<script setup lang="ts">
import type { MarketingChapter } from '~/shared/marketing/types'

const { t } = useI18n({ useScope: 'global' })

definePageMeta({
  layout: 'marketing'
})

useSeoMeta({
  title: computed(() => `${t('marketing.nav.features')} - Swekly`),
  description: computed(() => t('marketing.featuresPage.hero.subtitle'))
})

const chapters = computed<MarketingChapter[]>(() => [
  {
    eyebrow: '01',
    title: t('marketing.featuresPage.items.builder.title'),
    description: t('marketing.featuresPage.items.builder.description'),
    icon: 'lucide:layout-template',
    tone: 'cobalt',
    bullets: [
      { label: t('saasLanding.features.items.templates.title'), icon: 'lucide:smartphone' },
      { label: t('marketing.featuresPage.items.domains.title'), icon: 'lucide:globe' }
    ]
  },
  {
    eyebrow: '02',
    title: t('marketing.featuresPage.items.payments.title'),
    description: t('marketing.featuresPage.items.payments.description'),
    icon: 'lucide:credit-card',
    tone: 'teal',
    bullets: [
      { label: t('saasLanding.trust.secure'), icon: 'lucide:shield-check' },
      { label: t('marketing.featuresPage.bullets.checkout'), icon: 'lucide:badge-dollar-sign' }
    ]
  },
  {
    eyebrow: '03',
    title: t('marketing.featuresPage.items.logistics.title'),
    description: t('marketing.featuresPage.items.logistics.description'),
    icon: 'lucide:truck',
    tone: 'orange',
    bullets: [
      { label: t('marketing.featuresPage.bullets.carriers'), icon: 'lucide:send' },
      { label: t('marketing.featuresPage.bullets.dispatch'), icon: 'lucide:boxes' }
    ]
  },
  {
    eyebrow: '04',
    title: t('marketing.featuresPage.items.analytics.title'),
    description: t('marketing.featuresPage.items.analytics.description'),
    icon: 'lucide:bar-chart-3',
    tone: 'cobalt',
    bullets: [
      { label: t('auth.login.hero.carousel.analytics.title'), icon: 'lucide:line-chart' },
      { label: t('saasLanding.features.items.aiTools.title'), icon: 'lucide:sparkles' }
    ]
  }
])
</script>

<template>
  <div class="relative overflow-hidden pt-28 md:pt-32">
    <section class="marketing-section pb-10">
      <div class="marketing-container max-w-[90rem]">
        <div class="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
          <div>
            <div class="marketing-eyebrow">
              <Icon name="lucide:layers-3" class="h-3.5 w-3.5 text-[#16d5b3]" />
              {{ t('marketing.nav.features') }}
            </div>
            <h1 class="mt-6 font-display text-5xl font-semibold tracking-[-0.06em] text-white md:text-6xl lg:text-7xl">
              {{ t('marketing.featuresPage.hero.title.prefix') }}
              <span class="block bg-[linear-gradient(135deg,#ffffff,#8fa7ff)] bg-clip-text text-transparent">
                {{ t('marketing.featuresPage.hero.title.accent') }}
              </span>
            </h1>
            <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              {{ t('marketing.featuresPage.hero.subtitle') }}
            </p>
            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <NuxtLink to="/register" class="marketing-button marketing-button--primary">
                {{ t('marketing.actions.getStarted') }}
              </NuxtLink>
              <NuxtLink to="/pricing" class="marketing-button marketing-button--ghost">
                {{ t('marketing.nav.pricing') }}
              </NuxtLink>
            </div>
          </div>

          <MarketingVisualFrame tone="cobalt">
            <div class="grid gap-4 md:grid-cols-2">
              <div class="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5">
                <p class="marketing-label">{{ t('marketing.featuresPage.visual.setupLabel') }}</p>
                <p class="mt-3 text-2xl font-display font-semibold text-white">
                  {{ t('marketing.featuresPage.visual.setupTitle') }}
                </p>
                <div class="mt-5 space-y-3 text-sm text-slate-300">
                  <div class="feature-lab-row">
                    <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
                    {{ t('marketing.featuresPage.visual.setupTheme') }}
                  </div>
                  <div class="feature-lab-row">
                    <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
                    {{ t('marketing.featuresPage.visual.setupCheckout') }}
                  </div>
                  <div class="feature-lab-row">
                    <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
                    {{ t('marketing.featuresPage.visual.setupDelivery') }}
                  </div>
                </div>
              </div>

              <div class="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(53,89,255,0.2),rgba(255,255,255,0.03))] p-5">
                <p class="marketing-label">{{ t('marketing.featuresPage.visual.signalLabel') }}</p>
                <div class="mt-4 flex items-end gap-2">
                  <div class="feature-lab-bar h-16" />
                  <div class="feature-lab-bar h-24" />
                  <div class="feature-lab-bar h-20" />
                  <div class="feature-lab-bar h-28" />
                  <div class="feature-lab-bar h-32" />
                </div>
              </div>
            </div>
          </MarketingVisualFrame>
        </div>
      </div>
    </section>

    <MarketingSection width="wide">
      <div class="space-y-6">
        <div
          v-for="chapter in chapters"
          :key="chapter.title"
          class="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]"
        >
          <div class="lg:sticky lg:top-28 lg:self-start">
            <MarketingVisualFrame :tone="chapter.tone || 'cobalt'">
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <p class="marketing-label">{{ chapter.eyebrow }}</p>
                  <Icon :name="chapter.icon || 'lucide:sparkles'" class="h-5 w-5 text-[#8fa7ff]" />
                </div>
                <h2 class="font-display text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
                  {{ chapter.title }}
                </h2>
                <p class="text-base leading-7 text-slate-300">
                  {{ chapter.description }}
                </p>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div
                    v-for="bullet in chapter.bullets"
                    :key="bullet.label"
                    class="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200"
                  >
                    <div class="flex items-center gap-2">
                      <Icon :name="bullet.icon || 'lucide:check'" class="h-4 w-4 text-[#16d5b3]" />
                      {{ bullet.label }}
                    </div>
                  </div>
                </div>
              </div>
            </MarketingVisualFrame>
          </div>

          <div class="marketing-panel px-6 py-6 md:px-8 md:py-8">
            <div class="grid gap-4 md:grid-cols-2">
              <div class="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-5">
                <p class="marketing-label">{{ t('marketing.featuresPage.outcomeLabel') }}</p>
                <p class="mt-3 text-xl font-display font-semibold tracking-[-0.04em] text-white">
                  {{ t('marketing.featuresPage.outcomeTitle') }}
                </p>
                <p class="mt-3 text-sm leading-7 text-slate-300">
                  {{ t('marketing.featuresPage.outcomeBody') }}
                </p>
              </div>
              <div class="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-5">
                <p class="marketing-label">{{ t('marketing.featuresPage.surfaceLabel') }}</p>
                <p class="mt-3 text-sm leading-7 text-slate-300">
                  {{ t('marketing.featuresPage.surfaceBody') }}
                </p>
                <div class="mt-4 h-2 rounded-full bg-white/10">
                  <div class="h-2 w-[78%] rounded-full bg-gradient-to-r from-[#16d5b3] to-[#3559ff]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingSection>

    <section class="marketing-section pt-6">
      <div class="marketing-container max-w-5xl">
        <div class="marketing-panel px-6 py-8 text-center md:px-10">
          <p class="marketing-eyebrow">
            <Icon name="lucide:rocket" class="h-3.5 w-3.5 text-[#16d5b3]" />
            {{ t('marketing.featuresPage.cta.title') }}
          </p>
          <div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <NuxtLink to="/register" class="marketing-button marketing-button--primary">
              {{ t('marketing.featuresPage.cta.button') }}
            </NuxtLink>
            <NuxtLink to="/contact" class="marketing-button marketing-button--ghost">
              {{ t('marketing.footer.support.contact') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.feature-lab-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  border-radius: 0.95rem;
  background: rgba(255, 255, 255, 0.04);
  padding: 0.8rem 0.9rem;
}

.feature-lab-bar {
  flex: 1 1 0%;
  min-width: 0;
  border-radius: 999px 999px 0.8rem 0.8rem;
  background: linear-gradient(180deg, rgba(22, 213, 179, 0.9), rgba(53, 89, 255, 0.82));
}
</style>
