<script setup lang="ts">
import { homeTemplates, resolveTemplateKey } from '~/components/storefront/templates/registry'
import type { TemplateKey } from '~/components/storefront/templates/registry'

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

useTenantSeo({
  title: `Home - ${tenantName.value}`,
  description: 'Welcome to our online store.',
})

const productsUrl = useTenantApiUrl('/api/products')
const { data: products, pending } = await useFetch<Product[]>(productsUrl, {
  headers: useTenantApiHeaders()
})

const featuredProducts = computed(() => {
  if (!products.value) return []
  return products.value.slice(0, 6) // Show top 6
})

const templateKey = computed<TemplateKey>(() => resolveTemplateKey(storeSettings.value?.templateKey))
const activeTemplate = computed(() => homeTemplates[templateKey.value])
</script>

<template>
  <component
    :is="activeTemplate"
    :tenant-name="tenantName"
    :featured-products="featuredProducts"
    :pending="pending"
  />
</template>
