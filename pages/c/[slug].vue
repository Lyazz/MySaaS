<script setup lang="ts">
import ClassicCategory from '~/components/storefront/templates/ClassicCategory.vue'
import ModernCategory from '~/components/storefront/templates/ModernCategory.vue'

const route = useRoute()
const slug = route.params.slug as string
const storeSettings = useState<any>('storeSettings')
const templateKey = computed(() => storeSettings.value?.templateKey || 'modern')

type Category = { id: string; title: string; slug: string }
type Product = {
  id: string
  title: string
  slug: string
  description?: string | null
  price: string | number
  stock: number
  isActive: boolean
  categoryId?: string | null
}

const categoriesUrl = useTenantApiUrl('/api/categories')
const productsUrl = useTenantApiUrl('/api/products')

const categories = ref<Category[]>([])
try {
  categories.value = await $fetch<Category[]>(categoriesUrl, { headers: useTenantApiHeaders() })
} catch {
  throw createError({ statusCode: 500, statusMessage: 'Failed to load categories' })
}

const activeCategory = computed(() => (categories.value ?? []).find((c) => c.slug === slug))
if (!activeCategory.value) {
  throw createError({ statusCode: 404, statusMessage: 'Category not found' })
}
const category = activeCategory.value as Category

const products = ref<Product[]>([])
try {
  products.value = await $fetch<Product[]>(productsUrl, { headers: useTenantApiHeaders() })
} catch {
  throw createError({ statusCode: 500, statusMessage: 'Failed to load products' })
}

useTenantSeo({
  title: `${category.title}`,
  description: `Browse products in ${category.title}.`
})

definePageMeta({
  middleware: 'tenant-only',
  layout: 'store'
})

const ActiveTemplate = computed(() => {
    return templateKey.value === 'modern' ? ModernCategory : ClassicCategory
})
</script>

<template>
  <component :is="ActiveTemplate" :category="category" :products="products" />
</template>
