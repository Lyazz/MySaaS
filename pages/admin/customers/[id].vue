<template>
  <div class="max-w-7xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <NuxtLink
          to="/admin/customers"
          class="inline-flex items-center text-sm hover:[color:var(--brand)]" style="color: var(--text-tertiary)"
        >
          <Icon name="lucide:arrow-left" class="w-4 h-4 me-1" />
          {{ t('admin.nav.customers') }}
        </NuxtLink>
        <div class="flex items-center gap-3 mt-2">
          <h2 class="text-2xl font-bold" style="color: var(--text-primary)">
            {{ summary?.name || t('admin.pages.customers.detail.fallbackTitle') }}
          </h2>
          <NuxtLink
            v-if="summary"
            :to="`/admin/customers/edit/${summary.id}`"
            class="inline-flex items-center px-3 py-1.5 shadow-sm text-sm font-medium rounded-md transition-colors" style="border: 1px solid var(--surface-border); color: var(--text-secondary); background: var(--surface-1)"
          >
            <Icon name="lucide:pencil" class="w-4 h-4 me-1.5" />
            {{ t('admin.common.edit') }}
          </NuxtLink>
        </div>
        <p class="mt-1" style="color: var(--text-secondary)">
          {{ summary?.phone || '' }}
          <span v-if="summary?.address"> · {{ summary?.address }}</span>
        </p>
        <p
          v-if="summary?.phoneNormalized"
          class="mt-1 text-sm"
          style="color: var(--text-tertiary)"
        >
          Brut: {{ summary?.phoneRaw || summary?.phone }} · Normalise: +{{ summary?.phoneNormalized }}
        </p>
      </div>

      <div class="flex flex-wrap gap-3 justify-end">
        <div class="ui-card px-4 py-3">
          <div class="text-xs" style="color: var(--text-tertiary)">
            {{ t('admin.pages.customers.detail.stats.orders') }}
          </div>
          <div class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ sales.length }}
          </div>
        </div>
        <div class="ui-card px-4 py-3">
          <div class="text-xs" style="color: var(--text-tertiary)">
            {{ t('admin.pages.customers.detail.stats.totalSpent') }}
          </div>
          <div class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ formatCurrency(totalSpent) }}
          </div>
        </div>
        <div class="ui-card px-4 py-3">
          <div class="text-xs" style="color: var(--text-tertiary)">
            {{ t('admin.pages.customers.detail.stats.totalPaid') }}
          </div>
          <div class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ formatCurrency(totalPaid) }}
          </div>
        </div>
        <div class="ui-card px-4 py-3">
          <div class="text-xs" style="color: var(--text-tertiary)">
            {{ t('admin.pages.customers.detail.stats.currentBalance') }}
          </div>
          <div class="text-lg font-semibold" :class="currentBalance >= 0 ? 'text-amber-700' : 'text-emerald-700'">
            {{ formatCurrency(currentBalance) }}
          </div>
        </div>
        <div class="ui-card px-4 py-3">
          <div class="text-xs" style="color: var(--text-tertiary)">
            Points disponibles
          </div>
          <div class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ pointsSummary.availablePoints }}
          </div>
        </div>
        <div class="ui-card px-4 py-3">
          <div class="text-xs" style="color: var(--text-tertiary)">
            Points consommes
          </div>
          <div class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ pointsSummary.redeemedPointsTotal }}
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="loading"
      class="ui-card p-12 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 [border-color:var(--brand)]" />
      <p class="mt-2" style="color: var(--text-secondary)">
        {{ t('admin.pages.customers.detail.loading') }}
      </p>
    </div>

    <div
      v-else-if="!summary"
      class="ui-card p-12 text-center"
    >
      <Icon name="lucide:users" class="mx-auto h-12 w-12" style="color: var(--text-tertiary)" />
      <h3 class="mt-2 text-sm font-medium" style="color: var(--text-primary)">
        {{ t('admin.pages.customers.detail.notFound.title') }}
      </h3>
      <p class="mt-1 text-sm" style="color: var(--text-tertiary)">
        {{ t('admin.pages.customers.detail.notFound.hint') }}
      </p>
    </div>

    <div
      v-else-if="sales.length === 0 && payments.length === 0"
      class="ui-card p-12 text-center"
    >
      <Icon name="lucide:clipboard-list" class="mx-auto h-12 w-12" style="color: var(--text-tertiary)" />
      <h3 class="mt-2 text-sm font-medium" style="color: var(--text-primary)">
        {{ t('admin.pages.customers.detail.empty.title') }}
      </h3>
      <p class="mt-1 text-sm" style="color: var(--text-tertiary)">
        {{ t('admin.pages.customers.detail.empty.hint') }}
      </p>
    </div>

    <div v-else class="space-y-6">
      <div class="ui-card overflow-hidden">
        <div class="px-6 py-4" style="border-bottom: 1px solid var(--surface-border)">
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">Points fidelite</h3>
        </div>
        <div class="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="rounded-xl border p-4" style="border-color: var(--surface-border); background: var(--surface-1)">
            <div class="text-xs" style="color: var(--text-tertiary)">Disponibles</div>
            <div class="mt-2 text-xl font-semibold" style="color: var(--text-primary)">{{ pointsSummary.availablePoints }}</div>
          </div>
          <div class="rounded-xl border p-4" style="border-color: var(--surface-border); background: var(--surface-1)">
            <div class="text-xs" style="color: var(--text-tertiary)">En attente</div>
            <div class="mt-2 text-xl font-semibold" style="color: var(--text-primary)">{{ pointsSummary.pendingRedeemPoints }}</div>
          </div>
          <div class="rounded-xl border p-4" style="border-color: var(--surface-border); background: var(--surface-1)">
            <div class="text-xs" style="color: var(--text-tertiary)">Gagnes</div>
            <div class="mt-2 text-xl font-semibold" style="color: var(--text-primary)">{{ pointsSummary.earnedPointsTotal }}</div>
          </div>
          <div class="rounded-xl border p-4" style="border-color: var(--surface-border); background: var(--surface-1)">
            <div class="text-xs" style="color: var(--text-tertiary)">Consommes</div>
            <div class="mt-2 text-xl font-semibold" style="color: var(--text-primary)">{{ pointsSummary.redeemedPointsTotal }}</div>
          </div>
        </div>
        <div v-if="pointItems.length > 0" class="overflow-x-auto">
          <table class="ui-table">
            <thead class="ui-thead">
              <tr>
                <th class="ui-th">Date</th>
                <th class="ui-th">Type</th>
                <th class="ui-th">Statut</th>
                <th class="ui-th">Source</th>
                <th class="ui-th text-end">Points</th>
              </tr>
            </thead>
            <tbody class="ui-tbody">
              <tr v-for="entry in pointItems" :key="entry.id" class="ui-tr">
                <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">{{ formatDate(entry.createdAt) }}</td>
                <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-primary)">{{ entry.direction }}</td>
                <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">{{ entry.status }}</td>
                <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">{{ entry.sourceType }} #{{ entry.sourceId.slice(0, 8) }}</td>
                <td class="ui-td whitespace-nowrap text-end font-semibold" :class="entry.direction === 'REDEEM' ? 'text-red-600' : 'text-emerald-700'">
                  {{ entry.direction === 'REDEEM' ? '-' : '+' }}{{ entry.points }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="sales.length > 0" class="ui-card overflow-hidden">
        <div class="px-6 py-4" style="border-bottom: 1px solid var(--surface-border)">
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">{{ t('admin.nav.salesItem') }}</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="ui-table">
            <thead class="ui-thead">
              <tr>
                <th class="ui-th">
                  {{ t('admin.pages.customers.detail.table.order') }}
                </th>
                <th class="ui-th">
                  {{ t('admin.pages.customers.detail.table.total') }}
                </th>
                <th class="ui-th">
                  {{ t('admin.pages.customers.detail.table.status') }}
                </th>
                <th class="ui-th">
                  {{ t('admin.pages.customers.detail.table.date') }}
                </th>
                <th class="ui-th text-end">
                  {{ t('admin.pages.customers.detail.table.actions') }}
                </th>
              </tr>
            </thead>
            <tbody class="ui-tbody">
              <tr
                v-for="s in sales"
                :key="s.id"
                class="ui-tr"
              >
                <td class="ui-td whitespace-nowrap">
                  <div class="font-medium" style="color: var(--text-primary)">
                    #{{ s.id.substring(0, 8) }}
                  </div>
                </td>
                <td class="ui-td whitespace-nowrap">
                  <div class="font-medium" style="color: var(--text-primary)">
                    {{ formatCurrency(s.totalAmount) }}
                  </div>
                </td>
                <td class="ui-td whitespace-nowrap">
                  <span class="ui-badge ui-badge--slate">
                    {{ s.status }}
                  </span>
                </td>
                <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                  {{ formatDate(s.createdAt) }}
                </td>
                <td class="ui-td whitespace-nowrap text-end">
                  <div class="flex items-center justify-end">
                    <NuxtLink
                      :to="`/admin/sales/${s.id}`"
                      class="ui-btn ui-btn--secondary ui-btn--sm"
                    >
                      <Icon name="lucide:eye" class="w-4 h-4 me-1" />
                      <span>{{ t('admin.common.view') }}</span>
                    </NuxtLink>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="payments.length > 0" class="ui-card overflow-hidden">
        <div class="px-6 py-4" style="border-bottom: 1px solid var(--surface-border)">
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">{{ t('admin.pages.customers.detail.stats.payments') }}</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="ui-table">
            <thead class="ui-thead">
              <tr>
                <th class="ui-th">
                  {{ t('admin.pages.customers.detail.table.date') }}
                </th>
                <th class="ui-th">
                  {{ t('admin.pages.customers.detail.table.total') }}
                </th>
                <th class="ui-th">
                  {{ t('admin.pages.customers.detail.stats.method') }}
                </th>
                <th class="ui-th">
                  {{ t('admin.pages.customers.detail.stats.reference') }}
                </th>
                <th class="ui-th text-end">
                  {{ t('admin.pages.customers.detail.table.actions') }}
                </th>
              </tr>
            </thead>
            <tbody class="ui-tbody">
              <tr
                v-for="p in payments"
                :key="p.id"
                class="ui-tr"
              >
                <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                  {{ formatDate(p.createdAt) }}
                </td>
                <td class="ui-td whitespace-nowrap">
                  <div class="text-sm font-semibold" style="color: var(--text-primary)">
                    {{ formatCurrency(p.amount) }}
                  </div>
                </td>
                <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                  {{ p.method }}
                </td>
                <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                  {{ p.reference || '—' }}
                </td>
                <td class="ui-td whitespace-nowrap text-end">
                  <div class="flex items-center justify-end">
                    <NuxtLink
                      v-if="p.saleId"
                      :to="`/admin/sales/${p.saleId}`"
                      class="ui-btn ui-btn--secondary ui-btn--sm"
                    >
                      <Icon name="lucide:eye" class="w-4 h-4 me-1" />
                      <span>{{ t('admin.common.view') }}</span>
                    </NuxtLink>
                    <span v-else style="color: var(--text-muted)">—</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.customers.detail.metaTitle'
})

const authStore = useAuthStore()
const route = useRoute()
const { format: formatCurrency } = useCurrency()
const { t, locale } = useI18n({ useScope: 'global' })

const customerId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))

interface CustomerSale {
  id: string
  status: string
  totalAmount: number
  customerName: string
  customerPhone: string
  customerAddress: string | null
  createdAt: string
  updatedAt: string
}

interface CustomerPayment {
  id: string
  amount: string | number
  currency: string
  method: string
  reference: string | null
  note: string | null
  saleId: string | null
  createdAt: string
}

interface CustomerPointLedgerEntry {
  id: string
  direction: 'EARN' | 'REDEEM' | 'ADJUST'
  status: 'PENDING' | 'AVAILABLE' | 'CANCELLED' | 'CONSUMED'
  sourceType: 'SALE' | 'ORDER' | 'MANUAL'
  sourceId: string
  points: number
  createdAt: string
}

interface CustomerDetailsResponse {
  summary: {
    id: string
    phone: string
    phoneRaw: string | null
    phoneNormalized: string
    name: string
    email: string | null
    address: string | null
    openingBalance: number
    currentBalance: number
    lastSaleAt: string | null
    lastSaleId: string | null
  } | null
  sales?: CustomerSale[]
  payments?: CustomerPayment[]
}

interface CustomerPointsResponse {
  summary?: {
    availablePoints?: number
    pendingRedeemPoints?: number
    earnedPointsTotal?: number
    redeemedPointsTotal?: number
  }
  items?: CustomerPointLedgerEntry[]
}

const loading = ref(true)
const summary = ref<{
  id: string
  phone: string
  phoneRaw: string | null
  phoneNormalized: string
  name: string
  email: string | null
  address: string | null
  openingBalance: number
  currentBalance: number
  lastSaleAt: string | null
  lastSaleId: string | null
} | null>(null)
const sales = ref<CustomerSale[]>([])
const payments = ref<CustomerPayment[]>([])
const pointsSummary = reactive({
  availablePoints: 0,
  pendingRedeemPoints: 0,
  earnedPointsTotal: 0,
  redeemedPointsTotal: 0
})
const pointItems = ref<CustomerPointLedgerEntry[]>([])

const totalSpent = computed(() => sales.value.reduce((acc, o) => acc + (o.totalAmount || 0), 0))
const totalPaid = computed(() => payments.value.reduce((acc, p) => acc + (Number(p.amount) || 0), 0))
const currentBalance = computed(() => summary.value?.currentBalance ?? (summary.value ? summary.value.openingBalance + totalSpent.value - totalPaid.value : 0))

async function fetchCustomer() {
  loading.value = true
  try {
    const [data, points] = await Promise.all([
      $fetch(`/api/admin/customers/${encodeURIComponent(customerId.value)}`, {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      }) as Promise<CustomerDetailsResponse>,
      $fetch(`/api/admin/customers/${encodeURIComponent(customerId.value)}/points`, {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      }).catch((): CustomerPointsResponse => ({ summary: { availablePoints: 0, pendingRedeemPoints: 0, earnedPointsTotal: 0, redeemedPointsTotal: 0 }, items: [] }))
    ])

    summary.value = data.summary
    sales.value = data.sales ?? []
    payments.value = data.payments ?? []
    pointsSummary.availablePoints = points.summary?.availablePoints ?? 0
    pointsSummary.pendingRedeemPoints = points.summary?.pendingRedeemPoints ?? 0
    pointsSummary.earnedPointsTotal = points.summary?.earnedPointsTotal ?? 0
    pointsSummary.redeemedPointsTotal = points.summary?.redeemedPointsTotal ?? 0
    pointItems.value = points.items ?? []
  } catch (error) {
    console.error('Failed to fetch customer:', error)
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

onMounted(() => {
  fetchCustomer()
})

watch([customerId], () => {
  fetchCustomer()
})
</script>
