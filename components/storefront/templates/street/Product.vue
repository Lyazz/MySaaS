<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import ProductGallery from './partials/ProductGallery.vue'
import ProductDetails from './partials/ProductDetails.vue'
import ProductOrderForm from './partials/ProductOrderForm.vue'
import { findBestVariantForSelection, getPreferredInitialSelection, type SelectedOptions } from './variant-ux'
import { buildScopedProductPricing } from '~/shared/pricing/product-pricing'

const props = defineProps<{
    product: any
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

const currentPrice = computed(() => buildScopedProductPricing(props.product, currentVariant.value).effectivePrice)

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
    if (currentVariant.value?.images?.length > 0) {
        const variantImages = currentVariant.value.images
          .map((vi: any) => vi?.image?.url)
          .filter(Boolean)
        if (variantImages.length > 0) return variantImages
    }
    // 2. Fallback to product images (productImages relation)
    if (props.product?.productImages?.length > 0) {
        const prodImages = props.product.productImages
          .map((pi: any) => pi?.url)
          .filter(Boolean)
        if (prodImages.length > 0) return prodImages
    }
    // 3. Fallback to legacy images array (string[])
    if (props.product?.images?.length > 0) {
        return props.product.images.filter(Boolean)
    }
    // 4. Placeholder
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
  <div v-if="product" class="max-w-7xl mx-auto px-4 py-8">
    <!-- Breadcrumbs -->
    <nav class="flex gap-2 font-mono text-xs text-gray-400 mb-8 uppercase">
        <NuxtLink to="/" class="hover:text-brand transition-colors">{{ storefrontContent.nav.home }}</NuxtLink>
        <span>/</span>
        <NuxtLink to="/products" class="hover:text-brand transition-colors">{{ storefrontContent.nav.shop }}</NuxtLink>
        <span>/</span>
        <span class="text-black font-bold">{{ product.title }}</span>
    </nav>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
        <!-- Gallery Column -->
        <div>
            <ProductGallery :images="images" :title="product.title" />
        </div>

        <!-- Details Column -->
        <div class="lg:sticky lg:top-24 h-fit">
            <ProductDetails 
                :product="product" 
                :current-price="currentPrice" 
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
    <div class="mt-16 border-t-4 border-black pt-8">
        <h2 class="font-street text-3xl uppercase mb-6">{{ storefrontContent.product.detailsTitle }}</h2>
        <SafeRichText 
          v-if="product?.description" 
          class="prose prose-lg prose-headings:font-street prose-headings:uppercase max-w-none font-mono bg-white border-4 border-black p-8"
          :html="product.description"
        />
        <div
          v-else
          class="prose prose-lg max-w-none font-mono bg-white border-4 border-black p-8"
        >
          <p>{{ storefrontContent.product.descriptionFallback }}</p>
        </div>
    </div>
  </div>
</template>
