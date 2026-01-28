<script setup lang="ts">
import { resolveTemplateKey, shopTemplates } from '~/components/storefront/templates/registry'
import type { TemplateKey } from '~/components/storefront/templates/registry'

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
  categoryId?: string | null
}

const productsUrl = useTenantApiUrl('/api/products')
const products = ref<Product[]>([])
try {
  products.value = await $fetch<Product[]>(productsUrl, { headers: useTenantApiHeaders() })
} catch {
  // Silent fail
}

useTenantSeo({
  title: 'Shop',
  description: 'Browse our full catalog.'
})

definePageMeta({
  middleware: 'tenant-only',
  layout: 'store'
})

const ActiveTemplate = computed(() => shopTemplates[templateKey.value])
</script>

<template>
  <component
    :is="ActiveTemplate"
    :products="products"
  />
</template>
