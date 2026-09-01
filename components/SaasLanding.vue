<script setup lang="ts">
import { computed, ref, resolveComponent } from 'vue'
import { PRICING_PLANS, buildDisplayPlan, maxAnnualDiscountPercent } from '~/shared/pricing/plans'

const MechanismTenancy = resolveComponent('MarketingCinematicMechanismsMechanismTenancy')
const MechanismLocalization = resolveComponent('MarketingCinematicMechanismsMechanismLocalization')
const MechanismLogistics = resolveComponent('MarketingCinematicMechanismsMechanismLogistics')
const MechanismAnalytics = resolveComponent('MarketingCinematicMechanismsMechanismAnalytics')
const MechanismPayment = resolveComponent('MarketingCinematicMechanismsMechanismPayment')
const MechanismBuilder = resolveComponent('MarketingCinematicMechanismsMechanismBuilder')

const { t, locale, tm, rt } = useI18n({ useScope: 'global' })
const isRtl = computed(() => locale.value === 'ar')

useSeoMeta({
  title: computed(() => t('saasLanding.seo.title')),
  description: computed(() => t('saasLanding.seo.description')),
  ogTitle: computed(() => t('saasLanding.seo.title')),
  ogDescription: computed(() => t('saasLanding.seo.description')),
  ogType: 'website',
  ogImage: '/swekly-logo-mark.svg',
  twitterCard: 'summary_large_image',
  twitterTitle: computed(() => t('saasLanding.seo.title')),
  twitterDescription: computed(() => t('saasLanding.seo.description')),
  twitterImage: '/swekly-logo-mark.svg'
})

const carouselSlides = computed(() => {
  const ids = ['delivery', 'warehouse', 'themes', 'conversion', 'pos'] as const
  return ids.map(id => ({
    eyebrow: t(`saasLanding.cinematic.heroCarousel.slides.${id}.eyebrow`),
    headlinePre: t(`saasLanding.cinematic.heroCarousel.slides.${id}.headlinePre`),
    headlineAccent: t(`saasLanding.cinematic.heroCarousel.slides.${id}.headlineAccent`),
    headlinePost: t(`saasLanding.cinematic.heroCarousel.slides.${id}.headlinePost`),
    subhead: t(`saasLanding.cinematic.heroCarousel.slides.${id}.subhead`),
    meta: [
      t(`saasLanding.cinematic.heroCarousel.slides.${id}.meta.0`),
      t(`saasLanding.cinematic.heroCarousel.slides.${id}.meta.1`),
      t(`saasLanding.cinematic.heroCarousel.slides.${id}.meta.2`)
    ],
    address: t(`saasLanding.cinematic.heroCarousel.slides.${id}.address`)
  }))
})

const trustStripItems = computed(() => [
  { icon: 'lucide:banknote', title: t('saasLanding.extras.trustStrip.items.cod.title'), description: t('saasLanding.extras.trustStrip.items.cod.description') },
  { icon: 'lucide:map', title: t('saasLanding.extras.trustStrip.items.wilayas.title'), description: t('saasLanding.extras.trustStrip.items.wilayas.description') },
  { icon: 'lucide:languages', title: t('saasLanding.extras.trustStrip.items.rtl.title'), description: t('saasLanding.extras.trustStrip.items.rtl.description') },
  { icon: 'lucide:badge-dollar-sign', title: t('saasLanding.extras.trustStrip.items.dzd.title'), description: t('saasLanding.extras.trustStrip.items.dzd.description') }
])

const faqItems = computed<Array<{ q: string; a: string }>>(() => {
  const raw = tm('saasLanding.faq.items') as any
  if (!Array.isArray(raw)) return []
  return raw.map((i: any) => ({ q: rt(i.question), a: rt(i.answer) }))
})

const jsonLd = computed(() => {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Swekly',
    url: 'https://swekly.com',
    logo: 'https://swekly.com/swekly-logo-mark.svg',
    sameAs: [] as string[]
  }
  const faq = faqItems.value.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.value.map(i => ({
          '@type': 'Question',
          name: i.q,
          acceptedAnswer: { '@type': 'Answer', text: i.a }
        }))
      }
    : null
  return faq ? [org, faq] : [org]
})

useHead({
  script: computed(() => jsonLd.value.map(data => ({ type: 'application/ld+json', innerHTML: JSON.stringify(data) })))
})

const integrationLogos = [
  { name: 'Multi-carrier', icon: 'lucide:truck' },
  { name: 'ZR Express', icon: 'lucide:truck' },
  { name: 'Noest Express', icon: 'lucide:truck' },
  { name: 'E-COM Delivery', icon: 'lucide:truck' },
  { name: 'Meta Pixel', icon: 'lucide:facebook' },
  { name: 'TikTok Pixel', icon: 'lucide:music' },
  { name: 'Meta Ads', icon: 'lucide:megaphone' },
  { name: 'Meta Catalog', icon: 'lucide:layout-grid' },
  { name: 'Google Sheets', icon: 'lucide:sheet' },
  { name: 'SMS OTP', icon: 'lucide:smartphone' },
  { name: 'Telegram Notifications', icon: 'lucide:send' },
  { name: 'WhatsApp', icon: 'lucide:message-circle' },
  { name: 'Import / Export', icon: 'lucide:arrow-down-up' },
  { name: 'Realtime Orders', icon: 'lucide:radio' },
  { name: 'Multi Templates', icon: 'lucide:layout-template' },
  { name: 'Store Customization', icon: 'lucide:palette' }
]
const integrationLogosRow1 = integrationLogos.slice(0, Math.ceil(integrationLogos.length / 2))
const integrationLogosRow2 = integrationLogos.slice(Math.ceil(integrationLogos.length / 2))


const metrics = computed(() => [
  { value: '500+', label: t('saasLanding.stats.activeMerchants'), detail: t('saasLanding.hero.chips.storefront') },
  { value: '5M+', label: t('saasLanding.stats.revenueGenerated'), detail: t('saasLanding.stats.gmvDetail') },
  { value: '99.9%', label: t('saasLanding.stats.uptime'), detail: t('saasLanding.trust.cloud') }
])

const featureGrid = computed(() => [
  {
    icon: 'lucide:zap',
    mechanism: MechanismTenancy,
    title: t('marketing.featuresPage.items.tenancy.title'),
    description: t('marketing.featuresPage.items.tenancy.description')
  },
  {
    icon: 'lucide:languages',
    mechanism: MechanismLocalization,
    title: t('marketing.featuresPage.items.localization.title'),
    description: t('marketing.featuresPage.items.localization.description')
  },
  {
    icon: 'lucide:truck',
    mechanism: MechanismLogistics,
    title: t('marketing.featuresPage.items.logistics.title'),
    description: t('marketing.featuresPage.items.logistics.description')
  },
  {
    icon: 'lucide:line-chart',
    mechanism: MechanismAnalytics,
    title: t('marketing.featuresPage.items.analytics.title'),
    description: t('marketing.featuresPage.items.analytics.description')
  },
  {
    icon: 'lucide:credit-card',
    mechanism: MechanismPayment,
    title: t('marketing.featuresPage.items.payments.title'),
    description: t('marketing.featuresPage.items.payments.description')
  },
  {
    icon: 'lucide:smartphone',
    mechanism: MechanismBuilder,
    title: t('marketing.featuresPage.items.mobile.title'),
    description: t('marketing.featuresPage.items.mobile.description')
  }
])

const isAnnualPreview = ref(false)
const pricingPreview = computed(() =>
  PRICING_PLANS.map(plan => buildDisplayPlan(plan, isAnnualPreview.value ? 'year' : 'month', t))
)

const testimonials = computed<Array<{ quote: string; author: string; role: string }>>(() => {
  const raw = tm('saasLanding.testimonials.items') as any
  if (!Array.isArray(raw)) return []
  return raw.map((item: any) => ({
    quote: rt(item.quote),
    author: rt(item.author),
    role: rt(item.role),
  }))
})
const testimonialsRow1 = computed(() => testimonials.value.slice(0, Math.ceil(testimonials.value.length / 2)))
const testimonialsRow2 = computed(() => testimonials.value.slice(Math.ceil(testimonials.value.length / 2)))
</script>

<template>
  <div :dir="isRtl ? 'rtl' : 'ltr'">
    <!-- ─── Hero (carousel) ─── -->
    <MarketingCinematicHeroCarousel
      :slides="carouselSlides"
      :primary-cta="{ label: t('saasLanding.cinematic.heroCarousel.ctaRegister'), to: '/register' }"
      :secondary-cta="{ label: t('saasLanding.cinematic.heroCarousel.ctaFeatures'), to: '/features' }"
    />

    <!-- ─── Logo cloud ─── -->
    <section class="border-y border-white/[0.04] bg-white/[0.01] py-10">
      <div class="cinematic-container !max-w-[88rem]">
        <p class="cinematic-eyebrow mb-6 text-center">{{ t('saasLanding.cinematic.logoCloud') }}</p>
        <div class="space-y-3">
          <MarketingCinematicLogoCloud :logos="integrationLogosRow1" />
          <MarketingCinematicLogoCloud :logos="integrationLogosRow2" :reverse="true" />
        </div>
      </div>
    </section>

    <!-- ─── Metrics ─── -->
    <section class="cinematic-section border-y border-white/[0.04] bg-gradient-to-b from-transparent via-white/[0.01] to-transparent">
      <div class="cinematic-container">
        <div class="grid gap-10 md:grid-cols-3">
          <MarketingCinematicMetricTile
            v-for="m in metrics"
            :key="m.label"
            :label="m.label"
            :value="m.value"
            :detail="m.detail"
          />
        </div>
      </div>
    </section>

    <!-- ─── Features grid ─── -->
    <MarketingCinematicSectionShell
      :eyebrow="t('saasLanding.cinematic.features.eyebrow')"
      :title-pre="t('saasLanding.cinematic.features.titlePre')"
      :title-accent="t('saasLanding.cinematic.features.titleAccent')"
      :title-post="t('saasLanding.cinematic.features.titlePost')"
      :description="t('saasLanding.cinematic.features.description')"
    >
      <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <MarketingCinematicFeatureCard3D
          v-for="f in featureGrid"
          :key="f.title"
          v-motion-slide-visible-once-bottom
          :icon="f.icon"
          :title="f.title"
          :description="f.description"
          :mechanism="f.mechanism"
        />
      </div>
    </MarketingCinematicSectionShell>

    <!-- ─── Pricing preview ─── -->
    <MarketingCinematicSectionShell
      :eyebrow="t('saasLanding.cinematic.pricing.eyebrow')"
      :title-pre="t('saasLanding.cinematic.pricing.titlePre')"
      :title-accent="t('saasLanding.cinematic.pricing.titleAccent')"
      :title-post="t('saasLanding.cinematic.pricing.titlePost')"
      :description="t('saasLanding.cinematic.pricing.description')"
      centered
    >
      <div class="-mt-2 mb-10 flex flex-col items-center gap-3">
        <div class="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.02] p-1">
          <button
            class="rounded-full px-5 py-2 text-sm font-medium transition-all"
            :class="!isAnnualPreview ? 'bg-lime-neon text-[color:var(--m-bg)]' : 'text-[color:var(--m-text-dim)] hover:text-white'"
            @click="isAnnualPreview = false"
          >
            {{ t('pricing.toggle.monthly') }}
          </button>
          <button
            class="rounded-full px-5 py-2 text-sm font-medium transition-all inline-flex items-center gap-2"
            :class="isAnnualPreview ? 'bg-lime-neon text-[color:var(--m-bg)]' : 'text-[color:var(--m-text-dim)] hover:text-white'"
            @click="isAnnualPreview = true"
          >
            {{ t('pricing.toggle.annual') }}
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
              :class="isAnnualPreview ? 'bg-[color:var(--m-bg)]/15 text-[color:var(--m-bg)]' : 'bg-lime-neon/15 text-lime-neon'"
            >
              {{ t('pricing.toggle.save', { percent: maxAnnualDiscountPercent() }) }}
            </span>
          </button>
        </div>
      </div>
      <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <MarketingCinematicPricingTile
          v-for="plan in pricingPreview"
          :key="plan.code"
          v-motion-slide-visible-once-bottom
          :name="plan.name"
          :price="plan.price"
          :currency="plan.currency"
          :period="plan.period"
          :billing-note="plan.billingNote"
          :description="plan.description"
          :features="plan.features"
          :cta="plan.cta"
          :cta-to="`/pricing#${plan.code}`"
          :featured="plan.popular"
          :popular-label="t('pricing.badges.mostPopular')"
        />
      </div>
      <div class="mt-10 text-center">
        <NuxtLink to="/pricing" class="cinematic-link inline-flex items-center gap-2 text-sm">
          {{ t('saasLanding.cinematic.pricing.viewAll') }}
          <Icon name="lucide:arrow-right" class="h-4 w-4" />
        </NuxtLink>
      </div>
    </MarketingCinematicSectionShell>

    <!-- ─── Testimonials ─── -->
    <section v-if="testimonials.length" class="cinematic-section">
      <div class="cinematic-container">
        <div class="mb-12 max-w-3xl">
          <span class="cinematic-pill">
            <span class="cinematic-pill__dot" />
            {{ t('saasLanding.testimonials.eyebrow') }}
          </span>
          <h2 class="cinematic-headline mt-6">
            {{ t('saasLanding.cinematic.testimonials.titlePre') }}
            <em>{{ t('saasLanding.cinematic.testimonials.titleAccent') }}</em>
            {{ t('saasLanding.cinematic.testimonials.titlePost') }}
          </h2>
        </div>
      </div>

      <div class="space-y-5">
        <MarketingCinematicMarquee :speed="40">
          <div v-for="(item, i) in testimonialsRow1" :key="`r1-${i}`" class="mx-3 w-[340px] flex-none cinematic-card p-6">
            <Icon name="lucide:quote" class="h-5 w-5 text-lime-neon" />
            <p class="mt-3 text-[15px] leading-relaxed text-white/90">{{ item.quote }}</p>
            <div class="mt-5 border-t border-white/5 pt-4">
              <p class="text-sm font-medium text-white">{{ item.author }}</p>
              <p class="text-xs text-[color:var(--m-text-dim)]">{{ item.role }}</p>
            </div>
          </div>
        </MarketingCinematicMarquee>
        <MarketingCinematicMarquee :speed="40">
          <div v-for="(item, i) in testimonialsRow2" :key="`r2-${i}`" class="mx-3 w-[340px] flex-none cinematic-card p-6">
            <Icon name="lucide:quote" class="h-5 w-5 text-lime-neon" />
            <p class="mt-3 text-[15px] leading-relaxed text-white/90">{{ item.quote }}</p>
            <div class="mt-5 border-t border-white/5 pt-4">
              <p class="text-sm font-medium text-white">{{ item.author }}</p>
              <p class="text-xs text-[color:var(--m-text-dim)]">{{ item.role }}</p>
            </div>
          </div>
        </MarketingCinematicMarquee>
      </div>
    </section>

    <!-- ─── FAQ ─── -->
    <MarketingCinematicSectionShell
      v-if="faqItems.length"
      :eyebrow="t('saasLanding.faq.eyebrow')"
      :title-pre="t('saasLanding.cinematic.faq.titlePre')"
      :title-accent="t('saasLanding.cinematic.faq.titleAccent')"
      :title-post="t('saasLanding.cinematic.faq.titlePost')"
    >
      <div class="mx-auto max-w-3xl">
        <MarketingCinematicFAQAccordion :items="faqItems" />
      </div>
    </MarketingCinematicSectionShell>

    <!-- ─── Final CTA ─── -->
    <MarketingCinematicCTABand
      :eyebrow="t('saasLanding.cinematic.cta.eyebrow')"
      :headline-pre="t('saasLanding.cinematic.cta.headlinePre')"
      :headline-accent="t('saasLanding.cinematic.cta.headlineAccent')"
      :headline-post="t('saasLanding.cinematic.cta.headlinePost')"
      :subhead="t('saasLanding.cinematic.cta.subhead')"
      :primary-cta="{ label: t('saasLanding.cinematic.cta.button'), to: '/register' }"
    />

    <!-- ─── Sticky mobile CTA ─── -->
    <div class="fixed inset-x-3 bottom-3 z-40 md:hidden">
      <NuxtLink
        to="/register"
        class="cinematic-card flex items-center justify-between gap-3 px-4 py-3 backdrop-blur-md"
      >
        <div class="min-w-0">
          <div class="text-sm font-medium text-white">{{ t('saasLanding.extras.stickyCta.label') }}</div>
          <div class="text-[11px] text-[color:var(--m-text-dim)]">{{ t('saasLanding.extras.stickyCta.subtle') }}</div>
        </div>
        <span class="inline-flex h-9 items-center gap-1.5 rounded-full bg-lime-neon px-4 text-sm font-medium text-black">
          {{ t('saasLanding.cinematic.hero.ctaPrimary') }}
          <Icon name="lucide:arrow-right" class="h-4 w-4" />
        </span>
      </NuxtLink>
    </div>
  </div>
</template>
