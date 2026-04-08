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
}

const props = defineProps<{
  product: Product,
  viewMode?: 'grid' | 'list'
}>()

defineEmits(['quick-view'])

const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')
const { currencyCode } = useCurrency()
const storefrontContent = useStorefrontContent()

const mainImage = computed(() => {
    if (props.product.images && props.product.images.length > 0) {
        return props.product.images[0]
    }
    return 'https://placehold.co/400x550/1A1F2E/D4C5A9?text=Chrono'
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

const isNew = computed(() => false)

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

function handleAddToCart() {
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
        ? 'flex flex-row items-center gap-6 p-4' 
        : 'flex flex-col items-center'
    ]"
    :style="viewMode === 'list' ? 'background-color:#131720;border:1px solid rgba(212,197,169,0.08);border-radius:2px;' : ''"
  >
    <!-- Image Card -->
    <div 
      class="relative overflow-hidden"
      :class="[
        viewMode === 'list' 
          ? 'w-48 h-48 aspect-square flex-shrink-0' 
          : 'w-full aspect-[3/4] transition-shadow duration-500 group-hover:shadow-xl'
      ]"
      style="border-radius: 2px; background-color: #131720;"
    >
      <!-- Background Image -->
      <NuxtLink :to="`/p/${product.slug}`" class="block w-full h-full">
        <img
          :src="mainImage"
          :alt="product.title"
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        >
      </NuxtLink>
        
      <!-- Subtle dark vignette on hover -->
      <div v-if="viewMode !== 'list'" class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style="background: linear-gradient(to top, rgba(8,11,18,0.4) 0%, transparent 50%);" />

      <!-- Badges (Top Left) -->
      <div class="absolute top-3 left-3 flex flex-col gap-2 items-start z-10">
        <span
          v-if="isNew"
          class="px-2.5 py-1 text-xs font-medium tracking-wider uppercase"
          style="background-color: #A67C52; color: #fff; border-radius: 1px;"
        >New</span>
        <span
          v-if="isPromoValid"
          class="px-2.5 py-1 text-xs font-medium tracking-wider"
          style="background-color: #C1440E; color: #fff; border-radius: 1px;"
        >-{{ Math.round(((Number(product.price) - Number(product.promotionalPrice)) / Number(product.price)) * 100) }}%</span>
      </div>

      <!-- Floating Actions (Right) -->
      <div 
        class="absolute top-3 right-3 flex flex-col gap-2 transition-all duration-300 z-10"
        :class="[
           viewMode === 'list' ? 'opacity-0 group-hover:opacity-100' : 'translate-x-0 opacity-100 lg:translate-x-8 lg:opacity-0 lg:group-hover:translate-x-0 lg:group-hover:opacity-100'
        ]"
      >
        <StorefrontSharedFavoriteButton
          :product-id="product.id"
          button-class="w-9 h-9 backdrop-blur-md flex items-center justify-center shadow-md transition-all duration-200"
          :button-style="{
            backgroundColor: 'rgba(14,17,23,0.85)',
            border: '1px solid rgba(212,197,169,0.2)',
            borderRadius: '1px'
          }"
          icon-class="w-4 h-4"
          inactive-class="text-[#D4C5A9]"
          active-class="text-red-400"
        />

        <button
           class="w-9 h-9 backdrop-blur-md flex items-center justify-center shadow-md transition-all duration-200" 
           style="background-color: rgba(14,17,23,0.85); border: 1px solid rgba(212,197,169,0.2); color: #D4C5A9; border-radius: 1px;"
           title="Quick View"
           @click.prevent="$emit('quick-view', product)"
        >
            <Icon name="lucide:eye" class="w-4 h-4" />
        </button>

        <button
          v-if="storeSettings?.cartEnabled !== false"
          :disabled="isOutOfStock || !product.isActive"
          class="w-9 h-9 backdrop-blur-md flex items-center justify-center shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style="background-color: rgba(14,17,23,0.85); border: 1px solid rgba(212,197,169,0.2); color: #D4C5A9; border-radius: 1px;"
          :title="storefrontContent.actions.addToCart"
          @click.prevent="handleAddToCart"
        >
          <Icon name="lucide:shopping-bag" class="w-4 h-4" />
        </button>
      </div>

      <!-- Stock Badge -->
      <div
        v-if="product.stock > 0 && viewMode !== 'list'"
        class="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <span
          v-if="isLowStock"
          class="px-2 py-1 text-[10px] font-medium tracking-wider uppercase"
          style="background-color: rgba(120,60,10,0.9); color: #FCD34D; border-radius: 1px;"
        >Low Stock</span>
        <span
          v-else
          class="px-2 py-1 text-[10px] font-medium tracking-wider uppercase"
          style="background-color: rgba(14,17,23,0.85); color: #A67C52; border: 1px solid rgba(166,124,82,0.25); border-radius: 1px;"
        >In Stock</span>
      </div>

      <div
        v-if="isOutOfStock && viewMode !== 'list'"
        class="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <span 
          class="px-2 py-1 text-[10px] font-medium tracking-wider uppercase"
          style="background-color: rgba(139,20,20,0.85); color: #FCA5A5; border-radius: 1px;"
        >Out of Stock</span>
      </div>
    
      <!-- Countdown Overlay -->
      <div v-if="product.showCountdown && product.promotionEndDate && isPromoValid" class="absolute bottom-0 inset-x-0 z-20 flex justify-center pt-8 pb-3 pointer-events-none" style="background: linear-gradient(to top, rgba(8,11,18,0.8), transparent);">
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
          ? 'flex-1 text-left' 
          : 'mt-4 text-left w-full px-1'
      ]"
    >
      <NuxtLink :to="`/p/${product.slug}`" class="block">
        <h3 
          class="font-light leading-snug tracking-wide transition-colors duration-200 group-hover:text-[#D4C5A9]"
          :class="[ viewMode === 'list' ? 'text-xl mb-2' : 'text-sm uppercase truncate' ]"
          style="color: #C2B89A; font-family: 'Cormorant Garamond', serif;"
        >
          {{ product.title }}
        </h3>
      </NuxtLink>

      <p v-if="viewMode === 'list'" class="text-sm mb-4 line-clamp-2" style="color: #5A5450;">
        {{ product.description || 'No description available.' }}
      </p>

      <div 
        class="flex items-baseline gap-2.5" 
        :class="[ viewMode === 'list' ? '' : 'mt-1.5' ]"
      >
        <span class="text-base font-medium" style="color: #D4C5A9;">{{ displayPrice.toLocaleString() }} <span class="text-xs font-normal" style="color: #7A7060;">{{ currencyCode }}</span></span>
        <span v-if="originalPrice" class="text-xs line-through" style="color: #4A4540;">{{ originalPrice.toLocaleString() }} {{ currencyCode }}</span>
      </div>

      <!-- List View CTA -->
      <div v-if="viewMode === 'list'" class="mt-5 flex gap-3">
        <button 
           v-if="storeSettings?.cartEnabled !== false"
           :disabled="product.stock === 0"
           class="px-6 py-2.5 text-sm font-medium tracking-[0.15em] uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
           style="background-color: #1F2533; border: 1px solid rgba(166,124,82,0.3); color: #D4C5A9; border-radius: 1px;"
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
        class="fixed bottom-4 right-4 z-50 px-6 py-4 shadow-2xl flex items-center gap-4"
        style="background-color: #1A1F2E; border: 1px solid rgba(212,197,169,0.15); border-radius: 2px; color: #E8E0D5;"
      >
        <div class="w-8 h-8 flex items-center justify-center shrink-0" style="background-color: #A67C52; border-radius: 1px; color: #fff;">
          <Icon name="lucide:check" class="w-4 h-4" />
        </div>
        <div>
          <div class="font-medium text-sm" style="color: #D4C5A9;">{{ successTitle }}</div>
          <div class="text-xs mt-0.5" style="color: #7A7060;">{{ successMessage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
