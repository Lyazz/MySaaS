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
            to="/admin/categories"
            class="text-gray-700 hover:text-teal-600"
          >
            Categories
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6 text-gray-400" />
            <span class="ml-1 text-gray-500">Edit Category</span>
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
        Loading category...
      </p>
    </div>

    <div v-else>
      <!-- Header -->
      <div class="mb-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">
            Edit Category
          </h2>
          <p class="text-gray-600 mt-1">
            Update category details
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center space-x-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            <span class="text-xs font-medium text-gray-500 px-2">Link:</span>
            <a
              :href="categoryUrl"
              target="_blank"
              class="p-1 text-teal-600 hover:bg-teal-50 rounded"
              title="Open Category Page"
            >
              <Icon name="lucide:external-link" class="w-4 h-4" />
            </a>
            <button
              class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
              title="Copy Category Link"
              @click="copyUrl(categoryUrl)"
            >
              <Icon name="lucide:copy" class="w-4 h-4" />
            </button>
          </div>

          <NuxtLink
            to="/admin/categories"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to list
          </NuxtLink>
          <button
            :disabled="submitting"
            class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleSubmit"
          >
            {{ submitting ? 'Updating...' : 'Update Category' }}
          </button>
        </div>
      </div>

      <form
        class="bg-white rounded-lg shadow p-6 space-y-6"
        @submit.prevent="handleSubmit"
      >
        <BaseInput
          v-model="form.title"
          label="Category Title"
          :error="errors.title"
          placeholder="Enter category title"
          required
        />

        <BaseInput
          v-model="form.slug"
          label="Category Slug"
          :error="errors.slug"
          placeholder="category-slug"
          hint="URL-friendly version of the title"
          required
          pattern="[a-z0-9-]+"
        />

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

        <div class="flex justify-between items-center pt-4 border-t">
          <button
            type="button"
            class="text-red-600 hover:text-red-700 text-sm font-medium"
            @click="showDeleteModal = true"
          >
            Delete category
          </button>
          <div class="space-x-3">
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
              {{ submitting ? 'Updating...' : 'Update Category' }}
            </button>
          </div>
        </div>
      </form>
    </div>

    <AdminConfirmModal
      v-model="showDeleteModal"
      title="Delete Category"
      :message="confirmMessage"
      confirm-text="Delete"
      cancel-text="Cancel"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { toTenantHost, useRequestOrigin } from '~/composables/host'
import SingleImageUploader from '~/components/admin/SingleImageUploader.vue'
import BaseInput from '~/components/ui/BaseInput.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Edit Category'
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  title: '',
  slug: '',
  imageUrl: null as string | null
})

const errors = ref<Record<string, string>>({})
const errorMessage = ref('')
const submitting = ref(false)
const loading = ref(true)
const showDeleteModal = ref(false)
const lastAutoSlug = ref('')

const tenantSlug = computed(() => authStore.user?.tenant?.slug as string | undefined)
const confirmMessage = computed(() => {
  if (form.value.title) {
    return `Are you sure you want to delete \"${form.value.title}\"? Products in this category will become uncategorized.`
  }
  return 'Are you sure you want to delete this category? Products in this category will become uncategorized.'
})

const categoryUrl = computed(() => {
  const tenantSlugValue = tenantSlug.value
  if (!tenantSlugValue || !form.value.slug) return '/'
  const { protocol, host } = useRequestOrigin()
  const tenantHost = toTenantHost(host, tenantSlugValue)
  return `${protocol}://${tenantHost}/c/${form.value.slug}`
})

watch(() => form.value.title, (newTitle) => {
  const generated = slugify(newTitle)
  if (!form.value.slug || form.value.slug === lastAutoSlug.value) {
    form.value.slug = generated
    lastAutoSlug.value = generated
  }
})

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function fetchCategory() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await $fetch<any>(`/api/admin/categories/${route.params.id}`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    form.value.title = data.title
    form.value.slug = data.slug
    form.value.imageUrl = data.imageUrl ?? null
    lastAutoSlug.value = slugify(data.title)
  } catch (error: any) {
    console.error('Failed to load category:', error)
    errorMessage.value = error.data?.statusMessage || 'Failed to load category'
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  errors.value = {}
  errorMessage.value = ''
  submitting.value = true

  try {
    await $fetch(`/api/admin/categories/${route.params.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {
        title: form.value.title,
        slug: form.value.slug,
        imageUrl: form.value.imageUrl
      }
    })
  } catch (error: any) {
    console.error('Failed to update category:', error)
    errorMessage.value = error.data?.statusMessage || 'Failed to update category'
  } finally {
    submitting.value = false
  }
}

async function handleDelete() {
  try {
    await $fetch(`/api/admin/categories/${route.params.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    router.push('/admin/categories')
  } catch (error) {
    console.error('Failed to delete category:', error)
    alert('Failed to delete category. Please try again.')
  }
}

async function copyUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url)
  } catch (err) {
    console.error('Failed to copy link:', err)
  }
}

onMounted(() => {
  fetchCategory()
})
</script>
