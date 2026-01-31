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
    return ['https://placehold.co/600x400', 'https://placehold.co/600x400?text=View+2']
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
  <div v-if="product" class="synthwave-product min-h-screen py-10 font-sans relative">
    <!-- Synthwave Background -->
    <div class="fixed inset-0 z-0 pointer-events-none">
      <div class="absolute inset-0 bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0515]"></div>
      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[40%] bg-gradient-to-t from-[#ff2d95]/15 via-[#ff6b35]/5 to-transparent"></div>
      <div class="absolute bottom-0 left-0 right-0 h-[30%] bg-[linear-gradient(rgba(255,45,149,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,45,149,0.1)_1px,transparent_1px)] bg-[size:30px_30px] [perspective:500px] [transform:rotateX(60deg)] origin-bottom opacity-50"></div>
    </div>
    
    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Breadcrumb -->
      <nav class="flex items-center text-sm text-purple-300/70 mb-8 animate-fade-in-up font-mono">
        <NuxtLink
          to="/"
          class="hover:text-pink-400 transition-colors font-medium"
        >
          Home
        </NuxtLink>
        <Icon name="lucide:chevron-right" class="w-4 h-4 mx-2 text-purple-500/50" />
        <NuxtLink
          to="/products"
          class="hover:text-pink-400 transition-colors font-medium"
        >
          Shop
        </NuxtLink>
        <Icon name="lucide:chevron-right" class="w-4 h-4 mx-2 text-purple-500/50" />
        <span class="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 truncate max-w-xs">{{ product?.title }}</span>
      </nav>

      <div class="lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-16 items-start">
        <!-- Gallery Section (Left - 7 cols) -->
        <div class="lg:col-span-7">
          <div class="relative">
            <!-- Neon glow border -->
            <div class="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-2xl blur opacity-25"></div>
            <div class="relative bg-[#1a0a2e]/90 rounded-2xl border border-pink-500/30 overflow-hidden backdrop-blur-sm">
              <ProductGallery :images="images" :title="product?.title" />
            </div>
          </div>
        </div>

        <!-- Product Info Section (Right - 5 cols) -->
        <div class="lg:col-span-5 flex flex-col gap-8 mt-8 lg:mt-0">
          <div class="relative">
            <div class="absolute -inset-1 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-2xl blur"></div>
            <div class="relative bg-[#1a0a2e]/95 rounded-2xl border border-orange-500/30 p-6 backdrop-blur-sm">
              <ProductDetails 
                  :product="product" 
                  :current-price="currentPrice" 
                  :selected-options="selectedOptions"
                  @update:selected-options="selectedOptions = $event"
              />
            </div>
          </div>

          <div class="relative">
            <div class="absolute -inset-1 bg-gradient-to-br from-cyan-500/20 to-pink-500/20 rounded-2xl blur"></div>
            <div class="relative bg-[#1a0a2e]/95 rounded-2xl border border-cyan-500/30 p-6 backdrop-blur-sm">
              <ProductOrderForm 
                  :product="product"
                  :current-variant="currentVariant"
                  :current-price="currentPrice"
                  :current-stock="currentStock"
                  :active-image="cartImage"
              />
            </div>
          </div>
        </div>

        <!-- Full Description (Rich Text) -->
        <div
            class="mt-12 col-span-12 max-w-4xl mx-auto animate-fade-in-up"
            style="animation-delay: 0.2s"
        >
          <div class="relative">
            <div class="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur"></div>
            <div class="relative bg-[#1a0a2e]/90 rounded-2xl border border-purple-500/30 p-8 backdrop-blur-sm">
              <h2 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 mb-6">
                Product Details
              </h2>
              <div 
                v-if="product?.description" 
                class="prose prose-invert prose-lg text-purple-100/80 max-w-none leading-relaxed prose-headings:text-pink-300 prose-a:text-cyan-400"
                v-html="product.description"
              />
              <div
                v-else
                class="text-purple-200/70 leading-relaxed"
              >
                <p>Experience premium quality with our latest collection. Designed for modern living, this product combines style and functionality seamlessly.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.synthwave-product {
    font-family: 'Inter', system-ui, sans-serif;
}

.animate-fade-in-up {
    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
