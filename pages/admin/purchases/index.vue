<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight" style="color: var(--text-primary)">
          {{ t('admin.nav.purchases') }}
        </h2>
        <p class="mt-1" style="color: var(--text-secondary)">
          {{ t('admin.pages.purchases.index.subtitle') }}
        </p>
      </div>
      <NuxtLink
        to="/admin/purchases/create"
        class="ui-btn ui-btn--primary ui-btn--md"
      >
        <Icon name="lucide:plus" class="w-5 h-5" />
        <span>{{ t('admin.pages.purchases.index.newPurchase') }}</span>
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="ui-card p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
           <BaseSelect
            v-model="selectedSupplier"
            :label="t('admin.pages.purchases.index.filters.supplierLabel')"
            :placeholder="t('admin.pages.purchases.index.filters.allSuppliers')"
          >
            <option value="">{{ t('admin.pages.purchases.index.filters.allSuppliers') }}</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </BaseSelect>
        </div>
        <div>
           <BaseSelect
            v-model="selectedUser"
            :label="t('admin.pages.purchases.index.filters.userLabel')"
            :placeholder="t('admin.pages.purchases.index.filters.allUsers')"
          >
            <option value="">{{ t('admin.pages.purchases.index.filters.allUsers') }}</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.email }}</option>
          </BaseSelect>
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
            :label="t('admin.pages.purchases.index.filters.statusLabel')"
            :placeholder="t('admin.pages.purchases.index.filters.allStatuses')"
          >
            <option value="">{{ t('admin.pages.purchases.index.filters.allStatuses') }}</option>
            <option value="DRAFT">{{ t('admin.pages.purchases.index.filters.statusValues.DRAFT') }}</option>
            <option value="ORDERED">{{ t('admin.pages.purchases.index.filters.statusValues.ORDERED') }}</option>
            <option value="PARTIALLY_RECEIVED">{{ t('admin.pages.purchases.index.filters.statusValues.PARTIALLY_RECEIVED') }}</option>
            <option value="RECEIVED">{{ t('admin.pages.purchases.index.filters.statusValues.RECEIVED') }}</option>
            <option value="CANCELLED">{{ t('admin.pages.purchases.index.filters.statusValues.CANCELLED') }}</option>
          </BaseSelect>
        </div>
        <div>
           <BaseSelect
            v-model="selectedPaymentStatus"
            :label="t('admin.pages.purchases.index.filters.paymentStatusLabel')"
            :placeholder="t('admin.pages.purchases.index.filters.allPaymentStatuses')"
          >
            <option value="">{{ t('admin.pages.purchases.index.filters.allPaymentStatuses') }}</option>
            <option value="UNPAID">{{ t('admin.pages.purchases.index.filters.paymentStatusValues.UNPAID') }}</option>
            <option value="PARTIALLY_PAID">{{ t('admin.pages.purchases.index.filters.paymentStatusValues.PARTIALLY_PAID') }}</option>
            <option value="PAID">{{ t('admin.pages.purchases.index.filters.paymentStatusValues.PAID') }}</option>
          </BaseSelect>
        </div>
        <div class="hidden">
          <p class="text-sm" style="color: var(--text-tertiary)">
            View and manage your purchase history.
          </p>
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
        {{ t('admin.pages.purchases.index.loading') }}
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredOrders.length === 0"
      class="ui-card p-12 text-center"
    >
      <Icon name="lucide:shopping-bag" class="mx-auto h-12 w-12" style="color: var(--text-muted)" />
      <h3 class="mt-2 text-sm font-medium" style="color: var(--text-primary)">
        {{ t('admin.pages.purchases.index.empty.title') }}
      </h3>
      <p class="mt-1 text-sm" style="color: var(--text-tertiary)">
        {{ t('admin.pages.purchases.index.empty.hint') }}
      </p>
      <div class="mt-6">
        <NuxtLink
          to="/admin/purchases/create"
          class="ui-btn ui-btn--primary ui-btn--md"
        >
          <Icon name="lucide:plus" class="w-5 h-5 me-2" />
          {{ t('admin.pages.purchases.index.newPurchase') }}
        </NuxtLink>
      </div>
    </div>

    <!-- Purchases Table -->
    <div
      v-else
      class="ui-card overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="ui-table">
          <thead class="ui-thead">
            <tr>
              <th class="ui-th">
                {{ t('admin.pages.purchases.index.table.id') }}
              </th>
               <th class="ui-th">
                {{ t('admin.pages.purchases.index.table.supplier') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.purchases.index.table.total') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.purchases.index.table.user') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.purchases.index.table.status') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.purchases.index.table.paymentStatus') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.purchases.index.table.payment') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.purchases.index.table.items') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.purchases.index.table.date') }}
              </th>
              <th class="ui-th text-end">
                {{ t('admin.pages.purchases.index.table.action') }}
              </th>
            </tr>
          </thead>
          <tbody class="ui-tbody">
            <tr
              v-for="order in paginatedOrders"
              :key="order.id"
              class="ui-tr ui-tr--clickable"
              role="link"
              tabindex="0"
              :aria-label="`${t('admin.pages.purchases.index.table.id')}: #${order.id.slice(0, 8)}`"
              @click="openPurchaseRow($event, order.id)"
              @keydown.enter="openPurchaseRow($event, order.id)"
              @keydown.space="openPurchaseRow($event, order.id)"
            >
              <td class="ui-td whitespace-nowrap">
                <NuxtLink
                  :to="`/admin/purchases/${order.id}`"
                  class="font-medium hover:[color:rgba(var(--brand-rgb)/0.85)] transition-colors" style="color: var(--text-primary)"
                >
                  #{{ order.id.slice(0, 8) }}
                </NuxtLink>
              </td>
              <td class="ui-td whitespace-nowrap text-sm">
                <NuxtLink
                  v-if="order.supplier"
                  :to="`/admin/suppliers/${order.supplier.id}`"
                  class="hover:[color:rgba(var(--brand-rgb)/0.85)] transition-colors" style="color: var(--text-secondary)"
                >
                  {{ order.supplier.name }}
                </NuxtLink>
                <span v-else style="color: var(--text-muted)">—</span>
              </td>
              <td class="ui-td whitespace-nowrap font-medium" style="color: var(--text-primary)">
                {{ formatCurrency(calculateTotal(order)) }}
              </td>
              <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                <a
                  v-if="order.createdByEmail"
                  :href="`mailto:${order.createdByEmail}`"
                  class="hover:[color:var(--brand)] transition-colors"
                >
                  {{ order.createdByEmail }}
                </a>
                <span v-else>System</span>
              </td>
              <td class="ui-td whitespace-nowrap">
                <span :class="getStatusClass(order.status)">
                  {{ order.status }}
                </span>
              </td>
              <td class="ui-td whitespace-nowrap">
                <span :class="getPaymentStatusClass(order.paymentStatus)">
                  {{ order.paymentStatus }}
                </span>
              </td>
              <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                {{ formatCurrency(Number(order.paidAmount || 0)) }} / {{ formatCurrency(Number(order.totalAmount || calculateTotal(order))) }}
              </td>
              <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                {{ t('admin.pages.purchases.index.table.itemsCount', { count: order.items?.length || 0 }) }}
              </td>
              <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                {{ formatDate(order.createdAt) }}
              </td>
              <td class="ui-td whitespace-nowrap text-end">
                <NuxtLink
                  :to="`/admin/purchases/${order.id}`"
                  class="ui-btn ui-btn--secondary ui-btn--sm"
                >
                  <span>{{ t('admin.pages.purchases.index.table.manage') }}</span>
                  <Icon name="lucide:arrow-right" class="w-4 h-4" />
                </NuxtLink>
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
              {{ t('admin.pages.purchases.index.pagination.showing', {
                from: (currentPage - 1) * itemsPerPage + 1,
                to: Math.min(currentPage * itemsPerPage, filteredOrders.length),
                total: filteredOrders.length
              }) }}
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                :disabled="currentPage === 1"
                class="relative inline-flex items-center px-2 py-2 rounded-s-md text-sm font-medium disabled:opacity-50" style="border: 1px solid var(--surface-border); background: var(--surface-2); color: var(--text-tertiary)"
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
                    ? 'z-10 [border-color:var(--brand)] [color:rgba(var(--brand-rgb)/0.85)]'
                    : 'text-slate-400'
                ]"
                :style="currentPage === page
                  ? 'background: rgba(var(--brand-rgb)/0.1); border: 1px solid var(--brand)'
                  : 'background: var(--surface-2); border: 1px solid var(--surface-border)'"
                @click="currentPage = page"
              >
                {{ page }}
              </button>
              <button
                :disabled="currentPage === totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-e-md text-sm font-medium disabled:opacity-50" style="border: 1px solid var(--surface-border); background: var(--surface-2); color: var(--text-tertiary)"
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
import DateFilter from '~/components/ui/DateFilter.vue'
import { getDashboardPresetDateRange } from '~/composables/admin/dashboardRange'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.purchases.index.title'
})

type Supplier = { id: string; name: string }
type PurchaseOrder = {
  id: string
  status: string
  paymentStatus: string
  totalAmount: any
  paidAmount: any
  createdAt: string
  supplier: Supplier | null
  items: any[]
  createdByEmail?: string | null
}

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })
const { format: formatCurrency } = useCurrency()
const route = useRoute()
const router = useRouter()
const suppliers = ref<Supplier[]>([])
const users = ref<{ id: string; email: string }[]>([])
const orders = ref<PurchaseOrder[]>([])
const loading = ref(true)
const selectedSupplier = ref(typeof route.query.supplierId === 'string' ? route.query.supplierId : '')
const selectedUser = ref(typeof route.query.userId === 'string' ? route.query.userId : '')
const selectedStatus = ref(typeof route.query.status === 'string' ? route.query.status : '')
const selectedPaymentStatus = ref(typeof route.query.paymentStatus === 'string' ? route.query.paymentStatus : '')
const defaultDateRange = getDashboardPresetDateRange('7d')
const startDate = ref(typeof route.query.startDate === 'string' ? route.query.startDate : defaultDateRange.from)
const endDate = ref(typeof route.query.endDate === 'string' ? route.query.endDate : defaultDateRange.to)
const currentPage = ref(Number(route.query.page) || 1)
const itemsPerPage = 25

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
  suppliers.value = await $fetch('/api/admin/suppliers', {
    headers: { Authorization: `Bearer ${authStore.token}` }
  }).catch(() => []) as Supplier[]
}

const fetchUsers = async () => {
  users.value = await $fetch('/api/admin/users', {
    headers: { Authorization: `Bearer ${authStore.token}` }
  }).catch(() => []) as { id: string; email: string }[]
}

const fetchOrders = async () => {
  loading.value = true
  try {
    orders.value = await $fetch('/api/admin/purchases', {
      headers: { Authorization: `Bearer ${authStore.token}` },
      query: {
        startDate: startDate.value || undefined,
        endDate: endDate.value || undefined,
        userId: selectedUser.value || undefined,
        status: selectedStatus.value || undefined,
        paymentStatus: selectedPaymentStatus.value || undefined
      }
    }) as PurchaseOrder[]
  } catch (e: any) {
    console.error('Failed to load purchases', e)
  } finally {
    loading.value = false
  }
}

const calculateTotal = (order: PurchaseOrder) => {
  return order.items.reduce((sum, item) => sum + (item.quantityOrdered * Number(item.unitCost)), 0)
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString()

function openPurchaseRow(event: Event, purchaseId: string) {
  if (shouldIgnoreRowClick(event)) return
  if (event instanceof KeyboardEvent) event.preventDefault()
  navigateTo(`/admin/purchases/${purchaseId}`)
}

const getStatusClass = (status: string) => {
  const base = 'ui-badge '
  switch (status.toLowerCase()) {
    case 'completed':
    case 'received':
      return base + 'ui-badge--emerald'
    case 'partially_received':
    case 'pending':
    case 'ordered':
      return base + 'ui-badge--amber'
    case 'cancelled':
      return base + 'ui-badge--red'
    default:
      return base + 'ui-badge--slate'
  }
}

const getPaymentStatusClass = (status: string) => {
  const base = 'ui-badge '
  switch (status?.toLowerCase()) {
    case 'paid':
      return base + 'ui-badge--emerald'
    case 'partially_paid':
      return base + 'ui-badge--amber'
    default:
      return base + 'ui-badge--slate'
  }
}

function syncToUrl() {
  router.replace({
    query: {
      ...route.query,
      supplierId: selectedSupplier.value || undefined,
      userId: selectedUser.value || undefined,
      status: selectedStatus.value || undefined,
      paymentStatus: selectedPaymentStatus.value || undefined,
      startDate: startDate.value === defaultDateRange.from ? undefined : startDate.value,
      endDate: endDate.value === defaultDateRange.to ? undefined : endDate.value,
      page: currentPage.value > 1 ? String(currentPage.value) : undefined
    }
  })
}

watch(selectedSupplier, () => { currentPage.value = 1; syncToUrl() })
watch([startDate, endDate], () => {
    currentPage.value = 1
    syncToUrl()
    fetchOrders()
})

watch(selectedUser, () => {
    currentPage.value = 1
    syncToUrl()
    fetchOrders()
})

watch([selectedStatus, selectedPaymentStatus], () => {
    currentPage.value = 1
    syncToUrl()
    fetchOrders()
})

watch(currentPage, () => {
    syncToUrl()
})

onMounted(async () => {
  await fetchSuppliers()
  await fetchUsers()
  await fetchOrders()
})
</script>
