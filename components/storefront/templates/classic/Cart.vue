<template>
  <div class="min-h-screen bg-white py-16 font-sans text-slate-600">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div
        v-if="!cartStore.hasItems"
        class="text-center py-24"
      >
        <h2 class="text-4xl font-serif font-bold text-slate-900 mb-6">
          Your Cart is Empty
        </h2>
        <p class="text-slate-500 mb-10 max-w-md mx-auto leading-relaxed">
          It looks like you haven't added any items to your cart yet. Explore our collection to find something you love.
        </p>
        <NuxtLink
          to="/products"
          class="inline-block px-10 py-4 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors"
        >
          Start Shopping
        </NuxtLink>
      </div>

      <div
        v-else
        class="lg:grid lg:grid-cols-12 lg:gap-16 items-start"
      >
        <section class="lg:col-span-7">
          <div class="flex items-end justify-between border-b border-slate-200 pb-6 mb-8">
            <h1 class="text-4xl font-serif font-bold text-slate-900">
              Shopping Cart
            </h1>
            <span class="text-xs font-bold uppercase tracking-widest text-slate-500">{{ cartStore.itemCount }} items</span>
          </div>

          <ul role="list" class="space-y-8">
            <TransitionGroup name="list">
              <li
                v-for="item in cartStore.items"
                :key="item.variantId || item.productId"
                class="flex gap-6 py-4"
              >
                <div class="h-32 w-24 flex-shrink-0 overflow-hidden border border-slate-200 bg-slate-50">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.title"
                    class="h-full w-full object-cover object-center"
                  >
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50"
                  >
                    <Icon name="lucide:image" class="h-8 w-8" />
                  </div>
                </div>

                <div class="flex flex-1 flex-col justify-between">
                  <div>
                    <div class="flex justify-between items-start gap-4">
                      <h3 class="text-lg font-serif font-bold text-slate-900 hover:text-slate-600 transition-colors">
                        <NuxtLink :to="`/p/${item.slug}`">
                          {{ item.title }}
                        </NuxtLink>
                      </h3>
                      <button
                        type="button"
                        class="text-slate-400 hover:text-slate-900 transition-colors px-2"
                        @click="cartStore.removeItem(item.productId, item.variantId)"
                      >
                         <Icon name="lucide:x" class="h-4 w-4" />
                      </button>
                    </div>
                    <p class="mt-1 text-xs text-slate-500 uppercase tracking-wider">
                      {{ item.variantId ? 'Variant Selected' : 'Standard Item' }}
                    </p>
                  </div>

                  <div class="flex items-center justify-between pt-4">
                    <div class="flex items-center border border-slate-300 h-10">
                      <button
                        :disabled="item.quantity <= 1"
                        class="w-10 h-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 transition-colors"
                        @click="cartStore.updateQuantity(item.productId, item.quantity - 1, item.variantId)"
                      >
                        <Icon name="lucide:minus" class="w-3 h-3" />
                      </button>
                      <span class="w-10 text-center text-sm font-bold text-slate-900">{{ item.quantity }}</span>
                      <button
                        :disabled="item.quantity >= item.stock"
                        class="w-10 h-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 transition-colors"
                        @click="cartStore.updateQuantity(item.productId, item.quantity + 1, item.variantId)"
                      >
                        <Icon name="lucide:plus" class="w-3 h-3" />
                      </button>
                    </div>
                    
                    <p class="text-lg font-serif font-bold text-slate-900">
                      {{ formatCurrency(item.price) }}
                    </p>
                  </div>
                </div>
              </li>
            </TransitionGroup>
          </ul>
        </section>

        <!-- Order Summary -->
        <section
          aria-labelledby="summary-heading"
          class="mt-16 bg-slate-50 p-8 border border-slate-200 lg:col-span-5 lg:mt-0 lg:sticky lg:top-24"
        >
          <h2
            id="summary-heading"
            class="text-xl font-serif font-bold text-slate-900 border-b border-slate-200 pb-4 mb-6"
          >
            Order Summary
          </h2>

          <div class="space-y-4 text-sm">
            <div class="flex items-center justify-between">
              <dt class="text-slate-500 uppercase tracking-wider text-xs font-bold">
                Subtotal
              </dt>
              <dd class="font-medium text-slate-900">
                {{ formatCurrency(cartStore.total) }}
              </dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="text-slate-500 uppercase tracking-wider text-xs font-bold">
                Shipping
              </dt>
              <dd class="text-slate-400 italic">
                Calculated at checkout
              </dd>
            </div>
            
            <div class="flex items-center justify-between pt-4 border-t border-slate-200 mt-4">
              <dt class="text-xl font-serif font-bold text-slate-900">
                Total
              </dt>
              <dd class="text-xl font-serif font-bold text-slate-900">
                {{ formatCurrency(cartStore.total) }}
              </dd>
            </div>
          </div>

          <div class="mt-8 space-y-4">
            <NuxtLink
              to="/checkout"
              class="w-full flex items-center justify-center bg-slate-900 px-6 py-4 text-xs font-bold uppercase tracking-widest text-white hover:bg-slate-800 transition-colors"
            >
              Proceed to Checkout
            </NuxtLink>
            
            <NuxtLink
              to="/products"
              class="w-full flex items-center justify-center border border-slate-900 bg-transparent px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-900 hover:bg-slate-900 hover:text-white transition-colors"
            >
              Continue Shopping
            </NuxtLink>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')
const { currencyCode, format: formatCurrency } = useCurrency()
</script>

<style scoped>
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-leave-active {
  position: absolute;
}
</style>
