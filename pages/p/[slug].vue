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
  productImages?: { url: string; isMain?: boolean; position?: number }[]
  metaPixelIds?: string[]
  categoryId?: string | null
  categoryIds?: string[]
  categories?: Array<{ id: string; title: string; slug: string }>
  loyaltyPreview?: {
    enabled: boolean
    estimatedPoints: number
    displayText: string
    formulaBreakdown?: { detail?: string }
  } | null
}

const productUrl = useTenantApiUrl(`/api/products/${encodeURIComponent(slug)}`)
const { data: product, error } = await useFetch<Product>(productUrl, {
    headers: useTenantApiHeaders(),
    key: `product-${slug}`
})

const productsUrl = useTenantApiUrl('/api/products')
const { data: allProducts } = await useFetch<Product[]>(productsUrl, { 
    headers: useTenantApiHeaders(),
    key: `products-list-related-${slug}`,
    default: () => []
})

const relatedProducts = computed(() => {
    if (!Array.isArray(allProducts.value)) return []
    
    const available = allProducts.value.filter(p => p.id !== product.value?.id && p.isActive)
    const currentCategoryIds = Array.from(
      new Set(
        [
          ...(((product.value as any)?.categoryIds || []) as string[]),
          (product.value as any)?.categoryId
        ].filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    )
    
    // Prioritize products in the same category
    if (currentCategoryIds.length > 0) {
        available.sort((a, b) => {
            const aCategoryIds = Array.from(
              new Set([...(a.categoryIds || []), a.categoryId].filter((id): id is string => typeof id === 'string' && id.length > 0))
            )
            const bCategoryIds = Array.from(
              new Set([...(b.categoryIds || []), b.categoryId].filter((id): id is string => typeof id === 'string' && id.length > 0))
            )
            const aMatch = aCategoryIds.some((id) => currentCategoryIds.includes(id)) ? 1 : 0
            const bMatch = bCategoryIds.some((id) => currentCategoryIds.includes(id)) ? 1 : 0
            return bMatch - aMatch
        })
    }
    
    return available.slice(0, 8)
})

const currencyCode = computed(() => storeSettings.value?.currencyCode || 'DZD')

if (error.value || !product.value) {
    throw createError({
        statusCode: 404,
        statusMessage: 'Product not found',
        fatal: true
    })
}

const mainImage = computed<string | undefined>(() => {
  const productImages = (product.value as any)?.productImages
  if (Array.isArray(productImages) && productImages.length > 0) {
    const main = productImages.find((img: any) => img?.isMain)
    return main?.url || productImages[0]?.url || undefined
  }
  return product.value?.images?.[0] || undefined
})

useTenantSeo({
  title: `${product.value?.title ?? slug}`,
  description: product.value?.description ?? undefined,
  image: mainImage.value
})

const metaPixel = useMetaPixel()
const lastViewedProductId = ref<string | null>(null)
onMounted(() => {
  watchEffect(() => {
    const id = product.value?.id
    if (!id) return
    if (lastViewedProductId.value === id) return
    lastViewedProductId.value = id

    const value = Number(product.value?.price || 0) || undefined
    const extraPixelIds = Array.isArray((product.value as any)?.metaPixelIds) ? ((product.value as any).metaPixelIds as string[]) : []
    metaPixel.viewContent({
      productId: id,
      value,
      currency: currencyCode.value,
      contents: [{ id, quantity: 1, item_price: value }],
      pixelIds: extraPixelIds,
      // If this product has assigned pixels, fire ViewContent only to those pixels (not the global one).
      includeGlobal: extraPixelIds.length === 0
    })
  })
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
            priceCurrency: currencyCode.value
        }
      })
    } as any
  ]
})

definePageMeta({
  middleware: 'tenant-only',
  layout: false // Disable static layout to allow dynamic component usage
})

const isLandingMode = computed(() => route.query.mode === 'landing' || route.query.layout === 'landing')

const ActiveTemplate = computed(() => {
  if (isLandingMode.value) {
    return defineAsyncComponent(() => import('~/components/storefront/templates/modern/ProductLandingPage.vue')) 
  }
  return productTemplates[templateKey.value]
})

const layoutName = computed(() => isLandingMode.value ? 'landing' : 'store')
</script>

<template>
  <NuxtLayout :name="layoutName">
    <div
      v-if="product?.loyaltyPreview?.enabled"
      class="mx-auto max-w-6xl px-4 pt-4"
    >
      <div class="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-sm">
        <div class="font-semibold">
          {{ product.loyaltyPreview.displayText }}
        </div>
        <div
          v-if="product.loyaltyPreview.formulaBreakdown?.detail"
          class="mt-1 text-xs text-amber-800/90"
        >
          {{ product.loyaltyPreview.formulaBreakdown.detail }}
        </div>
      </div>
    </div>
    <component
        :is="ActiveTemplate"
        :product="product"
        :related-products="relatedProducts"
    />
  </NuxtLayout>
</template>
