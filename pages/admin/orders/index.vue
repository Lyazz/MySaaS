<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">
          Orders
        </h2>
        <p class="text-gray-600 mt-1">
          Manage customer orders
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <BaseInput
            v-model="searchQuery"
            placeholder="Search by customer name or phone..."
          />
        </div>
        <div>
          <BaseSelect
            v-model="selectedStatus"
            label="Status Filter"
          >
            <option value="">
              All Orders
            </option>
            <option value="PENDING">
              Pending
            </option>
            <option value="CONFIRMED">
              Confirmed
            </option>
            <option value="SHIPPED">
              Shipped
            </option>
            <option value="DELIVERED">
              Delivered
            </option>
            <option value="CANCELLED">
              Cancelled
            </option>
          </BaseSelect>
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
        Loading orders...
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="orders.length === 0"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <Icon name="lucide:clipboard-list" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        No orders found
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ searchQuery || selectedStatus ? 'Try adjusting your filters' : 'Customer orders will appear here' }}
      </p>
    </div>

    <!-- Orders Table -->
    <div
      v-else
      class="bg-white rounded-lg shadow overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="order in orders"
              :key="order.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  #{{ order.id.substring(0, 8) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">
                  {{ order.customerName }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">
                  {{ order.customerPhone }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ Number(order.totalAmount).toFixed(2) }} {{ currencyCode }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <AdminOrderStatusBadge :status="order.status" />
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(order.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end">
                  <NuxtLink
                    :to="`/admin/orders/${order.id}`"
                    class="inline-flex items-center text-teal-600 hover:text-teal-900 transition-colors"
                  >
                    <Icon name="lucide:eye" class="w-4 h-4 mr-1" />
                    <span>View</span>
                  </NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseSelect from '~/components/ui/BaseSelect.vue'
import BaseInput from '~/components/ui/BaseInput.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Orders'
})

const authStore = useAuthStore()
const storeSettings = useState<any>('storeSettings')
const currencyCode = computed(() => storeSettings.value?.currencyCode || 'DZD')

interface Order {
  id: string
  customerName: string
  customerPhone: string
  customerAddress: string
  totalAmount: number
  status: string
  createdAt: string
  items?: any[]
}

const loading = ref(true)
const orders = ref<Order[]>([])
const searchQuery = ref('')
const selectedStatus = ref('')

async function fetchOrders() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (selectedStatus.value) params.append('status', selectedStatus.value)
    if (searchQuery.value) params.append('search', searchQuery.value)
    
    const queryString = params.toString()
    const url = `/api/admin/orders${queryString ? '?' + queryString : ''}`
    
    const data = await $fetch<Order[]>(url, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    
    orders.value = data
  } catch (error) {
    console.error('Failed to fetch orders:', error)
  } finally {
    loading.value = false
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Fetch orders on mount and when filters change
onMounted(() => {
  fetchOrders()
})

watch([searchQuery, selectedStatus], () => {
  fetchOrders()
})
</script>
