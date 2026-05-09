<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')
const storefrontContent = useStorefrontContent()
const { currencyCode, format: formatCurrency } = useCurrency()
</script>

<template>
  <div class="min-h-screen bg-[#06080c] text-slate-300">
    <!-- HUD page header -->
    <div class="border-b border-white/[0.06] bg-black">
      <div class="h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-60" />
      <div class="max-w-[1400px] mx-auto px-5 lg:px-10 py-12">
        <p class="flex items-center gap-3 mb-4">
          <span class="w-8 h-px bg-brand-500" />
          <span class="text-[10px] font-black uppercase tracking-[0.36em] text-brand-500">// Loadout</span>
        </p>
        <div class="flex items-end justify-between gap-6">
          <h1 class="text-4xl md:text-6xl font-black uppercase tracking-[-0.04em] text-white leading-[0.92]">
            {{ storefrontContent.cart.title }}
          </h1>
          <div v-if="cartStore.hasItems" class="border-l-2 border-brand-500 pl-4">
            <div class="text-2xl font-black text-white">{{ String(cartStore.itemCount).padStart(2, '0') }}</div>
            <div class="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 mt-1">Items</div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-[1400px] mx-auto px-5 lg:px-10 py-12">
      <!-- Empty state -->
      <div v-if="!cartStore.hasItems" class="relative bg-[#0b0f14] border border-white/[0.06] py-20 px-6 text-center">
        <span class="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-brand-500" />
        <span class="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-brand-500" />
        <span class="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-brand-500" />
        <span class="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-brand-500" />

        <div class="mx-auto h-20 w-20 flex items-center justify-center mb-8 border border-brand-500/40 bg-brand-500/5">
          <Icon name="lucide:shopping-cart" class="h-9 w-9 text-brand-500" />
        </div>
        <h2 class="text-2xl md:text-4xl font-black uppercase tracking-[-0.02em] text-white">
          {{ storefrontContent.cart.empty.title }}
        </h2>
        <p class="mt-3 max-w-md mx-auto text-sm text-slate-500">
          {{ storefrontContent.cart.empty.subtitle }}
        </p>
        <NuxtLink
          to="/products"
          class="mt-10 inline-flex items-center gap-2 bg-brand-500 text-[#02060a] px-7 py-3.5 text-[11px] font-black uppercase tracking-[0.22em] hover:bg-white transition-colors [clip-path:polygon(5%_0,100%_0,95%_100%,0_100%)]"
        >
          {{ storefrontContent.cart.empty.cta }}
          <Icon name="lucide:arrow-right" class="w-4 h-4" />
        </NuxtLink>
      </div>

      <div v-else class="lg:grid lg:grid-cols-12 lg:gap-x-10 xl:gap-x-12 lg:items-start">
        <!-- Items -->
        <section class="lg:col-span-7">
          <div class="flex items-center gap-3 mb-6">
            <span class="text-[10px] font-black uppercase tracking-[0.32em] text-brand-500">// Items</span>
            <div class="flex-1 h-px bg-white/[0.06]" />
            <span class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{{ storefrontContent.cart.itemsCount(cartStore.itemCount) }}</span>
          </div>

          <ul role="list" class="space-y-3">
            <TransitionGroup name="list">
              <li
                v-for="item in cartStore.items"
                :key="item.variantId || item.productId"
                class="group relative bg-[#0b0f14] border border-white/[0.06] hover:border-brand-500/40 transition-colors p-4 sm:p-5 flex gap-4"
              >
                <div class="h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0 overflow-hidden bg-[#04060a] border border-white/[0.06]">
                  <img v-if="item.image" :src="item.image" :alt="item.title" class="h-full w-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center text-slate-700">
                    <Icon name="lucide:image" class="h-8 w-8" />
                  </div>
                </div>

                <div class="flex flex-1 flex-col min-w-0">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <p class="text-[9px] font-black uppercase tracking-[0.32em] text-brand-500 mb-1 font-mono">
                        // {{ String(item.productId).slice(-4).toUpperCase() }}
                      </p>
                      <h3 class="text-base font-black uppercase tracking-[-0.01em] text-white leading-tight hover:text-brand-500 transition-colors">
                        <NuxtLink :to="`/product/${item.slug}`">{{ item.title }}</NuxtLink>
                      </h3>
                      <p class="mt-1.5 text-xs text-slate-500">
                        <template v-if="item.variantId">{{ storefrontContent.cart.item.variant }}: <span class="font-mono text-slate-400">{{ item.variantId.slice(0, 8) }}</span></template>
                        <template v-else>{{ storefrontContent.cart.item.standardItem }}</template>
                      </p>
                    </div>
                    <button
                      type="button"
                      class="h-8 w-8 flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      @click="cartStore.removeItem(item.productId, item.variantId)"
                    >
                      <span class="sr-only">{{ storefrontContent.cart.item.remove }}</span>
                      <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                  </div>

                  <div class="flex items-end justify-between gap-3 pt-3 mt-auto border-t border-white/[0.06]">
                    <div>
                      <span class="block text-xs text-slate-500 uppercase tracking-[0.18em] font-bold mb-0.5">Unit</span>
                      <span class="text-lg font-black text-white tracking-[-0.02em]">{{ formatCurrency(item.price) }}</span>
                    </div>

                    <!-- Quantity stepper (angular) -->
                    <div class="flex items-stretch border border-white/10 bg-[#04060a]">
                      <button
                        :disabled="item.quantity <= 1"
                        class="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-brand-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                        @click="cartStore.updateQuantity(item.productId, item.quantity - 1, item.variantId)"
                      >
                        <Icon name="lucide:minus" class="w-3.5 h-3.5" />
                      </button>
                      <span class="h-9 w-10 flex items-center justify-center text-white text-sm font-black border-x border-white/10">{{ item.quantity }}</span>
                      <button
                        :disabled="item.quantity >= item.stock"
                        class="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-brand-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
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
        <aside aria-labelledby="summary-heading" class="mt-10 lg:mt-0 lg:col-span-5 lg:sticky lg:top-24">
          <div class="relative bg-[#0b0f14] border border-white/[0.06] p-6 sm:p-8">
            <span class="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-brand-500" />
            <span class="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-brand-500" />

            <p class="text-[10px] font-black uppercase tracking-[0.32em] text-brand-500 mb-3">// Mission Brief</p>
            <h2 id="summary-heading" class="text-2xl font-black uppercase tracking-[-0.02em] text-white">
              {{ storefrontContent.cart.summary.title }}
            </h2>

            <dl class="mt-7 space-y-3.5">
              <div class="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <dt class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{{ storefrontContent.cart.summary.subtotal }}</dt>
                <dd class="text-sm font-black text-white">{{ formatCurrency(cartStore.total) }}</dd>
              </div>
              <div class="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <dt class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{{ storefrontContent.cart.summary.shipping }}</dt>
                <dd class="text-xs text-slate-500">{{ storefrontContent.cart.summary.shippingHint }}</dd>
              </div>
              <div class="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <dt class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{{ storefrontContent.cart.summary.tax }}</dt>
                <dd class="text-sm font-black text-white">{{ formatCurrency(0) }}</dd>
              </div>
              <div class="flex items-center justify-between pt-3">
                <dt class="text-sm font-black uppercase tracking-[0.18em] text-white">{{ storefrontContent.cart.summary.total }}</dt>
                <dd class="text-3xl font-black text-brand-500 tracking-[-0.03em]">{{ formatCurrency(cartStore.total) }}</dd>
              </div>
            </dl>

            <div class="mt-8 space-y-3">
              <NuxtLink
                to="/checkout"
                class="w-full flex items-center justify-center gap-2 bg-brand-500 text-[#02060a] py-4 text-[11px] font-black uppercase tracking-[0.22em] hover:bg-white transition-colors [clip-path:polygon(3%_0,100%_0,97%_100%,0_100%)]"
              >
                {{ storefrontContent.cart.actions.proceedToCheckout }}
                <Icon name="lucide:arrow-right" class="w-4 h-4" />
              </NuxtLink>
              <NuxtLink
                to="/products"
                class="w-full flex items-center justify-center border border-white/15 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-300 hover:border-brand-500 hover:text-brand-500 transition-colors"
              >
                {{ storefrontContent.actions.continueShopping }}
              </NuxtLink>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
.list-leave-active {
  position: absolute;
}
</style>
