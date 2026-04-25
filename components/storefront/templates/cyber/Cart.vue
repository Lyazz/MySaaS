<template>
  <div class="synthwave-cart min-h-screen py-12 relative">
    <!-- Synthwave Background -->
    <div class="fixed inset-0 z-0 pointer-events-none">
      <div class="absolute inset-0 bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0515]"></div>
      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[40%] bg-gradient-to-t from-[#ff2d95]/15 via-[#ff6b35]/5 to-transparent"></div>
      <div class="absolute bottom-0 left-0 right-0 h-[30%] bg-[linear-gradient(rgba(255,45,149,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,45,149,0.1)_1px,transparent_1px)] bg-[size:30px_30px] [perspective:500px] [transform:rotateX(60deg)] origin-bottom opacity-40"></div>
    </div>

    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div
        v-if="!cartStore.hasItems"
        class="text-center py-24"
      >
        <div class="mx-auto h-48 w-48 bg-gradient-to-br from-purple-900/50 to-pink-900/30 rounded-full flex items-center justify-center mb-8 border border-pink-500/30 shadow-[0_0_40px_rgba(255,45,149,0.2)]">
          <Icon name="lucide:handbag" class="h-24 w-24 text-pink-400/60" />
        </div>
        <h2 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 tracking-tight sm:text-4xl">
          {{ storefrontContent.cart.empty.title }}
        </h2>
        <p class="mt-4 max-w-2xl mx-auto text-xl text-purple-200/60">
          {{ storefrontContent.cart.empty.subtitle }}
        </p>
        <div class="mt-10">
          <NuxtLink
            to="/products"
            class="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-full shadow-lg text-white bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all duration-200 shadow-pink-500/30"
          >
            {{ storefrontContent.cart.empty.cta }}
          </NuxtLink>
        </div>
      </div>

      <div
        v-else
        class="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start xl:gap-x-16"
      >
        <section class="lg:col-span-7">
          <div class="flex items-center justify-between border-b border-pink-500/30 pb-6 mb-6">
            <h1 class="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">
              {{ storefrontContent.cart.title }}
            </h1>
            <span class="text-purple-300/70 text-sm font-medium">{{ storefrontContent.cart.itemsCount(cartStore.itemCount) }}</span>
          </div>

          <ul
            role="list"
            class="space-y-6"
          >
            <TransitionGroup name="list">
              <li
                v-for="item in cartStore.items"
                :key="item.variantId || item.productId"
                class="flex py-6 sm:py-8 px-6 bg-[#1a0a2e]/90 rounded-2xl border border-purple-500/30 hover:border-pink-500/50 transition-all backdrop-blur-sm relative overflow-hidden group"
              >
                <!-- Glow on hover -->
                <div class="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div class="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-purple-500/30 bg-purple-900/30 relative">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.title"
                    class="h-full w-full object-cover object-center"
                  >
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-purple-400/50"
                  >
                    <Icon name="lucide:image" class="h-10 w-10" />
                  </div>
                </div>

                <div class="ml-6 rtl:ml-0 rtl:mr-6 flex flex-1 flex-col relative z-10">
                  <div class="flex justify-between">
                    <div class="min-w-0 flex-1">
                      <h3 class="text-lg font-medium text-white hover:text-pink-400 transition-colors">
                        <NuxtLink :to="`/product/${item.slug}`">
                          {{ item.title }}
                        </NuxtLink>
                      </h3>
                      <p v-if="item.variantId" class="mt-1 text-sm text-purple-400/60">
                        {{ storefrontContent.cart.item.variant }}: {{ item.variantId.slice(0,8) }}
                      </p>
                    </div>
                    <div class="ml-4 rtl:ml-0 rtl:mr-4 flow-root flex-shrink-0">
                      <button
                        type="button"
                        class="-m-2.5 flex items-center justify-center bg-transparent p-2.5 text-purple-400/60 hover:text-red-400 transition-colors"
                        @click="cartStore.removeItem(item.productId, item.variantId)"
                      >
                        <span class="sr-only">{{ storefrontContent.cart.item.remove }}</span>
                        <Icon name="lucide:trash" class="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div class="flex flex-1 items-end justify-between pt-4">
                    <p class="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">
                      {{ formatCurrency(item.price) }}
                    </p>

                    <div class="flex items-center space-x-3 rtl:space-x-reverse bg-purple-900/50 rounded-full px-3 py-1 border border-purple-500/30">
                      <button
                        :disabled="item.quantity <= 1"
                        class="p-1 rounded-full text-purple-300/70 hover:text-pink-400 disabled:opacity-30 disabled:hover:text-purple-300/70 transition-colors"
                        @click="cartStore.updateQuantity(item.productId, item.quantity - 1, item.variantId)"
                      >
                        <Icon name="lucide:minus" class="w-4 h-4" />
                      </button>
                      <span class="text-white font-semibold w-6 text-center text-sm">{{ item.quantity }}</span>
                      <button
                        :disabled="item.quantity >= item.stock"
                        class="p-1 rounded-full text-purple-300/70 hover:text-pink-400 disabled:opacity-30 disabled:hover:text-purple-300/70 transition-colors"
                        @click="cartStore.updateQuantity(item.productId, item.quantity + 1, item.variantId)"
                      >
                        <Icon name="lucide:plus" class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            </TransitionGroup>
          </ul>
        </section>

        <!-- Order Summary -->
        <section
          aria-labelledby="summary-heading"
          class="mt-16 lg:col-span-5 lg:mt-0 lg:sticky lg:top-8"
        >
          <div class="relative">
            <div class="absolute -inset-1 bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-cyan-500/30 rounded-2xl blur"></div>
            <div class="relative bg-[#1a0a2e]/95 rounded-2xl border border-pink-500/30 px-6 py-8 sm:p-10 backdrop-blur-sm">
              <h2
                id="summary-heading"
                class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400"
              >
                {{ storefrontContent.cart.summary.title }}
              </h2>

              <div class="mt-8 space-y-4">
                <div class="flex items-center justify-between border-b border-purple-500/20 pb-4">
                  <dt class="text-base text-purple-200/70">
                    {{ storefrontContent.cart.summary.subtotal }}
                  </dt>
                  <dd class="text-base font-medium text-white">
                    {{ formatCurrency(cartStore.total) }}
                  </dd>
                </div>
                <div class="flex items-center justify-between border-b border-purple-500/20 pb-4">
                  <dt class="flex text-base text-purple-200/70 items-center">
                    <span>{{ storefrontContent.cart.summary.shipping }}</span>
                  </dt>
                  <dd class="text-sm font-medium text-cyan-400">
                    {{ storefrontContent.cart.summary.shippingHint }}
                  </dd>
                </div>
                <div class="flex items-center justify-between border-b border-purple-500/20 pb-4">
                  <dt class="text-base text-purple-200/70">
                    {{ storefrontContent.cart.summary.tax }}
                  </dt>
                  <dd class="text-base font-medium text-white">
                    {{ formatCurrency(0) }}
                  </dd>
                </div>
                <div class="flex items-center justify-between pt-4">
                  <dt class="text-xl font-bold text-white">
                    {{ storefrontContent.cart.summary.total }}
                  </dt>
                  <dd class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">
                    {{ formatCurrency(cartStore.total) }}
                  </dd>
                </div>
              </div>

              <div class="mt-10 space-y-4">
                <NuxtLink
                  to="/checkout"
                  class="w-full flex items-center justify-center rounded-full border border-transparent bg-gradient-to-r from-pink-500 to-orange-500 px-6 py-4 text-base font-bold text-white shadow-lg hover:from-pink-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all shadow-pink-500/30 uppercase tracking-wide"
                >
                  {{ storefrontContent.cart.actions.proceedToCheckout }}
                </NuxtLink>
                
                <NuxtLink
                  to="/products"
                  class="w-full flex items-center justify-center rounded-full border border-purple-500/50 bg-transparent px-6 py-4 text-base font-medium text-purple-200 hover:bg-purple-900/30 hover:border-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all"
                >
                  {{ storefrontContent.actions.continueShopping }}
                </NuxtLink>
              </div>
            </div>
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
const storefrontContent = useStorefrontContent()
const { currencyCode, format: formatCurrency } = useCurrency()
</script>

<style scoped>
.synthwave-cart {
    font-family: 'Inter', system-ui, sans-serif;
}

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
