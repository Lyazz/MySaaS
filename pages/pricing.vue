<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
  layout: 'marketing',
  title: 'Pricing - MySaaS'
})

const isAnnual = ref(false)

const plans = [
  {
    name: 'Basic',
    price: '0',
    currency: 'DA',
    period: '/month',
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
      { text: 'Orders Syncronization', included: false },
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
    currency: 'DA',
    period: '/month',
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
      { text: 'Orders Syncronization', included: false },
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
    currency: 'DA',
    period: '/month',
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
      { text: 'Orders Syncronization', included: false },
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
    currency: 'DA',
    period: '/month',
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
      { text: 'Orders Syncronization', included: true },
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
  <div class="bg-black min-h-screen text-white font-sans selection:bg-fuchsia-500 selection:text-white">
    <!-- Hero Header -->
    <div class="relative pt-24 pb-16 text-center px-4 overflow-hidden">
       <!-- Background Effects -->
       <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-violet-600/20 blur-[120px] rounded-full pointer-events-none -z-10"></div>
       <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-600/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>
       
       <h1 class="text-4xl md:text-6xl font-black tracking-tight mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
         Simple, transparent pricing
       </h1>
       <p class="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
         Choose the plan that fits your growth stage. No hidden fees.
       </p>
       
       <!-- Toggle (Visual Only for now) -->
       <div class="inline-flex items-center gap-4 bg-slate-900/50 p-1.5 rounded-full border border-slate-800/50 backdrop-blur-sm">
         <button 
           class="px-6 py-2 rounded-full text-sm font-bold transition-all"
           :class="!isAnnual ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25' : 'text-slate-400 hover:text-white'"
           @click="isAnnual = false"
         >
           Monthly
         </button>
         <button 
           class="px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2"
           :class="isAnnual ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25' : 'text-slate-400 hover:text-white'"
           @click="isAnnual = true"
         >
           Annual <span class="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">Save 20%</span>
         </button>
       </div>
    </div>

    <!-- Pricing Grid -->
    <div class="max-w-[1800px] mx-auto px-4 pb-32">
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div 
          v-for="(plan, idx) in plans" 
          :key="idx"
          class="relative flex flex-col p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-2 group"
          :class="[
            plan.popular ? 'bg-slate-900 border-fuchsia-500/50 shadow-2xl shadow-fuchsia-900/20' : 'bg-black border-slate-800 hover:border-slate-700 hover:shadow-xl hover:shadow-violet-900/10',
            plan.highlight ? 'bg-slate-900 border-violet-500/50 shadow-2xl shadow-violet-900/20' : '',
            plan.custom ? 'bg-gradient-to-b from-slate-900 to-violet-950/30 border-slate-800' : ''
          ]"
        >
          <!-- Popular Badge -->
          <div v-if="plan.popular" class="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-fuchsia-500/40">
            Most Popular
          </div>
          
           <!-- Highlight Badge -->
          <div v-if="plan.highlight" class="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-violet-500/40">
            Recommended
          </div>

          <div class="mb-6">
            <h3 class="text-lg font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all">{{ plan.name }}</h3>
            <div class="flex items-baseline gap-1 mb-2">
               <span class="text-3xl font-black" 
                :class="[
                    plan.popular ? 'text-fuchsia-400' : 
                    plan.highlight ? 'text-violet-400' : 'text-white'
                ]"
               >{{ plan.price }}</span>
              <span class="text-xs text-slate-400 font-bold ml-1">{{ plan.currency }}</span>
              <span class="text-xs text-slate-500">{{ plan.period }}</span>
            </div>
            <p class="text-xs text-slate-400 leading-relaxed min-h-[40px]">{{ plan.description }}</p>
          </div>

          <ul class="space-y-3 mb-8 flex-1">
            <li v-for="(feat, fIdx) in plan.features" :key="fIdx" class="flex items-start gap-3 text-xs">
              <div class="flex-shrink-0 mt-0.5" :class="feat.included ? (plan.popular ? 'text-fuchsia-500' : (plan.highlight ? 'text-violet-500' : 'text-white')) : 'text-slate-800'">
                 <svg v-if="feat.included" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                 <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </div>
              <span :class="feat.included ? 'text-slate-300' : 'text-slate-700 line-through decoration-slate-800'">
                {{ feat.text }}
              </span>
            </li>
          </ul>

          <button 
            class="w-full py-3 rounded-xl text-sm font-bold transition-all shadow-lg"
            :class="[
              plan.highlight ? 'bg-violet-600 text-white hover:bg-violet-500 hover:shadow-violet-500/25' : 
              plan.popular ? 'bg-white text-slate-900 hover:bg-slate-200 hover:shadow-fuchsia-500/10' : 
              'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            ]"
          >
            {{ plan.cta }}
          </button>
        </div>
      </div>
    </div>
    
  </div>
</template>
