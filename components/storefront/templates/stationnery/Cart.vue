<template>
  <div class="min-h-screen bg-[#f8faf9] py-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div
        v-if="!cartStore.hasItems"
        class="text-center py-24"
      >
        <div class="mx-auto h-48 w-48 bg-gray-100 rounded-sm flex items-center justify-center mb-8">
          <Icon name="lucide:handbag" class="h-24 w-24 text-gray-400" />
        </div>
        <h2 class="text-3xl font-stationery font-bold text-gray-900 tracking-tight sm:text-4xl">
          {{ storefrontContent.cart.empty.title }}
        </h2>
        <p class="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
          {{ storefrontContent.cart.empty.subtitle }}
        </p>
        <div class="mt-10">
          <NuxtLink
            to="/products"
            class="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-sm shadow-sm text-white bg-brand hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand transition-all duration-200"
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
            <h1 class="text-3xl font-stationery font-bold tracking-tight text-gray-900">
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
                class="flex py-6 sm:py-8 px-6 bg-white rounded-sm shadow-sm border border-stone-200 hover:shadow-md transition-shadow"
              >
                <div class="h-24 w-24 flex-shrink-0 overflow-hidden rounded-sm border border-stone-200 bg-gray-50">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.title"
                    class="h-full w-full object-cover object-center"
                  >
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50"
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
                    <p class="text-xl font-bold text-gray-900">
                      {{ formatCurrency(item.price) }}
                    </p>

                    <div class="flex items-center space-x-3 rtl:space-x-reverse bg-gray-50 rounded-sm px-3 py-1 border border-stone-200">
                      <button
                        :disabled="item.quantity <= 1"
                        class="p-1 rounded-full text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                        @click="cartStore.updateQuantity(item.productId, item.quantity - 1, item.variantId)"
                      >
                        <Icon name="lucide:minus" class="w-4 h-4" />
                      </button>
                      <span class="text-gray-900 font-semibold w-6 text-center text-sm">{{ item.quantity }}</span>
                      <button
                        :disabled="item.quantity >= item.stock"
                        class="p-1 rounded-full text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
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
          class="mt-16 bg-white rounded-sm shadow-md border border-stone-200 px-6 py-8 sm:p-10 lg:col-span-5 lg:mt-0 lg:sticky lg:top-8"
        >
          <h2
            id="summary-heading"
            class="text-2xl font-stationery font-bold text-gray-900"
          >
            {{ storefrontContent.cart.summary.title }}
          </h2>

          <div class="mt-8 space-y-4">
            <div class="flex items-center justify-between border-b border-gray-100 pb-4">
              <dt class="text-base text-gray-600">
                {{ storefrontContent.cart.summary.subtotal }}
              </dt>
              <dd class="text-base font-medium text-gray-900">
                {{ formatCurrency(cartStore.total) }}
              </dd>
            </div>
            <div class="flex items-center justify-between border-b border-gray-100 pb-4">
              <dt class="flex text-base text-gray-600 items-center">
                <span>{{ storefrontContent.cart.summary.shipping }}</span>
              </dt>
              <dd class="text-sm font-medium text-gray-500">
                {{ storefrontContent.cart.summary.shippingHint }}
              </dd>
            </div>
            <div class="flex items-center justify-between border-b border-gray-100 pb-4">
              <dt class="text-base text-gray-600">
                {{ storefrontContent.cart.summary.tax }}
              </dt>
              <dd class="text-base font-medium text-gray-900">
                {{ formatCurrency(0) }}
              </dd>
            </div>
            <div class="flex items-center justify-between pt-4">
              <dt class="text-xl font-bold text-gray-900">
                {{ storefrontContent.cart.summary.total }}
              </dt>
              <dd class="text-2xl font-bold text-brand">
                {{ formatCurrency(cartStore.total) }}
              </dd>
            </div>
          </div>

          <div class="mt-10 space-y-4">
            <NuxtLink
              to="/checkout"
              class="w-full flex items-center justify-center rounded-sm border border-transparent bg-brand px-6 py-4 text-base font-bold text-white shadow-sm hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-all shadow-brand/20 hover:shadow-brand/40"
            >
              {{ storefrontContent.cart.actions.proceedToCheckout }}
            </NuxtLink>
            
            <NuxtLink
              to="/products"
              class="w-full flex items-center justify-center rounded-sm border border-gray-300 bg-white px-6 py-4 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-all"
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
