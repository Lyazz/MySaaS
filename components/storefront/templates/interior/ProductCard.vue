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

const { t } = useI18n({ useScope: 'global' })
const clearance = useClearanceDiscount()
const isClearanceEligible = computed(() => clearance.isProductEligible(props.product))

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
        ? 'flex flex-row items-center gap-6 bg-white p-4 rounded-3xl border border-slate-100 hover:shadow-lg transition-all duration-300' 
        : 'flex flex-col items-center'
    ]"
  >
    <!-- Image Card -->
    <div 
      class="relative overflow-hidden rounded-3xl bg-gray-100 shadow-sm"
      :class="[
        viewMode === 'list' 
          ? 'w-48 h-48 aspect-square flex-shrink-0' 
          : 'w-full aspect-[3/4] shadow-lg hover:shadow-xl transition-all duration-300'
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
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        >
      </NuxtLink>
        
      <!-- Gradient Overlay (Grid Only) -->
      <div v-if="viewMode !== 'list'" class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <!-- Badges (Top Left) -->
      <div class="absolute top-3 start-3 flex flex-col gap-2 items-start z-10">
        <span
          v-if="isNew"
          class="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-lg shadow-sm backdrop-blur-md bg-opacity-90"
        >New</span>
        <span
          v-if="isPromoValid"
          class="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm backdrop-blur-md bg-opacity-90"
        >-{{ Math.round(((Number(product.price) - Number(product.promotionalPrice)) / Number(product.price)) * 100) }}%</span>
        <span
          v-if="isClearanceEligible"
          class="px-2.5 py-1 bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm backdrop-blur-md bg-opacity-90"
        >{{ t('storefront.clearance.badge') }}</span>
      </div>

      <!-- Floating Actions (Right) -->
      <!-- In List View, we might want these visible or positioned differently. For now, keep generic behavior or hide in list if preferred. 
           Let's keep them absolute for consistency but adjust visibility. -->
      <div 
        class="absolute top-3 end-3 flex flex-col gap-2 transition-all duration-300 z-10"
        :class="[
           viewMode === 'list' ? 'opacity-0 group-hover:opacity-100' : 'translate-x-0 opacity-100 lg:translate-x-10 lg:opacity-0 lg:group-hover:translate-x-0 lg:group-hover:opacity-100'
        ]"
      >
        <StorefrontSharedFavoriteButton
          :product-id="product.id"
          button-class="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-600 shadow-md transition-colors"
          icon-class="w-4 h-4"
        />

        <!-- Quick View -->
        <button
           class="w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-700 hover:bg-brand-50 hover:text-brand-600 shadow-md transition-colors" 
           title="Quick View"
           @click.prevent="$emit('quick-view', product)"
        >
            <Icon name="lucide:eye" class="w-4 h-4" />
        </button>

        <button
          v-if="storeSettings?.cartEnabled !== false"
          :disabled="isOutOfStock || !product.isActive"
          class="w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-700 hover:bg-brand-600 hover:text-white shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          :title="storefrontContent.actions.addToCart"
          @click.prevent="handleAddToCart"
        >
          <Icon name="lucide:handbag" class="w-4 h-4" />
        </button>
      </div>

      <!-- Static In Stock Badge (Grid Only) -->
      <div
        v-if="product.stock > 0 && viewMode !== 'list'"
        class="absolute bottom-3 end-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <span
          v-if="isLowStock"
          class="px-2.5 py-1 bg-amber-50/95 backdrop-blur text-amber-800 text-[10px] font-bold rounded-full shadow-sm ring-1 ring-amber-200"
        >Low Stock</span>
        <span
          v-else
          class="px-2.5 py-1 bg-white/90 backdrop-blur text-slate-700 text-[10px] font-bold rounded-full shadow-sm"
        >In Stock</span>
      </div>

      <div
        v-if="isOutOfStock && viewMode !== 'list'"
        class="absolute bottom-3 end-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <span class="px-2.5 py-1 bg-red-50/95 backdrop-blur text-red-800 text-[10px] font-bold rounded-full shadow-sm ring-1 ring-red-200">
          Out of Stock
        </span>
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

    <!-- Details -->
    <div 
      :class="[
        viewMode === 'list' 
          ? 'flex-1 text-start' 
          : 'mt-3 text-center w-full px-1'
      ]"
    >
      <NuxtLink
        :to="`/product/${product.slug}`"
        class="block group-hover:text-brand-600 transition-colors duration-200"
      >
        <h3 
          class="font-medium text-slate-900 leading-snug"
          :class="[ viewMode === 'list' ? 'text-xl mb-2' : 'text-base truncate' ]"
        >
          {{ product.title }}
        </h3>
      </NuxtLink>

      <p v-if="viewMode === 'list'" class="text-sm text-slate-500 mb-4 line-clamp-2">
        {{ product.description || 'No description available for this product.' }}
      </p>

      <div 
        class="flex items-center gap-2" 
        :class="[ viewMode === 'list' ? '' : 'justify-center mt-1' ]"
      >
        <span class="text-lg font-bold text-slate-900">{{ formatAmount(displayPrice) }} <span class="text-xs font-normal text-slate-500">{{ currencyCode }}</span></span>
        <span
          v-if="originalPrice"
          class="text-xs text-slate-400 line-through"
        >{{ formatAmount(originalPrice) }} {{ currencyCode }}</span>
      </div>

<!-- List View Extra Actions -->
       <div v-if="viewMode === 'list'" class="mt-4 flex gap-3">
          <button 
             v-if="storeSettings?.cartEnabled !== false"
             :disabled="product.stock === 0"
             class="px-5 py-2 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-brand-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
        class="fixed bottom-4 end-4 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4 border border-slate-700/50 backdrop-blur-md bg-slate-900/95"
      >
        <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
          <Icon name="lucide:check" class="w-5 h-5" />
        </div>
        <div>
          <div class="font-bold">{{ successTitle }}</div>
          <div class="text-xs text-slate-300">{{ successMessage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
