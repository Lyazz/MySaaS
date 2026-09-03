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
  <div class="bg-[#06080c] min-h-screen text-slate-300">
    <!-- HUD sale banner -->
    <div class="relative bg-black border-b border-brand-500/30 overflow-hidden">
      <div class="h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
      <div class="max-w-[1400px] mx-auto px-5 lg:px-10 py-2.5 flex items-center justify-center gap-3">
        <Icon name="lucide:zap" class="w-3.5 h-3.5 text-brand-500" />
        <span class="text-[10px] font-black uppercase tracking-[0.32em] text-white">{{ $t('storefront.product.saleBanner') }}</span>
        <Icon name="lucide:zap" class="w-3.5 h-3.5 text-brand-500" />
      </div>
    </div>

    <!-- Breadcrumb strip -->
    <div class="border-b border-white/[0.06]">
      <div class="max-w-[1400px] mx-auto px-5 lg:px-10 py-4">
        <nav class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]">
          <NuxtLink to="/" class="text-slate-500 hover:text-brand-500 transition-colors">{{ storefrontContent.nav.home }}</NuxtLink>
          <Icon name="lucide:chevron-right" class="w-3 h-3 text-slate-600" />
          <NuxtLink to="/products" class="text-slate-500 hover:text-brand-500 transition-colors">{{ storefrontContent.nav.shop }}</NuxtLink>
          <Icon name="lucide:chevron-right" class="w-3 h-3 text-slate-600" />
          <span class="text-brand-500 truncate max-w-xs">{{ product?.title }}</span>
        </nav>
      </div>
    </div>

    <div class="max-w-[1400px] mx-auto px-5 lg:px-10 py-10 lg:py-16">
      <div class="lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-16 items-start">
        <!-- Gallery -->
        <div class="lg:col-span-7 animate-fade-in-up">
          <div class="relative bg-[#0b0f14] border border-white/[0.06] p-4 lg:p-6">
            <span class="pointer-events-none absolute top-0 start-0 w-3 h-3 border-t-2 border-s-2 border-brand-500" />
            <span class="pointer-events-none absolute top-0 end-0 w-3 h-3 border-t-2 border-e-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 start-0 w-3 h-3 border-b-2 border-s-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 end-0 w-3 h-3 border-b-2 border-e-2 border-brand-500" />
            <ProductGallery :images="images" :title="product?.title" />
          </div>
        </div>

        <!-- Info column -->
        <div class="lg:col-span-5 flex flex-col gap-6 mt-8 lg:mt-0 animate-fade-in-up" style="animation-delay: 0.1s">
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

      <!-- Full description with HUD frame -->
      <section class="mt-16 lg:mt-24 animate-fade-in-up" style="animation-delay: 0.2s">
        <div class="flex items-center gap-3 mb-6">
          <span class="w-8 h-px bg-brand-500" />
          <span class="text-[10px] font-black uppercase tracking-[0.36em] text-brand-500">{{ storefrontContent.product.detailsTitle }}</span>
        </div>
        <div class="relative bg-[#0b0f14] border border-white/[0.06] p-6 lg:p-10">
          <span class="pointer-events-none absolute top-0 start-0 w-3 h-3 border-t-2 border-s-2 border-brand-500" />
          <span class="pointer-events-none absolute top-0 end-0 w-3 h-3 border-t-2 border-e-2 border-brand-500" />
          <span class="pointer-events-none absolute bottom-0 start-0 w-3 h-3 border-b-2 border-s-2 border-brand-500" />
          <span class="pointer-events-none absolute bottom-0 end-0 w-3 h-3 border-b-2 border-e-2 border-brand-500" />

          <CommonSafeRichText
            v-if="product?.description"
            class="prose prose-invert prose-sm md:prose-base text-slate-300 max-w-none leading-relaxed prose-headings:text-white prose-headings:uppercase prose-headings:tracking-tight prose-strong:text-white prose-a:text-brand-500 prose-a:no-underline hover:prose-a:underline"
            :html="product.description"
          />
          <p v-else class="text-sm text-slate-400 leading-relaxed">
            {{ storefrontContent.product.descriptionFallback }}
          </p>
        </div>
      </section>
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
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
