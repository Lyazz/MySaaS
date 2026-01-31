<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">
          Suppliers
        </h2>
        <p class="text-gray-600 mt-1">
          Manage your suppliers
        </p>
      </div>
      <NuxtLink
        to="/admin/suppliers/create"
        class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors flex items-center space-x-2"
      >
        <Icon name="lucide:plus" class="w-5 h-5" />
        <span>Add Supplier</span>
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <BaseInput
            v-model="searchQuery"
            type="text"
            placeholder="Search suppliers..."
          />
        </div>
        <div class="flex items-end">
          <p class="text-sm text-gray-500">
             Sort by name, email or phone using the table headers.
          </p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      <p class="mt-2 text-gray-600">
        Loading suppliers...
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredSuppliers.length === 0"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <Icon name="lucide:users" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        No suppliers
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        Get started by creating a new supplier.
      </p>
      <div class="mt-6">
        <NuxtLink
          to="/admin/suppliers/create"
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
        >
          <Icon name="lucide:plus" class="w-5 h-5 mr-2" />
          New Supplier
        </NuxtLink>
      </div>
    </div>

    <!-- Suppliers Table -->
    <div
      v-else
      class="bg-white rounded-lg shadow overflow-hidden"
    >
      <div class="px-4 py-3 bg-gray-50 flex flex-wrap items-center gap-3 justify-between">
        <div class="text-sm text-gray-700">
          Sort by:
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in sortOptions"
            :key="option.key"
            :class="[
              'inline-flex items-center px-3 py-1 text-sm font-medium border rounded-md transition-colors',
              sortBy === option.key
                ? 'bg-teal-50 border-teal-500 text-teal-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
            ]"
            @click="setSort(option.key)"
          >
            <span>{{ option.label }}</span>
            <Icon
              v-if="sortBy === option.key"
              :name="sortOrder === 'asc' ? 'lucide:chevron-up' : 'lucide:chevron-down'"
              class="w-4 h-4 ml-2"
            />
          </button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Info
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="supplier in paginatedSuppliers"
              :key="supplier.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold uppercase">
                     {{ supplier.name.charAt(0) }}
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">
                      {{ supplier.name }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex flex-col text-sm text-gray-500">
                   <div v-if="supplier.email" class="flex items-center gap-1">
                     <Icon name="lucide:mail" class="w-3 h-3" /> {{ supplier.email }}
                   </div>
                   <div v-if="supplier.phone" class="flex items-center gap-1 mt-1">
                     <Icon name="lucide:phone" class="w-3 h-3" /> {{ supplier.phone }}
                   </div>
                   <span v-if="!supplier.email && !supplier.phone">—</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                 {{ supplier.address || '—' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-3">
                  <NuxtLink
                    :to="`/admin/suppliers/${supplier.id}`"
                    class="inline-flex items-center text-teal-600 hover:text-teal-900 transition-colors"
                  >
                    <Icon name="lucide:pencil" class="w-4 h-4 mr-1" />
                    <span>Edit</span>
                  </NuxtLink>
                  <button
                    class="inline-flex items-center text-red-600 hover:text-red-900 transition-colors"
                    @click="confirmDelete(supplier)"
                  >
                    <Icon name="lucide:trash" class="w-4 h-4 mr-1" />
                    <span>Delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            :disabled="currentPage === 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            @click="currentPage--"
          >
            Previous
          </button>
          <button
            :disabled="currentPage === totalPages"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            @click="currentPage++"
          >
            Next
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              Showing
              <span class="font-medium">{{ (currentPage - 1) * itemsPerPage + 1 }}</span>
              to
              <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, filteredSuppliers.length) }}</span>
              of
              <span class="font-medium">{{ filteredSuppliers.length }}</span>
              results
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                :disabled="currentPage === 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                @click="currentPage--"
              >
                Previous
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
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <AdminConfirmModal
      v-model="showDeleteModal"
      title="Delete Supplier"
      :message="deleteMessage"
      confirm-text="Delete"
      cancel-text="Cancel"
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
  title: 'Suppliers'
})

const authStore = useAuthStore()

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
  { key: 'name', label: 'Name' }
] as const

const deleteMessage = computed(() => {
  if (supplierToDelete.value?.name) {
    return `Are you sure you want to delete supplier \"${supplierToDelete.value.name}\"?`
  }
  return 'Are you sure you want to delete this supplier?'
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
    alert('Failed to delete supplier. Please try again.')
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
