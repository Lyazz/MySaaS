<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">
          Products
        </h2>
        <p class="text-gray-600 mt-1">
          Manage your product catalog
        </p>
      </div>
      <NuxtLink
        to="/admin/products/create"
        class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors flex items-center space-x-2"
      >
        <Icon name="lucide:plus" class="w-5 h-5" />
        <span>Add Product</span>
      </NuxtLink>
    </div>
 
    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <BaseInput
            v-model="searchQuery"
            placeholder="Search products..."
          />
        </div>
        <div>
          <BaseSelect
            v-model="selectedCategory"
            label="Category"
          >
            <option value="">
              All Categories
            </option>
            <option
              v-for="cat in categories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.title }}
            </option>
          </BaseSelect>
        </div>
        <div>
          <BaseSelect
            v-model="selectedStatus"
            label="Status"
          >
            <option value="">
              All Status
            </option>
            <option value="active">
              Active
            </option>
            <option value="inactive">
              Inactive
            </option>
          </BaseSelect>
        </div>
      </div>
    </div>
 
    <!-- Loading State -->
    <div
      v-if="loading"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      <p class="mt-2 text-gray-600">
        Loading products...
      </p>
    </div>
 
    <!-- Empty State -->
    <div
      v-else-if="filteredProducts.length === 0"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <Icon name="lucide:package" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        No products
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        Get started by creating a new product.
      </p>
      <div class="mt-6">
        <NuxtLink
          to="/admin/products/create"
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
        >
          <Icon name="lucide:plus" class="w-5 h-5 mr-2" />
          New Product
        </NuxtLink>
      </div>
    </div>
 
    <!-- Products Table -->
    <div
      v-else
      class="bg-white rounded-lg shadow overflow-hidden"
    >
      <div class="px-4 py-3 bg-gray-50 flex flex-wrap items-center gap-3 justify-between">
        <div class="text-sm text-gray-700">
          Sort by:
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in sortOptions"
            :key="option.key"
            :class="[
              'inline-flex items-center px-3 py-1 text-sm font-medium border rounded-md transition-colors',
              sortBy === option.key
                ? 'bg-teal-50 border-teal-500 text-teal-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
            ]"
            @click="setSort(option.key)"
          >
            <span>{{ option.label }}</span>
            <Icon
              v-if="sortBy === option.key"
              :name="sortOrder === 'asc' ? 'lucide:chevron-up' : 'lucide:chevron-down'"
              class="w-4 h-4 ml-2"
            />
          </button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Links
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="product in paginatedProducts"
              :key="product.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                    <img 
                      v-if="getProductMainImage(product)" 
                      :src="getProductMainImage(product)" 
                      :alt="product.title" 
                      class="h-10 w-10 object-cover" 
                    >
                    <Icon
                      v-else
                      name="lucide:image"
                      class="w-6 h-6 text-gray-400"
                    />
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">
                      {{ product.title }}
                    </div>
                    <div class="text-sm text-gray-500">
                      {{ product.slug }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  v-if="product.category"
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800"
                >
                  {{ product.category.title }}
                </span>
                <span
                  v-else
                  class="text-sm text-gray-400"
                >Uncategorized</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${{ Number(product.price).toFixed(2) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ product.stock }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                    product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  ]"
                >
                  {{ product.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="flex flex-col space-y-1">
                  <!-- Product Link -->
                  <div class="flex items-center space-x-2">
                    <span class="text-xs text-gray-400 w-12">Product:</span>
                    <a
                      :href="getProductUrl(product.slug)"
                      target="_blank"
                      class="text-teal-600 hover:text-teal-900"
                      title="Open Product Page"
                    >
                      <Icon name="lucide:external-link" class="w-4 h-4" />
                    </a>
                    <button
                      class="text-gray-400 hover:text-gray-600"
                      title="Copy Product Link"
                      @click="copyLink(`/p/${product.slug}`)"
                    >
                      <Icon name="lucide:copy" class="w-4 h-4" />
                    </button>
                  </div>
                  <!-- Landing Link -->
                  <div class="flex items-center space-x-2">
                    <span class="text-xs text-gray-400 w-12">Landing:</span>
                    <a
                      :href="getLandingUrl(product.slug)"
                      target="_blank"
                      class="text-teal-600 hover:text-teal-900"
                      title="Open Landing Page"
                    >
                      <Icon name="lucide:external-link" class="w-4 h-4" />
                    </a>
                    <button
                      class="text-gray-400 hover:text-gray-600"
                      title="Copy Landing Link"
                      @click="copyLink(`/p/${product.slug}?mode=landing`)"
                    >
                      <Icon name="lucide:copy" class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-3">
                  <NuxtLink
                    :to="`/admin/products/${product.id}`"
                    class="inline-flex items-center text-teal-600 hover:text-teal-900 transition-colors"
                  >
                    <Icon name="lucide:pencil" class="w-4 h-4 mr-1" />
                    <span>Edit</span>
                  </NuxtLink>
                  <button
                    class="inline-flex items-center text-red-600 hover:text-red-900 transition-colors"
                    @click="confirmDelete(product)"
                  >
                    <Icon name="lucide:trash" class="w-4 h-4 mr-1" />
                    <span>Delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
 
      <!-- Pagination -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            :disabled="currentPage === 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            @click="currentPage--"
          >
            Previous
          </button>
          <button
            :disabled="currentPage === totalPages"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            @click="currentPage++"
          >
            Next
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              Showing
              <span class="font-medium">{{ (currentPage - 1) * itemsPerPage + 1 }}</span>
              to
              <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, filteredProducts.length) }}</span>
              of
              <span class="font-medium">{{ filteredProducts.length }}</span>
              results
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                :disabled="currentPage === 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                @click="currentPage--"
              >
                Previous
              </button>
              <button
                v-for="page in totalPages"
                :key="page"
                :class="[
                  'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                  currentPage === page
                    ? 'z-10 bg-teal-50 border-teal-500 text-teal-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                ]"
                @click="currentPage = page"
              >
                {{ page }}
              </button>
              <button
                :disabled="currentPage === totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                @click="currentPage++"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
    <!-- Delete Confirmation Modal -->
    <AdminConfirmModal
      v-model="showDeleteModal"
      title="Delete Product"
      :message="`Are you sure you want to delete &quot;${productToDelete?.title}&quot;? This action cannot be undone.`"
      confirm-text="Delete"
      cancel-text="Cancel"
      @confirm="handleDelete"
    />
  </div>
</template>
 
<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { toTenantHost, useRequestOrigin } from '~/composables/host'

import BaseSelect from '~/components/ui/BaseSelect.vue'
import BaseInput from '~/components/ui/BaseInput.vue'
 
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Products'
})
 
const authStore = useAuthStore()
const config = useRuntimeConfig()
 
interface Product {
  id: string
  title: string
  slug: string
  price: number
  stock: number
  isActive: boolean
  images?: string[]
  productImages?: Array<{ id: string; url: string; isMain: boolean; position: number }>
  category?: { id: string; title: string }
}
 
interface Category {
  id: string
  title: string
}
 
// State
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('')
const currentPage = ref(1)
const itemsPerPage = 10
const showDeleteModal = ref(false)
const productToDelete = ref<Product | null>(null)

// Helper to get main product image
const getProductMainImage = (product: Product): string | undefined => {
  // Check productImages array first (new structure)
  if (product.productImages && product.productImages.length > 0) {
    const mainImage = product.productImages.find(img => img.isMain)
    return mainImage ? mainImage.url : product.productImages[0].url
  }
  // Fallback to legacy images array
  if (product.images && product.images.length > 0) {
    return product.images[0]
  }
  return undefined
}
const sortBy = ref<'createdAt' | 'title' | 'price' | 'stock' | 'isActive'>('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

const sortOptions = [
  { key: 'createdAt', label: 'Newest' },
  { key: 'title', label: 'Title' },
  { key: 'price', label: 'Price' },
  { key: 'stock', label: 'Stock' },
  { key: 'isActive', label: 'Status' }
] as const
 
// Computed
const filteredProducts = computed(() => {
  let filtered = products.value
 
  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.slug.toLowerCase().includes(query)
    )
  }
 
  // Category filter
  if (selectedCategory.value) {
    filtered = filtered.filter(p => p.category?.id === selectedCategory.value)
  }
 
  // Status filter
  if (selectedStatus.value) {
    filtered = filtered.filter(p => 
      selectedStatus.value === 'active' ? p.isActive : !p.isActive
    )
  }
 
  return filtered
})

const totalPages = computed(() => Math.ceil(filteredProducts.value.length / itemsPerPage))

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredProducts.value.slice(start, end)
})
 
// Methods
async function fetchProducts() {
  loading.value = true
  try {
    const data = await $fetch<Product[]>('/api/admin/products', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      query: {
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
        categoryId: selectedCategory.value || undefined
      }
    })
    products.value = data
  } catch (error) {
    console.error('Failed to fetch products:', error)
  } finally {
    loading.value = false
  }
}
 
async function fetchCategories() {
  try {
    const data = await $fetch<Category[]>('/api/admin/categories', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    categories.value = data
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  }
}
 
function confirmDelete(product: Product) {
  productToDelete.value = product
  showDeleteModal.value = true
}
 
async function handleDelete() {
  if (!productToDelete.value) return
 
  try {
    await $fetch(`/api/admin/products/${productToDelete.value.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
 
    // Remove from local state
    products.value = products.value.filter(p => p.id !== productToDelete.value?.id)
    productToDelete.value = null
  } catch (error) {
    console.error('Failed to delete product:', error)
    alert('Failed to delete product. Please try again.')
  }
}

// Use same logic as "View Store" button in admin layout
const tenantSlug = computed(() => authStore.user?.tenant?.slug as string | undefined)

function getProductUrl(slug: string): string {
    const tenantSlugValue = tenantSlug.value
    if (!tenantSlugValue) return '/'
    
    const { protocol, host } = useRequestOrigin()
    const tenantHost = toTenantHost(host, tenantSlugValue)
    return `${protocol}://${tenantHost}/p/${slug}`
}

function getLandingUrl(slug: string): string {
    const tenantSlugValue = tenantSlug.value
    if (!tenantSlugValue) return '/'
    
    const { protocol, host } = useRequestOrigin()
    const tenantHost = toTenantHost(host, tenantSlugValue)
    return `${protocol}://${tenantHost}/p/${slug}?mode=landing`
}

async function copyLink(path: string) {
    const tenantSlugValue = tenantSlug.value
    if (!tenantSlugValue) return
    
    const { protocol, host } = useRequestOrigin()
    const tenantHost = toTenantHost(host, tenantSlugValue)
    const url = `${protocol}://${tenantHost}${path}`
    
    try {
        await navigator.clipboard.writeText(url)
        // You could add a toast notification here if you have a toast system
        // alert('Link copied to clipboard')
    } catch (err) {
        console.error('Failed to copy link:', err)
    }
}
 
// Lifecycle
onMounted(() => {
  fetchProducts()
  fetchCategories()
})
 
// Watch for filter changes to reset pagination
watch([searchQuery, selectedCategory, selectedStatus], () => {
  currentPage.value = 1
})

watch([sortBy, sortOrder, selectedCategory], () => {
  fetchProducts()
  currentPage.value = 1
})

function setSort(field: typeof sortOptions[number]['key']) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = field === 'createdAt' ? 'desc' : 'asc'
  }
}
</script>
