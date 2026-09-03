<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import ProductGallery from './partials/ProductGallery.vue'
import ProductDetails from './partials/ProductDetails.vue'
import ProductOrderForm from './partials/ProductOrderForm.vue'
import RelatedProducts from './partials/RelatedProducts.vue'
import { findBestVariantForSelection, getPreferredInitialSelection, type SelectedOptions } from '../modern/variant-ux'
import { buildScopedProductPricing } from '~/shared/pricing/product-pricing'

const props = defineProps<{
    product: any
    relatedProducts?: any[]
}>()

const cartStore = useCartStore()
const storefrontContent = useStorefrontContent()

const selectedOptions = ref<SelectedOptions>({})

watch(() => props.product, (newProduct) => {
    if (!newProduct?.options || newProduct.options.length === 0) {
        selectedOptions.value = {}
        return
    }
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
    if (currentVariant.value && currentVariant.value.images && currentVariant.value.images.length > 0) {
        return currentVariant.value.images.map((vi: any) => vi.image.url)
    }
    if (props.product?.productImages && props.product.productImages.length > 0) {
        return props.product.productImages.map((pi: any) => pi.url)
    }
    if (props.product?.images && props.product.images.length > 0) {
        return props.product.images
    }
    return ['/blank.svg?v=2']
})

const cartImage = computed(() => images.value[0])

watch([() => props.product, selectedOptions], ([product]) => {
    if (!product?.variants || product.variants.length === 0) return
    const best = findBestVariantForSelection({ product, selectedOptions: selectedOptions.value })
    if (!best) {
        selectedOptions.value = getPreferredInitialSelection(product)
    }
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
  <div class="min-h-screen" style="background-color:#0E1117; font-family: 'Cormorant Garamond', serif;">
    <!-- Top Announcement Bar -->
    <div class="text-center py-3 px-4 text-xs flex items-center justify-center gap-3 relative z-10 border-b" style="background-color:#1A1F2E; color:#A67C52; border-color:rgba(212,197,169,0.08);">
        <Icon name="lucide:gem" class="w-3.5 h-3.5" />
        <span class="tracking-[0.25em] uppercase">{{ $t('storefront.product.saleBanner') }}</span>
        <Icon name="lucide:gem" class="w-3.5 h-3.5" />
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Breadcrumb -->
      <nav class="flex items-center text-xs mb-8" style="color:#5A5450;">
        <NuxtLink to="/" class="hover:text-[#D4C5A9] transition-colors tracking-wider uppercase">Home</NuxtLink>
        <Icon name="lucide:chevron-right" class="w-3.5 h-3.5 mx-2" style="color:#3A3530;" />
        <NuxtLink to="/products" class="hover:text-[#D4C5A9] transition-colors tracking-wider uppercase">Shop</NuxtLink>
        <Icon name="lucide:chevron-right" class="w-3.5 h-3.5 mx-2" style="color:#3A3530;" />
        <span class="tracking-wider uppercase truncate max-w-xs" style="color:#A67C52;">{{ product?.title }}</span>
      </nav>

      <div class="lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-16 items-start">
        <div class="lg:col-span-7">
             <ProductGallery :images="images" :title="product?.title" />
        </div>

        <div class="lg:col-span-5 flex flex-col gap-8">
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

        <!-- Full Description -->
        <div class="mt-14 col-span-12 max-w-4xl mx-auto">
            <div class="flex items-center gap-4 mb-6">
              <div class="w-8 h-px" style="background-color:#A67C52;"></div>
              <h2 class="text-sm font-medium tracking-[0.25em] uppercase" style="color:#A67C52;">
                {{ storefrontContent.product.detailsTitle }}
              </h2>
            </div>
            <CommonSafeRichText 
              v-if="product?.description" 
              class="prose prose-invert prose-lg max-w-none leading-relaxed p-8 border"
              style="background-color:#0B0E16; border-color:rgba(212,197,169,0.08); border-radius:2px; color:#8A8070;"
              :html="product.description"
            />
            <div
              v-else
              class="p-8 border"
              style="background-color:#0B0E16; border-color:rgba(212,197,169,0.08); border-radius:2px; color:#5A5450;"
            >
              <p>{{ storefrontContent.product.descriptionFallback }}</p>
            </div>
        </div>
        </div>
    </div>

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
