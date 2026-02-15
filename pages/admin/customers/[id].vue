<template>
  <div class="max-w-7xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <NuxtLink
          to="/admin/customers"
          class="inline-flex items-center text-sm text-slate-500 hover:text-slate-700"
        >
          <Icon name="lucide:arrow-left" class="w-4 h-4 mr-1" />
          {{ t('admin.nav.customers') }}
        </NuxtLink>
        <h2 class="text-2xl font-bold text-gray-800 mt-2">
          {{ summary?.name || t('admin.pages.customers.detail.fallbackTitle') }}
        </h2>
        <p class="text-gray-600 mt-1">
          {{ summary?.phone || '' }}
          <span v-if="summary?.address"> · {{ summary?.address }}</span>
        </p>
      </div>

      <div class="flex flex-wrap gap-3 justify-end">
        <div class="bg-white rounded-lg shadow px-4 py-3">
          <div class="text-xs text-gray-500">
            {{ t('admin.pages.customers.detail.stats.orders') }}
          </div>
          <div class="text-lg font-semibold text-gray-900">
            {{ sales.length }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow px-4 py-3">
          <div class="text-xs text-gray-500">
            {{ t('admin.pages.customers.detail.stats.totalSpent') }}
          </div>
          <div class="text-lg font-semibold text-gray-900">
            {{ formatCurrency(totalSpent) }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow px-4 py-3">
          <div class="text-xs text-gray-500">
            {{ t('admin.pages.customers.detail.stats.totalPaid') }}
          </div>
          <div class="text-lg font-semibold text-gray-900">
            {{ formatCurrency(totalPaid) }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow px-4 py-3">
          <div class="text-xs text-gray-500">
            {{ t('admin.pages.customers.detail.stats.currentBalance') }}
          </div>
          <div class="text-lg font-semibold" :class="currentBalance >= 0 ? 'text-amber-700' : 'text-emerald-700'">
            {{ formatCurrency(currentBalance) }}
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="loading"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      <p class="mt-2 text-gray-600">
        {{ t('admin.pages.customers.detail.loading') }}
      </p>
    </div>

    <div
      v-else-if="!summary"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <Icon name="lucide:users" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        {{ t('admin.pages.customers.detail.notFound.title') }}
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ t('admin.pages.customers.detail.notFound.hint') }}
      </p>
    </div>

    <div
      v-else-if="sales.length === 0 && payments.length === 0"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <Icon name="lucide:clipboard-list" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        {{ t('admin.pages.customers.detail.empty.title') }}
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ t('admin.pages.customers.detail.empty.hint') }}
      </p>
    </div>

    <div v-else class="space-y-6">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ t('admin.pages.customers.detail.stats.openingBalance') }}
          </h3>
          <button
            type="button"
            class="px-3 py-1.5 rounded-md text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
            :disabled="savingOpeningBalance"
            @click="saveOpeningBalance"
          >
            {{ savingOpeningBalance ? t('admin.common.saving') : t('admin.common.save') }}
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div class="md:col-span-1">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('admin.pages.customers.detail.stats.openingBalance') }}
            </label>
            <BaseInput
              v-model="openingBalanceInput"
              type="number"
              placeholder="0"
            />
          </div>
          <div class="md:col-span-2 text-sm text-gray-500">
            {{ t('admin.pages.customers.detail.stats.openingBalanceHint') }}
          </div>
        </div>
      </div>

      <div v-if="sales.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100">
          <h3 class="text-lg font-semibold text-gray-900">{{ t('admin.nav.salesItem') }}</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ t('admin.pages.customers.detail.table.order') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ t('admin.pages.customers.detail.table.total') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ t('admin.pages.customers.detail.table.status') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ t('admin.pages.customers.detail.table.date') }}
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ t('admin.pages.customers.detail.table.actions') }}
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="s in sales"
                :key="s.id"
                class="hover:bg-gray-50"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    #{{ s.id.substring(0, 8) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ formatCurrency(s.totalAmount) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    {{ s.status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(s.createdAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex items-center justify-end">
                    <NuxtLink
                      :to="`/admin/sales/${s.id}`"
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

      <div v-if="payments.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100">
          <h3 class="text-lg font-semibold text-gray-900">{{ t('admin.pages.customers.detail.stats.payments') }}</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ t('admin.pages.customers.detail.table.date') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ t('admin.pages.customers.detail.table.total') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ t('admin.pages.customers.detail.stats.method') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ t('admin.pages.customers.detail.stats.reference') }}
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ t('admin.pages.customers.detail.table.actions') }}
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="p in payments"
                :key="p.id"
                class="hover:bg-gray-50"
              >
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(p.createdAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-semibold text-gray-900">
                    {{ formatCurrency(p.amount) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {{ p.method }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ p.reference || '—' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex items-center justify-end">
                    <NuxtLink
                      v-if="p.saleId"
                      :to="`/admin/sales/${p.saleId}`"
                      class="inline-flex items-center text-teal-600 hover:text-teal-900 transition-colors"
                    >
                      <Icon name="lucide:eye" class="w-4 h-4 mr-1" />
                      <span>{{ t('common.view') }}</span>
                    </NuxtLink>
                    <span v-else class="text-gray-400">—</span>
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
import BaseInput from '~/components/ui/BaseInput.vue'

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

const loading = ref(true)
const savingOpeningBalance = ref(false)
const summary = ref<{
  id: string
  phone: string
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
const openingBalanceInput = ref('0')

const totalSpent = computed(() => sales.value.reduce((acc, o) => acc + (o.totalAmount || 0), 0))
const totalPaid = computed(() => payments.value.reduce((acc, p) => acc + (Number(p.amount) || 0), 0))
const currentBalance = computed(() => summary.value?.currentBalance ?? (summary.value ? summary.value.openingBalance + totalSpent.value - totalPaid.value : 0))

async function fetchCustomer() {
  loading.value = true
  try {
    const data = await $fetch<any>(`/api/admin/customers/${encodeURIComponent(customerId.value)}`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    summary.value = data.summary
    sales.value = data.sales ?? []
    payments.value = data.payments ?? []
    openingBalanceInput.value = summary.value ? String(summary.value.openingBalance ?? 0) : '0'
  } catch (error) {
    console.error('Failed to fetch customer:', error)
  } finally {
    loading.value = false
  }
}

async function saveOpeningBalance() {
  if (!summary.value) return
  savingOpeningBalance.value = true
  try {
    await $fetch(`/api/admin/customers/${encodeURIComponent(customerId.value)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { openingBalance: openingBalanceInput.value }
    })
    await fetchCustomer()
  } catch (error) {
    console.error('Failed to update opening balance:', error)
  } finally {
    savingOpeningBalance.value = false
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
