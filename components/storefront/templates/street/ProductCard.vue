<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const props = defineProps<{
    product: any
    viewMode?: 'grid' | 'list'
}>()


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
const { format: formatPrice } = useCurrency()
const { currencyCode } = useCurrency()
const storefrontContent = useStorefrontContent()

// Ensure image exists
const mainImage = computed(() => {
    if (props.product?.productImages?.length > 0) return props.product.productImages[0].url
    if (props.product?.images?.length > 0) return props.product.images[0]
    return '/blank.svg?v=2'
})

const isHovered = ref(false)

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
  triggerSuccessToast('ADDED!', 'Item in your cart')
}
</script>

<template>
    <div 
        class="group relative bg-white border-2 border-black transition-all duration-200"
        :class="[
            viewMode === 'list' ? 'flex gap-6 p-4' : 'flex flex-col',
            'hover:shadow-[8px_8px_0px_0px_var(--brand)] hover:-translate-y-1 hover:-translate-x-1'
        ]"
        @mouseenter="isHovered = true"
        @mouseleave="isHovered = false"
    >
        <!-- Badge -->
        <div class="absolute top-2 start-2 z-10 flex flex-col gap-1 items-start">
            <span v-if="product.isNew" class="bg-brand text-black px-3 py-1 border-2 border-black font-street uppercase transform -rotate-2 group-hover:rotate-0 transition-transform">
                NEW DROP
            </span>
            <span v-if="isClearanceEligible" class="bg-amber-500 text-black px-3 py-1 border-2 border-black font-street uppercase transform -rotate-2 group-hover:rotate-0 transition-transform">
                {{ t('storefront.clearance.badge') }}
            </span>
        </div>

        <!-- Image -->
        <div 
            class="relative overflow-hidden border-b-2 border-black aspect-square bg-gray-100"
            :class="[ viewMode === 'list' ? 'w-48 border-2 mb-0' : 'w-full' ]"
        >
            <NuxtLink :to="`/product/${product.slug}`" class="block w-full h-full">
                 <img 
                    :src="mainImage" 
                    :alt="product.title" 
                    class="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all duration-300"
                >
            </NuxtLink>

            <StorefrontSharedFavoriteButton
                :product-id="product.id"
                button-class="absolute top-2 end-2 w-10 h-10 bg-white border-2 border-black flex items-center justify-center hover:bg-red-50 transition-colors"
                icon-class="w-5 h-5"
                inactive-class="text-black"
                active-class="text-red-600"
            />
           
            <!-- Quick Add Overlay (Street Style) -->
            <button 
                @click.prevent="handleAddToCart"
                class="absolute bottom-0 start-0 w-full bg-black text-white py-3 font-street text-xl uppercase tracking-widest translate-y-full group-hover:translate-y-0 transition-transform duration-200 hover:bg-brand hover:text-black border-t-2 border-black"
            >
                {{ storefrontContent.actions.addToCart }}
            </button>
        
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
        <div class="p-4 flex flex-col flex-grow">
            
<h3 class="font-street text-2xl leading-none mb-2 uppercase truncate">
                <NuxtLink :to="`/product/${product.slug}`">
                    {{ product.title }}
                </NuxtLink>
            </h3>
            
            <div class="flex items-center justify-between mt-auto">
                <span class="font-mono font-bold text-lg bg-black text-white px-2 py-0.5">
                    {{ formatPrice(product.price) }}
                </span>
                
                <div class="font-mono text-xs text-gray-500 uppercase">
                    {{ product.category?.title || 'Collection' }}
                </div>
            </div>
        </div>
        
        <!-- Success Toast -->
        <Transition
          enter-active-class="transform ease-out duration-200 transition"
          enter-from-class="translate-y-4 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition ease-in duration-100"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="showSuccess"
            class="fixed bottom-4 right-4 z-50 bg-black text-white px-6 py-4 border-2 border-brand shadow-[4px_4px_0px_0px_var(--brand)] flex items-center gap-4"
          >
            <div class="w-8 h-8 bg-brand flex items-center justify-center text-black shrink-0 border-2 border-black">
              <Icon name="lucide:check" class="w-5 h-5" />
            </div>
            <div>
              <div class="font-street text-xl uppercase">{{ successTitle }}</div>
              <div class="text-xs text-gray-400 uppercase">{{ successMessage }}</div>
            </div>
          </div>
        </Transition>
    </div>
</template>
