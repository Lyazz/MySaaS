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

const cartStore = useCartStore()
const requireVariantSelectionBeforeQuickAdd = useProductCardVariantGuard()
const storeSettings = useState<any>('storeSettings')
const { currencyCode, formatAmount } = useCurrency()
const storefrontContent = useStorefrontContent()
const { t } = useI18n({ useScope: 'global' })
const clearance = useClearanceDiscount()
const isClearanceEligible = computed(() => clearance.isProductEligible(props.product))

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

const isNew = computed(() => {
    // Logic for "New" badge, e.g. created within last 30 days
    // For now, random or based on ID if we had that info, defaulting to false or passed prop
    return false
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
  triggerSuccessToast('Added to cart', 'Product added to your cart')
}
</script>

<template>
  <div
    class="group relative"
    :class="[
      viewMode === 'list'
        ? 'flex flex-row items-start gap-6 bg-[#FFFDF9] p-4 rounded-tl-[32px] rounded-tr-lg rounded-br-[32px] rounded-bl-lg border border-[#C9A24B]/35 hover:shadow-lg transition-all duration-300'
        : 'flex flex-col items-start'
    ]"
  >
    <!-- Image Card (arched/organic corner motif) -->
    <div
      class="relative overflow-hidden rounded-tl-[48px] rounded-tr-lg rounded-br-[48px] rounded-bl-lg bg-[#F3E7D8] shadow-sm"
      :class="[
        viewMode === 'list'
          ? 'w-48 h-48 aspect-square flex-shrink-0'
          : 'w-full aspect-[3/4] shadow-md hover:shadow-xl transition-all duration-300'
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
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        >
      </NuxtLink>

      <!-- Gradient Overlay (Grid Only) -->
      <div v-if="viewMode !== 'list'" class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#2E1E20]/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <!-- Badges (Top Start) -->
      <div class="absolute top-3 start-3 flex flex-col gap-2 items-start z-10">
        <span
          v-if="isNew"
          class="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-wide rounded-full shadow-sm backdrop-blur-md bg-opacity-90"
        >New</span>
        <span
          v-if="isPromoValid"
          class="px-2.5 py-1 bg-brand-600 text-white text-[10px] font-bold uppercase tracking-wide rounded-full shadow-sm backdrop-blur-md bg-opacity-90"
        >-{{ Math.round(((Number(product.price) - Number(product.promotionalPrice)) / Number(product.price)) * 100) }}%</span>
        <span
          v-if="isClearanceEligible"
          class="px-2.5 py-1 bg-[#C9A24B] text-white text-[10px] font-bold uppercase tracking-wide rounded-full shadow-sm backdrop-blur-md bg-opacity-90"
        >{{ t('storefront.clearance.badge') }}</span>
      </div>

      <!-- Stock Status (Top End, opposite the badges) -->
      <div
        v-if="product.stock > 0 && viewMode !== 'list'"
        class="absolute top-3 end-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
      >
        <span
          v-if="isLowStock"
          class="px-2.5 py-1 bg-amber-50/95 backdrop-blur text-amber-800 text-[10px] font-bold rounded-full shadow-sm ring-1 ring-amber-200"
        >Low Stock</span>
        <span
          v-else
          class="px-2.5 py-1 bg-[#FFFDF9]/90 backdrop-blur text-[#2E1E20] text-[10px] font-bold rounded-full shadow-sm"
        >In Stock</span>
      </div>

      <div
        v-if="isOutOfStock && viewMode !== 'list'"
        class="absolute top-3 end-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
      >
        <span class="px-2.5 py-1 bg-red-50/95 backdrop-blur text-red-800 text-[10px] font-bold rounded-full shadow-sm ring-1 ring-red-200">
          Out of Stock
        </span>
      </div>

      <!-- Countdown Overlay -->
      <div v-if="product.showCountdown && product.promotionEndDate && isPromoValid" class="absolute bottom-0 inset-x-0 z-20 flex justify-center bg-gradient-to-t from-[#2E1E20]/60 via-[#2E1E20]/20 to-transparent pt-8 pb-3 pointer-events-none">
        <div class="scale-[0.85] sm:scale-90 origin-bottom">
          <StorefrontSharedCountdownTimer
            :end-date="product.promotionEndDate"
            theme="danger"
            :show-icon="true"
          />
        </div>
      </div>

      <!-- Bottom Sliding Action Bar (grid cards): reveals on hover desktop, always on for touch -->
      <div
        v-if="viewMode !== 'list'"
        class="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-2 px-3 py-2.5 bg-[#FFFDF9]/95 backdrop-blur-sm border-t border-[#C9A24B]/25 transition-transform duration-300 translate-y-0 lg:translate-y-full lg:group-hover:translate-y-0"
      >
        <StorefrontSharedFavoriteButton
          :product-id="product.id"
          button-class="w-9 h-9 bg-[#FAF3EA] rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-700 shadow-sm transition-colors"
          icon-class="w-4 h-4"
        />

        <!-- Quick View -->
        <button
           class="w-9 h-9 bg-[#FAF3EA] rounded-full flex items-center justify-center text-[#2E1E20] hover:bg-brand-50 hover:text-brand-700 shadow-sm transition-colors"
           title="Quick View"
           @click.prevent="$emit('quick-view', product)"
        >
            <Icon name="lucide:eye" class="w-4 h-4" />
        </button>

        <button
          v-if="storeSettings?.cartEnabled !== false"
          :disabled="isOutOfStock || !product.isActive"
          class="flex-1 h-9 px-3 bg-[#2E1E20] rounded-full flex items-center justify-center gap-2 text-white hover:bg-brand-700 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          :title="storefrontContent.actions.addToCart"
          @click.prevent="handleAddToCart"
        >
          <Icon name="lucide:handbag" class="w-4 h-4" />
          <span class="text-xs font-semibold truncate">{{ storefrontContent.actions.addToCart }}</span>
        </button>
      </div>

      <!-- Floating Actions (List view only) -->
      <div
        v-if="viewMode === 'list'"
        class="absolute top-3 end-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
      >
        <StorefrontSharedFavoriteButton
          :product-id="product.id"
          button-class="w-9 h-9 bg-[#FFFDF9] rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-700 shadow-md transition-colors"
          icon-class="w-4 h-4"
        />
        <button
           class="w-9 h-9 bg-[#FFFDF9] rounded-full flex items-center justify-center text-[#2E1E20] hover:bg-brand-50 hover:text-brand-700 shadow-md transition-colors"
           title="Quick View"
           @click.prevent="$emit('quick-view', product)"
        >
            <Icon name="lucide:eye" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Details (left-aligned) -->
    <div
      :class="[
        viewMode === 'list'
          ? 'flex-1 text-start'
          : 'mt-4 text-start w-full px-1'
      ]"
    >
      <NuxtLink
        :to="`/product/${product.slug}`"
        class="block group-hover:text-brand-700 transition-colors duration-200"
      >
        <h3
          class="font-medium text-[#2E1E20] leading-snug"
          :class="[ viewMode === 'list' ? 'text-xl mb-2' : 'text-base truncate' ]"
        >
          {{ product.title }}
        </h3>
      </NuxtLink>

      <p v-if="viewMode === 'list'" class="text-sm text-[#6B5850] mb-4 line-clamp-2">
        {{ product.description || 'No description available for this product.' }}
      </p>

      <div
        class="flex items-center gap-2 mt-1"
      >
        <span class="text-lg font-bold text-[#2E1E20]">{{ formatAmount(displayPrice) }} <span class="text-xs font-normal text-[#6B5850]">{{ currencyCode }}</span></span>
        <span
          v-if="originalPrice"
          class="text-xs text-[#9C8B82] line-through"
        >{{ formatAmount(originalPrice) }} {{ currencyCode }}</span>
      </div>

      <!-- List View Extra Actions -->
       <div v-if="viewMode === 'list'" class="mt-4 flex gap-3">
          <button
             v-if="storeSettings?.cartEnabled !== false"
             :disabled="product.stock === 0"
             class="px-5 py-2 rounded-full bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
             @click.prevent="handleAddToCart"
          >
             {{ storefrontContent.actions.addToCart }}
          </button>
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
        class="fixed bottom-4 end-4 z-50 bg-[#2E1E20] text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4 border border-[#C9A24B]/30 backdrop-blur-md bg-opacity-95"
      >
        <div class="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
          <Icon name="lucide:check" class="w-5 h-5" />
        </div>
        <div>
          <div class="font-bold">{{ successTitle }}</div>
          <div class="text-xs text-white/70">{{ successMessage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
