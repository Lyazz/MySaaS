<template>
  <div class="min-h-screen bg-wl-paper py-16 md:py-20 font-wellness text-wl-ink">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div
        v-if="!cartStore.hasItems"
        class="max-w-lg mx-auto text-center py-16 border border-wl-rule bg-wl-card px-8"
      >
        <div class="mx-auto h-16 w-16 border border-wl-rule flex items-center justify-center mb-8">
          <Icon name="lucide:shopping-bag" class="h-7 w-7 text-wl-muted" />
        </div>
        <h2 class="wl-display text-3xl text-wl-ink mb-4">
          {{ storefrontContent.cart.empty.title }}
        </h2>
        <p class="text-wl-muted leading-relaxed mb-10">
          {{ storefrontContent.cart.empty.subtitle }}
        </p>
        <div>
          <NuxtLink
            to="/products"
            class="inline-flex items-center px-10 py-4 wl-label text-wl-paper bg-wl-ink hover:bg-brand-700 transition-colors"
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
          <div class="wl-ruled wl-ruled--start mb-8">
            <h1 class="wl-display text-3xl md:text-[2.5rem] text-wl-ink leading-none flex-shrink-0">
              {{ storefrontContent.cart.title }}
            </h1>
            <span class="wl-label wl-num text-wl-muted flex-shrink-0">{{ storefrontContent.cart.itemsCount(cartStore.itemCount) }}</span>
          </div>

          <ul
            role="list"
            class="border-t border-wl-rule"
          >
            <TransitionGroup name="list">
              <li
                v-for="item in cartStore.items"
                :key="item.variantId || item.productId"
                class="flex py-6 border-b border-wl-rule group"
              >
                <div class="h-28 w-24 flex-shrink-0 overflow-hidden border border-wl-rule bg-wl-card">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.title"
                    class="h-full w-full object-cover object-center"
                  >
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-wl-muted"
                  >
                    <Icon name="lucide:image" class="h-6 w-6" />
                  </div>
                </div>

                <div class="ms-6 flex flex-1 flex-col justify-between min-w-0">
                  <div class="flex justify-between items-start gap-4">
                    <div class="min-w-0 flex-1">
                      <h3 class="wl-display-sm text-lg text-wl-ink mb-1.5">
                        <NuxtLink :to="`/product/${item.slug}`">
                          <span class="wl-underline">{{ item.title }}</span>
                        </NuxtLink>
                      </h3>
                      <p class="wl-label text-wl-muted">
                        {{ item.variantName || storefrontContent.cart.item.standardItem }}
                      </p>
                    </div>
                    <button
                      type="button"
                      class="p-2 -me-2 text-wl-muted hover:text-red-700 transition-colors"
                      @click="cartStore.removeItem(item.productId, item.variantId)"
                    >
                      <span class="sr-only">{{ storefrontContent.cart.item.remove }}</span>
                      <Icon name="lucide:trash-2" class="h-4 w-4" />
                    </button>
                  </div>

                  <div class="flex items-center justify-between pt-4 gap-4">
                     <div class="flex items-center border border-wl-rule">
                      <button
                        :disabled="item.quantity <= 1"
                        class="w-9 h-9 flex items-center justify-center text-wl-muted hover:text-wl-ink hover:bg-wl-card disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        @click="cartStore.updateQuantity(item.productId, item.quantity - 1, item.variantId)"
                      >
                        <Icon name="lucide:minus" class="w-3.5 h-3.5" />
                      </button>
                      <span class="wl-num text-wl-ink font-medium w-9 text-center text-sm border-x border-wl-rule leading-9">{{ item.quantity }}</span>
                      <button
                        :disabled="item.quantity >= item.stock"
                        class="w-9 h-9 flex items-center justify-center text-wl-muted hover:text-wl-ink hover:bg-wl-card disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        @click="cartStore.updateQuantity(item.productId, item.quantity + 1, item.variantId)"
                      >
                        <Icon name="lucide:plus" class="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p class="wl-num text-lg font-medium text-wl-ink">
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
          class="mt-12 bg-wl-card border border-wl-rule px-7 py-8 lg:col-span-5 lg:mt-0 lg:sticky lg:top-28"
        >
          <h2
            id="summary-heading"
            class="wl-label text-wl-muted pb-4 border-b border-wl-rule mb-5"
          >
            {{ storefrontContent.cart.summary.title }}
          </h2>

          <div class="space-y-3.5">
            <div class="flex items-center justify-between gap-4">
              <dt class="text-sm text-wl-muted">
                {{ storefrontContent.cart.summary.subtotal }}
              </dt>
              <dd class="wl-num text-sm font-medium text-wl-ink">
                {{ formatCurrency(cartStore.total) }}
              </dd>
            </div>
            <div v-if="cartStore.clearanceDiscount > 0" class="flex items-center justify-between gap-4">
              <dt class="text-sm font-medium text-amber-800">
                {{ t('storefront.clearance.discountLine') }}
              </dt>
              <dd class="wl-num text-sm font-medium text-amber-800">
                -{{ formatCurrency(cartStore.clearanceDiscount) }}
              </dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-sm text-wl-muted">
                {{ storefrontContent.cart.summary.shipping }}
              </dt>
              <dd class="wl-label text-wl-muted text-end">
                {{ storefrontContent.cart.summary.shippingHint }}
              </dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 border-t border-wl-ruleStrong pt-4 mt-4">
              <dt class="wl-label text-wl-ink">
                {{ storefrontContent.cart.summary.total }}
              </dt>
              <dd class="wl-num wl-display text-2xl text-wl-ink">
                {{ formatCurrency(cartStore.total - cartStore.clearanceDiscount) }}
              </dd>
            </div>
          </div>

          <div class="mt-8 space-y-2">
            <NuxtLink
              to="/checkout"
              class="w-full flex items-center justify-center bg-wl-ink px-8 py-4 wl-label text-wl-paper hover:bg-brand-700 transition-colors"
            >
              {{ storefrontContent.cart.actions.proceedToCheckout }}
            </NuxtLink>

            <NuxtLink
              to="/products"
              class="w-full flex items-center justify-center border border-wl-rule px-8 py-4 wl-label text-wl-muted hover:text-wl-ink hover:border-wl-ink transition-colors"
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
