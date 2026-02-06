<template>
  <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
    <!-- Product Image Placeholder -->
    <!-- Product Image -->
    <div class="h-48 bg-gray-200 flex items-center justify-center overflow-hidden">
      <img
        v-if="mainImage"
        :src="mainImage"
        :alt="product.title"
        class="w-full h-full object-cover"
      >
        <Icon name="lucide:package" class="w-16 h-16 text-gray-400" />
    </div>

    <!-- Product Info -->
    <div class="p-4">
      <NuxtLink
        :to="`/p/${product.slug}`"
        class="block"
      >
        <h3 class="text-lg font-semibold text-gray-900 hover:text-brand line-clamp-2">
          {{ product.title }}
        </h3>
      </NuxtLink>
      
      <p
        v-if="product.description"
        class="mt-2 text-sm text-gray-600 line-clamp-2"
      >
        {{ product.description }}
      </p>

      <!-- Price and Stock -->
      <div class="mt-3 flex items-center justify-between">
        <span class="text-2xl font-bold text-brand">
          {{ formatCurrency(product.price) }}
        </span>
        <span
          v-if="product.stock > 0"
          class="text-sm"
          :class="product.stock <= LOW_STOCK_THRESHOLD ? 'text-amber-700' : 'text-green-600'"
        >
          {{ product.stock <= LOW_STOCK_THRESHOLD ? `Low Stock: ${product.stock}` : `In Stock: ${product.stock}` }}
        </span>
        <span
          v-else
          class="text-sm text-red-600"
        >
          Out of Stock
        </span>
      </div>

      <!-- Add to Cart Button -->
      <button
        v-if="storeSettings?.cartEnabled !== false"
        :disabled="product.stock === 0 || !product.isActive"
        class="mt-4 w-full px-4 py-2 bg-brand text-white rounded-md hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 rtl:space-x-reverse"
        @click="handleAddToCart"
      >
        <Icon name="lucide:handbag" class="w-5 h-5" />
        <span>{{ product.stock === 0 ? storefrontContent.actions.outOfStock : storefrontContent.actions.addToCart }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

interface Product {
  id: string
  title: string
  slug: string
  description?: string | null
  price: number | string
  stock: number
  isActive: boolean
  images?: string[]
  bundleDeals?: { id?: string; bundleQty: number; bundlePrice: number | string }[]
  metaPixelIds?: string[]
}

const props = defineProps<{
  product: Product
}>()

const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')
const { format: formatCurrency } = useCurrency()
const storefrontContent = useStorefrontContent()
const LOW_STOCK_THRESHOLD = 5

const mainImage = computed(() => {
  if (props.product.images && props.product.images.length > 0) {
    return props.product.images[0]
  }
  return null
})

function handleAddToCart() {
  cartStore.addItem({
    productId: props.product.id,
    title: props.product.title,
    slug: props.product.slug,
    price: Number(props.product.price),
    bundleDeals: props.product.bundleDeals || [],
    stock: props.product.stock,
    image: mainImage.value ?? undefined,
    metaPixelIds: props.product.metaPixelIds
  })
  
  // Optional: Show toast notification
  if (process.client) {
    alert(storefrontContent.value.product.addedToCart(props.product.title))
  }
}
</script>
