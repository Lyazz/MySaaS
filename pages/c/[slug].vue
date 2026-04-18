<script setup lang="ts">
import { categoryTemplates, resolveTemplateKey } from '~/components/storefront/templates/registry'
import type { TemplateKey } from '~/components/storefront/templates/registry'

const route = useRoute()
const slug = route.params.slug as string
const storeSettings = useState<any>('storeSettings')
const templateKey = computed<TemplateKey>(() => resolveTemplateKey(storeSettings.value?.templateKey))

type Category = {
  id: string
  title: string
  displayTitle?: string
  slug: string
  imageUrl?: string | null
}
type Product = {
  id: string
  title: string
  slug: string
  description?: string | null
  price: string | number
  stock: number
  isActive: boolean
  categoryId?: string | null
  categoryIds?: string[]
  categories?: Array<{ id: string; title: string; slug: string }>
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
const category = {
  ...activeCategory.value,
  title: activeCategory.value.title
} as Category

const products = ref<Product[]>([])
try {
  products.value = await $fetch<Product[]>(productsUrl, { headers: useTenantApiHeaders() })
} catch {
  throw createError({ statusCode: 500, statusMessage: 'Failed to load products' })
}

const productMatchesCategory = (product: Product, categoryId: string): boolean => {
  const ids = Array.from(
    new Set([...(product.categoryIds || []), product.categoryId].filter((id): id is string => typeof id === 'string' && id.length > 0))
  )
  return ids.includes(categoryId)
}

const categoryProducts = computed(() =>
  (products.value || [])
    .filter((product) => productMatchesCategory(product, category.id))
    .map((product) => ({
      ...product,
      // Keep legacy template filters working (`p.categoryId === activeCategory.id`).
      categoryId: category.id
    }))
)

useTenantSeo({
  title: `${category.title}`,
  description: `Browse products in ${category.title}.`
})

definePageMeta({
  middleware: 'tenant-only',
  layout: 'store'
})

const ActiveTemplate = computed(() => categoryTemplates[templateKey.value])
</script>

<template>
  <component
    :is="ActiveTemplate"
    :category="category"
    :products="categoryProducts"
  />
</template>
