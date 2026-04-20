<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')
const storefrontContent = useStorefrontContent()
const { currencyCode, format: formatCurrency } = useCurrency()
</script>

<template>
  <div class="min-h-screen bg-[#fffbf0] py-10" style="font-family: 'DM Sans', sans-serif">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      <!-- Empty State -->
      <div v-if="!cartStore.hasItems" class="text-center py-24">
        <div class="text-8xl mb-6">🛍️</div>
        <h2 class="text-3xl font-black text-stone-900 mb-3" style="font-family: 'Fredoka', sans-serif">
          {{ storefrontContent.cart.empty.title }}
        </h2>
        <p class="text-stone-500 text-lg max-w-md mx-auto mb-10">{{ storefrontContent.cart.empty.subtitle }}</p>
        <NuxtLink
          to="/products"
          class="inline-flex items-center gap-2 px-8 py-4 bg-violet-700 text-white font-black rounded-full shadow-[0_5px_0_0_#4c1d95] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all"
          style="font-family: 'Fredoka', sans-serif"
        >
          {{ storefrontContent.cart.empty.cta }}
        </NuxtLink>
      </div>

      <div v-else class="lg:grid lg:grid-cols-12 lg:gap-10 lg:items-start">
        <!-- Items -->
        <section class="lg:col-span-7">
          <div class="flex items-center justify-between mb-7">
            <div class="flex items-center gap-3">
              <span class="w-3 h-3 rounded-full bg-violet-400 inline-block" />
              <h1 class="text-3xl font-black text-stone-900" style="font-family: 'Fredoka', sans-serif">
                {{ storefrontContent.cart.title }}
              </h1>
            </div>
            <span class="text-stone-500 text-sm font-medium">{{ storefrontContent.cart.itemsCount(cartStore.itemCount) }}</span>
          </div>

          <ul role="list" class="space-y-4">
            <TransitionGroup name="list">
              <li
                v-for="item in cartStore.items"
                :key="item.variantId || item.productId"
                class="flex py-4 px-4 bg-white rounded-3xl border-3 border-violet-100 shadow-[0_3px_0_0_#ddd6fe] gap-4 items-center"
              >
                <!-- Image -->
                <div class="w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-3 border-violet-100 bg-violet-50 rotate-[-1.5deg]">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.title"
                    class="w-full h-full object-cover"
                  >
                  <div v-else class="w-full h-full flex items-center justify-center text-violet-300">
                    <Icon name="lucide:image" class="h-8 w-8" />
                  </div>
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <NuxtLink :to="`/p/${item.slug}`" class="font-black text-stone-900 hover:text-violet-700 transition-colors text-sm leading-snug line-clamp-2" style="font-family: 'Fredoka', sans-serif">
                    {{ item.title }}
                  </NuxtLink>
                  <p class="text-xs text-stone-500 mt-0.5">
                    <template v-if="item.variantId">{{ storefrontContent.cart.item.variant }}: {{ item.variantId.slice(0, 8) }}</template>
                    <template v-else>{{ storefrontContent.cart.item.standardItem }}</template>
                  </p>
                  <p class="text-base font-black text-violet-700 mt-1" style="font-family: 'Fredoka', sans-serif">
                    {{ formatCurrency(item.price) }}
                  </p>
                </div>

                <!-- Qty + Remove -->
                <div class="flex flex-col items-end gap-2 flex-shrink-0">
                  <button
                    type="button"
                    class="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-red-500 transition-colors"
                    @click="cartStore.removeItem(item.productId, item.variantId)"
                  >
                    <Icon name="lucide:trash" class="h-4 w-4" />
                  </button>
                  <div class="flex items-center gap-1 bg-violet-50 rounded-full border-2 border-violet-100 p-0.5">
                    <button
                      :disabled="item.quantity <= 1"
                      class="w-7 h-7 flex items-center justify-center rounded-full bg-white text-stone-600 font-black border border-violet-100 disabled:opacity-30 transition-all hover:border-violet-300"
                      @click="cartStore.updateQuantity(item.productId, item.quantity - 1, item.variantId)"
                    >
                      <Icon name="lucide:minus" class="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                    <span class="text-violet-700 font-black w-6 text-center text-sm">{{ item.quantity }}</span>
                    <button
                      :disabled="item.quantity >= item.stock"
                      class="w-7 h-7 flex items-center justify-center rounded-full bg-violet-700 text-white font-black disabled:opacity-30 transition-all hover:bg-violet-600"
                      @click="cartStore.updateQuantity(item.productId, item.quantity + 1, item.variantId)"
                    >
                      <Icon name="lucide:plus" class="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </div>
                </div>
              </li>
            </TransitionGroup>
          </ul>
        </section>

        <!-- Summary -->
        <section
          aria-labelledby="summary-heading"
          class="mt-10 lg:mt-0 bg-white rounded-3xl border-3 border-violet-100 shadow-[0_4px_0_0_#ddd6fe] px-6 py-7 lg:col-span-5 lg:sticky lg:top-8"
        >
          <h2 id="summary-heading" class="text-2xl font-black text-stone-900 mb-6" style="font-family: 'Fredoka', sans-serif">
            {{ storefrontContent.cart.summary.title }}
          </h2>

          <div class="space-y-3">
            <div class="flex items-center justify-between border-b-2 border-dashed border-violet-100 pb-3">
              <dt class="text-sm font-bold text-stone-600">{{ storefrontContent.cart.summary.subtotal }}</dt>
              <dd class="text-sm font-black text-stone-900">{{ formatCurrency(cartStore.total) }}</dd>
            </div>
            <div class="flex items-center justify-between border-b-2 border-dashed border-violet-100 pb-3">
              <dt class="flex flex-col text-sm text-stone-500 font-bold">
                <span>{{ storefrontContent.cart.summary.shipping }}</span>
                <span class="text-xs font-medium">{{ storefrontContent.cart.summary.shippingHint }}</span>
              </dt>
              <dd class="text-sm font-black text-violet-600">{{ storefrontContent.checkout.summary.calculatedAtCheckout ?? 'At checkout' }}</dd>
            </div>
            <div class="flex items-center justify-between pt-3 bg-violet-50 rounded-2xl px-4 py-3 border-2 border-violet-100">
              <dt class="font-black text-stone-900" style="font-family: 'Fredoka', sans-serif">{{ storefrontContent.cart.summary.total }}</dt>
              <dd class="text-2xl font-black text-violet-700" style="font-family: 'Fredoka', sans-serif">{{ formatCurrency(cartStore.total) }}</dd>
            </div>
          </div>

          <div class="mt-7 space-y-3">
            <NuxtLink
              to="/checkout"
              class="w-full flex justify-center py-4 bg-amber-400 text-amber-900 font-black rounded-full border-3 border-amber-300 shadow-[0_5px_0_0_#d97706] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all items-center gap-2 text-base"
              style="font-family: 'Fredoka', sans-serif"
            >
              <Icon name="lucide:arrow-right" class="w-5 h-5" />
              {{ storefrontContent.cart.actions.proceedToCheckout }}
            </NuxtLink>
            <NuxtLink
              to="/products"
              class="w-full flex items-center justify-center rounded-full border-3 border-violet-100 bg-white px-6 py-3.5 text-sm font-black text-stone-700 hover:border-violet-300 hover:bg-violet-50 transition-all"
              style="font-family: 'Fredoka', sans-serif"
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
.list-leave-active { transition: all 0.4s ease; }
.list-enter-from,
.list-leave-to { opacity: 0; transform: translateX(20px); }
.list-leave-active { position: absolute; }
</style>
