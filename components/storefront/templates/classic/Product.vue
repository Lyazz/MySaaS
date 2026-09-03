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
  <div class="bg-white min-h-screen py-8 lg:py-12 font-serif">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Minimal Breadcrumb -->
      <nav class="flex items-center justify-center text-xs uppercase tracking-widest text-slate-500 mb-12 animate-fade-in-up">
        <NuxtLink
          to="/"
          class="hover:text-slate-900 transition-colors"
        >
          Home
        </NuxtLink>
        <span class="mx-3 text-slate-300">/</span>
        <NuxtLink
          to="/products"
          class="hover:text-slate-900 transition-colors"
        >
          Shop
        </NuxtLink>
        <span class="mx-3 text-slate-300">/</span>
        <span class="text-slate-900 font-bold border-b border-slate-900 truncate max-w-xs">{{ product?.title }}</span>
      </nav>

      <div class="lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-20 items-start">
        <!-- Gallery Section (Left - 7 cols) -->
        <div class="lg:col-span-7 mb-12 lg:mb-0">
             <ProductGallery :images="images" :title="product?.title" />
        </div>

        <!-- Product Info Section (Right - 5 cols) -->
        <div class="lg:col-span-5 flex flex-col gap-10 sticky top-24">
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
            
            <!-- Full Description (Rich Text) -->
            <div
                class="pt-8 border-t border-slate-100 animate-fade-in-up"
                style="animation-delay: 0.2s"
            >
                <h2 class="text-sm font-bold uppercase tracking-widest text-slate-900 mb-6">
                {{ storefrontContent.product.detailsTitle }}
                </h2>
                <CommonSafeRichText 
                v-if="product?.description" 
                class="prose prose-slate prose-sm text-slate-600 max-w-none leading-relaxed font-light"
                :html="product.description"
                />
                <div
                v-else
                class="prose prose-slate prose-sm text-slate-600 max-w-none leading-relaxed font-light"
                >
                <p>{{ storefrontContent.product.descriptionFallback }}</p>
                </div>
            </div>
        </div>
        </div>
    </div>
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
