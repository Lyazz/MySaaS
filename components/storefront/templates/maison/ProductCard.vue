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

const originalPrice = computed(() => Number(props.product.price))
const displayPrice = computed(() => {
  if (isPromoValid.value && props.product.promotionalPrice) return Number(props.product.promotionalPrice)
  return originalPrice.value
})

const cartStore = useCartStore()
const { format: formatPrice } = useCurrency()

const mainImage = computed(() => {
  if (props.product?.productImages?.length > 0) return props.product.productImages[0].url
  if (props.product?.images?.length > 0) return props.product.images[0]
  return '/blank.svg'
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
  triggerSuccessToast('Ajouté au panier', 'Consulter votre panier pour finaliser')
}
</script>

<template>
  <div
    class="group relative bg-white transition-all duration-300 hover:shadow-lg hover:shadow-[#C17B4E]/10"
    :class="[viewMode === 'list' ? 'flex gap-5 items-start p-4' : 'flex flex-col']"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Image -->
    <div
      class="relative overflow-hidden bg-[#F5F0EA]"
      :class="[viewMode === 'list' ? 'w-40 flex-shrink-0 aspect-square' : 'w-full aspect-[3/4]']"
    >
      <NuxtLink :to="`/p/${product.slug}`" class="block w-full h-full">
        <img
          :src="mainImage"
          :alt="product.title"
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        >
      </NuxtLink>

      <!-- Promo badge -->
      <div v-if="isPromoValid" class="absolute top-3 left-3 bg-[#C17B4E] text-white text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 font-medium">
        Promo
      </div>

      <!-- Favorite -->
      <StorefrontSharedFavoriteButton
        :product-id="product.id"
        button-class="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#B0A090] hover:text-[#C17B4E] transition-colors shadow-sm"
        icon-class="w-4 h-4"
      />

      <!-- Add to cart — appears on hover -->
      <button
        class="absolute bottom-0 left-0 right-0 bg-[#2C2420] text-white text-[10px] tracking-[0.2em] uppercase py-3 font-medium transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 hover:bg-[#C17B4E]"
        @click.prevent="handleAddToCart"
      >
        Ajouter au panier
      </button>

      <!-- Countdown -->
      <div v-if="product.showCountdown && product.promotionEndDate && isPromoValid" class="absolute bottom-10 inset-x-0 z-20 flex justify-center pointer-events-none">
        <div class="scale-90 origin-bottom">
          <StorefrontSharedCountdownTimer
            :end-date="product.promotionEndDate"
            theme="danger"
            :show-icon="true"
          />
        </div>
      </div>
    </div>

    <!-- Info -->
    <div
      class="flex flex-col"
      :class="[viewMode === 'list' ? 'flex-1 py-1' : 'p-4 pt-3']"
    >
      <p class="text-[9px] tracking-[0.25em] uppercase text-[#B0A090] font-medium mb-2">
        {{ product.category?.title || 'Maison & Déco' }}
      </p>
      <h3 class="text-sm font-medium text-[#2C2420] leading-snug mb-3">
        <NuxtLink :to="`/p/${product.slug}`" class="hover:text-[#C17B4E] transition-colors">
          {{ product.title }}
        </NuxtLink>
      </h3>
      <div class="mt-auto flex items-center gap-2">
        <span class="font-semibold text-[#C17B4E] text-sm">
          {{ formatPrice(displayPrice) }}
        </span>
        <span v-if="isPromoValid && originalPrice !== displayPrice" class="text-xs text-[#B0A090] line-through">
          {{ formatPrice(originalPrice) }}
        </span>
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
        class="fixed bottom-4 right-4 z-50 bg-white px-5 py-4 shadow-2xl border border-[#E8E0D4] flex items-center gap-4"
      >
        <div class="w-8 h-8 bg-[#C17B4E]/15 flex items-center justify-center shrink-0">
          <Icon name="lucide:check" class="w-4 h-4 text-[#C17B4E]" />
        </div>
        <div>
          <div class="text-sm font-semibold text-[#2C2420]">{{ successTitle }}</div>
          <div class="text-xs text-[#7A6558]">{{ successMessage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
