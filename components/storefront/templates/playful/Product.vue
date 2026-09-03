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

const selectedOptions = ref<SelectedOptions>({})

watch(() => props.product, (newProduct) => {
    if (!newProduct?.options || newProduct.options.length === 0) { selectedOptions.value = {}; return }
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
    if (currentVariant.value?.images?.length > 0) return currentVariant.value.images.map((vi: any) => vi.image.url)
    if (props.product?.productImages?.length > 0) return props.product.productImages.map((pi: any) => pi.url)
    if (props.product?.images?.length > 0) return props.product.images
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
  <div class="bg-[var(--kw-cream)] min-h-screen pb-16">
    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <nav class="flex items-center gap-2 text-xs font-bold text-[var(--kw-ink-soft)] mb-8 flex-wrap">
        <NuxtLink
          to="/"
          class="hover:text-[var(--kw-pink-deep)] transition-colors"
        >
          {{ storefrontContent.nav.home }}
        </NuxtLink>
        <Icon
          name="lucide:chevron-right"
          class="w-3.5 h-3.5 opacity-50 rtl:rotate-180"
        />
        <NuxtLink
          to="/products"
          class="hover:text-[var(--kw-pink-deep)] transition-colors"
        >
          {{ storefrontContent.nav.shop }}
        </NuxtLink>
        <Icon
          name="lucide:chevron-right"
          class="w-3.5 h-3.5 opacity-50 rtl:rotate-180"
        />
        <span class="text-[var(--kw-ink)] truncate max-w-[16rem]">{{ product?.title }}</span>
      </nav>

      <div class="lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-16 items-start">
        <div class="lg:col-span-6 relative z-10">
          <ProductGallery
            :images="images"
            :title="product?.title"
          />
        </div>

        <div class="mt-10 lg:mt-0 lg:col-span-6 flex flex-col gap-7">
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

      <!-- ══ Description ═══════════════════════════════════════════════ -->
      <section class="mt-20 max-w-4xl mx-auto">
        <div class="flex items-center justify-center gap-3 mb-8">
          <span
            class="w-2.5 h-2.5 rounded-full"
            style="background: var(--kw-pink)"
          />
          <h2 class="kw-display text-2xl md:text-3xl text-center">
            {{ storefrontContent.product.detailsTitle }}
          </h2>
          <span
            class="w-2.5 h-2.5 rounded-full"
            style="background: var(--kw-lemon)"
          />
        </div>
        <div class="kw-card p-8 md:p-12">
          <CommonSafeRichText
            v-if="product?.description"
            class="prose prose-base max-w-none leading-relaxed text-[var(--kw-ink-soft)]"
            :html="product.description"
          />
          <p
            v-else
            class="kw-lede text-center"
          >
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
