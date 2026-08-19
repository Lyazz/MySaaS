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
  viewMode?: 'grid' | 'list'
}>()

defineEmits(['quick-view'])


const isPromoValid = computed(() => {
    if (!props.product?.isPromotionActive) return false
    const now = new Date().getTime()
    if (props.product.promotionStartDate && new Date(props.product.promotionStartDate).getTime() > now) return false
    if (props.product.promotionEndDate && new Date(props.product.promotionEndDate).getTime() < now) return false
    return true
})

const originalPrice = computed(() => {
    return Number(props.product.price)
})

const displayPrice = computed(() => {
    if (isPromoValid.value && props.product.promotionalPrice) {
        return Number(props.product.promotionalPrice)
    }
    return originalPrice.value
})

const { t } = useI18n({ useScope: 'global' })
const clearance = useClearanceDiscount()
const isClearanceEligible = computed(() => clearance.isProductEligible(props.product))

const cartStore = useCartStore()
const requireVariantSelectionBeforeQuickAdd = useProductCardVariantGuard()
const storeSettings = useState<any>('storeSettings')
const { currencyCode, formatAmount } = useCurrency()
const storefrontContent = useStorefrontContent()

const mainImage = computed(() => {
    if (props.product.images && props.product.images.length > 0) {
        return props.product.images[0]
    }
    return '/blank.svg?v=2'
})

// Struck-through original only when a promotion actually lowers the price
const hasPromoSaving = computed(() => isPromoValid.value && displayPrice.value < originalPrice.value)

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
    price: Number(props.product.price),
    bundleDeals: props.product.bundleDeals || [],
    isClearance: Boolean(props.product?.isClearance),
    stock: props.product.stock,
    image: mainImage.value,
    metaPixelIds: (props.product as any)?.metaPixelIds
  })
  triggerSuccessToast('Added to cart', 'Product added to your cart')
}
</script>

<template>
  <div
    class="group relative"
    :class="[
      viewMode === 'list'
        ? 'flex flex-row items-start gap-8 py-6 border-b border-wl-rule'
        : 'flex flex-col'
    ]"
  >
    <!-- Specimen window -->
    <div
      class="relative overflow-hidden bg-wl-card border border-wl-rule"
      :class="[
        viewMode === 'list'
          ? 'w-40 h-48 flex-shrink-0'
          : 'w-full aspect-[4/5]'
      ]"
    >
      <!-- Background Image -->
      <NuxtLink
        :to="`/product/${product.slug}`"
        class="block w-full h-full"
      >
        <img
          :src="mainImage"
          :alt="product.title"
          class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
        >
      </NuxtLink>
        
      <!-- Stamps (top start) -->
      <div class="absolute top-3 start-3 flex flex-col gap-1.5 items-start z-10">
        <span
          v-if="isClearanceEligible"
          class="wl-label px-2 py-1 bg-wl-ink text-wl-paper"
        >{{ t('storefront.clearance.badge') }}</span>
        <span
          v-if="isOutOfStock"
          class="wl-label px-2 py-1 bg-wl-paper text-wl-muted border border-wl-rule"
        >{{ storefrontContent.productForm.stock.outOfStock }}</span>
      </div>

      <!-- Quick Actions (fade up) -->
       <div
        class="absolute inset-x-0 bottom-0 flex justify-center gap-px p-3 transition-all duration-300 pointer-events-none"
        :class="[ viewMode !== 'list' ? 'translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100' : 'hidden' ]"
      >
         <StorefrontSharedFavoriteButton
            :product-id="product.id"
            button-class="pointer-events-auto h-10 w-10 bg-wl-card border border-wl-rule flex items-center justify-center hover:bg-wl-paper transition-colors"
            icon-class="w-4 h-4"
            inactive-class="text-wl-ink"
            active-class="text-red-700"
         />

         <button
            class="pointer-events-auto h-10 w-10 bg-wl-card border border-wl-rule border-s-0 flex items-center justify-center text-wl-ink hover:bg-wl-paper transition-colors"
            :title="storefrontContent.actions.quickView"
            @click.prevent="$emit('quick-view', product)"
         >
             <Icon name="lucide:eye" class="w-4 h-4" />
         </button>

         <button
           v-if="storeSettings?.cartEnabled !== false"
           :disabled="isOutOfStock || !product.isActive"
           class="pointer-events-auto h-10 w-10 bg-wl-ink text-wl-paper flex items-center justify-center hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
           :title="storefrontContent.actions.addToCart"
           @click.prevent="handleAddToCart"
         >
           <Icon name="lucide:plus" class="w-4 h-4" />
         </button>
      </div>
    
      <!-- Countdown Overlay -->
      <div v-if="product.showCountdown && product.promotionEndDate && isPromoValid" class="absolute bottom-0 inset-x-0 z-20 flex justify-center bg-gradient-to-t from-black/60 via-black/20 to-transparent pt-8 pb-3 pointer-events-none">
        <div class="scale-[0.85] sm:scale-90 origin-bottom">
          <StorefrontSharedCountdownTimer
            :end-date="product.promotionEndDate"
            theme="danger"
            :show-icon="true"
          />
        </div>
      </div>
    </div>

    <!-- The label: name, rule, data row -->
    <div
      :class="[
        viewMode === 'list'
          ? 'flex-1 min-w-0'
          : 'flex flex-col pt-4'
      ]"
    >
      <div v-if="viewMode === 'list'" class="mb-2">
         <span class="wl-label text-wl-muted">{{ storefrontContent.common.collection }}</span>
      </div>

      <NuxtLink
        :to="`/product/${product.slug}`"
        class="block"
      >
        <h3
          class="wl-display-sm text-wl-ink leading-snug"
          :class="[ viewMode === 'list' ? 'text-2xl mb-3' : 'text-[1.0625rem]' ]"
        >
          <span class="wl-underline">{{ product.title }}</span>
        </h3>
      </NuxtLink>

      <p v-if="viewMode === 'list'" class="text-wl-muted mb-6 max-w-2xl leading-relaxed text-sm">
        {{ product.description || storefrontContent.product.descriptionFallback }}
      </p>

      <!-- Data row: price reads against stock state across a hairline -->
      <div
        class="flex items-baseline justify-between gap-3 border-t border-wl-rule pt-2.5"
        :class="[ viewMode === 'list' ? 'mt-0 max-w-sm' : 'mt-3' ]"
      >
        <div class="flex items-baseline gap-2 min-w-0">
          <span class="wl-num font-medium text-wl-ink" :class="[viewMode === 'list' ? 'text-lg' : 'text-sm']">
              {{ formatAmount(displayPrice) }} {{ currencyCode }}
          </span>
          <span
            v-if="hasPromoSaving"
            class="wl-num text-xs text-wl-muted line-through decoration-wl-ruleStrong"
          >{{ formatAmount(originalPrice) }} {{ currencyCode }}</span>
        </div>

        <span
          v-if="isLowStock"
          class="wl-label text-brand-700 flex-shrink-0"
        >{{ storefrontContent.productForm.stock.lowStock(product.stock) }}</span>
        <span
          v-else-if="!isOutOfStock"
          class="wl-label text-wl-muted flex-shrink-0"
        >{{ storefrontContent.product.inStock }}</span>
      </div>

      <!-- List View Extra Actions -->
       <div v-if="viewMode === 'list'" class="mt-6 flex gap-2">
          <button
             v-if="storeSettings?.cartEnabled !== false"
             :disabled="product.stock === 0"
             class="px-7 py-3 bg-wl-ink text-wl-paper wl-label hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
             @click.prevent="handleAddToCart"
          >
             {{ storefrontContent.actions.addToCart }}
          </button>
          <StorefrontSharedFavoriteButton
            :product-id="product.id"
            button-class="px-4 py-3 border border-wl-rule hover:bg-wl-card transition-colors flex items-center"
            icon-class="w-4 h-4"
            inactive-class="text-wl-muted"
            active-class="text-red-700"
          />
       </div>
    </div>

    <!-- Success Toast -->
    <Transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSuccess"
        class="fixed bottom-6 end-6 z-50 bg-wl-card text-wl-ink border border-wl-ink px-6 py-4 shadow-lg flex items-center gap-4"
      >
        <div class="w-6 h-6 border border-wl-ruleStrong text-wl-ink flex items-center justify-center shrink-0">
          <Icon name="lucide:check" class="w-3.5 h-3.5" />
        </div>
        <div>
          <div class="wl-label">{{ successTitle }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
