<template>
  <div class="max-w-7xl mx-auto">
    <AdminConfirmModal
      v-model="singleDeleteOpen"
      :title="t('admin.confirmModal.defaults.title', 'Are you sure?')"
      :message="t('admin.pages.orders.index.deleteOneConfirm', 'Delete this order? Only unconfirmed (PENDING) orders can be deleted.')"
      :confirm-text="t('common.delete', 'Delete')"
      :error="singleDeleteError"
      @confirm="confirmSingleDelete"
      @cancel="singleDeleteError = null"
    />

    <AdminConfirmModal
      v-model="bulkDeleteOpen"
      :title="t('admin.confirmModal.defaults.title', 'Are you sure?')"
      :message="t('admin.pages.orders.index.deleteManyConfirm', { count: selectedIds.length }, 'Delete {count} orders? Only unconfirmed (PENDING) orders can be deleted.')"
      :confirm-text="t('common.delete', 'Delete')"
      :error="bulkDeleteError"
      @confirm="confirmBulkDelete"
      @cancel="bulkDeleteError = null"
    />

    <!-- Header -->
    <AdminPageHeader
      :title="t('admin.nav.orders')"
      :subtitle="t('admin.pages.orders.index.subtitle')"
      :stats="orderStats"
    >
      <div class="flex items-center gap-3">
        <AdminOrderExportButton
          data-tour="orders-export"
          :filters="exportFilters"
          :tenant-id="tenantId"
        />
        <NuxtLink
          to="/admin/orders/create"
          class="ui-btn ui-btn--primary flex items-center gap-2"
        >
          <Icon name="lucide:plus" class="w-5 h-5" />
          {{ t('admin.pages.orders.index.addBtn') }}
        </NuxtLink>
      </div>
    </AdminPageHeader>

    <!-- Tab filter -->
    <AdminTabFilter data-tour="orders-tabs" v-model="activeTab" :tabs="orderTabs" />

    <div v-if="selectedIds.length" class="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <div class="text-sm text-red-800">
        {{ t('admin.pages.orders.index.selectedCount', { count: selectedIds.length }, '{count} selected') }}
      </div>
      <button
        class="ui-btn ui-btn--danger ui-btn--sm flex items-center gap-2"
        @click="bulkDeleteOpen = true"
      >
        <Icon name="lucide:trash-2" class="w-4 h-4" />
        {{ t('admin.pages.orders.index.bulkDeleteBtn', 'Delete selected') }}
      </button>
    </div>

    <!-- Filters -->
    <div class="ui-card p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="ui-label mb-1">{{ t('admin.pages.orders.index.filters.searchLabel') }}</label>
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
      class="ui-card p-12 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 [border-color:var(--brand)]" />
      <p class="mt-2" style="color: var(--text-secondary)">
        {{ t('admin.pages.orders.index.loading') }}
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="orders.length === 0"
      class="ui-card p-12 text-center"
    >
      <Icon name="lucide:clipboard-list" class="mx-auto h-12 w-12" style="color: var(--text-tertiary)" />
      <h3 class="mt-2 text-sm font-medium" style="color: var(--text-primary)">
        {{ t('admin.pages.orders.index.empty.title') }}
      </h3>
      <p class="mt-1 text-sm" style="color: var(--text-tertiary)">
        {{ emptyHint }}
      </p>
    </div>

    <!-- Orders Table -->
    <div
      v-else
      data-tour="orders-table"
      class="ui-card overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="ui-table">
          <thead class="ui-thead">
            <tr>
              <th class="ui-th w-10">
                <input
                  type="checkbox"
                  class="admin-checkbox"
                  :checked="allPendingSelected"
                  :disabled="pendingIdsOnPage.length === 0"
                  @change="toggleSelectAllPending"
                />
              </th>
              <th class="ui-th cursor-pointer transition-colors" @click="setSort('id')">
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.orders.index.table.orderId') }}
                  <Icon v-if="sortBy === 'id'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="w-3 h-3 [color:var(--brand)]" />
                </div>
              </th>
              <th class="ui-th cursor-pointer transition-colors" @click="setSort('customerName')">
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.orders.index.table.customer') }}
                  <Icon v-if="sortBy === 'customerName'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="w-3 h-3 [color:var(--brand)]" />
                </div>
              </th>
              <th class="ui-th">
                {{ t('admin.pages.orders.index.table.phone') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.orders.index.table.delivery', 'Delivery') }}
              </th>
              <th class="ui-th cursor-pointer transition-colors" @click="setSort('totalAmount')">
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.orders.index.table.total', 'Total') }}
                  <Icon v-if="sortBy === 'totalAmount'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="w-3 h-3 [color:var(--brand)]" />
                </div>
              </th>
              <th class="ui-th cursor-pointer transition-colors" @click="setSort('status')">
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.orders.index.table.status') }}
                  <Icon v-if="sortBy === 'status'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="w-3 h-3 [color:var(--brand)]" />
                </div>
              </th>
              <th class="ui-th cursor-pointer transition-colors" @click="setSort('createdAt')">
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.orders.index.table.date') }}
                  <Icon v-if="sortBy === 'createdAt'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="w-3 h-3 [color:var(--brand)]" />
                </div>
              </th>
              <th class="ui-th text-right">
                {{ t('admin.pages.orders.index.table.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="ui-tbody">
            <tr
              v-for="order in orders"
              :key="order.id"
              class="ui-tr ui-tr--clickable"
              role="link"
              tabindex="0"
              :aria-label="`${t('admin.pages.orders.index.table.orderId')}: ${order.publicId || `#${order.id.substring(0, 8)}`}`"
              @click="openOrderRow($event, order.id)"
              @keydown.enter="openOrderRow($event, order.id)"
              @keydown.space="openOrderRow($event, order.id)"
            >
              <td class="ui-td whitespace-nowrap">
                <input
                  v-if="order.status === 'PENDING'"
                  type="checkbox"
                  class="admin-checkbox"
                  :checked="selectedIds.includes(order.id)"
                  @change="toggleSelectOne(order.id)"
                />
              </td>
              <td class="ui-td whitespace-nowrap">
                <NuxtLink
                  :to="`/admin/orders/${order.id}`"
                  class="font-medium hover:[color:var(--brand)] transition-colors" style="color: var(--text-primary)"
                >
                  {{ order.publicId || `#${order.id.substring(0, 8)}` }}
                </NuxtLink>
                <div v-if="order.publicId" class="text-xs font-mono" style="color: var(--text-tertiary)">
                  {{ order.id.substring(0, 8) }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <NuxtLink
                  v-if="order.customerId"
                  :to="`/admin/customers/${order.customerId}`"
                  class="hover:[color:var(--brand)] transition-colors" style="color: var(--text-primary)"
                >
                  {{ order.customerName }}
                </NuxtLink>
                <div v-else style="color: var(--text-primary)">
                  {{ order.customerName }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <a
                  v-if="order.customerPhone"
                  :href="`tel:${order.customerPhone}`"
                  class="hover:[color:var(--brand)] transition-colors" style="color: var(--text-secondary)"
                >
                  {{ order.customerPhone }}
                </a>
                <div v-else style="color: var(--text-tertiary)">
                  -
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div class="flex flex-col gap-1">
                  <div class="text-sm" style="color: var(--text-primary)">
                    {{ order.shippingProvider || '—' }}
                  </div>
                  <div class="text-xs" style="color: var(--text-tertiary)">
                    {{ deliveryModeLabel(order.deliveryMode) }}
                  </div>
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div class="font-medium" style="color: var(--text-primary)">
                  {{ formatCurrency(order.totalWithShippingAmount ?? order.totalAmount) }}
                </div>
                <div v-if="order.shippingAmount != null && Number(order.shippingAmount) > 0" class="text-xs" style="color: var(--text-tertiary)">
                  +{{ formatCurrency(Number(order.shippingAmount)) }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div class="flex flex-col gap-1 items-start">
                  <AdminOrderStatusBadge :status="order.status" />
                  <AdminPaymentStatusBadge v-if="order.paymentStatus && order.paymentStatus !== 'UNPAID'" :status="order.paymentStatus" />
                  <span
                    v-if="order.status === 'PENDING' && order.callStatus"
                    class="text-xs truncate max-w-[120px]" style="color: var(--text-tertiary)"
                  >
                    {{ t(`admin.pages.orders.detail.fields.callStatusValues.${order.callStatus}`) }}
                  </span>
                </div>
              </td>
              <td class="ui-td whitespace-nowrap" style="color: var(--text-secondary)">
                {{ formatDate(order.createdAt) }}
              </td>
              <td class="ui-td whitespace-nowrap text-right">
                <div class="flex items-center justify-end">
                  <NuxtLink
                    :to="`/admin/orders/${order.id}`"
                    class="ui-table-action"
                    :title="t('common.view')"
                  >
                    <Icon name="lucide:eye" class="w-4 h-4" />
                  </NuxtLink>
                  <button
                    v-if="order.status === 'PENDING'"
                    class="ui-table-action ui-table-action--danger"
                    :title="t('common.delete', 'Delete')"
                    @click="openSingleDelete(order.id)"
                  >
                    <Icon name="lucide:trash-2" class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="px-4 py-3 flex items-center justify-between sm:px-6" style="border-top: 1px solid var(--surface-border)">
        <div class="flex flex-1 items-center justify-between sm:hidden">
          <button
            :disabled="currentPage === 1"
            class="ui-btn ui-btn--secondary ui-btn--sm"
            @click="currentPage--"
          >
            <Icon name="lucide:chevron-left" class="w-4 h-4" />
          </button>
          <span class="text-sm" style="color: var(--text-secondary)">
            {{ t('admin.common.page', { page: currentPage, total: totalPages }) }}
          </span>
          <button
            :disabled="currentPage === totalPages"
            class="ui-btn ui-btn--secondary ui-btn--sm"
            @click="currentPage++"
          >
            <Icon name="lucide:chevron-right" class="w-4 h-4" />
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm" style="color: var(--text-secondary)">
              {{ t('admin.common.showing', {
                from: (currentPage - 1) * itemsPerPage + 1,
                to: Math.min(currentPage * itemsPerPage, total),
                total
              }) }}
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                :disabled="currentPage === 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium disabled:opacity-50"
                style="border-color: var(--surface-border); background: var(--surface-2); color: var(--text-tertiary)"
                @click="currentPage--"
              >
                {{ t('admin.common.previous') }}
              </button>
              <button
                v-for="page in totalPages"
                :key="page"
                :class="[
                  'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                  currentPage === page
                    ? 'z-10 [border-color:var(--brand)] [color:rgba(var(--brand-rgb)/0.85)] [background:rgba(var(--brand-rgb)/0.12)]'
                    : ''
                ]"
                :style="currentPage !== page ? 'border-color: var(--surface-border); background: var(--surface-2); color: var(--text-tertiary)' : ''"
                @click="currentPage = page"
              >
                {{ page }}
              </button>
              <button
                :disabled="currentPage === totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium disabled:opacity-50"
                style="border-color: var(--surface-border); background: var(--surface-2); color: var(--text-tertiary)"
                @click="currentPage++"
              >
                {{ t('admin.common.next') }}
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
import BaseInput from '~/components/ui/BaseInput.vue'
import DateFilter from '~/components/ui/DateFilter.vue'
import AdminOrderExportButton from '~/components/admin/AdminOrderExportButton.vue'
import { getDashboardPresetDateRange } from '~/composables/admin/dashboardRange'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.orders.index.title'
})

const authStore = useAuthStore()
const route = useRoute()
const storeSettings = useState<any>('storeSettings')
const tenantId = computed(() => storeSettings.value?.tenantId ?? '')
const { format: formatCurrency } = useCurrency()
const { t, locale } = useI18n({ useScope: 'global' })

interface Order {
  id: string
  publicId?: string | null
  paidAmount: number
  paymentStatus: string
  customerName: string
  customerPhone: string
  customerAddress: string
  customerId?: string
  totalAmount: number
  totalWithShippingAmount?: number | null
  shippingAmount?: number | null
  shippingProvider?: string | null
  deliveryMode?: string | null
  status: string
  callStatus?: string
  createdAt: string
  items?: any[]
}

const loading = ref(true)
const orders = ref<Order[]>([])
const total = ref(0)
const totalPages = ref(1)
const searchQuery = ref(typeof route.query.search === 'string' ? route.query.search : '')
const selectedStatus = ref(typeof route.query.status === 'string' ? route.query.status : '')
const activeTab = ref('all')
const defaultDateRange = getDashboardPresetDateRange('7d')
const startDate = ref(defaultDateRange.from)
const endDate = ref(defaultDateRange.to)

const currentPage = ref(1)
const itemsPerPage = 25
const sortBy = ref('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

const exportFilters = computed(() => ({
  status: selectedStatus.value || undefined,
  search: searchQuery.value || undefined,
  startDate: startDate.value || undefined,
  endDate: endDate.value || undefined,
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}))

const selectedIds = ref<string[]>([])
const singleDeleteOpen = ref(false)
const bulkDeleteOpen = ref(false)
const singleDeleteError = ref<string | null>(null)
const bulkDeleteError = ref<string | null>(null)
const deleteTargetId = ref<string | null>(null)

const pendingIdsOnPage = computed(() => orders.value.filter((o) => o.status === 'PENDING').map((o) => o.id))
const allPendingSelected = computed(() => pendingIdsOnPage.value.length > 0 && pendingIdsOnPage.value.every((id) => selectedIds.value.includes(id)))

const emptyHint = computed(() => {
  if (searchQuery.value || selectedStatus.value) return t('admin.pages.orders.index.empty.hintFiltered')
  return t('admin.pages.orders.index.empty.hint')
})

const orderStats = computed(() => [
  { label: 'total', value: total.value },
  { label: 'pending', value: orders.value.filter(o => o.status === 'PENDING').length, tone: 'amber' as const },
  { label: 'delivered', value: orders.value.filter(o => o.status === 'DELIVERED').length, tone: 'green' as const },
  { label: 'cancelled', value: orders.value.filter(o => o.status === 'CANCELLED').length, tone: 'red' as const },
])

const orderTabs = computed(() => [
  { key: 'all', label: 'All' },
  { key: 'PENDING', label: 'Pending', count: orders.value.filter(o => o.status === 'PENDING').length },
  { key: 'CONFIRMED', label: 'Confirmed', count: orders.value.filter(o => o.status === 'CONFIRMED').length },
  { key: 'SHIPPED', label: 'Shipped', count: orders.value.filter(o => o.status === 'SHIPPED').length },
  { key: 'DELIVERED', label: 'Delivered', count: orders.value.filter(o => o.status === 'DELIVERED').length },
  { key: 'CANCELLED', label: 'Cancelled', count: orders.value.filter(o => o.status === 'CANCELLED').length },
])

async function fetchOrders() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (selectedStatus.value) params.append('status', selectedStatus.value)
    if (searchQuery.value) params.append('search', searchQuery.value)
    if (startDate.value) params.append('startDate', startDate.value)
    if (endDate.value) params.append('endDate', endDate.value)
    if (sortBy.value) params.append('sortBy', sortBy.value)
    if (sortOrder.value) params.append('sortOrder', sortOrder.value)
    params.append('page', String(currentPage.value))
    params.append('limit', String(itemsPerPage))

    const url = `/api/admin/orders?${params.toString()}`

    const data = await $fetch(url, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    }) as { items: Order[]; total: number; page: number; totalPages: number }

    orders.value = data.items
    total.value = data.total
    totalPages.value = data.totalPages
    selectedIds.value = []
  } catch (error) {
    console.error('Failed to fetch orders:', error)
  } finally {
    loading.value = false
  }
}

function toggleSelectAllPending() {
  if (allPendingSelected.value) {
    selectedIds.value = []
    return
  }
  selectedIds.value = [...pendingIdsOnPage.value]
}

function toggleSelectOne(id: string) {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
    return
  }
  selectedIds.value = [...selectedIds.value, id]
}

function openSingleDelete(id: string) {
  singleDeleteError.value = null
  deleteTargetId.value = id
  singleDeleteOpen.value = true
}

function openOrderRow(event: Event, orderId: string) {
  if (shouldIgnoreRowClick(event)) return
  if (event instanceof KeyboardEvent) event.preventDefault()
  navigateTo(`/admin/orders/${orderId}`)
}

async function confirmSingleDelete() {
  if (!deleteTargetId.value) return
  singleDeleteError.value = null

  try {
    await $fetch(`/api/admin/orders/${encodeURIComponent(deleteTargetId.value)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    singleDeleteOpen.value = false
    deleteTargetId.value = null
    await fetchOrders()
  } catch (error: any) {
    console.error('Failed to delete order:', error)
    singleDeleteError.value = error?.data?.statusMessage || t('common.error', 'An error occurred. Please try again.')
  }
}

async function confirmBulkDelete() {
  bulkDeleteError.value = null
  const ids = [...selectedIds.value]
  if (!ids.length) return

  try {
    await $fetch('/api/admin/orders/bulk-delete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { ids }
    })
    bulkDeleteOpen.value = false
    selectedIds.value = []
    await fetchOrders()
  } catch (error: any) {
    console.error('Failed to bulk delete orders:', error)
    bulkDeleteError.value = error?.data?.statusMessage || t('common.error', 'An error occurred. Please try again.')
  }
}

function setSort(key: string) {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortOrder.value = 'asc'
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

function deliveryModeLabel(mode: any) {
  const raw = typeof mode === 'string' ? mode.trim().toLowerCase() : ''
  if (raw === 'store') return t('admin.pages.orders.index.deliveryModes.store', 'Store pickup')
  if (raw === 'pickup' || raw === 'desk' || raw === 'office') return t('admin.pages.orders.index.deliveryModes.pickup', 'Stop desk')
  return t('admin.pages.orders.index.deliveryModes.home', 'Home delivery')
}

// Fetch orders on mount and when filters change
const { autoStartIfNeeded } = useTour()
onMounted(() => {
  fetchOrders()
  handleGauthCallback()
  autoStartIfNeeded('orders')
})

async function handleGauthCallback() {
  if (!process.client) return
  const gauth = route.query.gauth as string | undefined
  if (gauth !== 'success') return

  // Clean up URL
  const url = new URL(window.location.href)
  url.searchParams.delete('gauth')

  const columns = url.searchParams.get('gsheet_columns')
  const status = url.searchParams.get('gsheet_status')
  const search = url.searchParams.get('gsheet_search')
  const startDateParam = url.searchParams.get('gsheet_startDate')
  const endDateParam = url.searchParams.get('gsheet_endDate')

  url.searchParams.delete('gsheet_columns')
  url.searchParams.delete('gsheet_status')
  url.searchParams.delete('gsheet_search')
  url.searchParams.delete('gsheet_startDate')
  url.searchParams.delete('gsheet_endDate')

  window.history.replaceState({}, '', url.toString())

  // Auto-trigger Google Sheets export
  const params = new URLSearchParams()
  if (columns) params.set('columns', columns)
  if (status) params.set('status', status)
  if (search) params.set('search', search)
  if (startDateParam) params.set('startDate', startDateParam)
  if (endDateParam) params.set('endDate', endDateParam)

  try {
    const response = await fetch(`/api/admin/orders/export/google-export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })
    const data = await response.json()
    if (response.ok && data.sheetUrl) {
      window.open(data.sheetUrl, '_blank')
    } else {
      alert(data.statusMessage ?? 'Google Sheets export failed')
    }
  } catch {
    alert('Google Sheets export failed. Please try again.')
  }
}

watch(activeTab, (tab) => {
  selectedStatus.value = tab === 'all' ? '' : tab
  currentPage.value = 1
  fetchOrders()
})

watch([searchQuery, selectedStatus, startDate, endDate, sortBy, sortOrder], () => {
  currentPage.value = 1
  fetchOrders()
})

watch(currentPage, () => {
  fetchOrders()
})
</script>
