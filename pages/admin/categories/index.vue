<template>
  <div class="max-w-7xl mx-auto">
    <div class="flex flex-wrap justify-between items-center gap-3 mb-6">
      <div>
        <h2
 class="text-2xl font-bold text-primary"
 
>
          {{ t('admin.nav.categories') }}
        </h2>
        <p
 class="mt-1 text-secondary"
 
>
          {{ t('admin.pages.categories.index.subtitle') }}
        </p>
      </div>
      <NuxtLink
        to="/admin/categories/create"
        class="px-4 py-2 [background:var(--brand)] text-brand-contrast rounded-lg hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] transition-colors inline-flex items-center gap-2"
      >
        <Icon
          name="lucide:plus"
          class="w-5 h-5"
        />
        <span>{{ t('admin.pages.categories.index.addCategory') }}</span>
      </NuxtLink>
    </div>

    <AdminFilterBar
      v-model:search="searchQuery"
      :search-label="t('admin.pages.categories.index.filters.searchLabel')"
      :search-placeholder="t('admin.pages.categories.index.filters.searchPlaceholder')"
      testid="categories-filters"
      @clear="searchQuery = ''"
    >
      <div class="flex items-center gap-2">
        <select
          v-model="sortBy"
          class="ui-input h-9 w-auto py-0 text-sm"
          :aria-label="t('admin.pages.categories.index.sort.sortBy')"
        >
          <option
            v-for="option in sortOptions"
            :key="option.key"
            :value="option.key"
          >
            {{ t(option.labelKey) }}
          </option>
        </select>
        <button
          type="button"
          class="ui-btn ui-btn--secondary h-9 w-9 shrink-0 px-0 py-0"
          :title="sortOrder === 'asc' ? t('admin.common.next') : t('admin.common.previous')"
          @click="toggleSortOrder"
        >
          <Icon
            :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'"
            class="w-4 h-4"
          />
        </button>
      </div>
    </AdminFilterBar>

    <div
      v-if="loading"
      class="ui-card p-12 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 [border-color:var(--brand)]" />
      <p
 class="mt-2 text-secondary"
 
>
        {{ t('admin.pages.categories.index.loading') }}
      </p>
    </div>

    <div
      v-else-if="filteredParentCategories.length === 0"
      class="ui-card p-12 text-center"
    >
      <Icon
 name="lucide:shapes"
 class="mx-auto h-12 w-12 text-tertiary"
 
 />
      <h3
 class="mt-2 text-sm font-medium text-primary"
 
>
        {{ t('admin.pages.categories.index.empty.title') }}
      </h3>
      <p
 class="mt-1 text-sm text-tertiary"
 
>
        {{ t('admin.pages.categories.index.empty.hint') }}
      </p>
      <div class="mt-6">
        <NuxtLink
          to="/admin/categories/create"
          class="ui-btn ui-btn--primary ui-btn--md"
        >
          <Icon
            name="lucide:plus"
            class="w-5 h-5 me-2"
          />
          {{ t('admin.pages.categories.index.empty.newCategory') }}
        </NuxtLink>
      </div>
    </div>

    <div
      v-else
      class="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-6"
    >
      <section class="ui-card overflow-hidden">
        <div
 class="px-4 py-3 sm:px-6 border-b border-line"
 
>
          <h3
 class="text-sm font-semibold text-primary"
 
>
            {{ t('admin.pages.categories.index.workspace.parentsTitle') }}
          </h3>
          <p
 class="text-xs mt-1 text-tertiary"
 
>
            {{ t('admin.pages.categories.index.workspace.parentsHint') }}
          </p>
        </div>

        <div
          class="divide-y"
          style="divide-color: var(--surface-border)"
        >
          <button
            v-for="category in paginatedParentCategories"
            :key="category.id"
            type="button"
            class="w-full px-4 py-3 sm:px-6 text-start transition-colors"
            :class="activeParent?.id === category.id ? '[background:rgba(var(--brand-rgb)/0.08)]' : 'hover:[background:var(--surface-2)]'"
            @click="activeParentId = category.id"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center min-w-0 gap-3">
                <div
 class="h-10 w-10 rounded-lg flex items-center justify-center overflow-hidden surface-3 border border-line"
 
>
                  <img
                    v-if="category.imageUrl"
                    :src="category.imageUrl"
                    :alt="categoryDisplayTitle(category)"
                    class="h-10 w-10 object-cover"
                  >
                  <Icon
 v-else
 name="lucide:image"
 class="w-5 h-5 text-tertiary"
 
 />
                </div>
                <div class="min-w-0">
                  <p
 class="truncate text-sm font-semibold text-primary"
 
>
                    {{ categoryDisplayTitle(category) }}
                  </p>
                  <p
 class="truncate text-xs text-tertiary"
 
>
                    {{ category.slug }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <span
                  v-if="category.visibility === 'UNLISTED'"
                  class="ui-badge ui-badge--amber"
                >
                  {{ t('admin.forms.category.visibility.unlisted') }}
                </span>
                <span class="ui-badge ui-badge--slate">
                  {{ t('admin.pages.categories.index.table.productsCount', { count: category._count?.products || 0 }) }}
                </span>
                <span class="ui-badge ui-badge--slate">
                  {{ t('admin.pages.categories.index.workspace.subcategoriesCount', { count: category._count?.subcategories || 0 }) }}
                </span>
              </div>
            </div>
          </button>
        </div>

        <div
 class="px-4 py-3 flex items-center justify-between sm:px-6 border-t border-line"
 
>
          <button
            :disabled="currentPage === 1"
            class="ui-btn ui-btn--secondary ui-btn--sm"
            @click="currentPage--"
          >
            <Icon
              name="lucide:chevron-left"
              class="w-4 h-4"
            />
          </button>

          <p
 class="text-sm text-secondary"
 
>
            {{ t('admin.pages.categories.index.pagination.showing', {
              from: (currentPage - 1) * itemsPerPage + 1,
              to: Math.min(currentPage * itemsPerPage, filteredParentCategories.length),
              total: filteredParentCategories.length
            }) }}
          </p>

          <button
            :disabled="currentPage === totalPages"
            class="ui-btn ui-btn--secondary ui-btn--sm"
            @click="currentPage++"
          >
            <Icon
              name="lucide:chevron-right"
              class="w-4 h-4"
            />
          </button>
        </div>
      </section>

      <aside class="ui-card p-4 sm:p-6 xl:sticky xl:top-20 h-max">
        <div v-if="activeParent">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p
 class="text-xs font-semibold uppercase tracking-wide text-tertiary"
 
>
                {{ t('admin.pages.categories.index.workspace.subcategoriesTitle') }}
              </p>
              <h3
 class="mt-1 text-lg font-semibold truncate text-primary"
 
>
                {{ categoryDisplayTitle(activeParent) }}
              </h3>
              <p
 class="text-xs text-tertiary"
 
>
                /category/{{ activeParent.slug }}
              </p>
            </div>
            <div class="flex items-center gap-1">
              <a
 :href="getCategoryUrl(activeParent.slug)"
 target="_blank"
 class="p-2 rounded-lg transition-colors text-tertiary"
 
 :title="t('admin.pages.categories.index.links.openCategory')"
>
                <Icon
                  name="lucide:external-link"
                  class="w-4 h-4"
                />
              </a>
              <button
 type="button"
 class="p-2 rounded-lg transition-colors text-tertiary"
 
 :title="t('admin.pages.categories.index.links.copyCategory')"
 @click="copyLink(`/category/${activeParent.slug}`)"
>
                <Icon
                  name="lucide:copy"
                  class="w-4 h-4"
                />
              </button>
              <NuxtLink
 :to="`/admin/categories/${activeParent.id}`"
 class="p-2 rounded-lg transition-colors text-tertiary"
 
 :title="t('admin.common.edit')"
>
                <Icon
                  name="lucide:pencil"
                  class="w-4 h-4"
                />
              </NuxtLink>
              <button
 type="button"
 class="p-2 rounded-lg transition-colors hover:text-red-600 hover:bg-red-50 text-tertiary"
 
 :title="t('admin.common.delete')"
 @click="confirmDelete(activeParent)"
>
                <Icon
                  name="lucide:trash"
                  class="w-4 h-4"
                />
              </button>
            </div>
          </div>

          <p
 class="mt-4 text-sm text-secondary"
 
>
            {{ t('admin.pages.categories.index.workspace.subcategoriesHint') }}
          </p>

          <div
            v-if="activeSubcategories.length > 0"
            class="mt-4 space-y-2"
          >
            <div
 v-for="subcategory in activeSubcategories"
 :key="subcategory.id"
 class="rounded-lg border px-3 py-3 transition-colors border-line surface-2"
 
>
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p
 class="truncate text-sm font-medium text-primary"
 
>
                    {{ categoryDisplayTitle(subcategory) }}
                  </p>
                  <p
 class="truncate text-xs text-tertiary"
 
>
                    {{ subcategory.slug }}
                  </p>
                </div>
                <div class="flex items-center gap-1">
                  <span
                    v-if="subcategory.visibility === 'UNLISTED'"
                    class="ui-badge ui-badge--amber me-1"
                  >
                    {{ t('admin.forms.category.visibility.unlisted') }}
                  </span>
                  <a
 :href="getCategoryUrl(subcategory.slug)"
 target="_blank"
 class="p-2 rounded-lg transition-colors text-tertiary"
 
 :title="t('admin.pages.categories.index.links.openCategory')"
>
                    <Icon
                      name="lucide:external-link"
                      class="w-4 h-4"
                    />
                  </a>
                  <button
 type="button"
 class="p-2 rounded-lg transition-colors text-tertiary"
 
 :title="t('admin.pages.categories.index.links.copyCategory')"
 @click="copyLink(`/category/${subcategory.slug}`)"
>
                    <Icon
                      name="lucide:copy"
                      class="w-4 h-4"
                    />
                  </button>
                  <NuxtLink
 :to="`/admin/categories/${subcategory.id}`"
 class="p-2 rounded-lg transition-colors text-tertiary"
 
 :title="t('admin.common.edit')"
>
                    <Icon
                      name="lucide:pencil"
                      class="w-4 h-4"
                    />
                  </NuxtLink>
                  <button
 type="button"
 class="p-2 rounded-lg transition-colors hover:text-red-600 hover:bg-red-50 text-tertiary"
 
 :title="t('admin.common.delete')"
 @click="confirmDelete(subcategory)"
>
                    <Icon
                      name="lucide:trash"
                      class="w-4 h-4"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
 v-else
 class="mt-4 rounded-lg border border-dashed px-4 py-5 text-center border-line surface-2"
 
>
            <p
 class="text-sm font-medium text-primary"
 
>
              {{ t('admin.pages.categories.index.workspace.noSubcategories') }}
            </p>
          </div>
        </div>

        <div
 v-else
 class="rounded-lg border border-dashed px-4 py-5 text-center border-line surface-2"
 
>
          <p
 class="text-sm text-secondary"
 
>
            {{ t('admin.pages.categories.index.workspace.selectCategory') }}
          </p>
        </div>
      </aside>
    </div>

    <AdminConfirmModal
      v-model="showDeleteModal"
      :title="t('admin.pages.categories.index.deleteModal.title')"
      :message="deleteMessage"
      :confirm-text="t('admin.common.delete')"
      :cancel-text="t('admin.common.cancel')"
      :error="deleteError"
      @confirm="handleDelete"
      @update:model-value="val => { if (!val) deleteError = null }"
    />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { toTenantHost, useRequestOrigin } from '~/composables/host'
import { usePlatformBaseDomain } from '~/composables/platformBaseDomain'
import AdminFilterBar from '~/components/admin/AdminFilterBar.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.categories.index.title'
})

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const router = useRouter()

interface Category {
  id: string
  title: string
  displayTitle?: string
  slug: string
  imageUrl?: string | null
  parentId?: string | null
  parent?: { id: string; title: string; slug: string } | null
  createdAt?: string
  visibility?: 'LISTED' | 'UNLISTED'
  _count?: { products: number; subcategories?: number }
}

const categories = ref<Category[]>([])
const loading = ref(true)
const searchQuery = ref(typeof route.query.search === 'string' ? route.query.search : '')
const sortBy = ref<'createdAt' | 'title' | 'slug' | 'products'>(
  ['createdAt', 'title', 'slug', 'products'].includes(route.query.sortBy as string)
    ? (route.query.sortBy as 'createdAt' | 'title' | 'slug' | 'products')
    : 'createdAt'
)
const sortOrder = ref<'asc' | 'desc'>(route.query.sortOrder === 'asc' ? 'asc' : 'desc')
const currentPage = ref(Number(route.query.page) || 1)
const itemsPerPage = 25
const showDeleteModal = ref(false)
const categoryToDelete = ref<Category | null>(null)
const activeParentId = ref<string | null>(null)
const deleteError = ref<string | null>(null)

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

const categoryDisplayTitle = (category: Category): string => category.displayTitle || category.title

const categoryMatchesQuery = (category: Category, query: string): boolean => {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true
  return [category.title, category.slug, category.displayTitle || '']
    .some((value) => value.toLowerCase().includes(normalizedQuery))
}

const compareCategories = (a: Category, b: Category): number => {
  const dir = sortOrder.value === 'asc' ? 1 : -1

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
}

const sortedCategories = computed(() => [...categories.value].sort(compareCategories))

const topLevelCategories = computed(() => sortedCategories.value.filter((category) => !category.parentId))

const subcategoriesByParentId = computed<Map<string, Category[]>>(() => {
  const map = new Map<string, Category[]>()

  for (const category of sortedCategories.value) {
    if (!category.parentId) continue
    const list = map.get(category.parentId) || []
    list.push(category)
    map.set(category.parentId, list)
  }

  return map
})

const filteredParentCategories = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return topLevelCategories.value

  return topLevelCategories.value.filter((parent) => {
    if (categoryMatchesQuery(parent, query)) return true
    const children = subcategoriesByParentId.value.get(parent.id) || []
    return children.some((child) => categoryMatchesQuery(child, query))
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredParentCategories.value.length / itemsPerPage)))

const paginatedParentCategories = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredParentCategories.value.slice(start, start + itemsPerPage)
})

const activeParent = computed(() => {
  if (!activeParentId.value) return null
  return topLevelCategories.value.find((category) => category.id === activeParentId.value) || null
})

const activeSubcategories = computed(() => {
  if (!activeParent.value) return []
  const children = subcategoriesByParentId.value.get(activeParent.value.id) || []
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) return children
  if (categoryMatchesQuery(activeParent.value, query)) return children

  return children.filter((child) => categoryMatchesQuery(child, query))
})

async function fetchCategories() {
  loading.value = true
  try {
    const data = await $fetch('/api/admin/categories', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
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
    const deletedId = categoryToDelete.value.id
    await $fetch(`/api/admin/categories/${deletedId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    categories.value = categories.value.filter((c) => c.id !== deletedId)
    if (activeParentId.value === deletedId) {
      activeParentId.value = null
    }
    categoryToDelete.value = null
    showDeleteModal.value = false
    deleteError.value = null
  } catch (error: any) {
    console.error('Failed to delete category:', error)
    const msg = error?.data?.statusMessage || error?.response?.data?.statusMessage
    if (msg === 'HAS_PRODUCTS') {
      deleteError.value = t('admin.pages.categories.index.deleteModal.errorHasProducts')
    } else if (msg === 'HAS_CHILDREN') {
      deleteError.value = t('admin.pages.categories.index.deleteModal.errorHasChildren')
    } else {
      deleteError.value = t('admin.pages.categories.index.deleteModal.error')
    }
  }
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

function getCategoryUrl(slug: string): string {
  const tenantSlugValue = tenantSlug.value
  if (!tenantSlugValue) return '/'

  const { protocol, host } = useRequestOrigin()
  const platformBaseDomain = usePlatformBaseDomain()
  const tenantHost = toTenantHost(host, tenantSlugValue, { platformBaseDomain })
  return `${protocol}://${tenantHost}/category/${slug}`
}

async function copyLink(path: string) {
  const tenantSlugValue = tenantSlug.value
  if (!tenantSlugValue) return

  const { protocol, host } = useRequestOrigin()
  const platformBaseDomain = usePlatformBaseDomain()
  const tenantHost = toTenantHost(host, tenantSlugValue, { platformBaseDomain })
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

function syncToUrl() {
  router.replace({
    query: {
      ...route.query,
      search: searchQuery.value || undefined,
      sortBy: sortBy.value === 'createdAt' ? undefined : sortBy.value,
      sortOrder: sortOrder.value === 'desc' ? undefined : sortOrder.value,
      page: currentPage.value > 1 ? String(currentPage.value) : undefined
    }
  })
}

watch(searchQuery, () => {
  currentPage.value = 1
  syncToUrl()
})

watch([sortBy, sortOrder], () => {
  currentPage.value = 1
  syncToUrl()
})

watch(currentPage, () => {
  syncToUrl()
})

watch(totalPages, (value) => {
  if (currentPage.value > value) {
    currentPage.value = value
  }
})

watch(
  paginatedParentCategories,
  (list) => {
    if (list.length === 0) {
      activeParentId.value = null
      return
    }

    const stillVisible = list.some((category) => category.id === activeParentId.value)
    if (!stillVisible) {
      activeParentId.value = list[0].id
    }
  },
  { immediate: true }
)
</script>
