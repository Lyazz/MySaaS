<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">
          {{ t('admin.nav.orders') }}
        </h2>
        <p class="text-gray-600 mt-1">
          {{ t('admin.pages.orders.index.subtitle') }}
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('admin.pages.orders.index.filters.searchLabel') }}</label>
          <BaseInput
            v-model="searchQuery"
            :placeholder="t('admin.pages.orders.index.filters.searchPlaceholder')"
          />
        </div>
        <div>
          <DateFilter
            v-model:startDate="startDate"
            v-model:endDate="endDate"
          />
        </div>
        <div>
          <BaseSelect
            v-model="selectedStatus"
            :label="t('admin.pages.orders.index.filters.statusLabel')"
          >
            <option value="">
              {{ t('admin.pages.orders.index.filters.allOrders') }}
            </option>
            <option value="PENDING">
              {{ t('admin.orderStatus.pending') }}
            </option>
            <option value="CONFIRMED">
              {{ t('admin.orderStatus.confirmed') }}
            </option>
            <option value="SHIPPED">
              {{ t('admin.orderStatus.shipped') }}
            </option>
            <option value="DELIVERED">
              {{ t('admin.orderStatus.delivered') }}
            </option>
            <option value="CANCELLED">
              {{ t('admin.orderStatus.cancelled') }}
            </option>
            <option value="RETURNED">
              {{ t('admin.orderStatus.returned') }}
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
        {{ t('admin.pages.orders.index.loading') }}
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="orders.length === 0"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <Icon name="lucide:clipboard-list" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        {{ t('admin.pages.orders.index.empty.title') }}
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ emptyHint }}
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
                {{ t('admin.pages.orders.index.table.orderId') }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('admin.pages.orders.index.table.customer') }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('admin.pages.orders.index.table.phone') }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('admin.pages.orders.index.table.total') }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('admin.pages.orders.index.table.status') }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('admin.pages.orders.index.table.date') }}
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('admin.pages.orders.index.table.actions') }}
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
                  {{ formatCurrency(order.totalAmount) }}
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
                    <span>{{ t('common.view') }}</span>
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
import DateFilter from '~/components/ui/DateFilter.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.orders.index.title'
})

const authStore = useAuthStore()
const route = useRoute()
const storeSettings = useState<any>('storeSettings')
const { format: formatCurrency } = useCurrency()
const { t, locale } = useI18n({ useScope: 'global' })

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
const searchQuery = ref(typeof route.query.search === 'string' ? route.query.search : '')
const selectedStatus = ref(typeof route.query.status === 'string' ? route.query.status : '')
const startDate = ref('')
const endDate = ref('')

const emptyHint = computed(() => {
  if (searchQuery.value || selectedStatus.value) return t('admin.pages.orders.index.empty.hintFiltered')
  return t('admin.pages.orders.index.empty.hint')
})

async function fetchOrders() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (selectedStatus.value) params.append('status', selectedStatus.value)
    if (searchQuery.value) params.append('search', searchQuery.value)
    if (startDate.value) params.append('startDate', startDate.value)
    if (endDate.value) params.append('endDate', endDate.value)
    
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
  const intlLocale = locale.value === 'fr' ? 'fr-FR' : locale.value === 'ar' ? 'ar-DZ' : 'en-US'
  return date.toLocaleDateString(intlLocale, { 
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

watch([searchQuery, selectedStatus, startDate, endDate], () => {
  fetchOrders()
})
</script>
