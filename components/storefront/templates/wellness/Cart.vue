<template>
  <div class="min-h-screen bg-stone-50 py-20 font-wellness text-stone-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div
        v-if="!cartStore.hasItems"
        class="text-center py-24"
      >
        <div class="mx-auto h-48 w-48 bg-white rounded-full flex items-center justify-center mb-8 shadow-sm border border-stone-100">
          <Icon name="lucide:shopping-bag" class="h-20 w-20 text-stone-300" />
        </div>
        <h2 class="text-4xl font-wellness text-stone-900 mb-4">
          {{ storefrontContent.cart.empty.title }}
        </h2>
        <p class="max-w-xl mx-auto text-lg text-stone-500 font-light mb-10">
          {{ storefrontContent.cart.empty.subtitle }}
        </p>
        <div>
          <NuxtLink
            to="/products"
            class="inline-flex items-center px-10 py-4 text-base font-medium rounded-full shadow-lg text-white bg-stone-900 hover:bg-brand-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            {{ storefrontContent.cart.empty.cta }}
          </NuxtLink>
        </div>
      </div>

      <div
        v-else
        class="lg:grid lg:grid-cols-12 lg:gap-x-16 lg:items-start"
      >
        <section class="lg:col-span-7">
          <div class="flex items-end justify-between border-b border-stone-200 pb-6 mb-10">
            <h1 class="text-4xl font-wellness text-stone-900">
              {{ storefrontContent.cart.title }}
            </h1>
            <span class="text-stone-500 font-medium bg-stone-100 px-4 py-1 rounded-full text-sm">{{ storefrontContent.cart.itemsCount(cartStore.itemCount) }}</span>
          </div>

          <ul
            role="list"
            class="space-y-6"
          >
            <TransitionGroup name="list">
              <li
                v-for="item in cartStore.items"
                :key="item.variantId || item.productId"
                class="flex py-8 px-8 bg-white rounded-[2rem] shadow-sm border border-stone-100 hover:shadow-md transition-all duration-300 group"
              >
                <div class="h-32 w-28 flex-shrink-0 overflow-hidden rounded-2xl border border-stone-100 bg-stone-50">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.title"
                    class="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  >
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-stone-300 bg-stone-50"
                  >
                    <Icon name="lucide:image" class="h-8 w-8" />
                  </div>
                </div>

                <div class="ml-8 rtl:ml-0 rtl:mr-8 flex flex-1 flex-col justify-between">
                  <div class="flex justify-between items-start">
                    <div class="min-w-0 flex-1">
                      <h3 class="text-xl font-wellness text-stone-900 hover:text-brand-700 transition-colors mb-2">
                        <NuxtLink :to="`/product/${item.slug}`">
                          {{ item.title }}
                        </NuxtLink>
                      </h3>
                      <p class="text-sm text-stone-500 font-light">
                        {{ item.variantName || storefrontContent.cart.item.standardItem }}
                      </p>
                    </div>
                    <button
                      type="button"
                      class="-m-2 p-3 text-stone-400 hover:text-red-500 transition-colors rounded-full hover:bg-stone-50"
                      @click="cartStore.removeItem(item.productId, item.variantId)"
                    >
                      <span class="sr-only">{{ storefrontContent.cart.item.remove }}</span>
                      <Icon name="lucide:trash-2" class="h-5 w-5" />
                    </button>
                  </div>

                  <div class="flex items-center justify-between pt-4">
                     <div class="flex items-center space-x-4 rtl:space-x-reverse bg-stone-50 rounded-full px-4 py-2 border border-stone-200">
                      <button
                        :disabled="item.quantity <= 1"
                        class="text-stone-400 hover:text-stone-900 disabled:opacity-30 disabled:hover:text-stone-400 transition-colors"
                        @click="cartStore.updateQuantity(item.productId, item.quantity - 1, item.variantId)"
                      >
                        <Icon name="lucide:minus" class="w-4 h-4" />
                      </button>
                      <span class="text-stone-900 font-medium w-4 text-center text-sm">{{ item.quantity }}</span>
                      <button
                        :disabled="item.quantity >= item.stock"
                        class="text-stone-400 hover:text-stone-900 disabled:opacity-30 disabled:hover:text-stone-400 transition-colors"
                        @click="cartStore.updateQuantity(item.productId, item.quantity + 1, item.variantId)"
                      >
                        <Icon name="lucide:plus" class="w-4 h-4" />
                      </button>
                    </div>

                    <p class="text-xl font-wellness text-stone-900">
                      {{ formatCurrency(item.lineTotal ?? (item.price * item.quantity)) }}
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
          class="mt-16 bg-white rounded-[2.5rem] shadow-lg border border-stone-100 px-8 py-10 lg:col-span-5 lg:mt-0 lg:sticky lg:top-32"
        >
          <h2
            id="summary-heading"
            class="text-2xl font-wellness text-stone-900 mb-8"
          >
            {{ storefrontContent.cart.summary.title }}
          </h2>

          <div class="space-y-4">
            <div class="flex items-center justify-between border-b border-stone-100 pb-4">
              <dt class="text-stone-600">
                {{ storefrontContent.cart.summary.subtotal }}
              </dt>
              <dd class="font-medium text-stone-900">
                {{ formatCurrency(cartStore.total) }}
              </dd>
            </div>
            <div class="flex items-center justify-between border-b border-stone-100 pb-4">
              <dt class="flex items-center text-stone-500 font-light">
                <span>{{ storefrontContent.cart.summary.shipping }}</span>
              </dt>
              <dd class="text-sm font-medium text-stone-400 italic">
                {{ storefrontContent.cart.summary.shippingHint }}
              </dd>
            </div>
            <div class="flex items-center justify-between pt-4">
              <dt class="text-xl font-wellness text-stone-900">
                {{ storefrontContent.cart.summary.total }}
              </dt>
              <dd class="text-3xl font-wellness text-stone-900">
                {{ formatCurrency(cartStore.total) }}
              </dd>
            </div>
          </div>

          <div class="mt-10 space-y-4">
            <NuxtLink
              to="/checkout"
              class="w-full flex items-center justify-center rounded-full bg-stone-900 px-8 py-4 text-base font-bold text-white shadow-lg hover:bg-brand-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
            >
              {{ storefrontContent.cart.actions.proceedToCheckout }}
            </NuxtLink>
            
            <NuxtLink
              to="/products"
              class="w-full flex items-center justify-center rounded-full border border-stone-200 bg-white px-8 py-4 text-base font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all duration-300"
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
