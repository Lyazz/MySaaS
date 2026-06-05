<script setup lang="ts">
import { productLandingPageTemplates, productTemplates, resolveTemplateKey } from '~/components/storefront/templates/registry'
import type { TemplateKey } from '~/components/storefront/templates/registry'
import type { PublicLoyaltyPreview } from '~/composables/useActiveProductLoyaltyPreview'
import { normalizeMiniDescription, normalizeRichDescription } from '~/shared/product-content'

const route = useRoute()
const slug = route.params.slug as string
const storeSettings = useState<any>('storeSettings')
const templateKey = computed<TemplateKey>(() => resolveTemplateKey(storeSettings.value?.templateKey))
const activeLoyaltyPreview = useActiveProductLoyaltyPreview()

type Product = {
  id: string
  title: string
  slug: string
  description?: string | null
  miniDescription?: string | null
  searchKeywords?: string | null
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
    basePoints: number
    productPoints: number
    totalPoints: number
    displayText: string
    mode?: string | null
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

const normalizedProduct = computed<Product | null>(() => {
  if (!product.value) return null
  const rawMiniDescription = (product.value as any).miniDescription

  return {
    ...product.value,
    description: normalizeRichDescription(product.value.description),
    miniDescription:
      normalizeMiniDescription(rawMiniDescription) ??
      (typeof rawMiniDescription === 'string' && rawMiniDescription.trim().length > 0
        ? rawMiniDescription.trim()
        : null),
    searchKeywords: (product.value as any).searchKeywords
  }
})

const relatedProducts = computed(() => {
    if (!Array.isArray(allProducts.value)) return []
    
    const available = allProducts.value.filter(p => p.id !== normalizedProduct.value?.id && p.isActive)
    const currentCategoryIds = Array.from(
      new Set(
        [
          ...(((normalizedProduct.value as any)?.categoryIds || []) as string[]),
          (normalizedProduct.value as any)?.categoryId
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
  const productImages = (normalizedProduct.value as any)?.productImages
  if (Array.isArray(productImages) && productImages.length > 0) {
    const main = productImages.find((img: any) => img?.isMain)
    return main?.url || productImages[0]?.url || undefined
  }
  return normalizedProduct.value?.images?.[0] || undefined
})

useTenantSeo({
  title: `${normalizedProduct.value?.title ?? slug}`,
  description: normalizedProduct.value?.description ?? undefined,
  image: mainImage.value
})

const metaPixel = useMetaPixel()
const lastViewedProductId = ref<string | null>(null)
onMounted(() => {
  watchEffect(() => {
    const id = normalizedProduct.value?.id
    if (!id) return
    if (lastViewedProductId.value === id) return
    lastViewedProductId.value = id

    const value = Number(normalizedProduct.value?.price || 0) || undefined
    const extraPixelIds = Array.isArray((normalizedProduct.value as any)?.metaPixelIds) ? ((normalizedProduct.value as any).metaPixelIds as string[]) : []
    metaPixel.pageView({
      pixelIds: extraPixelIds
    })
    metaPixel.viewContent({
      productId: id,
      value,
      currency: currencyCode.value,
      contents: [{ id, quantity: 1, item_price: value }],
      pixelIds: extraPixelIds
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
        name: normalizedProduct.value?.title ?? slug,
        description: normalizedProduct.value?.description ?? undefined,
        image: mainImage.value,
        offers: {
            '@type': 'Offer',
            price: normalizedProduct.value?.price,
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
    return productLandingPageTemplates[templateKey.value]
  }
  return productTemplates[templateKey.value]
})

const layoutName = computed(() => isLandingMode.value ? 'landing' : 'store')
const displayedLoyaltyPreview = computed<PublicLoyaltyPreview>(() => {
  if (activeLoyaltyPreview.preview.value?.enabled) return activeLoyaltyPreview.preview.value
  return normalizedProduct.value?.loyaltyPreview ?? null
})

onUnmounted(() => {
  activeLoyaltyPreview.reset()
})
</script>

<template>
  <NuxtLayout :name="layoutName">
    <div v-if="displayedLoyaltyPreview?.enabled" class="mx-auto max-w-6xl px-4 pt-4">
      <ProductLoyaltyPreview :preview="displayedLoyaltyPreview" />
    </div>
    <component
        :is="ActiveTemplate"
        :product="normalizedProduct"
        :related-products="relatedProducts"
    />
    <!-- Themed product tags / search keywords -->
    <ProductKeywordTags
      v-if="normalizedProduct?.searchKeywords"
      :keywords="normalizedProduct.searchKeywords"
      :template-key="templateKey"
    />
  </NuxtLayout>
</template>
