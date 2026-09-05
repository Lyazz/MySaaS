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
const { format: formatPrice } = useCurrency()

// Option Selection Logic
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

const currentPrice = computed(() => buildScopedProductPricing(props.product, currentVariant.value).effectivePrice)

const currentStock = computed(() => {
    if (!currentVariant.value) return props.product?.stock
    if (currentVariant.value.trackInventory === false) return Number.POSITIVE_INFINITY
    const stock = Number(currentVariant.value.stock ?? 0)
    const reserved = Number(currentVariant.value.reserved ?? 0)
    const safety = Number(currentVariant.value.safetyStock ?? 0)
    return Math.max(stock - reserved - safety, 0)
})

const images = computed(() => {
    if (currentVariant.value?.images?.length > 0) {
        const variantImages = currentVariant.value.images
          .map((vi: any) => vi?.image?.url)
          .filter(Boolean)
        if (variantImages.length > 0) return variantImages
    }
    if (props.product?.productImages?.length > 0) {
        const prodImages = props.product.productImages
          .map((pi: any) => pi?.url)
          .filter(Boolean)
        if (prodImages.length > 0) return prodImages
    }
    if (props.product?.images?.length > 0) {
        return props.product.images.filter(Boolean)
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
  <div v-if="product" class="ed-theme">
    <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12">
      <!-- Breadcrumbs -->
      <nav class="flex items-center gap-2.5 ed-ui text-xs text-[#8A7E6E] mb-8 md:mb-10">
        <NuxtLink to="/" class="hover:text-[#262019] transition-colors">{{ storefrontContent.nav.home }}</NuxtLink>
        <span>/</span>
        <NuxtLink to="/products" class="hover:text-[#262019] transition-colors">{{ storefrontContent.nav.shop }}</NuxtLink>
        <span>/</span>
        <span class="text-[#262019] truncate max-w-[16rem]">{{ product.title }}</span>
      </nav>

      <!-- Headline: the name runs the full measure, the price sits in the margin -->
      <header class="grid md:grid-cols-12 gap-6 md:gap-10 items-end pb-7 border-b border-[#262019] mb-10 md:mb-14">
        <div class="md:col-span-8">
          <span class="ed-ui text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A7E6E]">
            {{ product?.category?.title || storefrontContent.common.collection }}
          </span>
          <h1 class="ed-display text-4xl md:text-[3.75rem] leading-[1.04] text-[#262019] mt-3">
            {{ product.title }}
          </h1>
        </div>
        <div class="md:col-span-4 md:text-end">
          <div class="flex md:justify-end items-baseline gap-3">
            <span class="ed-display text-[2rem] md:text-[2.5rem] text-[#B8532E]">{{ formatPrice(currentPrice) }}</span>
            <span v-if="product?.compareAtPrice" class="ed-ui text-lg text-[#8A7E6E] line-through">
              {{ formatPrice(product.compareAtPrice) }}
            </span>
          </div>
          <StorefrontSharedCountdownTimer
            v-if="product?.showCountdown && product?.promotionEndDate"
            :end-date="product.promotionEndDate"
            theme="danger"
            show-icon
            class="mt-4 md:flex md:justify-end"
          />
        </div>
      </header>

      <div class="lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-16 items-start">
        <!-- The plates run down the page -->
        <div class="lg:col-span-7">
          <ProductGallery :images="images" :title="product.title" />
        </div>

        <!-- The purchase panel stays with you -->
        <div class="lg:col-span-5 lg:sticky lg:top-24 self-start mt-10 lg:mt-0 space-y-8">
          <ProductDetails
            :product="product"
            :current-price="currentPrice"
            hide-header
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

      <!-- The piece itself -->
      <div class="mt-16 md:mt-24 max-w-3xl">
        <div class="flex items-center gap-4 mb-8">
          <span class="ed-label !mb-0 shrink-0">{{ storefrontContent.product.detailsTitle }}</span>
          <span class="ed-rule flex-1" />
        </div>
        <CommonSafeRichText
          v-if="product?.description"
          class="ed-prose text-[17px]"
          :html="product.description"
        />
        <p v-else class="ed-prose text-[17px] text-[#4A4038]">
          {{ storefrontContent.product.descriptionFallback }}
        </p>
      </div>
    </div>
  </div>
</template>
