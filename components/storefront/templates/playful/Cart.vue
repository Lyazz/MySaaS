<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const storefrontContent = useStorefrontContent()
const { format: formatCurrency } = useCurrency()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div class="bg-[var(--kw-cream)] min-h-screen py-10 md:py-14">
    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
      <!-- ══ Empty ══════════════════════════════════════════════════════ -->
      <div
        v-if="!cartStore.hasItems"
        class="text-center py-20 md:py-28"
      >
        <span
          class="kw-blob kw-float w-32 h-32 mx-auto mb-9 flex items-center justify-center"
          style="background: linear-gradient(140deg, var(--kw-pink-soft), var(--kw-lilac-soft))"
        >
          <Icon
            name="lucide:shopping-bag"
            class="w-14 h-14 text-[var(--kw-pink-deep)]"
          />
        </span>
        <h2 class="kw-display text-3xl md:text-4xl mb-4">
          {{ storefrontContent.cart.empty.title }}
        </h2>
        <p class="kw-lede max-w-md mx-auto mb-10">
          {{ storefrontContent.cart.empty.subtitle }}
        </p>
        <NuxtLink
          to="/products"
          class="kw-btn kw-btn-lg"
        >
          {{ storefrontContent.cart.empty.cta }}
          <Icon
            name="lucide:arrow-right"
            class="w-4 h-4 rtl:rotate-180"
          />
        </NuxtLink>
      </div>

      <div
        v-else
        class="lg:grid lg:grid-cols-12 lg:gap-10 lg:items-start"
      >
        <!-- ══ Items ════════════════════════════════════════════════════ -->
        <section class="lg:col-span-7">
          <div class="flex items-end justify-between gap-4 mb-8">
            <div>
              <p class="kw-kicker mb-2">
                {{ storefrontContent.cart.sections.items }}
              </p>
              <h1 class="kw-display text-3xl md:text-4xl">
                {{ storefrontContent.cart.title }}
              </h1>
            </div>
            <span class="kw-chip !cursor-default">{{ storefrontContent.cart.itemsCount(cartStore.itemCount) }}</span>
          </div>

          <ul
            role="list"
            class="space-y-4"
          >
            <TransitionGroup name="kw-list">
              <li
                v-for="item in cartStore.items"
                :key="item.variantId || item.productId"
                class="kw-card flex gap-4 items-center p-4"
              >
                <div
                  class="w-20 h-20 kw-blob overflow-hidden flex-shrink-0"
                  style="background: var(--kw-pink-soft)"
                >
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.title"
                    class="w-full h-full object-cover"
                  >
                  <span
                    v-else
                    class="w-full h-full flex items-center justify-center text-[var(--kw-pink)]"
                  >
                    <Icon
                      name="lucide:image"
                      class="h-8 w-8"
                    />
                  </span>
                </div>

                <div class="flex-1 min-w-0">
                  <NuxtLink
                    :to="`/product/${item.slug}`"
                    class="kw-title text-sm leading-snug line-clamp-2 hover:text-[var(--kw-pink-deep)] transition-colors"
                  >
                    {{ item.title }}
                  </NuxtLink>
                  <p class="text-xs font-semibold text-[var(--kw-ink-faint)] mt-0.5">
                    <template v-if="item.variantId">
                      {{ storefrontContent.cart.item.variant }}: {{ item.variantId.slice(0, 8) }}
                    </template>
                    <template v-else>
                      {{ storefrontContent.cart.item.standardItem }}
                    </template>
                  </p>
                  <p class="kw-num text-base text-[var(--kw-pink-deep)] mt-1.5">
                    {{ formatCurrency(item.price) }}
                  </p>
                </div>

                <div class="flex flex-col items-end gap-2.5 flex-shrink-0">
                  <button
                    type="button"
                    class="w-7 h-7 flex items-center justify-center text-[var(--kw-ink-faint)] hover:text-red-500 transition-colors"
                    :title="storefrontContent.cart.item.remove"
                    @click="cartStore.removeItem(item.productId, item.variantId)"
                  >
                    <Icon
                      name="lucide:trash-2"
                      class="h-4 w-4"
                    />
                  </button>
                  <div
                    class="flex items-center gap-1 rounded-full p-1"
                    style="background: var(--kw-cream-2)"
                  >
                    <button
                      :disabled="item.quantity <= 1"
                      class="w-7 h-7 flex items-center justify-center rounded-full bg-white text-[var(--kw-ink)] disabled:opacity-30 transition-colors hover:text-[var(--kw-pink-deep)]"
                      @click="cartStore.updateQuantity(item.productId, item.quantity - 1, item.variantId)"
                    >
                      <Icon
                        name="lucide:minus"
                        class="w-3.5 h-3.5"
                      />
                    </button>
                    <span class="kw-num w-6 text-center text-sm">{{ item.quantity }}</span>
                    <button
                      :disabled="item.quantity >= item.stock"
                      class="w-7 h-7 flex items-center justify-center rounded-full text-white disabled:opacity-30 transition-opacity"
                      style="background: var(--kw-pink-deep)"
                      @click="cartStore.updateQuantity(item.productId, item.quantity + 1, item.variantId)"
                    >
                      <Icon
                        name="lucide:plus"
                        class="w-3.5 h-3.5"
                      />
                    </button>
                  </div>
                </div>
              </li>
            </TransitionGroup>
          </ul>
        </section>

        <!-- ══ Summary ══════════════════════════════════════════════════ -->
        <section
          aria-labelledby="summary-heading"
          class="kw-card mt-10 lg:mt-0 px-6 py-7 lg:col-span-5 lg:sticky lg:top-[9.5rem] relative overflow-hidden"
        >
          <div
            class="absolute top-0 inset-x-0 h-1.5"
            style="background: linear-gradient(90deg, var(--kw-pink), var(--kw-lemon), var(--kw-mint), var(--kw-sky))"
          />

          <h2
            id="summary-heading"
            class="kw-display text-2xl mb-6 mt-1.5"
          >
            {{ storefrontContent.cart.summary.title }}
          </h2>

          <dl class="space-y-3.5">
            <div class="flex items-center justify-between pb-3.5 border-b-2 border-dashed border-[var(--kw-line)]">
              <dt class="text-sm font-bold text-[var(--kw-ink-soft)]">
                {{ storefrontContent.cart.summary.subtotal }}
              </dt>
              <dd class="kw-num text-sm">
                {{ formatCurrency(cartStore.total) }}
              </dd>
            </div>
            <div
              v-if="cartStore.clearanceDiscount > 0"
              class="flex items-center justify-between pb-3.5 border-b-2 border-dashed border-[var(--kw-line)]"
            >
              <dt class="text-sm font-bold text-[var(--kw-lemon-deep)]">
                {{ t('storefront.clearance.discountLine') }}
              </dt>
              <dd class="kw-num text-sm text-[var(--kw-lemon-deep)]">
                -{{ formatCurrency(cartStore.clearanceDiscount) }}
              </dd>
            </div>
            <div class="flex items-start justify-between pb-3.5 border-b-2 border-dashed border-[var(--kw-line)]">
              <dt class="flex flex-col text-sm font-bold text-[var(--kw-ink-soft)]">
                <span>{{ storefrontContent.cart.summary.shipping }}</span>
              </dt>
              <dd class="text-sm font-bold text-[var(--kw-sky-deep)] text-end">
                {{ storefrontContent.cart.summary.shippingHint }}
              </dd>
            </div>
            <div
              class="flex items-center justify-between rounded-[var(--kw-r)] px-4 py-3.5"
              style="background: var(--kw-cream-2)"
            >
              <dt class="kw-title">
                {{ storefrontContent.cart.summary.total }}
              </dt>
              <dd class="kw-num text-2xl text-[var(--kw-pink-deep)]">
                {{ formatCurrency(cartStore.total - cartStore.clearanceDiscount) }}
              </dd>
            </div>
          </dl>

          <div class="mt-7 space-y-3">
            <NuxtLink
              to="/checkout"
              class="kw-btn kw-btn-lg w-full"
            >
              {{ storefrontContent.cart.actions.proceedToCheckout }}
              <Icon
                name="lucide:arrow-right"
                class="w-5 h-5 rtl:rotate-180"
              />
            </NuxtLink>
            <NuxtLink
              to="/products"
              class="kw-btn kw-btn-ghost w-full"
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
.kw-list-move,
.kw-list-enter-active,
.kw-list-leave-active { transition: all .4s cubic-bezier(.34, 1.4, .64, 1); }
.kw-list-enter-from,
.kw-list-leave-to { opacity: 0; transform: translateX(20px); }
.kw-list-leave-active { position: absolute; }
</style>
