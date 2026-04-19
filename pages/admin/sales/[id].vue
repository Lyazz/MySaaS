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
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
            {{ sale.status }}
          </span>
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

    <div v-else class="ui-card p-12 text-center">
      <Icon name="lucide:badge-dollar-sign" class="mx-auto h-12 w-12" style="color: var(--text-tertiary)" />
      <h3 class="mt-2 text-sm font-medium" style="color: var(--text-primary)">{{ t('admin.pages.sales.detail.notFound.title') }}</h3>
      <p class="mt-1 text-sm" style="color: var(--text-tertiary)">{{ t('admin.pages.sales.detail.notFound.hint') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.sales.detail.metaTitle'
})

const authStore = useAuthStore()
const route = useRoute()
const { format: formatCurrency } = useCurrency()
const { t, locale } = useI18n({ useScope: 'global' })

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
  totalAmount: number
  customerName: string | null
  customerPhone: string | null
  createdAt: string
  items: SaleItem[]
}

const loading = ref(true)
const sale = ref<Sale | null>(null)

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
    sale.value = await $fetch<Sale>(`/api/admin/sales/${saleId}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    if (process.client && shouldPrint.value && sale.value) {
      await nextTick()
      window.print()
    }
  } catch (e) {
    sale.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchSale()
})
</script>
