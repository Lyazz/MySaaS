<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const storefrontContent = useStorefrontContent()
const { format: formatCurrency } = useCurrency()
</script>

<template>
  <div class="min-h-[80vh] py-12 md:py-16">
    <div class="max-w-5xl mx-auto px-6">
      <div class="mb-10">
        <p class="text-[10px] tracking-[0.3em] uppercase text-[#C17B4E] mb-3">Votre sélection</p>
        <h1 class="font-maison-serif text-4xl md:text-5xl font-semibold text-[#2C2420]">{{ storefrontContent.cart.title }}</h1>
      </div>

      <!-- Empty state -->
      <div v-if="!cartStore.hasItems" class="border border-[#E8E0D4] bg-white py-24 text-center">
        <Icon name="lucide:shopping-bag" class="w-12 h-12 text-[#D4C4B4] mx-auto mb-6" />
        <p class="font-maison-serif text-2xl text-[#2C2420] mb-2">Votre panier est vide</p>
        <p class="text-sm text-[#7A6558] mb-8">{{ storefrontContent.cart.empty.subtitle }}</p>
        <NuxtLink
          to="/products"
          class="inline-flex items-center gap-2 px-8 py-3.5 bg-[#2C2420] text-white text-xs tracking-[0.2em] uppercase hover:bg-[#C17B4E] transition-all"
        >
          {{ storefrontContent.cart.empty.cta }} <Icon name="lucide:arrow-right" class="w-3 h-3" />
        </NuxtLink>
      </div>

      <!-- Cart items + summary -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <!-- Items -->
        <section class="lg:col-span-8 space-y-4">
          <TransitionGroup name="list">
            <div
              v-for="item in cartStore.items"
              :key="item.variantId || item.productId"
              class="bg-white border border-[#E8E0D4] flex gap-5 p-5 group hover:border-[#C17B4E]/40 transition-colors"
            >
              <div class="w-20 h-20 bg-[#F5F0EA] flex-shrink-0 overflow-hidden">
                <img v-if="item.image" :src="item.image" :alt="item.title" class="w-full h-full object-cover">
                <div v-else class="w-full h-full flex items-center justify-center text-[#D4C4B4]">
                  <Icon name="lucide:image" class="w-7 h-7" />
                </div>
              </div>

              <div class="flex-grow min-w-0">
                <h3 class="text-sm font-medium text-[#2C2420] mb-1 truncate">
                  <NuxtLink :to="`/p/${item.slug}`" class="hover:text-[#C17B4E] transition-colors">{{ item.title }}</NuxtLink>
                </h3>
                <p v-if="item.variantId" class="text-[10px] text-[#B0A090] tracking-wider mb-3">Réf. {{ item.variantId.slice(0, 8) }}</p>

                <div class="flex items-center gap-4">
                  <div class="flex items-center border border-[#E8E0D4]">
                    <button
                      :disabled="item.quantity <= 1"
                      class="w-8 h-8 flex items-center justify-center text-[#7A6558] hover:text-[#2C2420] disabled:opacity-30 transition-colors"
                      @click="cartStore.updateQuantity(item.productId, item.quantity - 1, item.variantId)"
                    >
                      <Icon name="lucide:minus" class="w-3 h-3" />
                    </button>
                    <span class="w-8 text-center text-sm font-medium text-[#2C2420]">{{ item.quantity }}</span>
                    <button
                      :disabled="item.quantity >= item.stock"
                      class="w-8 h-8 flex items-center justify-center text-[#7A6558] hover:text-[#2C2420] disabled:opacity-30 transition-colors"
                      @click="cartStore.updateQuantity(item.productId, item.quantity + 1, item.variantId)"
                    >
                      <Icon name="lucide:plus" class="w-3 h-3" />
                    </button>
                  </div>
                  <span class="font-semibold text-[#C17B4E] text-sm">
                    {{ formatCurrency(item.lineTotal ?? (item.price * item.quantity)) }}
                  </span>
                </div>
              </div>

              <button
                class="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[#D4C4B4] hover:text-red-400 transition-colors self-start"
                @click="cartStore.removeItem(item.productId, item.variantId)"
              >
                <Icon name="lucide:x" class="w-4 h-4" />
              </button>
            </div>
          </TransitionGroup>
        </section>

        <!-- Summary -->
        <section class="lg:col-span-4">
          <div class="bg-white border border-[#E8E0D4] p-8 sticky top-24">
            <h2 class="font-maison-serif text-xl font-semibold text-[#2C2420] mb-6 pb-4 border-b border-[#E8E0D4]">
              {{ storefrontContent.cart.summary.title }}
            </h2>
            <dl class="space-y-3 text-sm text-[#7A6558] mb-8">
              <div class="flex justify-between">
                <dt>{{ storefrontContent.cart.summary.subtotal }}</dt>
                <dd class="font-semibold text-[#2C2420]">{{ formatCurrency(cartStore.total) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt>{{ storefrontContent.cart.summary.shipping }}</dt>
                <dd class="text-xs text-[#B0A090]">{{ storefrontContent.cart.summary.shippingHint }}</dd>
              </div>
              <div class="flex justify-between pt-4 border-t border-[#E8E0D4] text-base">
                <dt class="font-semibold text-[#2C2420]">{{ storefrontContent.cart.summary.total }}</dt>
                <dd class="font-bold text-[#C17B4E]">{{ formatCurrency(cartStore.total) }}</dd>
              </div>
            </dl>

            <NuxtLink
              to="/checkout"
              class="block w-full text-center py-4 bg-[#2C2420] text-white text-xs tracking-[0.2em] uppercase hover:bg-[#C17B4E] transition-all mb-3"
            >
              {{ storefrontContent.cart.actions.proceedToCheckout }}
            </NuxtLink>
            <NuxtLink
              to="/products"
              class="block w-full text-center py-3 text-xs tracking-[0.15em] uppercase text-[#7A6558] hover:text-[#C17B4E] transition-colors"
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
.list-move, .list-enter-active, .list-leave-active { transition: all 0.3s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateX(20px); }
.list-leave-active { position: absolute; }
</style>
