<template>
  <div class="max-w-7xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <NuxtLink
          to="/admin/customers"
          class="inline-flex items-center text-sm text-slate-500 hover:text-slate-700"
        >
          <Icon name="lucide:arrow-left" class="w-4 h-4 mr-1" />
          Customers
        </NuxtLink>
        <h2 class="text-2xl font-bold text-gray-800 mt-2">
          {{ summary?.name || 'Customer' }}
        </h2>
        <p class="text-gray-600 mt-1">
          {{ summary?.phone || '' }}
          <span v-if="summary?.address"> · {{ summary?.address }}</span>
        </p>
      </div>

      <div class="flex gap-3">
        <div class="bg-white rounded-lg shadow px-4 py-3">
          <div class="text-xs text-gray-500">
            Orders
          </div>
          <div class="text-lg font-semibold text-gray-900">
            {{ orders.length }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow px-4 py-3">
          <div class="text-xs text-gray-500">
            Total spent
          </div>
          <div class="text-lg font-semibold text-gray-900">
            {{ formatCurrency(totalSpent) }}
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="loading"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      <p class="mt-2 text-gray-600">
        Loading customer...
      </p>
    </div>

    <div
      v-else-if="orders.length === 0"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <Icon name="lucide:clipboard-list" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        No orders found
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        This customer has no orders yet.
      </p>
    </div>

    <div
      v-else
      class="bg-white rounded-lg shadow overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
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
              v-for="o in orders"
              :key="o.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  #{{ o.id.substring(0, 8) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ formatCurrency(o.totalAmount) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <AdminOrderStatusBadge :status="o.status" />
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(o.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end">
                  <NuxtLink
                    :to="`/admin/orders/${o.id}`"
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

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Customer'
})

const authStore = useAuthStore()
const route = useRoute()
const { format: formatCurrency } = useCurrency()

const customerId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))

interface CustomerOrder {
  id: string
  status: string
  totalAmount: number
  customerName: string
  customerPhone: string
  customerAddress: string | null
  createdAt: string
  updatedAt: string
}

interface CustomerResponse {
  summary: { id: string; phone: string; name: string; address: string | null; lastOrderAt: string | null; lastOrderId: string | null } | null
  orders: CustomerOrder[]
}

const loading = ref(true)
const summary = ref<CustomerResponse['summary']>(null)
const orders = ref<CustomerOrder[]>([])

const totalSpent = computed(() => orders.value.reduce((acc, o) => acc + (o.totalAmount || 0), 0))

async function fetchCustomer() {
  loading.value = true
  try {
    const data = await $fetch<CustomerResponse>(`/api/admin/customers/${encodeURIComponent(customerId.value)}`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    summary.value = data.summary
    orders.value = data.orders ?? []
  } catch (error) {
    console.error('Failed to fetch customer:', error)
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

onMounted(() => {
  fetchCustomer()
})

watch([customerId], () => {
  fetchCustomer()
})
</script>
