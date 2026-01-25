<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const router = useRouter()

const form = ref({
  fullName: '',
  phone: '0XXXXXXXX',
  wilaya: '',
  commune: '',
  address: '',
  notes: '',
  deliveryMode: 'home' // 'home', 'pickup', 'store'
})

const submitting = ref(false)
const errorMessage = ref('')
const couponCode = ref('')

async function handleSubmit() {
    // ... logic (same as generic checkout but simpler form submission)
    router.push('/order-success') // Mock success
}
</script>

<template>
  <div class="bg-[#f8faf9] min-h-screen py-10 font-sans text-slate-600">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-slate-900">Checkout</h1>
            <p class="text-lg text-slate-500 font-medium">{{ cartStore.itemCount }} items</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <!-- Left Column: Attributes & Delivery -->
            <div class="lg:col-span-7 space-y-8">
                
                <!-- Personal Info -->
                <div class="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="col-span-2 md:col-span-1 space-y-2">
                            <label class="block text-sm font-semibold text-slate-700 ml-1">Full name</label>
                            <input v-model="form.fullName" type="text" class="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm" placeholder="e.g. John Doe" />
                        </div>
                        <div class="col-span-2 md:col-span-1 space-y-2">
                            <label class="block text-sm font-semibold text-slate-700 ml-1">Phone</label>
                            <input v-model="form.phone" type="tel" class="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm" placeholder="0XXXXXXXX" />
                        </div>
                         <div class="col-span-2 md:col-span-1 space-y-2">
                            <label class="block text-sm font-semibold text-slate-700 ml-1">Wilaya</label>
                            <div class="relative">
                                <select v-model="form.wilaya" class="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none appearance-none cursor-pointer shadow-sm">
                                    <option value="" disabled selected>Select a wilaya...</option>
                                    <option value="16">16 - Alger</option>
                                    <!-- Mock options -->
                                </select>
                                <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                                </div>
                            </div>
                        </div>
                        <div class="col-span-2 md:col-span-1 space-y-2">
                            <label class="block text-sm font-semibold text-slate-700 ml-1">City</label>
                             <div class="relative">
                                 <select v-model="form.commune" class="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none appearance-none cursor-pointer shadow-sm">
                                    <option value="" disabled selected>Select a commune</option>
                                    <!-- Mock options -->
                                </select>
                                <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                                </div>
                             </div>
                        </div>
                        <div class="col-span-2 space-y-2">
                             <label class="block text-sm font-semibold text-slate-700 ml-1">Address (optional)</label>
                             <input v-model="form.address" type="text" class="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm" placeholder="Street address, apartment, etc." />
                        </div>
                    </div>
                </div>

                <!-- Delivery Mode -->
                <div class="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
                    <h3 class="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Delivery mode</h3>
                    <p class="text-xs text-slate-500 mb-6 font-medium">Choose home delivery, pickup point, or store pickup.</p>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <!-- Home Delivery Option -->
                        <div 
                            @click="form.deliveryMode = 'home'"
                            class="cursor-pointer relative rounded-2xl p-4 border-2 transition-all duration-300 group"
                            :class="form.deliveryMode === 'home' ? 'border-brand-500 bg-brand-50/50' : 'border-slate-100 hover:border-brand-200 hover:shadow-sm'"
                        >
                            <div class="flex items-center justify-between mb-3">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200/50 px-2 py-1 rounded-lg">Deliver</span>
                                <span class="block w-4 h-4 rounded-full border-2 transition-colors duration-300" :class="form.deliveryMode === 'home' ? 'border-brand-600 bg-brand-600' : 'border-slate-300'"></span>
                            </div>
                            <h4 class="font-bold text-slate-900 text-sm mb-1">Home Delivery</h4>
                            <p class="text-xs text-slate-500 leading-relaxed">Delivered directly to your doorstep.</p>
                        </div>

                          <!-- Pickup Point Option -->
                        <div 
                            @click="form.deliveryMode = 'pickup'"
                            class="cursor-pointer relative rounded-2xl p-4 border-2 transition-all duration-300 group"
                            :class="form.deliveryMode === 'pickup' ? 'border-brand-500 bg-brand-50/50' : 'border-slate-100 hover:border-brand-200 hover:shadow-sm'"
                        >
                             <div class="flex items-center justify-between mb-3">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-100/50 px-2 py-1 rounded-lg">Pickup Point</span>
                                <span class="block w-4 h-4 rounded-full border-2 transition-colors duration-300" :class="form.deliveryMode === 'pickup' ? 'border-brand-600 bg-brand-600' : 'border-slate-300'"></span>
                            </div>
                            <h4 class="font-bold text-slate-900 text-sm mb-1">Pickup Point</h4>
                            <p class="text-xs text-slate-500 leading-relaxed">Collect from a nearby location.</p>
                        </div>

                         <!-- Bookstore Pickup Option -->
                        <div 
                            @click="form.deliveryMode = 'store'"
                            class="cursor-pointer relative rounded-2xl p-4 border-2 transition-all duration-300 group"
                            :class="form.deliveryMode === 'store' ? 'border-brand-500 bg-brand-50/50' : 'border-slate-100 hover:border-brand-200 hover:shadow-sm'"
                        >
                             <div class="flex items-center justify-between mb-3">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-100/50 px-2 py-1 rounded-lg">Store</span>
                                <span class="block w-4 h-4 rounded-full border-2 transition-colors duration-300" :class="form.deliveryMode === 'store' ? 'border-brand-600 bg-brand-600' : 'border-slate-300'"></span>
                            </div>
                            <h4 class="font-bold text-slate-900 text-sm mb-1">Store Pickup</h4>
                            <p class="text-xs text-slate-500 leading-relaxed">Pick up at our store in Ouled Fayet.</p>
                        </div>
                    </div>
                </div>

                 <!-- Notes -->
                 <div class="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
                     <h3 class="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Notes (optional)</h3>
                      <textarea v-model="form.notes" rows="3" class="w-full rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 font-medium placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300 outline-none shadow-sm resize-none" placeholder="Delivery instructions, time slots..." />
                 </div>

                   <!-- Payment Method -->
                 <div class="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
                     <h3 class="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Payment method</h3>
                     <label class="flex items-center gap-4 p-4 border-2 border-slate-100 rounded-2xl cursor-pointer hover:border-brand-500 bg-slate-50/50 hover:bg-white transition-all duration-300 group">
                         <div class="relative flex items-center justify-center w-6 h-6">
                            <input type="radio" checked class="peer appearance-none h-5 w-5 border-2 border-slate-300 rounded-full checked:border-brand-600 checked:bg-brand-600 transition-colors cursor-pointer" />
                            <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 peer-checked:opacity-100">
                                <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"></path></svg>
                            </div>
                         </div>
                         <span class="font-bold text-slate-900 text-sm group-hover:text-brand-700 transition-colors">Cash on delivery</span>
                     </label>
                 </div>

            </div>

             <!-- Right Column: Summary -->
            <div class="lg:col-span-5">
                <div class="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 sticky top-24">
                     <h2 class="text-lg font-bold text-slate-900 mb-6">Summary</h2>

                     <!-- Cart Items -->
                     <div class="space-y-4 mb-6 max-h-80 overflow-y-auto pr-2">
                         <div v-for="item in cartStore.items" :key="item.productId" class="flex items-center gap-4 py-2 border-b border-slate-50 last:border-0">
                             <div class="h-16 w-16 bg-slate-100 rounded-lg flex-shrink-0 bg-cover bg-center" style="background-image: url('https://placehold.co/100')"></div>
                             <div class="flex-1 min-w-0">
                                 <h4 class="font-bold text-slate-900 text-sm truncate">{{ item.title }}</h4>
                                 <p class="text-xs text-slate-500 mt-1">x{{ item.quantity }}</p>
                             </div>
                             <div class="font-bold text-brand-600 text-sm whitespace-nowrap">{{ item.price }} DZD</div>
                         </div>
                     </div>

                     <!-- Coupon -->
                    <div class="bg-brand-50/50 p-4 rounded-xl border border-brand-100 mb-6">
                        <div class="flex justify-between items-center mb-2">
                             <h4 class="text-sm font-bold text-slate-700">Coupon code</h4>
                             <span class="text-[10px] font-bold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full uppercase">• Discount</span>
                        </div>
                        <div class="flex gap-2">
                            <input v-model="couponCode" type="text" placeholder="BIENVENUE10" class="flex-1 rounded-lg border-slate-200 text-sm py-2 px-3 focus:ring-brand-500 focus:border-brand-500" />
                            <button class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm rounded-lg transition-colors">Apply</button>
                        </div>
                    </div>

                    <!-- Totals -->
                    <div class="space-y-3 pt-4 border-t border-slate-100">
                        <div class="flex justify-between text-sm">
                            <span class="text-slate-500">Delivery type</span>
                            <span class="font-medium text-slate-900">Home delivery</span>
                        </div>
                         <div class="flex justify-between text-sm">
                            <span class="text-slate-500">Delivery company</span>
                            <span class="font-medium text-slate-900">Maystro Delivery</span>
                        </div>
                         <div class="flex justify-between text-sm">
                            <span class="text-slate-500">Subtotal</span>
                            <span class="font-bold text-slate-900">{{ cartStore.total }} DZD</span>
                        </div>
                         <div class="flex justify-between text-sm">
                            <span class="text-slate-500">Shipping fee</span>
                            <span class="font-bold text-slate-900">—</span>
                        </div>
                        
                         <div class="flex justify-between items-end pt-4 border-t border-slate-100 mt-4">
                            <span class="font-bold text-xl text-slate-900">Total</span>
                            <span class="font-bold text-xl text-slate-900">{{ cartStore.total }} DZD</span>
                        </div>
                         <p class="text-xs text-slate-400 mt-1">Minimum order: 1,000 DZD.</p>
                    </div>

                    <!-- Checkout Button -->
                    <button 
                        @click="handleSubmit"
                        :disabled="!cartStore.hasItems"
                        class="w-full mt-6 bg-brand-700 hover:bg-brand-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-brand-200 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Place order
                    </button>

                </div>
            </div>

        </div>
    </div>
  </div>
</template>
