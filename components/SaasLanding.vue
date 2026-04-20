<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Vue3Marquee } from 'vue3-marquee'
import { PRICING_PLANS, pricingPlanCardForUi } from '~/shared/pricing/plans'

const { t, locale } = useI18n({ useScope: 'global' })
const isRtl = computed(() => locale.value === 'ar')

useSeoMeta({
  title: computed(() => t('saasLanding.seo.title')),
  description: computed(() => t('saasLanding.seo.description'))
})

// ——— Cursor tracking ———
const root = ref<HTMLElement | null>(null)
const heroRef = ref<HTMLElement | null>(null)
const finaleRef = ref<HTMLElement | null>(null)
let rafId = 0
let mx = 0, my = 0
const applyCursor = (e: MouseEvent) => {
  mx = e.clientX; my = e.clientY
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    if (heroRef.value) {
      const r = heroRef.value.getBoundingClientRect()
      heroRef.value.style.setProperty('--mx', `${((mx - r.left) / r.width) * 100}%`)
      heroRef.value.style.setProperty('--my', `${((my - r.top) / r.height) * 100}%`)
    }
    if (finaleRef.value) {
      const r = finaleRef.value.getBoundingClientRect()
      finaleRef.value.style.setProperty('--mx', `${((mx - r.left) / r.width) * 100}%`)
      finaleRef.value.style.setProperty('--my', `${((my - r.top) / r.height) * 100}%`)
    }
    rafId = 0
  })
}

// ——— Scroll progress bar ———
const scrollPct = ref(0)
const onScroll = () => {
  const h = document.documentElement
  const total = h.scrollHeight - h.clientHeight
  scrollPct.value = total > 0 ? (h.scrollTop / total) * 100 : 0
}

// ——— Stats counter ———
const stats = ref([
  { labelKey: 'saasLanding.stats.activeMerchants', value: 0, target: 1200, suffix: '+' },
  { labelKey: 'saasLanding.stats.revenueGenerated', value: 0, target: 50, suffix: 'M+' },
  { labelKey: 'saasLanding.stats.uptime', value: 0, target: 99, suffix: '.9%' }
])
const statsSection = ref<HTMLElement | null>(null)
let hasAnimated = false
const startCounter = () => {
  if (hasAnimated) return
  hasAnimated = true
  stats.value.forEach(stat => {
    const duration = 2200
    const end = stat.target
    const startTime = performance.now()
    const animate = (t2: number) => {
      const p = Math.min((t2 - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 4)
      stat.value = Math.floor(end * ease)
      if (p < 1) requestAnimationFrame(animate)
      else stat.value = end
    }
    requestAnimationFrame(animate)
  })
}

// ——— Storyteller (sticky scroll) ———
const storyRef = ref<HTMLElement | null>(null)
const storyStep = ref(0)
const storySteps = [
  { key: 'design', img: 'https://images.unsplash.com/photo-1557821552-17105176677c?q=80&w=1200&auto=format&fit=crop', tint: '#FF6B35' },
  { key: 'sell', img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop', tint: 'var(--brand)' },
  { key: 'ship', img: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?q=80&w=1200&auto=format&fit=crop', tint: '#FFB020' },
  { key: 'grow', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop', tint: 'var(--brand)' }
]

// ——— Theme carousel ———
const themeIdx = ref(0)
const themes = [
  { name: 'Minimal', img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1000&auto=format&fit=crop' },
  { name: 'Cozy', img: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1000&auto=format&fit=crop' },
  { name: 'Cyber', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop' },
  { name: 'Chrono', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop' },
  { name: 'Activewear', img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1000&auto=format&fit=crop' },
  { name: 'Food', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop' }
]
let themeTimer: ReturnType<typeof setInterval> | null = null

// ——— Features (bento fallback used under storyteller) ———
const heroChips = [
  { key: 'storefront', icon: 'lucide:store' },
  { key: 'payments', icon: 'lucide:credit-card' },
  { key: 'shipping', icon: 'lucide:truck' },
  { key: 'analytics', icon: 'lucide:bar-chart-3' },
  { key: 'ai', icon: 'lucide:sparkles' }
]

// ——— Pricing ———
const billingCycle = ref<'month' | 'year'>('month')
const pricingPlans = computed(() => {
  return PRICING_PLANS.map((plan) => {
    const card = pricingPlanCardForUi(plan, billingCycle.value)
    return {
      code: plan.code,
      name: t(`pricing.plans.${plan.code}.name`),
      price: card.priceText,
      currency: card.currency,
      period: billingCycle.value === 'month' ? t('pricing.period.perMonth') : t('pricing.period.perYear'),
      description: t(`pricing.plans.${plan.code}.description`),
      features: [t('pricing.features.ordersPerMonth', { count: plan.ordersPerMonth })],
      cta: t(`pricing.plans.${plan.code}.cta`),
      popular: card.popular
    }
  })
})

// ——— FAQ ———
const activeFaq = ref<number | null>(null)
const faqs = [
  { questionKey: 'saasLanding.faq.items.noCard.question', answerKey: 'saasLanding.faq.items.noCard.answer' },
  { questionKey: 'saasLanding.faq.items.changePlan.question', answerKey: 'saasLanding.faq.items.changePlan.answer' },
  { questionKey: 'saasLanding.faq.items.planDifferences.question', answerKey: 'saasLanding.faq.items.planDifferences.answer' }
]

// ——— Testimonials ———
const testimonials = [
  { textKey: 'saasLanding.testimonials.items.nassim.text', name: 'Nassim', roleKey: 'saasLanding.testimonials.items.nassim.role' },
  { textKey: 'saasLanding.testimonials.items.amina.text', name: 'Amina', roleKey: 'saasLanding.testimonials.items.amina.role' },
  { textKey: 'saasLanding.testimonials.items.yanis.text', name: 'Yanis', roleKey: 'saasLanding.testimonials.items.yanis.role' },
  { textKey: 'saasLanding.testimonials.items.lyes.text', name: 'Lyes', roleKey: 'saasLanding.testimonials.items.lyes.role' },
  { textKey: 'saasLanding.testimonials.items.meriem.text', name: 'Meriem', roleKey: 'saasLanding.testimonials.items.meriem.role' },
  { textKey: 'saasLanding.testimonials.items.sofiane.text', name: 'Sofiane', roleKey: 'saasLanding.testimonials.items.sofiane.role' }
]

// ——— Integrations ———
const integrationsRow1 = [
  { label: 'Stripe', icon: 'lucide:credit-card' },
  { label: 'Maystro', icon: 'lucide:truck' },
  { label: 'Yalidine', icon: 'lucide:package' },
  { label: 'Meta Pixel', icon: 'lucide:facebook' },
  { label: 'TikTok', icon: 'lucide:music-2' },
  { label: 'Google Sheets', icon: 'lucide:sheet' },
  { label: 'Analytics', icon: 'lucide:line-chart' }
]
const integrationsRow2 = [
  { label: 'OpenAI', icon: 'lucide:sparkles' },
  { label: 'Cloudinary', icon: 'lucide:image' },
  { label: 'Mailchimp', icon: 'lucide:mail' },
  { label: 'WhatsApp', icon: 'lucide:message-circle' },
  { label: 'Webhooks', icon: 'lucide:webhook' },
  { label: 'Zapier', icon: 'lucide:zap' },
  { label: 'Realtime', icon: 'lucide:radio' }
]
const integrationsRow3 = [
  { label: 'Klaviyo', icon: 'lucide:mail-check' },
  { label: 'Sentry', icon: 'lucide:shield-alert' },
  { label: 'Segment', icon: 'lucide:share-2' },
  { label: 'REST API', icon: 'lucide:code-2' },
  { label: 'S3', icon: 'lucide:cloud' },
  { label: 'Stripe Radar', icon: 'lucide:shield-check' }
]

// ——— Lifecycle ———
let observer: IntersectionObserver | null = null
let storyObserver: IntersectionObserver | null = null

onMounted(() => {
  window.addEventListener('mousemove', applyCursor, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true })

  observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && e.target === statsSection.value) {
        startCounter()
        observer?.disconnect()
      }
    })
  }, { threshold: 0.2 })
  if (statsSection.value) observer.observe(statsSection.value)

  // Storyteller: observe each step
  nextTick(() => {
    const stepEls = storyRef.value?.querySelectorAll('[data-step]')
    if (stepEls && stepEls.length) {
      storyObserver = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.step)
            if (!Number.isNaN(idx)) storyStep.value = idx
          }
        })
      }, { threshold: 0.55 })
      stepEls.forEach(el => storyObserver?.observe(el))
    }
  })

  // Theme carousel auto-advance
  themeTimer = setInterval(() => {
    themeIdx.value = (themeIdx.value + 1) % themes.length
  }, 3800)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', applyCursor)
  window.removeEventListener('scroll', onScroll)
  observer?.disconnect()
  storyObserver?.disconnect()
  if (themeTimer) clearInterval(themeTimer)
})

// Helpers
const splitChars = (s: string) => Array.from(s)
const cycleTheme = (dir: 1 | -1) => {
  themeIdx.value = (themeIdx.value + dir + themes.length) % themes.length
}
</script>

<template>
  <div ref="root" class="kinetic-landing">

    <!-- Top scroll progress bar -->
    <div class="fixed top-0 inset-x-0 z-[60] h-[2px] bg-white/5 pointer-events-none">
      <div class="h-full transition-[width] duration-75" :style="{ width: scrollPct + '%', background: 'linear-gradient(90deg, var(--brand), #FF6B35)' }" />
    </div>

    <!-- ═══════════════ HERO ═══════════════ -->
    <section
      ref="heroRef"
      class="kl-hero relative min-h-[100vh] flex items-center pt-28 pb-24 overflow-hidden"
    >
      <!-- Cursor glow -->
      <div class="kl-hero__glow" aria-hidden="true" />
      <!-- Grid texture -->
      <div class="kl-hero__grid" aria-hidden="true" />
      <!-- Noise overlay -->
      <div class="kl-noise" aria-hidden="true" />

      <div class="relative max-w-7xl mx-auto px-6 w-full z-10">
        <!-- Kicker -->
        <div
          v-motion-slide-visible-once-bottom
          class="flex items-center gap-3 mb-8 font-mono text-[11px] tracking-[0.25em] uppercase text-white/50"
        >
          <span class="inline-flex w-8 h-px bg-white/30" />
          <span>{{ t('saasLanding.hero.kicker') }}</span>
        </div>

        <!-- Headline -->
        <h1 class="kl-hero__headline">
          <span class="kl-hero__line">
            <span
              v-for="(ch, i) in splitChars(t('saasLanding.hero.title.buildSell'))"
              :key="'a'+i"
              class="kl-char"
              :style="{ animationDelay: (i * 25) + 'ms' }"
            >{{ ch === ' ' ? '\u00A0' : ch }}</span>
          </span>
          <br>
          <span class="kl-hero__line">
            <span
              v-for="(ch, i) in splitChars(t('saasLanding.hero.title.scale'))"
              :key="'b'+i"
              class="kl-char kl-char--accent"
              :style="{ animationDelay: (300 + i * 25) + 'ms' }"
            >{{ ch === ' ' ? '\u00A0' : ch }}</span>
            <span class="kl-hero__italic">
              <span
                v-for="(ch, i) in splitChars(' ' + t('saasLanding.hero.italicWord'))"
                :key="'c'+i"
                class="kl-char"
                :style="{ animationDelay: (600 + i * 25) + 'ms' }"
              >{{ ch === ' ' ? '\u00A0' : ch }}</span>
            </span>
          </span>
        </h1>

        <p
          v-motion-slide-visible-once-bottom
          :delay="800"
          class="mt-10 max-w-xl text-lg md:text-xl text-white/60 leading-relaxed font-light"
        >
          {{ t('saasLanding.hero.subtitle') }}
        </p>

        <!-- CTAs -->
        <div
          v-motion-slide-visible-once-bottom
          :delay="900"
          class="mt-12 flex flex-col sm:flex-row gap-4"
        >
          <NuxtLink to="/register" class="kl-btn kl-btn--primary group">
            <span class="relative z-10 flex items-center gap-2">
              {{ t('saasLanding.hero.ctaPrimary') }}
              <Icon name="lucide:arrow-right" class="w-4 h-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
            </span>
            <span class="kl-btn__shine" aria-hidden="true" />
          </NuxtLink>

          <button class="kl-btn kl-btn--ghost">
            <Icon name="lucide:play" class="w-4 h-4" />
            {{ t('saasLanding.hero.ctaSecondary') }}
          </button>
        </div>

        <!-- Floating chips -->
        <div
          v-motion-slide-visible-once-bottom
          :delay="1100"
          class="mt-16 flex flex-wrap gap-3"
        >
          <div
            v-for="(chip, i) in heroChips"
            :key="chip.key"
            class="kl-chip"
            :style="{ animationDelay: (i * 150) + 'ms' }"
          >
            <Icon :name="chip.icon" class="w-3.5 h-3.5" />
            <span>{{ t(`saasLanding.hero.chips.${chip.key}`) }}</span>
          </div>
        </div>

        <!-- Scroll hint -->
        <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 font-mono text-[10px] tracking-[0.3em] uppercase">
          <span>{{ t('saasLanding.hero.scrollHint') }}</span>
          <div class="kl-scroll-dot" />
        </div>
      </div>
    </section>

    <!-- ═══════════════ LOGO TICKER ═══════════════ -->
    <section class="kl-ticker bg-[#09090F] border-y border-white/5 py-8 overflow-hidden">
      <ClientOnly>
        <Vue3Marquee :duration="38" :direction="isRtl ? 'reverse' : 'normal'" class="opacity-40 hover:opacity-80 transition-opacity">
          <div v-for="(intg, i) in [...integrationsRow1, ...integrationsRow2]" :key="'t'+i" class="flex items-center gap-3 px-8 text-white/60 text-xl font-semibold tracking-tight">
            <Icon :name="intg.icon" class="w-5 h-5" />
            <span>{{ intg.label }}</span>
            <span class="kl-ticker__dot" />
          </div>
        </Vue3Marquee>
      </ClientOnly>
    </section>

    <!-- ═══════════════ STORYTELLER (sticky) ═══════════════ -->
    <section ref="storyRef" class="kl-story relative bg-[#0a0a12]">
      <div class="max-w-7xl mx-auto px-6 py-24">
        <div class="mb-20 max-w-2xl">
          <div class="kl-eyebrow mb-5">
            <span class="kl-eyebrow__dot" />
            {{ t('saasLanding.storyteller.eyebrow') }}
          </div>
          <h2 class="kl-h2 text-white">{{ t('saasLanding.storyteller.title') }}</h2>
          <p class="mt-5 text-white/50 text-lg leading-relaxed">{{ t('saasLanding.storyteller.subtitle') }}</p>
        </div>

        <div class="grid lg:grid-cols-2 gap-16 relative">
          <!-- Left: scrolling steps -->
          <div class="space-y-[40vh]">
            <div
              v-for="(step, i) in storySteps"
              :key="step.key"
              :data-step="i"
              class="kl-story-step"
              :class="{ 'kl-story-step--active': storyStep === i }"
            >
              <div class="flex items-baseline gap-4 mb-4">
                <span class="font-mono text-xs tracking-[0.3em] text-white/30">{{ t(`saasLanding.storyteller.steps.${step.key}.number`) }}</span>
                <span class="font-mono text-xs tracking-[0.3em] uppercase" :style="{ color: step.tint }">{{ t(`saasLanding.storyteller.steps.${step.key}.caption`) }}</span>
              </div>
              <h3 class="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight tracking-tight">{{ t(`saasLanding.storyteller.steps.${step.key}.title`) }}</h3>
              <p class="text-white/50 text-base md:text-lg leading-relaxed max-w-md">{{ t(`saasLanding.storyteller.steps.${step.key}.description`) }}</p>

              <div class="mt-6 flex items-center gap-2">
                <div v-for="(_, j) in storySteps" :key="j" class="h-px transition-all duration-500" :class="j === i ? 'w-12' : 'w-6'" :style="{ background: j === i ? step.tint : 'rgba(255,255,255,0.15)' }" />
              </div>
            </div>
          </div>

          <!-- Right: sticky visual -->
          <div class="hidden lg:block relative">
            <div class="sticky top-24 aspect-[4/5] max-h-[80vh] rounded-3xl overflow-hidden border border-white/10 bg-white/5">
              <div v-for="(step, i) in storySteps" :key="step.key" class="absolute inset-0 transition-all duration-700" :class="storyStep === i ? 'opacity-100 scale-100' : 'opacity-0 scale-105'">
                <img :src="step.img" :alt="step.key" class="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                <div class="absolute inset-0" :style="{ background: `linear-gradient(180deg, transparent 40%, ${step.tint === 'var(--brand)' ? 'rgba(15,118,110,0.5)' : step.tint + '55'} 100%), linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.8))` }" />
                <div class="absolute bottom-8 left-8 right-8">
                  <div class="font-mono text-xs tracking-[0.3em] uppercase mb-2" :style="{ color: step.tint }">{{ t(`saasLanding.storyteller.steps.${step.key}.number`) }} / {{ t(`saasLanding.storyteller.steps.${step.key}.caption`) }}</div>
                  <div class="text-white text-2xl font-bold leading-tight">{{ t(`saasLanding.storyteller.steps.${step.key}.title`) }}</div>
                </div>
              </div>

              <!-- Progress rail -->
              <div class="absolute top-6 right-6 rtl:right-auto rtl:left-6 flex flex-col gap-2">
                <div v-for="(_, i) in storySteps" :key="i" class="w-1 rounded-full transition-all duration-500" :class="storyStep >= i ? 'h-8 bg-white' : 'h-4 bg-white/20'" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ STATS BAND ═══════════════ -->
    <section ref="statsSection" class="kl-stats relative overflow-hidden py-28">
      <!-- Morphing blob -->
      <svg class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] opacity-30 pointer-events-none kl-blob" viewBox="0 0 600 600" aria-hidden="true">
        <defs>
          <linearGradient id="blobGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="var(--brand)" />
            <stop offset="100%" stop-color="#FF6B35" />
          </linearGradient>
        </defs>
        <path fill="url(#blobGrad)">
          <animate attributeName="d" dur="14s" repeatCount="indefinite" values="
            M421.5,321.5Q395,393,321.5,420Q248,447,177.5,413.5Q107,380,88,305Q69,230,116,169.5Q163,109,230,84Q297,59,367,94Q437,129,444.5,204.5Q452,280,421.5,321.5Z;
            M430,300Q410,370,350,420Q290,470,215,445Q140,420,100,350Q60,280,105,205Q150,130,220,100Q290,70,370,90Q450,110,455,195Q460,280,430,300Z;
            M421.5,321.5Q395,393,321.5,420Q248,447,177.5,413.5Q107,380,88,305Q69,230,116,169.5Q163,109,230,84Q297,59,367,94Q437,129,444.5,204.5Q452,280,421.5,321.5Z"/>
        </path>
      </svg>

      <div class="relative max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 z-10">
        <div v-for="(stat, idx) in stats" :key="idx" class="text-center md:text-left">
          <div class="font-anton text-7xl md:text-8xl leading-none text-white tracking-tight">
            {{ stat.value.toLocaleString() }}<span class="text-brand">{{ stat.suffix }}</span>
          </div>
          <div class="mt-4 font-mono text-[11px] tracking-[0.3em] uppercase text-white/50">{{ t(stat.labelKey) }}</div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ THEME CAROUSEL ═══════════════ -->
    <section class="kl-carousel relative bg-[#f5f2eb] py-28 overflow-hidden">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-16">
          <div class="max-w-xl">
            <div class="kl-eyebrow kl-eyebrow--dark mb-5">
              <span class="kl-eyebrow__dot" />
              {{ t('saasLanding.carousel.eyebrow') }}
            </div>
            <h2 class="kl-h2 text-slate-900">{{ t('saasLanding.carousel.title') }}</h2>
            <p class="mt-4 text-slate-600 text-lg">{{ t('saasLanding.carousel.subtitle') }}</p>
          </div>
          <div class="flex items-center gap-3">
            <button @click="cycleTheme(-1)" class="kl-carousel__btn"><Icon name="lucide:arrow-left" class="w-5 h-5 rtl:rotate-180" /></button>
            <button @click="cycleTheme(1)" class="kl-carousel__btn"><Icon name="lucide:arrow-right" class="w-5 h-5 rtl:rotate-180" /></button>
            <NuxtLink to="/themes" class="kl-btn kl-btn--dark ml-3">
              {{ t('saasLanding.carousel.cta') }}
              <Icon name="lucide:arrow-up-right" class="w-4 h-4" />
            </NuxtLink>
          </div>
        </div>

        <div class="kl-carousel__stage">
          <div
            v-for="(th, i) in themes"
            :key="th.name"
            class="kl-carousel__card"
            :class="{
              'kl-carousel__card--active': i === themeIdx,
              'kl-carousel__card--prev': i === (themeIdx - 1 + themes.length) % themes.length,
              'kl-carousel__card--next': i === (themeIdx + 1) % themes.length
            }"
            @click="themeIdx = i"
          >
            <img :src="th.img" :alt="th.name" loading="lazy" />
            <div class="kl-carousel__card-label">
              <span class="font-mono text-[10px] tracking-[0.3em] uppercase text-white/70">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="text-white font-bold text-xl">{{ th.name }}</span>
            </div>
          </div>
        </div>

        <div class="flex justify-center gap-2 mt-10">
          <button
            v-for="(_, i) in themes"
            :key="i"
            @click="themeIdx = i"
            class="h-1 rounded-full transition-all duration-300"
            :class="i === themeIdx ? 'w-10 bg-slate-900' : 'w-4 bg-slate-300 hover:bg-slate-500'"
          />
        </div>
      </div>
    </section>

    <!-- ═══════════════ INTEGRATIONS ═══════════════ -->
    <section class="py-24 bg-[#09090F] overflow-hidden relative">
      <div class="max-w-4xl mx-auto px-6 text-center mb-16">
        <div class="kl-eyebrow mb-5 justify-center">
          <span class="kl-eyebrow__dot" />
          Integrations
        </div>
        <h2 class="kl-h2 text-white">{{ t('saasLanding.integrations.title') }}</h2>
        <p class="mt-4 text-white/50 text-lg">{{ t('saasLanding.integrations.subtitle') }}</p>
      </div>

      <div class="relative flex flex-col gap-4 mask-horizontal">
        <ClientOnly>
          <Vue3Marquee :duration="45" :direction="isRtl ? 'reverse' : 'normal'">
            <div v-for="(intg, i) in integrationsRow1" :key="'r1'+i" class="kl-pill">
              <Icon :name="intg.icon" class="w-4 h-4" />
              <span>{{ intg.label }}</span>
            </div>
          </Vue3Marquee>
          <Vue3Marquee :duration="55" :direction="isRtl ? 'normal' : 'reverse'">
            <div v-for="(intg, i) in integrationsRow2" :key="'r2'+i" class="kl-pill kl-pill--accent">
              <Icon :name="intg.icon" class="w-4 h-4" />
              <span>{{ intg.label }}</span>
            </div>
          </Vue3Marquee>
          <Vue3Marquee :duration="50" :direction="isRtl ? 'reverse' : 'normal'">
            <div v-for="(intg, i) in integrationsRow3" :key="'r3'+i" class="kl-pill">
              <Icon :name="intg.icon" class="w-4 h-4" />
              <span>{{ intg.label }}</span>
            </div>
          </Vue3Marquee>
        </ClientOnly>
      </div>
    </section>

    <!-- ═══════════════ PRICING ═══════════════ -->
    <section class="kl-pricing py-28 bg-[#f5f2eb] relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-14">
          <div class="kl-eyebrow kl-eyebrow--dark mb-5 justify-center">
            <span class="kl-eyebrow__dot" />
            {{ t('saasLanding.pricingSection.eyebrow') }}
          </div>
          <h2 class="kl-h2 text-slate-900">{{ t('pricing.section.title') }}</h2>
          <p class="mt-4 text-slate-600 text-lg">{{ t('pricing.section.subtitle') }}</p>

          <!-- Toggle -->
          <div class="kl-toggle mt-10 mx-auto">
            <button
              class="kl-toggle__btn"
              :class="{ 'kl-toggle__btn--active': billingCycle === 'month' }"
              @click="billingCycle = 'month'"
            >{{ t('saasLanding.pricingSection.toggle.monthly') }}</button>
            <button
              class="kl-toggle__btn"
              :class="{ 'kl-toggle__btn--active': billingCycle === 'year' }"
              @click="billingCycle = 'year'"
            >
              {{ t('saasLanding.pricingSection.toggle.yearly') }}
              <span class="kl-toggle__badge">−20%</span>
            </button>
            <span class="kl-toggle__pill" :class="{ 'kl-toggle__pill--right': billingCycle === 'year' }" />
          </div>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div
            v-for="(plan, idx) in pricingPlans"
            :key="plan.code"
            class="kl-plan group"
            :class="plan.popular ? 'kl-plan--popular' : ''"
            :style="{ animationDelay: (idx * 80) + 'ms' }"
          >
            <div v-if="plan.popular" class="kl-plan__badge">
              <Icon name="lucide:sparkles" class="w-3 h-3" />
              {{ t('pricing.badges.mostPopular') }}
            </div>

            <div class="font-mono text-[11px] tracking-[0.3em] uppercase opacity-60 mb-3">{{ plan.name }}</div>
            <div class="flex items-baseline gap-2 mb-2">
              <span class="font-anton text-6xl leading-none">{{ plan.price }}</span>
              <span class="font-mono text-xs opacity-60">{{ plan.currency }}</span>
            </div>
            <div class="text-xs opacity-60 mb-6">{{ plan.period }}</div>

            <p class="text-sm opacity-70 leading-relaxed mb-6 min-h-[3rem]">{{ plan.description }}</p>

            <button
              class="kl-plan__cta"
              :class="plan.popular ? 'kl-plan__cta--inverse' : ''"
            >
              {{ plan.cta }}
              <Icon name="lucide:arrow-right" class="w-4 h-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
            </button>

            <ul class="space-y-3 mt-6 text-sm">
              <li v-for="(feat, fIdx) in plan.features" :key="fIdx" class="flex items-center gap-2 opacity-80">
                <Icon name="lucide:check-circle-2" class="w-4 h-4 shrink-0 text-brand" />
                {{ feat }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ TESTIMONIALS ═══════════════ -->
    <section class="py-28 bg-[#09090F] border-y border-white/5 relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div class="kl-eyebrow mb-5">
            <span class="kl-eyebrow__dot" />
            Testimonials
          </div>
          <h2 class="kl-h2 text-white">
            {{ t('saasLanding.testimonials.heading.prefix') }}
            <span class="italic font-playfair font-normal" style="color: var(--brand)">{{ t('saasLanding.testimonials.heading.accent') }}</span>
            {{ t('saasLanding.testimonials.heading.suffix') }}
          </h2>
          <p class="mt-5 text-white/50 text-lg max-w-md">{{ t('saasLanding.testimonials.subtitle') }}</p>

          <div class="mt-8 flex items-center gap-4">
            <div class="flex -space-x-3">
              <div v-for="ti in testimonials.slice(0,4)" :key="ti.name" class="w-11 h-11 rounded-full border-2 border-[#09090F] flex items-center justify-center text-xs font-bold text-white" :style="{ background: 'linear-gradient(135deg, var(--brand), #FF6B35)' }">
                {{ ti.name.charAt(0) }}
              </div>
            </div>
            <div class="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40">+50 merchants</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 h-[600px] relative mask-vertical">
          <ClientOnly>
            <Vue3Marquee :vertical="true" :duration="35" :pauseOnHover="true" class="h-full">
              <div v-for="(ti, i) in testimonials" :key="'tl'+i" class="kl-testi">
                <Icon name="lucide:quote" class="w-5 h-5 opacity-40 mb-3" style="color: var(--brand)" />
                <p class="text-white/80 text-sm leading-relaxed mb-5">{{ t(ti.textKey) }}</p>
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" :style="{ background: 'linear-gradient(135deg, var(--brand), #FF6B35)' }">{{ ti.name.charAt(0) }}</div>
                  <div>
                    <div class="text-white text-sm font-bold">{{ ti.name }}</div>
                    <div class="text-white/40 text-[10px] font-mono uppercase tracking-wider">{{ t(ti.roleKey) }}</div>
                  </div>
                </div>
              </div>
            </Vue3Marquee>
            <Vue3Marquee :vertical="true" :duration="45" :pauseOnHover="true" :direction="'reverse'" class="h-full">
              <div v-for="(ti, i) in [...testimonials].reverse()" :key="'tr'+i" class="kl-testi">
                <Icon name="lucide:quote" class="w-5 h-5 opacity-40 mb-3" style="color: #FF6B35" />
                <p class="text-white/80 text-sm leading-relaxed mb-5">{{ t(ti.textKey) }}</p>
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" :style="{ background: 'linear-gradient(135deg, #FF6B35, var(--brand))' }">{{ ti.name.charAt(0) }}</div>
                  <div>
                    <div class="text-white text-sm font-bold">{{ ti.name }}</div>
                    <div class="text-white/40 text-[10px] font-mono uppercase tracking-wider">{{ t(ti.roleKey) }}</div>
                  </div>
                </div>
              </div>
            </Vue3Marquee>
          </ClientOnly>
        </div>
      </div>
    </section>

    <!-- ═══════════════ FAQ ═══════════════ -->
    <section class="py-28 bg-[#0a0a12]">
      <div class="max-w-3xl mx-auto px-6">
        <div class="text-center mb-16">
          <div class="kl-eyebrow mb-5 justify-center">
            <span class="kl-eyebrow__dot" />
            FAQ
          </div>
          <h2 class="kl-h2 text-white">{{ t('saasLanding.faq.title') }}</h2>
          <p class="mt-4 text-white/50 text-lg">{{ t('saasLanding.faq.subtitle') }}</p>
        </div>

        <div class="space-y-3">
          <div
            v-for="(faq, idx) in faqs"
            :key="idx"
            class="kl-faq"
            :class="{ 'kl-faq--open': activeFaq === idx }"
          >
            <button
              class="w-full flex items-center justify-between gap-6 p-6 text-left group"
              @click="activeFaq = activeFaq === idx ? null : idx"
            >
              <span class="text-white font-semibold text-lg md:text-xl tracking-tight">{{ t(faq.questionKey) }}</span>
              <span class="kl-faq__icon">
                <Icon name="lucide:plus" class="w-4 h-4" />
              </span>
            </button>
            <div class="kl-faq__body">
              <div class="px-6 pb-6 text-white/60 leading-relaxed">{{ t(faq.answerKey) }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ FINALE CTA ═══════════════ -->
    <section ref="finaleRef" class="kl-finale relative overflow-hidden py-32">
      <div class="kl-finale__glow" aria-hidden="true" />
      <div class="kl-noise" aria-hidden="true" />

      <div class="relative max-w-5xl mx-auto px-6 text-center z-10">
        <div class="kl-eyebrow mb-8 justify-center">
          <span class="kl-eyebrow__dot" />
          Let's go
        </div>

        <h2 class="font-anton text-[clamp(3rem,10vw,9rem)] leading-[0.9] text-white uppercase tracking-tight">
          {{ t('saasLanding.finalCta.title') }}
        </h2>

        <p class="mt-8 text-xl md:text-2xl text-white/60 max-w-2xl mx-auto font-light">
          {{ t('saasLanding.finalCta.subtitle') }}
        </p>

        <NuxtLink to="/register" class="kl-btn kl-btn--primary kl-btn--xl mt-12 group">
          <span class="relative z-10 flex items-center gap-3">
            {{ t('saasLanding.finalCta.cta') }}
            <Icon name="lucide:arrow-right" class="w-5 h-5 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
          </span>
          <span class="kl-btn__shine" aria-hidden="true" />
        </NuxtLink>
      </div>
    </section>

  </div>
</template>

<style scoped>
/* ═══ Global root ═══ */
.kinetic-landing {
  --hero-bg: #07070C;
  --hot: #FF6B35;
  background: var(--hero-bg);
  color: white;
  font-family: 'Outfit', 'DM Sans', system-ui, sans-serif;
  overflow: hidden;
}

.font-anton { font-family: 'Anton', sans-serif; letter-spacing: -0.02em; }
.font-playfair { font-family: 'Playfair Display', serif; }

/* ═══ Noise texture ═══ */
.kl-noise {
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.12 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.6; mix-blend-mode: overlay; pointer-events: none;
}

/* ═══ HERO ═══ */
.kl-hero {
  --mx: 50%; --my: 50%;
  background:
    radial-gradient(ellipse at top right, rgba(var(--brand-rgb)/0.18), transparent 50%),
    radial-gradient(ellipse at bottom left, rgba(255,107,53,0.1), transparent 55%),
    var(--hero-bg);
}
.kl-hero__glow {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(circle 500px at var(--mx) var(--my), rgba(var(--brand-rgb)/0.25), transparent 70%);
  transition: background 150ms ease-out;
}
.kl-hero__grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse at center, black 40%, transparent 75%);
  pointer-events: none;
}
.kl-hero__headline {
  font-family: 'Anton', sans-serif;
  font-size: clamp(3.5rem, 10vw, 9rem);
  line-height: 0.9;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  color: white;
}
.kl-hero__line { display: inline-block; }
.kl-hero__italic {
  font-family: 'Playfair Display', serif;
  font-weight: 400;
  font-style: italic;
  text-transform: none;
  color: var(--hot);
  font-size: 0.85em;
  letter-spacing: 0;
}
.kl-char {
  display: inline-block;
  opacity: 0;
  transform: translateY(60%) rotate(6deg);
  animation: charIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}
.kl-char--accent { color: var(--brand); }
@keyframes charIn {
  to { opacity: 1; transform: translateY(0) rotate(0); }
}

.kl-scroll-dot {
  width: 1px; height: 40px;
  background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.6), transparent);
  animation: scrollHint 2.5s ease-in-out infinite;
}
@keyframes scrollHint {
  0%, 100% { transform: translateY(-8px); opacity: 0.3; }
  50% { transform: translateY(8px); opacity: 1; }
}

/* ═══ Chips ═══ */
.kl-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
  font-size: 0.8rem;
  font-weight: 500;
  backdrop-filter: blur(12px);
  opacity: 0;
  transform: translateY(10px);
  animation: chipIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  transition: transform 0.3s, border-color 0.3s, color 0.3s;
}
.kl-chip:hover {
  border-color: rgba(var(--brand-rgb)/0.5);
  color: white;
  transform: translateY(-3px);
}
@keyframes chipIn { to { opacity: 1; transform: translateY(0); } }

/* ═══ Buttons ═══ */
.kl-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.95rem 1.75rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: -0.01em;
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.kl-btn--primary {
  background: var(--brand);
  color: white;
  box-shadow: 0 10px 40px -10px rgba(var(--brand-rgb)/0.6), inset 0 1px 0 rgba(255,255,255,0.2);
}
.kl-btn--primary:hover { transform: translateY(-2px); box-shadow: 0 20px 50px -10px rgba(var(--brand-rgb)/0.8); }
.kl-btn--ghost {
  background: rgba(255,255,255,0.04);
  color: white;
  border: 1px solid rgba(255,255,255,0.12);
}
.kl-btn--ghost:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.25); }
.kl-btn--dark {
  background: #09090F;
  color: white;
  padding: 0.75rem 1.25rem;
  font-size: 0.85rem;
}
.kl-btn--dark:hover { background: black; transform: translateY(-2px); }
.kl-btn--xl { padding: 1.2rem 2.4rem; font-size: 1.1rem; }
.kl-btn__shine {
  position: absolute; top: 0; left: -75%; width: 50%; height: 100%;
  background: linear-gradient(120deg, transparent, rgba(255,255,255,0.3), transparent);
  transform: skewX(-20deg);
  transition: left 0.7s ease;
}
.kl-btn:hover .kl-btn__shine { left: 125%; }

/* ═══ Eyebrows ═══ */
.kl-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.55);
}
.kl-eyebrow--dark { color: rgba(15,23,42,0.6); }
.kl-eyebrow__dot {
  width: 6px; height: 6px; border-radius: 999px;
  background: var(--brand);
  box-shadow: 0 0 0 4px rgba(var(--brand-rgb)/0.2);
  animation: dotPulse 2s ease-in-out infinite;
}
@keyframes dotPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--brand-rgb)/0.3); }
  50% { box-shadow: 0 0 0 6px rgba(var(--brand-rgb)/0); }
}

.kl-h2 {
  font-family: 'Anton', sans-serif;
  font-size: clamp(2.2rem, 5vw, 4.2rem);
  line-height: 0.95;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  font-weight: 400;
}

/* ═══ Ticker ═══ */
.kl-ticker__dot {
  width: 5px; height: 5px; border-radius: 999px;
  background: rgba(255,255,255,0.2);
  display: inline-block;
  margin-left: 2rem;
}

/* ═══ Storyteller ═══ */
.kl-story-step {
  transition: opacity 0.4s ease;
  opacity: 0.3;
}
.kl-story-step--active { opacity: 1; }

/* ═══ Stats blob ═══ */
.kl-stats { background: #07070C; }
.kl-blob {
  filter: blur(60px);
  animation: blobSpin 40s linear infinite;
}
@keyframes blobSpin { to { transform: translate(-50%, -50%) rotate(360deg); } }

/* ═══ Carousel ═══ */
.kl-carousel__stage {
  position: relative;
  height: 500px;
  perspective: 1800px;
}
.kl-carousel__card {
  position: absolute;
  top: 50%; left: 50%;
  width: min(560px, 90%); height: 420px;
  border-radius: 24px;
  overflow: hidden;
  cursor: pointer;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.6);
  transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 40px 80px -20px rgba(0,0,0,0.4);
  pointer-events: none;
}
.kl-carousel__card img {
  width: 100%; height: 100%; object-fit: cover;
}
.kl-carousel__card--active {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
  z-index: 10;
  pointer-events: auto;
}
.kl-carousel__card--prev {
  opacity: 0.5;
  transform: translate(-130%, -50%) scale(0.75) rotateY(18deg);
  z-index: 5;
}
.kl-carousel__card--next {
  opacity: 0.5;
  transform: translate(30%, -50%) scale(0.75) rotateY(-18deg);
  z-index: 5;
}
[dir="rtl"] .kl-carousel__card--prev {
  transform: translate(30%, -50%) scale(0.75) rotateY(-18deg);
}
[dir="rtl"] .kl-carousel__card--next {
  transform: translate(-130%, -50%) scale(0.75) rotateY(18deg);
}
.kl-carousel__card-label {
  position: absolute; bottom: 24px; left: 24px; right: 24px;
  display: flex; align-items: baseline; justify-content: space-between;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  padding: 60px 20px 20px; margin: -60px -20px -20px;
}
.kl-carousel__btn {
  width: 44px; height: 44px;
  border-radius: 999px;
  background: white;
  color: #09090F;
  display: inline-flex; align-items: center; justify-content: center;
  transition: transform 0.2s, background 0.2s;
  border: 1px solid rgba(0,0,0,0.08);
}
.kl-carousel__btn:hover { transform: translateY(-2px); background: #09090F; color: white; }

/* ═══ Integration pills ═══ */
.kl-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.1rem;
  margin: 0 0.3rem;
  border-radius: 999px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}
.kl-pill:hover {
  background: rgba(var(--brand-rgb)/0.12);
  border-color: rgba(var(--brand-rgb)/0.4);
  color: white;
}
.kl-pill--accent {
  background: rgba(255,107,53,0.06);
  border-color: rgba(255,107,53,0.15);
  color: rgba(255,180,150,0.9);
}

.mask-horizontal { mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent); }
.mask-vertical { mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent); }

/* ═══ Pricing toggle ═══ */
.kl-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  background: white;
  border: 1px solid rgba(15,23,42,0.08);
  border-radius: 999px;
  padding: 4px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.04);
}
.kl-toggle__btn {
  position: relative; z-index: 2;
  padding: 0.55rem 1.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  border-radius: 999px;
  display: inline-flex; align-items: center; gap: 0.5rem;
  transition: color 0.3s;
}
.kl-toggle__btn--active { color: white; }
.kl-toggle__pill {
  position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 4px);
  background: #09090F;
  border-radius: 999px;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
}
.kl-toggle__pill--right { transform: translateX(100%); }
.kl-toggle__badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255,107,53,0.2);
  color: var(--hot);
}
[dir="rtl"] .kl-toggle__pill--right { transform: translateX(-100%); }

/* ═══ Plan card ═══ */
.kl-plan {
  position: relative;
  padding: 2rem;
  border-radius: 24px;
  background: white;
  color: #09090F;
  border: 1px solid rgba(15,23,42,0.06);
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.4s, border-color 0.4s;
}
.kl-plan:hover { transform: translateY(-8px); box-shadow: 0 30px 60px -20px rgba(0,0,0,0.15); border-color: rgba(var(--brand-rgb)/0.3); }
.kl-plan--popular {
  background: #09090F;
  color: white;
  border-color: #09090F;
  box-shadow: 0 25px 60px -10px rgba(var(--brand-rgb)/0.3);
}
.kl-plan__badge {
  position: absolute;
  top: -12px; left: 50%; transform: translateX(-50%);
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--brand), var(--hot));
  color: white;
  font-size: 0.65rem;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 700;
  white-space: nowrap;
}
.kl-plan__cta {
  width: 100%;
  padding: 0.85rem 1.25rem;
  border-radius: 14px;
  background: #09090F;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  transition: background 0.25s;
}
.kl-plan__cta:hover { background: var(--brand); }
.kl-plan__cta--inverse { background: white; color: #09090F; }
.kl-plan__cta--inverse:hover { background: var(--brand); color: white; }
.text-brand { color: var(--brand); }

/* ═══ Testimonial cards ═══ */
.kl-testi {
  padding: 1.25rem;
  margin: 0.4rem 0.3rem;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
  border: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(8px);
  transition: border-color 0.3s, transform 0.3s;
}
.kl-testi:hover {
  border-color: rgba(var(--brand-rgb)/0.4);
  transform: translateY(-2px);
}

/* ═══ FAQ ═══ */
.kl-faq {
  border-radius: 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  overflow: hidden;
  transition: border-color 0.3s, background 0.3s;
}
.kl-faq:hover { border-color: rgba(255,255,255,0.15); }
.kl-faq--open {
  border-color: rgba(var(--brand-rgb)/0.35);
  background: rgba(var(--brand-rgb)/0.04);
}
.kl-faq__icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 999px;
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6);
  transition: transform 0.35s, background 0.3s, color 0.3s;
}
.kl-faq--open .kl-faq__icon {
  transform: rotate(45deg);
  background: var(--brand); color: white;
}
.kl-faq__body {
  max-height: 0; overflow: hidden;
  transition: max-height 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.kl-faq--open .kl-faq__body { max-height: 400px; }

/* ═══ Finale ═══ */
.kl-finale {
  --mx: 50%; --my: 50%;
  background:
    radial-gradient(ellipse at center, rgba(var(--brand-rgb)/0.25), transparent 60%),
    linear-gradient(180deg, var(--hero-bg), #09090F);
}
.kl-finale__glow {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(circle 600px at var(--mx) var(--my), rgba(255,107,53,0.15), transparent 70%);
}

/* ═══ Reduced motion ═══ */
@media (prefers-reduced-motion: reduce) {
  .kl-char, .kl-chip, .kl-blob { animation: none !important; opacity: 1 !important; transform: none !important; }
  .kl-hero__glow, .kl-finale__glow { display: none; }
  .kl-scroll-dot { animation: none; }
  .kl-eyebrow__dot { animation: none; }
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .kl-carousel__stage { height: 380px; }
  .kl-carousel__card { width: 88%; height: 360px; }
  .kl-carousel__card--prev, .kl-carousel__card--next { opacity: 0; }
}
</style>
