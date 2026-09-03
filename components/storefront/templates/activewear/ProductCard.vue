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

// TODO: Replace with real discount logic when available in backend
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
    class="group relative font-activewear"
    :class="[
      viewMode === 'list' 
        ? 'flex flex-row items-center gap-6 bg-[#0f0f0f] p-4 border-2 border-[#222] hover:border-brand-500 transition-all duration-300 skew-x-[-5deg]' 
        : 'flex flex-col items-center skew-x-[-5deg] w-[calc(100%-10px)] ml-2'
    ]"
  >
    <!-- Image Card -->
    <div 
      class="relative overflow-hidden bg-[#1a1a1a] shadow-[4px_4px_0px_#222] group-hover:shadow-[6px_6px_0px_theme(colors.brand.500)] transition-all duration-300 border-2 border-[#222] group-hover:border-brand-500"
      :class="[
        viewMode === 'list' 
          ? 'w-48 h-48 aspect-square flex-shrink-0' 
          : 'w-[102%] aspect-[3/4] -ms-[2%] -mt-[2%]'
      ]"
    >
      <!-- Background Image -->
      <NuxtLink
        :to="`/product/${product.slug}`"
        class="block w-full h-full skew-x-[5deg] scale-[1.15] origin-center"
      >
        <img
          :src="mainImage"
          :alt="product.title"
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 mix-blend-luminosity hover:mix-blend-normal opacity-80 hover:opacity-100"
        >
      </NuxtLink>
        
      <!-- Gradient Overlay (Grid Only) -->
      <div v-if="viewMode !== 'list'" class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <!-- Badges (Top Left) -->
      <div class="absolute top-3 start-3 flex flex-col gap-2 items-start z-10 skew-x-[5deg]">
        <span
          v-if="isNew"
          class="px-3 py-1 bg-brand-500 text-black text-[11px] font-black rounded-none shadow-sm uppercase tracking-widest skew-x-[-10deg]"
        >New</span>
        <span
          v-if="discount > 0"
          class="px-3 py-1 bg-white text-black text-[11px] font-black rounded-none shadow-sm uppercase tracking-widest skew-x-[-10deg]"
        >-{{ discount }}%</span>
        <span
          v-if="isClearanceEligible"
          class="px-3 py-1 bg-amber-600 text-white text-[11px] font-black rounded-none shadow-sm uppercase tracking-widest skew-x-[-10deg]"
        >{{ t('storefront.clearance.badge') }}</span>
      </div>

      <!-- Floating Actions (Right) -->
      <!-- In List View, we might want these visible or positioned differently. For now, keep generic behavior or hide in list if preferred. 
           Let's keep them absolute for consistency but adjust visibility. -->
      <div 
        class="absolute top-3 end-3 flex flex-col gap-3 transition-all duration-300 z-10 skew-x-[5deg]"
        :class="[
           viewMode === 'list' ? 'opacity-0 group-hover:opacity-100' : 'translate-x-0 opacity-100 lg:translate-x-12 lg:opacity-0 lg:group-hover:translate-x-0 lg:group-hover:opacity-100'
        ]"
      >
        <StorefrontSharedFavoriteButton
          :product-id="product.id"
          button-class="w-10 h-10 bg-black border-2 border-[#333] flex items-center justify-center hover:border-brand-500 uppercase font-bold skew-x-[-10deg] transition-colors shadow-[2px_2px_0_#222] hover:shadow-[2px_2px_0_theme(colors.brand.500)]"
          icon-class="w-4 h-4 skew-x-[10deg]"
          inactive-class="text-white"
          active-class="text-brand-500"
        />

        <!-- Quick View -->
        <button
           class="w-10 h-10 bg-black border-2 border-[#333] flex items-center justify-center text-white hover:border-brand-500 hover:text-brand-500 uppercase font-bold skew-x-[-10deg] transition-colors shadow-[2px_2px_0_#222] hover:shadow-[2px_2px_0_theme(colors.brand.500)]" 
           title="Quick View"
           @click.prevent="$emit('quick-view', product)"
        >
            <Icon name="lucide:eye" class="w-4 h-4 skew-x-[10deg]" />
        </button>

        <button
          v-if="storeSettings?.cartEnabled !== false"
          :disabled="isOutOfStock || !product.isActive"
          class="w-10 h-10 bg-brand-500 border-2 border-brand-500 flex items-center justify-center text-black hover:bg-white hover:border-white font-bold skew-x-[-10deg] transition-all shadow-[2px_2px_0_#111] disabled:opacity-50 disabled:cursor-not-allowed group/btn"
          :title="storefrontContent.actions.addToCart"
          @click.prevent="handleAddToCart"
        >
          <Icon name="lucide:shopping-bag" class="w-4 h-4 skew-x-[10deg] group-hover/btn:scale-110 transition-transform" />
        </button>
      </div>

      <!-- Static In Stock Badge (Grid Only) -->
      <div
        v-if="product.stock > 0 && viewMode !== 'list'"
        class="absolute bottom-3 end-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 skew-x-[5deg]"
      >
        <span
          v-if="isLowStock"
          class="px-3 py-1 bg-red-500 text-white text-[11px] font-black uppercase tracking-widest skew-x-[-10deg] block"
        >Low Stock</span>
        <span
          v-else
          class="px-3 py-1 bg-[#111] border border-[#333] text-white text-[11px] font-black uppercase tracking-widest skew-x-[-10deg] block"
        >In Stock</span>
      </div>

      <div
        v-if="isOutOfStock && viewMode !== 'list'"
        class="absolute bottom-3 end-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 skew-x-[5deg]"
      >
        <span class="px-3 py-1 bg-[#333] text-[#888] text-[11px] font-black uppercase tracking-widest skew-x-[-10deg] block">
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
          ? 'flex-1 text-start skew-x-[5deg]' 
          : 'mt-4 text-center w-full px-2 skew-x-[5deg]'
      ]"
    >
      <NuxtLink
        :to="`/product/${product.slug}`"
        class="block group-hover:text-brand-500 transition-colors duration-200"
      >
        
<h3 
          class="font-black text-white uppercase italic tracking-wider leading-none"
          :class="[ viewMode === 'list' ? 'text-2xl mb-2' : 'text-xl truncate' ]"
        >
          {{ product.title }}
        </h3>
      </NuxtLink>

      <p v-if="viewMode === 'list'" class="text-base text-slate-400 font-medium mb-4 line-clamp-2">
        {{ product.description || 'No description available for this product.' }}
      </p>

      <div 
        class="flex items-center gap-2" 
        :class="[ viewMode === 'list' ? '' : 'justify-center mt-2' ]"
      >
        <span class="text-2xl font-black text-brand-500">{{ formatAmount(product.price) }} <span class="text-sm font-bold text-slate-500 ms-1">{{ currencyCode }}</span></span>
        <span
          v-if="originalPrice"
          class="text-sm text-slate-600 line-through font-bold"
        >{{ formatAmount(originalPrice) }} {{ currencyCode }}</span>
      </div>
      
      <!-- List View Extra Actions -->
       <div v-if="viewMode === 'list'" class="mt-4 flex gap-3">
          <button 
             v-if="storeSettings?.cartEnabled !== false"
             :disabled="product.stock === 0"
             class="px-6 py-2 bg-brand-500 text-black text-sm font-black uppercase tracking-widest skew-x-[-10deg] hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0_#222] hover:shadow-[4px_4px_0_#fff]"
             @click.prevent="handleAddToCart"
          >
             <span class="block skew-x-[10deg]">{{ storefrontContent.actions.addToCart }}</span>
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
        class="fixed bottom-4 right-4 z-50 bg-[#111] text-white px-6 py-4 border-l-4 border-brand-500 shadow-[8px_8px_0_#000] flex items-center gap-4 skew-x-[-5deg]"
      >
        <div class="w-8 h-8 rounded-none bg-brand-500 flex items-center justify-center text-black shrink-0 skew-x-[5deg]">
          <Icon name="lucide:check" class="w-5 h-5 font-bold" />
        </div>
        <div class="skew-x-[5deg]">
          <div class="font-black uppercase tracking-wider text-lg leading-none mb-1">{{ successTitle }}</div>
          <div class="text-sm text-slate-400 font-medium">{{ successMessage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
