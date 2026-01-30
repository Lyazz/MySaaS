<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
  layout: 'marketing',
  title: 'Pricing - Swekly'
})

const isAnnual = ref(false)

const plans = [
  {
    name: 'Basic',
    price: '0',
    priceAnnual: '0',
    currency: 'DA',
    period: '/mo',
    description: 'Best for trying out',
    features: [
      { text: '12 DA / Orders', included: true },
      { text: '6 DA / Abandoned Orders', included: true },
      { text: '2 Facebook pixels', included: true },
      { text: '2 TikTok pixels', included: true },
      { text: '1 Google sheet account', included: true },
      { text: '0 Conversions API token', included: false },
      { text: '0 TikTok events API token', included: false },
      { text: 'Custom domain', included: false },
      { text: '0 Workers', included: false },
      { text: 'Orders Synchronization', included: false },
      { text: 'Show the ad company of each order', included: false },
      { text: 'Hide Hanotify logo from your store', included: false },
      { text: 'Send automatic SMS after ordering', included: false },
    ],
    cta: 'Get Started',
    popular: false
  },
  {
    name: 'Beginner',
    price: '1,490',
    priceAnnual: '1,190',
    currency: 'DA',
    period: '/mo',
    description: 'A simple start to boost your store',
    features: [
      { text: '300 Orders', included: true },
      { text: '100 Abandoned Orders', included: true },
      { text: '2 Facebook pixels', included: true },
      { text: '2 TikTok pixels', included: true },
      { text: '1 Google sheet account', included: true },
      { text: '1 Conversions API token', included: true },
      { text: '1 TikTok events API token', included: true },
      { text: 'Custom domain', included: true },
      { text: '0 Workers', included: false },
      { text: 'Orders Synchronization', included: false },
      { text: 'Show the ad company of each order', included: false },
      { text: 'Hide Hanotify logo from your store', included: false },
      { text: 'Send automatic SMS after ordering', included: false },
    ],
    cta: 'Get Started',
    popular: false
  },
  {
    name: 'Merchant',
    price: '2,990',
    priceAnnual: '2,390',
    currency: 'DA',
    period: '/mo',
    description: 'Smart choice for growing businesses',
    features: [
      { text: '800 Orders', included: true },
      { text: '300 Abandoned Orders', included: true },
      { text: '4 Facebook pixels', included: true },
      { text: '4 TikTok pixels', included: true },
      { text: '2 Google sheet account', included: true },
      { text: '2 Conversions API token', included: true },
      { text: '2 TikTok events API token', included: true },
      { text: 'Custom domain', included: true },
      { text: '1 Workers', included: true },
      { text: 'Orders Synchronization', included: false },
      { text: 'Show the ad company of each order', included: false },
      { text: 'Hide Hanotify logo from your store', included: false },
      { text: 'Send automatic SMS after ordering', included: false },
    ],
    cta: 'Get Started',
    popular: true
  },
  {
    name: 'Professional',
    price: '4,490',
    priceAnnual: '3,590',
    currency: 'DA',
    period: '/mo',
    description: 'Built for scaling with confidence',
    features: [
      { text: '2000 Orders', included: true },
      { text: '600 Abandoned Orders', included: true },
      { text: 'Infinite Facebook pixels', included: true },
      { text: 'Infinite TikTok pixels', included: true },
      { text: '4 Google sheet account', included: true },
      { text: '4 Conversions API token', included: true },
      { text: '4 TikTok events API token', included: true },
      { text: 'Custom domain', included: true },
      { text: '2 Workers', included: true },
      { text: 'Orders Synchronization', included: true },
      { text: 'Show the ad company of each order', included: true },
      { text: 'Hide Hanotify logo from your store', included: true },
      { text: 'Send automatic SMS after ordering', included: true },
    ],
    cta: 'Get 15 days for free',
    popular: false,
    highlight: true
  },
  {
    name: 'On Demand',
    price: 'Custom',
    priceAnnual: 'Custom',
    currency: '',
    period: '',
    description: 'For high-volume sellers needing bespoke solutions.',
    features: [
      { text: 'Everything in Professional', included: true },
      { text: 'Unlimited Orders', included: true },
      { text: 'Dedicated Success Manager', included: true },
      { text: 'Custom API Integrations', included: true },
      { text: 'Priority 24/7 Support', included: true },
      { text: 'SLA Guarantees', included: true },
    ],
    cta: 'Contact Sales',
    popular: false,
    custom: true
  }
]
</script>

<template>
  <div class="bg-slate-50 min-h-screen text-slate-800 font-sans selection:bg-teal-500 selection:text-white">
    <!-- Hero Header -->
    <div class="relative pt-32 pb-24 text-center px-4 overflow-hidden bg-slate-950 text-white clip-path-hero">
       <!-- Background Effects -->
       <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-teal-600/20 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse-slow"></div>
       <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>
       <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none"></div>
       
       <h1 class="text-4xl md:text-6xl font-black tracking-tight mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
         Simple, transparent pricing
       </h1>
       <p class="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
         Choose the plan that fits your growth stage. No hidden fees.
       </p>
       
       <!-- Toggle -->
       <div class="inline-flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-full border border-slate-800 backdrop-blur-sm shadow-xl relative z-10">
         <button 
           class="px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 relative z-10"
           :class="!isAnnual ? 'text-white shadow-lg shadow-teal-500/20' : 'text-slate-400 hover:text-white'"
           @click="isAnnual = false"
         >
           Monthly
           <div v-if="!isAnnual" class="absolute inset-0 bg-teal-600 rounded-full -z-10 layout-id-monthly"></div>
         </button>
         <button 
           class="px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 relative z-10"
           :class="isAnnual ? 'text-white' : 'text-slate-400 hover:text-white'"
           @click="isAnnual = true"
         >
           Annual <span class="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide border border-emerald-500/20">Save 20%</span>
           <div v-if="isAnnual" class="absolute inset-0 bg-teal-600 rounded-full -z-10 layout-id-annual shadow-lg shadow-teal-500/20"></div>
         </button>
       </div>
    </div>

    <!-- Pricing Grid -->
    <div class="max-w-[1400px] mx-auto px-4 -mt-16 pb-32 relative z-10">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <div 
          v-for="(plan, idx) in plans" 
          :key="idx"
          class="relative flex flex-col p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-2 group bg-white shadow-sm hover:shadow-2xl"
          :class="[
            plan.popular ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-xl shadow-teal-900/5 z-10 scale-[1.02] md:scale-105 xl:scale-100 xl:hover:scale-105' : 'border-slate-200 hover:border-teal-200',
            plan.highlight ? 'border-indigo-500/50 hover:border-indigo-400' : '',
            plan.custom ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-800 hover:shadow-slate-900/20' : ''
          ]"
        >
          <!-- Popular Badge -->
          <div v-if="plan.popular" class="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-teal-500/30 whitespace-nowrap">
            Most Popular
          </div>
          
           <!-- Highlight Badge -->
          <div v-if="plan.highlight" class="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/30 whitespace-nowrap">
            Recommended
          </div>

          <div class="mb-6">
            <h3 
              class="text-lg font-bold mb-2 transition-colors"
              :class="plan.custom ? 'text-white' : 'text-slate-900 group-hover:text-teal-600'"
            >
              {{ plan.name }}
            </h3>
            <div class="flex items-baseline gap-1 mb-2 h-9">
               <span 
                 class="text-3xl font-black tracking-tight" 
                 :class="[
                     plan.popular ? 'text-teal-600' : 
                     plan.highlight ? 'text-indigo-600' : 
                     plan.custom ? 'text-white' : 'text-slate-900'
                 ]"
               >
                <template v-if="isAnnual && !plan.custom">
                  {{ plan.priceAnnual }}
                </template>
                <template v-else>
                  {{ plan.price }}
                </template>
               </span>
              <span class="text-xs font-bold ml-1 uppercase" :class="plan.custom ? 'text-slate-400' : 'text-slate-500'">{{ plan.currency }}</span>
              <span class="text-xs" :class="plan.custom ? 'text-slate-500' : 'text-slate-400'">{{ plan.period }}</span>
            </div>
            <p class="text-xs leading-relaxed min-h-[40px]" :class="plan.custom ? 'text-slate-400' : 'text-slate-500'">{{ plan.description }}</p>
          </div>

          <div class="w-full h-px mb-6" :class="plan.custom ? 'bg-slate-700' : 'bg-slate-100'"></div>

          <ul class="space-y-3 mb-8 flex-1">
            <li v-for="(feat, fIdx) in plan.features" :key="fIdx" class="flex items-start gap-3 text-xs">
              <div class="flex-shrink-0 mt-0.5" 
                :class="[
                  feat.included 
                    ? (plan.popular ? 'text-teal-500' : (plan.highlight ? 'text-indigo-500' : (plan.custom ? 'text-teal-400' : 'text-teal-600'))) 
                    : (plan.custom ? 'text-slate-700' : 'text-slate-300')
                ]"
              >
                 <Icon v-if="feat.included" name="lucide:check" class="w-4 h-4" />
                 <Icon v-else name="lucide:x" class="w-4 h-4" />
              </div>
              <span :class="[
                feat.included ? (plan.custom ? 'text-slate-300' : 'text-slate-600') : (plan.custom ? 'text-slate-600 line-through decoration-slate-700' : 'text-slate-400 line-through decoration-slate-200'),
                'leading-relaxed'
              ]">
                {{ feat.text }}
              </span>
            </li>
          </ul>

          <button 
            class="w-full py-3 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
            :class="[
              plan.highlight ? 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-indigo-500/25 shadow-indigo-200' : 
              plan.popular ? 'bg-teal-600 text-white hover:bg-teal-500 hover:shadow-teal-500/25 shadow-teal-200' : 
              plan.custom ? 'bg-white text-slate-900 hover:bg-slate-200' :
              'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg'
            ]"
          >
            {{ plan.cta }}
          </button>
        </div>
      </div>
    </div>
    
  </div>
</template>

<style scoped>
.animate-pulse-slow {
  animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.15; }
}

.clip-path-hero {
  clip-path: polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%);
}

/* Fallback for browsers without clip-path if needed, or remove clip-path if it breaks content flow at the bottom too much */
.clip-path-hero {
    clip-path: none; /* Resetting clip-path as it might cut off content on smaller screens improperly or need careful tweaking. Using simpler bottom border for now. */
    border-bottom-left-radius: 2.5rem;
    border-bottom-right-radius: 2.5rem;
}
</style>
