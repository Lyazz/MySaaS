<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string

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

const categoryProducts = computed(() => {
  const id = category.id
  return (products.value ?? []).filter((p) => p.isActive && p.stock > 0 && p.categoryId === id)
})

useTenantSeo({
  title: `${category.title}`,
  description: `Browse products in ${category.title}.`
})

definePageMeta({
  middleware: 'tenant-only'
})
</script>

<template>
  <div class="py-10">
    <div class="max-w-7xl mx-auto px-4">
      <NuxtLink to="/products" class="text-brand hover:underline mb-6 inline-flex items-center gap-2">
        <span aria-hidden="true">&larr;</span> Back to Products
      </NuxtLink>

      <h1 class="text-3xl font-bold text-slate-900 mb-2">{{ category.title }}</h1>
      <p class="text-slate-600 mb-8">Browse products in this category.</p>

      <div v-if="categoryProducts.length === 0" class="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
        <p class="text-slate-600">No products available in this category yet.</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <ProductCard v-for="product in categoryProducts" :key="product.id" :product="product" />
      </div>
    </div>
  </div>
</template>
