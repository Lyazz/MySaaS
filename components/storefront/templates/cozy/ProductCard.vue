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

const cartStore = useCartStore()
const { format: formatPrice } = useCurrency()

// Ensure image exists
const mainImage = computed(() => {
    if (props.product?.productImages?.length > 0) return props.product.productImages[0].url
    if (props.product?.images?.length > 0) return props.product.images[0]
    return 'https://placehold.co/600x600/e2e8f0/64748b?text=Cozy'
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

function handleAddToCart() {
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
  triggerSuccessToast('Added to basket', 'View your basket to checkout')
}
</script>

<template>
    <div 
        class="group relative bg-white rounded-[2.5rem] p-4 transition-all duration-500 hover:shadow-xl hover:shadow-brand-100/40 hover:-translate-y-1"
        :class="[ viewMode === 'list' ? 'flex gap-6 items-center' : 'flex flex-col' ]"
        @mouseenter="isHovered = true"
        @mouseleave="isHovered = false"
    >
        <!-- Image Container -->
        <div 
            class="relative overflow-hidden rounded-[2rem] bg-slate-50 aspect-square"
            :class="[ viewMode === 'list' ? 'w-48 mb-0' : 'w-full mb-4' ]"
        >
            <NuxtLink :to="`/p/${product.slug}`" class="block w-full h-full">
                 <img 
                    :src="mainImage" 
                    :alt="product.title" 
                    class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                >
            </NuxtLink>
            
            <StorefrontSharedFavoriteButton
                :product-id="product.id"
                button-class="absolute top-4 left-4 w-12 h-12 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                icon-class="w-6 h-6"
            />

            <!-- Floating Add Button -->
            <button 
                @click.prevent="handleAddToCart"
                class="absolute bottom-4 right-4 w-12 h-12 bg-white/90 backdrop-blur-md text-brand-600 rounded-full flex items-center justify-center shadow-lg transform translate-y-16 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-brand-500 hover:text-white"
            >
                <Icon name="lucide:plus" class="w-6 h-6" />
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
        <div class="flex-grow flex flex-col items-center text-center">
            <div class="text-[10px] font-bold tracking-widest text-brand-400 uppercase mb-2">
                {{ product.category?.title || 'Essentials' }}
            </div>
            
            
<h3 class="font-cozy font-bold text-lg text-slate-800/90 mb-2 leading-tight">
                <NuxtLink :to="`/p/${product.slug}`">
                    {{ product.title }}
                </NuxtLink>
            </h3>
            
            <span class="font-bold text-brand-600 bg-brand-50 px-4 py-1 rounded-full text-sm mt-auto">
                {{ formatPrice(product.price) }}
            </span>
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
        class="fixed bottom-4 right-4 z-50 bg-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-4"
      >
        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
          <Icon name="lucide:check" class="w-5 h-5 text-green-600" />
        </div>
        <div>
          <div class="font-bold text-slate-800">{{ successTitle }}</div>
          <div class="text-sm text-slate-500">{{ successMessage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
