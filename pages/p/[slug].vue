<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const route = useRoute()
const slug = route.params.slug as string

type Product = {
  id: string
  title: string
  slug: string
  description?: string | null
  price: string | number
  stock: number
  isActive: boolean
  images?: string[]
}

const productUrl = useTenantApiUrl(`/api/products/${encodeURIComponent(slug)}`)
const product = ref<Product | null>(null)
try {
  product.value = await $fetch<Product>(productUrl, { headers: useTenantApiHeaders() })
} catch (e: any) {
  const statusCode = e?.statusCode || e?.response?.status || 500
  throw createError({
    statusCode,
    statusMessage: statusCode === 404 ? 'Product not found' : 'Failed to load product'
  })
}

const cartStore = useCartStore()
const mainImage = computed(() => product.value?.images?.[0] || 'https://placehold.co/600x400')

useTenantSeo({
  title: `${product.value?.title ?? slug}`,
  description: product.value?.description ?? undefined,
  image: mainImage.value
})

// Schema.org Product
useHead({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.value?.title ?? slug,
        description: product.value?.description ?? undefined,
        image: mainImage.value,
        offers: {
            '@type': 'Offer',
            price: product.value?.price,
            priceCurrency: 'DZD'
        }
      })
    } as any
  ]
})

const handleAddToCart = () => {
  if (!product.value) return
  cartStore.addItem({
    productId: product.value.id,
    title: product.value.title,
    slug: product.value.slug,
    price: Number(product.value.price),
    stock: product.value.stock
  })
}

definePageMeta({
  middleware: 'tenant-only'
})
</script>

<template>
  <div class="py-10">
    <div class="max-w-5xl mx-auto px-4">
      <NuxtLink to="/products" class="text-brand hover:underline mb-6 inline-flex items-center gap-2">
        <span aria-hidden="true">&larr;</span> Back to Products
      </NuxtLink>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <img :src="mainImage" :alt="product?.title" class="w-full h-80 object-cover bg-slate-100" />
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h1 class="text-3xl font-bold text-slate-900">{{ product?.title }}</h1>
          <p v-if="product?.description" class="mt-3 text-slate-600 leading-relaxed">
            {{ product.description }}
          </p>

          <div class="mt-6 flex items-center justify-between">
            <div class="text-3xl font-bold text-brand">{{ Number(product?.price ?? 0).toFixed(2) }} DA</div>
            <div v-if="(product?.stock ?? 0) > 0" class="text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full">
              In stock: {{ product?.stock }}
            </div>
            <div v-else class="text-sm text-red-700 bg-red-50 px-3 py-1 rounded-full">
              Out of stock
            </div>
          </div>

          <button
            class="mt-6 w-full px-5 py-3 rounded-xl bg-brand text-white font-medium hover:opacity-90 disabled:bg-slate-300 disabled:cursor-not-allowed transition-opacity"
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
