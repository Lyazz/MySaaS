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

// Option Selection Logic
const selectedOptions = ref<SelectedOptions>({})

// Initialize options
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

// Image Gallery Logic (Updated for Variants)
const images = computed(() => {
    // 1. Try variant images
    if (currentVariant.value && currentVariant.value.images && currentVariant.value.images.length > 0) {
        return currentVariant.value.images.map((vi: any) => vi.image.url)
    }
    // 2. Fallback to product images
    if (props.product?.productImages && props.product.productImages.length > 0) {
        return props.product.productImages.map((pi: any) => pi.url)
    }
    if (props.product?.images && props.product.images.length > 0) {
        return props.product.images
    }
    return ['/blank.svg?v=2']
})

// Main image for cart (first image)
const cartImage = computed(() => images.value[0])

// If selection becomes invalid (e.g. options changed), recover to a valid one.
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
  <div class="bg-[#FAF3EA] min-h-screen">
    <!-- Top Announcement Bar -->
    <div class="bg-[#2E1E20] text-white text-center py-3 px-4 text-sm font-bold flex items-center justify-center gap-3 relative z-10 border-b border-[#C9A24B]/30">
        <Icon name="lucide:sparkle" class="w-4 h-4 text-[#E4C58F] animate-pulse" />
        <span class="tracking-wide text-white/90">{{ $t('storefront.product.saleBanner') }}</span>
        <Icon name="lucide:sparkle" class="w-4 h-4 text-[#E4C58F] animate-pulse" />
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Breadcrumb -->
      <nav class="flex items-center text-sm text-[#6B5850] mb-8 animate-fade-in-up">
        <NuxtLink
          to="/"
          class="hover:text-brand-700 transition-colors font-medium"
        >
          Home
        </NuxtLink>
        <Icon name="lucide:chevron-right" class="w-4 h-4 mx-2 text-[#C9A24B]/60 rtl:rotate-180" />
        <NuxtLink
          to="/products"
          class="hover:text-brand-700 transition-colors font-medium"
        >
          Shop
        </NuxtLink>
        <Icon name="lucide:chevron-right" class="w-4 h-4 mx-2 text-[#C9A24B]/60 rtl:rotate-180" />
        <span class="font-bold text-[#2E1E20] truncate max-w-xs">{{ product?.title }}</span>
      </nav>

      <div class="lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-16 items-start">
        <!-- Gallery Section (Left - 7 cols) -->
        <div class="lg:col-span-7">
             <ProductGallery :images="images" :title="product?.title" />
        </div>

        <!-- Product Info Section (Right - 5 cols, sticky) -->
        <div class="lg:col-span-5 flex flex-col gap-8 lg:sticky lg:top-8 self-start">
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

        <!-- Full Description (Rich Text) -->
        <div
            class="mt-12 col-span-12 max-w-4xl mx-auto animate-fade-in-up"
            style="animation-delay: 0.2s"
        >
            <div class="flex items-center gap-3 mb-6">
              <span class="h-px flex-1 bg-[#C9A24B]/30" />
              <h2 class="text-2xl font-bold text-[#2E1E20]">
              {{ storefrontContent.product.detailsTitle }}
              </h2>
              <span class="h-px flex-1 bg-[#C9A24B]/30" />
            </div>
            <SafeRichText
            v-if="product?.description"
            class="prose prose-lg text-[#5C4A44] max-w-none leading-relaxed bg-[#FFFDF9] rounded-tl-[56px] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl p-8 border border-[#C9A24B]/30"
            :html="product.description"
            />
            <div
            v-else
            class="prose prose-lg text-[#5C4A44] max-w-none leading-relaxed bg-[#FFFDF9] rounded-tl-[56px] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl p-8 border border-[#C9A24B]/30"
            >
            <p>{{ storefrontContent.product.descriptionFallback }}</p>
            </div>
        </div>
        </div>
    </div>

    <!-- Related Products Section -->
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
