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

const discount = 0 


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
    price: Number(props.product.price),
    bundleDeals: props.product.bundleDeals || [],
    stock: props.product.stock,
    image: mainImage.value,
    metaPixelIds: (props.product as any)?.metaPixelIds
  })
  triggerSuccessToast(storefrontContent.value.toasts.addedToCart.title, storefrontContent.value.toasts.addedToCart.message)
}
</script>

<template>
  <div 
    class="group relative"
    :class="[
      viewMode === 'list' 
        ? 'flex flex-row items-center gap-6 bg-white p-4 border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all duration-300' 
        : 'flex flex-col items-center bg-white p-3 border border-stone-200 hover:border-stone-400 hover:shadow-md transition-all duration-300'
    ]"
  >
    <!-- Image Card -->
    <div 
      class="relative overflow-hidden bg-stone-50"
      :class="[
        viewMode === 'list' 
          ? 'w-48 h-48 aspect-square flex-shrink-0 border border-stone-100' 
          : 'w-full aspect-[3/4] bg-stone-50 border border-stone-100'
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
          class="px-2.5 py-1 bg-stone-900 text-white text-xs font-stationery italic"
        >{{ storefrontContent.badges.new }}</span>
        <span
          v-if="discount > 0"
          class="px-2.5 py-1 bg-brand-700 text-white text-xs font-stationery italic"
        >-{{ discount }}%</span>
        <span
          v-if="isClearanceEligible"
          class="px-2.5 py-1 bg-amber-700 text-white text-xs font-stationery italic"
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
          button-class="w-9 h-9 bg-white flex items-center justify-center hover:bg-red-50 hover:text-red-600 shadow-sm border border-stone-200 transition-colors"
          icon-class="w-4 h-4"
          inactive-class="text-stone-600"
          active-class="text-red-600"
        />

        <!-- Quick View -->
        <button
           class="w-9 h-9 bg-white flex items-center justify-center text-stone-600 hover:bg-white hover:text-brand-700 shadow-sm border border-stone-200 transition-colors" 
           :title="storefrontContent.actions.quickView"
           @click.prevent="$emit('quick-view', product)"
        >
            <Icon name="lucide:eye" class="w-4 h-4" />
        </button>

        <button
          v-if="storeSettings?.cartEnabled !== false"
          :disabled="isOutOfStock || !product.isActive"
          class="w-9 h-9 bg-white flex items-center justify-center text-stone-600 hover:bg-stone-900 hover:text-white shadow-sm border border-stone-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
          class="px-2.5 py-1 bg-white border border-stone-300 text-stone-900 text-[10px] font-stationery uppercase tracking-widest"
        >{{ storefrontContent.productForm.stock.lowStock(Number(product.stock ?? 0)) }}</span>
        <span
          v-else
          class="px-2.5 py-1 bg-white/90 backdrop-blur text-stone-600 text-[10px] font-stationery uppercase tracking-widest border border-stone-200"
        >{{ storefrontContent.product.inStock }}</span>
      </div>

      <div
        v-if="isOutOfStock && viewMode !== 'list'"
        class="absolute bottom-3 end-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <span class="px-2.5 py-1 bg-stone-100 text-stone-500 text-[10px] font-stationery uppercase tracking-widest border border-stone-200">
          {{ storefrontContent.actions.outOfStock }}
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
          class="font-medium text-stone-900 leading-snug font-stationery"
          :class="[ viewMode === 'list' ? 'text-xl mb-2' : 'text-base truncate' ]"
        >
          {{ product.title }}
        </h3>
      </NuxtLink>

      <p v-if="viewMode === 'list'" class="text-sm text-slate-500 mb-4 line-clamp-2">
        {{ product.description || storefrontContent.product.descriptionFallback }}
      </p>

      <div 
        class="flex items-center gap-2" 
        :class="[ viewMode === 'list' ? '' : 'justify-center mt-1' ]"
      >
        <span class="text-lg font-bold text-slate-900">{{ formatAmount(product.price) }} <span class="text-xs font-normal text-slate-500">{{ currencyCode }}</span></span>
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
             class="px-5 py-2 bg-stone-900 text-white text-sm font-medium hover:bg-stone-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-stationery uppercase tracking-wider"
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
        class="fixed bottom-4 end-4 z-50 bg-white px-6 py-4 shadow-lg flex items-center gap-4 border border-stone-200"
      >
        <div class="w-8 h-8 flex items-center justify-center text-green-600 shrink-0">
          <Icon name="lucide:check" class="w-5 h-5" />
        </div>
        <div>
          <div class="font-stationery text-stone-800">{{ successTitle }}</div>
          <div class="text-xs text-stone-500">{{ successMessage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
