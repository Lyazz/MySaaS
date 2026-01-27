<template>
    <div class="max-w-3xl mx-auto">
      <!-- Breadcrumb -->
      <nav class="flex mb-6" aria-label="Breadcrumb">
        <ol class="inline-flex items-center space-x-1 md:space-x-3">
          <li class="inline-flex items-center">
            <NuxtLink to="/admin/products" class="text-gray-700 hover:text-indigo-600">
              Products
            </NuxtLink>
          </li>
          <li aria-current="page">
            <div class="flex items-center">
              <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="ml-1 text-gray-500">Create Product</span>
            </div>
          </li>
        </ol>
      </nav>

      <!--  Header -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Create New Product</h2>
        <p class="text-gray-600 mt-1">Add a new product to your catalog</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="bg-white rounded-lg shadow p-6 space-y-6">
        <!-- Title -->
        <AdminFormField label="Product Title" :error="errors.title" required>
          <template #default="{ inputId }">
            <input
              :id="inputId"
              v-model="form.title"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter product title"
            />
          </template>
        </AdminFormField>

        <!-- Slug -->
        <AdminFormField label="Product Slug" :error="errors.slug" hint="URL-friendly version of the title (auto-generated)" required>
          <template #default="{ inputId }">
            <input
              :id="inputId"
              v-model="form.slug"
              type="text"
              required
              pattern="[a-z0-9-]+"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="product-slug"
            />
          </template>
        </AdminFormField>

        <!-- Mini Description -->
        <AdminFormField label="Mini Description" :error="errors.miniDescription" hint="Short description for landing page header (optional)">
          <template #default="{ inputId }">
            <textarea
              :id="inputId"
              v-model="form.miniDescription"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter a short summary..."
            ></textarea>
          </template>
        </AdminFormField>

        <!-- Description -->
        <AdminFormField label="Description" :error="errors.description">
          <template #default="{ inputId }">
            <RichTextEditor
              :id="inputId"
              v-model="form.description"
              placeholder="Enter product description with rich formatting..."
            />
          </template>
        </AdminFormField>

        <!-- Price and Stock Row -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Price -->
          <AdminFormField label="Price ($)" :error="errors.price" required>
            <template #default="{ inputId }">
              <input
                :id="inputId"
                v-model.number="form.price"
                type="number"
                min="0"
                step="0.01"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
              />
            </template>
          </AdminFormField>

          <!-- Stock -->
          <AdminFormField label="Stock Quantity" :error="errors.stock" required>
            <template #default="{ inputId }">
              <input
                :id="inputId"
                v-model.number="form.stock"
                type="number"
                min="0"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
              />
            </template>
          </AdminFormField>
        </div>

        <!-- Category -->
        <AdminFormField label="Category" :error="errors.categoryId">
          <template #default="{ inputId }">
            <select
              :id="inputId"
              v-model="form.categoryId"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a category (optional)</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.title }}
              </option>
            </select>
          </template>
        </AdminFormField>

        <!-- Product Images -->
        <ImageUploader v-model="form.images" />

        <!-- Active Status -->
        <div class="flex items-center">
          <input
            id="isActive"
            v-model="form.isActive"
            type="checkbox"
            class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label for="isActive" class="ml-2 block text-sm text-gray-900">
            Product is active and visible to customers
          </label>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="p-4 bg-red-50 border border-red-200 rounded-md">
          <p class="text-sm text-red-800">{{ errorMessage }}</p>
        </div>

        <!-- Actions -->
        <div class="flex justify-end space-x-3 pt-4 border-t">
          <NuxtLink
            to="/admin/products"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </NuxtLink>
          <button
            type="submit"
            :disabled="submitting"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ submitting ? 'Creating...' : 'Create Product' }}
          </button>
        </div>
      </form>
    </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import ImageUploader from '~/components/admin/ImageUploader.vue'
import RichTextEditor from '~/components/admin/RichTextEditor.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Create Product'
})

const authStore = useAuthStore()
const router = useRouter()

interface Category {
  id: string
  title: string
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
  images: [] as string[]
})

const errors = ref<Record<string, string>>({})
const errorMessage = ref('')
const submitting = ref(false)
const categories = ref<Category[]>([])

// Auto-generate slug from title
watch(() => form.value.title, (newTitle) => {
  if (!form.value.slug || form.value.slug === slugify(form.value.title)) {
    form.value.slug = slugify(newTitle)
  }
})

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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
    const payload: any = {
      title: form.value.title,
      slug: form.value.slug,
      miniDescription: form.value.miniDescription || null,
      description: form.value.description || null,
      price: form.value.price,
      stock: form.value.stock,
      isActive: form.value.isActive,
      images: form.value.images
    }

    if (form.value.categoryId) {
      payload.categoryId = form.value.categoryId
    }

    await $fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: payload
    })

    // Redirect to products list
    router.push('/admin/products')
  } catch (error: any) {
    console.error('Failed to create product:', error)
    
    if (error.data?.statusMessage) {
      errorMessage.value = error.data.statusMessage
    } else {
      errorMessage.value = 'Failed to create product. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchCategories()
})
</script>
