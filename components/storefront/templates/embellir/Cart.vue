<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const storefrontContent = useStorefrontContent()
const { format: formatCurrency } = useCurrency()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div class="min-h-screen bg-[#F2ECE1] py-12 md:py-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Empty -->
      <div v-if="!cartStore.hasItems" class="text-center py-20 md:py-28">
        <span class="emb-star w-16 h-16 text-[#CBBDAB] mx-auto mb-8" />
        <h1 class="emb-display text-3xl sm:text-[42px] leading-tight text-[#16211E]">
          {{ storefrontContent.cart.empty.title }}
        </h1>
        <p class="mt-4 max-w-md mx-auto text-[#5A6763]">
          {{ storefrontContent.cart.empty.subtitle }}
        </p>
        <NuxtLink
          to="/products"
          class="group mt-10 inline-flex items-center gap-3 h-12 px-8 bg-brand-600 text-[#FDFAF4] emb-label hover:bg-[#DFA254] hover:text-[#062622] transition-colors"
        >
          {{ storefrontContent.cart.empty.cta }}
          <Icon name="lucide:arrow-right" class="w-4 h-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180" />
        </NuxtLink>
      </div>

      <div v-else class="lg:grid lg:grid-cols-12 lg:gap-12 lg:items-start">
        <!-- Items -->
        <section class="lg:col-span-7">
          <div class="flex items-end justify-between gap-4 pb-5 mb-6 border-b border-[#CBBDAB]">
            <h1 class="emb-display text-3xl md:text-[40px] leading-none text-[#16211E]">
              {{ storefrontContent.cart.title }}
            </h1>
            <span class="emb-label text-[#8E9793] whitespace-nowrap">{{ storefrontContent.cart.itemsCount(cartStore.itemCount) }}</span>
          </div>

          <ul role="list" class="flex flex-col gap-px bg-[#CBBDAB] border border-[#CBBDAB]">
            <TransitionGroup name="list">
              <li
                v-for="item in cartStore.items"
                :key="item.variantId || item.productId"
                class="flex gap-4 sm:gap-6 bg-[#FDFAF4] p-4 sm:p-5"
              >
                <div class="h-24 w-24 flex-shrink-0 overflow-hidden border border-[#CBBDAB] bg-[#F2ECE1]">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.title"
                    class="h-full w-full object-cover object-center"
                  >
                  <div v-else class="w-full h-full flex items-center justify-center text-[#CBBDAB]">
                    <Icon name="lucide:image" class="h-8 w-8" />
                  </div>
                </div>

                <div class="flex flex-1 flex-col min-w-0">
                  <div class="flex justify-between gap-3">
                    <div class="min-w-0">
                      <h3 class="text-base font-medium text-[#16211E] hover:text-brand-700 transition-colors">
                        <NuxtLink :to="`/product/${item.slug}`">{{ item.title }}</NuxtLink>
                      </h3>
                      <p class="mt-1 text-xs text-[#8E9793] line-clamp-1">
                        <template v-if="item.variantId">{{ storefrontContent.cart.item.variant }}: {{ item.variantId.slice(0, 8) }}</template>
                        <template v-else>{{ storefrontContent.cart.item.standardItem }}</template>
                      </p>
                    </div>
                    <button
                      type="button"
                      class="shrink-0 h-8 w-8 -me-1 flex items-center justify-center text-[#8E9793] hover:text-[#B4593F] transition-colors"
                      @click="cartStore.removeItem(item.productId, item.variantId)"
                    >
                      <span class="sr-only">{{ storefrontContent.cart.item.remove }}</span>
                      <Icon name="lucide:trash-2" class="h-4 w-4" />
                    </button>
                  </div>

                  <div class="flex flex-1 items-end justify-between gap-3 pt-4">
                    <span class="emb-display text-xl text-brand-700 tabular-nums">
                      {{ formatCurrency(item.price) }}
                    </span>

                    <div class="flex items-stretch gap-px bg-[#CBBDAB] border border-[#CBBDAB] shrink-0">
                      <button
                        type="button"
                        :disabled="item.quantity <= 1"
                        class="w-9 h-9 flex items-center justify-center bg-[#FDFAF4] text-[#16211E] hover:bg-brand-600 hover:text-[#FDFAF4] transition-colors disabled:bg-[#F2ECE1] disabled:text-[#B3AA9E] disabled:cursor-not-allowed"
                        :aria-label="storefrontContent.productForm.quantity.label"
                        @click="cartStore.updateQuantity(item.productId, item.quantity - 1, item.variantId)"
                      >
                        <Icon name="lucide:minus" class="w-3.5 h-3.5" />
                      </button>
                      <span class="w-10 h-9 flex items-center justify-center bg-[#FDFAF4] text-sm font-semibold text-[#16211E] tabular-nums">{{ item.quantity }}</span>
                      <button
                        type="button"
                        :disabled="item.quantity >= item.stock"
                        class="w-9 h-9 flex items-center justify-center bg-[#FDFAF4] text-[#16211E] hover:bg-brand-600 hover:text-[#FDFAF4] transition-colors disabled:bg-[#F2ECE1] disabled:text-[#B3AA9E] disabled:cursor-not-allowed"
                        :aria-label="storefrontContent.productForm.quantity.label"
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

        <!-- Summary -->
        <section
          aria-labelledby="summary-heading"
          class="mt-12 lg:mt-0 lg:col-span-5 lg:sticky lg:top-28"
        >
          <div class="border border-[#CBBDAB] bg-[#FDFAF4]">
            <h2 id="summary-heading" class="emb-display text-2xl text-[#FDFAF4] bg-brand-600 px-6 py-5">
              {{ storefrontContent.cart.summary.title }}
            </h2>

            <dl class="p-6 space-y-4">
              <div class="flex items-center justify-between pb-4 border-b border-[#CBBDAB]">
                <dt class="text-sm text-[#5A6763]">{{ storefrontContent.cart.summary.subtotal }}</dt>
                <dd class="text-sm font-semibold text-[#16211E] tabular-nums">{{ formatCurrency(cartStore.total) }}</dd>
              </div>
              <div v-if="cartStore.clearanceDiscount > 0" class="flex items-center justify-between pb-4 border-b border-[#CBBDAB]">
                <dt class="text-sm text-[#8A5A18]">{{ t('storefront.clearance.discountLine') }}</dt>
                <dd class="text-sm font-semibold text-[#8A5A18] tabular-nums">-{{ formatCurrency(cartStore.clearanceDiscount) }}</dd>
              </div>
              <div class="flex items-center justify-between pb-4 border-b border-[#CBBDAB]">
                <dt class="text-sm text-[#5A6763]">{{ storefrontContent.cart.summary.shipping }}</dt>
                <dd class="text-xs text-[#8E9793]">{{ storefrontContent.cart.summary.shippingHint }}</dd>
              </div>
              <div class="flex items-center justify-between pb-4 border-b border-[#CBBDAB]">
                <dt class="text-sm text-[#5A6763]">{{ storefrontContent.cart.summary.tax }}</dt>
                <dd class="text-sm font-semibold text-[#16211E] tabular-nums">{{ formatCurrency(0) }}</dd>
              </div>
              <div class="flex items-baseline justify-between pt-1">
                <dt class="emb-label text-[#16211E]">{{ storefrontContent.cart.summary.total }}</dt>
                <dd class="emb-display text-3xl text-brand-700 tabular-nums">
                  {{ formatCurrency(cartStore.total - cartStore.clearanceDiscount) }}
                </dd>
              </div>
            </dl>

            <div class="px-6 pb-6 space-y-3">
              <NuxtLink
                to="/checkout"
                class="w-full flex items-center justify-center gap-2.5 py-4 bg-brand-600 text-[#FDFAF4] emb-label hover:bg-[#DFA254] hover:text-[#062622] transition-colors"
              >
                {{ storefrontContent.cart.actions.proceedToCheckout }}
                <Icon name="lucide:arrow-right" class="w-4 h-4 rtl:rotate-180" />
              </NuxtLink>

              <NuxtLink
                to="/products"
                class="w-full flex items-center justify-center py-4 border border-[#CBBDAB] text-[#16211E] emb-label hover:border-[#16211E] transition-colors"
              >
                {{ storefrontContent.actions.continueShopping }}
              </NuxtLink>
            </div>
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
  transition: all 0.35s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.list-leave-active {
  position: absolute;
}

@media (prefers-reduced-motion: reduce) {
  .list-move,
  .list-enter-active,
  .list-leave-active { transition: none; }
}
</style>
