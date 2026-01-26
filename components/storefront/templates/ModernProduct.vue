<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const props = defineProps<{
    product: any
}>()

const cartStore = useCartStore()

// Image Gallery Logic
const activeImageIndex = ref(0)
const images = computed(() => {
    if (props.product?.images && props.product.images.length > 0) {
        return props.product.images
    }
    return ['https://placehold.co/600x400', 'https://placehold.co/600x400?text=View+2', 'https://placehold.co/600x400?text=View+3']
})
const currentImage = computed(() => images.value[activeImageIndex.value])

const setActiveImage = (index: number) => {
    activeImageIndex.value = index
}

// Add to Cart Logic (Simulated for form submit)
const isAdding = ref(false)
const showSuccess = ref(false)

const handleOrderSubmit = async () => {
  if (!props.product) return
  isAdding.value = true
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800))

  cartStore.addItem({
      productId: props.product.id,
      title: props.product.title,
      slug: props.product.slug,
      price: Number(props.product.price),
      stock: props.product.stock
  })
  
  isAdding.value = false
  showSuccess.value = true
  setTimeout(() => showSuccess.value = false, 3000)
}

// Price Formatting
const formatPrice = (val: number | string) => {
    return Number(val).toLocaleString('en-US', { style: 'currency', currency: 'DZD' }).replace('DZD', '').trim() + ' DZD'
}
</script>

<template>
  <div class="bg-slate-50 min-h-screen py-10 font-sans">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Breadcrumb -->
        <nav class="flex items-center text-sm text-slate-500 mb-8 animate-fade-in-up">
             <NuxtLink to="/" class="hover:text-brand-600 transition-colors font-medium">Home</NuxtLink>
             <svg class="w-4 h-4 mx-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
             <NuxtLink to="/products" class="hover:text-brand-600 transition-colors font-medium">Shop</NuxtLink>
             <svg class="w-4 h-4 mx-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
             <span class="font-bold text-slate-900 truncate max-w-xs">{{ product?.title }}</span>
        </nav>

        <div class="lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-16 items-start">
            
            <!-- Gallery Section (Left - 7 cols) -->
            <div class="lg:col-span-7 bg-white rounded-3xl p-6 shadow-soft border border-slate-100 mb-8 lg:mb-0 lg:sticky lg:top-8 animate-fade-in-left">
                <!-- Main Image -->
                <div class="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 relative group cursor-zoom-in mb-4 border border-slate-100">
                     <img 
                        :src="currentImage" 
                        :alt="product?.title" 
                        class="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                     />
                     <div class="absolute top-4 left-4">
                         <span class="bg-white/90 backdrop-blur-md text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ring-1 ring-slate-900/5">
                             New Arrival
                         </span>
                     </div>
                </div>

                <!-- Thumbnails -->
                <div class="grid grid-cols-5 gap-3">
                    <button 
                        v-for="(img, idx) in images" 
                        :key="idx"
                        @click="setActiveImage(idx)"
                        class="aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 relative group"
                        :class="activeImageIndex === idx ? 'border-brand-500 ring-2 ring-brand-500/20 ring-offset-1' : 'border-transparent ring-1 ring-slate-200 hover:ring-brand-500/50'"
                    >
                        <div class="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors duration-300"></div>
                        <img :src="img" class="w-full h-full object-cover" alt="Thumbnail" />
                    </button>
                </div>
            </div>

            <!-- Product Info Section (Right - 5 cols) -->
            <div class="lg:col-span-5 flex flex-col animate-fade-in-right space-y-8">
                
                <!-- Header -->
                <div>
                    <h1 class="text-3xl md:text-4xl lg:text-5xl font-sans font-bold text-slate-900 tracking-tight leading-tight mb-4">
                        {{ product?.title }}
                    </h1>

                    <div class="flex items-baseline gap-4">
                        <div class="text-4xl font-sans font-bold text-brand-600 tracking-tight">
                            {{ formatPrice(Number(product?.price || 0)) }}
                        </div>
                        <div v-if="(Number(product?.price) * 1.2) > 0" class="text-lg text-slate-400 line-through decoration-2 decoration-slate-200">
                            {{ formatPrice(Number(product?.price || 0) * 1.2) }}
                        </div>
                    </div>
                </div>

                <!-- Description -->
                <div 
                    v-if="product?.description" 
                    class="prose prose-slate text-slate-600 max-w-none leading-relaxed"
                    v-html="product.description"
                ></div>
                <div v-else class="prose prose-slate text-slate-600 max-w-none leading-relaxed">
                    <p>Experience premium quality with our latest collection. Designed for modern living, this product combines style and functionality seamlessly.</p>
                </div>

                <!-- Features / Trust -->
                <div class="grid grid-cols-2 gap-3">
                     <div class="flex flex-col items-center text-center p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-100 transition-all duration-300 group">
                         <div class="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 mb-3 group-hover:scale-110 transition-transform duration-300">
                             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                         </div>
                         <div class="font-bold text-xs text-slate-900 uppercase tracking-wide">Fast Delivery</div>
                         <div class="text-[10px] text-slate-500 mt-1">58 Wilayas</div>
                     </div>
                     <div class="flex flex-col items-center text-center p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-100 transition-all duration-300 group">
                         <div class="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 mb-3 group-hover:scale-110 transition-transform duration-300">
                             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                         </div>
                         <div class="font-bold text-xs text-slate-900 uppercase tracking-wide">Secure Payment</div>
                         <div class="text-[10px] text-slate-500 mt-1">Cash on Delivery</div>
                     </div>
                </div>

                <!-- Quick COD Order Form -->
                <div class="bg-white rounded-3xl p-6 md:p-8 shadow-soft border border-slate-100 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-brand-600"></div>
                    
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 shadow-sm ring-1 ring-brand-100">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                        </div>
                        <div>
                            <h3 class="font-sans font-bold text-slate-900 text-xl leading-none">Order Now</h3>
                            <span class="text-xs text-slate-500 font-medium">Cash on Delivery (COD)</span>
                        </div>
                    </div>
                    
                    <form @submit.prevent="handleOrderSubmit" class="space-y-5">
                        <div class="space-y-2">
                            <label class="block text-sm font-semibold text-slate-700 ml-1">Full Name</label>
                            <input type="text" placeholder="e.g. John Doe" class="block w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm" />
                        </div>
                        
                        <div class="space-y-2">
                            <label class="block text-sm font-semibold text-slate-700 ml-1">Phone Number</label>
                            <input type="tel" placeholder="e.g. 0550 12 34 56" class="block w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm" />
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-2">
                                <label class="block text-sm font-semibold text-slate-700 ml-1">Wilaya</label>
                                <div class="relative">
                                    <select class="block w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none appearance-none cursor-pointer shadow-sm">
                                        <option value="">Select...</option>
                                        <option value="16">Algiers</option>
                                        <option value="31">Oran</option>
                                    </select>
                                    <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                                    </div>
                                </div>
                            </div>
                             <div class="space-y-2">
                                <label class="block text-sm font-semibold text-slate-700 ml-1">Commune</label>
                                <input type="text" placeholder="e.g. Bab Ezzouar" class="block w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm" />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            :disabled="isAdding"
                            class="w-full h-14 bg-slate-900 hover:bg-brand-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-brand-600/30 transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-3 mt-6 group overflow-hidden relative"
                        >
                            <span class="relative z-10 flex items-center gap-2" :class="{ 'opacity-0': isAdding }">
                                <span>Confirm Order</span>
                                <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                            </span>
                            
                            <div v-if="isAdding" class="absolute inset-0 flex items-center justify-center">
                                <svg class="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                        </button>
                    </form>
                </div>
            </div>
        </div>
     </div>

     <!-- Success Toast -->
     <Transition
        enter-active-class="transform ease-out duration-300 transition"
        enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
        enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
     >
        <div v-if="showSuccess" class="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4 border border-slate-700/50 backdrop-blur-md bg-slate-900/95">
             <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
             </div>
             <div>
                 <div class="font-bold">Order Received!</div>
                 <div class="text-xs text-slate-300">We'll contact you shortly for confirmation.</div>
             </div>
        </div>
     </Transition>
  </div>
</template>

<style scoped>
/* Scoped styles mainly for animations, global font classes assumed from Tailwind config */

.animate-fade-in-up {
    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.animate-fade-in-left {
    animation: fadeInLeft 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
    opacity: 0;
}
.animate-fade-in-right {
    animation: fadeInRight 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
    opacity: 0;
}

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInLeft {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
}
@keyframes fadeInRight {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
}
</style>
