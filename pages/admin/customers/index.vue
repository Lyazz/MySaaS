<template>
  <div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">
          Customers
        </h2>
        <p class="text-gray-600 mt-1">
          Derived from orders history
        </p>
      </div>
    </div>

    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <BaseInput
            v-model="searchQuery"
            placeholder="Search by customer name or phone..."
          />
        </div>
      </div>
    </div>

    <div
      v-if="loading"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      <p class="mt-2 text-gray-600">
        Loading customers...
      </p>
    </div>

    <div
      v-else-if="customers.length === 0"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <Icon name="lucide:users" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        No customers found
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ searchQuery ? 'Try adjusting your search' : 'Customers will appear here once orders are placed' }}
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
                Customer
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Orders
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Spent
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Order
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="c in customers"
              :key="c.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ c.name }}
                </div>
                <div
                  v-if="c.address"
                  class="text-xs text-gray-500 truncate max-w-[28rem]"
                >
                  {{ c.address }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">
                  {{ c.phone }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ c.ordersCount }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ formatCurrency(c.totalSpent) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(c.lastOrderAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end">
                  <NuxtLink
                    :to="`/admin/customers/${encodeURIComponent(c.id)}`"
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
import BaseInput from '~/components/ui/BaseInput.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Customers'
})

const authStore = useAuthStore()
const route = useRoute()
const { format: formatCurrency } = useCurrency()

interface CustomerSummary {
  id: string
  phone: string
  name: string
  address: string | null
  ordersCount: number
  totalSpent: number
  lastOrderAt: string | null
  lastOrderId: string | null
}

const loading = ref(true)
const customers = ref<CustomerSummary[]>([])
const searchQuery = ref(typeof route.query.search === 'string' ? route.query.search : '')

async function fetchCustomers() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchQuery.value) params.append('search', searchQuery.value)

    const queryString = params.toString()
    const url = `/api/admin/customers${queryString ? '?' + queryString : ''}`

    const data = await $fetch<CustomerSummary[]>(url, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    customers.value = data
  } catch (error) {
    console.error('Failed to fetch customers:', error)
  } finally {
    loading.value = false
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

onMounted(() => {
  fetchCustomers()
})

watch([searchQuery], () => {
  fetchCustomers()
})
</script>
