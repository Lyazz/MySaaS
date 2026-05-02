<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import ProductGallery from './partials/ProductGallery.vue'
import ProductDetails from './partials/ProductDetails.vue'
import ProductOrderForm from './partials/ProductOrderForm.vue'
import RelatedProducts from './partials/RelatedProducts.vue'
import { findBestVariantForSelection, getPreferredInitialSelection, type SelectedOptions } from './variant-ux'
import { buildScopedProductPricing } from '~/shared/pricing/product-pricing'

const props = defineProps<{
    product: any
    relatedProducts?: any[]
}>()

const cartStore = useCartStore()
const storefrontContent = useStorefrontContent()

const selectedOptions = ref<SelectedOptions>({})

watch(() => props.product, (newProduct) => {
    if (!newProduct?.options || newProduct.options.length === 0) { selectedOptions.value = {}; return }
    selectedOptions.value = getPreferredInitialSelection(newProduct)
}, { immediate: true })

const currentVariant = computed(() => {
    if (!props.product?.variants || props.product.variants.length === 0) return null
    if (!props.product?.options || props.product.options.length === 0) return props.product.variants[0] ?? null
    if (Object.keys(selectedOptions.value).length === 0) return null
    return findBestVariantForSelection({ product: props.product, selectedOptions: selectedOptions.value })
})

const pricing = computed(() => buildScopedProductPricing(props.product, currentVariant.value))
const originalPrice = computed(() => pricing.value.originalPrice)
const currentPrice = computed(() => pricing.value.effectivePrice)

const currentStock = computed(() => {
    if (!currentVariant.value) return props.product?.stock
    if (currentVariant.value.trackInventory === false) return Number.POSITIVE_INFINITY
    const stock = Number(currentVariant.value.stock ?? 0)
    const reserved = Number(currentVariant.value.reserved ?? 0)
    const safety = Number(currentVariant.value.safetyStock ?? 0)
    return Math.max(stock - reserved - safety, 0)
})

const images = computed(() => {
    if (currentVariant.value?.images?.length > 0) return currentVariant.value.images.map((vi: any) => vi.image.url)
    if (props.product?.productImages?.length > 0) return props.product.productImages.map((pi: any) => pi.url)
    if (props.product?.images?.length > 0) return props.product.images
    return ['/blank.svg?v=2']
})

const cartImage = computed(() => images.value[0])

watch([() => props.product, selectedOptions], ([product]) => {
    if (!product?.variants || product.variants.length === 0) return
    const best = findBestVariantForSelection({ product, selectedOptions: selectedOptions.value })
    if (!best) selectedOptions.value = getPreferredInitialSelection(product)
})

const activeLoyaltyPreview = useActiveProductLoyaltyPreview()

watchEffect(() => {
    activeLoyaltyPreview.setPreview((currentVariant.value?.loyaltyPreview ?? props.product?.loyaltyPreview ?? null) as any)
})

onUnmounted(() => {
    activeLoyaltyPreview.reset()
})
</script>

<template>
  <div class="bg-[#fffbf0] min-h-screen" style="font-family: 'DM Sans', sans-serif">
    <!-- Announcement bar -->
    <div class="bg-violet-700 text-white text-center py-2.5 px-4 text-xs font-black flex items-center justify-center gap-3 border-b-3 border-violet-600">
      <Icon name="lucide:sparkles" class="w-3.5 h-3.5 text-amber-300 animate-pulse" />
      <span class="tracking-wide">{{ $t('storefront.product.saleBanner') }}</span>
      <Icon name="lucide:sparkles" class="w-3.5 h-3.5 text-amber-300 animate-pulse" />
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Breadcrumb -->
      <nav class="flex items-center text-sm text-stone-500 mb-8 gap-1.5 flex-wrap">
        <NuxtLink to="/" class="hover:text-violet-700 transition-colors font-medium">Home</NuxtLink>
        <Icon name="lucide:chevron-right" class="w-3.5 h-3.5 text-stone-300 flex-shrink-0" />
        <NuxtLink to="/products" class="hover:text-violet-700 transition-colors font-medium">Shop</NuxtLink>
        <Icon name="lucide:chevron-right" class="w-3.5 h-3.5 text-stone-300 flex-shrink-0" />
        <span class="font-black text-stone-900 truncate max-w-xs" style="font-family: 'Fredoka', sans-serif">{{ product?.title }}</span>
      </nav>

      <div class="lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-16 items-start">
        <!-- Gallery -->
        <div class="lg:col-span-6 relative z-10">
          <ProductGallery :images="images" :title="product?.title" />
        </div>

        <!-- Details + Order Form -->
        <div class="mt-8 lg:mt-0 lg:col-span-6 flex flex-col gap-7 sticky top-24">
          <ProductDetails
            :product="product"
            :current-price="currentPrice"
            :original-price="originalPrice"
            v-model:selected-options="selectedOptions"
          />
          <ProductOrderForm
            :product="product"
            :current-variant="currentVariant"
            :current-price="currentPrice"
            :current-stock="currentStock"
            :active-image="cartImage"
          />
        </div>
      </div>

      <!-- Full Description -->
      <div class="mt-16 max-w-4xl mx-auto animate-fade-in-up">
        <div class="flex items-center gap-3 justify-center mb-8">
          <span class="w-2 h-2 rounded-full bg-violet-400" />
          <h2 class="text-2xl font-black text-stone-900 text-center" style="font-family: 'Fredoka', sans-serif">
            {{ storefrontContent.product.detailsTitle }}
          </h2>
          <span class="w-2 h-2 rounded-full bg-amber-400" />
        </div>
        <div class="bg-white rounded-3xl border-3 border-violet-100 shadow-[0_4px_0_0_#ddd6fe] p-8 md:p-12">
          <SafeRichText
            v-if="product?.description"
            class="prose prose-stone prose-base max-w-none leading-relaxed"
            :html="product.description"
          />
          <p v-else class="text-stone-500 text-center">{{ storefrontContent.product.descriptionFallback }}</p>
        </div>
      </div>
    </div>

    <!-- Related Products -->
    <RelatedProducts
      v-if="relatedProducts && relatedProducts.length > 0"
      :products="relatedProducts"
    />
  </div>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
