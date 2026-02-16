<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">
          {{ t('admin.nav.suppliers') }}
        </h2>
        <p class="text-gray-600 mt-1">
          {{ t('admin.pages.suppliers.index.subtitle') }}
        </p>
      </div>
      <NuxtLink
        to="/admin/suppliers/create"
        class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors flex items-center space-x-2"
      >
        <Icon name="lucide:plus" class="w-5 h-5" />
        <span>{{ t('admin.pages.suppliers.index.addSupplier') }}</span>
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('admin.pages.suppliers.index.filters.searchLabel') }}</label>
          <BaseInput
            v-model="searchQuery"
            type="text"
            :placeholder="t('admin.pages.suppliers.index.filters.searchPlaceholder')"
          />
        </div>
        <div class="flex items-end">
          <p class="text-sm text-gray-500">
            {{ t('admin.pages.suppliers.index.filters.sortHint') }}
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
        {{ t('admin.pages.suppliers.index.loading') }}
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredSuppliers.length === 0"
      class="ui-card p-12 text-center"
    >
      <Icon name="lucide:users" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        {{ t('admin.pages.suppliers.index.empty.title') }}
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ t('admin.pages.suppliers.index.empty.hint') }}
      </p>
      <div class="mt-6">
        <NuxtLink
          to="/admin/suppliers/create"
          class="ui-btn ui-btn--primary ui-btn--md"
        >
          <Icon name="lucide:plus" class="w-5 h-5 mr-2" />
          {{ t('admin.pages.suppliers.index.empty.newSupplier') }}
        </NuxtLink>
      </div>
    </div>

    <!-- Suppliers Table -->
    <div
      v-else
      class="ui-card overflow-hidden"
    >
      <div class="ui-card-header bg-slate-50 flex flex-wrap items-center gap-3 justify-between">
        <div class="text-sm text-slate-700">
          {{ t('admin.pages.suppliers.index.sort.sortBy') }}
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
                {{ t('admin.pages.suppliers.index.table.name') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.suppliers.index.table.info') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.suppliers.index.table.address') }}
              </th>
              <th class="ui-th text-right">
                {{ t('admin.common.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="ui-tbody">
            <tr
              v-for="supplier in paginatedSuppliers"
              :key="supplier.id"
              class="ui-tr"
            >
              <td class="ui-td whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold uppercase">
                     {{ supplier.name.charAt(0) }}
                  </div>
                  <div class="ml-4">
                    <div class="font-medium text-slate-900">
                      {{ supplier.name }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div class="flex flex-col text-sm text-slate-600">
                   <div v-if="supplier.email" class="flex items-center gap-1">
                     <Icon name="lucide:mail" class="w-3 h-3" /> {{ supplier.email }}
                   </div>
                   <div v-if="supplier.phone" class="flex items-center gap-1 mt-1">
                     <Icon name="lucide:phone" class="w-3 h-3" /> {{ supplier.phone }}
                   </div>
                   <span v-if="!supplier.email && !supplier.phone">—</span>
                </div>
              </td>
              <td class="ui-td whitespace-nowrap text-sm text-slate-600">
                 {{ supplier.address || '—' }}
              </td>
              <td class="ui-td whitespace-nowrap text-right">
                <div class="flex items-center justify-end space-x-3">
                  <NuxtLink
                    :to="`/admin/suppliers/${supplier.id}`"
                    class="ui-btn ui-btn--secondary ui-btn--sm"
                  >
                    <Icon name="lucide:pencil" class="w-4 h-4 mr-1" />
                    <span>{{ t('admin.common.edit') }}</span>
                  </NuxtLink>
                  <button
                    class="ui-btn ui-btn--danger ui-btn--sm"
                    @click="confirmDelete(supplier)"
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
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            :disabled="currentPage === 1"
            class="ui-btn ui-btn--secondary ui-btn--md"
            @click="currentPage--"
          >
            {{ t('admin.common.previous') }}
          </button>
          <button
            :disabled="currentPage === totalPages"
            class="ui-btn ui-btn--secondary ui-btn--md ml-3"
            @click="currentPage++"
          >
            {{ t('admin.common.next') }}
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-slate-700">
              {{ t('admin.pages.suppliers.index.pagination.showing', {
                from: (currentPage - 1) * itemsPerPage + 1,
                to: Math.min(currentPage * itemsPerPage, filteredSuppliers.length),
                total: filteredSuppliers.length
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
      :title="t('admin.pages.suppliers.index.deleteModal.title')"
      :message="deleteMessage"
      :confirm-text="t('admin.common.delete')"
      :cancel-text="t('admin.common.cancel')"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseInput from '~/components/ui/BaseInput.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.suppliers.index.title'
})

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })

interface Supplier {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
}

const suppliers = ref<Supplier[]>([])
const loading = ref(true)
const searchQuery = ref('')
const sortBy = ref<'name'>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const itemsPerPage = 10
const showDeleteModal = ref(false)
const supplierToDelete = ref<Supplier | null>(null)

const sortOptions = [
  { key: 'name', labelKey: 'admin.pages.suppliers.index.sort.name' }
] as const

const deleteMessage = computed(() => {
  if (supplierToDelete.value?.name) {
    return t('admin.pages.suppliers.index.deleteModal.messageWithName', { name: supplierToDelete.value.name })
  }
  return t('admin.pages.suppliers.index.deleteModal.message')
})

const sortedSuppliers = computed(() => {
  const data = [...suppliers.value]
  const dir = sortOrder.value === 'asc' ? 1 : -1

  return data.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name) * dir
      default:
        return 0
    }
  })
})

const filteredSuppliers = computed(() => {
  let filtered = sortedSuppliers.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter((s) =>
      s.name.toLowerCase().includes(query) ||
      (s.email && s.email.toLowerCase().includes(query)) ||
      (s.phone && s.phone.includes(query))
    )
  }

  return filtered
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredSuppliers.value.length / itemsPerPage)))

const paginatedSuppliers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredSuppliers.value.slice(start, end)
})

async function fetchSuppliers() {
  loading.value = true
  try {
    const data = await $fetch<Supplier[]>('/api/admin/suppliers', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    suppliers.value = data
  } catch (error) {
    console.error('Failed to fetch suppliers:', error)
  } finally {
    loading.value = false
  }
}

function confirmDelete(supplier: Supplier) {
  supplierToDelete.value = supplier
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!supplierToDelete.value) return

  try {
    await $fetch(`/api/admin/suppliers/${supplierToDelete.value.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    suppliers.value = suppliers.value.filter((s) => s.id !== supplierToDelete.value?.id)
    supplierToDelete.value = null
  } catch (error) {
    console.error('Failed to delete supplier:', error)
    alert(t('admin.pages.suppliers.index.deleteModal.error'))
  }
}

function setSort(field: typeof sortOptions[number]['key']) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'asc'
  }
}

watch([searchQuery], () => {
  currentPage.value = 1
})

onMounted(() => {
  fetchSuppliers()
})
</script>
