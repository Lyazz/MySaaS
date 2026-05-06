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
    const variantImages = currentVariant.value.images.map((vi: any) => vi?.image?.url).filter(Boolean)
    if (variantImages.length > 0) return variantImages
  }
  if (props.product?.productImages?.length > 0) {
    const prodImages = props.product.productImages.map((pi: any) => pi?.url).filter(Boolean)
    if (prodImages.length > 0) return prodImages
  }
  if (props.product?.images?.length > 0) return props.product.images.filter(Boolean)
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
  <div v-if="product" class="pdp">
    <!-- Breadcrumb -->
    <nav class="pdp__breadcrumb">
      <div class="pdp__breadcrumb-inner">
        <NuxtLink to="/" class="pdp__bc-link">{{ storefrontContent.nav.home }}</NuxtLink>
        <span class="pdp__bc-sep">/</span>
        <NuxtLink to="/products" class="pdp__bc-link">{{ storefrontContent.nav.shop }}</NuxtLink>
        <span class="pdp__bc-sep">/</span>
        <span class="pdp__bc-current">{{ product.title }}</span>
      </div>
    </nav>

    <!-- Main content -->
    <div class="pdp__layout">
      <div class="pdp__gallery">
        <ProductGallery :images="images" :title="product.title" />
      </div>
      <div class="pdp__sidebar">
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

    <!-- Full description -->
    <div class="pdp__desc">
      <div class="pdp__desc-inner">
        <h2 class="pdp__desc-title">{{ storefrontContent.product.detailsTitle }}</h2>
        <SafeRichText
          v-if="product?.description"
          class="pdp__desc-content"
          :html="product.description"
        />
        <p v-else class="pdp__desc-fallback">{{ storefrontContent.product.descriptionFallback }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pdp { min-height: 100vh; }

.pdp__breadcrumb {
  border-bottom: 1px solid var(--at-border);
  background: var(--at-surface);
}
.pdp__breadcrumb-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 14px clamp(20px, 5vw, 80px);
  display: flex;
  align-items: center;
  gap: 8px;
}
.pdp__bc-link {
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 300;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--at-muted);
  text-decoration: none;
  transition: color 0.2s;
}
.pdp__bc-link:hover { color: var(--at-gold); }
.pdp__bc-sep {
  font-family: var(--at-f-mono);
  font-size: 9px;
  color: var(--at-border-2);
}
.pdp__bc-current {
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 300;
  letter-spacing: 0;
  color: var(--at-sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.pdp__layout {
  max-width: 1400px;
  margin: 0 auto;
  padding: clamp(32px, 5vw, 64px) clamp(20px, 5vw, 80px);
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
}
@media (min-width: 1024px) {
  .pdp__layout {
    grid-template-columns: 1.4fr 1fr;
    gap: clamp(40px, 5vw, 80px);
  }
}

.pdp__gallery { /* nothing extra */ }
.pdp__sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
@media (min-width: 1024px) {
  .pdp__sidebar {
    position: sticky;
    top: 80px;
    height: fit-content;
  }
}

/* Description section */
.pdp__desc {
  border-top: 1px solid var(--at-border);
  padding: clamp(40px, 6vw, 80px) clamp(20px, 5vw, 80px);
}
.pdp__desc-inner { max-width: 1400px; margin: 0 auto; }
.pdp__desc-title {
  font-family: var(--at-f-display);
  font-size: clamp(1.8rem, 3vw, 2.8rem);
  font-weight: 300;
  color: var(--at-cream);
  margin-bottom: 32px;
}
.pdp__desc-content {
  background: var(--at-surface);
  border: 1px solid var(--at-border);
  padding: clamp(24px, 4vw, 48px);
  font-family: var(--at-f-mono);
  font-size: 13px;
  font-weight: 300;
  line-height: 1.9;
  color: var(--at-sub);
  max-width: 72ch;
}
:deep(.pdp__desc-content h1),
:deep(.pdp__desc-content h2),
:deep(.pdp__desc-content h3) {
  font-family: var(--at-f-display);
  font-weight: 300;
  color: var(--at-text);
  margin: 1.5em 0 0.5em;
}
:deep(.pdp__desc-content a) { color: var(--at-gold); }
:deep(.pdp__desc-content p) { margin-bottom: 1em; }

.pdp__desc-fallback {
  font-family: var(--at-f-mono);
  font-size: 12px;
  color: var(--at-sub);
}
</style>
