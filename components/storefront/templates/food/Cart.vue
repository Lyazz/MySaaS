<template>
  <div class="min-h-screen bg-[#f8faf9] py-12 font-sans selection:bg-brand-100 selection:text-brand-900">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div
        v-if="!cartStore.hasItems"
        class="text-center py-24"
      >
        <div class="mx-auto h-48 w-48 bg-white border border-stone-100 rounded-full flex items-center justify-center mb-8 shadow-sm">
          <Icon name="lucide:shopping-basket" class="h-24 w-24 text-stone-300" />
        </div>
        <h2 class="text-3xl font-extrabold text-stone-900 tracking-tight sm:text-4xl">
          {{ storefrontContent.cart.empty.title }}
        </h2>
        <p class="mt-4 max-w-2xl mx-auto text-xl text-stone-500">
          {{ storefrontContent.cart.empty.subtitle }}
        </p>
        <div class="mt-10">
          <NuxtLink
            to="/products"
            class="inline-flex items-center px-10 py-4 border border-transparent text-lg font-bold rounded-full shadow-lg text-white bg-stone-900 hover:bg-brand-600 focus:outline-none transition-all duration-200 active:scale-95"
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
          <div class="flex items-center justify-between border-b border-dashed border-stone-300 pb-6 mb-8">
            <h1 class="text-4xl font-bold tracking-tight text-stone-900">
              {{ storefrontContent.cart.title }}
            </h1>
            <span class="text-brand-600 font-bold bg-brand-50 px-3 py-1 rounded-full text-sm border border-brand-100">{{ storefrontContent.cart.itemsCount(cartStore.itemCount) }}</span>
          </div>

          <ul
            role="list"
            class="space-y-6"
          >
            <TransitionGroup name="list">
              <li
                v-for="item in cartStore.items"
                :key="item.variantId || item.productId"
                class="flex py-6 px-6 bg-white rounded-3xl shadow-sm border border-stone-100 hover:shadow-md transition-shadow group relative overflow-hidden"
              >
                <!-- Decorative corner fold or distinct marker -->
                <div class="absolute top-0 start-0 w-2 h-full bg-brand-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div class="h-28 w-28 flex-shrink-0 overflow-hidden rounded-2xl border border-stone-100 bg-stone-50 relative">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.title"
                    class="h-full w-full object-cover object-center transform group-hover:scale-110 transition-transform duration-500"
                  >
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-stone-400 bg-stone-50"
                  >
                    <Icon name="lucide:image" class="h-10 w-10" />
                  </div>
                </div>

                <div class="ms-6 flex flex-1 flex-col justify-between">
                  <div class="flex justify-between items-start">
                    <div class="min-w-0 flex-1 pe-4">
                      <h3 class="text-xl font-bold text-stone-900 hover:text-brand-600 transition-colors leading-tight">
                        <NuxtLink :to="`/product/${item.slug}`">
                          {{ item.title }}
                        </NuxtLink>
                      </h3>
                      <p class="mt-2 text-sm text-stone-500 font-medium">
                         {{ item.category }}
                      </p>
                    </div>
                    
                    <button
                        type="button"
                        class="text-stone-300 hover:text-red-500 transition-colors p-2 -me-2 rtl:-mr-0 rtl:-ml-2"
                        @click="cartStore.removeItem(item.productId, item.variantId)"
                      >
                        <span class="sr-only">{{ storefrontContent.cart.item.remove }}</span>
                        <Icon name="lucide:trash-2" class="h-5 w-5" />
                    </button>
                  </div>

                  <div class="flex flex-1 items-end justify-between pt-4">
                    <p class="text-2xl font-bold text-stone-900">
                      {{ formatCurrency(item.price) }}
                    </p>

                    <div class="flex items-center space-x-1 rtl:space-x-reverse bg-stone-100 rounded-full p-1 border border-stone-200">
                      <button
                        :disabled="item.quantity <= 1"
                        class="w-8 h-8 flex items-center justify-center rounded-full bg-white text-stone-900 shadow-sm hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all"
                        @click="cartStore.updateQuantity(item.productId, item.quantity - 1, item.variantId)"
                      >
                        <Icon name="lucide:minus" class="w-3.5 h-3.5" />
                      </button>
                      <span class="text-stone-900 font-bold w-8 text-center text-sm">{{ item.quantity }}</span>
                      <button
                        :disabled="item.quantity >= item.stock"
                        class="w-8 h-8 flex items-center justify-center rounded-full bg-stone-900 text-white shadow-sm hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all"
                        @click="cartStore.updateQuantity(item.productId, item.quantity + 1, item.variantId)"
                      >
                        <Icon name="lucide:plus" class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            </TransitionGroup>
          </ul>
        </section>

        <!-- Order Summary (Receipt Style) -->
        <section
          aria-labelledby="summary-heading"
          class="mt-16 lg:mt-0 lg:col-span-5 lg:sticky lg:top-24"
        >
          <div class="bg-white p-8 shadow-xl relative ticket-container">
            <!-- Jagged Top (Simulated with CSS gradient or just simple border) -->
             <div class="absolute top-0 left-0 right-0 h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAxMCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ibm9uZSI+PHBhdGggZD0iTTAgMTBMMTAgMEwyMCAxMEgweiIgZmlsbD0iI2Y4ZmFmOSIvPjwvc3ZnPg==')] bg-repeat-x bg-[length:20px_10px] transform -translate-y-full"></div>
            
             <!-- Punch Hole -->
             <div class="absolute top-6 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-[#f8faf9] rounded-full border border-stone-200/30"></div>

            <h2
              id="summary-heading"
              class="text-2xl font-bold text-stone-900 text-center mb-8 border-b-2 border-stone-900 pb-4 uppercase tracking-widest pt-4"
            >
              {{ storefrontContent.cart.summary.title }}
            </h2>

            <div class="space-y-4 text-sm">
              <div class="flex items-center justify-between border-b border-dashed border-stone-300 pb-4">
                <dt class="text-stone-600">
                  {{ storefrontContent.cart.summary.subtotal }}
                </dt>
                <dd class="font-bold text-stone-900">
                  {{ formatCurrency(cartStore.total) }}
                </dd>
              </div>
              <div v-if="cartStore.clearanceDiscount > 0" class="flex items-center justify-between border-b border-dashed border-stone-300 pb-4">
                <dt class="text-amber-700">
                  {{ t('storefront.clearance.discountLine') }}
                </dt>
                <dd class="font-bold text-amber-700">
                  -{{ formatCurrency(cartStore.clearanceDiscount) }}
                </dd>
              </div>
              <div class="flex items-center justify-between border-b border-dashed border-stone-300 pb-4">
                <dt class="flex items-center text-stone-600">
                  <span>{{ storefrontContent.cart.summary.shipping }}</span>
                </dt>
                <dd class="text-stone-500 italic">
                  {{ storefrontContent.cart.summary.shippingHint }}
                </dd>
              </div>
              <div class="flex items-center justify-between border-b border-dashed border-stone-300 pb-4">
                <dt class="text-stone-600">
                  {{ storefrontContent.cart.summary.tax }}
                </dt>
                <dd class="font-bold text-stone-900">
                  {{ formatCurrency(0) }}
                </dd>
              </div>
              
              <!-- Total -->
              <div class="flex items-center justify-between pt-4 pb-8">
                <dt class="text-xl font-bold text-stone-900 uppercase">
                  {{ storefrontContent.cart.summary.total }}
                </dt>
                <dd class="text-2xl font-bold text-stone-900">
                  {{ formatCurrency(cartStore.total - cartStore.clearanceDiscount) }}
                </dd>
              </div>
            </div>

            <div class="space-y-4 relative z-10">
              <NuxtLink
                to="/checkout"
                class="w-full flex items-center justify-center rounded-[2rem] border border-transparent bg-stone-900 px-6 py-4 text-base font-bold text-white shadow-lg hover:bg-brand-600 focus:outline-none transition-all hover:scale-[1.02] active:scale-95 flex gap-2"
              >
                <span>{{ storefrontContent.cart.actions.proceedToCheckout }}</span>
                <Icon name="lucide:arrow-right" class="w-5 h-5 rtl:rotate-180" />
              </NuxtLink>
              
              <NuxtLink
                to="/products"
                class="w-full flex items-center justify-center rounded-[2rem] border-2 border-stone-200 bg-transparent px-6 py-4 text-base font-bold text-stone-600 shadow-sm hover:bg-stone-50 focus:outline-none transition-all hover:border-stone-300"
              >
                {{ storefrontContent.actions.continueShopping }}
              </NuxtLink>
            </div>
            
             <!-- Jagged Bottom -->
             <div class="absolute bottom-0 left-0 right-0 h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAxMCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ibm9uZSI+PHBhdGggZD0iTTAgMEwxMCAxMEwyMCAwSDB6IiBmaWxsPSIjZjhmYWY5Ii8+PC9zdmc+')] bg-repeat-x bg-[length:20px_10px] transform translate-y-full"></div>
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
const { t } = useI18n({ useScope: 'global' })
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
