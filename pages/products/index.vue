<script setup lang="ts">
import ModernShop from '~/components/storefront/templates/ModernShop.vue'
// Import ClassicShop if exists

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

const ActiveTemplate = computed(() => {
    // Logic for other templates can go here
    return ModernShop
})
</script>

<template>
  <component :is="ActiveTemplate" :products="products" />
</template>
