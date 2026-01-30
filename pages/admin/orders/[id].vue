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
            Orders
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6 text-gray-400" />
            <span class="ml-1 text-gray-500">Order #{{ orderId.substring(0, 8) }}</span>
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
        Loading order...
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
            Order Information
          </h2>
          <AdminOrderStatusBadge :status="order.status" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm font-medium text-gray-500">
              Order ID
            </p>
            <p class="mt-1 text-sm text-gray-900">
              {{ order.id }}
            </p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">
              Order Date
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
          Customer Information
        </h2>
        <div class="space-y-3">
          <div>
            <p class="text-sm font-medium text-gray-500">
              Name
            </p>
            <p class="mt-1 text-sm text-gray-900">
              {{ order.customerName }}
            </p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">
              Phone
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
              Delivery Address
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
          Order Items
        </h2>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Price
                </th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Quantity
                </th>
                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr
                v-for="item in order.items"
                :key="item.id"
              >
                <td class="px-4 py-3 text-sm text-gray-900">
                  {{ item.product?.title || 'Product' }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {{ Number(item.price).toFixed(2) }} {{ currencyCode }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {{ item.quantity }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900 text-right">
                  {{ (Number(item.price) * item.quantity).toFixed(2) }} {{ currencyCode }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td
                  colspan="3"
                  class="px-4 py-3 text-sm font-semibold text-gray-900 text-right"
                >
                  Total
                </td>
                <td class="px-4 py-3 text-sm font-semibold text-teal-600 text-right">
                  {{ Number(order.totalAmount).toFixed(2) }} {{ currencyCode }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Status Update -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          Update Order Status
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
              Status
            </label>
            <BaseSelect
              id="status"
              v-model="newStatus"
            >
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
              Back to Orders
            </NuxtLink>
            <button
              type="submit"
              :disabled="updating || newStatus === order.status"
              class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ updating ? 'Updating...' : 'Update Status' }}
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
        Order not found
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        This order may not exist or you don't have permission to view it.
      </p>
      <div class="mt-6">
        <NuxtLink
          to="/admin/orders"
          class="text-teal-600 hover:text-teal-800"
        >
          Back to Orders
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
  title: 'Order Detail'
})

const authStore = useAuthStore()
const storeSettings = useState<any>('storeSettings')
const currencyCode = computed(() => storeSettings.value?.currencyCode || 'DZD')
const route = useRoute()
const orderId = route.params.id as string

interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
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
    successMessage.value = 'Order status updated successfully!'
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error: any) {
    console.error('Failed to update order:', error)
    errorMessage.value = error.data?.statusMessage || 'Failed to update order status'
  } finally {
    updating.value = false
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
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
