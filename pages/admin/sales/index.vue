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
                {{ t('admin.pages.sales.index.table.user') }}
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
                <NuxtLink
                  :to="`/admin/sales/${sale.id}`"
                  class="font-medium text-slate-900 hover:text-teal-600 transition-colors"
                >
                  #{{ sale.id.substring(0, 8) }}
                </NuxtLink>
              </td>
              <td class="ui-td whitespace-nowrap">
                <NuxtLink
                  v-if="sale.customerId"
                  :to="`/admin/customers/${sale.customerId}`"
                  class="text-slate-900 hover:text-teal-600 transition-colors"
                >
                  {{ sale.customerName }}
                </NuxtLink>
                <div v-else class="text-slate-900">
                  {{ sale.customerName }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <a
                  v-if="sale.customerPhone"
                  :href="`tel:${sale.customerPhone}`"
                  class="text-slate-600 hover:text-teal-600 transition-colors"
                >
                  {{ sale.customerPhone }}
                </a>
                <div v-else class="text-slate-400">
                  -
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div class="font-medium text-slate-900">
                  {{ formatCurrency(sale.totalAmount) }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap text-sm text-slate-600">
                <a
                  v-if="sale.createdByEmail"
                  :href="`mailto:${sale.createdByEmail}`"
                  class="hover:text-teal-600 transition-colors"
                >
                  {{ sale.createdByEmail }}
                </a>
                <span v-else>System</span>
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

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6">
        <div class="flex flex-1 items-center justify-between sm:hidden">
          <button
            :disabled="currentPage === 1"
            class="ui-btn ui-btn--secondary ui-btn--sm"
            @click="currentPage--"
          >
            <Icon name="lucide:chevron-left" class="w-4 h-4" />
          </button>
          <span class="text-sm text-slate-600">
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
            <p class="text-sm text-slate-700">
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
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
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
                    ? 'z-10 bg-teal-50 border-teal-500 text-teal-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                ]"
                @click="currentPage = page"
              >
                {{ page }}
              </button>
              <button
                :disabled="currentPage === totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
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
import BaseInput from '~/components/ui/BaseInput.vue'
import BaseSelect from '~/components/ui/BaseSelect.vue'
import DateFilter from '~/components/ui/DateFilter.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.sales.index.title'
})

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const { format: formatCurrency } = useCurrency()

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

const loading = ref(true)
const sales = ref<Sale[]>([])
const total = ref(0)
const totalPages = ref(1)
const currentPage = ref(1)
const itemsPerPage = 25
const users = ref<{ id: string; email: string }[]>([])
const selectedUser = ref('')
const searchQuery = ref(typeof route.query.search === 'string' ? route.query.search : '')
const today = new Date()
const lastWeek = new Date(today)
lastWeek.setDate(lastWeek.getDate() - 7)

const startDate = ref(lastWeek.toISOString().split('T')[0])
const endDate = ref(today.toISOString().split('T')[0])

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
    if (selectedUser.value) params.append('userId', selectedUser.value)
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
  fetchUsers()
  fetchSales()
})

watch([searchQuery, startDate, endDate, selectedUser], () => {
  currentPage.value = 1
  fetchSales()
})

watch(currentPage, () => {
  fetchSales()
})
</script>
