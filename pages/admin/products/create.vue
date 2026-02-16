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
            {{ t('admin.nav.products') }}
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6 text-gray-400" />
            <span class="ml-1 text-gray-500">{{ t('admin.pages.products.create.breadcrumb') }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!--  Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">
        {{ t('admin.pages.products.create.title') }}
      </h2>
      <p class="text-gray-600 mt-1">
        {{ t('admin.pages.products.create.subtitle') }}
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
        :label="t('admin.forms.product.title.label')"
        :error="errors.title"
        :placeholder="t('admin.forms.product.title.placeholder')"
        required
      />

      <!-- Slug -->
      <!-- Slug -->
      <BaseInput
        v-model="form.slug"
        :label="t('admin.forms.product.slug.label')"
        :error="errors.slug"
        :placeholder="t('admin.forms.product.slug.placeholder')"
        :hint="t('admin.forms.product.slug.hintCreate')"
        required
        pattern="[a-z0-9-]+"
      />

      <!-- Mini Description -->
      <AdminFormField
        :label="t('admin.forms.product.miniDescription.label')"
        :error="errors.miniDescription"
        :hint="t('admin.forms.product.miniDescription.hint')"
      >
        <template #default="{ inputId }">
          <textarea
            :id="inputId"
            v-model="form.miniDescription"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            :placeholder="t('admin.forms.product.miniDescription.placeholder')"
          />
        </template>
      </AdminFormField>

      <!-- Description -->
      <AdminFormField
        :label="t('admin.forms.product.description.label')"
        :error="errors.description"
      >
        <template #default="{ inputId }">
          <RichTextEditor
            :id="inputId"
            v-model="form.description"
            :placeholder="t('admin.forms.product.description.placeholder')"
          />
        </template>
      </AdminFormField>

      <!-- Price and Stock Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Price -->
        <!-- Price -->
        <BaseInput
          v-model.number="form.price"
          :label="t('admin.forms.product.price.label')"
          :error="errors.price"
          type="number"
          min="0"
          step="0.01"
          required
          :placeholder="t('admin.forms.product.price.placeholder')"
        />

        <!-- Stock -->
        <!-- Stock -->
        <BaseInput
          v-model.number="form.stock"
          :label="t('admin.forms.product.stock.label')"
          :error="errors.stock"
          type="number"
          min="0"
          required
          :placeholder="t('admin.forms.product.stock.placeholder')"
        />
      </div>

      <!-- Category -->
      <BaseSelect
        v-model="form.categoryId"
        :label="t('admin.forms.product.category.label')"
        :error="errors.categoryId"
      >
        <option value="">
          {{ t('admin.forms.product.category.placeholder') }}
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
      <ProductImagesUploader v-model="productImages" />

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
          {{ t('admin.forms.product.isActive.label') }}
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
          {{ t('admin.common.cancel') }}
        </NuxtLink>
        <button
          type="submit"
          :disabled="submitting"
          class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ submitting ? t('admin.common.creating') : t('admin.pages.products.create.submit') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import ProductImagesUploader from '~/components/admin/ProductImagesUploader.vue'
import RichTextEditor from '~/components/admin/RichTextEditor.vue'
import BaseSelect from '~/components/ui/BaseSelect.vue'
import BaseInput from '~/components/ui/BaseInput.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.products.create.metaTitle'
})

const authStore = useAuthStore()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

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

    const created = await $fetch<any>('/api/admin/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: payload
    })

    if (created?.id && productImages.value.length > 0) {
      try {
        await $fetch(`/api/admin/products/${created.id}/images/sync`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${authStore.token}` },
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
      }
    }

    // Redirect to products list
    router.push('/admin/products')
  } catch (error: any) {
    console.error('Failed to create product:', error)
    
    if (error.data?.statusMessage) {
      errorMessage.value = error.data.statusMessage
    } else {
      errorMessage.value = t('admin.pages.products.create.errors.createFailed')
    }
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchCategories()
})
</script>
