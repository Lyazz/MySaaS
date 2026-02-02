<template>
  <div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">
          Sales
        </h2>
        <p class="text-gray-600 mt-1">
          Completed orders (DELIVERED)
        </p>
      </div>
    </div>

    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <BaseInput
            v-model="searchQuery"
            placeholder="Search by customer name, phone, or order id..."
          />
        </div>
        <div>
          <DateFilter
            v-model:startDate="startDate"
            v-model:endDate="endDate"
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
        Loading sales...
      </p>
    </div>

    <div
      v-else-if="sales.length === 0"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <Icon name="lucide:badge-dollar-sign" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        No sales found
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ searchQuery ? 'Try adjusting your search' : 'Delivered orders will appear here' }}
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
                Sale ID
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
                Completed
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="sale in sales"
              :key="sale.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  #{{ sale.id.substring(0, 8) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">
                  {{ sale.customerName }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">
                  {{ sale.customerPhone }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ formatCurrency(sale.totalAmount) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(sale.updatedAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end">
                  <NuxtLink
                    :to="sale.type === 'POS' ? `/admin/sales/${sale.id}` : `/admin/orders/${sale.id}`"
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
import DateFilter from '~/components/ui/DateFilter.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Sales'
})

const authStore = useAuthStore()
const route = useRoute()
const { format: formatCurrency } = useCurrency()

interface Sale {
  id: string
  status: string
  type?: 'ORDER' | 'POS'
  totalAmount: number
  customerName: string
  customerPhone: string
  createdAt: string
  updatedAt: string
}

const loading = ref(true)
const sales = ref<Sale[]>([])
const searchQuery = ref(typeof route.query.search === 'string' ? route.query.search : '')
const startDate = ref('')
const endDate = ref('')

async function fetchSales() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchQuery.value) params.append('search', searchQuery.value)
    if (startDate.value) params.append('startDate', startDate.value)
    if (endDate.value) params.append('endDate', endDate.value)

    const queryString = params.toString()
    const url = `/api/admin/sales${queryString ? '?' + queryString : ''}`

    const data = await $fetch<Sale[]>(url, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    sales.value = data
  } catch (error) {
    console.error('Failed to fetch sales:', error)
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
  fetchSales()
})

watch([searchQuery, startDate, endDate], () => {
  fetchSales()
})
</script>
