<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { Vue3Marquee } from 'vue3-marquee'
import { PRICING_PLANS, pricingPlanCardForUi } from '~/shared/pricing/plans'

const { t } = useI18n({ useScope: 'global' })

useSeoMeta({
  title: computed(() => t('saasLanding.seo.title')),
  description: computed(() => t('saasLanding.seo.description'))
})

// --- Stats Data ---
const stats = ref([
  { labelKey: 'saasLanding.stats.activeMerchants', value: 0, target: 1200, suffix: '+' },
  { labelKey: 'saasLanding.stats.revenueGenerated', value: 0, target: 50, suffix: 'M+' }, // Example: 50M+
  { labelKey: 'saasLanding.stats.uptime', value: 0, target: 99, suffix: '.9%' }
])

const statsSection = ref<HTMLElement | null>(null)
let hasAnimated = false

const startCounter = () => {
  if (hasAnimated) return
  hasAnimated = true
  
  stats.value.forEach(stat => {
    const duration = 2500
    const start = 0
    const end = stat.target
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 4) // Ease out quart
      
      stat.value = Math.floor(start + (end - start) * ease)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        stat.value = end
      }
    }
    requestAnimationFrame(animate)
  })
}

// Remove manual observer setup


// --- Features (Bento Grid) ---
const features = [
  {
    titleKey: 'saasLanding.features.items.aiTools.title',
    descriptionKey: 'saasLanding.features.items.aiTools.description',
    icon: 'lucide:sparkles',
    colSpan: 'md:col-span-2', // Wide tile
    bgClass: 'bg-gradient-to-br from-teal-500/10 to-teal-600/5',
    borderClass: 'border-teal-500/20'
  },
  {
    titleKey: 'saasLanding.features.items.competitivePricing.title',
    descriptionKey: 'saasLanding.features.items.competitivePricing.description',
    icon: 'lucide:coins',
    colSpan: 'md:col-span-1',
    bgClass: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5',
    borderClass: 'border-emerald-500/20'
  },
  {
    titleKey: 'saasLanding.features.items.templates.title',
    descriptionKey: 'saasLanding.features.items.templates.description',
    icon: 'lucide:layout-template',
    colSpan: 'md:col-span-1',
    bgClass: 'bg-gradient-to-br from-amber-500/10 to-amber-600/5',
    borderClass: 'border-amber-500/20'
  },
  {
    titleKey: 'saasLanding.features.items.fastSupport.title',
    descriptionKey: 'saasLanding.features.items.fastSupport.description',
    icon: 'lucide:headset',
    colSpan: 'md:col-span-2',
    bgClass: 'bg-gradient-to-br from-blue-500/10 to-blue-600/5',
    borderClass: 'border-blue-500/20'
  }
]

// --- Pricing ---
const pricingPlans = computed(() => {
  return PRICING_PLANS.map((plan) => {
    const card = pricingPlanCardForUi(plan, 'month')
    return {
      code: plan.code,
      name: t(`pricing.plans.${plan.code}.name`),
      price: card.priceText,
      currency: card.currency,
      period: t('pricing.period.perMonth'),
      description: t(`pricing.plans.${plan.code}.description`),
      features: [t('pricing.features.ordersPerMonth', { count: plan.ordersPerMonth })],
      cta: t(`pricing.plans.${plan.code}.cta`),
      popular: card.popular
    }
  })
})

// --- FAQ ---
const activeFaq = ref<number | null>(null)
const faqs = [
  { questionKey: 'saasLanding.faq.items.noCard.question', answerKey: 'saasLanding.faq.items.noCard.answer' },
  { questionKey: 'saasLanding.faq.items.changePlan.question', answerKey: 'saasLanding.faq.items.changePlan.answer' },
  { questionKey: 'saasLanding.faq.items.planDifferences.question', answerKey: 'saasLanding.faq.items.planDifferences.answer' }
]


const testimonials = [
  { textKey: 'saasLanding.testimonials.items.nassim.text', name: 'Nassim', roleKey: 'saasLanding.testimonials.items.nassim.role' },
  { textKey: 'saasLanding.testimonials.items.amina.text', name: 'Amina', roleKey: 'saasLanding.testimonials.items.amina.role' },
  { textKey: 'saasLanding.testimonials.items.yanis.text', name: 'Yanis', roleKey: 'saasLanding.testimonials.items.yanis.role' },
  { textKey: 'saasLanding.testimonials.items.lyes.text', name: 'Lyes', roleKey: 'saasLanding.testimonials.items.lyes.role' },
  { textKey: 'saasLanding.testimonials.items.meriem.text', name: 'Meriem', roleKey: 'saasLanding.testimonials.items.meriem.role' },
  { textKey: 'saasLanding.testimonials.items.sofiane.text', name: 'Sofiane', roleKey: 'saasLanding.testimonials.items.sofiane.role' }
]

onMounted(() => {
  const observerCallback = (entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.target === statsSection.value) {
        startCounter()
        // Disconnect after triggering once
        if (observer) observer.disconnect()
      }
    })
  }
  
  const observer = new IntersectionObserver(observerCallback, { threshold: 0.15 })
  
  if (statsSection.value) observer.observe(statsSection.value)
})
</script>

<template>
  <div class="bg-slate-50 font-sans text-slate-900 selection:bg-teal-500 selection:text-white overflow-hidden">
    
    <!-- HERO SECTION -->
    <section class="relative min-h-screen flex items-center justify-center pt-20 pb-32 overflow-hidden bg-slate-950 text-white">
      <!-- Static Background Mesh -->
      <div class="absolute inset-0 overflow-hidden bg-slate-950">
        <div class="absolute top-0 right-0 w-1/2 h-1/2 bg-teal-900/10 rounded-full blur-[100px]" />
        <div class="absolute bottom-0 left-0 w-1/2 h-1/2 bg-emerald-900/10 rounded-full blur-[100px]" />
      </div>

      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center z-10">
        <!-- Badge -->


        <!-- Headline -->
        <h1 
          v-motion-slide-visible-once-bottom
          class="mt-8 text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-slate-400 leading-[1.1]"
        >
          {{ t('saasLanding.hero.title.buildSell') }} <br class="md:hidden" />
          <span class="text-teal-400 inline-block relative">
            {{ t('saasLanding.hero.title.scale') }}
            <svg class="absolute w-full h-3 -bottom-1 left-0 text-teal-500 opacity-60" viewBox="0 0 200 9" fill="none"><path d="M2.00025 6.99997C2.00025 6.99997 101.996 0.999999 198.001 2.99997" stroke="currentColor" stroke-width="3"/></svg>
          </span>
        </h1>

        <!-- Subhead -->
        <p 
          v-motion-slide-visible-once-bottom
          :delay="200"
          class="max-w-2xl text-lg md:text-xl text-slate-400 mb-10 leading-relaxed"
        >
          {{ t('saasLanding.hero.subtitle') }}
        </p>

        <!-- CTA Buttons -->
        <div 
          v-motion-slide-visible-once-bottom
          :delay="300"
          class="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
        >
          <NuxtLink to="/register" class="group relative px-8 py-4 bg-teal-600 rounded-xl font-bold text-white shadow-xl shadow-teal-600/20 overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-teal-600/40">
            <div class="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-600 opacity-100 group-hover:opacity-90 transition-opacity" />
            <span class="relative flex items-center justify-center gap-2">
              {{ t('saasLanding.hero.ctaPrimary') }}
              <Icon name="lucide:arrow-right" class="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </span>
          </NuxtLink>
          
          <button class="px-8 py-4 rounded-xl font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white transition-all hover:-translate-y-1">
            {{ t('saasLanding.hero.ctaSecondary') }}
          </button>
        </div>

        <!-- Dashboard Preview -->
        <div 
          v-motion-slide-visible-once-bottom
          :delay="400"
          class="mt-20 p-2 rounded-2xl bg-slate-800/50 border border-slate-700/40 shadow-xl max-w-6xl w-full"
        >
          <div class="rounded-xl overflow-hidden bg-slate-900 border border-slate-800 relative aspect-[16/9]">
            <img 
              class="absolute inset-0 w-full h-full object-cover" 
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop"
              alt="Dashboard Preview"
            />
            <div class="absolute inset-0 bg-slate-900/10 pointer-events-none z-10" />
            <!-- Browser Dots mock -->
            <div class="absolute top-4 left-4 flex gap-2 z-20">
              <div class="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
              <div class="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
              <div class="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
            </div>
          </div>
        </div>

        <!-- Trust Indicators -->
        <div 
          v-motion-slide-visible-once-bottom
          :delay="500"
          class="mt-16 flex flex-wrap justify-center items-center gap-8 md:gap-16 text-slate-400 font-medium text-sm"
        >
          <div class="flex items-center gap-2"><Icon name="lucide:shield-check" class="w-5 h-5 text-teal-500" />{{ t('saasLanding.trust.secure') }}</div>
          <div class="flex items-center gap-2"><Icon name="lucide:lock" class="w-5 h-5 text-teal-500" />{{ t('saasLanding.trust.ssl') }}</div>
          <div class="flex items-center gap-2"><Icon name="lucide:cloud" class="w-5 h-5 text-teal-500" />{{ t('saasLanding.trust.cloud') }}</div>
        </div>
      </div>
    </section>



    <!-- FEATURES (BENTO GRID) -->
    <section class="py-24 md:py-32 bg-slate-50 relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-20">
          <h2 
            v-motion-slide-visible-once-bottom
            class="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight"
          >
            {{ t('saasLanding.features.title.prefix') }}
            <span class="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
              {{ t('saasLanding.features.title.accent') }}
            </span>
          </h2>
          <p 
            v-motion-slide-visible-once-bottom
            :delay="100"
            class="text-lg text-slate-500 max-w-2xl mx-auto"
          >
            {{ t('saasLanding.features.subtitle') }}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]">
          <div 
            v-for="(feature, idx) in features" 
            :key="idx"
            class="group relative rounded-3xl p-8 border hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
            :class="[feature.colSpan, feature.bgClass, feature.borderClass]"
            v-motion-slide-visible-once-bottom
            :delay="idx * 100"
          >
            <div class="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity transform group-hover:scale-110 duration-500">
               <Icon :name="feature.icon" class="w-32 h-32 text-current" />
            </div>
            
            <div class="relative z-10">
              <div class="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 text-teal-600">
                <Icon :name="feature.icon" class="w-6 h-6" />
              </div>
              <h3 class="text-2xl font-bold text-slate-900 mb-3">{{ t(feature.titleKey) }}</h3>
              <p class="text-slate-600 font-medium leading-relaxed">{{ t(feature.descriptionKey) }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- STATS INTERLUDE -->
    <section ref="statsSection" class="py-20 bg-slate-900 text-white relative">
       <div class="absolute inset-0 bg-teal-600/10 pattern-grid-lg opacity-20" />
       <div class="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
         <div v-for="(stat, idx) in stats" :key="idx" class="text-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
           <div class="text-5xl lg:text-6xl font-black mb-2 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent tracking-tighter">
             {{ stat.value.toLocaleString() }}<span class="text-teal-400 text-4xl align-top">{{ stat.suffix }}</span>
           </div>
           <div class="text-slate-400 font-medium uppercase tracking-wider text-sm">{{ t(stat.labelKey) }}</div>
         </div>
       </div>
    </section>

    <!-- INTEGRATIONS MARQUEE -->
    <section class="py-24 bg-white border-b border-slate-100 overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 mb-12 text-center">
        <h2 class="text-3xl font-bold text-slate-900 mb-4">{{ t('saasLanding.integrations.title') }}</h2>
        <p class="text-slate-500 max-w-2xl mx-auto">{{ t('saasLanding.integrations.subtitle') }}</p>
      </div>
      <div class="relative flex w-full flex-col gap-6 mask-horizontal">
        <ClientOnly>
          <!-- Marquee 1 (Left) -->
          <Vue3Marquee :duration="40" class="flex gap-8 overflow-hidden hover-slow">
            <div v-for="i in 2" :key="'m1-'+i" class="flex items-center gap-6 shrink-0 px-3">
              <div class="w-40 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold hover:bg-slate-100 hover:text-slate-600 transition-colors shadow-sm">Meta/Tiktok Pixels</div>
              <div class="w-40 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold hover:bg-slate-100 hover:text-slate-600 transition-colors shadow-sm">APIs</div>
              <div class="w-40 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold hover:bg-slate-100 hover:text-slate-600 transition-colors shadow-sm">Google Sheet</div>
              <div class="w-40 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold hover:bg-slate-100 hover:text-slate-600 transition-colors shadow-sm">Realtime notifications</div>
              <div class="w-40 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold hover:bg-slate-100 hover:text-slate-600 transition-colors shadow-sm">Image generation</div>
            </div>
          </Vue3Marquee>
          <!-- Marquee 2 (Right) -->
          <Vue3Marquee :duration="45" direction="reverse" class="flex gap-8 overflow-hidden hover-slow">
            <div v-for="i in 2" :key="'m2-'+i" class="flex items-center gap-6 shrink-0 px-3">
               <div class="w-40 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold hover:bg-slate-100 hover:text-slate-600 transition-colors shadow-sm">DZ Delivery Companies</div>
               <div class="w-40 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold hover:bg-slate-100 hover:text-slate-600 transition-colors shadow-sm">Google Analytics</div>
               <div class="w-40 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold hover:bg-slate-100 hover:text-slate-600 transition-colors shadow-sm">Artificial Intelligence</div>
               <div class="w-40 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold hover:bg-slate-100 hover:text-slate-600 transition-colors shadow-sm">Quick Support</div>
            </div>
          </Vue3Marquee>
        </ClientOnly>
      </div>
    </section>

    <!-- THEMES & MOBILE SHOWCASE -->
    <section class="py-24 bg-slate-50 overflow-hidden relative">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-16 items-center">
          
          <!-- Text Content -->
          <div>
            <h2 class="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              {{ t('saasLanding.themes.title.prefix') }}
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">{{ t('saasLanding.themes.title.accent') }}</span>
            </h2>
            <p class="text-lg text-slate-600 mb-8 leading-relaxed">
              {{ t('saasLanding.themes.subtitle') }}
            </p>
            <NuxtLink to="/themes" class="inline-flex items-center gap-2 font-bold text-teal-600 hover:text-teal-700 transition-colors group">
              {{ t('saasLanding.themes.viewAll') }}
              <Icon name="lucide:arrow-right" class="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </NuxtLink>
          </div>

          <!-- Visuals (Mobile Mockup + Desktop Float) -->
          <div class="relative h-[600px] w-full mt-12 lg:mt-0 flex justify-center lg:justify-end">
             <!-- Desktop App Float -->
             <div class="absolute top-20 right-10 w-[600px] h-[350px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden hidden md:block z-0 group hover:-translate-y-2 transition-transform duration-500 hover:shadow-3xl">
                <div class="h-8 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2">
                   <div class="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                   <div class="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                   <div class="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                </div>
                <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2400&auto=format&fit=crop" class="w-full h-full object-cover" alt="Desktop Theme" />
             </div>
             
             <!-- Mobile Phone Mockup -->
             <div class="absolute top-10 left-10 lg:left-0 md:-ml-10 w-[280px] h-[580px] bg-slate-900 rounded-[3rem] shadow-2xl border-[8px] border-slate-900 overflow-hidden z-10 shadow-teal-900/20 group hover:-translate-y-2 transition-transform duration-500">
               <!-- Dynamic Island -->
               <div class="absolute top-0 inset-x-0 w-32 h-6 bg-slate-900 mx-auto rounded-b-3xl z-20"></div>
               <img src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop" class="w-full h-full object-cover" alt="Mobile Theme" />
             </div>
          </div>
        </div>
      </div>
    </section>

    <!-- PRICING -->
    <section class="py-24 bg-white relative">
       <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div class="text-center mb-16">
            <h2 class="text-4xl font-bold text-slate-900 mb-4">{{ t('pricing.section.title') }}</h2>
            <p class="text-slate-500">{{ t('pricing.section.subtitle') }}</p>
         </div>

         <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
           <div 
             v-for="(plan, idx) in pricingPlans" 
             :key="idx" 
             class="group relative rounded-3xl p-8 border transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
             :class="plan.popular ? 'bg-slate-900 text-white border-slate-900 ring-4 ring-teal-500/20' : 'bg-white text-slate-900 border-slate-200 hover:border-teal-100'"
           >
             <div v-if="plan.popular" class="absolute -top-4 left-1/2 -translate-x-1/2 bg-teal-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
               {{ t('pricing.badges.mostPopular') }}
             </div>

             <h3 class="text-xl font-bold mb-2">{{ plan.name }}</h3>
             <div class="mb-6 flex items-baseline gap-1">
               <span class="text-4xl font-black">{{ plan.currency }} {{ plan.price }}</span>
               <span class="text-sm opacity-60 font-medium" v-if="plan.period">{{ plan.period }}</span>
             </div>
             
             <p class="mb-8 text-sm opacity-70 leading-relaxed">{{ plan.description }}</p>
             
             <button 
               class="w-full py-3 rounded-xl font-bold mb-8 transition-all"
               :class="plan.popular ? 'bg-teal-600 hover:bg-teal-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'"
             >
               {{ plan.cta }}
             </button>

             <ul class="space-y-4 text-sm font-medium">
               <li v-for="(feat, fIdx) in plan.features" :key="fIdx" class="flex items-center gap-3">
                  <Icon name="lucide:check" class="w-5 h-5 flex-shrink-0" :class="plan.popular ? 'text-teal-400' : 'text-teal-600'" />
                 <span class="opacity-80">{{ feat }}</span>
               </li>
             </ul>
           </div>
         </div>
       </div>
    </section>

    <!-- TESTIMONIALS -->
    <section class="py-24 bg-slate-50 border-t border-slate-200 overflow-hidden relative">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        <!-- Left Side: Heading -->
        <div class="text-center lg:text-left mb-12 lg:mb-0">
           <h2 class="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
             {{ t('saasLanding.testimonials.heading.prefix') }} <br>
             <span class="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">{{ t('saasLanding.testimonials.heading.accent') }}</span> {{ t('saasLanding.testimonials.heading.suffix') }}
           </h2>
           <p class="text-lg text-slate-500 max-w-md mx-auto lg:mx-0 mb-8">
             {{ t('saasLanding.testimonials.subtitle') }}
           </p>
           <div class="flex items-center justify-center lg:justify-start gap-2">
              <div class="flex -space-x-4">
                 <div class="w-12 h-12 rounded-full border-4 border-slate-50 bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-800">NS</div>
                 <div class="w-12 h-12 rounded-full border-4 border-slate-50 bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-800">DC</div>
                 <div class="w-12 h-12 rounded-full border-4 border-slate-50 bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-800">TA</div>
                 <div class="w-12 h-12 rounded-full border-4 border-slate-50 bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">+50</div>
              </div>
           </div>
        </div>

        <!-- Right Side: Vertical Marquee (Desktop) -->
        <div class="hidden lg:block relative h-[600px] overflow-hidden mask-vertical">
           <div class="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-50 to-transparent z-10 pointer-events-none" />
           <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-50 to-transparent z-10 pointer-events-none" />
           
           <ClientOnly>
             <Vue3Marquee :vertical="true" :duration="40" :pauseOnHover="false" class="h-full py-4 slow-on-hover">
               <div v-for="(testi, i) in testimonials" :key="i" class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mx-auto my-3 w-full max-w-md">
                  <div class="flex gap-1 text-amber-400 mb-4">
                    <span v-for="n in 5" :key="n" class="w-3 h-3">★</span>
                  </div>
                  <p class="text-slate-700 leading-relaxed mb-4 font-medium text-sm">"{{ t(testi.textKey) }}"</p>
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold overflow-hidden">
                      {{ testi.name.charAt(0) }}
                    </div>
                    <div>
                      <div class="font-bold text-slate-900 text-sm">{{ testi.name }}</div>
                      <div class="text-xs text-slate-500 font-bold uppercase">{{ t(testi.roleKey) }}</div>
                    </div>
                  </div>
               </div>
             </Vue3Marquee>
           </ClientOnly>
        </div>

        <!-- Mobile Marquee (Horizontal) -->
        <div class="block lg:hidden w-full lg:col-span-2 mt-8">
           <ClientOnly>
             <Vue3Marquee :duration="40" :pauseOnHover="false" class="slow-on-hover">
               <div v-for="(testi, i) in testimonials" :key="i" class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mx-3 w-[320px] h-[240px] flex flex-col justify-between">
                  <div>
                    <div class="flex gap-1 text-amber-400 mb-4">
                      <span v-for="n in 5" :key="n" class="w-3 h-3">★</span>
                    </div>
                    <p class="text-slate-700 leading-relaxed mb-4 font-medium text-sm">"{{ t(testi.textKey) }}"</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold overflow-hidden">
                      {{ testi.name.charAt(0) }}
                    </div>
                    <div>
                      <div class="font-bold text-slate-900 text-sm">{{ testi.name }}</div>
                      <div class="text-xs text-slate-500 font-bold uppercase">{{ t(testi.roleKey) }}</div>
                    </div>
                  </div>
               </div>
             </Vue3Marquee>
           </ClientOnly>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="py-24 bg-white">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-bold text-slate-900 mb-4">{{ t('saasLanding.faq.title') }}</h2>
          <p class="text-slate-500">{{ t('saasLanding.faq.subtitle') }}</p>
        </div>
        
        <div class="space-y-4">
          <div 
             v-for="(faq, idx) in faqs" 
             :key="idx" 
             class="border border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-white transition-all duration-300 hover:shadow-md"
          >
            <button 
              @click="activeFaq = activeFaq === idx ? null : idx" 
              class="w-full flex items-center justify-between p-6 text-left focus:outline-none"
            >
              <span class="text-lg font-semibold text-slate-800">{{ t(faq.questionKey) }}</span>
              <span 
                class="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 transition-transform duration-300"
                :class="{'rotate-180 bg-teal-50 text-teal-600 border-teal-100': activeFaq === idx}"
              >
                <Icon name="lucide:chevron-down" class="w-4 h-4" />
              </span>
            </button>
            <div 
              v-show="activeFaq === idx" 
              class="px-6 pb-6 text-slate-600 leading-relaxed border-t border-slate-100 pt-4 animate-fadeIn"
            >
              {{ t(faq.answerKey) }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FINAL CTA -->
    <section class="py-32 bg-slate-900 relative overflow-hidden text-center px-4">
      <div class="relative z-10 max-w-4xl mx-auto">
        <h2 class="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">{{ t('saasLanding.finalCta.title') }}</h2>
        <p class="text-xl text-teal-200 mb-10">{{ t('saasLanding.finalCta.subtitle') }}</p>
        <NuxtLink to="/register" class="inline-flex px-10 py-5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-full text-lg shadow-lg shadow-teal-900/20 transition-all hover:scale-105">
          {{ t('saasLanding.finalCta.cta') }}
        </NuxtLink>
      </div>
      <!-- Decorative BG -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-900/30 rounded-full blur-[80px]" />
    </section>

  </div>
</template>

<style scoped>
/* Utility Animations */
.mask-horizontal {
  mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
}

.hover-slow:hover :deep(.vue3-marquee > .marquee) {
  animation-duration: 200s !important;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}

/* Background patterns */
.pattern-grid-lg {
  background-image: linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px);
  background-size: 40px 40px;
}

/* Use :deep to access the library's internal animation element */
/* By increasing duration significantly, we effectively 'slow down' the animation */
.slow-on-hover:hover :deep(.vue3-marquee > .marquee) {
  animation-duration: 200s !important;
}

/* Fallback/Alternative selector if library structure differs */
.slow-on-hover:hover :deep(div[style*="animation"]) {
  animation-duration: 200s !important;
}
</style>
