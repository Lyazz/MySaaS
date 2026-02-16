<template>
  <div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          {{ t('admin.nav.salesItem') }}
        </h2>
        <p class="mt-1 text-slate-600">
          {{ t('admin.pages.sales.index.subtitle') }}
        </p>
      </div>
    </div>

    <div class="ui-card p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('admin.pages.sales.index.filters.searchLabel') }}</label>
          <BaseInput
            v-model="searchQuery"
            :placeholder="t('admin.pages.sales.index.filters.searchPlaceholder')"
          />
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
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      <p class="mt-2 text-gray-600">
        {{ t('admin.pages.sales.index.loading') }}
      </p>
    </div>

    <div
      v-else-if="sales.length === 0"
      class="ui-card p-12 text-center"
    >
      <Icon name="lucide:badge-dollar-sign" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        {{ t('admin.pages.sales.index.empty.title') }}
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ emptyHint }}
      </p>
    </div>

    <div
      v-else
      class="ui-card overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="ui-table">
          <thead class="ui-thead">
            <tr>
              <th class="ui-th">
                {{ t('admin.pages.sales.index.table.saleId') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.sales.index.table.customer') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.sales.index.table.phone') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.sales.index.table.total') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.sales.index.table.completed') }}
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
              class="ui-tr"
            >
              <td class="ui-td whitespace-nowrap">
                <div class="font-medium text-slate-900">
                  #{{ sale.id.substring(0, 8) }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div class="text-slate-900">
                  {{ sale.customerName }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div class="text-slate-600">
                  {{ sale.customerPhone }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div class="font-medium text-slate-900">
                  {{ formatCurrency(sale.totalAmount) }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap text-sm text-slate-600">
                {{ formatDate(sale.updatedAt) }}
              </td>
              <td class="ui-td whitespace-nowrap text-right">
                <div class="flex items-center justify-end">
                  <NuxtLink
                    :to="`/admin/sales/${sale.id}`"
                    class="ui-btn ui-btn--secondary ui-btn--sm"
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
import BaseInput from '~/components/ui/BaseInput.vue'
import DateFilter from '~/components/ui/DateFilter.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.sales.index.title'
})

const authStore = useAuthStore()
const route = useRoute()
const { format: formatCurrency } = useCurrency()
const { t, locale } = useI18n({ useScope: 'global' })

interface Sale {
  id: string
  status: string
  type?: 'ORDER' | 'POS'
  totalAmount: number
  customerName: string
  customerPhone: string
  createdAt: string
  updatedAt: string
}

const loading = ref(true)
const sales = ref<Sale[]>([])
const searchQuery = ref(typeof route.query.search === 'string' ? route.query.search : '')
const startDate = ref('')
const endDate = ref('')

const emptyHint = computed(() => {
  if (searchQuery.value) return t('admin.pages.sales.index.empty.hintFiltered')
  return t('admin.pages.sales.index.empty.hint')
})

async function fetchSales() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchQuery.value) params.append('search', searchQuery.value)
    if (startDate.value) params.append('startDate', startDate.value)
    if (endDate.value) params.append('endDate', endDate.value)

    const queryString = params.toString()
    const url = `/api/admin/sales${queryString ? '?' + queryString : ''}`

    const data = await $fetch<Sale[]>(url, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    sales.value = data
  } catch (error) {
    console.error('Failed to fetch sales:', error)
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
  fetchSales()
})

watch([searchQuery, startDate, endDate], () => {
  fetchSales()
})
</script>
