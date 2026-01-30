<template>
  <div class="max-w-3xl mx-auto">
    <!-- Breadcrumb -->
    <nav
      class="flex mb-6"
      aria-label="Breadcrumb"
    >
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink
            to="/admin/categories"
            class="text-gray-700 hover:text-teal-600"
          >
            Categories
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6 text-gray-400" />
            <span class="ml-1 text-gray-500">Create Category</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">
        Create New Category
      </h2>
      <p class="text-gray-600 mt-1">
        Add a category to keep your products organized
      </p>
    </div>

    <!-- Form -->
    <form
      class="bg-white rounded-lg shadow p-6 space-y-6"
      @submit.prevent="handleSubmit"
    >
      <AdminFormField
        label="Category Title"
        :error="errors.title"
        required
      >
        <template #default="{ inputId }">
          <input
            :id="inputId"
            v-model="form.title"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Enter category title"
          >
        </template>
      </AdminFormField>

      <AdminFormField
        label="Category Slug"
        :error="errors.slug"
        hint="URL-friendly version of the title (auto-generated)"
        required
      >
        <template #default="{ inputId }">
          <input
            :id="inputId"
            v-model="form.slug"
            type="text"
            required
            pattern="[a-z0-9-]+"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="category-slug"
          >
        </template>
      </AdminFormField>

      <SingleImageUploader
        v-model="form.imageUrl"
        label="Category image (optional)"
        hint="Shown on storefront category tiles"
      />

      <div
        v-if="errorMessage"
        class="p-4 bg-red-50 border border-red-200 rounded-md"
      >
        <p class="text-sm text-red-800">
          {{ errorMessage }}
        </p>
      </div>

      <div class="flex justify-end space-x-3 pt-4 border-t">
        <NuxtLink
          to="/admin/categories"
          class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </NuxtLink>
        <button
          type="submit"
          :disabled="submitting"
          class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ submitting ? 'Creating...' : 'Create Category' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import SingleImageUploader from '~/components/admin/SingleImageUploader.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Create Category'
})

const authStore = useAuthStore()
const router = useRouter()

const form = ref({
  title: '',
  slug: '',
  imageUrl: null as string | null
})

const errors = ref<Record<string, string>>({})
const errorMessage = ref('')
const submitting = ref(false)

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

async function handleSubmit() {
  errors.value = {}
  errorMessage.value = ''
  submitting.value = true

  try {
    await $fetch('/api/admin/categories', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {
        title: form.value.title,
        slug: form.value.slug,
        imageUrl: form.value.imageUrl
      }
    })

    router.push('/admin/categories')
  } catch (error: any) {
    console.error('Failed to create category:', error)

    if (error.data?.statusMessage) {
      errorMessage.value = error.data.statusMessage
    } else {
      errorMessage.value = 'Failed to create category. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}
</script>
