<script setup lang="ts">
interface Product {
  id: string
  title: string
  slug: string
  description?: string
  price: number
  stock: number
  isActive: boolean
  categoryId?: string
  category?: { id: string; title: string }
}

interface Category {
  id: string
  title: string
  slug?: string
}

const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')

useTenantSeo({
  title: `Products - ${tenantName.value}`,
  description: `Browse ${tenantName.value} products.`
})

const productsUrl = useTenantApiUrl('/api/products')
const categoriesUrl = useTenantApiUrl('/api/categories')

const { data: productsData, pending: productsPending } = await useFetch<Product[]>(productsUrl, {
  headers: useTenantApiHeaders()
})
const { data: categoriesData, pending: categoriesPending } = await useFetch<Category[]>(categoriesUrl, {
  headers: useTenantApiHeaders()
})

const loading = computed(() => productsPending.value || categoriesPending.value)
const products = computed(() => productsData.value ?? [])
const categories = computed(() => categoriesData.value ?? [])

const searchQuery = ref('')
const selectedCategory = ref('')

// Computed filtered products
const filteredProducts = computed(() => {
  let filtered = products.value.filter((p) => p.isActive && p.stock > 0)

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (p) => p.title.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query)
    )
  }

  // Category filter
  if (selectedCategory.value) {
    filtered = filtered.filter((p) => p.categoryId === selectedCategory.value)
  }

  return filtered
})

definePageMeta({
  middleware: 'tenant-only'
})
</script>

<template>
  <div class="py-8">
    <div class="max-w-7xl mx-auto px-4">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-slate-900">Products</h1>
        <p class="text-slate-600 mt-1">Browse {{ tenantName }} collection</p>
      </div>

      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Search</label>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search products..."
              class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              v-model="selectedCategory"
              class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            >
              <option value="">All Categories</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.title }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="loading" class="bg-white rounded-lg shadow p-12 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        <p class="mt-2 text-slate-600">Loading products...</p>
      </div>

      <div v-else-if="filteredProducts.length === 0" class="bg-white rounded-lg shadow p-12 text-center">
        <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
        <h2 class="mt-4 text-xl font-semibold text-slate-900">No products found</h2>
        <p class="mt-2 text-slate-600">Try adjusting your filters</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <ProductCard v-for="product in filteredProducts" :key="product.id" :product="product" />
      </div>
    </div>
  </div>
</template>
