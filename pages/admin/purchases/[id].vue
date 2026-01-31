<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <NuxtLink to="/admin/purchases" class="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            Purchases
          </NuxtLink>
          <Icon name="lucide:chevron-right" class="w-4 h-4 text-slate-400" />
          <span class="text-sm font-medium text-slate-900">Order #{{ purchaseId.slice(0, 8) }}</span>
        </div>
        <div class="flex items-center gap-3">
          <h2 class="text-2xl font-bold text-slate-900">
            Purchase Order
          </h2>
          <span :class="getStatusClass(order?.status || '')">
            {{ order?.status }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          :disabled="loading"
          @click="fetchOrder"
        >
          <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
          Refresh
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
          @click="showVariantModal = true"
        >
          <Icon name="lucide:plus" class="h-4 w-4" />
          Add Products
        </button>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start">
      <Icon name="lucide:alert-circle" class="w-5 h-5 mr-2 flex-shrink-0" />
      {{ errorMessage }}
    </div>

    <!-- Info Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Supplier Info -->
      <div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Supplier</h3>
        <div v-if="order?.supplier" class="space-y-2">
          <div class="text-lg font-medium text-slate-900">{{ order.supplier.name }}</div>
          <div class="text-sm text-slate-600 flex items-center gap-2" v-if="order.supplier.email">
            <Icon name="lucide:mail" class="w-4 h-4" /> {{ order.supplier.email }}
          </div>
          <div class="text-sm text-slate-600 flex items-center gap-2" v-if="order.supplier.phone">
            <Icon name="lucide:phone" class="w-4 h-4" /> {{ order.supplier.phone }}
          </div>
        </div>
        <div v-else class="text-sm text-slate-500 italic">
          No supplier assigned
        </div>
      </div>
      
      <!-- Order Summary -->
       <div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Summary</h3>
        <div class="space-y-2">
             <div class="flex justify-between text-sm">
                <span class="text-slate-600">Items Ordered:</span>
                <span class="font-medium text-slate-900">{{ totalOrdered }}</span>
             </div>
             <div class="flex justify-between text-sm">
                <span class="text-slate-600">Items Received:</span>
                <span class="font-medium" :class="totalReceived === totalOrdered ? 'text-green-600' : 'text-orange-600'">{{ totalReceived }}</span>
             </div>
             <div class="flex justify-between text-sm pt-2 border-t border-slate-100">
                <span class="text-slate-600">Estimated Total Cost:</span>
                <span class="font-medium text-slate-900">{{ formatCurrency(totalCost) }}</span>
             </div>
        </div>
      </div>

       <!-- Actions/Notes (Placeholder for future) -->
       <div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-center items-center text-center">
            <Icon name="lucide:file-text" class="w-8 h-8 text-slate-300 mb-2" />
            <p class="text-sm text-slate-500">Notes & attachments coming soon</p>
      </div>
    </div>


    <!-- Order Items -->
    <div class="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
      <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 class="font-medium text-slate-900">Order Items</h3>
          <span class="text-sm text-slate-500">{{ order?.items?.length || 0 }} items</span>
      </div>

      <div v-if="loading && !order" class="p-12 text-center text-sm text-slate-600">Loading order items...</div>
      <div v-else-if="!order?.items || order.items.length === 0" class="p-12 text-center">
        <Icon name="lucide:shopping-cart" class="mx-auto h-12 w-12 text-slate-300 mb-3" />
        <h3 class="text-slate-900 font-medium mb-1">No items yet</h3>
        <p class="text-slate-500 text-sm mb-4">Add products to this purchase order.</p>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
          @click="showVariantModal = true"
        >
          <Icon name="lucide:plus" class="h-4 w-4" />
          Add Products
        </button>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Product</th>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Ordered</th>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Unit Cost</th>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Received</th>
               <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-48">Receive Now</th>
              <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 bg-white">
            <tr v-for="item in order.items" :key="item.id" class="hover:bg-slate-50">
              <td class="px-6 py-4">
                <div>
                    <div class="font-medium text-slate-900">{{ item.variant?.product?.title || 'Unknown Product' }}</div>
                    <div class="text-sm text-slate-500">{{ getVariantLabel(item.variant) }}</div>
                    <div class="text-xs text-slate-400 mt-0.5">SKU: {{ item.variant?.sku || '—' }}</div>
                </div>
              </td>
              <td class="px-6 py-4">
                 <div class="flex items-center">
                     <input
                        v-if="item.quantityReceived === 0"
                        v-model.number="editingItems[item.id].quantityOrdered"
                        type="number"
                        min="1"
                        class="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-teal-500 focus:ring-teal-500"
                        @change="updateItem(item)"
                     />
                     <span v-else class="text-sm font-medium text-slate-900">{{ item.quantityOrdered }}</span>
                 </div>
              </td>
              <td class="px-6 py-4">
                  <div class="flex items-center">
                      <input
                        v-if="item.quantityReceived === 0"
                        v-model="editingItems[item.id].unitCost"
                        type="text"
                        class="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-teal-500 focus:ring-teal-500"
                        placeholder="0.00"
                        @change="updateItem(item)"
                      />
                      <span v-else class="text-sm text-slate-900">{{ item.unitCost ? formatCurrency(item.unitCost) : '—' }}</span>
                  </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm font-medium" :class="item.quantityReceived >= item.quantityOrdered ? 'text-green-600' : 'text-slate-900'">
                    {{ item.quantityReceived }} / {{ item.quantityOrdered }}
                </div>
                 <!-- Progress Bar -->
                <div class="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                    <div
                        class="bg-teal-600 h-1.5 rounded-full"
                        :style="`width: ${Math.min((item.quantityReceived / item.quantityOrdered) * 100, 100)}%`"
                    ></div>
                </div>
              </td>
               <td class="px-6 py-4">
                   <div class="flex items-center gap-2">
                        <input
                            type="number"
                            min="0"
                            :max="Math.max(0, item.quantityOrdered - item.quantityReceived)"
                            v-model.number="receiveQtyByItem[item.id]"
                            class="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-teal-500 focus:ring-teal-500"
                            placeholder="Qty"
                            :disabled="item.quantityReceived >= item.quantityOrdered"
                        />
                        <button
                            type="button"
                            class="p-2 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Receive Stock"
                            :disabled="receiving || item.quantityReceived >= item.quantityOrdered || !receiveQtyByItem[item.id] || receiveQtyByItem[item.id] <= 0"
                            @click="receiveItem(item)"
                        >
                            <Icon name="lucide:check" class="w-4 h-4" />
                        </button>
                   </div>
                   <div class="mt-1">
                      <select v-model="salePriceMode" class="text-xs text-slate-500 border-none bg-transparent p-0 focus:ring-0 cursor-pointer hover:text-slate-700">
                          <option value="replace">Update Sell Price</option>
                          <option value="weighted">Avg Cost</option>
                      </select>
                   </div>
              </td>
              <td class="px-6 py-4 text-right text-sm font-medium text-slate-900">
                 <div class="flex items-center justify-end gap-3">
                    <span>{{ formatCurrency((editingItems[item.id]?.unitCost || 0) * (editingItems[item.id]?.quantityOrdered || item.quantityOrdered)) }}</span>
                    <button
                        v-if="item.quantityReceived === 0"
                        @click="removeItem(item)"
                        class="text-red-400 hover:text-red-600 transition-colors"
                        title="Remove Item"
                    >
                        <Icon name="lucide:trash" class="w-4 h-4" />
                    </button>
                 </div>
              </td>
            </tr>
          </tbody>
           <tfoot class="bg-slate-50 font-semibold text-slate-900">
            <tr>
              <td colspan="5" class="px-6 py-3 text-right">Total Order Value</td>
              <td class="px-6 py-3 text-right">{{ formatCurrency(totalCost) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Actions/Notes -->
    <AdminConfirmModal
      v-model="showDeleteOrderModal"
      title="Delete Purchase Order"
      message="Are you sure you want to delete this purchase order? This action cannot be undone."
      confirm-text="Delete Order"
      cancel-text="Cancel"
      @confirm="deleteOrder"
    />

    <div class="flex justify-end mt-8">
        <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors"
            @click="showDeleteOrderModal = true"
        >
            <Icon name="lucide:trash-2" class="h-4 w-4" />
            Delete Order
        </button>
    </div>

    <!-- Variant Selector Modal -->
    <VariantSelectorModal
      v-model="showVariantModal"
      @select="addVariants"
    />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import VariantSelectorModal from '~/components/admin/VariantSelectorModal.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Purchase Order'
})

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const purchaseId = route.params.id as string

const order = ref<any>(null)
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const showVariantModal = ref(false)
const showDeleteOrderModal = ref(false)
const receiving = ref(false)
const salePriceMode = ref<'replace' | 'weighted'>('replace')

const receiveQtyByItem = reactive<Record<string, number>>({})

// Track editing state for items to debounce updates
const editingItems = reactive<Record<string, { quantityOrdered: number, unitCost: string }>>({})

const totalOrdered = computed(() => order.value?.items?.reduce((acc: number, item: any) => acc + item.quantityOrdered, 0) || 0)
const totalReceived = computed(() => order.value?.items?.reduce((acc: number, item: any) => acc + item.quantityReceived, 0) || 0)
const totalCost = computed(() => order.value?.items?.reduce((acc: number, item: any) => acc + ((item.unitCost || 0) * item.quantityOrdered), 0) || 0)

const fetchOrder = async () => {
  loading.value = true
  errorMessage.value = null
  try {
    order.value = await $fetch(`/api/admin/purchases/${purchaseId}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    
    // Reset inputs
    Object.keys(receiveQtyByItem).forEach(key => delete receiveQtyByItem[key])
    Object.keys(editingItems).forEach(key => delete editingItems[key])

    order.value?.items?.forEach((item: any) => {
        const remaining = Math.max(0, item.quantityOrdered - item.quantityReceived)
        if (remaining > 0) {
            receiveQtyByItem[item.id] = remaining
        }
        editingItems[item.id] = {
            quantityOrdered: item.quantityOrdered,
            unitCost: item.unitCost
        }
    })

  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || 'Failed to load purchase'
  } finally {
    loading.value = false
  }
}

const addVariants = async (variants: any[]) => {
  errorMessage.value = null
  try {
      const promises = variants.map(v => 
         $fetch(`/api/admin/purchases/${purchaseId}/items`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: {
                variantId: v.id,
                quantityOrdered: 1, 
                unitCost: 0,
            }
         })
      )
      
      await Promise.all(promises)
      await fetchOrder()
      
  } catch (e: any) {
    errorMessage.value = 'Failed to add items. Some items may have been skipped.'
    console.error(e)
  }
}

const receiveItem = async (item: any) => {
    const qty = receiveQtyByItem[item.id]
    if (!qty || qty <= 0) return
    
    receiving.value = true
    errorMessage.value = null
    
    try {
        await $fetch(`/api/admin/purchases/${purchaseId}/receive`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: {
                salePriceMode: salePriceMode.value,
                items: [{ itemId: item.id, quantityReceived: qty }]
            }
        })
        
        await fetchOrder()
    } catch (e: any) {
        errorMessage.value = e?.data?.statusMessage || 'Failed to receive stock'
    } finally {
        receiving.value = false
    }
}

const updateItem = async (item: any) => {
    const edit = editingItems[item.id]
    if (!edit) return

    // Simple validation
    if (edit.quantityOrdered < 1) return
    
    try {
        await $fetch(`/api/admin/purchases/${purchaseId}/items/${item.id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: {
                quantityOrdered: edit.quantityOrdered,
                unitCost: edit.unitCost
            }
        })
        // Refresh to ensure sync
        await fetchOrder()
    } catch (e: any) {
        errorMessage.value = e?.data?.statusMessage || 'Failed to update item'
    }
}

const removeItem = async (item: any) => {
    if (!confirm('Are you sure you want to remove this item?')) return
    
    try {
        await $fetch(`/api/admin/purchases/${purchaseId}/items/${item.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authStore.token}` }
        })
        await fetchOrder()
    } catch (e: any) {
         errorMessage.value = e?.data?.statusMessage || 'Failed to remove item'
    }
}

const deleteOrder = async () => {
    try {
        await $fetch(`/api/admin/purchases/${purchaseId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authStore.token}` }
        })
        router.push('/admin/purchases')
    } catch (e: any) {
         errorMessage.value = e?.data?.statusMessage || 'Failed to delete order'
    }
}

const getVariantLabel = (variant: any) => {
  const vals = variant?.optionValues || []
  if (!Array.isArray(vals) || vals.length === 0) return 'Default Variant'
  return vals.map((v: any) => v.optionValue?.label || '?').join(' / ')
}

const { format: formatCurrency } = useCurrency()

const getStatusClass = (status: string) => {
  const base = 'px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full '
  switch (status.toLowerCase()) {
    case 'completed':
    case 'received':
      return base + 'bg-green-100 text-green-800'
    case 'pending':
    case 'ordered':
      return base + 'bg-yellow-100 text-yellow-800'
    case 'cancelled':
      return base + 'bg-red-100 text-red-800'
    default:
      return base + 'bg-gray-100 text-gray-800'
  }
}

onMounted(fetchOrder)
</script>
