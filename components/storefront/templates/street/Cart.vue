<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')
const storefrontContent = useStorefrontContent()
const { currencyCode, format: formatCurrency } = useCurrency()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4">
    <div class="max-w-7xl mx-auto">
      <h1 class="font-street text-6xl md:text-8xl mb-12 uppercase leading-none text-center bg-white border-4 border-black inline-block px-8 py-2 shadow-[8px_8px_0_0_#000]">
        {{ storefrontContent.cart.title }}
      </h1>

      <div v-if="!cartStore.hasItems" class="text-center py-24 bg-white border-4 border-black shadow-[12px_12px_0_0_#000]">
        <div class="mx-auto h-32 w-32 bg-gray-100 border-4 border-black flex items-center justify-center mb-8">
          <Icon name="lucide:handbag" class="h-16 w-16 text-gray-400" />
        </div>
        <h2 class="font-street text-4xl mb-6">{{ storefrontContent.cart.empty.title }}</h2>
        <p class="font-mono text-gray-500 mb-8 uppercase">{{ storefrontContent.cart.empty.subtitle }}</p>
        <NuxtLink to="/products" class="inline-block bg-brand text-black font-street text-2xl uppercase px-8 py-3 border-2 border-black hover:shadow-[4px_4px_0_0_#000] transition-all">
          {{ storefrontContent.cart.empty.cta }}
        </NuxtLink>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        <!-- Cart Items -->
        <section class="lg:col-span-7">
          <div class="flex items-center justify-between border-b-4 border-black pb-4 mb-8">
            <h2 class="font-street text-3xl uppercase">{{ storefrontContent.cart.sections.items }}</h2>
            <span class="font-mono text-sm uppercase bg-black text-white px-3 py-1">{{ storefrontContent.cart.itemsCount(cartStore.itemCount) }}</span>
          </div>

          <ul role="list" class="space-y-6">
            <TransitionGroup name="list">
              <li
                v-for="item in cartStore.items"
                :key="item.variantId || item.productId"
                class="bg-white border-4 border-black p-4 flex gap-6 relative group hover:-translate-y-1 hover:shadow-[8px_8px_0_0_var(--brand)] transition-all"
              >
                <div class="w-32 aspect-square border-2 border-black bg-gray-100 flex-shrink-0 overflow-hidden">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.title"
                    class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                  >
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50"
                  >
                    <Icon name="lucide:image" class="h-10 w-10" />
                  </div>
                </div>

                <div class="flex-grow flex flex-col justify-between">
                  <div>
                    <div class="flex justify-between items-start">
                      <h3 class="font-street text-2xl uppercase leading-none mb-2">
                        <NuxtLink :to="`/product/${item.slug}`" class="hover:text-brand transition-colors">
                          {{ item.title }}
                        </NuxtLink>
                      </h3>
                      <button
                        type="button"
                        class="text-xs font-mono uppercase underline hover:bg-black hover:text-white px-1 transition-colors"
                        @click="cartStore.removeItem(item.productId, item.variantId)"
                      >
                        <span class="sr-only">{{ storefrontContent.cart.item.remove }}</span>
                        {{ storefrontContent.cart.item.remove }}
                      </button>
                    </div>
                    <p v-if="item.variantId" class="font-mono text-sm text-gray-500 uppercase">
                      {{ storefrontContent.cart.item.variant }}: {{ item.variantId.slice(0,6) }}
                    </p>
                  </div>

                  <div class="flex justify-between items-end mt-4">
                    <div class="flex items-center border-2 border-black">
                      <button
                        :disabled="item.quantity <= 1"
                        class="px-3 py-1 hover:bg-brand font-bold disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        @click="cartStore.updateQuantity(item.productId, item.quantity - 1, item.variantId)"
                      >
                        <Icon name="lucide:minus" class="w-4 h-4" />
                      </button>
                      <span class="px-3 py-1 bg-gray-100 font-mono min-w-[40px] text-center">{{ item.quantity }}</span>
                      <button
                        :disabled="item.quantity >= item.stock"
                        class="px-3 py-1 hover:bg-brand font-bold disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        @click="cartStore.updateQuantity(item.productId, item.quantity + 1, item.variantId)"
                      >
                        <Icon name="lucide:plus" class="w-4 h-4" />
                      </button>
                    </div>
                    <div class="font-mono font-bold text-xl">
                      {{ formatCurrency(item.lineTotal ?? (item.price * item.quantity)) }}
                    </div>
                  </div>
                </div>
              </li>
            </TransitionGroup>
          </ul>
        </section>

        <!-- Summary -->
        <section
          aria-labelledby="summary-heading"
          class="lg:col-span-5 bg-black text-white p-8 border-4 border-black shadow-[12px_12px_0_0_var(--brand)] sticky top-24"
        >
          <h2 id="summary-heading" class="font-street text-4xl mb-8 border-b-2 border-white pb-4">
            {{ storefrontContent.cart.summary.title }}
          </h2>

          <dl class="space-y-4 font-mono uppercase mb-8">
            <div class="flex justify-between">
              <dt class="text-gray-400">{{ storefrontContent.cart.summary.subtotal }}</dt>
              <dd>{{ formatCurrency(cartStore.total) }}</dd>
            </div>
            <div v-if="cartStore.clearanceDiscount > 0" class="flex justify-between text-brand">
              <dt>{{ t('storefront.clearance.discountLine') }}</dt>
              <dd>-{{ formatCurrency(cartStore.clearanceDiscount) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-400">{{ storefrontContent.cart.summary.shipping }}</dt>
              <dd class="text-sm">{{ storefrontContent.cart.summary.shippingHint }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-400">{{ storefrontContent.cart.summary.tax }}</dt>
              <dd>{{ formatCurrency(0) }}</dd>
            </div>
            <div class="flex justify-between text-xl font-bold pt-4 border-t-2 border-white text-brand">
              <dt>{{ storefrontContent.cart.summary.total }}</dt>
              <dd>{{ formatCurrency(cartStore.total - cartStore.clearanceDiscount) }}</dd>
            </div>
          </dl>

          <div class="space-y-4">
            <NuxtLink
              to="/checkout"
              class="block w-full text-center bg-white text-black font-street text-3xl uppercase py-4 border-2 border-transparent hover:bg-brand hover:border-black transition-all"
            >
              {{ storefrontContent.cart.actions.proceedToCheckout }}
            </NuxtLink>

            <NuxtLink
              to="/products"
              class="block w-full text-center bg-transparent text-white font-mono text-sm uppercase py-3 border-2 border-white hover:bg-white hover:text-black transition-all"
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
