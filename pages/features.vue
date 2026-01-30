<script setup lang="ts">
definePageMeta({
  layout: 'marketing',
  title: 'Features - Swekly'
})

const features = [
  {
    title: 'Drag & Drop Store Builder',
    description: 'Create professional, responsive storefronts without writing a single line of code. Our intuitive builder lets you customize every pixel.',
    icon: 'lucide:layout-template',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426&ixlib=rb-4.0.3',
    colSpan: 'lg:col-span-2 row-span-2',
    color: 'teal'
  },
  {
    title: 'Global Payments',
    description: 'Accept payments from anywhere with integrated gateways including Stripe, PayPal, and local providers.',
    icon: 'lucide:credit-card',
    colSpan: 'lg:col-span-1',
    color: 'emerald'
  },
  {
    title: 'Advanced Analytics',
    description: 'Track real-time sales, visitor behavior, and conversion funnels.',
    icon: 'lucide:bar-chart-3',
    colSpan: 'lg:col-span-1',
    color: 'amber'
  },
  {
    title: 'Marketing Automation',
    description: 'Recover abandoned carts and engage customers with SMS and Email workflows.',
    icon: 'lucide:mail',
    colSpan: 'lg:col-span-1',
    color: 'violet'
  },
  {
    title: 'Logistics Network',
    description: 'Auto-dispatch orders to Yalidine, Eckoz, and 50+ other carriers.',
    icon: 'lucide:truck',
    colSpan: 'lg:col-span-2',
    color: 'blue'
  },
    {
    title: 'Custom Domains',
    description: 'Connect your own domain name for a fully branded experience.',
    icon: 'lucide:globe',
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
       <div class="absolute -top-40 -right-40 w-96 h-96 bg-teal-600/30 rounded-full blur-[100px]"></div>
       
       <div class="relative z-10 max-w-3xl mx-auto">
         <h1 class="text-4xl md:text-5xl font-black mb-6">Everything you need to <span class="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Scale</span></h1>
         <p class="text-slate-400 text-lg">Swekly is more than just a store builder. It's an entire operating system for your commerce business.</p>
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
              'from-teal-500 to-emerald-600': feat.color === 'teal',
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
                    'bg-teal-600': feat.color === 'teal',
                    'bg-emerald-500': feat.color === 'emerald',
                    'bg-amber-500': feat.color === 'amber',
                    'bg-violet-600': feat.color === 'violet',
                    'bg-blue-500': feat.color === 'blue',
                    'bg-rose-500': feat.color === 'rose',
                 }"
            >
              <Icon :name="feat.icon" class="w-6 h-6" />
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
            <Icon name="lucide:arrow-right" class="w-4 h-4" />
         </NuxtLink>
       </div>
    </section>
  </div>
</template>
