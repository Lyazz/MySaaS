<script setup lang="ts">
import { homeTemplates, resolveTemplateKey } from '~/components/storefront/templates/registry'
import type { TemplateKey } from '~/components/storefront/templates/registry'
import { DEFAULT_STOREFRONT_HOME_CONFIG, type StorefrontHomeConfig } from '~/shared/storefront/homepage'

type Tenant = { id: string; slug: string; name: string }
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

const tenant = useState<Tenant | null>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')
const storeSettings = useState<any>('storeSettings')

type PublicHomepageResponse = {
  homeConfig: StorefrontHomeConfig
  bestSellers: Product[]
}

useTenantSeo({
  title: `Home - ${tenantName.value}`,
  description: 'Welcome to our online store.',
})

const homepageUrl = useTenantApiUrl('/api/store/homepage')
const { data: homepageData } = await useFetch<PublicHomepageResponse>(homepageUrl, {
  headers: useTenantApiHeaders()
})

const homeConfig = computed<StorefrontHomeConfig>(() => homepageData.value?.homeConfig || DEFAULT_STOREFRONT_HOME_CONFIG)
const bestSellerProducts = computed<Product[]>(() => homepageData.value?.bestSellers || [])

const productsUrl = useTenantApiUrl('/api/products')
const { data: products, pending } = await useFetch<Product[]>(productsUrl, {
  headers: useTenantApiHeaders()
})

const featuredProducts = computed(() => {
  if (!products.value) return []
  const limit = homeConfig.value?.sections?.newArrivals?.limit ?? 6
  return products.value.slice(0, Math.max(1, Math.min(24, limit)))
})

const templateKey = computed<TemplateKey>(() => resolveTemplateKey(storeSettings.value?.templateKey))
const activeTemplate = computed(() => homeTemplates[templateKey.value])
</script>

<template>
  <component
    :is="activeTemplate"
    :tenant-name="tenantName"
    :featured-products="featuredProducts"
    :best-seller-products="bestSellerProducts"
    :home-config="homeConfig"
    :pending="pending"
  />
</template>
