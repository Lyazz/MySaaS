<template>
  <div class="max-w-4xl mx-auto">
    <nav class="flex mb-6" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink to="/admin/sales" class="text-gray-700 hover:text-teal-600">
            Sales
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6 text-gray-400" />
            <span class="ml-1 text-gray-500">Sale #{{ saleId.substring(0, 8) }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <div v-if="loading" class="bg-white rounded-lg shadow p-12 text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      <p class="mt-2 text-gray-600">Loading sale...</p>
    </div>

    <div v-else-if="sale" class="space-y-6">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Sale Information</h2>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
            {{ sale.status }}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm font-medium text-gray-500">Sale ID</p>
            <p class="mt-1 text-sm text-gray-900">{{ sale.id }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Date</p>
            <p class="mt-1 text-sm text-gray-900">{{ formatDate(sale.createdAt) }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Client</h2>
        <div class="space-y-3">
          <div>
            <p class="text-sm font-medium text-gray-500">Name</p>
            <p class="mt-1 text-sm text-gray-900">{{ sale.customerName || 'Guest' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Phone</p>
            <p class="mt-1 text-sm text-gray-900">{{ sale.customerPhone || '-' }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Items</h2>
          <div class="text-sm font-semibold text-gray-900">{{ formatCurrency(sale.totalAmount) }}</div>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="item in sale.items" :key="item.id" class="hover:bg-gray-50">
                <td class="px-4 py-2 text-sm text-gray-900">
                  {{ item.product?.title || item.productId }}
                </td>
                <td class="px-4 py-2 text-sm text-gray-600">
                  {{ item.variantId ? item.variantId.substring(0, 8) : 'Default' }}
                </td>
                <td class="px-4 py-2 text-sm text-gray-900 text-right">{{ item.quantity }}</td>
                <td class="px-4 py-2 text-sm text-gray-900 text-right">{{ formatCurrency(item.price) }}</td>
                <td class="px-4 py-2 text-sm font-semibold text-gray-900 text-right">
                  {{ formatCurrency(item.price * item.quantity) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-else class="bg-white rounded-lg shadow p-12 text-center">
      <Icon name="lucide:badge-dollar-sign" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">Sale not found</h3>
      <p class="mt-1 text-sm text-gray-500">This sale may have been deleted.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Sale'
})

const authStore = useAuthStore()
const route = useRoute()
const { format: formatCurrency } = useCurrency()

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
  return date.toLocaleDateString('en-US', {
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
    sale.value = await $fetch<Sale>(`/api/admin/sales/pos/${saleId}`, {
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
