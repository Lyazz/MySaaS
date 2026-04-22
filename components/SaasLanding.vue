<script setup lang="ts">
import { computed, ref } from 'vue'
import { Vue3Marquee } from 'vue3-marquee'
import type { MarketingChapter, MarketingStat } from '~/shared/marketing/types'
import { PRICING_PLANS, pricingPlanCardForUi } from '~/shared/pricing/plans'

const { t, locale } = useI18n({ useScope: 'global' })
const isRtl = computed(() => locale.value === 'ar')

useSeoMeta({
  title: computed(() => t('saasLanding.seo.title')),
  description: computed(() => t('saasLanding.seo.description'))
})

const heroStats = computed<MarketingStat[]>(() => [
  {
    label: t('saasLanding.stats.activeMerchants'),
    value: '1,200+',
    detail: t('saasLanding.hero.chips.storefront'),
    icon: 'lucide:store',
    tone: 'cobalt'
  },
  {
    label: t('saasLanding.stats.revenueGenerated'),
    value: '50M+',
    detail: t('saasLanding.stats.gmvDetail'),
    icon: 'lucide:wallet',
    tone: 'teal'
  },
  {
    label: t('saasLanding.stats.uptime'),
    value: '99.9%',
    detail: t('saasLanding.trust.cloud'),
    icon: 'lucide:shield-check',
    tone: 'orange'
  }
])

const executionChapters = computed<MarketingChapter[]>(() => [
  {
    eyebrow: t('saasLanding.storyteller.steps.design.number'),
    title: t('saasLanding.storyteller.steps.design.title'),
    description: t('saasLanding.storyteller.steps.design.description'),
    icon: 'lucide:pen-tool',
    tone: 'cobalt',
    bullets: [
      { label: t('saasLanding.features.items.templates.title'), icon: 'lucide:layout-template' },
      { label: t('marketing.featuresPage.items.domains.title'), icon: 'lucide:globe' }
    ]
  },
  {
    eyebrow: t('saasLanding.storyteller.steps.sell.number'),
    title: t('saasLanding.storyteller.steps.sell.title'),
    description: t('saasLanding.storyteller.steps.sell.description'),
    icon: 'lucide:shopping-cart',
    tone: 'teal',
    bullets: [
      { label: t('marketing.featuresPage.items.payments.title'), icon: 'lucide:credit-card' },
      { label: t('auth.login.hero.carousel.orders.title'), icon: 'lucide:package' }
    ]
  },
  {
    eyebrow: t('saasLanding.storyteller.steps.ship.number'),
    title: t('saasLanding.storyteller.steps.ship.title'),
    description: t('saasLanding.storyteller.steps.ship.description'),
    icon: 'lucide:truck',
    tone: 'orange',
    bullets: [
      { label: t('marketing.featuresPage.items.logistics.title'), icon: 'lucide:truck' },
      { label: t('saasLanding.trust.secure'), icon: 'lucide:badge-dollar-sign' }
    ]
  },
  {
    eyebrow: t('saasLanding.storyteller.steps.grow.number'),
    title: t('saasLanding.storyteller.steps.grow.title'),
    description: t('saasLanding.storyteller.steps.grow.description'),
    icon: 'lucide:bar-chart-3',
    tone: 'cobalt',
    bullets: [
      { label: t('marketing.featuresPage.items.analytics.title'), icon: 'lucide:line-chart' },
      { label: t('saasLanding.features.items.aiTools.title'), icon: 'lucide:sparkles' }
    ]
  }
])

const pricingPreview = computed(() => {
  return PRICING_PLANS.slice(0, 3).map((plan) => {
    const card = pricingPlanCardForUi(plan, 'month')
    return {
      code: plan.code,
      name: t(`pricing.plans.${plan.code}.name`),
      description: t(`pricing.plans.${plan.code}.description`),
      price: card.priceText,
      currency: card.currency,
      period: t('pricing.period.perMonth'),
      cta: t(`pricing.plans.${plan.code}.cta`),
      popular: card.popular
    }
  })
})

const integrations = computed(() => [
  'Maystro',
  'Yalidine',
  'Meta Pixel',
  'TikTok',
  'WhatsApp',
  t('marketing.featuresPage.items.analytics.title'),
  t('marketing.featuresPage.items.domains.title'),
  t('saasLanding.integrations.items.checkout'),
  t('saasLanding.integrations.items.catalog'),
  t('saasLanding.integrations.items.ads')
])

const testimonials = [
  { textKey: 'saasLanding.testimonials.items.nassim.text', name: 'Nassim', roleKey: 'saasLanding.testimonials.items.nassim.role' },
  { textKey: 'saasLanding.testimonials.items.amina.text', name: 'Amina', roleKey: 'saasLanding.testimonials.items.amina.role' },
  { textKey: 'saasLanding.testimonials.items.yanis.text', name: 'Yanis', roleKey: 'saasLanding.testimonials.items.yanis.role' },
  { textKey: 'saasLanding.testimonials.items.lyes.text', name: 'Lyes', roleKey: 'saasLanding.testimonials.items.lyes.role' }
]

const activeFaq = ref<number | null>(0)
const faqs = [
  { questionKey: 'saasLanding.faq.items.noCard.question', answerKey: 'saasLanding.faq.items.noCard.answer' },
  { questionKey: 'saasLanding.faq.items.changePlan.question', answerKey: 'saasLanding.faq.items.changePlan.answer' },
  { questionKey: 'saasLanding.faq.items.planDifferences.question', answerKey: 'saasLanding.faq.items.planDifferences.answer' }
]
</script>

<template>
  <div class="relative overflow-x-clip overflow-y-visible">
    <section class="relative overflow-hidden px-0 pb-16 pt-28 md:pt-32 lg:pb-24">
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(53,89,255,0.33),transparent_26%),radial-gradient(circle_at_84%_18%,rgba(22,213,179,0.16),transparent_19%),radial-gradient(circle_at_64%_64%,rgba(255,138,76,0.1),transparent_22%)]" />
      <div class="pointer-events-none absolute left-[6%] top-28 h-48 w-48 rounded-full border border-white/10 bg-white/[0.03] blur-3xl marketing-float" />
      <div class="pointer-events-none absolute right-[8%] top-40 h-72 w-72 rounded-full bg-[#3559ff]/20 blur-[120px] marketing-float marketing-float--delay" />

      <div class="marketing-container max-w-[90rem]">
        <div class="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10">
          <div class="relative z-10 min-w-0">
            <div class="marketing-eyebrow" data-testid="marketing-hero">
              <Icon name="lucide:sparkles" class="h-3.5 w-3.5 text-[#16d5b3]" />
              {{ t('saasLanding.hero.kicker') }}
            </div>

            <h1
              class="mt-6 max-w-4xl font-display text-[3.2rem] font-semibold leading-[0.92] tracking-[-0.07em] text-white sm:text-[4rem] lg:text-[5.75rem]"
              v-motion-slide-visible-once-bottom
            >
              {{ t('saasLanding.hero.title.buildSell') }}
              <span class="block bg-[linear-gradient(135deg,#ffffff,#8fa7ff)] bg-clip-text text-transparent">
                {{ t('saasLanding.hero.title.scale') }}
              </span>
              <span class="mt-2 block text-[0.45em] font-medium tracking-[-0.05em] text-slate-300">
                {{ t('saasLanding.hero.italicWord') }}
              </span>
            </h1>

            <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl" v-motion-slide-visible-once-bottom :delay="120">
              {{ t('saasLanding.hero.subtitle') }}
            </p>

            <div class="mt-8 flex flex-col gap-3 sm:flex-row" v-motion-slide-visible-once-bottom :delay="180">
              <NuxtLink to="/register" class="marketing-button marketing-button--primary">
                {{ t('saasLanding.hero.ctaPrimary') }}
                <Icon name="lucide:arrow-up-right" class="h-4 w-4" />
              </NuxtLink>
              <NuxtLink to="/features" class="marketing-button marketing-button--ghost">
                {{ t('saasLanding.hero.ctaSecondary') }}
              </NuxtLink>
            </div>

            <div class="mt-8 flex flex-wrap gap-2" v-motion-slide-visible-once-bottom :delay="240">
              <span class="marketing-pill">
                <Icon name="lucide:shield-check" class="h-3.5 w-3.5 text-[#16d5b3]" />
                {{ t('saasLanding.trust.secure') }}
              </span>
              <span class="marketing-pill">
                <Icon name="lucide:smartphone" class="h-3.5 w-3.5 text-[#8fa7ff]" />
                {{ t('saasLanding.hero.pills.mobile') }}
              </span>
              <span class="marketing-pill">
                <Icon name="lucide:truck" class="h-3.5 w-3.5 text-[#ffb38e]" />
                {{ t('marketing.featuresPage.items.logistics.title') }}
              </span>
            </div>

            <div class="mt-10">
              <MarketingProofStrip :items="heroStats" />
            </div>
          </div>

          <div class="relative min-w-0">
            <MarketingVisualFrame tone="cobalt">
              <div class="hero-visual min-h-[32rem]">
                <div class="hero-visual__window">
                  <span />
                  <span />
                  <span />
                </div>

                <div class="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
                  <div class="space-y-4">
                    <div class="rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-4">
                      <div class="flex items-center justify-between">
                        <div>
                          <p class="marketing-label">{{ t('saasLanding.visual.storefrontLabel') }}</p>
                          <p class="mt-2 text-2xl font-display font-semibold tracking-[-0.05em] text-white">
                            swekly.com/shop
                          </p>
                        </div>
                        <span class="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                          {{ t('saasLanding.visual.live') }}
                        </span>
                      </div>

                      <div class="mt-6 grid gap-3 sm:grid-cols-2">
                        <div class="hero-visual__metric">
                          <span class="hero-visual__metric-dot bg-[#16d5b3]" />
                          <div>
                            <p class="text-xs uppercase tracking-[0.24em] text-slate-400">{{ t('saasLanding.visual.orders') }}</p>
                            <p class="mt-2 text-2xl font-display text-white">124</p>
                          </div>
                        </div>
                        <div class="hero-visual__metric">
                          <span class="hero-visual__metric-dot bg-[#3559ff]" />
                          <div>
                            <p class="text-xs uppercase tracking-[0.24em] text-slate-400">{{ t('saasLanding.visual.conversion') }}</p>
                            <p class="mt-2 text-2xl font-display text-white">4.9%</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="rounded-[1.6rem] border border-white/10 bg-[#0d1430] p-5">
                      <div class="flex items-center justify-between">
                        <div>
                          <p class="marketing-label">{{ t('saasLanding.visual.checkoutLabel') }}</p>
                          <p class="mt-2 text-lg font-semibold text-white">{{ t('saasLanding.visual.checkoutTitle') }}</p>
                        </div>
                        <Icon name="lucide:scan-line" class="h-5 w-5 text-[#8fa7ff]" />
                      </div>

                      <div class="mt-5 space-y-3">
                        <div class="hero-visual__flow-row">
                          <span class="hero-visual__flow-index">01</span>
                          <span>{{ t('saasLanding.visual.checkoutSteps.phone') }}</span>
                        </div>
                        <div class="hero-visual__flow-row">
                          <span class="hero-visual__flow-index">02</span>
                          <span>{{ t('saasLanding.visual.checkoutSteps.delivery') }}</span>
                        </div>
                        <div class="hero-visual__flow-row">
                          <span class="hero-visual__flow-index">03</span>
                          <span>{{ t('saasLanding.visual.checkoutSteps.dispatch') }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="space-y-4">
                    <div class="rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-4 marketing-float">
                      <div class="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
                        <span>{{ t('saasLanding.visual.today') }}</span>
                        <span class="text-[#16d5b3]">+18%</span>
                      </div>
                      <div class="mt-5 flex items-end gap-2">
                        <div class="hero-visual__bar h-12" />
                        <div class="hero-visual__bar h-20" />
                        <div class="hero-visual__bar h-16" />
                        <div class="hero-visual__bar h-24" />
                        <div class="hero-visual__bar h-28" />
                      </div>
                    </div>

                    <div class="rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-4 marketing-float marketing-float--slow">
                      <p class="marketing-label">{{ t('saasLanding.visual.operationsRail') }}</p>
                      <div class="mt-4 space-y-3">
                        <div class="hero-visual__rail">
                          <Icon name="lucide:message-circle" class="h-4 w-4 text-[#16d5b3]" />
                          <span>{{ t('saasLanding.visual.whatsapp') }}</span>
                        </div>
                        <div class="hero-visual__rail">
                          <Icon name="lucide:truck" class="h-4 w-4 text-[#ffb38e]" />
                          <span>{{ t('saasLanding.visual.carriers') }}</span>
                        </div>
                        <div class="hero-visual__rail">
                          <Icon name="lucide:bar-chart-3" class="h-4 w-4 text-[#8fa7ff]" />
                          <span>{{ t('saasLanding.visual.analytics') }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="rounded-[1.6rem] border border-white/10 bg-gradient-to-br from-[#3559ff]/30 to-transparent p-4">
                      <p class="marketing-label">{{ t('saasLanding.visual.readinessLabel') }}</p>
                      <p class="mt-3 text-sm leading-6 text-slate-200">
                        {{ t('saasLanding.visual.readinessText') }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </MarketingVisualFrame>
          </div>
        </div>
      </div>
    </section>

    <MarketingSection
      :eyebrow="t('saasLanding.storyteller.eyebrow')"
      :title="t('saasLanding.storyteller.title')"
      :description="t('saasLanding.storyteller.subtitle')"
      width="wide"
    >
      <div class="grid gap-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
        <div class="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <MarketingVisualFrame tone="teal">
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="marketing-label">{{ t('saasLanding.visual.commandCenterEyebrow') }}</p>
                  <p class="mt-2 text-3xl font-display font-semibold tracking-[-0.05em] text-white">
                    {{ t('saasLanding.visual.commandCenterTitle') }}
                  </p>
                </div>
                <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                  {{ t('saasLanding.visual.commandCenterBadge') }}
                </span>
              </div>

              <div class="space-y-4">
                <div class="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-white">{{ t('saasLanding.visual.orderConfirmations') }}</p>
                    <span class="text-sm text-emerald-300">92%</span>
                  </div>
                  <div class="mt-3 h-2 rounded-full bg-white/10">
                    <div class="h-2 w-[92%] rounded-full bg-gradient-to-r from-[#16d5b3] to-[#3559ff]" />
                  </div>
                </div>

                <div class="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-white">{{ t('saasLanding.visual.carrierSync') }}</p>
                    <span class="text-sm text-[#ffb38e]">{{ t('saasLanding.visual.realtime') }}</span>
                  </div>
                  <div class="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-300">
                    <span class="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-center">Maystro</span>
                    <span class="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-center">Yalidine</span>
                    <span class="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-center">{{ t('saasLanding.visual.localFleet') }}</span>
                  </div>
                </div>

                <div class="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                  <p class="text-sm font-medium text-white">{{ t('saasLanding.visual.weeklyPulse') }}</p>
                  <div class="mt-4 flex items-end gap-2">
                    <div class="hero-visual__bar h-14" />
                    <div class="hero-visual__bar h-16" />
                    <div class="hero-visual__bar h-24" />
                    <div class="hero-visual__bar h-20" />
                    <div class="hero-visual__bar h-28" />
                    <div class="hero-visual__bar h-32" />
                  </div>
                </div>
              </div>
            </div>
          </MarketingVisualFrame>
        </div>

        <div class="min-w-0 space-y-4">
          <article
            v-for="chapter in executionChapters"
            :key="chapter.title"
            class="marketing-panel px-6 py-6 md:px-7"
            v-motion-slide-visible-once-bottom
          >
            <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div class="max-w-2xl">
                <p class="marketing-label">{{ chapter.eyebrow }}</p>
                <div class="mt-4 flex items-center gap-3">
                  <div class="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    <Icon :name="chapter.icon || 'lucide:sparkles'" class="h-5 w-5 text-[#8fa7ff]" />
                  </div>
                  <h3 class="font-display text-2xl font-semibold tracking-[-0.04em] text-white md:text-3xl">
                    {{ chapter.title }}
                  </h3>
                </div>
                <p class="mt-4 text-base leading-7 text-slate-300">
                  {{ chapter.description }}
                </p>
              </div>

              <div class="flex flex-wrap gap-2 md:max-w-xs md:justify-end">
                <span
                  v-for="bullet in chapter.bullets"
                  :key="bullet.label"
                  class="marketing-pill"
                >
                  <Icon v-if="bullet.icon" :name="bullet.icon" class="h-3.5 w-3.5 text-[#16d5b3]" />
                  {{ bullet.label }}
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </MarketingSection>

    <MarketingSection
      :eyebrow="t('saasLanding.integrations.title')"
      :title="t('saasLanding.carousel.title')"
      :description="t('saasLanding.integrations.subtitle')"
      width="wide"
    >
      <div class="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <MarketingVisualFrame tone="orange" class="min-w-0">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="showcase-card">
              <p class="marketing-label">{{ t('saasLanding.carousel.eyebrow') }}</p>
              <h3 class="mt-3 font-display text-2xl font-semibold tracking-[-0.04em] text-white">
                {{ t('saasLanding.visual.showcase.title') }}
              </h3>
              <p class="mt-3 text-sm leading-7 text-slate-300">
                {{ t('saasLanding.visual.showcase.body') }}
              </p>
            </div>
            <div class="showcase-card bg-[linear-gradient(180deg,rgba(53,89,255,0.25),rgba(255,255,255,0.03))]">
              <p class="marketing-label">{{ t('saasLanding.visual.showcase.preview') }}</p>
              <div class="mt-5 space-y-3">
                <div class="h-24 rounded-[1.3rem] border border-white/10 bg-[linear-gradient(135deg,rgba(53,89,255,0.35),rgba(22,213,179,0.12))]" />
                <div class="grid grid-cols-3 gap-3">
                  <div class="h-20 rounded-[1rem] border border-white/10 bg-white/5" />
                  <div class="h-20 rounded-[1rem] border border-white/10 bg-white/5" />
                  <div class="h-20 rounded-[1rem] border border-white/10 bg-white/5" />
                </div>
              </div>
            </div>
          </div>
        </MarketingVisualFrame>

        <div class="min-w-0 space-y-4">
          <div class="marketing-panel overflow-hidden px-5 py-4">
            <div class="flex flex-wrap gap-3">
              <span
                v-for="integration in integrations"
                :key="integration"
                class="marketing-pill max-w-full"
              >
                {{ integration }}
              </span>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="showcase-card">
              <p class="marketing-label">{{ t('marketing.featuresPage.items.analytics.title') }}</p>
              <p class="mt-3 text-xl font-display font-semibold tracking-[-0.04em] text-white">
                {{ t('saasLanding.visual.showcase.analyticsBody') }}
              </p>
            </div>
            <div class="showcase-card">
              <p class="marketing-label">{{ t('marketing.featuresPage.items.logistics.title') }}</p>
              <p class="mt-3 text-xl font-display font-semibold tracking-[-0.04em] text-white">
                {{ t('saasLanding.visual.showcase.logisticsBody') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </MarketingSection>

    <MarketingSection
      :eyebrow="t('saasLanding.pricingSection.eyebrow')"
      :title="t('pricing.page.title')"
      :description="t('pricing.page.subtitle')"
      align="center"
      width="wide"
    >
      <div class="grid gap-5 lg:grid-cols-3">
        <article
          v-for="plan in pricingPreview"
          :key="plan.code"
          class="marketing-panel px-6 py-6 text-left"
          :class="plan.popular ? 'border-[#3559ff]/50 bg-[linear-gradient(180deg,rgba(53,89,255,0.18),rgba(255,255,255,0.04))]' : ''"
        >
          <p class="marketing-label">
            {{ plan.name }}
          </p>
          <p class="mt-4 font-display text-5xl font-semibold tracking-[-0.06em] text-white">
            {{ plan.price }}
            <span class="text-base text-slate-400">{{ plan.currency }}{{ plan.period }}</span>
          </p>
          <p class="mt-4 min-h-[3.5rem] text-sm leading-7 text-slate-300">
            {{ plan.description }}
          </p>
          <div class="mt-5 space-y-2 text-sm text-slate-300">
            <div class="flex items-center gap-2">
              <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
              {{ t('pricing.features.ordersPerMonth', { count: PRICING_PLANS.find((item) => item.code === plan.code)?.ordersPerMonth }) }}
            </div>
            <div class="flex items-center gap-2">
              <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
              {{ t('saasLanding.pricingPreview.storefront') }}
            </div>
            <div class="flex items-center gap-2">
              <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
              {{ t('saasLanding.pricingPreview.delivery') }}
            </div>
          </div>

          <NuxtLink to="/pricing" class="marketing-button marketing-button--ghost mt-6 w-full justify-center">
            {{ plan.cta }}
          </NuxtLink>
        </article>
      </div>
    </MarketingSection>

    <MarketingSection
      :eyebrow="t('saasLanding.testimonials.heading.prefix')"
      :title="`${t('saasLanding.testimonials.heading.accent')} ${t('saasLanding.testimonials.heading.suffix')}`"
      :description="t('saasLanding.testimonials.subtitle')"
      width="wide"
    >
      <div class="marketing-panel px-4 py-4 md:px-6">
        <Vue3Marquee :duration="42" :pauseOnHover="true" :direction="isRtl ? 'reverse' : 'normal'">
          <div class="flex gap-4 py-2">
            <article
              v-for="item in testimonials"
              :key="item.name"
              class="mx-1 w-[21rem] rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-5"
            >
              <p class="text-sm leading-7 text-slate-200">
                “{{ t(item.textKey) }}”
              </p>
              <div class="mt-5">
                <p class="font-semibold text-white">
                  {{ item.name }}
                </p>
                <p class="text-sm text-slate-400">
                  {{ t(item.roleKey) }}
                </p>
              </div>
            </article>
          </div>
        </Vue3Marquee>
      </div>
    </MarketingSection>

    <MarketingSection
      :eyebrow="t('saasLanding.faq.title')"
      :title="t('saasLanding.faq.title')"
      :description="t('saasLanding.faq.subtitle')"
      width="narrow"
    >
      <div class="space-y-3">
        <article
          v-for="(faq, index) in faqs"
          :key="faq.questionKey"
          class="marketing-panel px-5 py-4"
        >
          <button
            class="flex w-full items-center justify-between gap-4 text-left"
            type="button"
            @click="activeFaq = activeFaq === index ? null : index"
          >
            <span class="text-base font-medium text-white md:text-lg">
              {{ t(faq.questionKey) }}
            </span>
            <Icon :name="activeFaq === index ? 'lucide:minus' : 'lucide:plus'" class="h-5 w-5 shrink-0 text-slate-400" />
          </button>
          <p v-if="activeFaq === index" class="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            {{ t(faq.answerKey) }}
          </p>
        </article>
      </div>
    </MarketingSection>

    <section class="marketing-section pt-8">
      <div class="marketing-container max-w-6xl">
        <div class="marketing-panel overflow-hidden px-6 py-8 text-center md:px-10 md:py-12">
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(53,89,255,0.4),transparent_42%)]" />
          <div class="relative z-10">
            <p class="marketing-eyebrow">
              <Icon name="lucide:rocket" class="h-3.5 w-3.5 text-[#16d5b3]" />
              {{ t('saasLanding.finalCta.title') }}
            </p>
            <h2 class="mt-6 font-display text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              {{ t('saasLanding.finalCta.title') }}
            </h2>
            <p class="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-300">
              {{ t('saasLanding.finalCta.subtitle') }}
            </p>
            <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <NuxtLink to="/register" class="marketing-button marketing-button--primary">
                {{ t('saasLanding.finalCta.cta') }}
              </NuxtLink>
              <NuxtLink to="/contact" class="marketing-button marketing-button--ghost">
                {{ t('marketing.footer.support.contact') }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero-visual__window {
  display: flex;
  gap: 0.45rem;
  margin-bottom: 1.25rem;
}

.hero-visual__window span {
  width: 0.72rem;
  height: 0.72rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
}

.hero-visual__metric {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  border-radius: 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  padding: 1rem;
}

.hero-visual__metric-dot {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 999px;
  box-shadow: 0 0 0 8px rgba(255, 255, 255, 0.05);
}

.hero-visual__flow-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.04);
  padding: 0.9rem 1rem;
  color: #d6def0;
  font-size: 0.94rem;
}

.hero-visual__flow-index {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(53, 89, 255, 0.18);
  color: #9eb1ff;
  font-size: 0.74rem;
  font-weight: 700;
}

.hero-visual__bar {
  flex: 1 1 0%;
  min-width: 0;
  border-radius: 999px 999px 0.75rem 0.75rem;
  background: linear-gradient(180deg, rgba(22, 213, 179, 0.9), rgba(53, 89, 255, 0.85));
}

.hero-visual__rail {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  border-radius: 0.95rem;
  background: rgba(255, 255, 255, 0.04);
  padding: 0.85rem 0.95rem;
  color: #d6def0;
  font-size: 0.9rem;
}

.showcase-card {
  border-radius: 1.6rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  padding: 1.3rem;
}

@media (prefers-reduced-motion: reduce) {
  .hero-visual__bar {
    transition: none;
  }
}
</style>
