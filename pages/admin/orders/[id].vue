<template>
  <div class="max-w-4xl mx-auto">
    <!-- Breadcrumb -->
    <nav
      class="flex mb-6"
      aria-label="Breadcrumb"
    >
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink
            to="/admin/orders"
            class="text-gray-700 hover:text-teal-600"
          >
            {{ t('admin.nav.orders') }}
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6 text-gray-400" />
            <span class="ml-1 text-gray-500">{{ t('admin.pages.orders.detail.breadcrumb', { id: orderId.substring(0, 8) }) }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      <p class="mt-2 text-gray-600">
        {{ t('admin.pages.orders.detail.loading') }}
      </p>
    </div>

    <!-- Order Detail -->
    <div
      v-else-if="order"
      class="space-y-6"
    >
      <!-- Order Info Card -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ t('admin.pages.orders.detail.sections.orderInfo') }}
          </h2>
          <AdminOrderStatusBadge :status="order.status" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm font-medium text-gray-500">
              {{ t('admin.pages.orders.detail.fields.orderId') }}
            </p>
            <p class="mt-1 text-sm text-gray-900">
              {{ order.id }}
            </p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">
              {{ t('admin.pages.orders.detail.fields.orderDate') }}
            </p>
            <p class="mt-1 text-sm text-gray-900">
              {{ formatDate(order.createdAt) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Customer Info Card -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          {{ t('admin.pages.orders.detail.sections.customerInfo') }}
        </h2>
        <div class="space-y-3">
          <div>
            <p class="text-sm font-medium text-gray-500">
              {{ t('admin.pages.orders.detail.fields.customerName') }}
            </p>
            <p class="mt-1 text-sm text-gray-900">
              {{ order.customerName }}
            </p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">
              {{ t('admin.pages.orders.detail.fields.customerPhone') }}
            </p>
            <p class="mt-1 text-sm text-gray-900">
              <a
                :href="`tel:${order.customerPhone}`"
                class="text-teal-600 hover:text-teal-800"
              >
                {{ order.customerPhone }}
              </a>
            </p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">
              {{ t('admin.pages.orders.detail.fields.deliveryAddress') }}
            </p>
            <p class="mt-1 text-sm text-gray-900">
              {{ order.customerAddress }}
            </p>
          </div>
        </div>
      </div>

      <!-- Order Items -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          {{ t('admin.pages.orders.detail.sections.orderItems') }}
        </h2>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('admin.pages.orders.detail.itemsTable.product') }}
                </th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('admin.pages.orders.detail.itemsTable.price') }}
                </th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('admin.pages.orders.detail.itemsTable.quantity') }}
                </th>
                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  {{ t('admin.pages.orders.detail.itemsTable.subtotal') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr
                v-for="item in order.items"
                :key="item.id"
              >
                <td class="px-4 py-3 text-sm text-gray-900">
                  {{ item.product?.title || t('admin.pages.orders.detail.itemsTable.fallbackProduct') }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {{ formatCurrency(item.price) }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {{ item.quantity }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900 text-right">
                  {{ formatCurrency(item.lineTotal ?? (Number(item.price) * item.quantity)) }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td
                  colspan="3"
                  class="px-4 py-3 text-sm font-semibold text-gray-900 text-right"
                >
                  {{ t('admin.pages.orders.detail.itemsTable.total') }}
                </td>
                <td class="px-4 py-3 text-sm font-semibold text-teal-600 text-right">
                  {{ formatCurrency(order.totalAmount) }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Status Update -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          {{ t('admin.pages.orders.detail.statusUpdate.title') }}
        </h2>
        <form
          class="space-y-4"
          @submit.prevent="handleStatusUpdate"
        >
          <div>
            <label
              for="status"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              {{ t('admin.pages.orders.detail.statusUpdate.statusLabel') }}
            </label>
            <BaseSelect
              id="status"
              v-model="newStatus"
            >
              <option
                v-for="s in selectableStatuses"
                :key="s"
                :value="s"
              >
                {{ orderStatusLabel(s) }}
              </option>
            </BaseSelect>
          </div>

          <div
            v-if="errorMessage"
            class="p-4 bg-red-50 border border-red-200 rounded-md"
          >
            <p class="text-sm text-red-800">
              {{ errorMessage }}
            </p>
          </div>

          <div
            v-if="successMessage"
            class="p-4 bg-green-50 border border-green-200 rounded-md"
          >
            <p class="text-sm text-green-800">
              {{ successMessage }}
            </p>
          </div>

          <div class="flex justify-end space-x-3">
            <NuxtLink
              to="/admin/orders"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {{ t('admin.pages.orders.detail.backToOrders') }}
            </NuxtLink>
            <button
              type="submit"
              :disabled="updating || newStatus === order.status"
              class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ updating ? t('admin.common.updating') : t('admin.pages.orders.detail.statusUpdate.submit') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <Icon name="lucide:alert-circle" class="mx-auto h-12 w-12 text-red-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        {{ t('admin.pages.orders.detail.notFound.title') }}
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ t('admin.pages.orders.detail.notFound.hint') }}
      </p>
      <div class="mt-6">
        <NuxtLink
          to="/admin/orders"
          class="text-teal-600 hover:text-teal-800"
        >
          {{ t('admin.pages.orders.detail.backToOrders') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseSelect from '~/components/ui/BaseSelect.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.orders.detail.metaTitle'
})

const authStore = useAuthStore()
const storeSettings = useState<any>('storeSettings')
const { format: formatCurrency } = useCurrency()
const route = useRoute()
const orderId = route.params.id as string
const { t, locale } = useI18n({ useScope: 'global' })

interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
  lineTotal?: number
  product?: {
    title: string
  }
}

interface Order {
  id: string
  customerName: string
  customerPhone: string
  customerAddress: string
  totalAmount: number
  status: string
  createdAt: string
  items: OrderItem[]
}

const loading = ref(true)
const updating = ref(false)
const order = ref<Order | null>(null)
const newStatus = ref('')
const errorMessage = ref('')
const successMessage = ref('')

const statusLabelKeyByCode: Record<string, string> = {
  PENDING: 'admin.orderStatus.pending',
  CONFIRMED: 'admin.orderStatus.confirmed',
  SHIPPED: 'admin.orderStatus.shipped',
  DELIVERED: 'admin.orderStatus.delivered',
  CANCELLED: 'admin.orderStatus.cancelled',
  RETURNED: 'admin.orderStatus.returned'
}

function orderStatusLabel(code: string) {
  const key = statusLabelKeyByCode[code]
  return key ? t(key) : code
}

const selectableStatuses = computed(() => {
  const current = order.value?.status
  if (!current) return []

  const next = (() => {
    if (current === 'PENDING') return ['CONFIRMED', 'CANCELLED']
    if (current === 'CONFIRMED') return ['SHIPPED', 'CANCELLED']
    if (current === 'SHIPPED') return ['DELIVERED', 'RETURNED']
    if (current === 'DELIVERED') return ['RETURNED']
    return []
  })()

  return Array.from(new Set([current, ...next]))
})

async function fetchOrder() {
  loading.value = true
  try {
    const data = await $fetch<Order>(`/api/admin/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    
    order.value = data
    newStatus.value = data.status
  } catch (error: any) {
    console.error('Failed to fetch order:', error)
    order.value = null
  } finally {
    loading.value = false
  }
}

async function handleStatusUpdate() {
  if (!order.value) return
  
  errorMessage.value = ''
  successMessage.value = ''
  updating.value = true

  try {
    const updated = await $fetch<Order>(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {
        status: newStatus.value
      }
    })

    order.value = updated
    successMessage.value = t('admin.pages.orders.detail.statusUpdate.success')
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error: any) {
    console.error('Failed to update order:', error)
    errorMessage.value = error.data?.statusMessage || t('admin.pages.orders.detail.statusUpdate.errors.updateFailed')
  } finally {
    updating.value = false
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const intlLocale = locale.value === 'fr' ? 'fr-FR' : locale.value === 'ar' ? 'ar-DZ' : 'en-US'
  return date.toLocaleDateString(intlLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  fetchOrder()
})
</script>
