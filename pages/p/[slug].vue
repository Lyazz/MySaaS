<script setup lang="ts">
import { productTemplates, resolveTemplateKey } from '~/components/storefront/templates/registry'
import type { TemplateKey } from '~/components/storefront/templates/registry'

const route = useRoute()
const slug = route.params.slug as string
const storeSettings = useState<any>('storeSettings')
const templateKey = computed<TemplateKey>(() => resolveTemplateKey(storeSettings.value?.templateKey))

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
  if (route.query.mode === 'landing' || route.query.layout === 'landing') {
    return defineAsyncComponent(() => import('~/components/storefront/templates/modern/ProductLandingPage.vue')) 
  }
  return productTemplates[templateKey.value]
})
</script>

<template>
  <component :is="ActiveTemplate" :product="product" />
</template>
