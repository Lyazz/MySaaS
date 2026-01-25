<script setup lang="ts">
import { ref } from 'vue'

useSeoMeta({
  title: 'MySaaS - The all-in-one platform to build, sell, and scale',
  description: 'Create your online store, manage orders, and scale your business with MySaaS. The best platform for your online business.',
})

const features = [
  {
    title: 'Modern Store Design',
    description: 'Showcase your brand with sleek, professional storefronts and product pages that leave a lasting impression.',
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
  },
  {
    title: 'Social Ads Integration',
    description: 'Connect seamlessly with Instagram, Facebook, and TikTok ads (pixels & API) to grow your reach.',
    icon: 'M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11'
  },
  {
    title: 'Unified Dashboard',
    description: 'Manage products, sales, and orders all from one simple platform.',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
  },
  {
    title: 'Delivery Integration',
    description: 'Send orders instantly to Algerian delivery companies (Yalidine, Eckoz, etc.) with automatic tracking.',
    icon: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0'
  },
  {
    title: 'Fraud Protection',
    description: 'Detects and blocks fake or invalid orders before they impact your business.',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
  },
  {
    title: 'Custom OTP',
    description: 'Secure your orders with custom SMS verification (OTP) to reduce returns.',
    icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z'
  }
]

const pricingPlans = [
  {
    name: 'Basic',
    price: '0',
    currency: 'DA',
    period: '/month',
    description: 'Best for trying out',
    features: [
      '12 DA / Orders',
      '6 DA / Abandoned Orders',
      '2 Facebook pixels',
      '2 TikTok pixels',
      '1 Google sheet account',
      'Orders Syncronization'
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
      '300 Orders',
      '100 Abandoned Orders',
      '2 Facebook pixels',
      '2 TikTok pixels',
      '1 Google sheet account',
      '1 Conversions API token',
      'Custom domain'
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
      '800 Orders',
      '300 Abandoned Orders',
      '4 Facebook pixels',
      '4 TikTok pixels',
      '2 Google sheet account',
      '2 Conversions API token',
      '1 Workers'
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
      '2000 Orders',
      '600 Abandoned Orders',
      'Infinite Facebook pixels',
      '4 Google sheet account',
      '4 Conversions API token',
      'Custom domain',
      '2 Workers',
      'Send automatic SMS'
    ],
    cta: 'Get Started',
    popular: false
  }
]

const testimonials = [
  {
    name: 'Ahmed Benali',
    role: 'Store Owner',
    company: 'Mode DZ',
    content: "MySaaS completely changed how I manage my business. The delivery integration saved me hours every day!",
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed'
  },
  {
    name: 'Sarah K.',
    role: 'Founder',
    company: 'Beauty Box',
    content: "The fraud protection is a lifesaver. I used to lose money on fake orders, but now I can focus on real customers.",
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
  },
  {
    name: 'Karim Z.',
    role: 'CEO',
    company: 'Tech Store',
    content: "Setting up my store took less than 10 minutes. The pricing is unbeatable for the features you get.",
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Karim'
  },
  {
    name: 'Amine M.',
    role: 'Manager',
    company: 'Electro Shop',
    content: "Managing my inventory has never been easier. The dashboard is intuitive and powerful.",
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amine'
  },
  {
    name: 'Nadia B.',
    role: 'Owner',
    company: 'Caftan Luxe',
    content: "My sales increased by 50% thanks to the Facebook pixel integration. Highly recommended!",
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nadia'
  },
  {
    name: 'Yacine T.',
    role: 'Founder',
    company: 'Burger Express',
    content: "The custom OTP feature reduced my fake orders to almost zero. Great support team too.",
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yacine'
  }
]

const marqueeContainer = ref<HTMLElement | null>(null)

const setPlaybackSpeed = (speed: number) => {
  if (marqueeContainer.value) {
    marqueeContainer.value.getAnimations().forEach((anim) => {
      anim.playbackRate = speed
    })
  }
}
</script>

<template>
  <div class="overflow-x-hidden">
    <!-- Hero Section -->
    <section class="relative pt-20 pb-32 lg:pt-32 overflow-hidden">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-white -z-10"></div>
      <div class="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl animate-blob"></div>
      <div class="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-violet-200/30 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
      
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div class="text-center max-w-4xl mx-auto">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-indigo-100 shadow-sm mb-8 animate-fadeIn">
            <span class="flex h-2 w-2 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span class="text-sm font-medium text-slate-600">New features available</span>
          </div>
          
          <h1 class="text-5xl md:text-7xl font-display font-bold text-slate-900 tracking-tight mb-8 animate-slideUp">
            The all-in-one platform to
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 animate-gradient-x">build, sell, and scale.</span>
          </h1>
          
          <p class="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed animate-slideUp flex-delay-100">
            Create online store. Customize and play with your store. Optimize your products page. Manage your orders.
          </p>
          
          <div class="flex flex-col sm:flex-row gap-4 justify-center animate-slideUp flex-delay-200">
            <NuxtLink to="/register" class="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-1">
              Start for Free
            </NuxtLink>
            <NuxtLink to="/pricing" class="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-xl text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all duration-300 hover:-translate-y-1">
              View Pricing
            </NuxtLink>
          </div>
        </div>

        <!-- Dashboard Mockup (Same as before) -->
        <div class="mt-20 relative mx-auto max-w-5xl animate-slideUp flex-delay-300">
          <div class="relative rounded-2xl border border-slate-200 bg-white/50 backdrop-blur-xl shadow-2xl overflow-hidden group">
            <div class="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
             <!-- Mock UI Header -->
            <div class="h-10 border-b border-slate-100 bg-white/80 flex items-center px-4 gap-2">
              <div class="flex gap-1.5">
                <div class="w-3 h-3 rounded-full bg-red-400/80"></div>
                <div class="w-3 h-3 rounded-full bg-amber-400/80"></div>
                <div class="w-3 h-3 rounded-full bg-emerald-400/80"></div>
              </div>
              <div class="flex-1 text-center text-xs text-slate-400 font-medium">MySaaS Dashboard</div>
            </div>
             <!-- Mock UI Content -->
            <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <!-- Sidebar Mock -->
              <div class="hidden md:block space-y-4">
                 <div class="h-8 w-3/4 bg-slate-100 rounded-lg animate-pulse"></div>
                 <div class="h-4 w-1/2 bg-slate-50 rounded-lg"></div>
                 <div class="h-4 w-2/3 bg-slate-50 rounded-lg"></div>
                 <div class="h-4 w-1/2 bg-slate-50 rounded-lg"></div>
              </div>
              <!-- Main Content Mock -->
              <div class="md:col-span-2 space-y-6">
                <div class="flex justify-between items-center">
                   <div class="h-8 w-1/3 bg-slate-100 rounded-lg"></div>
                   <div class="h-8 w-24 bg-indigo-50 rounded-lg"></div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div class="h-24 bg-indigo-50/50 rounded-xl border border-indigo-100 p-4">
                     <div class="h-4 w-12 bg-indigo-200 rounded mb-2"></div>
                     <div class="h-8 w-20 bg-indigo-600/20 rounded"></div>
                  </div>
                  <div class="h-24 bg-violet-50/50 rounded-xl border border-violet-100 p-4">
                     <div class="h-4 w-12 bg-violet-200 rounded mb-2"></div>
                     <div class="h-8 w-20 bg-violet-600/20 rounded"></div>
                  </div>
                </div>
                <div class="h-48 bg-slate-50 rounded-xl border border-slate-100 relative overflow-hidden">
                   <!-- Chart Mock -->
                   <div class="absolute bottom-0 left-0 right-0 h-32 flex items-end justify-between px-4 gap-2">
                      <div class="w-full bg-indigo-200/50 rounded-t-sm h-10"></div>
                      <div class="w-full bg-indigo-300/50 rounded-t-sm h-16"></div>
                      <div class="w-full bg-indigo-400/50 rounded-t-sm h-12"></div>
                      <div class="w-full bg-indigo-500/50 rounded-t-sm h-24"></div>
                      <div class="w-full bg-indigo-600/50 rounded-t-sm h-20"></div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-24 bg-white relative">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">Why MySaaS is the best platform for you</h2>
          <p class="text-slate-500 max-w-2xl mx-auto">
            Customers choose MySaaS for its smart, easy-to-use, and feature-rich experience.
          </p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div v-for="(feature, index) in features" :key="index" class="group p-8 rounded-2xl bg-white border border-slate-100 shadow-soft hover:shadow-xl hover:border-indigo-100 transition-all duration-300 hover:-translate-y-1">
            <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="feature.icon"></path>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mb-3">{{ feature.title }}</h3>
            <p class="text-slate-500 group-hover:text-slate-600 transition-colors">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section class="py-24 bg-slate-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">Fair pricing, built for everyone</h2>
          <p class="text-slate-500 max-w-2xl mx-auto">
            Whether you are just starting out or ready to scale, we've got a plan for you. Pay only for what you need.
          </p>
        </div>

        <div class="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
          <div v-for="(plan, index) in pricingPlans" :key="index" class="relative bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
            <div v-if="plan.popular" class="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
              Most Popular
            </div>
            
            <h3 class="text-xl font-bold text-slate-900 mb-2">{{ plan.name }}</h3>
            <p class="text-slate-400 text-sm mb-6">{{ plan.description }}</p>
            
            <div class="mb-6">
              <span class="text-4xl font-bold text-slate-900">{{ plan.price }}</span>
              <span class="text-xs text-slate-500 font-medium ml-1">{{ plan.currency }}{{ plan.period }}</span>
            </div>
            
            <button class="w-full py-3 px-4 rounded-xl font-medium mb-8 transition-colors"
              :class="plan.popular ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'">
              {{ plan.cta }}
            </button>
            
            <ul class="space-y-3 flex-1">
              <li v-for="(feature, fIndex) in plan.features" :key="fIndex" class="flex items-start text-sm">
                <svg class="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="text-slate-600">{{ feature }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section class="py-24 bg-white overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">Loved by Algerian Merchants</h2>
          <!-- <p class="text-slate-500 max-w-2xl mx-auto"></p> -->
        </div>

        <div class="relative w-full overflow-hidden mask-gradient">
          <div ref="marqueeContainer" class="flex animate-marquee gap-8 w-max pr-8" @mouseenter="setPlaybackSpeed(0.1)" @mouseleave="setPlaybackSpeed(1)">
            <!-- First set of testimonials -->
            <div v-for="(testimonial, index) in testimonials" :key="'first-' + index" class="w-[350px] md:w-[400px] flex-shrink-0 bg-indigo-50/50 p-8 rounded-2xl border border-indigo-50 hover:border-indigo-100 transition-colors">
              <div class="flex items-center gap-4 mb-6">
                <img :src="testimonial.avatar" :alt="testimonial.name" class="w-12 h-12 rounded-full bg-indigo-100" />
                <div>
                  <h4 class="font-bold text-slate-900">{{ testimonial.name }}</h4>
                  <p class="text-sm text-slate-500">{{ testimonial.role }}, {{ testimonial.company }}</p>
                </div>
              </div>
              <p class="text-slate-600 italic">"{{ testimonial.content }}"</p>
            </div>
            
            <!-- Duplicate set for infinite scroll -->
            <div v-for="(testimonial, index) in testimonials" :key="'second-' + index" class="w-[350px] md:w-[400px] flex-shrink-0 bg-indigo-50/50 p-8 rounded-2xl border border-indigo-50 hover:border-indigo-100 transition-colors">
              <div class="flex items-center gap-4 mb-6">
                <img :src="testimonial.avatar" :alt="testimonial.name" class="w-12 h-12 rounded-full bg-indigo-100" />
                <div>
                  <h4 class="font-bold text-slate-900">{{ testimonial.name }}</h4>
                  <p class="text-sm text-slate-500">{{ testimonial.role }}, {{ testimonial.company }}</p>
                </div>
              </div>
              <p class="text-slate-600 italic">"{{ testimonial.content }}"</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Social Proof / Final CTA -->
    <section class="py-24 bg-slate-900 text-white relative overflow-hidden">
      <div class="absolute inset-0 bg-indigo-600/10"></div>
      <div class="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-500/30 blur-3xl"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-violet-500/30 blur-3xl"></div>
      
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
        <h2 class="text-3xl md:text-5xl font-display font-bold mb-6">Ready to find your forever customers?</h2>
        <p class="text-indigo-200 text-xl max-w-2xl mx-auto mb-10">
          Join thousands of merchants who trust MySaaS to power their online business.
        </p>
        <NuxtLink to="/register" class="inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-xl text-indigo-900 bg-white hover:bg-indigo-50 shadow-lg hover:shadow-white/25 transition-all duration-300 hover:-translate-y-1">
          Start your Free Trial
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.animate-blob {
  animation: blob 7s infinite;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
.animate-slideUp {
  animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  transform: translateY(20px);
}
.animate-fadeIn {
  animation: fadeIn 0.8s ease-out forwards;
  opacity: 0;
}
.flex-delay-100 {
  animation-delay: 100ms;
}
.flex-delay-200 {
  animation-delay: 200ms;
}
.flex-delay-300 {
  animation-delay: 300ms;
}

/* Marquee Animation */
.animate-marquee {
  animation: marquee 40s linear infinite;
}

@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    /* Translate by exactly 50% because we duplicated the list and 
       the gap is included in the flow. We need to handle the gap correctly.
       Actually, if we have 2 sets, we want to move by 50% of the TOTAL width
       (which is 100% of ONE set + gaps). 
       However, translateX(-50%) moves by 50% of the CONTAINER. 
       Since the container (flex element) width is the total width of all items,
       moving it by -50% moves it exactly to the start of the second set.
    */
    transform: translateX(-50%);
  }
}

/* Optional: Add gradient masks to fade edges */
.mask-gradient {
  mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
}

@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}

@keyframes slideUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}
</style>
