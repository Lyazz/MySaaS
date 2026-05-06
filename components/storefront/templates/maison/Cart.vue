<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const storefrontContent = useStorefrontContent()
const { format: formatCurrency } = useCurrency()
</script>

<template>
  <div class="cart">
    <div class="cart__inner">
      <!-- Header -->
      <div class="cart__head">
        <span class="at-label">Votre sélection</span>
        <h1 class="cart__title">{{ storefrontContent.cart.title }}</h1>
      </div>

      <!-- Empty -->
      <div v-if="!cartStore.hasItems" class="cart__empty">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" class="cart__empty-icon">
          <path d="M6 6h4.5l6 24h21l4.5-15H13.5" stroke="currentColor" stroke-width="0.75"/>
          <circle cx="21" cy="39" r="3" stroke="currentColor" stroke-width="0.75"/>
          <circle cx="36" cy="39" r="3" stroke="currentColor" stroke-width="0.75"/>
        </svg>
        <p class="cart__empty-title">Votre panier est vide</p>
        <p class="cart__empty-sub">{{ storefrontContent.cart.empty.subtitle }}</p>
        <NuxtLink to="/products" class="at-btn-primary">
          <span>{{ storefrontContent.cart.empty.cta }}</span>
          <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
            <path d="M1 4h14M10 1l5 3-5 3" stroke="currentColor" stroke-width="0.85"/>
          </svg>
        </NuxtLink>
      </div>

      <!-- Items + summary -->
      <div v-else class="cart__layout">
        <!-- Items -->
        <section class="cart__items">
          <TransitionGroup name="cart-item">
            <div
              v-for="item in cartStore.items"
              :key="item.variantId || item.productId"
              class="cart__item"
            >
              <div class="cart__item-img">
                <img v-if="item.image" :src="item.image" :alt="item.title" class="cart__item-photo">
                <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="1" y="1" width="18" height="18" stroke="currentColor" stroke-width="0.5"/>
                </svg>
              </div>

              <div class="cart__item-body">
                <div class="cart__item-top">
                  <div>
                    <NuxtLink :to="`/product/${item.slug}`" class="cart__item-name">{{ item.title }}</NuxtLink>
                    <p v-if="item.variantId" class="cart__item-ref">Réf. {{ item.variantId.slice(0, 8) }}</p>
                  </div>
                  <button class="cart__item-remove" @click="cartStore.removeItem(item.productId, item.variantId)">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="0.85"/>
                    </svg>
                  </button>
                </div>

                <div class="cart__item-bottom">
                  <div class="cart__qty">
                    <button
                      :disabled="item.quantity <= 1"
                      class="cart__qty-btn"
                      @click="cartStore.updateQuantity(item.productId, item.quantity - 1, item.variantId)"
                    >
                      <svg width="8" height="2" viewBox="0 0 8 2" fill="none"><path d="M1 1h6" stroke="currentColor" stroke-width="0.85"/></svg>
                    </button>
                    <span class="cart__qty-val">{{ item.quantity }}</span>
                    <button
                      :disabled="item.quantity >= item.stock"
                      class="cart__qty-btn"
                      @click="cartStore.updateQuantity(item.productId, item.quantity + 1, item.variantId)"
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M4 1v6M1 4h6" stroke="currentColor" stroke-width="0.85"/></svg>
                    </button>
                  </div>
                  <span class="cart__item-price">
                    {{ formatCurrency(item.lineTotal ?? (item.price * item.quantity)) }}
                  </span>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </section>

        <!-- Summary -->
        <section class="cart__summary">
          <div class="cart__summary-card">
            <h2 class="cart__summary-title">{{ storefrontContent.cart.summary.title }}</h2>

            <dl class="cart__summary-dl">
              <div class="cart__summary-row">
                <dt>{{ storefrontContent.cart.summary.subtotal }}</dt>
                <dd>{{ formatCurrency(cartStore.total) }}</dd>
              </div>
              <div class="cart__summary-row">
                <dt>{{ storefrontContent.cart.summary.shipping }}</dt>
                <dd class="cart__summary-hint">{{ storefrontContent.cart.summary.shippingHint }}</dd>
              </div>
            </dl>

            <div class="cart__summary-total">
              <span>{{ storefrontContent.cart.summary.total }}</span>
              <span class="cart__summary-total-price">{{ formatCurrency(cartStore.total) }}</span>
            </div>

            <NuxtLink to="/checkout" class="at-btn-solid cart__checkout-btn">
              {{ storefrontContent.cart.actions.proceedToCheckout }}
            </NuxtLink>
            <NuxtLink to="/products" class="cart__continue-link">
              {{ storefrontContent.actions.continueShopping }}
            </NuxtLink>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cart { min-height: 80vh; padding: clamp(40px, 6vw, 80px) 0; }
.cart__inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 clamp(20px, 5vw, 64px);
}

.cart__head { margin-bottom: 40px; }
.cart__title {
  font-family: var(--at-f-display);
  font-size: clamp(3rem, 6vw, 5rem);
  font-weight: 300;
  letter-spacing: 0;
  color: var(--at-cream);
  line-height: 1.0;
  margin-top: 10px;
}

/* Empty */
.cart__empty {
  border: 1px solid var(--at-border);
  padding: 80px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
}
.cart__empty-icon { color: var(--at-muted); margin-bottom: 8px; }
.cart__empty-title {
  font-family: var(--at-f-display);
  font-size: 1.8rem;
  font-weight: 300;
  color: var(--at-text);
}
.cart__empty-sub {
  font-family: var(--at-f-mono);
  font-size: 11px;
  color: var(--at-sub);
  margin-bottom: 8px;
}

/* Layout */
.cart__layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}
@media (min-width: 1024px) {
  .cart__layout { grid-template-columns: 1fr 340px; }
}

/* Items */
.cart__items { display: flex; flex-direction: column; }
.cart__item {
  display: flex;
  gap: 16px;
  padding: 20px 0;
  border-bottom: 1px solid var(--at-border);
}
.cart__item:first-child { border-top: 1px solid var(--at-border); }

.cart__item-img {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  background: var(--at-surface-2);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--at-muted);
}
.cart__item-photo { width: 100%; height: 100%; object-fit: cover; }

.cart__item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.cart__item-top { display: flex; justify-content: space-between; gap: 8px; }
.cart__item-name {
  font-family: var(--at-f-display);
  font-size: 1.1rem;
  font-weight: 400;
  color: var(--at-text);
  text-decoration: none;
  display: block;
  transition: color 0.2s;
}
.cart__item-name:hover { color: var(--at-gold); }
.cart__item-ref {
  font-family: var(--at-f-mono);
  font-size: 9px;
  letter-spacing: 0;
  color: var(--at-muted);
  margin-top: 3px;
}
.cart__item-remove {
  background: none;
  border: none;
  color: var(--at-muted);
  cursor: pointer;
  padding: 4px;
  flex-shrink: 0;
  transition: color 0.2s;
}
.cart__item-remove:hover { color: var(--at-gold); }

.cart__item-bottom { display: flex; align-items: center; justify-content: space-between; }
.cart__qty {
  display: flex;
  align-items: center;
  border: 1px solid var(--at-border);
}
.cart__qty-btn {
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  color: var(--at-sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}
.cart__qty-btn:hover { color: var(--at-gold); }
.cart__qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.cart__qty-val {
  width: 36px;
  text-align: center;
  font-family: var(--at-f-mono);
  font-size: 12px;
  color: var(--at-text);
  border-left: 1px solid var(--at-border);
  border-right: 1px solid var(--at-border);
  line-height: 32px;
}
.cart__item-price {
  font-family: var(--at-f-mono);
  font-size: 13px;
  font-weight: 400;
  color: var(--at-gold);
}

/* Summary */
.cart__summary-card {
  background: var(--at-surface);
  border: 1px solid var(--at-border);
  padding: 28px;
  position: sticky;
  top: 80px;
}
.cart__summary-title {
  font-family: var(--at-f-display);
  font-size: 1.4rem;
  font-weight: 300;
  color: var(--at-cream);
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--at-border);
}
.cart__summary-dl { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.cart__summary-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-family: var(--at-f-mono);
  font-size: 11px;
  color: var(--at-sub);
}
.cart__summary-row dd {
  font-weight: 400;
  color: var(--at-text);
  margin: 0;
}
.cart__summary-hint { font-size: 10px; color: var(--at-muted) !important; }

.cart__summary-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 16px 0;
  border-top: 1px solid var(--at-border);
  margin-bottom: 24px;
  font-family: var(--at-f-mono);
  font-size: 10px;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--at-sub);
}
.cart__summary-total-price {
  font-family: var(--at-f-display);
  font-size: 1.6rem;
  font-weight: 400;
  color: var(--at-gold);
  letter-spacing: 0;
  text-transform: none;
}

.cart__checkout-btn { margin-bottom: 12px; }
.cart__continue-link {
  display: block;
  text-align: center;
  font-family: var(--at-f-mono);
  font-size: 9px;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--at-muted);
  text-decoration: none;
  padding: 12px;
  transition: color 0.2s;
}
.cart__continue-link:hover { color: var(--at-gold); }

/* Transitions */
.cart-item-move, .cart-item-enter-active, .cart-item-leave-active { transition: all 0.3s ease; }
.cart-item-enter-from, .cart-item-leave-to { opacity: 0; transform: translateX(16px); }
.cart-item-leave-active { position: absolute; }
</style>
