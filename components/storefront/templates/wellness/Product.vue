<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import ProductGallery from './partials/ProductGallery.vue'
import ProductDetails from './partials/ProductDetails.vue'
import ProductOrderForm from './partials/ProductOrderForm.vue'
import { findBestVariantForSelection, getPreferredInitialSelection, type SelectedOptions } from './variant-ux'

const props = defineProps<{
    product: any
}>()

const cartStore = useCartStore()
const { t } = useI18n({ useScope: 'global' })
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

const currentPrice = computed(() => {
    return currentVariant.value ? Number(currentVariant.value.price) : Number(props.product?.price || 0)
})

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

</script>

<template>
  <div class="bg-stone-50 min-h-screen py-10 font-wellness text-stone-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Breadcrumb -->
      <nav class="flex items-center text-sm text-stone-500 mb-8 animate-fade-in-up font-wellness">
        <NuxtLink
          to="/"
          class="hover:text-brand-700 transition-colors italic"
        >
          Home
        </NuxtLink>
        <span class="mx-3 text-stone-300">/</span>
        <NuxtLink
          to="/products"
          class="hover:text-brand-700 transition-colors italic"
        >
          Shop
        </NuxtLink>
        <span class="mx-3 text-stone-300">/</span>
        <span class="font-medium text-stone-900 truncate max-w-xs">{{ product?.title }}</span>
      </nav>

      <div class="lg:grid lg:grid-cols-12 lg:gap-16 items-start">
        <!-- Gallery Section (Left - 7 cols) -->
        <div class="lg:col-span-7">
             <ProductGallery :images="images" :title="product?.title" />
        </div>

        <!-- Product Info Section (Right - 5 cols) -->
        <div class="lg:col-span-5 flex flex-col gap-10 sticky top-24">
            <ProductDetails 
                :product="product" 
                :current-price="currentPrice" 
                v-model:selected-options="selectedOptions" 
            />

            <div class="p-6 bg-white rounded-3xl border border-stone-100 shadow-sm">
                <ProductOrderForm 
                    :product="product"
                    :current-variant="currentVariant"
                    :current-price="currentPrice"
                    :current-stock="currentStock"
                    :active-image="cartImage"
                />
            </div>
            
        </div>

        <!-- Full Description (Rich Text) -->
        <div
            class="mt-20 col-span-12 max-w-4xl mx-auto animate-fade-in-up"
            style="animation-delay: 0.2s"
        >
       

            <SafeRichText 
            v-if="product?.description" 
            class="prose prose-stone prose-lg text-stone-600 max-w-none leading-relaxed bg-white/50 backdrop-blur rounded-[3rem] p-10 md:p-16 shadow-sm border border-stone-100"
            :html="product.description"
            />
            <div
            v-else
            class="prose prose-stone prose-lg text-stone-600 max-w-none leading-relaxed bg-white/50 backdrop-blur rounded-[3rem] p-10 md:p-16 shadow-sm border border-stone-100 text-center italic"
            >
            <p>{{ storefrontContent.product.descriptionFallback }}</p>
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
