<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">
          {{ t('admin.nav.categories') }}
        </h2>
        <p class="text-gray-600 mt-1">
          {{ t('admin.pages.categories.index.subtitle') }}
        </p>
      </div>
      <NuxtLink
        to="/admin/categories/create"
        class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors flex items-center space-x-2"
      >
        <Icon name="lucide:plus" class="w-5 h-5" />
        <span>{{ t('admin.pages.categories.index.addCategory') }}</span>
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('admin.pages.categories.index.filters.searchLabel') }}</label>
          <BaseInput
            v-model="searchQuery"
            type="text"
            :placeholder="t('admin.pages.categories.index.filters.searchPlaceholder')"
          />
        </div>
        <div class="flex items-end">
          <p class="text-sm text-gray-500">
            {{ t('admin.pages.categories.index.filters.sortHint') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="ui-card p-12 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      <p class="mt-2 text-gray-600">
        {{ t('admin.pages.categories.index.loading') }}
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredCategories.length === 0"
      class="ui-card p-12 text-center"
    >
      <Icon name="lucide:shapes" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        {{ t('admin.pages.categories.index.empty.title') }}
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ t('admin.pages.categories.index.empty.hint') }}
      </p>
      <div class="mt-6">
        <NuxtLink
          to="/admin/categories/create"
          class="ui-btn ui-btn--primary ui-btn--md"
        >
          <Icon name="lucide:plus" class="w-5 h-5 mr-2" />
          {{ t('admin.pages.categories.index.empty.newCategory') }}
        </NuxtLink>
      </div>
    </div>

    <!-- Categories Table -->
    <div
      v-else
      class="ui-card overflow-hidden"
    >
      <div class="ui-card-header bg-slate-50 flex flex-wrap items-center gap-3 justify-between">
        <div class="text-sm text-slate-700">
          {{ t('admin.pages.categories.index.sort.sortBy') }}
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in sortOptions"
            :key="option.key"
            :class="[
              'inline-flex items-center px-3 py-1 text-xs font-medium border rounded-full transition-colors',
              sortBy === option.key
                ? 'bg-teal-50 border-teal-500 text-teal-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            ]"
            @click="setSort(option.key)"
          >
            <span>{{ t(option.labelKey) }}</span>
            <Icon
              v-if="sortBy === option.key"
              :name="sortOrder === 'asc' ? 'lucide:chevron-up' : 'lucide:chevron-down'"
              class="w-4 h-4 ml-2"
            />
          </button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="ui-table">
          <thead class="ui-thead">
            <tr>
              <th class="ui-th">
                {{ t('admin.pages.categories.index.table.category') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.categories.index.table.products') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.categories.index.table.links') }}
              </th>
              <th class="ui-th text-right">
                {{ t('admin.pages.categories.index.table.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="ui-tbody">
            <tr
              v-for="category in paginatedCategories"
              :key="category.id"
              class="ui-tr"
            >
              <td class="ui-td whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10 bg-gray-100 rounded flex items-center justify-center overflow-hidden border border-gray-200">
                    <img
                      v-if="category.imageUrl"
                      :src="category.imageUrl"
                      :alt="category.title"
                      class="h-10 w-10 object-cover"
                    >
                    <Icon
                      v-else
                      name="lucide:image"
                      class="w-6 h-6 text-gray-400"
                    />
                  </div>
                  <div class="ml-4">
                    <div class="font-medium text-slate-900">
                      {{ category.title }}
                    </div>
                    <div class="text-sm text-slate-500">
                      {{ category.slug }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <span class="ui-badge ui-badge--slate">
                  {{ t('admin.pages.categories.index.table.productsCount', { count: category._count?.products || 0 }) }}
                </span>
              </td>
              <td class="ui-td whitespace-nowrap text-sm text-slate-600">
                <div class="flex items-center space-x-2">
                  <a
                    :href="getCategoryUrl(category.slug)"
                    target="_blank"
                    class="text-teal-600 hover:text-teal-700"
                    :title="t('admin.pages.categories.index.links.openCategory')"
                  >
                    <Icon name="lucide:external-link" class="w-4 h-4" />
                  </a>
                  <button
                    class="text-slate-400 hover:text-slate-600"
                    :title="t('admin.pages.categories.index.links.copyCategory')"
                    @click="copyLink(`/c/${category.slug}`)"
                  >
                    <Icon name="lucide:copy" class="w-4 h-4" />
                  </button>
                </div>
              </td>
              <td class="ui-td whitespace-nowrap text-right">
                <div class="flex items-center justify-end space-x-3">
                  <NuxtLink
                    :to="`/admin/categories/${category.id}`"
                    class="ui-btn ui-btn--secondary ui-btn--sm"
                  >
                    <Icon name="lucide:pencil" class="w-4 h-4 mr-1" />
                    <span>{{ t('admin.common.edit') }}</span>
                  </NuxtLink>
                  <button
                    class="ui-btn ui-btn--danger ui-btn--sm"
                    @click="confirmDelete(category)"
                  >
                    <Icon name="lucide:trash" class="w-4 h-4 mr-1" />
                    <span>{{ t('admin.common.delete') }}</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6">
        <div class="flex flex-1 items-center justify-between sm:hidden">
          <button
            :disabled="currentPage === 1"
            class="ui-btn ui-btn--secondary ui-btn--sm"
            @click="currentPage--"
          >
            <Icon name="lucide:chevron-left" class="w-4 h-4" />
          </button>
          <span class="text-sm text-slate-600">
            {{ t('admin.common.page', { page: currentPage, total: totalPages }) }}
          </span>
          <button
            :disabled="currentPage === totalPages"
            class="ui-btn ui-btn--secondary ui-btn--sm"
            @click="currentPage++"
          >
            <Icon name="lucide:chevron-right" class="w-4 h-4" />
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-slate-700">
              {{ t('admin.pages.categories.index.pagination.showing', {
                from: (currentPage - 1) * itemsPerPage + 1,
                to: Math.min(currentPage * itemsPerPage, filteredCategories.length),
                total: filteredCategories.length
              }) }}
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                :disabled="currentPage === 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                @click="currentPage--"
              >
                {{ t('admin.common.previous') }}
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
                {{ t('admin.common.next') }}
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <AdminConfirmModal
      v-model="showDeleteModal"
      :title="t('admin.pages.categories.index.deleteModal.title')"
      :message="deleteMessage"
      :confirm-text="t('admin.common.delete')"
      :cancel-text="t('admin.common.cancel')"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { toTenantHost, useRequestOrigin } from '~/composables/host'
import BaseInput from '~/components/ui/BaseInput.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.categories.index.title'
})

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })

interface Category {
  id: string
  title: string
  slug: string
  imageUrl?: string | null
  createdAt?: string
  _count?: { products: number }
}

const categories = ref<Category[]>([])
const loading = ref(true)
const searchQuery = ref('')
const sortBy = ref<'createdAt' | 'title' | 'slug' | 'products'>('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
const currentPage = ref(1)
const itemsPerPage = 25
const showDeleteModal = ref(false)
const categoryToDelete = ref<Category | null>(null)

const sortOptions = [
  { key: 'createdAt', labelKey: 'admin.pages.categories.index.sort.newest' },
  { key: 'title', labelKey: 'admin.pages.categories.index.sort.title' },
  { key: 'slug', labelKey: 'admin.pages.categories.index.sort.slug' },
  { key: 'products', labelKey: 'admin.pages.categories.index.sort.products' }
] as const

const tenantSlug = computed(() => authStore.user?.tenant?.slug as string | undefined)
const deleteMessage = computed(() => {
  if (categoryToDelete.value?.title) {
    return t('admin.pages.categories.index.deleteModal.messageWithTitle', { title: categoryToDelete.value.title })
  }
  return t('admin.pages.categories.index.deleteModal.message')
})

const sortedCategories = computed(() => {
  const data = [...categories.value]
  const dir = sortOrder.value === 'asc' ? 1 : -1

  return data.sort((a, b) => {
    switch (sortBy.value) {
      case 'title':
        return a.title.localeCompare(b.title) * dir
      case 'slug':
        return a.slug.localeCompare(b.slug) * dir
      case 'products': {
        const aCount = a._count?.products || 0
        const bCount = b._count?.products || 0
        return (aCount - bCount) * dir
      }
      case 'createdAt':
      default: {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return (aDate - bDate) * dir
      }
    }
  })
})

const filteredCategories = computed(() => {
  let filtered = sortedCategories.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter((c) =>
      c.title.toLowerCase().includes(query) || c.slug.toLowerCase().includes(query)
    )
  }

  return filtered
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredCategories.value.length / itemsPerPage)))

const paginatedCategories = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredCategories.value.slice(start, end)
})

async function fetchCategories() {
  loading.value = true
  try {
    const data = await $fetch('/api/admin/categories', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      query: {
        sortBy: sortBy.value,
        sortOrder: sortOrder.value
      }
    }) as Category[]
    categories.value = data
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  } finally {
    loading.value = false
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

    categories.value = categories.value.filter((c) => c.id !== categoryToDelete.value?.id)
    categoryToDelete.value = null
  } catch (error) {
    console.error('Failed to delete category:', error)
    alert(t('admin.pages.categories.index.deleteModal.error'))
  }
}

function setSort(field: typeof sortOptions[number]['key']) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = field === 'createdAt' ? 'desc' : 'asc'
  }
}

function getCategoryUrl(slug: string): string {
  const tenantSlugValue = tenantSlug.value
  if (!tenantSlugValue) return '/'

  const { protocol, host } = useRequestOrigin()
  const tenantHost = toTenantHost(host, tenantSlugValue)
  return `${protocol}://${tenantHost}/c/${slug}`
}

async function copyLink(path: string) {
  const tenantSlugValue = tenantSlug.value
  if (!tenantSlugValue) return

  const { protocol, host } = useRequestOrigin()
  const tenantHost = toTenantHost(host, tenantSlugValue)
  const url = `${protocol}://${tenantHost}${path}`

  try {
    await navigator.clipboard.writeText(url)
  } catch (err) {
    console.error('Failed to copy link:', err)
  }
}

onMounted(() => {
  fetchCategories()
})

watch([searchQuery], () => {
  currentPage.value = 1
})

watch([sortBy, sortOrder], () => {
  fetchCategories()
  currentPage.value = 1
})
</script>
