<script setup lang="ts">
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

const storefrontContent = useStorefrontContent()
const { t } = useI18n({ useScope: 'global' })

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
  <div class="bg-[#F2ECE1] min-h-screen">
    <!-- Sale strip -->
    <div class="bg-[#062622] text-[#F2ECE1] text-center py-2.5 px-4 flex items-center justify-center gap-3">
      <span class="emb-star w-2.5 h-2.5 text-[#DFA254]" />
      <span class="emb-label text-[#F2ECE1]/85">{{ t('storefront.product.saleBanner') }}</span>
      <span class="emb-star w-2.5 h-2.5 text-[#DFA254]" />
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2.5 text-xs text-[#5A6763] mb-8">
        <NuxtLink to="/" class="hover:text-brand-700 transition-colors">{{ storefrontContent.nav.home }}</NuxtLink>
        <span class="emb-star w-2 h-2 text-[#CBBDAB]" />
        <NuxtLink to="/products" class="hover:text-brand-700 transition-colors">{{ storefrontContent.nav.shop }}</NuxtLink>
        <span class="emb-star w-2 h-2 text-[#CBBDAB]" />
        <span class="text-[#16211E] truncate max-w-[16rem]">{{ product?.title }}</span>
      </nav>

      <div class="lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-16 items-start">
        <!-- Gallery -->
        <div class="lg:col-span-7">
          <ProductGallery :images="images" :title="product?.title" />
        </div>

        <!-- Info -->
        <div class="lg:col-span-5 flex flex-col gap-8 lg:sticky lg:top-28 self-start">
          <ProductDetails
            v-model:selected-options="selectedOptions"
            :product="product"
            :current-price="currentPrice"
            :original-price="originalPrice"
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

      <!-- Description -->
      <div class="mt-16 md:mt-24 max-w-4xl">
        <div class="flex items-center gap-4 text-[#CBBDAB] mb-8">
          <span class="emb-label text-[#8E9793] shrink-0">{{ storefrontContent.product.detailsTitle }}</span>
          <span class="h-px flex-1 bg-current" />
        </div>

        <SafeRichText
          v-if="product?.description"
          class="prose prose-lg max-w-none leading-relaxed text-[#5A6763] border border-[#CBBDAB] bg-[#FDFAF4] p-6 md:p-10"
          :html="product.description"
        />
        <div
          v-else
          class="prose prose-lg max-w-none leading-relaxed text-[#5A6763] border border-[#CBBDAB] bg-[#FDFAF4] p-6 md:p-10"
        >
          <p>{{ storefrontContent.product.descriptionFallback }}</p>
        </div>
      </div>
    </div>

    <RelatedProducts
      v-if="relatedProducts && relatedProducts.length > 0"
      :products="relatedProducts"
    />
  </div>
</template>
