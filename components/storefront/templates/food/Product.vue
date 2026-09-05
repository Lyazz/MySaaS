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
  <div class="bg-[#f8faf9] min-h-screen py-10 font-sans selection:bg-brand-100 selection:text-brand-900">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Breadcrumb -->
      <nav class="flex items-center text-xs font-bold uppercase tracking-widest text-stone-500 mb-10 animate-fade-in-up">
        <NuxtLink
          to="/"
          class="hover:text-brand-600 transition-colors"
        >
          Home
        </NuxtLink>
        <span class="mx-3 text-stone-300">/</span>
        <NuxtLink
          to="/products"
          class="hover:text-brand-600 transition-colors"
        >
          {{ storefrontContent.nav.shop }}
        </NuxtLink>
        <span class="mx-3 text-stone-300">/</span>
        <span class="text-stone-900 border-b-2 border-brand-200 pb-0.5">{{ product?.title }}</span>
      </nav>

      <div class="lg:grid lg:grid-cols-12 lg:gap-16 items-start relative">
        <!-- Gallery Section (Left - 7 cols) - Sticky -->
        <div class="lg:col-span-7 sticky top-24 self-start">
             <div class="relative bg-white rounded-[3rem] p-4 shadow-xl border-4 border-white rotate-1 hover:rotate-0 transition-transform duration-500 overflow-hidden group">
                
                 <ProductGallery :images="images" :title="product?.title" class="rounded-[2.5rem] overflow-hidden" />
             </div>
             
             <!-- Additional Trust Badges -->
             <div class="flex justify-center gap-8 mt-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                 <div class="flex items-center gap-2">
                     <Icon name="lucide:leaf" class="w-5 h-5 text-green-600" />
                     <span class="text-xs font-bold uppercase tracking-widest text-stone-600">{{ t('storefront.templates.food.badges.organic') }}</span>
                 </div>
                 <div class="flex items-center gap-2">
                     <Icon name="lucide:truck" class="w-5 h-5 text-stone-900" />
                     <span class="text-xs font-bold uppercase tracking-widest text-stone-600">{{ t('storefront.templates.food.badges.fastDelivery') }}</span>
                 </div>
                 <div class="flex items-center gap-2">
                     <Icon name="lucide:award" class="w-5 h-5 text-yellow-600" />
                     <span class="text-xs font-bold uppercase tracking-widest text-stone-600">{{ t('storefront.templates.food.badges.premium') }}</span>
                 </div>
             </div>
        </div>

        <!-- Product Info Section (Right - 5 cols) - Recipe Card Style -->
        <div class="lg:col-span-5 flex flex-col gap-8 mt-12 lg:mt-0 relative z-10">
            <!-- Recipe Card Container -->
            <div class="bg-white rounded-[2rem] p-8 md:p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-stone-100 relative">
                <!-- Decorative Top Border -->
                <div class="absolute top-0 start-0 end-0 h-2 bg-gradient-to-r from-brand-400 via-orange-400 to-yellow-400 rounded-t-[2rem]"></div>
                
                <h1 class="text-4xl md:text-5xl font-bold text-stone-900 mb-6 leading-tight">
                    {{ product?.title }}
                </h1>
                
                <div class="w-full h-px bg-stone-200 my-6 flex items-center justify-center">
                    <span class="bg-white px-4 text-stone-400 text-xs uppercase tracking-widest font-bold">{{ storefrontContent.product.detailsTitle }}</span>
                </div>

                <ProductDetails 
                    :product="product" 
                    :current-price="currentPrice" 
                    v-model:selected-options="selectedOptions" 
                />

                <div class="w-full h-px bg-dashed bg-stone-300 my-8"></div>

                <ProductOrderForm 
                    :product="product"
                    :current-variant="currentVariant"
                    :current-price="currentPrice"
                    :current-stock="currentStock"
                    :active-image="cartImage"
                />
            </div>
            
             <!-- Description Accordion Style -->
            <div class="bg-white rounded-3xl p-8 border border-stone-200">
                <h2 class="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
                    <Icon name="lucide:file-text" class="w-5 h-5 text-brand-600" />
                    {{ storefrontContent.product.descriptionTitle }}
                </h2>
                <CommonSafeRichText 
                v-if="product?.description" 
                class="prose prose-stone prose-sm text-stone-600 max-w-none leading-relaxed"
                :html="product.description"
                />
                <div
                v-else
                class="prose prose-stone prose-sm text-stone-600 max-w-none leading-relaxed"
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
