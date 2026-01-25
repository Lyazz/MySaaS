<script setup lang="ts">
import ClassicProduct from '~/components/storefront/templates/ClassicProduct.vue'
import ModernProduct from '~/components/storefront/templates/ModernProduct.vue'

const route = useRoute()
const slug = route.params.slug as string
const storeSettings = useState<any>('storeSettings')
const templateKey = computed(() => storeSettings.value?.templateKey || 'modern')

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

definePageMeta({
  middleware: 'tenant-only',
  layout: 'store'
})

const ActiveTemplate = computed(() => {
    return templateKey.value === 'modern' ? ModernProduct : ClassicProduct
})
</script>

<template>
  <component :is="ActiveTemplate" :product="product" />
</template>
