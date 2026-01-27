<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const props = defineProps<{
    product: any
}>()

const cartStore = useCartStore()

// Image Gallery Logic (simplified for Landing Page, usually mostly in description, but we keep this for consistency if needed)
const activeImageIndex = ref(0)
const images = computed(() => {
    if (props.product?.images && props.product.images.length > 0) {
        return props.product.images
    }
    return ['https://placehold.co/600x400', 'https://placehold.co/600x400?text=View+2', 'https://placehold.co/600x400?text=View+3']
})

// Add to Cart Logic
const isAdding = ref(false)
const showSuccess = ref(false)
const fullName = ref('')

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
      stock: props.product.stock,
      image: images.value[0]
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
  <div class="bg-slate-50 min-h-screen pb-20 font-sans">
     <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        
        <!-- Breadcrumb & Header Wrapper Removed per user request -->


        
        <div class="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
            <!-- Main Visual Content (Full Description) -->
            <div class="lg:col-span-8 bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 mb-10 lg:mb-0 animate-fade-in-up" style="animation-delay: 0.1s">
                <div 
                    v-if="product?.description" 
                    class="prose prose-lg md:prose-xl prose-img:rounded-xl prose-img:w-full prose-img:shadow-sm max-w-none p-6 md:p-10"
                    v-html="product.description"
                ></div>
                
                <!-- Fallback if no description: Show stacked images -->
                <div v-else class="p-6 space-y-4">
                    <img v-for="(img, idx) in images" :key="idx" :src="img" class="w-full rounded-2xl shadow-sm" alt="Product View" />
                </div>
            </div>

            <!-- COD Order Form Section -->
            <div class="lg:col-span-4 lg:sticky lg:top-8 order-2">
                <div id="order-form" class="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-brand-100 relative overflow-hidden animate-fade-in-up" style="animation-delay: 0.2s">
                    <!-- Decorative Top Bar -->
                    <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-500 to-brand-700"></div>

                    <div class="text-center mb-6">
                        <h3 class="text-2xl font-bold text-slate-900 mb-2">Order Now</h3>
                        <p class="text-slate-600 text-sm">Free shipping • Cash on Delivery</p>
                    </div>

                    <form @submit.prevent="handleOrderSubmit" class="space-y-5">
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                                <input 
                                    v-model="fullName"
                                    type="text" 
                                    placeholder="Your Name" 
                                    class="block w-full h-12 rounded-xl border-slate-200 bg-slate-50 px-4 focus:ring-brand-500 focus:border-brand-500 transition-shadow" 
                                    :class="{ 'animate-attention': !fullName }"
                                    required 
                                />
                            </div>
                            
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                                <input type="tel" placeholder="0550 12 34 56" class="block w-full h-12 rounded-xl border-slate-200 bg-slate-50 px-4 focus:ring-brand-500 focus:border-brand-500 transition-shadow" required />
                            </div>

                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-semibold text-slate-700 mb-1">Wilaya</label>
                                    <select class="block w-full h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-slate-900 focus:ring-brand-500 focus:border-brand-500 cursor-pointer">
                                        <option value="">Select Wilaya...</option>
                                        <option value="16">Algiers</option>
                                        <option value="31">Oran</option>
                                        <!-- More Data needed -->
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold text-slate-700 mb-1">Commune</label>
                                    <input type="text" placeholder="Your City" class="block w-full h-12 rounded-xl border-slate-200 bg-slate-50 px-4 focus:ring-brand-500 focus:border-brand-500" />
                                </div>
                            </div>
                        </div>

                        <div class="pt-4">
                            <button 
                                type="submit"
                                :disabled="isAdding"
                                class="w-full h-14 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-brand-500/30 hover:shadow-brand-600/40 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <span v-if="!isAdding">Confirm Order {{ formatPrice(Number(product?.price || 0)) }}</span>
                                <span v-else class="flex items-center gap-2">
                                    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Processing...
                                </span>
                            </button>
                            <p class="text-center text-xs text-slate-400 mt-3">Safe & Secure Payment</p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
     </div>

     <!-- Mobile Sticky Bottom Bar (Optional, users like it in landing pages) -->
     <div class="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-slate-100 md:hidden z-40 flex items-center justify-between shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
         <div class="flex flex-col">
             <span class="text-xs text-slate-500 font-medium">Total</span>
             <span class="font-bold text-brand-600 text-lg">{{ formatPrice(Number(product?.price || 0)) }}</span>
         </div>
         <a href="#order-form" class="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20">
             Order Now
         </a>
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
        <div v-if="showSuccess" class="fixed bottom-24 md:bottom-10 right-4 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4">
             <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
             </div>
             <div>
                 <div class="font-bold">Order Received!</div>
                 <div class="text-xs text-slate-300">We will call you to confirm.</div>
             </div>
        </div>
     </Transition>
  </div>
</template>

<style scoped>
.animate-fade-in-up {
    animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
}

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-attention {
    animation: attentionCaptivate 3s infinite cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes attentionCaptivate {
    0%, 100% { border-color: #e2e8f0; box-shadow: 0 0 0 0 rgba(0,0,0,0); transform: scale(1); background-color: white; }
    50% { border-color: var(--brand); box-shadow: 0 0 20px -5px color-mix(in srgb, var(--brand), transparent 50%); transform: scale(1.02); background-color: color-mix(in srgb, var(--brand), white 98%); }
}
</style>
