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
const hasDiscount = computed(() => isPromoValid.value && props.product.promotionalPrice && Number(props.product.promotionalPrice) < originalPrice.value)

const { t } = useI18n({ useScope: 'global' })
const clearance = useClearanceDiscount()
const isClearanceEligible = computed(() => clearance.isProductEligible(props.product))

const cartStore = useCartStore()
const requireVariantSelectionBeforeQuickAdd = useProductCardVariantGuard()
const { format: formatPrice } = useCurrency()
const storefrontContent = useStorefrontContent()

const mainImage = computed(() => {
  if (props.product?.productImages?.length > 0) return props.product.productImages[0].url
  if (props.product?.images?.length > 0) return props.product.images[0]
  return '/blank.svg?v=2'
})

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
  triggerSuccessToast(storefrontContent.value.toasts.addedToCart.title, storefrontContent.value.toasts.addedToCart.message)
}
</script>

<template>
  <div
    class="group relative"
    :class="viewMode === 'list' ? 'flex gap-6 items-start' : 'flex flex-col'"
  >
    <!-- Image -->
    <div
      class="relative bg-[#FBF8F2] border border-[#DAD2C4] overflow-hidden"
      :class="viewMode === 'list' ? 'w-40 sm:w-48 flex-shrink-0 aspect-[4/5]' : 'w-full aspect-[4/5]'"
    >
      <NuxtLink :to="`/product/${product.slug}`" class="block w-full h-full">
        <img
          :src="mainImage"
          :alt="product.title"
          class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        >
      </NuxtLink>

      <StorefrontSharedFavoriteButton
        :product-id="product.id"
        button-class="absolute top-2.5 end-2.5 w-9 h-9 bg-[#F4EFE6]/90 border border-[#C4B8A4] text-[#262019] hover:bg-[#B8532E] hover:text-[#F4EFE6] hover:border-[#B8532E] transition-colors flex items-center justify-center"
        icon-class="w-4 h-4"
      />

      <div class="absolute top-2.5 start-2.5 flex flex-col gap-1.5 items-start">
        <span
          v-if="hasDiscount"
          class="ed-ui text-[10px] font-semibold uppercase tracking-[0.14em] bg-[#B8532E] text-[#F4EFE6] px-2 py-1"
        >−{{ Math.round((1 - displayPrice / originalPrice) * 100) }}%</span>
        <span
          v-if="isClearanceEligible"
          class="ed-ui text-[10px] font-semibold uppercase tracking-[0.14em] bg-[#262019] text-[#F4EFE6] px-2 py-1"
        >{{ t('storefront.clearance.badge') }}</span>
      </div>

      <!-- Add -->
      <button
        class="absolute bottom-0 inset-x-0 bg-[#262019] text-[#F4EFE6] ed-ui text-[10px] font-semibold uppercase tracking-[0.18em] py-3 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[#97401F]"
        @click.prevent="handleAddToCart"
      >
        {{ storefrontContent.actions.addToCart }}
      </button>

      <!-- Countdown -->
      <div
        v-if="product.showCountdown && product.promotionEndDate && isPromoValid"
        class="absolute bottom-0 inset-x-0 z-20 flex justify-center bg-gradient-to-t from-[#1E1912]/70 via-[#1E1912]/20 to-transparent pt-8 pb-2.5 pointer-events-none group-hover:opacity-0 transition-opacity"
      >
        <div class="scale-[0.85] sm:scale-90 origin-bottom">
          <StorefrontSharedCountdownTimer :end-date="product.promotionEndDate" theme="danger" :show-icon="true" />
        </div>
      </div>
    </div>

    <!-- Text -->
    <div class="flex-grow pt-3" :class="viewMode === 'list' ? '' : 'flex flex-col'">
      <div class="ed-ui text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A7E6E] mb-1.5">
        {{ product.category?.title || storefrontContent.common.collection }}
      </div>
      <h3 class="ed-display text-[18px] leading-snug text-[#262019] mb-2">
        <NuxtLink :to="`/product/${product.slug}`" class="hover:text-[#97401F] transition-colors">{{ product.title }}</NuxtLink>
      </h3>
      <div class="flex items-baseline gap-2.5 mt-auto">
        <span class="ed-display text-[17px] text-[#B8532E]">{{ formatPrice(displayPrice) }}</span>
        <span v-if="hasDiscount" class="ed-ui text-[13px] text-[#8A7E6E] line-through">{{ formatPrice(originalPrice) }}</span>
      </div>
      <p v-if="viewMode === 'list' && product.miniDescription" class="text-[15px] text-[#4A4038] leading-relaxed mt-3 line-clamp-2">
        {{ product.miniDescription }}
      </p>
    </div>

    <!-- Toast -->
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSuccess"
        class="fixed bottom-4 end-4 z-50 bg-[#FBF8F2] border border-[#C4B8A4] px-5 py-4 shadow-[0_20px_44px_-28px_rgba(38,32,25,0.5)] flex items-center gap-4"
      >
        <div class="w-9 h-9 bg-[#EFE0D5] flex items-center justify-center shrink-0">
          <Icon name="lucide:check" class="w-4 h-4 text-[#97401F]" />
        </div>
        <div>
          <div class="ed-display text-[15px] text-[#262019]">{{ successTitle }}</div>
          <div class="ed-ui text-xs text-[#8A7E6E]">{{ successMessage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
