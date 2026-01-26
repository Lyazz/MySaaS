<template>
    <div class="max-w-5xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Categories</h2>
        <p class="text-gray-600 mt-1">Organize your products into categories</p>
      </div>

      <!-- Add Category Form -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-800">
              {{ isEditing ? 'Edit Category' : 'Add New Category' }}
            </h3>
            <p class="text-sm text-gray-500">
              Add a title, slug and featured image for each category
            </p>
          </div>
          <button
            v-if="isEditing"
            type="button"
            class="text-sm text-indigo-600 hover:text-indigo-700"
            @click="resetForm"
          >
            Cancel edit
          </button>
        </div>

        <form @submit.prevent="handleSave" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">Category name</label>
              <input
                v-model="newCategory.title"
                type="text"
                required
                placeholder="Category name"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                v-model="newCategory.slug"
                type="text"
                required
                pattern="[a-z0-9-]+"
                placeholder="category-slug"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <SingleImageUploader
            v-model="newCategory.imageUrl"
            label="Category image (optional)"
            hint="Used on storefront category tiles"
          />

          <div class="flex items-center justify-end gap-3 pt-2">
            <button
              v-if="isEditing"
              type="button"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="resetForm"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="creating"
              class="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
            >
              {{ creating ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Category') }}
            </button>
          </div>
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
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Image
              </th>
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
                <div class="w-16 h-12 rounded-lg bg-gray-50 overflow-hidden border border-gray-200 flex items-center justify-center">
                  <img
                    v-if="category.imageUrl"
                    :src="category.imageUrl"
                    alt=""
                    class="w-full h-full object-contain"
                  >
                  <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4-4a2 2 0 012.828 0L16 17m-2-2l1.586-1.586A2 2 0 0118 14.828L20 17M4 6h16M4 10h16"/>
                    </svg>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ category.title }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">{{ category.slug }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                  {{ category._count?.products || 0 }} products
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center gap-4 justify-end">
                  <button
                    @click="startEdit(category)"
                    class="text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                  <button
                    @click="confirmDelete(category)"
                    class="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
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
import SingleImageUploader from '~/components/admin/SingleImageUploader.vue'

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
  imageUrl?: string | null
  _count?: { products: number }
}

const categories = ref<Category[]>([])
const loading = ref(true)
const creating = ref(false)
const createError = ref('')
const showDeleteModal = ref(false)
const categoryToDelete = ref<Category | null>(null)
const editingCategoryId = ref<string | null>(null)

const isEditing = computed(() => Boolean(editingCategoryId.value))

const newCategory = ref<{
  title: string
  slug: string
  imageUrl: string | null
}>({
  title: '',
  slug: '',
  imageUrl: null
})

const resetForm = () => {
  newCategory.value = { title: '', slug: '', imageUrl: null }
  createError.value = ''
  editingCategoryId.value = null
}

// Auto-generate slug from title when creating
watch(() => newCategory.value.title, (newTitle) => {
  if (!isEditing.value) {
    newCategory.value.slug = slugify(newTitle)
  }
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

async function handleSave() {
  createError.value = ''
  creating.value = true

  const payload = {
    title: newCategory.value.title,
    slug: newCategory.value.slug,
    imageUrl: newCategory.value.imageUrl
  }

  try {
    if (isEditing.value && editingCategoryId.value) {
      const updated = await $fetch<Category>(`/api/admin/categories/${editingCategoryId.value}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authStore.token}`
        },
        body: payload
      })
      categories.value = categories.value.map((cat) => (cat.id === updated.id ? updated : cat))
    } else {
      const created = await $fetch<Category>('/api/admin/categories', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.token}`
        },
        body: payload
      })
      categories.value.unshift(created)
    }

    resetForm()
  } catch (error: any) {
    console.error('Failed to save category:', error)
    createError.value = error.data?.statusMessage || 'Failed to save category'
  } finally {
    creating.value = false
  }
}

function startEdit(category: Category) {
  editingCategoryId.value = category.id
  newCategory.value = {
    title: category.title,
    slug: category.slug,
    imageUrl: category.imageUrl || null
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
    if (editingCategoryId.value === categoryToDelete.value.id) {
      resetForm()
    }
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
