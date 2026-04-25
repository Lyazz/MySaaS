<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')
const storefrontContent = useStorefrontContent()
const { currencyCode, format: formatCurrency } = useCurrency()
</script>

<template>
  <div class="min-h-[80vh] px-4 py-12 bg-gradient-to-b from-amber-50/30 to-white">
    <div class="max-w-5xl mx-auto">
        <h1 class="font-cozy font-black text-4xl text-slate-800 text-center mb-12">{{ storefrontContent.cart.title }}</h1>

        <div v-if="!cartStore.hasItems" class="text-center py-20 bg-white/80 backdrop-blur-sm rounded-[3rem] shadow-soft">
            <div class="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-300">
                <Icon name="lucide:handbag" class="w-10 h-10" />
            </div>
            <h2 class="font-bold text-xl text-slate-600 mb-6">{{ storefrontContent.cart.empty.subtitle }}</h2>
            <NuxtLink to="/products" class="inline-block bg-brand-500 text-white font-bold px-8 py-3 rounded-full hover:bg-brand-600 transition-colors shadow-lg shadow-brand-200">
                {{ storefrontContent.cart.empty.cta }}
            </NuxtLink>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            <!-- Cart Items -->
            <section class="lg:col-span-8 space-y-6">
                <TransitionGroup name="list">
                    <div 
                      v-for="item in cartStore.items" 
                      :key="item.variantId || item.productId" 
                      class="bg-white p-6 rounded-[2rem] shadow-soft flex gap-6 items-center hover:shadow-lg transition-shadow"
                    >
                        <div class="w-24 h-24 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0">
                            <img v-if="item.image" :src="item.image" :alt="item.title" class="w-full h-full object-cover" />
                            <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
                              <Icon name="lucide:image" class="w-8 h-8" />
                            </div>
                        </div>
                        
                        <div class="flex-grow">
                            <h3 class="font-bold text-slate-700 text-lg mb-1">
                                <NuxtLink :to="`/product/${item.slug}`" class="hover:text-brand-500 transition-colors">{{ item.title }}</NuxtLink>
                            </h3>
                            <p v-if="item.variantId" class="text-sm text-slate-400">{{ item.variantId.slice(0, 8) }}</p>
                            
                            <div class="flex items-center gap-4 mt-3">
                                <div class="flex items-center bg-slate-50 rounded-full px-2 py-1">
                                    <button 
                                      :disabled="item.quantity <= 1"
                                      @click="cartStore.updateQuantity(item.productId, item.quantity - 1, item.variantId)" 
                                      class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 font-bold disabled:opacity-30"
                                    >
                                      <Icon name="lucide:minus" class="w-4 h-4" />
                                    </button>
                                    <span class="font-bold text-slate-700 w-8 text-center text-sm">{{ item.quantity }}</span>
                                    <button 
                                      :disabled="item.quantity >= item.stock"
                                      @click="cartStore.updateQuantity(item.productId, item.quantity + 1, item.variantId)" 
                                      class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 font-bold disabled:opacity-30"
                                    >
                                      <Icon name="lucide:plus" class="w-4 h-4" />
                                    </button>
                                </div>
                                <div class="font-bold text-slate-700">
                                    {{ formatCurrency(item.lineTotal ?? (item.price * item.quantity)) }}
                                </div>
                            </div>
                        </div>

                        <button @click="cartStore.removeItem(item.productId, item.variantId)" class="w-10 h-10 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-400 flex items-center justify-center transition-colors">
                            <Icon name="lucide:trash-2" class="w-5 h-5" />
                        </button>
                    </div>
                </TransitionGroup>
            </section>

            <!-- Summary -->
            <section class="lg:col-span-4">
                <div class="bg-white p-8 rounded-[2rem] shadow-soft sticky top-24">
                    <h2 class="font-bold text-slate-800 text-xl mb-6">{{ storefrontContent.cart.summary.title }}</h2>
                    <dl class="space-y-4 text-sm font-medium text-slate-500 mb-8">
                         <div class="flex justify-between">
                            <dt>{{ storefrontContent.cart.summary.subtotal }}</dt>
                            <dd class="text-slate-700 font-bold">{{ formatCurrency(cartStore.total) }}</dd>
                        </div>
                        <div class="flex justify-between">
                            <dt>{{ storefrontContent.cart.summary.shipping }}</dt>
                            <dd class="text-slate-400 text-xs">{{ storefrontContent.cart.summary.shippingHint }}</dd>
                        </div>
                        <div class="flex justify-between">
                            <dt>{{ storefrontContent.cart.summary.tax }}</dt>
                            <dd class="text-slate-700">{{ formatCurrency(0) }}</dd>
                        </div>
                        <div class="flex justify-between pt-4 border-t border-slate-100 text-lg">
                            <dt class="text-slate-800 font-bold">{{ storefrontContent.cart.summary.total }}</dt>
                            <dd class="text-brand-500 font-bold">{{ formatCurrency(cartStore.total) }}</dd>
                        </div>
                    </dl>

                     <NuxtLink 
                        to="/checkout"
                        class="block w-full text-center bg-slate-800 text-white font-bold py-4 rounded-full shadow-lg hover:shadow-xl hover:bg-brand-500 hover:shadow-brand-300 hover:-translate-y-1 transition-all duration-300"
                    >
                        {{ storefrontContent.cart.actions.proceedToCheckout }}
                    </NuxtLink>

                    <NuxtLink
                      to="/products"
                      class="block w-full text-center text-slate-500 hover:text-brand-500 font-medium py-3 mt-4 transition-colors"
                    >
                      {{ storefrontContent.actions.continueShopping }}
                    </NuxtLink>
                </div>
            </section>

        </div>
    </div>
  </div>
</template>

<style scoped>
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.list-leave-active {
  position: absolute;
}
</style>
