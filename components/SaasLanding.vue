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

// ——— Scroll progress ———
const scrollPct = ref(0)
const onScroll = () => {
  const h = document.documentElement
  const total = h.scrollHeight - h.clientHeight
  scrollPct.value = total > 0 ? (h.scrollTop / total) * 100 : 0
}

// ——— Cursor tracking (for hero spotlight) ———
const heroRef = ref<HTMLElement | null>(null)
const finaleRef = ref<HTMLElement | null>(null)
let rafId = 0
let mx = 0, my = 0
const applyCursor = (e: MouseEvent) => {
  mx = e.clientX; my = e.clientY
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    const apply = (el: HTMLElement | null) => {
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${((mx - r.left) / r.width) * 100}%`)
      el.style.setProperty('--my', `${((my - r.top) / r.height) * 100}%`)
    }
    apply(heroRef.value); apply(finaleRef.value)
    rafId = 0
  })
}

// ——— Stats ———
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
    const step = (t2: number) => {
      const p = Math.min((t2 - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 4)
      stat.value = Math.floor(end * ease)
      if (p < 1) requestAnimationFrame(step)
      else stat.value = end
    }
    requestAnimationFrame(step)
  })
}

// ——— Storyteller ———
const storyRef = ref<HTMLElement | null>(null)
const storyStep = ref(0)
const storySteps = [
  { key: 'design', sticker: '✦', color: '#FF7A45' },
  { key: 'sell', sticker: '◉', color: '#1F9D8E' },
  { key: 'ship', sticker: '✳', color: '#F4C04E' },
  { key: 'grow', sticker: '✺', color: '#E85D75' }
]

// ——— Theme cards (tilted polaroids) ———
const themes = [
  { name: 'Cozy', img: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=800&auto=format&fit=crop', rotate: -6, tint: '#F4C04E' },
  { name: 'Minimal', img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop', rotate: 3, tint: '#1F9D8E' },
  { name: 'Activewear', img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=800&auto=format&fit=crop', rotate: -2, tint: '#FF7A45' },
  { name: 'Food', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop', rotate: 5, tint: '#E85D75' },
  { name: 'Cyber', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop', rotate: -4, tint: '#6366F1' },
  { name: 'Chrono', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop', rotate: 4, tint: '#1F9D8E' }
]

// ——— Chips ———
const heroChips = [
  { key: 'storefront', icon: 'lucide:store', color: '#1F9D8E' },
  { key: 'payments', icon: 'lucide:credit-card', color: '#FF7A45' },
  { key: 'shipping', icon: 'lucide:truck', color: '#F4C04E' },
  { key: 'analytics', icon: 'lucide:bar-chart-3', color: '#E85D75' },
  { key: 'ai', icon: 'lucide:sparkles', color: '#6366F1' }
]

const heroTrustSignals = [
  { key: 'secure', icon: 'lucide:shield-check' },
  { key: 'ssl', icon: 'lucide:lock' },
  { key: 'cloud', icon: 'lucide:cloud' }
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
  { textKey: 'saasLanding.testimonials.items.nassim.text', name: 'Nassim', roleKey: 'saasLanding.testimonials.items.nassim.role', color: '#FF7A45' },
  { textKey: 'saasLanding.testimonials.items.amina.text', name: 'Amina', roleKey: 'saasLanding.testimonials.items.amina.role', color: '#1F9D8E' },
  { textKey: 'saasLanding.testimonials.items.yanis.text', name: 'Yanis', roleKey: 'saasLanding.testimonials.items.yanis.role', color: '#F4C04E' },
  { textKey: 'saasLanding.testimonials.items.lyes.text', name: 'Lyes', roleKey: 'saasLanding.testimonials.items.lyes.role', color: '#E85D75' },
  { textKey: 'saasLanding.testimonials.items.meriem.text', name: 'Meriem', roleKey: 'saasLanding.testimonials.items.meriem.role', color: '#6366F1' },
  { textKey: 'saasLanding.testimonials.items.sofiane.text', name: 'Sofiane', roleKey: 'saasLanding.testimonials.items.sofiane.role', color: '#1F9D8E' }
]

// ——— Integrations ———
const integrations = [
  { label: 'Stripe', icon: 'lucide:credit-card' },
  { label: 'Maystro', icon: 'lucide:truck' },
  { label: 'Yalidine', icon: 'lucide:package' },
  { label: 'Meta', icon: 'lucide:facebook' },
  { label: 'TikTok', icon: 'lucide:music-2' },
  { label: 'Sheets', icon: 'lucide:sheet' },
  { label: 'Analytics', icon: 'lucide:line-chart' },
  { label: 'OpenAI', icon: 'lucide:sparkles' },
  { label: 'Cloudinary', icon: 'lucide:image' },
  { label: 'WhatsApp', icon: 'lucide:message-circle' },
  { label: 'Zapier', icon: 'lucide:zap' },
  { label: 'API', icon: 'lucide:code-2' }
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
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', applyCursor)
  window.removeEventListener('scroll', onScroll)
  observer?.disconnect()
  storyObserver?.disconnect()
})

const splitChars = (s: string) => Array.from(s)
</script>

<template>
  <div class="edu-landing">

    <!-- Scroll progress -->
    <div class="fixed top-0 inset-x-0 z-[60] h-[3px] bg-transparent pointer-events-none">
      <div class="h-full transition-[width] duration-75" :style="{ width: scrollPct + '%', background: '#0D1F1A' }" />
    </div>

    <!-- ═══════════════ HERO ═══════════════ -->
    <section ref="heroRef" class="edu-hero relative overflow-hidden pt-28 pb-32">
      <!-- Cream paper texture + grain -->
      <div class="edu-grain" aria-hidden="true" />
      <!-- Decorative dots grid -->
      <div class="edu-dots" aria-hidden="true" />

      <!-- Floating stickers (SVG) -->
      <svg class="edu-float edu-float--1" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M50 5 L60 40 L95 50 L60 60 L50 95 L40 60 L5 50 L40 40 Z" fill="#FF7A45" />
      </svg>
      <div class="edu-float edu-float--2">
        <svg viewBox="0 0 120 120" class="w-full h-full" aria-hidden="true">
          <circle cx="60" cy="60" r="55" fill="none" stroke="#0D1F1A" stroke-width="3" stroke-dasharray="6 6" />
          <text x="60" y="66" text-anchor="middle" font-family="Fraunces,serif" font-style="italic" font-size="22" fill="#0D1F1A">new</text>
        </svg>
      </div>
      <div class="edu-float edu-float--3">
        <svg viewBox="0 0 100 100" class="w-full h-full" aria-hidden="true">
          <path d="M20 80 Q50 20, 80 60" stroke="#1F9D8E" stroke-width="4" fill="none" stroke-linecap="round" />
          <polygon points="80,60 72,55 78,48" fill="#1F9D8E" />
        </svg>
      </div>
      <svg class="edu-float edu-float--4" viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="30" fill="#F4C04E" />
      </svg>

      <div class="relative max-w-7xl mx-auto px-6 z-10">
        <!-- Massive headline -->
        <h1 class="edu-headline">
          <span class="edu-line">
            <span
              v-for="(ch, i) in splitChars(t('saasLanding.hero.title.buildSell'))"
              :key="'a'+i"
              class="edu-char"
              :style="{ animationDelay: (i * 28) + 'ms' }"
            >{{ ch === ' ' ? '\u00A0' : ch }}</span>
          </span>
          <br>
          <span class="edu-line edu-line--accent">
            <!-- Highlight marker stroke -->
            <span class="edu-marker" aria-hidden="true" />
            <span
              v-for="(ch, i) in splitChars(t('saasLanding.hero.title.scale'))"
              :key="'b'+i"
              class="edu-char"
              :style="{ animationDelay: (300 + i * 28) + 'ms' }"
            >{{ ch === ' ' ? '\u00A0' : ch }}</span>
            <span class="edu-italic">
              <span
                v-for="(ch, i) in splitChars(' ' + t('saasLanding.hero.italicWord'))"
                :key="'c'+i"
                class="edu-char"
                :style="{ animationDelay: (650 + i * 28) + 'ms' }"
              >{{ ch === ' ' ? '\u00A0' : ch }}</span>
            </span>
            <!-- Underline squiggle -->
            <svg class="edu-squiggle" viewBox="0 0 400 18" aria-hidden="true" preserveAspectRatio="none">
              <path d="M2 12 Q 50 2, 100 10 T 200 10 T 300 10 T 398 10" stroke="#FF7A45" stroke-width="4" fill="none" stroke-linecap="round" />
            </svg>
          </span>
        </h1>

        <!-- Subtitle + CTAs in two-column -->
        <div class="mt-12 grid md:grid-cols-2 gap-10 items-end max-w-5xl">
          <p
            v-motion-slide-visible-once-bottom
            :delay="800"
            class="text-lg md:text-xl text-[#0D1F1A]/70 leading-relaxed"
          >
            {{ t('saasLanding.hero.subtitle') }}
          </p>

          <div
            v-motion-slide-visible-once-bottom
            :delay="900"
            class="flex flex-col sm:flex-row gap-4"
          >
            <NuxtLink to="/register" class="edu-btn edu-btn--primary group">
              <span class="edu-btn__inner">
                {{ t('saasLanding.hero.ctaPrimary') }}
                <Icon name="lucide:arrow-up-right" class="w-5 h-5 transition-transform group-hover:rotate-45" />
              </span>
            </NuxtLink>
            <NuxtLink to="/features" class="edu-btn edu-btn--ghost">
              <Icon name="lucide:play-circle" class="w-5 h-5" />
              {{ t('saasLanding.hero.ctaSecondary') }}
            </NuxtLink>
          </div>
        </div>

        <div
          v-motion-slide-visible-once-bottom
          :delay="980"
          class="edu-trust mt-8"
        >
          <div
            v-for="signal in heroTrustSignals"
            :key="signal.key"
            class="edu-trust-pill"
          >
            <Icon :name="signal.icon" class="w-4 h-4 text-[#F4C04E]" />
            <span>{{ t(`saasLanding.trust.${signal.key}`) }}</span>
          </div>
        </div>

        <!-- Hero visual card -->
        <div
          v-motion-slide-visible-once-bottom
          :delay="1100"
          class="mt-10 md:mt-14 edu-hero-card relative"
        >
          <!-- Rotated sticker badge -->
          <div class="edu-badge edu-badge--hero">
            <svg viewBox="0 0 200 200" class="absolute inset-0 w-full h-full edu-spin" aria-hidden="true">
              <defs>
                <path id="circPath" d="M 100, 100 m -75, 0 a 75,75 0 1,1 150,0 a 75,75 0 1,1 -150,0" />
              </defs>
              <text font-family="Fraunces,serif" font-size="18" font-style="italic" fill="#0D1F1A" letter-spacing="4">
                <textPath href="#circPath">  ◉  launch fast  ◉  sell faster  ◉  scale smart </textPath>
              </text>
            </svg>
            <Icon name="lucide:rocket" class="relative w-10 h-10 text-[#0D1F1A]" />
          </div>

          <img
            src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1800&auto=format&fit=crop"
            alt="Dashboard preview"
            class="w-full h-full object-cover rounded-[40px]"
            loading="lazy"
          />
          <div class="edu-hero-card__chips">
            <div
              v-for="(chip, i) in heroChips"
              :key="chip.key"
              class="edu-chip"
              :style="{ animationDelay: (1200 + i * 120) + 'ms', '--chip-color': chip.color }"
            >
              <Icon :name="chip.icon" class="w-3.5 h-3.5" />
              <span>{{ t(`saasLanding.hero.chips.${chip.key}`) }}</span>
            </div>
          </div>
        </div>

        <!-- Scroll hint -->
        <div class="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#0D1F1A]/40 font-mono text-[10px] tracking-[0.3em] uppercase">
          <span>{{ t('saasLanding.hero.scrollHint') }}</span>
          <div class="edu-scroll-line" />
        </div>
      </div>
    </section>

    <!-- ═══════════════ LOGO TICKER ═══════════════ -->
    <section class="relative overflow-hidden border-y-2 border-[#0D1F1A] bg-[#F1E4CD] py-10">
      <ClientOnly>
        <Vue3Marquee :duration="35" :direction="isRtl ? 'reverse' : 'normal'">
          <div v-for="(intg, i) in [...integrations, ...integrations]" :key="'t'+i" class="flex items-center gap-3 px-8 text-xl font-bold text-[#0D1F1A]">
            <Icon :name="intg.icon" class="w-5 h-5" />
            <span class="font-fraunces italic">{{ intg.label }}</span>
            <span class="edu-ticker-dot" />
          </div>
        </Vue3Marquee>
      </ClientOnly>
    </section>

    <!-- ═══════════════ STORYTELLER ═══════════════ -->
    <section ref="storyRef" class="edu-story relative py-32">
      <div class="max-w-7xl mx-auto px-6">
        <div class="mb-24 max-w-2xl relative">
          <div class="edu-eyebrow mb-6">
            <span class="edu-eyebrow__mark" />
            {{ t('saasLanding.storyteller.eyebrow') }}
          </div>
          <h2 class="edu-h2">
            {{ t('saasLanding.storyteller.title') }}
          </h2>
          <p class="mt-6 text-[#0D1F1A]/60 text-lg leading-relaxed">{{ t('saasLanding.storyteller.subtitle') }}</p>
        </div>

        <div class="grid lg:grid-cols-2 gap-16 relative">
          <!-- Steps -->
          <div class="space-y-[35vh]">
            <div
              v-for="(step, i) in storySteps"
              :key="step.key"
              :data-step="i"
              class="edu-story-step"
              :class="{ 'is-active': storyStep === i }"
            >
              <div class="flex items-center gap-4 mb-5">
                <span class="edu-step-num" :style="{ background: step.color }">
                  {{ t(`saasLanding.storyteller.steps.${step.key}.number`) }}
                </span>
                <span class="font-fraunces italic text-lg text-[#0D1F1A]/60">{{ t(`saasLanding.storyteller.steps.${step.key}.caption`) }}</span>
              </div>
              <h3 class="text-3xl md:text-5xl font-black text-[#0D1F1A] mb-5 leading-[1.05] tracking-tight">
                {{ t(`saasLanding.storyteller.steps.${step.key}.title`) }}
              </h3>
              <p class="text-[#0D1F1A]/60 text-base md:text-lg leading-relaxed max-w-md">
                {{ t(`saasLanding.storyteller.steps.${step.key}.description`) }}
              </p>
            </div>
          </div>

          <!-- Sticky visual -->
          <div class="hidden lg:block relative">
            <div class="sticky top-24 edu-story-visual">
              <div
                v-for="(step, i) in storySteps"
                :key="step.key"
                class="edu-story-card"
                :class="{ 'is-active': storyStep === i }"
                :style="{ background: step.color }"
              >
                <div class="edu-story-card__sticker">{{ step.sticker }}</div>
                <div class="edu-story-card__num">{{ t(`saasLanding.storyteller.steps.${step.key}.number`) }}</div>
                <div class="edu-story-card__title">{{ t(`saasLanding.storyteller.steps.${step.key}.title`) }}</div>
                <div class="edu-story-card__arrow">
                  <svg viewBox="0 0 60 60" class="w-full h-full" aria-hidden="true">
                    <path d="M10 50 Q30 10, 50 30" stroke="#0D1F1A" stroke-width="3" fill="none" stroke-linecap="round" />
                    <polygon points="50,30 42,26 47,19" fill="#0D1F1A" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ STATS ═══════════════ -->
    <section ref="statsSection" class="edu-stats py-24 relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
        <div v-for="(stat, idx) in stats" :key="idx" class="edu-stat">
          <div class="edu-stat__num">
            {{ stat.value.toLocaleString() }}<span class="edu-stat__suffix">{{ stat.suffix }}</span>
          </div>
          <div class="edu-stat__label">{{ t(stat.labelKey) }}</div>
        </div>
      </div>
      <!-- giant decorative text -->
      <div class="edu-stats__watermark" aria-hidden="true">MERCHANTS</div>
    </section>

    <!-- ═══════════════ THEMES (polaroid wall) ═══════════════ -->
    <section class="edu-themes py-32 relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-20">
          <div class="max-w-xl">
            <div class="edu-eyebrow mb-6">
              <span class="edu-eyebrow__mark" />
              {{ t('saasLanding.carousel.eyebrow') }}
            </div>
            <h2 class="edu-h2">{{ t('saasLanding.carousel.title') }}</h2>
            <p class="mt-5 text-[#0D1F1A]/60 text-lg">{{ t('saasLanding.carousel.subtitle') }}</p>
          </div>
          <NuxtLink to="/themes" class="edu-btn edu-btn--dark">
            {{ t('saasLanding.carousel.cta') }}
            <Icon name="lucide:arrow-up-right" class="w-5 h-5" />
          </NuxtLink>
        </div>

        <div class="edu-polaroid-grid">
          <div
            v-for="(th, i) in themes"
            :key="th.name"
            class="edu-polaroid"
            :style="{ '--rot': th.rotate + 'deg', '--tint': th.tint, animationDelay: (i * 90) + 'ms' }"
          >
            <div class="edu-polaroid__inner">
              <img :src="th.img" :alt="th.name" loading="lazy" />
              <div class="edu-polaroid__label">
                <span class="font-fraunces italic text-2xl">{{ th.name }}</span>
                <span class="font-mono text-[10px] tracking-[0.25em] uppercase opacity-60">0{{ i + 1 }}</span>
              </div>
              <div class="edu-polaroid__tape" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ INTEGRATIONS (grid) ═══════════════ -->
    <section class="edu-integrations py-28 relative">
      <div class="max-w-4xl mx-auto px-6 text-center mb-16">
        <div class="edu-eyebrow mb-6 justify-center">
          <span class="edu-eyebrow__mark" />
          Integrations
        </div>
        <h2 class="edu-h2">{{ t('saasLanding.integrations.title') }}</h2>
        <p class="mt-5 text-[#0D1F1A]/60 text-lg">{{ t('saasLanding.integrations.subtitle') }}</p>
      </div>

      <div class="max-w-6xl mx-auto px-6">
        <div class="edu-integration-grid">
          <div
            v-for="(intg, i) in integrations"
            :key="intg.label"
            class="edu-integration-cell"
            :style="{ animationDelay: (i * 60) + 'ms' }"
          >
            <Icon :name="intg.icon" class="w-6 h-6" />
            <span>{{ intg.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ PRICING ═══════════════ -->
    <section class="edu-pricing py-32 relative overflow-hidden">
      <!-- decorative shape -->
      <svg class="absolute -top-20 -right-20 w-[400px] h-[400px] opacity-40" viewBox="0 0 200 200" aria-hidden="true">
        <path fill="#F4C04E" d="M48.8,-62.2C61.3,-54.1,68.1,-37.3,69.8,-21.2C71.5,-5.1,68.1,10.3,60.8,23.8C53.5,37.3,42.2,48.9,28.6,56.4C15,63.9,-0.8,67.3,-15.5,63.5C-30.2,59.7,-43.7,48.8,-53.5,35.2C-63.3,21.5,-69.3,5.2,-67.6,-10.3C-65.9,-25.8,-56.5,-40.5,-43.7,-49C-30.9,-57.5,-14.6,-59.8,2.5,-63.2C19.7,-66.6,36.3,-70.4,48.8,-62.2Z" transform="translate(100 100)" />
      </svg>

      <div class="max-w-7xl mx-auto px-6 relative z-10">
        <div class="text-center mb-16">
          <div class="edu-eyebrow mb-6 justify-center">
            <span class="edu-eyebrow__mark" />
            {{ t('saasLanding.pricingSection.eyebrow') }}
          </div>
          <h2 class="edu-h2">{{ t('pricing.section.title') }}</h2>
          <p class="mt-5 text-[#0D1F1A]/60 text-lg">{{ t('pricing.section.subtitle') }}</p>

          <!-- Toggle -->
          <div class="edu-toggle mt-10 mx-auto">
            <button class="edu-toggle__btn" :class="{ 'is-active': billingCycle === 'month' }" @click="billingCycle = 'month'">
              {{ t('saasLanding.pricingSection.toggle.monthly') }}
            </button>
            <button class="edu-toggle__btn" :class="{ 'is-active': billingCycle === 'year' }" @click="billingCycle = 'year'">
              {{ t('saasLanding.pricingSection.toggle.yearly') }}
              <span class="edu-toggle__badge">−20%</span>
            </button>
            <span class="edu-toggle__pill" :class="{ 'is-right': billingCycle === 'year' }" />
          </div>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div
            v-for="(plan, idx) in pricingPlans"
            :key="plan.code"
            class="edu-plan group"
            :class="plan.popular ? 'edu-plan--popular' : ''"
            :style="{ animationDelay: (idx * 80) + 'ms' }"
          >
            <div v-if="plan.popular" class="edu-plan__badge">
              <Icon name="lucide:star" class="w-3 h-3" />
              {{ t('pricing.badges.mostPopular') }}
            </div>

            <div class="font-mono text-[11px] tracking-[0.3em] uppercase opacity-60 mb-3">{{ plan.name }}</div>
            <div class="flex items-baseline gap-2 mb-1">
              <span class="edu-plan__price">{{ plan.price }}</span>
              <span class="font-mono text-xs opacity-60">{{ plan.currency }}</span>
            </div>
            <div class="text-xs opacity-60 mb-6">{{ plan.period }}</div>

            <p class="text-sm opacity-70 leading-relaxed mb-6 min-h-[3rem]">{{ plan.description }}</p>

            <button class="edu-plan__cta" :class="plan.popular ? 'edu-plan__cta--inverse' : ''">
              {{ plan.cta }}
              <Icon name="lucide:arrow-up-right" class="w-4 h-4 transition-transform group-hover:rotate-45" />
            </button>

            <ul class="space-y-3 mt-6 text-sm">
              <li v-for="(feat, fIdx) in plan.features" :key="fIdx" class="flex items-center gap-2 opacity-80">
                <Icon name="lucide:check-circle-2" class="w-4 h-4 shrink-0" :style="{ color: plan.popular ? '#F4C04E' : '#1F9D8E' }" />
                {{ feat }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ TESTIMONIALS ═══════════════ -->
    <section class="edu-testimonials py-32 relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-6 mb-20 text-center relative">
        <div class="edu-eyebrow mb-6 justify-center">
          <span class="edu-eyebrow__mark" />
          Testimonials
        </div>
        <h2 class="edu-h2 max-w-3xl mx-auto">
          {{ t('saasLanding.testimonials.heading.prefix') }}
          <span class="edu-italic-accent">{{ t('saasLanding.testimonials.heading.accent') }}</span>
          {{ t('saasLanding.testimonials.heading.suffix') }}
        </h2>
      </div>

      <div class="relative mask-horizontal">
        <ClientOnly>
          <Vue3Marquee :duration="50" :pauseOnHover="true" :direction="isRtl ? 'reverse' : 'normal'">
            <div v-for="(ti, i) in testimonials" :key="'t1'+i" class="edu-testi" :style="{ '--card-color': ti.color }">
              <div class="edu-testi__quote">"</div>
              <p class="edu-testi__text">{{ t(ti.textKey) }}</p>
              <div class="edu-testi__footer">
                <div class="edu-testi__avatar" :style="{ background: ti.color }">{{ ti.name.charAt(0) }}</div>
                <div>
                  <div class="font-bold text-[#0D1F1A]">{{ ti.name }}</div>
                  <div class="text-[10px] font-mono uppercase tracking-wider text-[#0D1F1A]/50">{{ t(ti.roleKey) }}</div>
                </div>
              </div>
            </div>
          </Vue3Marquee>
        </ClientOnly>
      </div>
    </section>

    <!-- ═══════════════ FAQ ═══════════════ -->
    <section class="edu-faq py-32 relative">
      <div class="max-w-3xl mx-auto px-6">
        <div class="text-center mb-16">
          <div class="edu-eyebrow mb-6 justify-center">
            <span class="edu-eyebrow__mark" />
            FAQ
          </div>
          <h2 class="edu-h2">{{ t('saasLanding.faq.title') }}</h2>
          <p class="mt-5 text-[#0D1F1A]/60 text-lg">{{ t('saasLanding.faq.subtitle') }}</p>
        </div>

        <div class="space-y-3">
          <div
            v-for="(faq, idx) in faqs"
            :key="idx"
            class="edu-faq-item"
            :class="{ 'is-open': activeFaq === idx }"
          >
            <button class="edu-faq-item__btn" @click="activeFaq = activeFaq === idx ? null : idx">
              <span class="edu-faq-item__q">{{ t(faq.questionKey) }}</span>
              <span class="edu-faq-item__icon">
                <Icon name="lucide:plus" class="w-5 h-5" />
              </span>
            </button>
            <div class="edu-faq-item__body">
              <div class="edu-faq-item__a">{{ t(faq.answerKey) }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ FINALE ═══════════════ -->
    <section ref="finaleRef" class="edu-finale relative overflow-hidden py-40">
      <div class="edu-finale__spotlight" aria-hidden="true" />
      <div class="edu-grain" aria-hidden="true" />

      <!-- Floating sticker -->
      <div class="edu-finale__sticker">
        <svg viewBox="0 0 200 200" class="w-full h-full edu-spin" aria-hidden="true">
          <defs>
            <path id="finPath" d="M 100, 100 m -80, 0 a 80,80 0 1,1 160,0 a 80,80 0 1,1 -160,0" />
          </defs>
          <text font-family="Fraunces,serif" font-size="18" font-style="italic" fill="#0D1F1A" letter-spacing="4">
            <textPath href="#finPath">  ✦  ready? let's go  ✦  ready? let's go </textPath>
          </text>
        </svg>
        <Icon name="lucide:arrow-up-right" class="absolute inset-0 m-auto w-10 h-10 text-[#0D1F1A]" />
      </div>

      <div class="relative max-w-5xl mx-auto px-6 text-center z-10">
        <div class="edu-eyebrow mb-8 justify-center">
          <span class="edu-eyebrow__mark" />
          Let's go
        </div>

        <h2 class="edu-finale__title">
          {{ t('saasLanding.finalCta.title') }}
        </h2>

        <p class="mt-8 text-xl md:text-2xl text-[#0D1F1A]/65 max-w-2xl mx-auto font-light">
          {{ t('saasLanding.finalCta.subtitle') }}
        </p>

        <NuxtLink to="/register" class="edu-btn edu-btn--primary edu-btn--xl mt-14 group">
          <span class="edu-btn__inner">
            {{ t('saasLanding.finalCta.cta') }}
            <Icon name="lucide:arrow-up-right" class="w-6 h-6 transition-transform group-hover:rotate-45" />
          </span>
        </NuxtLink>
      </div>
    </section>

  </div>
</template>

<style scoped>
/* ═══ Import playful fonts (Fraunces italic + Space Grotesk alt = no, using Bricolage for display) ═══ */
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,600&display=swap');

/* ═══ Root ═══ */
.edu-landing {
  --cream: #FFF8E7;
  --cream-dark: #F5EDD3;
  --ink: #0D1F1A;
  --mint: #1F9D8E;
  --orange: #FF7A45;
  --yellow: #F4C04E;
  --pink: #E85D75;
  background: var(--cream);
  color: var(--ink);
  font-family: 'Bricolage Grotesque', 'DM Sans', system-ui, sans-serif;
  font-feature-settings: 'ss01';
  overflow: hidden;
}

.font-fraunces { font-family: 'Fraunces', serif; }

/* ═══ Textures ═══ */
.edu-grain {
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.05 0 0 0 0 0.12 0 0 0 0 0.1 0 0 0 0.18 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.5; pointer-events: none;
}
.edu-grain--dark {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.15 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.6;
}

/* ═══ HERO ═══ */
.edu-hero {
  --mx: 50%; --my: 50%;
  background:
    radial-gradient(ellipse at var(--mx) var(--my), rgba(31,157,142,0.08), transparent 50%),
    var(--cream);
  min-height: 100vh;
}
.edu-dots {
  position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(13,31,26,0.15) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
  pointer-events: none;
  opacity: 0.6;
}

/* Floating decorative stickers */
.edu-float { position: absolute; pointer-events: none; }
.edu-float--1 {
  width: 70px; height: 70px;
  top: 18%; right: 8%;
  animation: floatA 6s ease-in-out infinite;
}
.edu-float--2 {
  width: 110px; height: 110px;
  bottom: 28%; left: 4%;
  animation: floatB 7s ease-in-out infinite;
}
.edu-float--3 {
  width: 90px; height: 90px;
  top: 35%; left: 10%;
  animation: floatA 5s ease-in-out infinite reverse;
}
.edu-float--4 {
  width: 60px; height: 60px;
  bottom: 15%; right: 14%;
  animation: floatB 8s ease-in-out infinite reverse;
}
@keyframes floatA {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(6px, -16px) rotate(8deg); }
}
@keyframes floatB {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(-8px, -12px) rotate(-10deg); }
}

/* Kicker tag */
.edu-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 1rem 0.5rem 0.7rem;
  background: var(--ink);
  color: var(--cream);
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-bottom: 2.5rem;
}
.edu-tag__dot {
  width: 8px; height: 8px; border-radius: 999px;
  background: var(--orange);
  animation: pulse 1.8s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.6; }
}

/* Headline */
.edu-headline {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: clamp(3.4rem, 9vw, 8.5rem);
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: var(--ink);
  font-variation-settings: 'wdth' 96;
}
.edu-line { display: inline-block; position: relative; }
.edu-line--accent { position: relative; display: inline-block; }
.edu-marker {
  position: absolute;
  inset: 8% -2% 12% -2%;
  background: var(--yellow);
  border-radius: 8px;
  z-index: -1;
  transform: rotate(-1deg) scaleX(0);
  transform-origin: left;
  animation: markerIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s forwards;
}
@keyframes markerIn { to { transform: rotate(-1deg) scaleX(1); } }
.edu-italic {
  font-family: 'Fraunces', serif;
  font-weight: 400;
  font-style: italic;
  font-size: 0.9em;
  color: var(--orange);
  font-variation-settings: 'SOFT' 100, 'WONK' 1;
}
.edu-squiggle {
  position: absolute;
  bottom: -18px; left: 0;
  width: 70%; height: 14px;
  stroke-dasharray: 800;
  stroke-dashoffset: 800;
  animation: squiggle 1.4s ease-out 1.2s forwards;
}
@keyframes squiggle { to { stroke-dashoffset: 0; } }
.edu-char {
  display: inline-block;
  opacity: 0;
  transform: translateY(70%) rotate(6deg);
  animation: charIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}
@keyframes charIn { to { opacity: 1; transform: translateY(0) rotate(0); } }

/* Buttons */
.edu-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  padding: 1.05rem 1.9rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: -0.01em;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  border: 2px solid var(--ink);
}
.edu-btn__inner { display: inline-flex; align-items: center; gap: 0.7rem; position: relative; z-index: 1; }
.edu-btn--primary {
  background: var(--ink);
  color: var(--cream);
  box-shadow: 4px 4px 0 var(--orange);
}
.edu-btn--primary:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 var(--orange); }
.edu-btn--primary:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--orange); }
.edu-btn--ghost {
  background: var(--cream);
  color: var(--ink);
  box-shadow: 4px 4px 0 var(--ink);
}
.edu-btn--ghost:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 var(--ink); background: var(--cream-dark); }
.edu-trust {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}
.edu-trust-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 2px solid rgba(13,31,26,0.2);
  background: rgba(255,248,231,0.75);
  color: rgba(13,31,26,0.84);
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  font-size: 0.78rem;
  font-weight: 700;
  backdrop-filter: blur(3px);
}
.edu-btn--dark {
  background: var(--ink);
  color: var(--cream);
  padding: 0.85rem 1.4rem;
  font-size: 0.9rem;
  border-color: var(--ink);
  box-shadow: 3px 3px 0 var(--mint);
}
.edu-btn--dark:hover { transform: translate(-2px, -2px); box-shadow: 5px 5px 0 var(--mint); }
.edu-btn--cream {
  background: var(--cream);
  color: var(--ink);
  box-shadow: 5px 5px 0 var(--orange);
  border-color: var(--cream);
}
.edu-btn--cream:hover { transform: translate(-3px, -3px); box-shadow: 8px 8px 0 var(--orange); }
.edu-btn--xl { padding: 1.3rem 2.6rem; font-size: 1.15rem; }

/* Hero card */
.edu-hero-card {
  aspect-ratio: 16/9;
  max-width: 1100px;
  margin: 0 auto;
  border-radius: 40px;
  overflow: visible;
  box-shadow: 0 30px 80px -20px rgba(13,31,26,0.25), 8px 8px 0 var(--ink);
}
.edu-hero-card img { display: block; }
.edu-hero-card__chips {
  position: absolute;
  bottom: 1.5rem; left: 1.5rem; right: 1.5rem;
  display: flex; flex-wrap: wrap; gap: 0.5rem;
}
.edu-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  background: var(--cream);
  color: var(--ink);
  border: 2px solid var(--ink);
  font-size: 0.78rem;
  font-weight: 700;
  opacity: 0;
  transform: translateY(14px) rotate(-2deg);
  animation: chipIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  transition: transform 0.25s;
}
.edu-chip:hover {
  transform: translateY(-4px) rotate(2deg);
  background: var(--chip-color);
  color: var(--cream);
}
@keyframes chipIn { to { opacity: 1; transform: translateY(0) rotate(0); } }

/* Circular badge */
.edu-badge {
  position: absolute;
  width: 150px; height: 150px;
  border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  z-index: 20;
}
.edu-badge--hero {
  top: -60px; right: -30px;
  background: var(--yellow);
  border: 2px solid var(--ink);
  box-shadow: 5px 5px 0 var(--ink);
}
.edu-spin { animation: spin 18s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Scroll hint */
.edu-scroll-line {
  width: 1px; height: 40px;
  background: linear-gradient(to bottom, transparent, var(--ink), transparent);
  animation: scrollHint 2.5s ease-in-out infinite;
}
@keyframes scrollHint {
  0%, 100% { transform: translateY(-8px); opacity: 0.3; }
  50% { transform: translateY(8px); opacity: 1; }
}

/* Ticker */
.edu-ticker-dot {
  width: 8px; height: 8px; border-radius: 999px;
  background: var(--orange);
  display: inline-block;
  margin-left: 2rem;
}

/* Eyebrows */
.edu-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 1.1rem;
  color: var(--ink);
  font-weight: 500;
}
.edu-eyebrow--light { color: var(--cream); }
.edu-eyebrow__mark {
  width: 24px; height: 2px; background: var(--orange);
  display: inline-block;
}
.edu-eyebrow__mark--light { background: var(--yellow); }

.edu-h2 {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: clamp(2.3rem, 5.5vw, 4.5rem);
  font-weight: 800;
  line-height: 0.98;
  letter-spacing: -0.035em;
  color: var(--ink);
}
.edu-italic-accent {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 400;
  color: var(--orange);
}

/* ═══ Storyteller ═══ */
.edu-story { background: var(--cream); }
.edu-story-step {
  transition: opacity 0.4s ease, transform 0.4s ease;
  opacity: 0.35;
  transform: translateX(-10px);
}
.edu-story-step.is-active { opacity: 1; transform: translateX(0); }
.edu-step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  color: var(--cream);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  border: 2px solid var(--ink);
  box-shadow: 3px 3px 0 var(--ink);
}
.edu-story-visual {
  position: relative;
  aspect-ratio: 4/5;
  max-height: 85vh;
}
.edu-story-card {
  position: absolute;
  inset: 0;
  border-radius: 36px;
  border: 2px solid var(--ink);
  box-shadow: 8px 8px 0 var(--ink);
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  opacity: 0;
  transform: translateY(20px) rotate(-3deg) scale(0.95);
  transition: all 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
  overflow: hidden;
}
.edu-story-card.is-active {
  opacity: 1;
  transform: translateY(0) rotate(0) scale(1);
  z-index: 5;
}
.edu-story-card__sticker {
  font-family: 'Fraunces', serif;
  font-size: 180px;
  line-height: 1;
  align-self: flex-end;
  color: rgba(13,31,26,0.12);
  position: absolute;
  top: 2rem; right: 2rem;
}
.edu-story-card__num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.3em;
  color: var(--ink);
  opacity: 0.6;
}
.edu-story-card__title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: clamp(1.8rem, 2.5vw, 2.6rem);
  font-weight: 800;
  line-height: 1.05;
  color: var(--ink);
  letter-spacing: -0.03em;
  max-width: 80%;
}
.edu-story-card__arrow {
  position: absolute;
  bottom: 2rem; right: 2rem;
  width: 60px; height: 60px;
}

/* ═══ STATS ═══ */
.edu-stats {
  background: linear-gradient(180deg, #FFF2DE 0%, #F5EDD3 100%);
  color: var(--ink);
  border-top: 2px solid rgba(13,31,26,0.14);
  border-bottom: 2px solid rgba(13,31,26,0.14);
}
.edu-stat__num {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: clamp(4rem, 8vw, 7rem);
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: -0.04em;
}
.edu-stat__suffix { color: var(--orange); }
.edu-stat__label {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 1rem;
  margin-top: 0.8rem;
  opacity: 0.68;
}
.edu-stats__watermark {
  position: absolute;
  bottom: -3vw;
  left: 50%; transform: translateX(-50%);
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 24vw;
  font-weight: 800;
  letter-spacing: -0.06em;
  color: rgba(13,31,26,0.06);
  pointer-events: none;
  white-space: nowrap;
  line-height: 0.8;
}

/* ═══ Themes polaroid wall ═══ */
.edu-themes {
  background: var(--cream-dark);
  background-image:
    radial-gradient(circle, rgba(13,31,26,0.08) 1px, transparent 1px);
  background-size: 24px 24px;
}
.edu-polaroid-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 3rem;
  padding: 1rem;
}
.edu-polaroid {
  transform: rotate(var(--rot));
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  opacity: 0;
  animation: polaroidIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}
@keyframes polaroidIn {
  from { opacity: 0; transform: rotate(var(--rot)) translateY(30px); }
  to { opacity: 1; transform: rotate(var(--rot)) translateY(0); }
}
.edu-polaroid:hover { transform: rotate(0) translateY(-10px) scale(1.03); z-index: 10; }
.edu-polaroid__inner {
  position: relative;
  background: var(--cream);
  padding: 1rem 1rem 1.5rem;
  border: 2px solid var(--ink);
  box-shadow: 6px 6px 0 var(--ink);
}
.edu-polaroid__inner img {
  width: 100%;
  aspect-ratio: 4/5;
  object-fit: cover;
  display: block;
  filter: saturate(1.05);
}
.edu-polaroid__label {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 1rem 0.25rem 0;
}
.edu-polaroid__tape {
  position: absolute;
  top: -16px; left: 50%; transform: translateX(-50%) rotate(-3deg);
  width: 80px; height: 24px;
  background: var(--tint);
  opacity: 0.6;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

/* ═══ Integrations grid ═══ */
.edu-integrations {
  background: var(--cream);
  background-image:
    linear-gradient(rgba(13,31,26,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(13,31,26,0.06) 1px, transparent 1px);
  background-size: 48px 48px;
}
.edu-integration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0;
  border: 2px solid var(--ink);
  border-radius: 24px;
  overflow: hidden;
  background: var(--cream);
  box-shadow: 6px 6px 0 var(--ink);
}
.edu-integration-cell {
  padding: 1.8rem 1rem;
  display: flex; flex-direction: column; align-items: center; gap: 0.6rem;
  font-weight: 600;
  color: var(--ink);
  border-right: 1px solid rgba(13,31,26,0.12);
  border-bottom: 1px solid rgba(13,31,26,0.12);
  transition: background 0.25s, transform 0.25s;
  opacity: 0;
  animation: cellIn 0.5s ease-out forwards;
}
@keyframes cellIn { to { opacity: 1; } }
.edu-integration-cell:hover {
  background: var(--yellow);
  transform: scale(1.05);
  z-index: 2;
  position: relative;
}

/* ═══ PRICING ═══ */
.edu-pricing { background: var(--cream); }
.edu-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  background: var(--cream);
  border: 2px solid var(--ink);
  border-radius: 999px;
  padding: 4px;
  box-shadow: 3px 3px 0 var(--ink);
}
.edu-toggle__btn {
  position: relative; z-index: 2;
  padding: 0.6rem 1.4rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink);
  border-radius: 999px;
  display: inline-flex; align-items: center; gap: 0.5rem;
  transition: color 0.3s;
}
.edu-toggle__btn.is-active { color: var(--cream); }
.edu-toggle__pill {
  position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 4px);
  background: var(--ink);
  border-radius: 999px;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
}
.edu-toggle__pill.is-right { transform: translateX(100%); }
.edu-toggle__badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--orange);
  color: var(--cream);
}
[dir="rtl"] .edu-toggle__pill.is-right { transform: translateX(-100%); }

.edu-plan {
  position: relative;
  padding: 2rem;
  border-radius: 28px;
  background: var(--cream);
  color: var(--ink);
  border: 2px solid var(--ink);
  box-shadow: 5px 5px 0 var(--ink);
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s;
}
.edu-plan:hover { transform: translate(-3px, -3px); box-shadow: 8px 8px 0 var(--ink); }
.edu-plan--popular {
  background: var(--ink);
  color: var(--cream);
  box-shadow: 5px 5px 0 var(--orange);
}
.edu-plan--popular:hover { box-shadow: 8px 8px 0 var(--orange); }
.edu-plan__badge {
  position: absolute;
  top: -16px; left: 50%; transform: translateX(-50%) rotate(-3deg);
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  background: var(--yellow);
  color: var(--ink);
  font-size: 0.68rem;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 800;
  border: 2px solid var(--ink);
  box-shadow: 2px 2px 0 var(--ink);
  white-space: nowrap;
}
.edu-plan__price {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 4rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
}
.edu-plan__cta {
  width: 100%;
  padding: 0.85rem 1.25rem;
  border-radius: 999px;
  background: var(--ink);
  color: var(--cream);
  font-weight: 700;
  font-size: 0.9rem;
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  border: 2px solid var(--ink);
  transition: background 0.25s, color 0.25s;
}
.edu-plan__cta:hover { background: var(--orange); border-color: var(--orange); }
.edu-plan__cta--inverse { background: var(--cream); color: var(--ink); border-color: var(--cream); }
.edu-plan__cta--inverse:hover { background: var(--yellow); border-color: var(--yellow); }

/* ═══ Testimonials ═══ */
.edu-testimonials { background: var(--cream-dark); }
.mask-horizontal { mask-image: linear-gradient(to right, transparent, black 6%, black 94%, transparent); }
.edu-testi {
  width: 340px;
  margin: 1rem 1rem;
  padding: 1.75rem;
  background: var(--cream);
  border-radius: 24px;
  border: 2px solid var(--ink);
  box-shadow: 5px 5px 0 var(--card-color);
  transition: transform 0.3s;
}
.edu-testi:hover { transform: translateY(-6px); }
.edu-testi__quote {
  font-family: 'Fraunces', serif;
  font-size: 4rem;
  line-height: 0.6;
  color: var(--card-color);
  font-style: italic;
  margin-bottom: 0.5rem;
}
.edu-testi__text {
  color: var(--ink);
  font-size: 0.95rem;
  line-height: 1.55;
  margin-bottom: 1.3rem;
  font-weight: 500;
}
.edu-testi__footer { display: flex; align-items: center; gap: 0.75rem; }
.edu-testi__avatar {
  width: 40px; height: 40px;
  border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--cream);
  font-weight: 800;
  border: 2px solid var(--ink);
}

/* ═══ FAQ ═══ */
.edu-faq { background: var(--cream); }
.edu-faq-item {
  border: 2px solid var(--ink);
  border-radius: 20px;
  background: var(--cream);
  overflow: hidden;
  transition: box-shadow 0.3s, transform 0.3s;
}
.edu-faq-item:hover { transform: translate(-2px, -2px); box-shadow: 4px 4px 0 var(--ink); }
.edu-faq-item.is-open {
  background: var(--yellow);
  box-shadow: 4px 4px 0 var(--ink);
}
.edu-faq-item__btn {
  width: 100%; padding: 1.5rem 1.75rem;
  display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
  text-align: left;
}
.edu-faq-item__q {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ink);
}
.edu-faq-item__icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 999px;
  background: var(--ink); color: var(--cream);
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.edu-faq-item.is-open .edu-faq-item__icon { transform: rotate(45deg); }
.edu-faq-item__body {
  max-height: 0; overflow: hidden;
  transition: max-height 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.edu-faq-item.is-open .edu-faq-item__body { max-height: 400px; }
.edu-faq-item__a {
  padding: 0 1.75rem 1.5rem;
  color: var(--ink);
  opacity: 0.75;
  line-height: 1.6;
  font-family: 'Fraunces', serif;
  font-size: 1rem;
}

/* ═══ FINALE ═══ */
.edu-finale {
  --mx: 50%; --my: 50%;
  background: linear-gradient(160deg, #FFF4E2 0%, #F5EDD3 100%);
  color: var(--ink);
  border-top: 2px solid rgba(13,31,26,0.14);
}
.edu-finale__spotlight {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(circle 600px at var(--mx) var(--my), rgba(31,157,142,0.12), transparent 70%);
}
.edu-finale__sticker {
  position: absolute;
  top: 10%; right: 8%;
  width: 170px; height: 170px;
}
.edu-finale__title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: clamp(3.2rem, 10vw, 9rem);
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: -0.04em;
  color: var(--ink);
}
.edu-finale__title::after {
  content: '';
  display: block; width: 180px; height: 8px;
  background: var(--orange);
  border-radius: 99px;
  margin: 1rem auto 0;
}

/* ═══ Reduced motion ═══ */
@media (prefers-reduced-motion: reduce) {
  .edu-char, .edu-chip, .edu-float, .edu-spin, .edu-marker, .edu-squiggle, .edu-tag__dot, .edu-scroll-line {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    stroke-dashoffset: 0 !important;
  }
  .edu-hero, .edu-finale__spotlight { background: var(--cream); }
  .edu-finale__spotlight { display: none; }
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .edu-badge--hero { width: 110px; height: 110px; top: -40px; right: -10px; }
  .edu-finale__sticker { width: 110px; height: 110px; top: 6%; right: 5%; }
  .edu-polaroid-grid { gap: 2rem; }
  .edu-integration-cell { padding: 1.2rem 0.8rem; font-size: 0.85rem; }
  .edu-stats__watermark { font-size: 32vw; }
}

/* ═══ RTL tweaks ═══ */
[dir="rtl"] .edu-marker { transform-origin: right; animation-name: markerInRtl; }
@keyframes markerInRtl { to { transform: rotate(1deg) scaleX(1); } }
[dir="rtl"] .edu-badge--hero { right: auto; left: -30px; }
[dir="rtl"] .edu-finale__sticker { right: auto; left: 8%; }
</style>
