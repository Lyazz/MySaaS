<template>
  <div class="max-w-4xl mx-auto">
    <!-- Breadcrumb -->
    <nav
      class="flex mb-6"
      aria-label="Breadcrumb"
    >
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink
            to="/admin/products"
            class="text-gray-700 hover:text-teal-600"
          >
            Products
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6 text-gray-400" />
            <span class="ml-1 text-gray-500">Edit {{ form.title || 'Product' }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      <p class="mt-2 text-gray-600">
        Loading product...
      </p>
    </div>

    <!-- Form -->
    <div v-else>
      <!-- Header -->
      <div class="mb-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">
            Edit Product
          </h2>
          <p class="text-gray-600 mt-1">
            Update product information
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <!-- Public Links -->
          <div class="flex items-center space-x-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            <span class="text-xs font-medium text-gray-500 px-2">Links:</span>
                
            <!-- Product Page -->
            <div class="flex items-center space-x-1 border-r border-gray-300 pr-2">
              <span class="text-xs text-gray-400">Product</span>
              <a
                :href="productUrl"
                target="_blank"
                class="p-1 text-teal-600 hover:bg-teal-50 rounded"
                title="Open Product Page"
              >
                <Icon name="lucide:external-link" class="w-4 h-4" />
              </a>
              <button
                class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                title="Copy Product Link"
                @click="copyUrl(productUrl)"
              >
                <Icon name="lucide:copy" class="w-4 h-4" />
              </button>
            </div>

            <!-- Landing Page -->
            <div class="flex items-center space-x-1 pl-1">
              <span class="text-xs text-gray-400">Landing</span>
              <a
                :href="landingUrl"
                target="_blank"
                class="p-1 text-teal-600 hover:bg-teal-50 rounded"
                title="Open Landing Page"
              >
                <Icon name="lucide:external-link" class="w-4 h-4" />
              </a>
              <button
                class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                title="Copy Landing Link"
                @click="copyUrl(landingUrl)"
              >
                <Icon name="lucide:copy" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <NuxtLink
            to="/admin/products"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </NuxtLink>
          <button
            :disabled="submitting"
            class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleSubmit"
          >
            {{ submitting ? 'Updating...' : 'Update Product' }}
          </button>
        </div>
      </div>

      <form
        class="bg-white rounded-lg shadow overflow-hidden"
        @submit.prevent="handleSubmit"
      >
        <!-- Tabs Navigation -->
        <div class="border-b border-gray-200 overflow-x-auto custom-scrollbar">
          <nav
            class="flex -mb-px"
            aria-label="Tabs"
          >
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              class="whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors duration-200"
              :class="[
                currentTab === tab.id
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
              @click="currentTab = tab.id"
            >
              {{ tab.name }}
            </button>
          </nav>
        </div>

        <div class="p-6">
          <!-- General Tab -->
          <div
            v-show="currentTab === 'general'"
            class="space-y-6"
          >
            <!-- Title -->
            <!-- Title -->
            <BaseInput
              v-model="form.title"
              label="Product Title"
              :error="errors.title"
              placeholder="Enter product title"
              required
            />

            <!-- Slug -->
            <!-- Slug -->
            <BaseInput
              v-model="form.slug"
              label="Product Slug"
              :error="errors.slug"
              placeholder="product-slug"
              hint="URL-friendly version of the title"
              required
              pattern="[a-z0-9-]+"
            />

            <!-- Mini Description -->
            <AdminFormField
              label="Mini Description"
              :error="errors.miniDescription"
              hint="Short description for landing page header (optional)"
            >
              <template #default="{ inputId }">
                <textarea
                  :id="inputId"
                  v-model="form.miniDescription"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter a short summary..."
                />
              </template>
            </AdminFormField>

            <!-- Price and Stock Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Price -->
              <!-- Price -->
              <BaseInput
                v-model.number="form.price"
                label="Price ($)"
                :error="errors.price"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
              />

              <!-- Stock -->
              <!-- Stock -->
              <BaseInput
                v-model.number="form.stock"
                label="Stock Quantity"
                :error="errors.stock"
                type="number"
                min="0"
                required
                placeholder="0"
              />
            </div>

            <!-- Category -->
            <BaseSelect
              v-model="form.categoryId"
              label="Category"
              :error="errors.categoryId"
            >
              <option value="">
                Select a category (optional)
              </option>
              <option
                v-for="cat in categories"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.title }}
              </option>
            </BaseSelect>

            <!-- Product Images -->
            <ImageUploader v-model="productImages" />

            <!-- Active Status -->
            <div class="flex items-center">
              <input
                id="isActive"
                v-model="form.isActive"
                type="checkbox"
                class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              >
              <label
                for="isActive"
                class="ml-2 block text-sm text-gray-900"
              >
                Product is active and visible to customers
              </label>
            </div>
          </div>

          <!-- Landing Page Description Tab -->
          <div
            v-show="currentTab === 'description'"
            class="space-y-6"
          >
            <!-- Description -->
            <AdminFormField
              label="Landing Page Description"
              :error="errors.description"
            >
              <template #default="{ inputId }">
                <RichTextEditor
                  :id="inputId"
                  v-model="form.description"
                  placeholder="Enter product description with rich formatting..."
                />
              </template>
            </AdminFormField>
          </div>

          <!-- Variants Tab -->
          <div
            v-show="currentTab === 'variants'"
            class="space-y-6"
          >
            <!-- Options & Variants -->
            <div>
              <h2 class="text-xl font-bold text-gray-800 mb-4">
                Options & Variants
              </h2>
              <ProductOptionsEditor 
                :product-id="productId" 
                :options="options" 
                class="mb-8" 
                @refresh="fetchProduct"
              />
                        
              <ProductVariantsTable 
                :product-id="productId" 
                :variants="variants" 
                :options="options"
                :product-images="productImages"
                :legacy-images="form.images"
                @refresh="fetchProduct" 
              />
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="p-4 bg-red-50 border border-red-200 rounded-md mx-6 mb-6"
        >
          <p class="text-sm text-red-800">
            {{ errorMessage }}
          </p>
        </div>

        <!-- Actions Footer (Sticky on Mobile if needed, or just bottom) -->
        <div class="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
          <NuxtLink
            to="/admin/products"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </NuxtLink>
          <button
            type="submit"
            :disabled="submitting"
            class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ submitting ? 'Updating...' : 'Update Product' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { toTenantHost, useRequestOrigin } from '~/composables/host'
import ImageUploader from '~/components/admin/ImageUploader.vue'
import RichTextEditor from '~/components/admin/RichTextEditor.vue'
import ProductOptionsEditor from '~/components/admin/ProductOptionsEditor.vue'
import ProductVariantsTable from '~/components/admin/ProductVariantsTable.vue'
import BaseSelect from '~/components/ui/BaseSelect.vue'
import BaseInput from '~/components/ui/BaseInput.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Edit Product'
})

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const productId = route.params.id as string

interface Category {
  id: string
  title: string
}

interface ProductImage {
  id?: string | null
  url: string
  alt?: string
  position: number
  isMain: boolean
}

const form = ref({
  title: '',
  slug: '',
  miniDescription: '',
  description: '',
  price: 0,
  stock: 0,
  categoryId: '',
  isActive: true,
  images: [] as string[] // Legacy field for backwards compatibility
})

const options = ref<any[]>([])
const variants = ref<any[]>([])
const productImages = ref<ProductImage[]>([])

const errors = ref<Record<string, string>>({})
const errorMessage = ref('')
const submitting = ref(false)
const loading = ref(true)
const categories = ref<Category[]>([])

// Tabs configuration
const tabs = [
    { id: 'general', name: 'General' },
    { id: 'description', name: 'Landing Page Description' },
    { id: 'variants', name: 'Variants' }
]
const currentTab = ref('general')

async function fetchProduct() {
  loading.value = true
  try {
    const data = await $fetch<any>(`/api/admin/products/${productId}`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    form.value = {
      title: data.title,
      slug: data.slug,
      miniDescription: data.miniDescription || '',
      description: data.description || '',
      price: Number(data.price),
      stock: data.stock,
      categoryId: data.categoryId || '',
      isActive: data.isActive,
      images: data.images || []
    }

    options.value = data.options || []
    variants.value = data.variants || []
    
    // Convert productImages from API to our format, or migrate legacy images
    if (data.productImages && data.productImages.length > 0) {
      productImages.value = data.productImages.map((img: any) => ({
        id: img.id,
        url: img.url,
        alt: img.alt || '',
        position: img.position,
        isMain: img.isMain
      }))
    } else if (data.images && data.images.length > 0) {
      // Migrate legacy images array to ProductImage format
      productImages.value = data.images.map((url: string, idx: number) => ({
        id: null,
        url,
        alt: '',
        position: idx,
        isMain: idx === 0 // First image is main by default
      }))
    } else {
      productImages.value = []
    }

  } catch (error) {
    console.error('Failed to fetch product:', error)
    errorMessage.value = 'Failed to load product'
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

async function handleSubmit() {
  errors.value = {}
  errorMessage.value = ''
  submitting.value = true

  try {
    // First update basic product info
    const payload: any = {
      title: form.value.title,
      slug: form.value.slug,
      miniDescription: form.value.miniDescription || null,
      description: form.value.description || null,
      price: form.value.price,
      stock: form.value.stock,
      isActive: form.value.isActive,
      images: productImages.value.map(img => img.url) // Keep legacy images in sync
    }

    if (form.value.categoryId) {
      payload.categoryId = form.value.categoryId
    }

    await $fetch(`/api/admin/products/${productId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: payload
    })

    // Then sync ProductImage records via reorder endpoint
    // This will create/update/delete ProductImage records as needed
    if (productImages.value.length > 0) {
      try {
        await $fetch(`/api/admin/products/${productId}/images/sync`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authStore.token}`
          },
          body: {
            images: productImages.value.map(img => ({
              id: img.id,
              url: img.url,
              alt: img.alt || null,
              position: img.position,
              isMain: img.isMain
            }))
          }
        })
      } catch (imgError) {
        console.error('Failed to sync product images:', imgError)
        // Don't fail the whole save if image sync fails
      }
    }

    // Redirect to products list
    router.push('/admin/products')
  } catch (error: any) {
    console.error('Failed to update product:', error)
    
    if (error.data?.statusMessage) {
      errorMessage.value = error.data.statusMessage
    } else {
      errorMessage.value = 'Failed to update product. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}


// Use same logic as "View Store" button in admin layout
const tenantSlug = computed(() => authStore.user?.tenant?.slug as string | undefined)

const productUrl = computed(() => {
  const slug = tenantSlug.value
  if (!slug) return '/'
  
  const { protocol, host } = useRequestOrigin()
  const tenantHost = toTenantHost(host, slug)
  return `${protocol}://${tenantHost}/p/${form.value.slug}`
})

const landingUrl = computed(() => {
  const slug = tenantSlug.value
  if (!slug) return '/'
  
  const { protocol, host } = useRequestOrigin()
  const tenantHost = toTenantHost(host, slug)
  return `${protocol}://${tenantHost}/p/${form.value.slug}?mode=landing`
})

async function copyUrl(url: string) {
    try {
        await navigator.clipboard.writeText(url)
        // You could add a toast notification here
    } catch (err) {
        console.error('Failed to copy link:', err)
    }
}

onMounted(() => {
  fetchProduct()
  fetchCategories()
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    height: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #c7c7cc;
    border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a1a1aa;
}
</style>
