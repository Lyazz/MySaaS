<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">
          Purchases
        </h2>
        <p class="text-gray-600 mt-1">
          Manage your purchase orders and incoming stock
        </p>
      </div>
      <NuxtLink
        to="/admin/purchases/create"
        class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors flex items-center space-x-2"
      >
        <Icon name="lucide:plus" class="w-5 h-5" />
        <span>New Purchase</span>
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
           <BaseSelect
            v-model="selectedSupplier"
            label="Filter by Supplier"
            placeholder="All Suppliers"
          >
            <option value="">All Suppliers</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </BaseSelect>
        </div>
        <div>
          <DateFilter
            v-model:startDate="startDate"
            v-model:endDate="endDate"
          />
        </div>
        <div class="hidden">
          <p class="text-sm text-gray-500">
            View and manage your purchase history.
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
        Loading purchases...
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredOrders.length === 0"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <Icon name="lucide:shopping-bag" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        No purchases found
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        Get started by creating a new purchase order.
      </p>
      <div class="mt-6">
        <NuxtLink
          to="/admin/purchases/create"
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
        >
          <Icon name="lucide:plus" class="w-5 h-5 mr-2" />
          New Purchase
        </NuxtLink>
      </div>
    </div>

    <!-- Purchases Table -->
    <div
      v-else
      class="bg-white rounded-lg shadow overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
               <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="order in paginatedOrders"
              :key="order.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                #{{ order.id.slice(0, 8) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ order.supplier?.name || '—' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getStatusClass(order.status)">
                  {{ order.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ order.items?.length || 0 }} items
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(order.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <NuxtLink
                  :to="`/admin/purchases/${order.id}`"
                  class="text-teal-600 hover:text-teal-900 flex items-center justify-end"
                >
                  <span class="mr-1">Manage</span>
                  <Icon name="lucide:arrow-right" class="w-4 h-4" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              Showing
              <span class="font-medium">{{ (currentPage - 1) * itemsPerPage + 1 }}</span>
              to
              <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, filteredOrders.length) }}</span>
              of
              <span class="font-medium">{{ filteredOrders.length }}</span>
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
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseSelect from '~/components/ui/BaseSelect.vue'
import DateFilter from '~/components/ui/DateFilter.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Purchases'
})

type Supplier = { id: string; name: string }
type PurchaseOrder = {
  id: string
  status: string
  createdAt: string
  supplier: Supplier | null
  items: any[]
}

const authStore = useAuthStore()
const suppliers = ref<Supplier[]>([])
const orders = ref<PurchaseOrder[]>([])
const loading = ref(true)
const selectedSupplier = ref('')
const startDate = ref('')
const endDate = ref('')
const currentPage = ref(1)
const itemsPerPage = 10

// Computed
const filteredOrders = computed(() => {
  let filtered = orders.value
  if (selectedSupplier.value) {
    filtered = filtered.filter(o => o.supplier?.id === selectedSupplier.value)
  }
  return filtered
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredOrders.value.length / itemsPerPage)))

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredOrders.value.slice(start, end)
})

// Methods
const fetchSuppliers = async () => {
  suppliers.value = await $fetch<Supplier[]>('/api/admin/suppliers', {
    headers: { Authorization: `Bearer ${authStore.token}` }
  }).catch(() => [])
}

const fetchOrders = async () => {
  loading.value = true
  try {
    orders.value = await $fetch<PurchaseOrder[]>('/api/admin/purchases', {
      headers: { Authorization: `Bearer ${authStore.token}` },
      query: {
        startDate: startDate.value || undefined,
        endDate: endDate.value || undefined
      }
    })
  } catch (e: any) {
    console.error('Failed to load purchases', e)
  } finally {
    loading.value = false
  }
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString()

const getStatusClass = (status: string) => {
  const base = 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full '
  switch (status.toLowerCase()) {
    case 'completed':
    case 'received':
      return base + 'bg-green-100 text-green-800'
    case 'pending':
    case 'ordered':
      return base + 'bg-yellow-100 text-yellow-800'
    case 'cancelled':
      return base + 'bg-red-100 text-red-800'
    default:
      return base + 'bg-gray-100 text-gray-800'
  }
}

watch(selectedSupplier, () => currentPage.value = 1)
watch([startDate, endDate], () => {
    currentPage.value = 1
    fetchOrders()
})

onMounted(async () => {
  await fetchSuppliers()
  await fetchOrders()
})
</script>
