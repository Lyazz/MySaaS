<template>
  <div class="min-h-screen bg-[#faf5ff] py-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div
        v-if="!cartStore.hasItems"
        class="text-center py-24"
      >
        <div class="mx-auto h-48 w-48 bg-gray-100 rounded-full flex items-center justify-center mb-8">
          <Icon name="lucide:handbag" class="h-24 w-24 text-gray-400" />
        </div>
        <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
          {{ storefrontContent.cart.empty.title }}
        </h2>
        <p class="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
          {{ storefrontContent.cart.empty.subtitle }}
        </p>
        <div class="mt-10">
          <NuxtLink
            to="/products"
            class="inline-flex items-center px-8 py-4 border border-transparent text-base font-black rounded-full text-white bg-brand-500 hover:bg-brand-400 hover:-translate-y-1 shadow-[0_6px_0_0_#7e22ce] active:translate-y-2 active:shadow-none transition-all duration-200"
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
          <div class="flex items-center justify-between border-b border-gray-200 pb-6 mb-6">
            <h1 class="text-3xl font-bold tracking-tight text-gray-900">
              {{ storefrontContent.cart.title }}
            </h1>
            <span class="text-gray-500 text-sm font-medium">{{ storefrontContent.cart.itemsCount(cartStore.itemCount) }}</span>
          </div>

          <ul
            role="list"
            class="space-y-6"
          >
            <TransitionGroup name="list">
              <li
                v-for="item in cartStore.items"
                :key="item.variantId || item.productId"
                class="flex py-6 sm:py-8 px-6 bg-white rounded-[2rem] border-4 border-purple-100 hover:border-brand-200 transition-colors mb-4"
              >
                <div class="h-24 w-24 flex-shrink-0 overflow-hidden rounded-[2rem] border-4 border-purple-100 bg-[#faf5ff] transform -rotate-3">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.title"
                    class="h-full w-full object-cover object-center"
                  >
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-brand-300"
                  >
                    <Icon name="lucide:image" class="h-10 w-10" />
                  </div>
                </div>

                <div class="ml-6 rtl:ml-0 rtl:mr-6 flex flex-1 flex-col">
                  <div class="flex justify-between">
                    <div class="min-w-0 flex-1">
                      <h3 class="text-lg font-medium text-gray-900 hover:text-brand transition-colors">
                        <NuxtLink :to="`/p/${item.slug}`">
                          {{ item.title }}
                        </NuxtLink>
                      </h3>
                      <p class="mt-1 text-sm text-gray-500 line-clamp-1">
                        <template v-if="item.variantId">{{ storefrontContent.cart.item.variant }}: {{ item.variantId.slice(0, 8) }}</template>
                        <template v-else>{{ storefrontContent.cart.item.standardItem }}</template>
                      </p>
                    </div>
                    <div class="ml-4 rtl:ml-0 rtl:mr-4 flow-root flex-shrink-0">
                      <button
                        type="button"
                        class="-m-2.5 flex items-center justify-center bg-transparent p-2.5 text-gray-400 hover:text-red-500 transition-colors"
                        @click="cartStore.removeItem(item.productId, item.variantId)"
                      >
                        <span class="sr-only">{{ storefrontContent.cart.item.remove }}</span>
                        <Icon name="lucide:trash" class="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div class="flex flex-1 items-end justify-between pt-4">
                    <p class="text-xl font-black text-brand-600">
                      {{ formatCurrency(item.price) }}
                    </p>

                    <div class="flex items-center space-x-3 rtl:space-x-reverse bg-purple-50 rounded-full p-1 border-2 border-purple-100">
                      <button
                        :disabled="item.quantity <= 1"
                        class="w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-700 font-black shadow-sm disabled:opacity-30 transition-colors"
                        @click="cartStore.updateQuantity(item.productId, item.quantity - 1, item.variantId)"
                      >
                        <Icon name="lucide:minus" class="w-4 h-4 stroke-[3]" />
                      </button>
                      <span class="text-[#4c1d95] font-black w-6 text-center text-sm">{{ item.quantity }}</span>
                      <button
                        :disabled="item.quantity >= item.stock"
                        class="w-8 h-8 flex items-center justify-center rounded-full bg-brand-500 text-white shadow-sm disabled:opacity-30 transition-colors"
                        @click="cartStore.updateQuantity(item.productId, item.quantity + 1, item.variantId)"
                      >
                        <Icon name="lucide:plus" class="w-4 h-4 stroke-[3]" />
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
          class="mt-16 bg-white rounded-[2rem] border-4 border-purple-100 px-6 py-8 sm:p-10 lg:col-span-5 lg:mt-0 lg:sticky lg:top-8"
        >
          <h2
            id="summary-heading"
            class="text-2xl font-bold text-gray-900"
          >
            {{ storefrontContent.cart.summary.title }}
          </h2>

            <div class="mt-8 space-y-4">
              <div class="flex items-center justify-between border-b-2 border-dashed border-purple-100 pb-4">
                <dt class="text-base font-bold text-slate-600">
                  {{ storefrontContent.cart.summary.subtotal }}
                </dt>
                <dd class="text-base font-black text-[#4c1d95]">
                  {{ formatCurrency(cartStore.total) }}
                </dd>
              </div>
              <div class="flex items-center justify-between border-b-2 border-dashed border-purple-100 pb-4">
                <dt class="flex flex-col text-sm text-slate-500 font-bold">
                  <span>{{ storefrontContent.cart.summary.shipping }}</span>
                  <span class="text-xs font-medium">{{ storefrontContent.cart.summary.shippingHint }}</span>
                </dt>
                <dd class="text-sm font-black text-brand-500">
                  Calculated at checkout
                </dd>
              </div>
              <div class="flex items-center justify-between border-b-2 border-dashed border-purple-100 pb-4">
                <dt class="text-base font-bold text-slate-600">
                  {{ storefrontContent.cart.summary.tax }}
                </dt>
                <dd class="text-base font-black text-[#4c1d95]">
                  {{ formatCurrency(0) }}
                </dd>
              </div>
              <div class="flex items-center justify-between pt-4 bg-[#faf5ff] p-4 rounded-full border-4 border-purple-100">
                <dt class="text-xl font-black text-[#4c1d95] uppercase tracking-wider">
                  {{ storefrontContent.cart.summary.total }}
                </dt>
                <dd class="text-2xl font-black text-brand-600 font-display">
                  {{ formatCurrency(cartStore.total) }}
                </dd>
              </div>
            </div>

          <div class="mt-10 space-y-4">
            <NuxtLink
              to="/checkout"
              class="w-full flex justify-center py-4 bg-[#fbbf24] text-amber-900 font-black rounded-full hover:bg-amber-300 hover:-translate-y-1 shadow-[0_6px_0_0_#d97706] active:translate-y-2 active:shadow-none transition-all items-center gap-2 text-lg"
            >
              🎉 {{ storefrontContent.cart.actions.proceedToCheckout }}
            </NuxtLink>
            
            <NuxtLink
              to="/products"
              class="w-full flex items-center justify-center rounded-full border-4 border-purple-100 bg-white px-6 py-4 text-base font-black text-slate-700 hover:bg-purple-50 transition-all"
            >
              {{ storefrontContent.actions.continueShopping }}
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
const storefrontContent = useStorefrontContent()
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
