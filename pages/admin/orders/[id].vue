<template>
  <div class="max-w-5xl mx-auto">
    <AdminConfirmModal
      v-model="deleteOpen"
      :title="t('admin.confirmModal.defaults.title', 'Are you sure?')"
      :message="t('admin.pages.orders.detail.deleteConfirm', 'Delete this order? Only unconfirmed (PENDING) orders can be deleted.')"
      :confirm-text="t('common.delete', 'Delete')"
      :error="deleteError"
      @confirm="confirmDelete"
      @cancel="deleteError = null"
    />

    <DeliveryPaymentModal
      v-model="deliveryModalOpen"
      :cashboxes="cashboxes"
      :amount="order?.totalAmount ?? 0"
      :loading="updating"
      @confirm="confirmDelivered"
    />

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
      class="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      <!-- LEFT COLUMN -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Order Info Card -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ t('admin.pages.orders.detail.sections.orderInfo') }}
            </h2>
            <div class="flex items-center gap-3">
              <button
                v-if="order.status === 'PENDING'"
                type="button"
                class="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-semibold bg-red-50 text-red-700 hover:bg-red-100"
                @click="openDelete"
              >
                <Icon name="lucide:trash-2" class="w-4 h-4 mr-2" />
                {{ t('common.delete', 'Delete') }}
              </button>
              <NuxtLink
                v-if="order.status === 'DELIVERED'"
                :to="`/admin/sales/${order.id}`"
                class="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100"
              >
                <Icon name="lucide:badge-dollar-sign" class="w-4 h-4 mr-2" />
                {{ t('admin.pages.orders.detail.viewSale') }}
              </NuxtLink>
              <AdminOrderStatusBadge :status="order.status" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-medium text-gray-500">
                {{ t('admin.pages.orders.detail.fields.orderId') }}
              </p>
              <div class="mt-1 flex items-center">
                <p class="text-sm text-gray-900 mr-2">{{ order.id }}</p>
                <button @click="copyToClipboard(order.id)" class="text-gray-400 hover:text-teal-600 transition-colors" title="Copy ID">
                  <Icon name="lucide:copy" class="w-4 h-4" />
                </button>
              </div>
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

        <!-- Order Items -->
        <div class="ui-card p-6">
          <h2 class="text-lg font-semibold text-slate-900 mb-4">
            {{ t('admin.pages.orders.detail.sections.orderItems') }}
          </h2>
          <div class="overflow-x-auto">
            <table class="ui-table">
              <thead class="ui-thead">
                <tr>
                  <th class="ui-th">
                    {{ t('admin.pages.orders.detail.itemsTable.product') }}
                  </th>
                  <th class="ui-th">
                    {{ t('admin.pages.orders.detail.itemsTable.price') }}
                  </th>
                  <th class="ui-th">
                    {{ t('admin.pages.orders.detail.itemsTable.quantity') }}
                  </th>
                  <th class="ui-th text-right">
                    {{ t('admin.pages.orders.detail.itemsTable.subtotal') }}
                  </th>
                </tr>
              </thead>
              <tbody class="ui-tbody">
                <tr
                  v-for="item in order.items"
                  :key="item.id"
                  class="ui-tr"
                >
                  <td class="ui-td text-sm text-slate-900">
                    {{ item.product?.title || t('admin.pages.orders.detail.itemsTable.fallbackProduct') }}
                  </td>
                  <td class="ui-td text-sm text-slate-900">
                    {{ formatCurrency(item.price) }}
                  </td>
                  <td class="ui-td text-sm text-slate-900">
                    {{ item.quantity }}
                  </td>
                  <td class="ui-td text-sm text-slate-900 text-right">
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

        <!-- Internal Notes (New) -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            {{ t('admin.pages.orders.detail.sections.internalNotes', 'Internal Notes') }}
          </h2>
          <div class="space-y-3">
            <textarea
              v-model="order.internalNotes"
              rows="4"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
              :placeholder="t('admin.pages.orders.detail.fields.internalNotesPlaceholder', 'Add private remarks about this order...')"
              @blur="handleUpdateInternalNotes"
            ></textarea>
            <div class="flex justify-end h-5 items-center">
              <span v-if="savingNotes" class="text-xs text-gray-500 flex items-center">
                <div class="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-teal-600 mr-1" />
                {{ t('admin.common.saving', 'Saving...') }}
              </span>
              <span v-else-if="notesSavedMessage" class="text-xs text-green-600 flex items-center">
                <Icon name="lucide:check" class="w-3 h-3 mr-1" />
                {{ notesSavedMessage }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN -->
      <div class="space-y-6">
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
                :disabled="order.status === 'DELIVERED'"
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
              class="p-3 bg-red-50 border border-red-200 rounded-md"
            >
              <p class="text-sm text-red-800">
                {{ errorMessage }}
              </p>
            </div>

            <div
              v-if="successMessage"
              class="p-3 bg-green-50 border border-green-200 rounded-md"
            >
              <p class="text-sm text-green-800">
                {{ successMessage }}
              </p>
            </div>

            <div class="flex justify-end space-x-3 pt-2">
              <button
                type="submit"
                :disabled="updating || newStatus === order.status || order.status === 'DELIVERED'"
                class="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
              >
                {{ updating ? t('admin.common.updating') : t('admin.pages.orders.detail.statusUpdate.submit') }}
              </button>
            </div>
          </form>
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
              <div class="mt-1 flex items-center">
                <a
                  :href="`tel:${order.customerPhone}`"
                  class="text-teal-600 hover:text-teal-800 text-sm mr-2"
                >
                  {{ order.customerPhone }}
                </a>
                <button @click="copyToClipboard(order.customerPhone)" class="text-gray-400 hover:text-teal-600 transition-colors" title="Copy Phone">
                  <Icon name="lucide:copy" class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">
                {{ t('admin.pages.orders.detail.fields.deliveryAddress') }}
              </p>
              <div class="mt-1 flex items-start">
                <p class="text-sm text-gray-900 mr-2 flex-1">
                  {{ order.customerAddress || 'N/A' }}
                </p>
                <button v-if="order.customerAddress" @click="copyToClipboard(order.customerAddress)" class="text-gray-400 hover:text-teal-600 transition-colors mt-0.5" title="Copy Address">
                  <Icon name="lucide:copy" class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Contact Trace Toggle -->
          <div class="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span class="text-sm font-medium text-gray-700">{{ t('admin.pages.orders.detail.fields.callStatus', 'Call Status') }}</span>
            <div class="w-48">
              <BaseSelect
                v-model="order.callStatus"
                @change="handleUpdateCallStatus"
              >
                <option value="not_called">{{ t('admin.pages.orders.detail.fields.callStatusValues.not_called', 'Not Called') }}</option>
                <option value="called">{{ t('admin.pages.orders.detail.fields.callStatusValues.called', 'Called') }}</option>
                <option value="no_answer">{{ t('admin.pages.orders.detail.fields.callStatusValues.no_answer', 'No Answer') }}</option>
                <option value="attempt_1">{{ t('admin.pages.orders.detail.fields.callStatusValues.attempt_1', '1st Attempt') }}</option>
                <option value="attempt_2">{{ t('admin.pages.orders.detail.fields.callStatusValues.attempt_2', '2nd Attempt') }}</option>
                <option value="attempt_3">{{ t('admin.pages.orders.detail.fields.callStatusValues.attempt_3', '3rd Attempt') }}</option>
                <option value="switched_off">{{ t('admin.pages.orders.detail.fields.callStatusValues.switched_off', 'Switched Off') }}</option>
              </BaseSelect>
            </div>
            <div class="flex justify-end h-5 ml-2 items-center min-w-[3rem]">
              <span v-if="savingCallStatus" class="text-xs text-gray-500 flex items-center">
                <div class="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-teal-600 mr-1" />
              </span>
              <span v-else-if="callStatusSavedMessage" class="text-xs text-green-600 flex items-center">
                <Icon name="lucide:check" class="w-3 h-3 mr-1" />
              </span>
            </div>
          </div>
        </div>

        <!-- Security & Fraud Placeholders -->
        <div class="bg-white rounded-lg shadow p-6 border border-red-50">
          <div class="flex items-center gap-2 mb-4">
            <Icon name="lucide:shield-alert" class="w-5 h-5 text-red-500" />
            <h2 class="text-lg font-semibold text-gray-900">
              {{ t('admin.pages.orders.detail.sections.securityAndFraud', 'Security & Fraud') }}
            </h2>
          </div>
          <p class="text-xs text-gray-500 mb-3">{{ t('admin.pages.orders.detail.securityHelp', 'Advanced actions to manage risky behavior.') }}</p>
          <div class="space-y-2">
            <button
              type="button"
              class="w-full text-left px-3 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-100 transition-colors"
              @click="handleBlacklistPlaceholder('customer')"
            >
              <Icon name="lucide:user-x" class="w-4 h-4 inline mr-2 text-red-500" />
              {{ t('admin.pages.orders.detail.actions.blacklistCustomer', 'Blacklist Customer') }}
            </button>
            <button
              type="button"
              class="w-full text-left px-3 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-100 transition-colors"
              @click="handleBlacklistPlaceholder('ip')"
            >
              <Icon name="lucide:globe-lock" class="w-4 h-4 inline mr-2 text-red-500" />
              {{ t('admin.pages.orders.detail.actions.blacklistIp', 'Blacklist IP Address') }}
            </button>
            <button
              type="button"
              class="w-full text-left px-3 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-100 transition-colors"
              @click="handleBlacklistPlaceholder('phone')"
            >
              <Icon name="lucide:phone-off" class="w-4 h-4 inline mr-2 text-red-500" />
              {{ t('admin.pages.orders.detail.actions.blacklistPhone', 'Blacklist Phone Number') }}
            </button>
          </div>
        </div>

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
import DeliveryPaymentModal from '~/components/cash/DeliveryPaymentModal.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.orders.detail.metaTitle'
})

const authStore = useAuthStore()
const storeSettings = useState<any>('storeSettings')
const { format: formatCurrency } = useCurrency()
const route = useRoute()
const router = useRouter()
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
  callStatus: string
  internalNotes: string | null
  createdAt: string
  items: OrderItem[]
}

const loading = ref(true)
const updating = ref(false)
const order = ref<Order | null>(null)
const newStatus = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const deliveryModalOpen = ref(false)
const cashboxes = ref<any[]>([])

const deleteOpen = ref(false)
const deleteError = ref<string | null>(null)

const savingNotes = ref(false)
const notesSavedMessage = ref('')

const savingCallStatus = ref(false)
const callStatusSavedMessage = ref('')

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
    return []
  })()

  return Array.from(new Set([current, ...next]))
})

async function fetchOrder() {
  loading.value = true
  try {
    const data = await $fetch(`/api/admin/orders/${orderId}`, {
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

function openDelete() {
  deleteError.value = null
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!order.value) return
  if (order.value.status !== 'PENDING') return

  deleteError.value = null
  try {
    await $fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    deleteOpen.value = false
    await router.push('/admin/orders')
  } catch (error: any) {
    console.error('Failed to delete order:', error)
    deleteError.value = error?.data?.statusMessage || t('common.error', 'An error occurred. Please try again.')
  }
}

async function handleStatusUpdate() {
  if (!order.value) return
  if (newStatus.value === 'DELIVERED') {
    errorMessage.value = ''
    successMessage.value = ''

    try {
      const data = await $fetch('/api/admin/cashboxes', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
      cashboxes.value = data as any[]
    } catch (e) {
      console.error('Failed to load cashboxes:', e)
      errorMessage.value = t('admin.pages.orders.detail.statusUpdate.errors.loadCashboxesFailed')
      return
    }

    deliveryModalOpen.value = true
    return
  }
  
  errorMessage.value = ''
  successMessage.value = ''
  updating.value = true

  try {
    const updated = await $fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {
        status: newStatus.value
      }
    })

    order.value.status = updated.status
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

async function confirmDelivered(payload: { cashboxId: string; method: string; reference: string | null; note: string | null }) {
  if (!order.value) return
  errorMessage.value = ''
  successMessage.value = ''
  updating.value = true

  try {
    const updated = await $fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {
        status: 'DELIVERED',
        cashboxId: payload.cashboxId,
        method: payload.method,
        reference: payload.reference,
        note: payload.note
      }
    })

    order.value.status = updated.status
    newStatus.value = updated.status
    successMessage.value = t('admin.pages.orders.detail.statusUpdate.success')
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error: any) {
    console.error('Failed to mark delivered:', error)
    errorMessage.value = error.data?.statusMessage || t('admin.pages.orders.detail.statusUpdate.errors.updateFailed')
  } finally {
    updating.value = false
  }
}

async function handleUpdateCallStatus() {
  if (!order.value) return
  savingCallStatus.value = true
  callStatusSavedMessage.value = ''
  
  try {
    const updated = await $fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { callStatus: order.value.callStatus }
    })
    order.value.callStatus = updated.callStatus
    callStatusSavedMessage.value = t('admin.common.saved', 'Saved')
    setTimeout(() => {
      callStatusSavedMessage.value = ''
    }, 2000)
  } catch (e: any) {
    console.error('Update call status failed:', e)
  } finally {
    savingCallStatus.value = false
  }
}

async function handleUpdateInternalNotes() {
  if (!order.value) return
  savingNotes.value = true
  notesSavedMessage.value = ''
  try {
    const updated = await $fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { internalNotes: order.value.internalNotes }
    })
    order.value.internalNotes = updated.internalNotes
    notesSavedMessage.value = t('admin.common.saved', 'Saved')
    setTimeout(() => {
      notesSavedMessage.value = ''
    }, 2000)
  } catch (e: any) {
    console.error('Update notes failed:', e)
  } finally {
    savingNotes.value = false
  }
}

function handleBlacklistPlaceholder(type: string) {
  // Just show an alert acting as a placeholder
  alert(`This is a placeholder for ${type} blacklisting. Feature coming soon!`)
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    // Optional: add a quick toast or alert, or it's implicitly successful
  } catch (err) {
    console.error('Failed to copy text: ', err)
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
