<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const props = defineProps<{
    product: any
}>()

const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')
const mainImage = computed(() => props.product?.images?.[0] || 'https://placehold.co/600x400')

const handleAddToCart = () => {
  if (!props.product) return
  cartStore.addItem({
    productId: props.product.id,
    title: props.product.title,
    slug: props.product.slug,
    price: Number(props.product.price),
    stock: props.product.stock,
    image: mainImage.value
  })
}
</script>

<template>
  <div class="py-10">
    <div class="max-w-5xl mx-auto px-4">
      <NuxtLink
        to="/products"
        class="text-brand-600 hover:underline mb-6 inline-flex items-center gap-2"
      >
        <span aria-hidden="true">&larr;</span> Back to Products
      </NuxtLink>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <img
            :src="mainImage"
            :alt="product?.title"
            class="w-full h-80 object-cover bg-slate-100"
          >
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h1 class="text-3xl font-bold text-slate-900">
            {{ product?.title }}
          </h1>
          <div 
            v-if="product?.description" 
            class="mt-3 prose prose-slate text-slate-600 leading-relaxed"
            v-html="product.description"
          />

          <div class="mt-6 flex items-center justify-between">
            <div class="text-3xl font-bold text-brand-600">
              {{ Number(product?.price ?? 0).toFixed(2) }} DA
            </div>
            <div
              v-if="(product?.stock ?? 0) > 0"
              class="text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full"
            >
              In stock: {{ product?.stock }}
            </div>
            <div
              v-else
              class="text-sm text-red-700 bg-red-50 px-3 py-1 rounded-full"
            >
              Out of stock
            </div>
          </div>

          <button
            v-if="storeSettings?.cartEnabled !== false"
            class="mt-6 w-full px-5 py-3 rounded-xl bg-brand-600 text-white font-medium hover:opacity-90 disabled:bg-slate-300 disabled:cursor-not-allowed transition-opacity"
            :disabled="(product?.stock ?? 0) === 0 || product?.isActive === false"
            @click="handleAddToCart"
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
