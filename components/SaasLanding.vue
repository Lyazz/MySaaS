<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Vue3Marquee } from 'vue3-marquee'

useSeoMeta({
  title: 'MySaaS - The Future of Commerce',
  description: 'The all-in-one platform to build, sell, and scale your B2B or B2C business with enterprise-grade tools.',
})

// --- Stats Data ---
const stats = ref([
  { label: 'Active Merchants', value: 0, target: 1200, suffix: '+' },
  { label: 'Revenue Generated', value: 0, target: 50, suffix: 'M+' }, // Example: 50M+
  { label: 'Uptime', value: 0, target: 99, suffix: '.9%' }
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

// --- Features (Bento Grid) ---
const features = [
  {
    title: 'Store Builder',
    description: 'Drag-and-drop editor to create stunning storefronts in minutes.',
    icon: 'lucide:layout-template',
    colSpan: 'md:col-span-2', // Wide tile
    bgClass: 'bg-gradient-to-br from-teal-500/10 to-teal-600/5',
    borderClass: 'border-teal-500/20'
  },
  {
    title: 'Global Payments',
    description: 'Accept payments from anywhere with integrated gateways.',
    icon: 'lucide:credit-card',
    colSpan: 'md:col-span-1',
    bgClass: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5',
    borderClass: 'border-emerald-500/20'
  },
  {
    title: 'Analytics & Insights',
    description: 'Real-time data to optimize your conversion rates.',
    icon: 'lucide:bar-chart-3',
    colSpan: 'md:col-span-1',
    bgClass: 'bg-gradient-to-br from-amber-500/10 to-amber-600/5',
    borderClass: 'border-amber-500/20'
  },
  {
    title: 'Automated Shipping',
    description: 'Connect with Yalidine, Eckoz, and more for auto-dispatching.',
    icon: 'lucide:truck',
    colSpan: 'md:col-span-2',
    bgClass: 'bg-gradient-to-br from-blue-500/10 to-blue-600/5',
    borderClass: 'border-blue-500/20'
  }
]

// --- Pricing (Preserved but styled) ---
const pricingPlans = [
  {
    name: 'Starter',
    price: 'Free',
    currency: '',
    period: 'forever',
    description: 'Perfect for testing the waters.',
    features: ['10 Orders/mo', 'Basic Analytics', 'Community Support'],
    cta: 'Start Free',
    popular: false
  },
  {
    name: 'Merchant',
    price: '2,990',
    currency: 'DA',
    period: '/mo',
    description: 'Everything you need to grow.',
    features: ['Unlimited Orders', 'Priority Support', 'Custom Domain', 'Delivery Integrations'],
    cta: 'Get Started',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    currency: '',
    period: '',
    description: 'For large volume sellers.',
    features: ['Dedicated Account Manager', 'Custom API Access', 'SSO & Advanced Security'],
    cta: 'Contact Sales',
    popular: false
  }
]

// --- FAQ ---
const activeFaq = ref<number | null>(null)
const faqs = [
  { question: 'Do I need a credit card to start?', answer: 'No, our Starter plan is completely free and requires no payment information.' },
  { question: 'Can I use my own domain?', answer: 'Yes, both Merchant and Enterprise plans allow full custom domain mapping.' },
  { question: 'Is my data secure?', answer: 'We use enterprise-grade encryption and daily backups to ensure your business data is safe.' }
]


const testimonials = [
  { text: "I switched from Shopify and never looked back. The page load speeds are instant and my conversion rate went up 40% overnight.", name: "Sarah Jenkins", role: "CEO, FashionNova", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d" },
  { text: "The analytics dashboard is beautiful. Whatever data I need is just one click away. It feels like this tool was made for 2026.", name: "Karim Ziad", role: "Founder, TechShop", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d" },
  { text: "Finally, a platform that doesn't charge ridiculous transaction fees. The custom domain support is seamless.", name: "Emily Chen", role: "CTO, GreenEarth", avatar: "https://i.pravatar.cc/150?u=a04258114e29026302d" },
  { text: "The best decision we made for our business. Support is incredible and the features are exactly what we needed.", name: "Michael Ross", role: "COO, GearUp", avatar: "https://i.pravatar.cc/150?u=4" },
  { text: "Scaling to 10k orders a month was a breeze. No downtime, no issues. Highly recommended.", name: "Lisa Wong", role: "Owner, Kicks", avatar: "https://i.pravatar.cc/150?u=5" },
  { text: "The drag and drop builder is actually usable. I built my store in an afternoon.", name: "David Miller", role: "Founder, ArtSpace", avatar: "https://i.pravatar.cc/150?u=6" }
]

onMounted(() => {
  const observerCallback = (entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (entry.target === statsSection.value) startCounter()
        entry.target.classList.add('is-visible')
      }
    })
  }
  
  const observer = new IntersectionObserver(observerCallback, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' })
  
  if (statsSection.value) observer.observe(statsSection.value)
  document.querySelectorAll('.reveal-item').forEach(el => observer.observe(el))
})
</script>

<template>
  <div class="bg-slate-50 font-sans text-slate-900 selection:bg-teal-500 selection:text-white overflow-hidden">
    
    <!-- HERO SECTION -->
    <section class="relative min-h-screen flex items-center justify-center pt-20 pb-32 overflow-hidden bg-slate-950 text-white">
      <!-- Animated Background Mesh -->
      <div class="absolute inset-0 overflow-hidden">
        <div class="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] bg-teal-600/20 rounded-full blur-[120px] animate-blob mix-blend-screen" />
        <div class="absolute top-[20%] -right-[10%] w-[60%] h-[60%] bg-emerald-600/20 rounded-full blur-[120px] animate-blob animation-delay-2000 mix-blend-screen" />
        <div class="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-screen" />
        <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center z-10">
        <!-- Badge -->


        <!-- Headline -->
        <h1 class="reveal-item mt-8 text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-slate-400 leading-[1.1]">
          Build. Sell. <br class="md:hidden" />
          <span class="text-teal-400 inline-block relative">
            Scale.
            <svg class="absolute w-full h-3 -bottom-1 left-0 text-teal-500 opacity-60" viewBox="0 0 200 9" fill="none"><path d="M2.00025 6.99997C2.00025 6.99997 101.996 0.999999 198.001 2.99997" stroke="currentColor" stroke-width="3"/></svg>
          </span>
        </h1>

        <!-- Subhead -->
        <p class="reveal-item max-w-2xl text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
          The all-in-one platform engineered for modern commerce. Focus on your product, we handle the infrastructure, payments, and logistics.
        </p>

        <!-- CTA Buttons -->
        <div class="reveal-item flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <NuxtLink to="/register" class="group relative px-8 py-4 bg-teal-600 rounded-xl font-bold text-white shadow-xl shadow-teal-600/20 overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-teal-600/40">
            <div class="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-600 opacity-100 group-hover:opacity-90 transition-opacity" />
            <span class="relative flex items-center justify-center gap-2">
              Start Building Free
              <Icon name="lucide:arrow-right" class="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </span>
          </NuxtLink>
          
          <button class="px-8 py-4 rounded-xl font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white transition-all hover:-translate-y-1">
            Watch Demo
          </button>
        </div>

        <!-- Dashboard Preview (Floating/Glassmorphism) -->
        <div class="reveal-item mt-20 p-2 rounded-2xl bg-gradient-to-b from-slate-700/20 to-slate-800/20 border border-slate-700/40 backdrop-blur-sm shadow-2xl shadow-teal-500/10 max-w-6xl w-full rotate-x">
          <div class="rounded-xl overflow-hidden bg-slate-900 border border-slate-800 relative aspect-[16/9] group">
            <div class="absolute inset-0 bg-gradient-to-tr from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-slate-600 font-medium">[ Dashboard Preview Animation / Video Placeholder ]</span>
            </div>
            <!-- Interactive Dots mock -->
            <div class="absolute top-4 left-4 flex gap-2">
              <div class="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
              <div class="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
              <div class="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
            </div>
          </div>
        </div>
      </div>
    </section>



    <!-- FEATURES (BENTO GRID) -->
    <section class="py-24 md:py-32 bg-slate-50 relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-20">
          <h2 class="reveal-item text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Everything you need to <span class="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">dominate</span></h2>
          <p class="reveal-item text-lg text-slate-500 max-w-2xl mx-auto">Powerful tools designed for growth, packaged in a beautiful interface.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]">
          <div 
            v-for="(feature, idx) in features" 
            :key="idx"
            class="reveal-item group relative rounded-3xl p-8 border hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
            :class="[feature.colSpan, feature.bgClass, feature.borderClass]"
            :style="{ transitionDelay: `${idx * 100}ms` }"
          >
            <div class="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity transform group-hover:scale-110 duration-500">
               <Icon :name="feature.icon" class="w-32 h-32 text-current" />
            </div>
            
            <div class="relative z-10">
              <div class="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 text-teal-600">
                <Icon :name="feature.icon" class="w-6 h-6" />
              </div>
              <h3 class="text-2xl font-bold text-slate-900 mb-3">{{ feature.title }}</h3>
              <p class="text-slate-600 font-medium leading-relaxed">{{ feature.description }}</p>
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
           <div class="text-slate-400 font-medium uppercase tracking-wider text-sm">{{ stat.label }}</div>
         </div>
       </div>
    </section>

    <!-- PRICING -->
    <section class="py-24 bg-white relative">
       <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div class="text-center mb-16">
            <h2 class="text-4xl font-bold text-slate-900 mb-4">Transparent Pricing</h2>
            <p class="text-slate-500">No hidden fees. Scale as you grow.</p>
         </div>

         <div class="grid md:grid-cols-3 gap-8">
           <div 
             v-for="(plan, idx) in pricingPlans" 
             :key="idx" 
             class="group relative rounded-3xl p-8 border transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
             :class="plan.popular ? 'bg-slate-900 text-white border-slate-900 ring-4 ring-teal-500/20' : 'bg-white text-slate-900 border-slate-200 hover:border-teal-100'"
           >
             <div v-if="plan.popular" class="absolute -top-4 left-1/2 -translate-x-1/2 bg-teal-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
               Most Popular
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
             Loved by <br>
             <span class="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">Founders</span> like you.
           </h2>
           <p class="text-lg text-slate-500 max-w-md mx-auto lg:mx-0 mb-8">
             Join thousands of merchants who have switched to a platform built for growth, speed, and reliability.
           </p>
           <div class="flex items-center justify-center lg:justify-start gap-2">
              <div class="flex -space-x-4">
                 <img class="w-12 h-12 rounded-full border-4 border-slate-50" src="https://i.pravatar.cc/150?u=1" alt="Avatar">
                 <img class="w-12 h-12 rounded-full border-4 border-slate-50" src="https://i.pravatar.cc/150?u=2" alt="Avatar">
                 <img class="w-12 h-12 rounded-full border-4 border-slate-50" src="https://i.pravatar.cc/150?u=3" alt="Avatar">
                 <div class="w-12 h-12 rounded-full border-4 border-slate-50 bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">+500</div>
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
                  <p class="text-slate-700 leading-relaxed mb-4 font-medium text-sm">"{{ testi.text }}"</p>
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                      <img :src="testi.avatar" alt="User" class="w-full h-full object-cover">
                    </div>
                    <div>
                      <div class="font-bold text-slate-900 text-sm">{{ testi.name }}</div>
                      <div class="text-xs text-slate-500 font-bold uppercase">{{ testi.role }}</div>
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
                    <p class="text-slate-700 leading-relaxed mb-4 font-medium text-sm">"{{ testi.text }}"</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                      <img :src="testi.avatar" alt="User" class="w-full h-full object-cover">
                    </div>
                    <div>
                      <div class="font-bold text-slate-900 text-sm">{{ testi.name }}</div>
                      <div class="text-xs text-slate-500 font-bold uppercase">{{ testi.role }}</div>
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
          <h2 class="text-3xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
          <p class="text-slate-500">Everything you need to know about the product and billing.</p>
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
              <span class="text-lg font-semibold text-slate-800">{{ faq.question }}</span>
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
              {{ faq.answer }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FINAL CTA -->
    <section class="py-32 bg-slate-900 relative overflow-hidden text-center px-4">
      <div class="relative z-10 max-w-4xl mx-auto">
        <h2 class="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">Ready to launch?</h2>
        <p class="text-xl text-teal-200 mb-10">Join the platform that grows with you.</p>
        <NuxtLink to="/register" class="inline-flex px-10 py-5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-full text-lg shadow-lg shadow-teal-900/20 transition-all hover:scale-105">
          Get Started Now
        </NuxtLink>
      </div>
      <!-- Decorative BG -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-600/20 rounded-full blur-[120px]" />
    </section>

  </div>
</template>

<style scoped>
/* Keyframes & Utility Animations */
.animate-blob {
  animation: blob 10s infinite alternate;
}
.animation-delay-2000 { animation-delay: 2s; }
.animation-delay-4000 { animation-delay: 4s; }

@keyframes blob {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(20px, -20px) scale(1.1); }
  100% { transform: translate(-20px, 20px) scale(0.9); }
}

.reveal-item {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.reveal-item.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* 3D tilt effect attempt for dashboard */
.rotate-x {
  transform: perspective(1000px) rotateX(2deg) rotateY(0deg) scale(0.95);
  transition: transform 0.5s ease;
}
.rotate-x:hover {
  transform: perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1);
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
