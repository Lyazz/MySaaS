<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

interface Product {
  isClearance?: boolean
  [key: string]: any
}

const props = defineProps<{
  product: Product
  viewMode?: 'grid' | 'list'
}>()

const isPromoValid = computed(() => {
  if (!props.product?.isPromotionActive) return false
  const now = new Date().getTime()
  if (props.product.promotionStartDate && new Date(props.product.promotionStartDate).getTime() > now) return false
  if (props.product.promotionEndDate && new Date(props.product.promotionEndDate).getTime() < now) return false
  return true
})

const originalPrice = computed(() => Number(props.product.price))
const displayPrice = computed(() => {
  if (isPromoValid.value && props.product.promotionalPrice) return Number(props.product.promotionalPrice)
  return originalPrice.value
})

const { t } = useI18n({ useScope: 'global' })
const clearance = useClearanceDiscount()
const isClearanceEligible = computed(() => clearance.isProductEligible(props.product))

const cartStore = useCartStore()
const storefrontContent = useStorefrontContent()
const requireVariantSelectionBeforeQuickAdd = useProductCardVariantGuard()
const { format: formatPrice } = useCurrency()

const mainImage = computed(() => {
  if (props.product?.productImages?.length > 0) return props.product.productImages[0].url
  if (props.product?.images?.length > 0) return props.product.images[0]
  return '/blank.svg?v=2'
})

const showSuccess = ref(false)
const successTitle = ref('')
const successMessage = ref('')

const triggerSuccessToast = (title: string, message: string) => {
  successTitle.value = title
  successMessage.value = message
  showSuccess.value = true
  setTimeout(() => { showSuccess.value = false }, 3000)
}

async function handleAddToCart() {
  if (await requireVariantSelectionBeforeQuickAdd(props.product)) return
  cartStore.addItem({
    productId: props.product.id,
    title: props.product.title,
    slug: props.product.slug,
    price: Number(props.product.price),
    bundleDeals: props.product.bundleDeals || [],
    isClearance: Boolean(props.product?.isClearance),
    stock: props.product.stock,
    image: mainImage.value,
    metaPixelIds: (props.product as any)?.metaPixelIds
  })
  triggerSuccessToast(
    storefrontContent.value.toasts.addedToCart.title,
    storefrontContent.value.toasts.addedToCart.message
  )
}
</script>

<template>
  <div class="pc" :class="viewMode === 'list' && 'pc--list'">
    <!-- Image zone -->
    <div class="pc__img-wrap">
      <NuxtLink :to="`/product/${product.slug}`" class="pc__img-link">
        <img :src="mainImage" :alt="product.title" class="pc__img">
      </NuxtLink>

      <!-- Badges -->
      <div class="pc__badge-stack">
        <div v-if="isPromoValid" class="pc__badge">— {{ Math.round((1 - displayPrice / originalPrice) * 100) }}%</div>
        <div v-if="isClearanceEligible" class="pc__badge pc__badge--clearance">{{ t('storefront.clearance.badge') }}</div>
      </div>

      <!-- Favorite -->
      <StorefrontSharedFavoriteButton
        :product-id="product.id"
        button-class="pc__fav-btn"
        icon-class="pc__fav-icon"
      />

      <!-- Hover actions -->
      <div class="pc__hover-bar">
        <button class="pc__hover-btn" @click.prevent="handleAddToCart">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 2h1.5l2 8h7l1.5-5H4.5" stroke="currentColor" stroke-width="0.85"/>
            <circle cx="7" cy="13" r="1" fill="currentColor"/>
            <circle cx="12" cy="13" r="1" fill="currentColor"/>
          </svg>
          <span>Ajouter</span>
        </button>
        <NuxtLink :to="`/product/${product.slug}`" class="pc__hover-btn pc__hover-btn--outline">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="0.85"/>
            <path d="M1 8c1.5-4 10-4 14 0-4 4-12.5 4-14 0z" stroke="currentColor" stroke-width="0.85"/>
          </svg>
          <span>Voir</span>
        </NuxtLink>
      </div>

      <!-- Countdown -->
      <div v-if="product.showCountdown && product.promotionEndDate && isPromoValid" class="pc__countdown">
        <div class="scale-90 origin-bottom">
          <StorefrontSharedCountdownTimer :end-date="product.promotionEndDate" theme="danger" :show-icon="true" />
        </div>
      </div>
    </div>

    <!-- Info -->
    <div class="pc__info">
      <span class="pc__cat">{{ product.category?.title || 'Pistachio' }}</span>
      <h3 class="pc__title">
        <NuxtLink :to="`/product/${product.slug}`" class="pc__title-link">{{ product.title }}</NuxtLink>
      </h3>
      <div class="pc__price-row">
        <span class="pc__price" :class="isPromoValid && originalPrice !== displayPrice && 'pc__price--cut'">{{ formatPrice(displayPrice) }}</span>
        <span v-if="isPromoValid && originalPrice !== displayPrice" class="pc__price-orig">{{ formatPrice(originalPrice) }}</span>
      </div>
    </div>

    <!-- Toast -->
    <Transition name="pc-toast">
      <div v-if="showSuccess" class="pc-toast">
        <div class="pc-toast__icon">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1"/>
          </svg>
        </div>
        <div>
          <div class="pc-toast__title">{{ successTitle }}</div>
          <div class="pc-toast__msg">{{ successMessage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.pc {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--at-grad-paper);
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-leaf);
  box-shadow: var(--at-shadow-sm);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}
.pc:hover {
  transform: translateY(-5px);
  border-color: var(--at-border-2);
  box-shadow: var(--at-shadow-lg);
}
.pc--list {
  flex-direction: row;
  gap: 16px;
  align-items: flex-start;
  padding: 12px;
  border-radius: var(--at-r-md);
}
.pc--list .pc__img-wrap { border-radius: var(--at-r-sm); }

/* Image */
.pc__img-wrap {
  position: relative;
  overflow: hidden;
  background: var(--at-grad-shell);
  aspect-ratio: 3/4;
  border-radius: var(--at-r-leaf);
}
.pc--list .pc__img-wrap {
  width: 100px;
  flex-shrink: 0;
  aspect-ratio: 1;
}
.pc__img-link { display: block; width: 100%; height: 100%; }
.pc__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94), filter 0.4s;
  filter: brightness(0.95) saturate(0.96);
}
.pc:hover .pc__img { transform: scale(1.06); filter: brightness(1.02) saturate(1); }

/* Promo badge */
.pc__badge-stack {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
  z-index: 2;
}
.pc__badge {
  background: var(--at-grad-gold-ink);
  color: #FFFBF0;
  font-family: var(--at-f-mono);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
  padding: 5px 10px;
  border-radius: var(--at-r-pill);
  box-shadow: var(--at-shadow-xs);
}
.pc__badge--clearance {
  background: var(--at-skin);
  color: #FFFBF0;
}

/* Favorite */
:deep(.pc__fav-btn) {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  background: rgba(255,251,240,0.9);
  backdrop-filter: blur(6px);
  border-radius: var(--at-r-pill);
  box-shadow: var(--at-shadow-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--at-sub);
  border: none;
  cursor: pointer;
  transition: color 0.2s, background 0.2s, transform 0.2s;
  z-index: 2;
}
:deep(.pc__fav-btn:hover) { color: var(--at-skin); background: #FFFBF0; transform: scale(1.06); }
:deep(.pc__fav-icon) { width: 12px; height: 12px; }

/* Hover bar */
.pc__hover-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.76, 0, 0.24, 1);
  z-index: 3;
}
.pc:hover .pc__hover-bar { transform: translateY(0); }

.pc__hover-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 12px 0;
  background: var(--at-grad-green);
  color: #FFFBF0;
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.25s, color 0.25s;
}
.pc__hover-btn:hover { background: var(--at-grad-gold-ink); }
.pc__hover-btn--outline {
  background: rgba(255,251,240,0.94);
  backdrop-filter: blur(6px);
  color: var(--at-text);
  border-inline-start: 1px solid var(--at-border);
  flex: 0.7;
}
.pc__hover-btn--outline:hover { background: #FFFBF0; color: var(--at-gold-700); }

/* Countdown */
.pc__countdown {
  position: absolute;
  bottom: 40px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 2;
}

/* Info */
.pc__info {
  padding: 16px 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pc--list .pc__info { padding: 4px 0; flex: 1; }

.pc__cat {
  font-family: var(--at-f-mono);
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--at-muted);
}

.pc__title {
  font-family: var(--at-f-display);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.012em;
  line-height: 1.3;
  margin: 2px 0 4px;
}
.pc__title-link {
  color: var(--at-cream);
  text-decoration: none;
  transition: color 0.2s;
}
.pc__title-link:hover { color: var(--at-gold-700); }

.pc__price-row { display: flex; align-items: baseline; gap: 8px; margin-top: auto; }
.pc__price {
  font-family: var(--at-f-mono);
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--at-cream);
}
.pc__price--cut { color: var(--at-skin); }
.pc__price-orig {
  font-family: var(--at-f-mono);
  font-size: 10px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  color: var(--at-muted);
  text-decoration: line-through;
  text-decoration-color: var(--at-skin-soft);
}

/* Toast */
.pc-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100;
  background: var(--at-grad-paper);
  border: 1px solid var(--at-border);
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: var(--at-r-md);
  box-shadow: var(--at-shadow-lg);
}
.pc-toast__icon {
  width: 28px;
  height: 28px;
  background: var(--at-grad-green);
  border-radius: var(--at-r-pill);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFBF0;
  flex-shrink: 0;
}
.pc-toast__title {
  font-family: var(--at-f-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--at-cream);
}
.pc-toast__msg {
  font-family: var(--at-f-mono);
  font-size: 10px;
  font-weight: 300;
  color: var(--at-sub);
  margin-top: 2px;
}

.pc-toast-enter-active { transition: opacity 0.3s, transform 0.3s; }
.pc-toast-leave-active { transition: opacity 0.15s; }
.pc-toast-enter-from { opacity: 0; transform: translateY(8px) translateX(4px); }
.pc-toast-leave-to { opacity: 0; }
</style>
