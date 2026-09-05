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

const categoryUrl = useTenantApiUrl(`/api/categories/${encodeURIComponent(slug)}`)

type CategoryWithProducts = Category & { id: string; products?: Product[] }

let categoryData: CategoryWithProducts | null = null
try {
  categoryData = await $fetch(categoryUrl, { headers: useTenantApiHeaders() }) as CategoryWithProducts
} catch (err: any) {
  if (err?.response?.status === 404 || err?.statusCode === 404) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }
  throw createError({ statusCode: 500, statusMessage: 'Failed to load category' })
}

if (!categoryData) {
  throw createError({ statusCode: 404, statusMessage: 'Category not found' })
}

const category = {
  ...categoryData,
  title: categoryData.title
} as Category

const categoryProducts = computed(() =>
  (categoryData?.products || []).map((product) => ({
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
