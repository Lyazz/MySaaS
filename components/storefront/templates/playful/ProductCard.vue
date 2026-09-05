<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

interface Product {
  id: string
  title: string
  slug: string
  price: number | string
  stock: number
  isActive: boolean
  images?: string[]
  description?: string
  isPromotionActive?: boolean
  promotionalPrice?: number | string | null
  promotionStartDate?: string | Date | null
  promotionEndDate?: string | Date | null
  showCountdown?: boolean
  bundleDeals?: any[]
  isClearance?: boolean
}

const props = defineProps<{
  product: Product
  viewMode?: 'grid' | 'list'
}>()

defineEmits(['quick-view'])

const { t } = useI18n({ useScope: 'global' })
const clearance = useClearanceDiscount()
const isClearanceEligible = computed(() => clearance.isProductEligible(props.product))

const cartStore = useCartStore()
const requireVariantSelectionBeforeQuickAdd = useProductCardVariantGuard()
const storeSettings = useState<any>('storeSettings')
const { currencyCode, formatAmount } = useCurrency()
const storefrontContent = useStorefrontContent()

const mainImage = computed(() => {
  if (props.product.images && props.product.images.length > 0) return props.product.images[0]
  return '/blank.svg?v=2'
})

const isPromoValid = computed(() => {
  if (!props.product?.isPromotionActive) return false
  const now = new Date().getTime()
  if (props.product.promotionStartDate && new Date(props.product.promotionStartDate).getTime() > now) return false
  if (props.product.promotionEndDate && new Date(props.product.promotionEndDate).getTime() < now) return false
  return true
})

const displayPrice = computed(() =>
  (isPromoValid.value && props.product.promotionalPrice) ? Number(props.product.promotionalPrice) : Number(props.product.price)
)
const originalPrice = computed(() =>
  (isPromoValid.value && props.product.promotionalPrice) ? Number(props.product.price) : null
)
const discountPercent = computed(() => {
  const full = Number(props.product.price)
  if (!originalPrice.value || !Number.isFinite(full) || full <= 0) return 0
  return Math.round(((full - displayPrice.value) / full) * 100)
})

const LOW_STOCK_THRESHOLD = 5
const isOutOfStock = computed(() => Number(props.product.stock ?? 0) <= 0)
const isLowStock = computed(() => !isOutOfStock.value && Number(props.product.stock ?? 0) <= LOW_STOCK_THRESHOLD)

/* A stable tint per product keeps a grid colourful without looking random on reload. */
const frameTints = ['var(--kw-pink-soft)', 'var(--kw-sky-soft)', 'var(--kw-lemon-soft)', 'var(--kw-mint-soft)', 'var(--kw-lilac-soft)']
const frameTint = computed(() => {
  const id = String(props.product.id || '')
  let sum = 0
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i)
  return frameTints[sum % frameTints.length]
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
    price: displayPrice.value,
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
  <!-- ══ List view ════════════════════════════════════════════════════ -->
  <div
    v-if="viewMode === 'list'"
    class="kw-card group flex flex-row items-center gap-5 p-4 transition-transform duration-300 hover:-translate-y-1"
  >
    <NuxtLink
      :to="`/product/${product.slug}`"
      class="relative w-28 h-28 flex-shrink-0 rounded-[var(--kw-r)] overflow-hidden"
      :style="{ background: frameTint }"
    >
      <img
        :src="mainImage"
        :alt="product.title"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      >
      <span
        v-if="discountPercent > 0"
        class="kw-badge kw-badge-sale absolute top-2 start-2"
      >-{{ discountPercent }}%</span>
    </NuxtLink>

    <div class="flex-1 min-w-0">
      <NuxtLink :to="`/product/${product.slug}`">
        <h3 class="kw-title text-base leading-snug mb-1 group-hover:text-[var(--kw-pink-deep)] transition-colors">
          {{ product.title }}
        </h3>
      </NuxtLink>
      <p
        v-if="product.description"
        class="text-sm text-[var(--kw-ink-soft)] mb-3 line-clamp-1"
      >
        {{ product.description }}
      </p>
      <div class="flex items-center gap-3">
        <span class="kw-num text-lg text-[var(--kw-pink-deep)]">{{ formatAmount(displayPrice) }} <span class="text-xs text-[var(--kw-ink-faint)]">{{ currencyCode }}</span></span>
        <span
          v-if="originalPrice"
          class="text-sm font-bold text-[var(--kw-ink-faint)] line-through"
        >{{ formatAmount(originalPrice) }}</span>
        <span
          v-if="isClearanceEligible"
          class="kw-badge kw-badge-low"
        >{{ t('storefront.clearance.badge') }}</span>
      </div>
    </div>

    <div class="flex flex-col gap-2 flex-shrink-0">
      <StorefrontSharedFavoriteButton
        :product-id="product.id"
        button-class="kw-icon-btn w-10 h-10"
        icon-class="w-4 h-4"
      />
      <button
        v-if="storeSettings?.cartEnabled !== false"
        :disabled="isOutOfStock || !product.isActive"
        class="kw-btn w-10 h-10 !p-0 rounded-full"
        :title="storefrontContent.actions.addToCart"
        @click.prevent="handleAddToCart"
      >
        <Icon
          name="lucide:shopping-bag"
          class="w-4 h-4"
        />
      </button>
    </div>
  </div>

  <!-- ══ Grid view ════════════════════════════════════════════════════ -->
  <div
    v-else
    class="group relative flex flex-col w-full h-full"
  >
    <div
      class="relative w-full aspect-[4/5] rounded-[var(--kw-r-lg)] overflow-hidden transition-transform duration-400 group-hover:-translate-y-1.5"
      :style="{ background: frameTint }"
    >
      <NuxtLink
        :to="`/product/${product.slug}`"
        class="block w-full h-full"
      >
        <img
          :src="mainImage"
          :alt="product.title"
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.07]"
        >
      </NuxtLink>

      <!-- Badges -->
      <div class="absolute top-3 start-3 flex flex-col items-start gap-1.5 z-10">
        <span
          v-if="discountPercent > 0"
          class="kw-badge kw-badge-sale"
        >-{{ discountPercent }}%</span>
        <span
          v-if="isClearanceEligible"
          class="kw-badge kw-badge-low"
        >{{ t('storefront.clearance.badge') }}</span>
        <span
          v-if="isOutOfStock"
          class="kw-badge kw-badge-out"
        >{{ storefrontContent.actions.outOfStock }}</span>
        <span
          v-else-if="isLowStock"
          class="kw-badge kw-badge-low"
        >{{ storefrontContent.productForm.stock.lowStock(Number(product.stock)) }}</span>
      </div>

      <!-- Favourite sits permanently in the corner, babyshop-style -->
      <div class="absolute top-3 end-3 z-10">
        <StorefrontSharedFavoriteButton
          :product-id="product.id"
          button-class="w-9 h-9 rounded-full bg-white/95 flex items-center justify-center text-[var(--kw-ink-soft)] hover:text-[var(--kw-pink-deep)] shadow-sm transition-colors"
          icon-class="w-4 h-4"
        />
      </div>

      <!-- Quick view reveals on hover only — it is a nicety, not a primary action -->
      <button
        type="button"
        class="absolute bottom-3 end-3 z-10 w-9 h-9 rounded-full bg-white/95 flex items-center justify-center text-[var(--kw-ink-soft)] hover:text-[var(--kw-pink-deep)] shadow-sm opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
        :title="storefrontContent.actions.quickView"
        @click.prevent="$emit('quick-view', product)"
      >
        <Icon
          name="lucide:eye"
          class="w-4 h-4"
        />
      </button>

      <div
        v-if="product.showCountdown && product.promotionEndDate && isPromoValid"
        class="absolute bottom-0 inset-x-0 z-10 flex justify-center pt-8 pb-3 pointer-events-none"
        style="background: linear-gradient(to top, rgba(74,46,77,.6), transparent)"
      >
        <div class="scale-[0.85] origin-bottom">
          <StorefrontSharedCountdownTimer
            :end-date="product.promotionEndDate"
            theme="danger"
            :show-icon="true"
          />
        </div>
      </div>
    </div>

    <!-- Details -->
    <div class="pt-4 px-1 flex flex-col flex-1">
      <NuxtLink
        :to="`/product/${product.slug}`"
        class="flex-1"
      >
        <h3 class="kw-title text-sm sm:text-[0.95rem] leading-snug line-clamp-2 group-hover:text-[var(--kw-pink-deep)] transition-colors">
          {{ product.title }}
        </h3>
      </NuxtLink>

      <div class="mt-2 flex items-baseline gap-2 flex-wrap">
        <span class="kw-num text-lg text-[var(--kw-pink-deep)]">{{ formatAmount(displayPrice) }} <span class="text-xs text-[var(--kw-ink-faint)]">{{ currencyCode }}</span></span>
        <span
          v-if="originalPrice"
          class="text-sm font-bold text-[var(--kw-ink-faint)] line-through"
        >{{ formatAmount(originalPrice) }}</span>
      </div>

      <button
        v-if="storeSettings?.cartEnabled !== false"
        type="button"
        :disabled="isOutOfStock || !product.isActive"
        class="kw-btn kw-btn-sm w-full mt-3"
        @click.prevent="handleAddToCart"
      >
        <Icon
          name="lucide:shopping-bag"
          class="w-4 h-4"
        />
        {{ isOutOfStock ? storefrontContent.actions.outOfStock : storefrontContent.actions.addToCart }}
      </button>
    </div>

    <!-- Toast -->
    <Transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSuccess"
        class="fixed bottom-4 end-4 z-50 bg-white px-5 py-3.5 rounded-[var(--kw-r)] shadow-xl flex items-center gap-3 border border-[var(--kw-line)]"
      >
        <span
          class="w-8 h-8 kw-blob flex items-center justify-center flex-shrink-0"
          style="background: var(--kw-mint)"
        >
          <Icon
            name="lucide:check"
            class="w-4 h-4 text-white"
          />
        </span>
        <div>
          <div class="kw-title text-sm">
            {{ successTitle }}
          </div>
          <div class="text-xs font-semibold text-[var(--kw-ink-soft)]">
            {{ successMessage }}
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
