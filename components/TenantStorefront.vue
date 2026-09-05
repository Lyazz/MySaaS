<script setup lang="ts">
import { homeTemplates, resolveTemplateKey } from '~/components/storefront/templates/registry'
import type { TemplateKey } from '~/components/storefront/templates/registry'
import { DEFAULT_STOREFRONT_HOME_CONFIG, type StorefrontHomeConfig } from '~/shared/storefront/homepage'
import { useRoute } from 'vue-router'

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

// The merchant's own tagline, collected during onboarding. Every storefront used
// to ship the same hardcoded sentence, so every tenant competed in search with an
// identical description.
useTenantSeo({
  title: `Home - ${tenantName.value}`,
  description: storeSettings.value?.description?.trim() || `Welcome to ${tenantName.value}.`,
})

const homepageUrl = useTenantApiUrl('/api/store/homepage')
const { data: homepageData } = await useFetch<PublicHomepageResponse>(homepageUrl, {
  key: 'tenant-storefront-homepage',
  headers: useTenantApiHeaders()
})

const homeConfig = computed<StorefrontHomeConfig | undefined>(() => homepageData.value?.homeConfig)
const bestSellerProducts = computed<Product[]>(() => homepageData.value?.bestSellers || [])

const productsUrl = useTenantApiUrl('/api/products')
const { data: products, pending } = await useFetch<Product[]>(productsUrl, {
  key: 'tenant-storefront-home-products',
  headers: useTenantApiHeaders()
})

const featuredProducts = computed(() => {
  if (!products.value) return []
  const limit = homeConfig.value?.sections?.newArrivals?.limit ?? DEFAULT_STOREFRONT_HOME_CONFIG.sections.newArrivals.limit
  return products.value.slice(0, Math.max(1, Math.min(24, limit)))
})

const route = useRoute()
const templateKey = computed<TemplateKey>(() => {
  if (route.query.preview_template) {
     return resolveTemplateKey(route.query.preview_template as string)
  }
  return resolveTemplateKey(storeSettings.value?.templateKey)
})
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
