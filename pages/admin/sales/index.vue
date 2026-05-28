<template>
  <div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight" style="color: var(--text-primary)">
          {{ t('admin.nav.salesItem') }}
        </h2>
        <p class="mt-1" style="color: var(--text-secondary)">
          {{ t('admin.pages.sales.index.subtitle') }}
        </p>
      </div>
    </div>

    <div class="ui-card p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="ui-label mb-1">{{ t('admin.pages.sales.index.filters.searchLabel') }}</label>
          <BaseInput
            v-model="searchQuery"
            :placeholder="t('admin.pages.sales.index.filters.searchPlaceholder')"
          />
        </div>
        <div>
          <BaseSelect
            v-model="selectedUser"
            :label="t('admin.pages.sales.index.filters.userLabel')"
            :placeholder="t('admin.pages.sales.index.filters.allUsers')"
          >
            <option value="">{{ t('admin.pages.sales.index.filters.allUsers') }}</option>
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.email }}
            </option>
          </BaseSelect>
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
      class="ui-card p-12 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 [border-color:var(--brand)]" />
      <p class="mt-2" style="color: var(--text-secondary)">
        {{ t('admin.pages.sales.index.loading') }}
      </p>
    </div>

    <div
      v-else-if="sales.length === 0"
      class="ui-card p-12 text-center"
    >
      <Icon name="lucide:badge-dollar-sign" class="mx-auto h-12 w-12" style="color: var(--text-tertiary)" />
      <h3 class="mt-2 text-sm font-medium" style="color: var(--text-primary)">
        {{ t('admin.pages.sales.index.empty.title') }}
      </h3>
      <p class="mt-1 text-sm" style="color: var(--text-tertiary)">
        {{ emptyHint }}
      </p>
    </div>

    <!-- Sales Table -->
    <div
      v-else
      class="ui-card overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="ui-table">
          <thead class="ui-thead">
            <tr>
              <th class="ui-th cursor-pointer transition-colors" @click="setSort('id')">
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.sales.index.table.saleId') }}
                  <Icon v-if="sortBy === 'id'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="w-3 h-3 [color:var(--brand)]" />
                </div>
              </th>
              <th class="ui-th cursor-pointer transition-colors" @click="setSort('customerName')">
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.sales.index.table.customer') }}
                  <Icon v-if="sortBy === 'customerName'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="w-3 h-3 [color:var(--brand)]" />
                </div>
              </th>
              <th class="ui-th">
                {{ t('admin.pages.sales.index.table.phone') }}
              </th>
              <th class="ui-th cursor-pointer transition-colors" @click="setSort('totalAmount')">
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.sales.index.table.total') }}
                  <Icon v-if="sortBy === 'totalAmount'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="w-3 h-3 [color:var(--brand)]" />
                </div>
              </th>
              <th class="ui-th">
                {{ t('admin.pages.sales.index.table.user') }}
              </th>
              <th class="ui-th cursor-pointer transition-colors" @click="setSort('updatedAt')">
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.sales.index.table.completed') }}
                  <Icon v-if="sortBy === 'updatedAt'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="w-3 h-3 [color:var(--brand)]" />
                </div>
              </th>
              <th class="ui-th text-right">
                {{ t('admin.pages.sales.index.table.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="ui-tbody">
            <tr
              v-for="sale in sales"
              :key="sale.id"
              class="ui-tr ui-tr--clickable"
              role="link"
              tabindex="0"
              :aria-label="`${t('admin.pages.sales.index.table.saleId')}: #${sale.id.substring(0, 8)}`"
              @click="openSaleRow($event, sale.id)"
              @keydown.enter="openSaleRow($event, sale.id)"
              @keydown.space="openSaleRow($event, sale.id)"
            >
              <td class="ui-td whitespace-nowrap">
                <NuxtLink
                  :to="`/admin/sales/${sale.id}`"
                  class="font-medium hover:[color:var(--brand)] transition-colors" style="color: var(--text-primary)"
                >
                  #{{ sale.id.substring(0, 8) }}
                </NuxtLink>
              </td>
              <td class="ui-td whitespace-nowrap">
                <NuxtLink
                  v-if="sale.customerId"
                  :to="`/admin/customers/${sale.customerId}`"
                  class="hover:[color:var(--brand)] transition-colors" style="color: var(--text-primary)"
                >
                  {{ sale.customerName }}
                </NuxtLink>
                <div v-else style="color: var(--text-primary)">
                  {{ sale.customerName }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <a
                  v-if="sale.customerPhone"
                  :href="`tel:${sale.customerPhone}`"
                  class="hover:[color:var(--brand)] transition-colors" style="color: var(--text-secondary)"
                >
                  {{ sale.customerPhone }}
                </a>
                <div v-else style="color: var(--text-tertiary)">
                  -
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div class="font-medium" style="color: var(--text-primary)">
                  {{ formatCurrency(sale.totalAmount) }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                <a
                  v-if="sale.createdByEmail"
                  :href="`mailto:${sale.createdByEmail}`"
                  class="hover:[color:var(--brand)] transition-colors"
                >
                  {{ sale.createdByEmail }}
                </a>
                <span v-else>System</span>
              </td>
              <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                {{ formatDate(sale.updatedAt) }}
              </td>
              <td class="ui-td whitespace-nowrap text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    v-if="salesInvoiceEnabled"
                    type="button"
                    class="ui-btn ui-btn--secondary ui-btn--sm"
                    :disabled="invoiceLoadingId === sale.id"
                    :title="t('admin.pages.sales.actions.printInvoice')"
                    @click="printSaleInvoice(sale.id)"
                  >
                    <Icon
                      v-if="invoiceLoadingId === sale.id"
                      name="lucide:loader-2"
                      class="h-4 w-4 animate-spin"
                    />
                    <Icon
                      v-else
                      name="lucide:printer"
                      class="h-4 w-4"
                    />
                    <span>{{ t('admin.pages.sales.actions.invoice') }}</span>
                  </button>
                  <button
                    type="button"
                    class="ui-btn ui-btn--danger ui-btn--sm"
                    :disabled="refundLoading && refundingSaleId === sale.id"
                    @click="openRefundModal(sale)"
                  >
                    <Icon
                      v-if="refundLoading && refundingSaleId === sale.id"
                      name="lucide:loader-2"
                      class="h-4 w-4 animate-spin"
                    />
                    <Icon
                      v-else
                      name="lucide:rotate-ccw"
                      class="h-4 w-4"
                    />
                    <span>{{ t('admin.pages.sales.actions.refund') }}</span>
                  </button>
                  <NuxtLink
                    :to="`/admin/sales/${sale.id}`"
                    class="ui-table-action"
                    :title="t('common.view')"
                  >
                    <Icon name="lucide:eye" class="w-4 h-4" />
                  </NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="px-4 py-3 flex items-center justify-between sm:px-6" style="border-top: 1px solid var(--surface-border); background: var(--surface-1)">
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
                class="relative inline-flex items-center px-2 py-2 rounded-l-md text-sm font-medium disabled:opacity-50"
                style="border: 1px solid var(--surface-border); background: var(--surface-2); color: var(--text-tertiary)"
                @click="currentPage--"
              >
                {{ t('admin.common.previous') }}
              </button>
              <button
                v-for="page in totalPages"
                :key="page"
                class="relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                :class="currentPage === page ? 'z-10 [background:rgba(var(--brand-rgb)/0.08)] [border-color:var(--brand)] [color:var(--brand)]' : ''"
                :style="currentPage !== page ? 'border-color: var(--surface-border); background: var(--surface-2); color: var(--text-tertiary)' : ''"
                @click="currentPage = page"
              >
                {{ page }}
              </button>
              <button
                :disabled="currentPage === totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md text-sm font-medium disabled:opacity-50"
                style="border: 1px solid var(--surface-border); background: var(--surface-2); color: var(--text-tertiary)"
                @click="currentPage++"
              >
                {{ t('admin.common.next') }}
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <div v-if="refundModalOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="closeRefundModal">
      <div class="flex min-h-screen items-center justify-center px-4">
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm" @click="closeRefundModal" />
        <div class="relative z-10 w-full max-w-lg rounded-xl p-6" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 24px 48px rgba(0,0,0,0.5)">
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ t('admin.pages.sales.refundModal.title') }}
          </h3>
          <p class="mt-1 text-sm" style="color: var(--text-tertiary)">
            {{ t('admin.pages.sales.refundModal.subtitle') }}
          </p>

          <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <BaseSelect
                v-model="refundForm.cashboxId"
                :label="t('admin.pages.sales.refundModal.cashboxLabel')"
              >
                <option value="">{{ t('admin.pages.sales.refundModal.cashboxPlaceholder') }}</option>
                <option
                  v-for="c in cashboxes"
                  :key="c.id"
                  :value="c.id"
                  :disabled="!c.openSession"
                >
                  {{ c.name }}{{ !c.openSession ? ` (${t('admin.pages.sales.refundModal.noOpenSession')})` : '' }}
                </option>
              </BaseSelect>
            </div>

            <div class="sm:col-span-2">
              <BaseSelect
                v-model="refundForm.method"
                :label="t('admin.pages.sales.refundModal.methodLabel')"
              >
                <option value="CASH">{{ t('admin.pages.cash.methods.CASH') }}</option>
                <option value="CARD">{{ t('admin.pages.cash.methods.CARD') }}</option>
                <option value="TRANSFER">{{ t('admin.pages.cash.methods.TRANSFER') }}</option>
                <option value="OTHER">{{ t('admin.pages.cash.methods.OTHER') }}</option>
              </BaseSelect>
            </div>

            <div class="sm:col-span-2">
              <BaseInput
                v-model="refundForm.reference"
                :label="t('admin.pages.sales.refundModal.referenceLabel')"
                :placeholder="t('admin.pages.sales.refundModal.referencePlaceholder')"
              />
            </div>

            <div class="sm:col-span-2">
              <BaseInput
                v-model="refundForm.note"
                :label="t('admin.pages.sales.refundModal.noteLabel')"
                :placeholder="t('admin.pages.sales.refundModal.notePlaceholder')"
              />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="ui-btn ui-btn--secondary text-sm"
              @click="closeRefundModal"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="ui-btn ui-btn--danger text-sm"
              :disabled="!canSubmitRefund || refundLoading"
              @click="submitRefund"
            >
              <Icon v-if="refundLoading" name="lucide:loader-2" class="h-4 w-4 animate-spin" />
              <span>{{ refundLoading ? t('admin.common.updating') : t('admin.pages.sales.actions.refund') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'
import BaseInput from '~/components/ui/BaseInput.vue'
import BaseSelect from '~/components/ui/BaseSelect.vue'
import DateFilter from '~/components/ui/DateFilter.vue'
import { getDashboardPresetDateRange } from '~/composables/admin/dashboardRange'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.sales.index.title'
})

const authStore = useAuthStore()
const route = useRoute()
const { t, locale } = useI18n()
const { format: formatCurrency } = useCurrency()
const { showToast } = useToast()
const storeSettings = useState<any>('storeSettings')

interface Sale {
  id: string
  status: string
  type?: 'ORDER' | 'POS'
  totalAmount: number
  customerName: string
  customerPhone: string
  customerId?: string
  createdAt: string
  updatedAt: string
  createdByEmail?: string | null
}

interface Cashbox {
  id: string
  name: string
  openSession?: { id: string } | null
}

const loading = ref(true)
const sales = ref<Sale[]>([])
const total = ref(0)
const totalPages = ref(1)
const currentPage = ref(1)
const itemsPerPage = 25
const users = ref<{ id: string; email: string }[]>([])
const selectedUser = ref('')
const searchQuery = ref(typeof route.query.search === 'string' ? route.query.search : '')
const sortBy = ref('updatedAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
const defaultDateRange = getDashboardPresetDateRange('7d')
const startDate = ref(defaultDateRange.from)
const endDate = ref(defaultDateRange.to)
const cashboxes = ref<Cashbox[]>([])
const cashboxesLoaded = ref(false)
const refundModalOpen = ref(false)
const refundLoading = ref(false)
const refundingSaleId = ref<string | null>(null)
const invoiceLoadingId = ref<string | null>(null)
const refundTarget = ref<Sale | null>(null)
const refundForm = reactive({
  cashboxId: '',
  method: 'CASH',
  reference: '',
  note: ''
})

const emptyHint = computed(() => {
  if (searchQuery.value) return t('admin.pages.sales.index.empty.hintFiltered')
  return t('admin.pages.sales.index.empty.hint')
})

const canSubmitRefund = computed(() => {
  return !!refundTarget.value && !!refundForm.cashboxId
})

const openCashboxes = computed(() => cashboxes.value.filter(c => !!c.openSession))
const salesInvoiceEnabled = computed(() => storeSettings.value?.salesInvoiceEnabled === true)

const normalizeStatus = (value: unknown) => String(value || '').trim().toUpperCase()
const normalizeType = (value: unknown) => String(value || '').trim().toUpperCase()

const isRefundableSale = (sale: Sale) => {
  return normalizeType(sale.type) !== 'ORDER' && normalizeStatus(sale.status) === 'COMPLETED'
}

const getRefundBlockedReason = (sale: Sale) => {
  if (normalizeType(sale.type) === 'ORDER') return t('admin.pages.sales.messages.refundFromOrderFlow')
  if (normalizeStatus(sale.status) === 'REFUNDED') return t('admin.pages.sales.messages.alreadyRefunded')
  return t('admin.pages.sales.messages.onlyCompletedPos')
}

async function fetchCashboxes() {
  if (cashboxesLoaded.value) return
  try {
    const rows = await $fetch('/api/admin/cashboxes', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    }) as Cashbox[]
    cashboxes.value = rows || []
    cashboxesLoaded.value = true
  } catch {
    cashboxes.value = []
  }
}

async function openRefundModal(sale: Sale) {
  if (!isRefundableSale(sale)) {
    showToast(getRefundBlockedReason(sale), 'info')
    return
  }

  refundingSaleId.value = sale.id
  try {
    await fetchCashboxes()
    if (openCashboxes.value.length === 0) {
      showToast(t('admin.pages.sales.messages.noOpenCashbox'), 'error')
      return
    }

    refundTarget.value = sale
    refundForm.cashboxId = openCashboxes.value[0]?.id || ''
    refundForm.method = 'CASH'
    refundForm.reference = ''
    refundForm.note = `sale_refund:${sale.id.substring(0, 8)}`
    refundModalOpen.value = true
  } finally {
    refundingSaleId.value = null
  }
}

function closeRefundModal() {
  if (refundLoading.value) return
  refundModalOpen.value = false
  refundTarget.value = null
}

async function submitRefund() {
  if (!canSubmitRefund.value || !refundTarget.value) return
  refundLoading.value = true
  refundingSaleId.value = refundTarget.value.id
  try {
    await $fetch(`/api/admin/sales/${refundTarget.value.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        status: 'REFUNDED',
        refund: {
          cashboxId: refundForm.cashboxId,
          method: refundForm.method,
          reference: refundForm.reference?.trim() || undefined,
          note: refundForm.note?.trim() || undefined
        }
      }
    })
    showToast(t('admin.pages.sales.messages.refundSuccess'), 'success')
    closeRefundModal()
    await fetchSales()
  } catch (e: any) {
    showToast(e?.data?.statusMessage || t('admin.pages.sales.messages.refundFailed'), 'error')
  } finally {
    refundLoading.value = false
    refundingSaleId.value = null
  }
}

async function printSaleInvoice(saleId: string) {
  if (!process.client || !salesInvoiceEnabled.value) return
  invoiceLoadingId.value = saleId
  try {
    const blob = await $fetch(`/api/admin/sales/${saleId}/invoice/pdf`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
      responseType: 'blob'
    }) as Blob
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) {
      window.setTimeout(() => {
        win.focus()
        win.print()
        URL.revokeObjectURL(url)
      }, 500)
    } else {
      URL.revokeObjectURL(url)
      showToast(t('admin.pages.sales.messages.invoicePopupBlocked'), 'error')
    }
  } catch (e: any) {
    showToast(e?.data?.statusMessage || t('admin.pages.sales.messages.invoiceFailed'), 'error')
  } finally {
    invoiceLoadingId.value = null
  }
}

async function fetchSales() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchQuery.value) params.append('search', searchQuery.value)
    if (startDate.value) params.append('startDate', startDate.value)
    if (endDate.value) params.append('endDate', endDate.value)
    if (selectedUser.value) params.append('userId', selectedUser.value)
    if (sortBy.value) params.append('sortBy', sortBy.value)
    if (sortOrder.value) params.append('sortOrder', sortOrder.value)
    params.append('page', String(currentPage.value))
    params.append('limit', String(itemsPerPage))

    const url = `/api/admin/sales?${params.toString()}`

    const data = await $fetch(url, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    }) as { items: Sale[]; total: number; page: number; totalPages: number }

    sales.value = data.items
    total.value = data.total
    totalPages.value = data.totalPages
  } catch (error) {
    console.error('Failed to fetch sales:', error)
  } finally {
    loading.value = false
  }
}

async function fetchUsers() {
  try {
    const data = await $fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    }) as { id: string; email: string }[]
    users.value = data
  } catch (e) {
    console.error('Failed to fetch users', e)
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

function openSaleRow(event: Event, saleId: string) {
  if (shouldIgnoreRowClick(event)) return
  if (event instanceof KeyboardEvent) event.preventDefault()
  navigateTo(`/admin/sales/${saleId}`)
}

onMounted(() => {
  fetchUsers()
  fetchSales()
})

watch([searchQuery, startDate, endDate, selectedUser, sortBy, sortOrder], () => {
  currentPage.value = 1
  fetchSales()
})

watch(currentPage, () => {
  fetchSales()
})
</script>
