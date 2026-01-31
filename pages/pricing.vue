<script setup lang="ts">
import { computed, ref } from 'vue'
import { PRICING_PLANS, pricingPlanCardForUi } from '~/shared/pricing/plans'

definePageMeta({
  layout: 'marketing',
  title: 'Pricing - Swekly'
})

const isAnnual = ref(false)

const plans = computed(() => {
  return PRICING_PLANS.map((plan) => {
    const monthly = pricingPlanCardForUi(plan, 'month')
    const annual = pricingPlanCardForUi(plan, 'year')

    return {
      code: plan.code,
      name: plan.name,
      description: plan.description,
      price: monthly.priceText,
      priceAnnual: annual.priceText,
      currency: monthly.currency,
      period: monthly.periodText,
      features: monthly.features,
      cta: monthly.cta,
      popular: monthly.popular,
      highlight: monthly.highlight
    }
  })
})
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
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          v-for="(plan, idx) in plans" 
          :key="idx"
          class="relative flex flex-col p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-2 group bg-white shadow-sm hover:shadow-2xl"
          :class="[
            plan.popular ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-xl shadow-teal-900/5 z-10 scale-[1.02] md:scale-105 xl:scale-100 xl:hover:scale-105' : 'border-slate-200 hover:border-teal-200',
            plan.highlight ? 'border-indigo-500/50 hover:border-indigo-400' : ''
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
              class="text-lg font-bold mb-2 transition-colors text-slate-900 group-hover:text-teal-600"
            >
              {{ plan.name }}
            </h3>
            <div class="flex items-baseline gap-1 mb-2 h-9">
               <span 
                 class="text-3xl font-black tracking-tight" 
                 :class="[
                     plan.popular ? 'text-teal-600' : 
                     plan.highlight ? 'text-indigo-600' : 'text-slate-900'
                 ]"
               >
                <template v-if="isAnnual">
                  {{ plan.priceAnnual }}
                </template>
                <template v-else>
                  {{ plan.price }}
                </template>
               </span>
              <span class="text-xs font-bold ml-1 uppercase text-slate-500">{{ plan.currency }}</span>
              <span class="text-xs text-slate-400">{{ plan.period }}</span>
            </div>
            <p class="text-xs leading-relaxed min-h-[40px] text-slate-500">{{ plan.description }}</p>
          </div>

          <div class="w-full h-px mb-6 bg-slate-100"></div>

          <ul class="space-y-3 mb-8 flex-1">
            <li v-for="(feat, fIdx) in plan.features" :key="fIdx" class="flex items-start gap-3 text-xs">
              <div class="flex-shrink-0 mt-0.5" 
                :class="[
                  feat.included 
                    ? (plan.popular ? 'text-teal-500' : (plan.highlight ? 'text-indigo-500' : 'text-teal-600')) 
                    : 'text-slate-300'
                ]"
              >
                 <Icon v-if="feat.included" name="lucide:check" class="w-4 h-4" />
                 <Icon v-else name="lucide:x" class="w-4 h-4" />
              </div>
              <span :class="[
                feat.included ? 'text-slate-600' : 'text-slate-400 line-through decoration-slate-200',
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
