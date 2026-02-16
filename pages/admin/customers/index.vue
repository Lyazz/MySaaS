<template>
  <div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">
          {{ t('admin.nav.customers') }}
        </h2>
        <p class="text-gray-600 mt-1">
          {{ t('admin.pages.customers.index.subtitle') }}
        </p>
      </div>
    </div>

    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('admin.pages.customers.index.filters.searchLabel') }}</label>
          <BaseInput
            v-model="searchQuery"
            :placeholder="t('admin.pages.customers.index.filters.searchPlaceholder')"
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
        {{ t('admin.pages.customers.index.loading') }}
      </p>
    </div>

    <div
      v-else-if="customers.length === 0"
      class="ui-card p-12 text-center"
    >
      <Icon name="lucide:users" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        {{ t('admin.pages.customers.index.empty.title') }}
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
                {{ t('admin.pages.customers.index.table.customer') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.customers.index.table.phone') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.customers.index.table.orders') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.customers.index.table.totalSpent') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.customers.index.table.lastOrder') }}
              </th>
              <th class="ui-th text-right">
                {{ t('admin.pages.customers.index.table.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="ui-tbody">
            <tr
              v-for="c in customers"
              :key="c.id"
              class="ui-tr"
            >
              <td class="ui-td whitespace-nowrap">
                <div class="font-medium text-slate-900">
                  {{ c.name }}
                </div>
                <div
                  v-if="c.address"
                  class="text-xs text-slate-500 truncate max-w-[28rem]"
                >
                  {{ c.address }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div class="text-slate-600">
                  {{ c.phone }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div class="font-medium text-slate-900">
                  {{ c.ordersCount }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div class="font-medium text-slate-900">
                  {{ formatCurrency(c.totalSpent) }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap text-slate-600">
                {{ formatDate(c.lastOrderAt) }}
              </td>
              <td class="ui-td whitespace-nowrap text-right">
                <div class="flex items-center justify-end">
                  <NuxtLink
                    :to="`/admin/customers/${encodeURIComponent(c.id)}`"
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

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.customers.index.title'
})

const authStore = useAuthStore()
const route = useRoute()
const { format: formatCurrency } = useCurrency()
const { t, locale } = useI18n({ useScope: 'global' })

interface CustomerSummary {
  id: string
  phone: string
  name: string
  address: string | null
  ordersCount: number
  totalSpent: number
  lastOrderAt: string | null
  lastOrderId: string | null
}

const loading = ref(true)
const customers = ref<CustomerSummary[]>([])
const searchQuery = ref(typeof route.query.search === 'string' ? route.query.search : '')

const emptyHint = computed(() => {
  if (searchQuery.value) return t('admin.pages.customers.index.empty.hintFiltered')
  return t('admin.pages.customers.index.empty.hint')
})

async function fetchCustomers() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchQuery.value) params.append('search', searchQuery.value)

    const queryString = params.toString()
    const url = `/api/admin/customers${queryString ? '?' + queryString : ''}`

    const data = await $fetch<CustomerSummary[]>(url, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    customers.value = data
  } catch (error) {
    console.error('Failed to fetch customers:', error)
  } finally {
    loading.value = false
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  const intlLocale = locale.value === 'fr' ? 'fr-FR' : locale.value === 'ar' ? 'ar-DZ' : 'en-US'
  return date.toLocaleDateString(intlLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

onMounted(() => {
  fetchCustomers()
})

watch([searchQuery], () => {
  fetchCustomers()
})
</script>
