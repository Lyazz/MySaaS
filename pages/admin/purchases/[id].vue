<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <NuxtLink
            to="/admin/purchases"
            class="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            {{ t('admin.nav.purchases') }}
          </NuxtLink>
          <Icon
            name="lucide:chevron-right"
            class="w-4 h-4 text-slate-400"
          />
          <span class="text-sm font-medium text-slate-900">{{ t('admin.pages.purchases.detail.breadcrumb', { id: purchaseId.slice(0, 8) }) }}</span>
        </div>
        <div class="flex items-center gap-3">
          <h2 class="text-2xl font-bold text-slate-900">
            {{ t('admin.pages.purchases.detail.title') }}
          </h2>
          <span :class="getStatusClass(order?.status || '')">
            {{ order?.status }}
          </span>
          <span :class="getPaymentStatusClass(order?.paymentStatus || '')">
            {{ order?.paymentStatus || 'UNPAID' }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="order?.supplier && order?.paymentStatus !== 'PAID'"
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700 shadow-sm hover:bg-teal-100 transition-colors"
          @click="openPaymentModal"
        >
          <Icon name="lucide:banknote" class="h-4 w-4" />
          {{ t('admin.common.recordPayment', 'Record Payment') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          :disabled="loading"
          @click="fetchOrder"
        >
          <Icon
            name="lucide:refresh-cw"
            class="h-4 w-4"
            :class="loading ? 'animate-spin' : ''"
          />
          {{ t('admin.common.refresh') }}
        </button>
        <button
          type="button"
          class="ui-btn ui-btn--primary ui-btn--md"
          @click="showVariantModal = true"
        >
          <Icon
            name="lucide:plus"
            class="h-4 w-4"
          />
          {{ t('admin.pages.purchases.detail.addProducts') }}
        </button>
      </div>
    </div>

    <!-- Error Message -->
    <div
      v-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start"
    >
      <Icon
        name="lucide:alert-circle"
        class="w-5 h-5 mr-2 flex-shrink-0"
      />
      {{ errorMessage }}
    </div>

    <!-- Info Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Supplier Info -->
      <div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          {{ t('admin.pages.purchases.detail.cards.supplier') }}
        </h3>
        <div
          v-if="order?.supplier"
          class="space-y-2"
        >
          <div class="text-lg font-medium text-slate-900">
            {{ order.supplier.name }}
          </div>
          <div
            v-if="order.supplier.email"
            class="text-sm text-slate-600 flex items-center gap-2"
          >
            <Icon
              name="lucide:mail"
              class="w-4 h-4"
            /> {{ order.supplier.email }}
          </div>
          <div
            v-if="order.supplier.phone"
            class="text-sm text-slate-600 flex items-center gap-2"
          >
            <Icon
              name="lucide:phone"
              class="w-4 h-4"
            /> {{ order.supplier.phone }}
          </div>
        </div>
        <div
          v-else
          class="text-sm text-slate-500 italic"
        >
          {{ t('admin.pages.purchases.detail.cards.noSupplier') }}
        </div>
      </div>
      
      <!-- Order Summary -->
      <div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          {{ t('admin.pages.purchases.detail.cards.summary') }}
        </h3>
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-slate-600">{{ t('admin.pages.purchases.detail.cards.itemsOrdered') }}:</span>
            <span class="font-medium text-slate-900">{{ totalOrdered }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-600">{{ t('admin.pages.purchases.detail.cards.itemsReceived') }}:</span>
            <span
              class="font-medium"
              :class="totalReceived === totalOrdered ? 'text-green-600' : 'text-orange-600'"
            >{{ totalReceived }}</span>
          </div>
          <div class="flex justify-between text-sm pt-2 border-t border-slate-100">
            <span class="text-slate-600">{{ t('admin.pages.purchases.detail.cards.estimatedTotal') }}:</span>
            <span class="font-medium text-slate-900">{{ formatCurrency(Number(order?.totalAmount || totalCost)) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-600">{{ t('admin.pages.purchases.detail.cards.paidAmount', 'Paid Amount') }}:</span>
            <span class="font-medium text-emerald-600">{{ formatCurrency(Number(order?.paidAmount || 0)) }}</span>
          </div>
          <div class="flex justify-between text-sm pt-2 border-t border-slate-100">
            <span class="text-slate-600">{{ t('admin.pages.purchases.detail.cards.balance', 'Balance') }}:</span>
            <span class="font-medium text-slate-900">{{ formatCurrency(Number(order?.totalAmount || totalCost) - Number(order?.paidAmount || 0)) }}</span>
          </div>
          <div class="flex justify-between text-sm pt-2 border-t border-slate-100">
            <span class="text-slate-600">{{ t('admin.pages.purchases.index.table.user') }}:</span>
            <span class="font-medium text-slate-900">{{ order?.createdByEmail || 'System' }}</span>
          </div>
        </div>
      </div>

      <!-- Actions/Notes (Placeholder for future) -->
      <div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-center items-center text-center">
        <Icon
          name="lucide:file-text"
          class="w-8 h-8 text-slate-300 mb-2"
        />
        <p class="text-sm text-slate-500">
          {{ t('admin.pages.purchases.detail.cards.notesPlaceholder') }}
        </p>
      </div>
    </div>


    <!-- Order Items -->
    <div class="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
      <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <h3 class="font-medium text-slate-900">
          {{ t('admin.pages.purchases.detail.items.title') }}
        </h3>
        <div class="flex items-center gap-3">
          <button
            v-if="hasItemsToReceive"
            type="button"
            class="text-sm font-medium text-teal-600 hover:text-teal-700 bg-teal-50 px-2 py-1 rounded"
            :disabled="receiving"
            @click="receiveAll"
          >
            {{ t('admin.common.receiveAll', 'Receive All') }}
          </button>
          <span class="text-sm text-slate-500">{{ t('admin.pages.purchases.detail.items.count', { count: order?.items?.length || 0 }) }}</span>
        </div>
      </div>

      <div
        v-if="loading && !order"
        class="p-12 text-center text-sm text-slate-600"
      >
        {{ t('admin.pages.purchases.detail.items.loading') }}
      </div>
      <div
        v-else-if="!order?.items || order.items.length === 0"
        class="p-12 text-center"
      >
        <Icon
          name="lucide:shopping-cart"
          class="mx-auto h-12 w-12 text-slate-300 mb-3"
        />
        <h3 class="text-slate-900 font-medium mb-1">
          {{ t('admin.pages.purchases.detail.items.empty.title') }}
        </h3>
        <p class="text-slate-500 text-sm mb-4">
          {{ t('admin.pages.purchases.detail.items.empty.hint') }}
        </p>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
          @click="showVariantModal = true"
        >
          <Icon
            name="lucide:plus"
            class="h-4 w-4"
          />
          {{ t('admin.pages.purchases.detail.addProducts') }}
        </button>
      </div>

      <div
        v-else
        class="overflow-x-auto"
      >
        <div class="mb-4 flex flex-wrap gap-4 items-center px-6 pt-4 text-sm bg-slate-50 border-b border-slate-200" v-if="order?.items?.length > 0">
          <div class="flex items-center gap-2">
            <span class="text-slate-500 font-medium">{{ t('admin.pages.purchases.detail.items.table.costMode.label') }}</span>
            <select
              v-model="costMode"
              class="text-sm border-slate-300 rounded-md py-1 pl-2 pr-8 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="replace">{{ t('admin.pages.purchases.detail.items.table.costMode.replace') }}</option>
              <option value="weighted">{{ t('admin.pages.purchases.detail.items.table.costMode.weighted') }}</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-500 font-medium">{{ t('admin.pages.purchases.detail.items.table.salePriceMode.label') }}</span>
            <select
              v-model="salePriceMode"
              class="text-sm border-slate-300 rounded-md py-1 pl-2 pr-8 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="replace">{{ t('admin.pages.purchases.detail.items.table.salePriceMode.replace') }}</option>
              <option value="weighted">{{ t('admin.pages.purchases.detail.items.table.salePriceMode.weighted') }}</option>
            </select>
          </div>
        </div>

        <table class="ui-table border-t-0">
          <thead class="ui-thead">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-[20%]">
                {{ t('admin.pages.purchases.detail.items.table.product') }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-[15%]">
                {{ t('admin.pages.purchases.detail.items.table.ordered') }} / {{ t('admin.pages.purchases.detail.items.table.received') }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-[15%]">
                {{ t('admin.pages.purchases.detail.items.table.unitCost') }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-[15%]">
                {{ t('admin.pages.purchases.detail.items.table.salePrice') }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-[20%]">
                {{ t('admin.pages.purchases.detail.items.table.receiveNow') }}
              </th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 w-[15%]">
                {{ t('admin.pages.purchases.detail.items.table.total') }}
              </th>
            </tr>
          </thead>
          <tbody class="ui-tbody">
            <tr
              v-for="item in order.items"
              :key="item.id"
              class="ui-tr group"
            >
              <!-- Product Info -->
              <td class="px-4 py-3 align-top">
                <div>
                  <div class="font-medium text-slate-900 truncate max-w-[200px]" :title="item.variant?.product?.title || t('admin.pages.purchases.detail.items.unknownProduct')">
                    {{ item.variant?.product?.title || t('admin.pages.purchases.detail.items.unknownProduct') }}
                  </div>
                  <div class="text-xs text-slate-500">
                    {{ getVariantLabel(item.variant) }}
                  </div>
                  <div v-if="item.variant?.sku" class="text-xs text-slate-400 mt-0.5 font-mono">
                    {{ item.variant.sku }}
                  </div>
                </div>
              </td>
              
              <!-- Qty: Ordered / Received -->
              <td class="px-4 py-3 align-top">
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center gap-2">
                    <input
                      v-if="item.quantityReceived === 0"
                      v-model.number="editingItems[item.id].quantityOrdered"
                      type="number"
                      min="1"
                      class="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm text-center shadow-sm focus:border-teal-500 focus:ring-teal-500"
                      @change="updateItem(item)"
                    >
                    <span v-else class="text-sm font-medium text-slate-900 w-16 text-center inline-block">
                      {{ item.quantityOrdered }}
                    </span>
                    <span class="text-slate-400">/</span>
                    <span
                      class="text-sm font-medium w-16 text-center inline-block"
                      :class="item.quantityReceived >= item.quantityOrdered ? 'text-green-600' : 'text-slate-600'"
                    >
                      {{ item.quantityReceived }}
                    </span>
                  </div>
                  
                  <div class="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden" v-if="item.quantityOrdered > 0">
                    <div
                      class="bg-teal-500 h-1 transition-all duration-300"
                      :style="`width: ${Math.min((item.quantityReceived / item.quantityOrdered) * 100, 100)}%`"
                    />
                  </div>
                </div>
              </td>
              
              <!-- Unit Cost -->
              <td class="px-4 py-3 align-top">
                <div class="flex flex-col gap-1">
                  <input
                    v-if="item.quantityReceived === 0"
                    v-model="editingItems[item.id].unitCost"
                    type="text"
                    class="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm text-right shadow-sm focus:border-teal-500 focus:ring-teal-500"
                    placeholder="0.00"
                    @change="updateItem(item)"
                  >
                  <span v-else class="text-sm text-slate-900 block pt-1">
                    {{ item.unitCost ? formatCurrency(item.unitCost) : '—' }}
                  </span>
                  
                  <div class="flex flex-col gap-1 mt-0.5">
                    <div class="text-[11px] text-slate-400">
                      Actuel: {{ formatCurrency(Number(item.variant?.cost || 0)) }}
                    </div>
                    <!-- New Cost Preview Badge (only if changed and receiving) -->
                    <div 
                      v-if="item.quantityReceived < item.quantityOrdered && getCostPreview(item) != item.variant?.cost && getCostPreview(item) > 0" 
                      class="inline-flex max-w-fit items-center bg-blue-50 text-blue-700 text-[10px] font-medium px-1.5 py-0.5 rounded border border-blue-100 whitespace-nowrap"
                      title="Nouveau prix moyen"
                    >
                      {{ formatMoneyOrDash(getCostPreview(item)) }} (Nouveau)
                    </div>
                  </div>
                </div>
              </td>
              
              <!-- Sale Price -->
              <td class="px-4 py-3 align-top">
                <div class="flex flex-col gap-1">
                  <input
                    v-if="item.quantityReceived === 0"
                    v-model="editingItems[item.id].salePrice"
                    type="text"
                    class="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm text-right shadow-sm focus:border-teal-500 focus:ring-teal-500"
                    placeholder="—"
                    @change="updateItem(item)"
                  >
                  <span v-else class="text-sm text-slate-900 block pt-1">
                    {{ item.salePrice ? formatCurrency(item.salePrice) : '—' }}
                  </span>
                  <div class="text-[11px] text-slate-400 mt-0.5">
                    Actuel: {{ formatCurrency(Number(item.variant?.price || 0)) }}
                  </div>
                </div>
              </td>
              
              <!-- Receive Actions -->
              <td class="px-4 py-3 align-top">
                <div class="flex items-start gap-1.5">
                  <input
                    v-model.number="receiveQtyByItem[item.id]"
                    type="number"
                    min="0"
                    :max="Math.max(0, item.quantityOrdered - item.quantityReceived)"
                    class="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm text-center shadow-sm focus:border-teal-500 focus:ring-teal-500"
                    placeholder="Qté"
                    :disabled="item.quantityReceived >= item.quantityOrdered"
                  >
                  
                  <div class="flex flex-col gap-1 w-full max-w-[130px]">
                    <button
                      type="button"
                      class="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed border border-teal-100 text-xs font-medium transition-colors"
                      :title="t('admin.common.receive')"
                      :disabled="receiving || item.quantityReceived >= item.quantityOrdered || !receiveQtyByItem[item.id] || receiveQtyByItem[item.id] <= 0"
                      @click="receiveItem(item)"
                    >
                      <Icon name="lucide:package-check" class="w-3.5 h-3.5" />
                      {{ t('admin.common.receive', 'Receive') }}
                    </button>
                  </div>
                </div>
              </td>
              
              <!-- Total & Row Actions -->
              <td class="px-4 py-3 align-top text-right">
                <div class="flex flex-col items-end gap-2">
                  <span class="text-sm font-semibold text-slate-800">
                    {{ formatCurrency(Number(editingItems[item.id]?.unitCost || 0) * (editingItems[item.id]?.quantityOrdered || item.quantityOrdered)) }}
                  </span>
                  
                  <button
                    v-if="item.quantityReceived === 0"
                    class="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    :title="t('admin.pages.purchases.detail.items.table.removeItem')"
                    @click="removeItem(item)"
                  >
                    <Icon name="lucide:trash-2" class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot class="bg-slate-50 font-semibold text-slate-900 border-t border-slate-200">
            <tr>
              <td colspan="5" class="px-4 py-4 text-right">
                {{ t('admin.pages.purchases.detail.items.table.totalOrderValue') }}
              </td>
              <td class="px-4 py-4 text-right text-base text-teal-700">
                {{ formatCurrency(totalCost) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Actions/Notes -->
    <AdminConfirmModal
      v-model="showDeleteOrderModal"
      :title="t('admin.pages.purchases.detail.deleteModal.title')"
      :message="t('admin.pages.purchases.detail.deleteModal.message')"
      :confirm-text="t('admin.pages.purchases.detail.deleteModal.confirm')"
      :cancel-text="t('admin.common.cancel')"
      @confirm="deleteOrder"
    />

    <!-- Payment Modal -->
    <div v-if="paymentModalOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="closePaymentModal">
      <div class="flex min-h-screen items-center justify-center px-4">
        <div class="fixed inset-0 bg-black/50" @click="closePaymentModal" />
        <div class="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ t('admin.pages.purchases.detail.paymentModal.title') }}
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            {{ t('admin.pages.purchases.detail.paymentModal.subtitle') }}
          </p>

          <div v-if="!order?.supplier?.id" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {{ t('admin.pages.purchases.detail.paymentModal.supplierRequired') }}
          </div>

          <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <BaseSelect
                v-model="paymentForm.cashboxId"
                :label="t('admin.pages.purchases.detail.paymentModal.cashboxLabel')"
              >
                <option value="">{{ t('admin.pages.purchases.detail.paymentModal.cashboxAuto') }}</option>
                <option v-for="c in cashboxes" :key="c.id" :value="c.id" :disabled="!c.openSession">
                  {{ c.name }}{{ !c.openSession ? ` (${t('admin.pages.purchases.detail.paymentModal.noOpenSession')})` : '' }}
                </option>
              </BaseSelect>
            </div>

            <div class="sm:col-span-2">
              <BaseInput
                v-model="paymentForm.amount"
                :label="t('admin.pages.purchases.detail.paymentModal.amountLabel')"
                placeholder="0"
              />
            </div>

            <div class="sm:col-span-2">
              <BaseSelect
                v-model="paymentForm.method"
                :label="t('admin.pages.purchases.detail.paymentModal.methodLabel')"
              >
                <option value="CASH">{{ t('admin.pages.cash.methods.CASH') }}</option>
                <option value="CARD">{{ t('admin.pages.cash.methods.CARD') }}</option>
                <option value="TRANSFER">{{ t('admin.pages.cash.methods.TRANSFER') }}</option>
                <option value="OTHER">{{ t('admin.pages.cash.methods.OTHER') }}</option>
              </BaseSelect>
            </div>

            <div class="sm:col-span-2">
              <BaseInput
                v-model="paymentForm.reference"
                :label="t('admin.pages.purchases.detail.paymentModal.referenceLabel')"
                :placeholder="t('admin.pages.purchases.detail.paymentModal.referencePlaceholder')"
              />
            </div>

            <div class="sm:col-span-2">
              <BaseInput
                v-model="paymentForm.note"
                :label="t('admin.pages.purchases.detail.paymentModal.noteLabel')"
                :placeholder="t('admin.pages.purchases.detail.paymentModal.notePlaceholder')"
              />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="closePaymentModal"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              :disabled="savingPayment || !canSubmitPayment"
              @click="submitPayment"
            >
              {{ savingPayment ? t('admin.common.updating') : t('admin.pages.purchases.detail.paymentModal.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="flex justify-end mt-8">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors"
        @click="showDeleteOrderModal = true"
      >
        <Icon
          name="lucide:trash-2"
          class="h-4 w-4"
        />
        {{ t('admin.pages.purchases.detail.deleteModal.confirm') }}
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
import BaseInput from '~/components/ui/BaseInput.vue'
import BaseSelect from '~/components/ui/BaseSelect.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.purchases.detail.metaTitle'
})

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const purchaseId = route.params.id as string
const { t } = useI18n({ useScope: 'global' })

const order = ref<any>(null)
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const showVariantModal = ref(false)
const showDeleteOrderModal = ref(false)
const receiving = ref(false)
const savingPayment = ref(false)
const costMode = ref<'replace' | 'weighted'>('replace')
const salePriceMode = ref<'replace' | 'weighted'>('replace')
const receiveQtyByItem = reactive<Record<string, number>>({})
const cashboxes = ref<Array<{ id: string; name: string; openSession?: any | null }>>([])
const cashboxesLoaded = ref(false)
const paymentModalOpen = ref(false)
const paymentForm = reactive({
  cashboxId: '',
  amount: '',
  method: 'CASH',
  reference: '',
  note: ''
})

const hasItemsToReceive = computed(() => {
  if (!order.value?.items) return false
  return order.value.items.some((i: any) => i.quantityReceived < i.quantityOrdered)
})

// Track editing state for items to debounce updates
const editingItems = reactive<Record<string, { quantityOrdered: number; unitCost: string; salePrice: string }>>({})

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
        unitCost: String(item.unitCost ?? ''),
        salePrice: item.salePrice ? String(item.salePrice) : ''
      }
    })

  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || t('admin.pages.purchases.detail.errors.loadFailed')
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
    errorMessage.value = t('admin.pages.purchases.detail.errors.addItemsFailed')
    console.error(e)
  }
}

const receiveItem = async (item: any) => {
  const qty = receiveQtyByItem[item.id]
  if (!qty || qty <= 0) return
  const edit = editingItems[item.id]

  receiving.value = true
  errorMessage.value = null

  try {
    await $fetch(`/api/admin/purchases/${purchaseId}/receive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        costMode: costMode.value,
        salePriceMode: salePriceMode.value,
        items: [
          {
            itemId: item.id,
            quantityReceived: qty,
            unitCost: edit?.unitCost,
            salePrice: edit?.salePrice?.trim() ? edit.salePrice.trim() : undefined
          }
        ]
      }
    })

    await fetchOrder()
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || t('admin.pages.purchases.detail.errors.receiveFailed')
  } finally {
    receiving.value = false
  }
}

const receiveAll = async () => {
  if (!order.value?.items) return
  
  const itemsToReceive = order.value.items
    .filter((i: any) => i.quantityReceived < i.quantityOrdered)
    .map((item: any) => {
      const edit = editingItems[item.id]
      return {
        itemId: item.id,
        quantityReceived: item.quantityOrdered - item.quantityReceived,
        unitCost: edit?.unitCost ?? item.unitCost,
        salePrice: edit?.salePrice?.trim() ? edit.salePrice.trim() : undefined
      }
    })

  if (itemsToReceive.length === 0) return

  receiving.value = true
  errorMessage.value = null

  try {
    await $fetch(`/api/admin/purchases/${purchaseId}/receive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        costMode: costMode.value,
        salePriceMode: salePriceMode.value,
        items: itemsToReceive
      }
    })

    await fetchOrder()
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || t('admin.pages.purchases.detail.errors.receiveFailed')
  } finally {
    receiving.value = false
  }
}

const toMoneyString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}

const fetchCashboxes = async () => {
  if (cashboxesLoaded.value) return
  try {
    const rows = await $fetch<any[]>('/api/admin/cashboxes', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    cashboxes.value = (rows || []).map((c: any) => ({ id: c.id, name: c.name, openSession: c.openSession }))
    cashboxesLoaded.value = true
  } catch {
    cashboxes.value = []
  }
}

const openPaymentModal = async () => {
  paymentForm.cashboxId = ''
  paymentForm.method = 'CASH'
  paymentForm.reference = ''
  paymentForm.note = ''

  const balance = Number(order.value?.totalAmount || totalCost.value) - Number(order.value?.paidAmount || 0)
  paymentForm.amount = balance > 0 ? String(balance) : ''

  paymentModalOpen.value = true
  await fetchCashboxes()
}

const closePaymentModal = () => {
  paymentModalOpen.value = false
}

const canSubmitPayment = computed(() => {
  if (!order.value?.supplier?.id) return false
  const amountStr = toMoneyString(paymentForm.amount)
  const amount = amountStr ? Number(amountStr) : NaN
  return Number.isFinite(amount) && amount > 0
})

const submitPayment = async () => {
  if (!canSubmitPayment.value) return

  savingPayment.value = true
  errorMessage.value = null

  try {
    await $fetch('/api/admin/cash-transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        cashboxId: paymentForm.cashboxId || undefined,
        type: 'SUPPLIER_PAYMENT',
        direction: 'OUT',
        amount: paymentForm.amount,
        supplierId: order.value?.supplier?.id,
        purchaseOrderId: purchaseId,
        method: paymentForm.method,
        reference: paymentForm.reference,
        note: paymentForm.note
      }
    })

    closePaymentModal()
    await fetchOrder()
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || t('admin.pages.purchases.detail.errors.receiveFailed')
  } finally {
    savingPayment.value = false
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
        unitCost: edit.unitCost,
        salePrice: edit.salePrice?.trim() ? edit.salePrice.trim() : null
      }
    })
    // Refresh to ensure sync
    await fetchOrder()
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || t('admin.pages.purchases.detail.errors.updateItemFailed')
  }
}

const removeItem = async (item: any) => {
    if (!confirm(t('admin.pages.purchases.detail.errors.removeConfirm'))) return
    
    try {
        await $fetch(`/api/admin/purchases/${purchaseId}/items/${item.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authStore.token}` }
        })
        await fetchOrder()
    } catch (e: any) {
         errorMessage.value = e?.data?.statusMessage || t('admin.pages.purchases.detail.errors.removeItemFailed')
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
         errorMessage.value = e?.data?.statusMessage || t('admin.pages.purchases.detail.errors.deleteFailed')
    }
}

const getVariantLabel = (variant: any) => {
  const vals = variant?.optionValues || []
  if (!Array.isArray(vals) || vals.length === 0) return t('admin.pages.purchases.detail.items.defaultVariant')
  return vals.map((v: any) => v.optionValue?.label || '?').join(' / ')
}

const { format: formatCurrency } = useCurrency()

const getStatusClass = (status: string) => {
  const base = 'px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full '
  switch (status.toLowerCase()) {
    case 'completed':
    case 'received':
      return base + 'bg-green-100 text-green-800'
    case 'partially_received':
    case 'pending':
    case 'ordered':
      return base + 'bg-yellow-100 text-yellow-800'
    case 'cancelled':
      return base + 'bg-red-100 text-red-800'
    default:
      return base + 'bg-gray-100 text-gray-800'
  }
}

const getPaymentStatusClass = (status: string) => {
  const base = 'px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full '
  switch (status?.toLowerCase()) {
    case 'paid':
      return base + 'bg-green-100 text-green-800'
    case 'partially_paid':
      return base + 'bg-yellow-100 text-yellow-800'
    default:
      return base + 'bg-gray-100 text-gray-800'
  }
}

const parseMoney = (value: unknown): number | null => {
  if (value === undefined || value === null) return null
  const n = typeof value === 'number' ? value : Number(String(value))
  if (!Number.isFinite(n)) return null
  return n
}

const getCostPreview = (item: any): number | null => {
  const edit = editingItems[item.id]
  const receiptQty = receiveQtyByItem[item.id] ?? 0
  const newUnitCost = parseMoney(edit?.unitCost ?? item.unitCost)
  if (newUnitCost === null) return null
  if (costMode.value === 'replace' || receiptQty <= 0) return newUnitCost

  const oldQty = Number(item?.variant?.stock ?? 0)
  const oldCost = parseMoney(item?.variant?.cost ?? 0) ?? 0
  const denom = oldQty + receiptQty
  if (denom <= 0) return newUnitCost
  return (oldCost * oldQty + newUnitCost * receiptQty) / denom
}

const formatMoneyOrDash = (value: number | null) => {
  if (value === null) return '—'
  return formatCurrency(value)
}

onMounted(fetchOrder)
</script>
