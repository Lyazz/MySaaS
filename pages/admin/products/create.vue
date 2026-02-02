<template>
  <div class="max-w-7xl mx-auto">
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
            <span class="ml-1 text-gray-500">Create Product</span>
          </div>
        </li>
      </ol>
    </nav>

    <!--  Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">
        Create New Product
      </h2>
      <p class="text-gray-600 mt-1">
        Add a new product to your catalog
      </p>
    </div>

    <!-- Form -->
    <form
      class="bg-white rounded-lg shadow p-6 space-y-6"
      @submit.prevent="handleSubmit"
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
        hint="URL-friendly version of the title (auto-generated)"
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

      <!-- Description -->
      <AdminFormField
        label="Description"
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

      <!-- Error Message -->
      <div
        v-if="errorMessage"
        class="p-4 bg-red-50 border border-red-200 rounded-md"
      >
        <p class="text-sm text-red-800">
          {{ errorMessage }}
        </p>
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
          class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
import BaseSelect from '~/components/ui/BaseSelect.vue'
import BaseInput from '~/components/ui/BaseInput.vue'

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
  isActive: true
})

const productImages = ref<ProductImage[]>([])

interface ProductImage {
  id?: string | null
  url: string
  alt?: string
  position: number
  isMain: boolean
}

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
      images: productImages.value.map(img => img.url)
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
