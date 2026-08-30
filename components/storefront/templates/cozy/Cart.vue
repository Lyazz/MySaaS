<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')
const storefrontContent = useStorefrontContent()
const { t } = useI18n({ useScope: 'global' })
const { currencyCode, format: formatCurrency } = useCurrency()
</script>

<template>
  <div class="ed-theme">
    <div class="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-10 py-10 md:py-16">
      <div class="border-b border-[#262019] pb-6 mb-10">
        <p class="ed-kicker mb-3">{{ storefrontContent.cart.label }}</p>
        <h1 class="ed-display text-4xl md:text-6xl text-[#262019]">{{ storefrontContent.cart.title }}</h1>
      </div>

      <div v-if="!cartStore.hasItems" class="border border-dashed border-[#C4B8A4] py-20 text-center">
        <Icon name="lucide:shopping-bag" class="w-9 h-9 mx-auto mb-5 text-[#C4B8A4]" />
        <h2 class="ed-display text-2xl text-[#262019] mb-6">{{ storefrontContent.cart.empty.subtitle }}</h2>
        <NuxtLink to="/products" class="ed-btn-solid">{{ storefrontContent.cart.empty.cta }}</NuxtLink>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
        <!-- Items -->
        <section class="lg:col-span-7 xl:col-span-8">
          <div class="hidden sm:grid grid-cols-12 gap-4 ed-ui text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#8A7E6E] pb-3 border-b border-[#262019]">
            <span class="col-span-6">{{ storefrontContent.cart.sections.items }}</span>
            <span class="col-span-3 text-center">{{ storefrontContent.productForm.quantity.label }}</span>
            <span class="col-span-3 text-end">{{ storefrontContent.cart.summary.subtotal }}</span>
          </div>

          <TransitionGroup name="list" tag="div" class="divide-y divide-[#DAD2C4]">
            <div
              v-for="item in cartStore.items"
              :key="item.variantId || item.productId"
              class="py-6 grid grid-cols-12 gap-4 items-center"
            >
              <div class="col-span-12 sm:col-span-6 flex gap-4 items-center">
                <div class="w-20 h-24 bg-[#FBF8F2] border border-[#DAD2C4] overflow-hidden flex-shrink-0">
                  <img v-if="item.image" :src="item.image" :alt="item.title" class="w-full h-full object-cover">
                  <div v-else class="w-full h-full flex items-center justify-center text-[#C4B8A4]">
                    <Icon name="lucide:image" class="w-6 h-6" />
                  </div>
                </div>
                <div class="min-w-0">
                  <h3 class="ed-display text-[17px] text-[#262019] leading-snug">
                    <NuxtLink :to="`/product/${item.slug}`" class="hover:text-[#97401F] transition-colors">{{ item.title }}</NuxtLink>
                  </h3>
                  <p v-if="item.variantId" class="ed-ui text-xs text-[#8A7E6E] mt-1">{{ storefrontContent.cart.item.variant }}</p>
                  <button
                    class="ed-link ed-ui text-[11px] uppercase tracking-[0.12em] text-[#8A7E6E] mt-2 inline-block"
                    @click="cartStore.removeItem(item.productId, item.variantId)"
                  >{{ storefrontContent.cart.item.remove }}</button>
                </div>
              </div>

              <div class="col-span-7 sm:col-span-3 flex sm:justify-center">
                <div class="flex items-center border border-[#C4B8A4]">
                  <button
                    :disabled="item.quantity <= 1"
                    class="w-9 h-9 flex items-center justify-center text-[#4A4038] hover:bg-[#EFE8DA] transition-colors disabled:opacity-30"
                    @click="cartStore.updateQuantity(item.productId, item.quantity - 1, item.variantId)"
                  >
                    <Icon name="lucide:minus" class="w-3.5 h-3.5" />
                  </button>
                  <span class="w-10 text-center ed-ui text-sm font-semibold text-[#262019] tabular-nums border-x border-[#C4B8A4]">{{ item.quantity }}</span>
                  <button
                    :disabled="item.quantity >= item.stock"
                    class="w-9 h-9 flex items-center justify-center text-[#4A4038] hover:bg-[#EFE8DA] transition-colors disabled:opacity-30"
                    @click="cartStore.updateQuantity(item.productId, item.quantity + 1, item.variantId)"
                  >
                    <Icon name="lucide:plus" class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div class="col-span-5 sm:col-span-3 text-end ed-display text-[17px] text-[#262019]">
                {{ formatCurrency(item.lineTotal ?? (item.price * item.quantity)) }}
              </div>
            </div>
          </TransitionGroup>

          <NuxtLink to="/products" class="ed-link ed-ui text-[11px] font-semibold uppercase tracking-[0.14em] inline-flex items-center gap-2 mt-8">
            <Icon name="lucide:arrow-left" class="w-4 h-4 rtl:rotate-180" />
            {{ storefrontContent.actions.continueShopping }}
          </NuxtLink>
        </section>

        <!-- Summary -->
        <section class="lg:col-span-5 xl:col-span-4">
          <div class="border border-[#262019] bg-[#FBF8F2] p-7 lg:sticky lg:top-24">
            <h2 class="ed-display text-xl text-[#262019] mb-6 pb-4 border-b border-[#DAD2C4]">{{ storefrontContent.cart.summary.title }}</h2>
            <dl class="space-y-3.5 ed-ui text-sm text-[#8A7E6E] mb-7">
              <div class="flex justify-between">
                <dt>{{ storefrontContent.cart.summary.subtotal }}</dt>
                <dd class="text-[#262019] font-semibold">{{ formatCurrency(cartStore.total) }}</dd>
              </div>
              <div v-if="cartStore.clearanceDiscount > 0" class="flex justify-between text-[#97401F]">
                <dt>{{ t('storefront.clearance.discountLine') }}</dt>
                <dd class="font-semibold">−{{ formatCurrency(cartStore.clearanceDiscount) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt>{{ storefrontContent.cart.summary.shipping }}</dt>
                <dd class="text-xs">{{ storefrontContent.cart.summary.shippingHint }}</dd>
              </div>
              <div class="flex justify-between">
                <dt>{{ storefrontContent.cart.summary.tax }}</dt>
                <dd class="text-[#262019]">{{ formatCurrency(0) }}</dd>
              </div>
              <div class="flex justify-between items-baseline pt-4 border-t border-[#262019]">
                <dt class="ed-display text-lg text-[#262019]">{{ storefrontContent.cart.summary.total }}</dt>
                <dd class="ed-display text-2xl text-[#B8532E]">{{ formatCurrency(cartStore.total - cartStore.clearanceDiscount) }}</dd>
              </div>
            </dl>

            <NuxtLink to="/checkout" class="ed-btn-solid w-full">
              {{ storefrontContent.cart.actions.proceedToCheckout }}
              <Icon name="lucide:arrow-right" class="w-4 h-4 rtl:rotate-180" />
            </NuxtLink>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-move, .list-enter-active, .list-leave-active { transition: all 0.4s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateX(20px); }
.list-leave-active { position: absolute; }

@media (prefers-reduced-motion: reduce) {
  .list-move, .list-enter-active, .list-leave-active { transition: none; }
}
</style>
