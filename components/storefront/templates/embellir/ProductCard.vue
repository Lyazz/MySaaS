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
  product: Product,
  viewMode?: 'grid' | 'list',
  /** `dark` sets the card on the deep glaze band instead of plaster. */
  tone?: 'light' | 'dark'
}>()

defineEmits(['quick-view'])

const cartStore = useCartStore()
const requireVariantSelectionBeforeQuickAdd = useProductCardVariantGuard()
const storeSettings = useState<any>('storeSettings')
const { currencyCode, formatAmount } = useCurrency()
const storefrontContent = useStorefrontContent()
const { t } = useI18n({ useScope: 'global' })
const clearance = useClearanceDiscount()
const isClearanceEligible = computed(() => clearance.isProductEligible(props.product))

const isDark = computed(() => props.tone === 'dark')

const mainImage = computed(() => {
    if (props.product.images && props.product.images.length > 0) {
        return props.product.images[0]
    }
    return '/blank.svg?v=2'
})

const isPromoValid = computed(() => {
    if (!props.product?.isPromotionActive) return false
    const now = new Date().getTime()
    if (props.product.promotionStartDate && new Date(props.product.promotionStartDate).getTime() > now) return false
    if (props.product.promotionEndDate && new Date(props.product.promotionEndDate).getTime() < now) return false
    return true
})

const displayPrice = computed(() => {
    return (isPromoValid.value && props.product.promotionalPrice) ? Number(props.product.promotionalPrice) : Number(props.product.price)
})

const originalPrice = computed(() => {
    return (isPromoValid.value && props.product.promotionalPrice) ? Number(props.product.price) : null
})

const discountPercent = computed(() => {
    const full = Number(props.product.price)
    if (!isPromoValid.value || !full) return 0
    return Math.round(((full - Number(props.product.promotionalPrice)) / full) * 100)
})

const LOW_STOCK_THRESHOLD = 5
const isOutOfStock = computed(() => Number(props.product.stock ?? 0) <= 0)
const isLowStock = computed(() => !isOutOfStock.value && Number(props.product.stock ?? 0) <= LOW_STOCK_THRESHOLD)

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
  <div
    class="group relative"
    :class="[
      viewMode === 'list'
        ? 'flex flex-row items-start gap-5 sm:gap-7 p-4 border'
        : 'flex flex-col',
      viewMode === 'list' && isDark ? 'bg-brand-600 border-[#DFA254]/25' : '',
      viewMode === 'list' && !isDark ? 'bg-[#FDFAF4] border-[#CBBDAB]' : ''
    ]"
  >
    <!-- The plate: the product image, set like a tile -->
    <div
      :class="[
        isDark ? 'emb-plate-dark' : 'emb-plate',
        viewMode === 'list' ? 'w-32 sm:w-44 aspect-square flex-shrink-0' : 'w-full aspect-square'
      ]"
    >
      <div class="emb-plate-inner emb-glaze-sweep">
        <NuxtLink :to="`/product/${product.slug}`" class="block w-full h-full">
          <img
            :src="mainImage"
            :alt="product.title"
            class="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
          >
        </NuxtLink>

      <!-- Badges -->
      <div class="absolute top-3 start-3 flex flex-col gap-1.5 items-start z-10">
        <span
          v-if="isPromoValid"
          class="px-2 py-1 bg-[#B4593F] text-[#FDFAF4] text-[10px] font-bold tabular-nums tracking-wide"
        >-{{ discountPercent }}%</span>
        <span
          v-if="isClearanceEligible"
          class="px-2 py-1 bg-[#DFA254] text-[#062622] text-[10px] font-bold uppercase tracking-[0.14em]"
        >{{ t('storefront.clearance.badge') }}</span>
      </div>

      <!-- Stock note, opposite corner. Low stock is a counted tile rather than
           a sentence: the wording runs long in French and Arabic. -->
      <div v-if="viewMode !== 'list'" class="absolute top-3 end-3 z-10">
        <span
          v-if="isOutOfStock"
          class="block max-w-[9rem] px-2 py-1 bg-[#062622] text-[#F2ECE1] text-[10px] font-bold uppercase tracking-[0.1em] text-center leading-tight"
        >{{ storefrontContent.productForm.stock.outOfStock }}</span>
        <span
          v-else-if="isLowStock"
          class="flex h-7 min-w-7 px-1.5 items-center justify-center bg-[#FDFAF4] border border-[#DFA254] text-[#8A5A18] text-xs font-bold tabular-nums"
          :title="storefrontContent.productForm.stock.lowStock(Number(product.stock))"
        >
          {{ product.stock }}
          <span class="sr-only">{{ storefrontContent.productForm.stock.lowStock(Number(product.stock)) }}</span>
        </span>
      </div>

      <!-- Countdown -->
      <div
        v-if="product.showCountdown && product.promotionEndDate && isPromoValid"
        class="absolute bottom-0 inset-x-0 z-20 flex justify-center bg-gradient-to-t from-[#062622]/75 to-transparent pt-8 pb-3 pointer-events-none"
      >
        <div class="scale-[0.85] sm:scale-90 origin-bottom">
          <StorefrontSharedCountdownTimer
            :end-date="product.promotionEndDate"
            theme="danger"
            :show-icon="true"
          />
        </div>
      </div>

      <!-- Action rail: always on for touch, revealed on hover for pointers -->
      <div
        v-if="viewMode !== 'list'"
        class="absolute inset-x-0 bottom-0 z-30 flex items-stretch gap-px bg-[#CBBDAB] transition-transform duration-300 translate-y-0 lg:translate-y-full lg:group-hover:translate-y-0"
      >
        <StorefrontSharedFavoriteButton
          :product-id="product.id"
          button-class="w-10 shrink-0 flex items-center justify-center bg-[#FDFAF4] text-[#16211E] hover:bg-[#F2ECE1] hover:text-[#B4593F] transition-colors"
          icon-class="w-4 h-4"
        />
        <button
          type="button"
          class="w-10 shrink-0 flex items-center justify-center bg-[#FDFAF4] text-[#16211E] hover:bg-[#F2ECE1] hover:text-brand-700 transition-colors"
          :title="storefrontContent.actions.quickView"
          @click.prevent="$emit('quick-view', product)"
        >
          <Icon name="lucide:eye" class="w-4 h-4" />
        </button>
        <button
          v-if="storeSettings?.cartEnabled !== false"
          type="button"
          :disabled="isOutOfStock || !product.isActive"
          class="flex-1 h-10 px-3 bg-brand-600 text-[#FDFAF4] hover:bg-[#DFA254] hover:text-[#062622] transition-colors disabled:bg-[#CBBDAB] disabled:text-[#5A6763] disabled:cursor-not-allowed flex items-center justify-center gap-2"
          :title="storefrontContent.actions.addToCart"
          @click.prevent="handleAddToCart"
        >
          <Icon name="lucide:shopping-bag" class="w-4 h-4 shrink-0" />
          <span class="hidden sm:inline truncate text-[10px] font-bold uppercase tracking-[0.08em]">{{ storefrontContent.actions.addToCart }}</span>
        </button>
      </div>

      <!-- List view floating actions -->
      <div
        v-if="viewMode === 'list'"
        class="absolute top-3 end-3 flex flex-col gap-px bg-[#CBBDAB] opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
      >
        <StorefrontSharedFavoriteButton
          :product-id="product.id"
          button-class="w-9 h-9 flex items-center justify-center bg-[#FDFAF4] text-[#16211E] hover:text-[#B4593F] transition-colors"
          icon-class="w-4 h-4"
        />
        <button
          type="button"
          class="w-9 h-9 flex items-center justify-center bg-[#FDFAF4] text-[#16211E] hover:text-brand-700 transition-colors"
          :title="storefrontContent.actions.quickView"
          @click.prevent="$emit('quick-view', product)"
        >
          <Icon name="lucide:eye" class="w-4 h-4" />
        </button>
      </div>
      </div>
    </div>

    <!-- Details -->
    <div :class="viewMode === 'list' ? 'flex-1 min-w-0 text-start py-1' : 'mt-4 text-start w-full'">
      <NuxtLink :to="`/product/${product.slug}`" class="block">
        <h3
          class="font-medium leading-snug transition-colors"
          :class="[
            isDark ? 'text-[#FDFAF4] group-hover:text-[#DFA254]' : 'text-[#16211E] group-hover:text-brand-700',
            viewMode === 'list' ? 'text-lg sm:text-xl mb-2' : 'text-[15px] line-clamp-2'
          ]"
        >
          {{ product.title }}
        </h3>
      </NuxtLink>

      <p
        v-if="viewMode === 'list'"
        class="text-sm mb-4 line-clamp-2"
        :class="isDark ? 'text-[#F2ECE1]/70' : 'text-[#5A6763]'"
      >
        {{ product.description || storefrontContent.product.descriptionFallback }}
      </p>

      <div class="flex items-baseline gap-2.5 mt-2">
        <span
          class="emb-display text-xl tabular-nums"
          :class="isDark ? 'text-[#DFA254]' : 'text-brand-700'"
        >{{ formatAmount(displayPrice) }}</span>
        <span class="text-[11px]" :class="isDark ? 'text-[#F2ECE1]/50' : 'text-[#8E9793]'">{{ currencyCode }}</span>
        <span
          v-if="originalPrice"
          class="text-xs line-through"
          :class="isDark ? 'text-[#F2ECE1]/40' : 'text-[#8E9793]'"
        >{{ formatAmount(originalPrice) }}</span>
      </div>

      <div v-if="viewMode === 'list'" class="mt-5">
        <button
          v-if="storeSettings?.cartEnabled !== false"
          type="button"
          :disabled="isOutOfStock || !product.isActive"
          class="h-11 px-6 bg-brand-600 text-[#FDFAF4] emb-label hover:bg-[#DFA254] hover:text-[#062622] transition-colors disabled:bg-[#CBBDAB] disabled:text-[#5A6763] disabled:cursor-not-allowed"
          @click.prevent="handleAddToCart"
        >
          {{ isOutOfStock ? storefrontContent.actions.outOfStock : storefrontContent.actions.addToCart }}
        </button>
      </div>
    </div>

    <!-- Success Toast -->
    <Transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSuccess"
        class="fixed bottom-4 end-4 z-50 bg-[#062622] text-[#F2ECE1] px-5 py-4 shadow-xl flex items-center gap-4 border-s-2 border-[#DFA254]"
      >
        <span class="emb-star w-5 h-5 text-[#DFA254] shrink-0" />
        <div>
          <div class="emb-label text-[#FDFAF4]">{{ successTitle }}</div>
          <div class="text-xs text-[#F2ECE1]/60 mt-1">{{ successMessage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
