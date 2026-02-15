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
const storeSettings = useState<any>('storeSettings')
const { format: formatPrice } = useCurrency()
const cartEnabled = computed(() => storeSettings.value?.cartEnabled !== false)

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
    return ['https://placehold.co/600x600/f8fafc/64748b?text=No+Image']
})

const cartImage = computed(() => images.value[0])

watch([() => props.product, selectedOptions], ([product]) => {
    if (!product?.variants || product.variants.length === 0) return
    const best = findBestVariantForSelection({ product, selectedOptions: selectedOptions.value })
    if (!best) {
        selectedOptions.value = getPreferredInitialSelection(product)
    }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-amber-50/50 to-white pb-32 md:pb-12">
    <!-- Full Width Description Section -->
    <div class="w-full mb-8 bg-white/80 backdrop-blur-sm border-b border-amber-100">
        <div 
          v-if="product?.description" 
          class="prose prose-lg md:prose-xl prose-headings:font-cozy prose-headings:text-slate-800 max-w-4xl mx-auto text-slate-600 p-8 md:p-12"
          v-html="product.description"
        />
        <p v-else class="text-slate-500 text-lg max-w-4xl mx-auto p-8 md:p-12">
            Experience premium quality with our latest collection. Crafted with care for your comfort.
        </p>
    </div>

    <div class="max-w-6xl mx-auto px-4 md:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        <!-- Left Column: Gallery -->
        <div>
            <ProductGallery :images="images" :title="product?.title" />
        </div>

        <!-- Right Column: Details + Form -->
        <div class="lg:sticky lg:top-24 h-fit space-y-8">
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
    </div>

    <!-- Mobile Sticky Bottom Bar -->
    <div
      v-if="cartEnabled"
      class="fixed bottom-0 left-0 w-full p-4 bg-white/95 backdrop-blur-lg border-t border-amber-100 md:hidden z-40 flex items-center justify-between shadow-2xl"
    >
      <div class="flex flex-col">
        <span class="text-xs text-slate-400">{{ storefrontContent.productForm.totalPrice }}</span>
        <span class="font-cozy font-bold text-xl text-slate-800">{{ formatPrice(currentPrice) }}</span>
      </div>
      <button
        onclick="window.scrollTo({ top: 0, behavior: 'smooth' })"
        class="bg-brand-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-brand-200 hover:bg-brand-600 transition-all"
      >
        {{ storefrontContent.actions.orderNow }}
      </button>
    </div>
  </div>
</template>
