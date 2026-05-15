<template>
  <div class="max-w-4xl mx-auto">
    <nav class="flex mb-6" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink to="/admin/sales" class="hover:[color:var(--brand)]" style="color: var(--text-secondary)">
            {{ t('admin.nav.salesItem') }}
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6" style="color: var(--text-tertiary)" />
            <span class="ml-1" style="color: var(--text-tertiary)">{{ t('admin.pages.sales.detail.breadcrumb', { id: saleId.substring(0, 8) }) }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <div v-if="loading" class="ui-card p-12 text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 [border-color:var(--brand)]" />
      <p class="mt-2" style="color: var(--text-secondary)">{{ t('admin.pages.sales.detail.loading') }}</p>
    </div>

    <div v-else-if="sale" class="space-y-6">
      <div class="ui-card p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold" style="color: var(--text-primary)">{{ t('admin.pages.sales.detail.sections.saleInfo') }}</h2>
          <div class="flex items-center gap-2">
            <button
              v-if="salesInvoiceEnabled"
              type="button"
              class="ui-btn ui-btn--secondary ui-btn--sm"
              :disabled="invoiceLoading"
              @click="printSaleInvoice"
            >
              <Icon v-if="invoiceLoading" name="lucide:loader-2" class="h-4 w-4 animate-spin" />
              <Icon v-else name="lucide:printer" class="h-4 w-4" />
              <span>{{ t('admin.pages.sales.actions.invoice') }}</span>
            </button>
            <button
              type="button"
              class="ui-btn ui-btn--danger ui-btn--sm"
              :disabled="refundLoading"
              @click="openRefundModal"
            >
              <Icon v-if="refundLoading" name="lucide:loader-2" class="h-4 w-4 animate-spin" />
              <Icon v-else name="lucide:rotate-ccw" class="h-4 w-4" />
              <span>{{ t('admin.pages.sales.actions.refund') }}</span>
            </button>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
              {{ sale.status }}
            </span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm font-medium" style="color: var(--text-tertiary)">{{ t('admin.pages.sales.detail.fields.saleId') }}</p>
            <p class="mt-1 text-sm" style="color: var(--text-primary)">{{ sale.id }}</p>
          </div>
          <div>
            <p class="text-sm font-medium" style="color: var(--text-tertiary)">{{ t('admin.pages.sales.detail.fields.date') }}</p>
            <p class="mt-1 text-sm" style="color: var(--text-primary)">{{ formatDate(sale.createdAt) }}</p>
          </div>
        </div>
      </div>

      <div class="ui-card p-6">
        <h2 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">{{ t('admin.pages.sales.detail.sections.client') }}</h2>
        <div class="space-y-3">
          <div>
            <p class="text-sm font-medium" style="color: var(--text-tertiary)">{{ t('admin.pages.sales.detail.fields.customerName') }}</p>
            <p class="mt-1 text-sm" style="color: var(--text-primary)">{{ sale.customerName || t('admin.pages.sales.detail.fields.guest') }}</p>
          </div>
          <div>
            <p class="text-sm font-medium" style="color: var(--text-tertiary)">{{ t('admin.pages.sales.detail.fields.customerPhone') }}</p>
            <p class="mt-1 text-sm" style="color: var(--text-primary)">{{ sale.customerPhone || '—' }}</p>
          </div>
        </div>
      </div>

      <div class="ui-card p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold" style="color: var(--text-primary)">{{ t('admin.pages.sales.detail.sections.items') }}</h2>
          <div class="text-sm font-semibold" style="color: var(--text-primary)">{{ formatCurrency(sale.totalAmount) }}</div>
        </div>
        <div class="overflow-x-auto">
          <table class="ui-table">
            <thead class="ui-thead">
              <tr>
                <th class="ui-th">{{ t('admin.pages.sales.detail.itemsTable.product') }}</th>
                <th class="ui-th">{{ t('admin.pages.sales.detail.itemsTable.variant') }}</th>
                <th class="ui-th text-right">{{ t('admin.pages.sales.detail.itemsTable.qty') }}</th>
                <th class="ui-th text-right">{{ t('admin.pages.sales.detail.itemsTable.price') }}</th>
                <th class="ui-th text-right">{{ t('admin.pages.sales.detail.itemsTable.total') }}</th>
              </tr>
            </thead>
            <tbody class="ui-tbody">
              <tr v-for="item in sale.items" :key="item.id" class="ui-tr">
                <td class="ui-td text-sm" style="color: var(--text-primary)">
                  {{ item.product?.title || item.productId }}
                </td>
                <td class="ui-td text-sm" style="color: var(--text-secondary)">
                  {{ item.variantId ? item.variantId.substring(0, 8) : t('admin.pages.sales.detail.itemsTable.defaultVariant') }}
                </td>
                <td class="ui-td text-sm text-right" style="color: var(--text-primary)">{{ item.quantity }}</td>
                <td class="ui-td text-sm text-right" style="color: var(--text-primary)">{{ formatCurrency(item.price) }}</td>
                <td class="ui-td text-sm font-semibold text-right" style="color: var(--text-primary)">
                  {{ formatCurrency(item.price * item.quantity) }}
                </td>
              </tr>
            </tbody>
          </table>
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

    <div v-else class="ui-card p-12 text-center">
      <Icon name="lucide:badge-dollar-sign" class="mx-auto h-12 w-12" style="color: var(--text-tertiary)" />
      <h3 class="mt-2 text-sm font-medium" style="color: var(--text-primary)">{{ t('admin.pages.sales.detail.notFound.title') }}</h3>
      <p class="mt-1 text-sm" style="color: var(--text-tertiary)">{{ t('admin.pages.sales.detail.notFound.hint') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'
import BaseInput from '~/components/ui/BaseInput.vue'
import BaseSelect from '~/components/ui/BaseSelect.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.sales.detail.metaTitle'
})

const authStore = useAuthStore()
const route = useRoute()
const { format: formatCurrency } = useCurrency()
const { t, locale } = useI18n({ useScope: 'global' })
const { showToast } = useToast()
const storeSettings = useState<any>('storeSettings')

const saleId = String(route.params.id || '')
const shouldPrint = computed(() => route.query.print === '1')

type SaleItem = {
  id: string
  productId: string
  variantId: string | null
  quantity: number
  price: number
  product?: { title: string }
}

type Sale = {
  id: string
  status: string
  source?: string
  type?: string
  totalAmount: number
  customerName: string | null
  customerPhone: string | null
  createdAt: string
  items: SaleItem[]
}

type Cashbox = {
  id: string
  name: string
  openSession?: { id: string } | null
}

const loading = ref(true)
const sale = ref<Sale | null>(null)
const cashboxes = ref<Cashbox[]>([])
const cashboxesLoaded = ref(false)
const refundModalOpen = ref(false)
const refundLoading = ref(false)
const invoiceLoading = ref(false)
const refundForm = reactive({
  cashboxId: '',
  method: 'CASH',
  reference: '',
  note: ''
})

const openCashboxes = computed(() => cashboxes.value.filter(c => !!c.openSession))
const canSubmitRefund = computed(() => !!sale.value && !!refundForm.cashboxId)
const salesInvoiceEnabled = computed(() => storeSettings.value?.salesInvoiceEnabled === true)

const normalizeStatus = (value: unknown) => String(value || '').trim().toUpperCase()
const normalizeType = (value: unknown) => String(value || '').trim().toUpperCase()

const normalizedSaleType = computed(() => normalizeType(sale.value?.type || sale.value?.source))
const normalizedSaleStatus = computed(() => normalizeStatus(sale.value?.status))

const isRefundableSale = computed(() => {
  return normalizedSaleType.value !== 'ORDER' && normalizedSaleStatus.value === 'COMPLETED'
})

const refundBlockedReason = computed(() => {
  if (normalizedSaleType.value === 'ORDER') return t('admin.pages.sales.messages.refundFromOrderFlow')
  if (normalizedSaleStatus.value === 'REFUNDED') return t('admin.pages.sales.messages.alreadyRefunded')
  return t('admin.pages.sales.messages.onlyCompletedPos')
})

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

async function openRefundModal() {
  if (!sale.value) return
  if (!isRefundableSale.value) {
    showToast(refundBlockedReason.value, 'info')
    return
  }
  await fetchCashboxes()
  if (openCashboxes.value.length === 0) {
    showToast(t('admin.pages.sales.messages.noOpenCashbox'), 'error')
    return
  }
  refundForm.cashboxId = openCashboxes.value[0]?.id || ''
  refundForm.method = 'CASH'
  refundForm.reference = ''
  refundForm.note = `sale_refund:${sale.value.id.substring(0, 8)}`
  refundModalOpen.value = true
}

function closeRefundModal() {
  if (refundLoading.value) return
  refundModalOpen.value = false
}

async function submitRefund() {
  if (!canSubmitRefund.value || !sale.value) return
  refundLoading.value = true
  try {
    await $fetch(`/api/admin/sales/${sale.value.id}/status`, {
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
    await fetchSale()
  } catch (e: any) {
    showToast(e?.data?.statusMessage || t('admin.pages.sales.messages.refundFailed'), 'error')
  } finally {
    refundLoading.value = false
  }
}

async function printSaleInvoice() {
  if (!process.client || !sale.value || !salesInvoiceEnabled.value) return
  invoiceLoading.value = true
  try {
    const blob = await $fetch(`/api/admin/sales/${sale.value.id}/invoice/pdf`, {
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
    invoiceLoading.value = false
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

async function fetchSale() {
  loading.value = true
  try {
    sale.value = await $fetch(`/api/admin/sales/${saleId}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    }) as Sale
    if (process.client && shouldPrint.value && sale.value) {
      await nextTick()
      window.print()
    }
  } catch {
    sale.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchSale()
})
</script>
