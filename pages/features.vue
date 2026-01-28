<script setup lang="ts">
definePageMeta({
  layout: 'marketing',
  title: 'Features - MySaaS'
})

const features = [
  {
    title: 'Drag & Drop Store Builder',
    description: 'Create professional, responsive storefronts without writing a single line of code. Our intuitive builder lets you customize every pixel.',
    icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426&ixlib=rb-4.0.3',
    colSpan: 'lg:col-span-2 row-span-2',
    color: 'indigo'
  },
  {
    title: 'Global Payments',
    description: 'Accept payments from anywhere with integrated gateways including Stripe, PayPal, and local providers.',
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    colSpan: 'lg:col-span-1',
    color: 'emerald'
  },
  {
    title: 'Advanced Analytics',
    description: 'Track real-time sales, visitor behavior, and conversion funnels.',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    colSpan: 'lg:col-span-1',
    color: 'amber'
  },
  {
    title: 'Marketing Automation',
    description: 'Recover abandoned carts and engage customers with SMS and Email workflows.',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    colSpan: 'lg:col-span-1',
    color: 'violet'
  },
  {
    title: 'Logistics Network',
    description: 'Auto-dispatch orders to Yalidine, Eckoz, and 50+ other carriers.',
    icon: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0',
    colSpan: 'lg:col-span-2',
    color: 'blue'
  },
    {
    title: 'Custom Domains',
    description: 'Connect your own domain name for a fully branded experience.',
    icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
    colSpan: 'lg:col-span-1',
    color: 'rose'
  }
]
</script>

<template>
  <div class="bg-slate-50 min-h-screen font-sans">
    <!-- Header -->
    <div class="bg-slate-900 pt-24 pb-20 text-center px-4 relative overflow-hidden text-white">
       <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
       <div class="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-[100px]"></div>
       
       <div class="relative z-10 max-w-3xl mx-auto">
         <h1 class="text-4xl md:text-5xl font-black mb-6">Everything you need to <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Scale</span></h1>
         <p class="text-slate-400 text-lg">MySaaS is more than just a store builder. It's an entire operating system for your commerce business.</p>
       </div>
    </div>

    <!-- Features Grid -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 -mt-10 relative z-20">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)]">
        
        <div 
          v-for="(feat, idx) in features" 
          :key="idx" 
          class="group relative bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden hover:-translate-y-1 transition-all duration-300"
          :class="feat.colSpan"
        >
          <!-- Hover Gradient -->
          <div class="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500" 
            :class="{
              'from-indigo-500 to-purple-600': feat.color === 'indigo',
              'from-emerald-500 to-teal-600': feat.color === 'emerald',
              'from-amber-500 to-orange-600': feat.color === 'amber',
              'from-violet-500 to-fuchsia-600': feat.color === 'violet',
              'from-blue-500 to-cyan-600': feat.color === 'blue',
              'from-rose-500 to-pink-600': feat.color === 'rose',
            }"
          />

          <div class="relative z-10 flex flex-col h-full">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-6 text-white transition-transform group-hover:scale-110 duration-300 shadow-lg"
                 :class="{
                    'bg-indigo-600': feat.color === 'indigo',
                    'bg-emerald-500': feat.color === 'emerald',
                    'bg-amber-500': feat.color === 'amber',
                    'bg-violet-600': feat.color === 'violet',
                    'bg-blue-500': feat.color === 'blue',
                    'bg-rose-500': feat.color === 'rose',
                 }"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="feat.icon"/></svg>
            </div>
            
            <h3 class="text-2xl font-bold text-slate-900 mb-3">{{ feat.title }}</h3>
            <p class="text-slate-500 leading-relaxed max-w-md">{{ feat.description }}</p>
            
            <div class="flex-1"></div>
            
            <!-- Image for large tiles -->
            <div v-if="feat.image" class="mt-8 rounded-xl overflow-hidden shadow-lg border border-slate-100 group-hover:shadow-2xl transition-all">
               <img :src="feat.image" class="w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-700">
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- CTA -->
    <section class="py-24 text-center">
       <div class="max-w-2xl mx-auto px-4">
         <h2 class="text-3xl font-bold text-slate-900 mb-6">Ready to get started?</h2>
         <NuxtLink to="/register" class="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-bold rounded-xl shadow-xl hover:bg-slate-800 transition-all hover:scale-105">
           Start Your Free Trial
           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
         </NuxtLink>
       </div>
    </section>
  </div>
</template>
