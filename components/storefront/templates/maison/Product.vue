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
  return ['/blank.svg']
})

const cartImage = computed(() => images.value[0])

watch([() => props.product, selectedOptions], ([product]) => {
  if (!product?.variants || product.variants.length === 0) return
  const best = findBestVariantForSelection({ product, selectedOptions: selectedOptions.value })
  if (!best) selectedOptions.value = getPreferredInitialSelection(product)
})
</script>

<template>
  <div v-if="product" class="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-16">
    <!-- Breadcrumbs -->
    <nav class="flex items-center gap-2 text-xs tracking-[0.12em] uppercase text-[#B0A090] mb-10">
      <NuxtLink to="/" class="hover:text-[#C17B4E] transition-colors">{{ storefrontContent.nav.home }}</NuxtLink>
      <span class="text-[#D4C4B4]">/</span>
      <NuxtLink to="/products" class="hover:text-[#C17B4E] transition-colors">{{ storefrontContent.nav.shop }}</NuxtLink>
      <span class="text-[#D4C4B4]">/</span>
      <span class="text-[#7A6558] font-medium">{{ product.title }}</span>
    </nav>

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16">
      <!-- Gallery — 3/5 width -->
      <div class="lg:col-span-3">
        <ProductGallery :images="images" :title="product.title" />
      </div>

      <!-- Details — 2/5 width, sticky -->
      <div class="lg:col-span-2 lg:sticky lg:top-24 h-fit space-y-8">
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
    <div class="mt-20 pt-10 border-t border-[#E8E0D4]">
      <h2 class="font-maison-serif text-2xl md:text-3xl font-semibold text-[#2C2420] mb-8">
        {{ storefrontContent.product.detailsTitle }}
      </h2>
      <div
        v-if="product?.description"
        class="prose prose-lg max-w-none bg-white p-8 md:p-10 border border-[#E8E0D4] prose-headings:font-maison-serif prose-headings:text-[#2C2420] prose-p:text-[#7A6558] prose-a:text-[#C17B4E]"
        v-html="product.description"
      />
      <div v-else class="bg-white p-8 border border-[#E8E0D4]">
        <p class="text-[#7A6558]">{{ storefrontContent.product.descriptionFallback }}</p>
      </div>
    </div>
  </div>
</template>
