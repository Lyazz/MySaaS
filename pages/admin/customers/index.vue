<template>
  <div class="max-w-7xl mx-auto">
    <AdminPageHeader
      :title="t('admin.nav.customers')"
      :subtitle="t('admin.pages.customers.index.subtitle')"
      :stats="customerStats"
    >
      <NuxtLink
        to="/admin/customers/create"
        class="ui-btn ui-btn--primary ui-btn--md"
      >
        <Icon name="lucide:plus" class="w-5 h-5" />
        <span>{{ t('admin.pages.customers.index.addCustomer') }}</span>
      </NuxtLink>
    </AdminPageHeader>

    <!-- Tab filter -->
    <AdminTabFilter v-model="activeTab" :tabs="customerTabs" />

    <div class="ui-card p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="ui-label mb-1">{{ t('admin.pages.customers.index.filters.searchLabel') }}</label>
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
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 [border-color:var(--brand)]" />
      <p class="mt-2" style="color: var(--text-secondary)">
        {{ t('admin.pages.customers.index.loading') }}
      </p>
    </div>

    <div
      v-else-if="filteredCustomers.length === 0"
      class="ui-card p-12 text-center"
    >
      <Icon name="lucide:users" class="mx-auto h-12 w-12" style="color: var(--text-tertiary)" />
      <h3 class="mt-2 text-sm font-medium" style="color: var(--text-primary)">
        {{ t('admin.pages.customers.index.empty.title') }}
      </h3>
      <p class="mt-1 text-sm" style="color: var(--text-tertiary)">
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
                {{ t('admin.pages.customers.index.table.info') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.customers.index.table.address') }}
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
              <th class="ui-th text-end">
                {{ t('admin.pages.customers.index.table.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="ui-tbody">
            <tr
              v-for="c in paginatedCustomers"
              :key="c.id"
              class="ui-tr ui-tr--clickable"
              role="link"
              tabindex="0"
              :aria-label="`${t('admin.pages.customers.index.table.customer')}: ${c.name}`"
              @click="openCustomerRow($event, c.id)"
              @keydown.enter="openCustomerRow($event, c.id)"
              @keydown.space="openCustomerRow($event, c.id)"
            >
              <td class="ui-td whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10 [background:rgba(var(--brand-rgb)/0.12)] rounded-full flex items-center justify-center [color:var(--brand)] font-bold uppercase">
                    {{ c.name.charAt(0) }}
                  </div>
                  <div class="ms-4">
                    <NuxtLink
                      :to="`/admin/customers/${c.id}`"
                      class="font-medium hover:[color:var(--brand)] transition-colors" style="color: var(--text-primary)"
                    >
                      {{ c.name }}
                    </NuxtLink>
                  </div>
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div class="flex flex-col text-sm" style="color: var(--text-secondary)">
                  <div v-if="c.email" class="flex items-center gap-1">
                    <Icon name="lucide:mail" class="w-3 h-3" style="color: var(--text-tertiary)" />
                    <a
                      :href="`mailto:${c.email}`"
                      class="hover:[color:var(--brand)] transition-colors"
                    >
                      {{ c.email }}
                    </a>
                  </div>
                  <div v-if="c.phone" class="flex items-center gap-1 mt-1">
                    <Icon name="lucide:phone" class="w-3 h-3" style="color: var(--text-tertiary)" />
                    <a
                      :href="`tel:${c.phone}`"
                      class="hover:[color:var(--brand)] transition-colors"
                    >
                      {{ c.phone }}
                    </a>
                  </div>
                  <span v-if="!c.email && !c.phone" style="color: var(--text-muted)">—</span>
                </div>
              </td>
              <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                <a
                  v-if="c.address"
                  :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`"
                  target="_blank"
                  class="hover:[color:var(--brand)] transition-colors"
                >
                  {{ c.address }}
                </a>
                <span v-else style="color: var(--text-muted)">—</span>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div class="font-medium" style="color: var(--text-primary)">
                  {{ c.ordersCount }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div class="font-medium" style="color: var(--text-primary)">
                  {{ formatCurrency(c.totalSpent) }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap" style="color: var(--text-secondary)">
                {{ formatDate(c.lastOrderAt) }}
              </td>
              <td class="ui-td whitespace-nowrap text-end">
                <div class="flex items-center justify-end space-x-1 rtl:space-x-reverse">
                  <NuxtLink
                    :to="`/admin/customers/${encodeURIComponent(c.id)}`"
                    class="ui-table-action"
                    :title="t('admin.common.view')"
                  >
                    <Icon name="lucide:eye" class="w-4 h-4" />
                  </NuxtLink>
                  <NuxtLink
                    :to="`/admin/customers/edit/${c.id}`"
                    class="ui-table-action"
                    :title="t('admin.common.edit')"
                  >
                    <Icon name="lucide:pencil" class="w-4 h-4" />
                  </NuxtLink>
                  <button
                    class="ui-table-action ui-table-action--danger"
                    :title="t('admin.common.delete')"
                    @click="confirmDelete(c)"
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
                to: Math.min(currentPage * itemsPerPage, filteredCustomers.length),
                total: filteredCustomers.length
              }) }}
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                :disabled="currentPage === 1"
                class="relative inline-flex items-center px-2 py-2 rounded-s-md text-sm font-medium disabled:opacity-50"
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
                class="relative inline-flex items-center px-2 py-2 rounded-e-md text-sm font-medium disabled:opacity-50"
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

    <!-- Delete Confirmation Modal -->
    <AdminConfirmModal
      v-model="showDeleteModal"
      :title="t('admin.pages.customers.index.deleteModal.title')"
      :message="deleteMessage"
      :confirm-text="t('admin.common.delete')"
      :cancel-text="t('admin.common.cancel')"
      :error="deleteError"
      @confirm="handleDelete"
      @update:model-value="val => { if (!val) deleteError = null }"
    />
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
const router = useRouter()
const { format: formatCurrency } = useCurrency()
const { t, locale } = useI18n({ useScope: 'global' })

interface CustomerSummary {
  id: string
  phone: string
  name: string
  email: string | null
  address: string | null
  ordersCount: number
  totalSpent: number
  lastOrderAt: string | null
  lastOrderId: string | null
}

const loading = ref(true)
const customers = ref<CustomerSummary[]>([])
const searchQuery = ref(typeof route.query.search === 'string' ? route.query.search : '')
const activeTab = ref(typeof route.query.tab === 'string' ? route.query.tab : 'all')

const currentPage = ref(Number(route.query.page) || 1)
const itemsPerPage = 25

const showDeleteModal = ref(false)
const customerToDelete = ref<CustomerSummary | null>(null)
const deleteError = ref<string | null>(null)

const deleteMessage = computed(() => {
  if (customerToDelete.value?.name) {
    return t('admin.pages.customers.index.deleteModal.messageWithName', { name: customerToDelete.value.name })
  }
  return t('admin.pages.customers.index.deleteModal.message')
})

const emptyHint = computed(() => {
  if (searchQuery.value) return t('admin.pages.customers.index.empty.hintFiltered')
  return t('admin.pages.customers.index.empty.hint')
})

const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

const customerStats = computed(() => {
  const totalOrders = customers.value.reduce((sum, c) => sum + (c.ordersCount ?? 0), 0)
  const recent = customers.value.filter(c => c.lastOrderDate && new Date(c.lastOrderDate) >= thirtyDaysAgo).length
  return [
    { label: 'total', value: customers.value.length },
    { label: 'orders', value: totalOrders, tone: 'blue' as const },
    { label: 'active (30d)', value: recent, tone: 'green' as const },
  ]
})

const customerTabs = computed(() => [
  { key: 'all', label: 'All', count: customers.value.length },
  { key: 'recent', label: 'Active (30d)', count: customers.value.filter(c => c.lastOrderDate && new Date(c.lastOrderDate) >= thirtyDaysAgo).length },
])

const filteredCustomers = computed(() => {
  let result = customers.value

  if (activeTab.value === 'recent') {
    result = result.filter(c => c.lastOrderDate && new Date(c.lastOrderDate) >= thirtyDaysAgo)
  }

  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return result
  return result.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.email?.toLowerCase().includes(q) ?? false) ||
    (c.phone?.toLowerCase().includes(q) ?? false)
  )
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredCustomers.value.length / itemsPerPage)))
const paginatedCustomers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredCustomers.value.slice(start, start + itemsPerPage)
})

async function fetchCustomers() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchQuery.value) params.append('search', searchQuery.value)

    const queryString = params.toString()
    const url = `/api/admin/customers${queryString ? '?' + queryString : ''}`

    const data = await $fetch(url, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    customers.value = data as CustomerSummary[]
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

function confirmDelete(customer: CustomerSummary) {
  customerToDelete.value = customer
  showDeleteModal.value = true
  deleteError.value = null
}

function openCustomerRow(event: Event, customerId: string) {
  if (shouldIgnoreRowClick(event)) return
  if (event instanceof KeyboardEvent) event.preventDefault()
  navigateTo(`/admin/customers/${encodeURIComponent(customerId)}`)
}

async function handleDelete() {
  if (!customerToDelete.value) return

  try {
    await $fetch(`/api/admin/customers/${customerToDelete.value.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    customers.value = customers.value.filter((c) => c.id !== customerToDelete.value?.id)
    customerToDelete.value = null
    showDeleteModal.value = false
    deleteError.value = null
  } catch (error: any) {
    console.error('Failed to delete customer:', error)
    const status = error?.response?.status || error?.statusCode
    const msg = error?.data?.statusMessage || error?.response?.data?.statusMessage
    if (status === 409 || msg === 'HAS_TRANSACTIONS') {
      deleteError.value = t('admin.pages.customers.index.deleteModal.errorHasTransactions')
    } else {
      deleteError.value = t('admin.pages.customers.index.deleteModal.error')
    }
  }
}

onMounted(() => {
  fetchCustomers()
})

function syncToUrl() {
  router.replace({
    query: {
      ...route.query,
      search: searchQuery.value || undefined,
      tab: activeTab.value === 'all' ? undefined : activeTab.value,
      page: currentPage.value > 1 ? String(currentPage.value) : undefined
    }
  })
}

watch([searchQuery], () => {
  currentPage.value = 1
  syncToUrl()
  fetchCustomers()
})

watch(activeTab, () => {
  currentPage.value = 1
  syncToUrl()
})

watch(currentPage, () => {
  syncToUrl()
})
</script>
