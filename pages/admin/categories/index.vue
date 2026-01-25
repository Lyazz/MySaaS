<template>
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Categories</h2>
        <p class="text-gray-600 mt-1">Organize your products into categories</p>
      </div>

      <!-- Add Category Form -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Add New Category</h3>
        <form @submit.prevent="handleCreate" class="flex gap-4">
          <div class="flex-1">
            <input
              v-model="newCategory.title"
              type="text"
              required
              placeholder="Category name"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div class="flex-1">
            <input
              v-model="newCategory.slug"
              type="text"
              required
              pattern="[a-z0-9-]+"
              placeholder="category-slug"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            :disabled="creating"
            class="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
          >
            {{ creating ? 'Adding...' : 'Add Category' }}
          </button>
        </form>
        <p v-if="createError" class="mt-2 text-sm text-red-600">{{ createError }}</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white rounded-lg shadow p-12 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p class="mt-2 text-gray-600">Loading categories...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="categories.length === 0" class="bg-white rounded-lg shadow p-12 text-center">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No categories</h3>
        <p class="mt-1 text-sm text-gray-500">Get started by creating a new category above.</p>
      </div>

      <!-- Categories Table -->
      <div v-else class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Slug
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Products
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="category in categories" :key="category.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ category.title }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">{{ category.slug }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                  {{ category.products?.length || 0 }} products
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  @click="confirmDelete(category)"
                  class="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Delete Confirmation Modal -->
      <AdminConfirmModal
        v-model="showDeleteModal"
        title="Delete Category"
        :message="`Are you sure you want to delete &quot;${categoryToDelete?.title}&quot;? Products in this category will become uncategorized.`"
        confirm-text="Delete"
        cancel-text="Cancel"
        @confirm="handleDelete"
      />
    </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Categories'
})

const authStore = useAuthStore()

interface Category {
  id: string
  title: string
  slug: string
  products?: any[]
}

const categories = ref<Category[]>([])
const loading = ref(true)
const creating = ref(false)
const createError = ref('')
const showDeleteModal = ref(false)
const categoryToDelete = ref<Category | null>(null)

const newCategory = ref({
  title: '',
  slug: ''
})

// Auto-generate slug from title
watch(() => newCategory.value.title, (newTitle) => {
  newCategory.value.slug = slugify(newTitle)
})

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function fetchCategories() {
  loading.value = true
  try {
    const data = await $fetch<Category[]>('/api/admin/categories', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    categories.value = data
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  createError.value = ''
  creating.value = true

  try {
    const newCat = await $fetch<Category>('/api/admin/categories', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {
        title: newCategory.value.title,
        slug: newCategory.value.slug
      }
    })

    categories.value.unshift(newCat)
    newCategory.value = { title: '', slug: '' }
  } catch (error: any) {
    console.error('Failed to create category:', error)
    createError.value = error.data?.statusMessage || 'Failed to create category'
  } finally {
    creating.value = false
  }
}

function confirmDelete(category: Category) {
  categoryToDelete.value = category
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!categoryToDelete.value) return

  try {
    await $fetch(`/api/admin/categories/${categoryToDelete.value.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    categories.value = categories.value.filter(c => c.id !== categoryToDelete.value?.id)
    categoryToDelete.value = null
  } catch (error) {
    console.error('Failed to delete category:', error)
    alert('Failed to delete category. Please try again.')
  }
}

onMounted(() => {
  fetchCategories()
})
</script>
