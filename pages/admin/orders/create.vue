<template>
  <div class="h-[calc(100vh-4rem)] relative flex overflow-hidden bg-slate-100">
    <div class="flex-1 flex flex-col min-w-0 bg-slate-100 transition-all duration-300">
      
      <!-- Top header -->
      <header class="bg-white border-b border-slate-200 p-3 md:p-4 flex items-center gap-3 shrink-0 z-10 sticky top-0">
        <NuxtLink
          to="/admin/orders"
          class="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          :title="t('admin.nav.orders')"
        >
          <Icon name="lucide:arrow-left" class="w-5 h-5" />
        </NuxtLink>
        <h1 class="text-xl font-bold text-slate-800">
          {{ t('admin.pages.orders.create.title') }}
        </h1>
      </header>

      <!-- Main container (two columns on desktop) -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:flex lg:gap-6">
        
        <!-- Left Column: Details -->
        <div class="flex-1 space-y-6 max-w-4xl max-w-full">
          <!-- Customer Selection / Details -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200">
            <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
              <h2 class="font-bold text-slate-800 flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                  <Icon name="lucide:user" class="w-4 h-4" />
                </div>
                {{ t('admin.pages.orders.create.customerSection') }}
              </h2>
            </div>
            
            <div class="p-4 md:p-5 space-y-4">
               <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">
                    {{ t('admin.pages.orders.create.searchCustomer') }}
                  </label>
                  <BaseSelect
                    v-model="form.customerId"
                    @update:model-value="onCustomerSelected"
                  >
                    <option value="">
                      -- {{ t('admin.pages.orders.create.newCustomer') }} --
                    </option>
                    <option
                      v-for="c in customers"
                      :key="c.id"
                      :value="c.id"
                    >
                      {{ c.name }} {{ c.phone ? `(${c.phone})` : '' }}
                    </option>
                  </BaseSelect>
               </div>

               <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">
                      {{ t('admin.pages.orders.create.customerName') }} <span class="text-red-500">*</span>
                    </label>
                    <BaseInput
                      v-model="form.customerName"
                      type="text"
                      required
                      :disabled="!!form.customerId"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">
                      {{ t('admin.pages.orders.create.customerPhone') }}
                    </label>
                    <BaseInput
                      v-model="form.customerPhone"
                      type="tel"
                      dir="ltr"
                      :disabled="!!form.customerId"
                    />
                  </div>
               </div>
            </div>
          </div>

          <!-- Shipping Details -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200">
            <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
              <h2 class="font-bold text-slate-800 flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Icon name="lucide:truck" class="w-4 h-4" />
                </div>
                {{ t('admin.pages.orders.create.shippingSection') }}
              </h2>
            </div>
            
            <div class="p-4 md:p-5 space-y-4">
               <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label class="block text-sm font-medium text-slate-700 mb-1">
                       {{ t('admin.pages.orders.create.shippingProvider') }}
                     </label>
                       <BaseSelect v-model="form.shippingProvider">
                       <option value="">{{ t('admin.common.noneSelected') }}</option>
                       <option value="YALIDINE">Yalidine</option>
                       <option value="MAYSTRO">Maystro</option>
                       <option value="SELF">{{ t('admin.pages.orders.create.selfDelivery') }}</option>
                     </BaseSelect>
                  </div>
                  <div>
                     <label class="block text-sm font-medium text-slate-700 mb-1">
                       {{ t('admin.pages.orders.create.deliveryMode') }}
                     </label>
                     <BaseSelect v-model="form.deliveryMode">
                        <option value="home">{{ t('admin.pages.orders.create.modes.home') }}</option>
                        <option value="desk">{{ t('admin.pages.orders.create.modes.desk') }}</option>
                     </BaseSelect>
                  </div>
               </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">
                      {{ t('admin.pages.orders.create.wilaya') }}
                    </label>
                    <BaseSelect v-model="form.shippingWilayaCode">
                        <option value="">{{ t('admin.common.noneSelected') }}</option>
                        <option v-for="w in wilayas" :key="w.code" :value="w.code">{{ w.name }}</option>
                    </BaseSelect>
                  </div>
                  <div>
                     <label class="block text-sm font-medium text-slate-700 mb-1">
                       {{ t('admin.pages.orders.create.commune') }}
                     </label>
                     <BaseSelect
                       v-if="form.shippingProvider === 'MAYSTRO'"
                       v-model="form.shippingCommuneCode"
                       :disabled="!form.shippingWilayaCode || maystroCommuneLoading"
                     >
                       <option value="">
                         {{
                           !form.shippingWilayaCode
                             ? t('admin.pages.orders.create.wilaya')
                             : maystroCommuneLoading
                               ? t('admin.common.loading')
                               : t('admin.common.noneSelected')
                         }}
                       </option>
                       <option
                         v-for="c in maystroCommunes"
                         :key="String(c.id)"
                         :value="String(c.id)"
                       >
                         {{ c.id }} - {{ c.name }}
                       </option>
                     </BaseSelect>
                     <BaseInput v-else v-model="form.shippingCommuneCode" type="text" />
                     <p
                       v-if="form.shippingProvider === 'MAYSTRO' && maystroCommuneError"
                       class="mt-1 text-xs text-amber-700"
                     >
                       {{ maystroCommuneError }}
                     </p>
                  </div>
               </div>

               <div>
                 <label class="block text-sm font-medium text-slate-700 mb-1">
                   {{ t('admin.pages.orders.create.address') }}
                 </label>
                 <BaseInput v-model="form.shippingAddressLine1" type="text" />
               </div>
               
               <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">
                    {{ t('admin.pages.orders.create.notes') }}
                  </label>
                  <textarea
                    v-model="form.shippingNotes"
                    rows="2"
                    class="block w-full rounded-lg border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm transition-colors p-2.5"
                  />
               </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Cart & Summary -->
        <div class="w-full lg:w-[450px] space-y-6 mt-6 lg:mt-0 shrink-0">
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-[calc(100vh-8rem)]">
            <div class="p-4 border-b border-slate-200 bg-slate-50/50 rounded-t-xl flex justify-between items-center">
              <h2 class="font-bold text-slate-800 flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Icon name="lucide:shopping-bag" class="w-4 h-4" />
                </div>
                {{ t('admin.pages.orders.create.itemsSection') }}
              </h2>
            </div>

            <!-- Product Search input inside cart panel to quickly add -->
            <div class="p-4 border-b border-slate-100 bg-white">
               <div class="relative group">
                  <Icon
                    name="lucide:search"
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"
                  />
                  <input
                    v-model="productSearch"
                    type="text"
                    :placeholder="t('admin.pages.pos.catalog.searchPlaceholder')"
                    class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all text-sm"
                  >
                  <!-- Search Results Dropdown -->
                  <div 
                    v-if="productSearch.length > 0" 
                    class="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg z-50 max-h-60 overflow-y-auto"
                  >
                     <div 
                      v-for="product in searchedProducts" 
                      :key="product.id"
                      class="p-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer flex items-center gap-3"
                      @click="addProductToCart(product)"
                     >
                        <div class="w-10 h-10 rounded bg-slate-100 overflow-hidden shrink-0">
                           <img 
                            v-if="product.images && product.images.length > 0" 
                            :src="product.images[0]" 
                            class="w-full h-full object-cover"
                           >
                        </div>
                        <div class="flex-1 min-w-0">
                           <div class="font-medium text-sm text-slate-800 truncate">{{ product.title }}</div>
                           <div class="text-xs text-slate-500">{{ formatCurrency(product.price) }}</div>
                        </div>
                     </div>
                     <div v-if="searchedProducts.length === 0" class="p-4 text-center text-sm text-slate-500">
                        {{ t('admin.pages.pos.catalog.noProducts') }}
                     </div>
                  </div>
               </div>
            </div>

            <!-- Cart Items -->
            <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 min-h-[150px]">
               <div v-if="cartItems.length === 0" class="text-center text-sm text-slate-500 py-8 flex flex-col items-center gap-2">
                 <Icon name="lucide:shopping-cart" class="w-8 h-8 text-slate-300" />
                 {{ t('admin.pages.orders.create.emptyCart') }}
               </div>

               <div v-for="(item, index) in cartItems" :key="index" class="bg-white border text-sm border-slate-200 rounded-lg p-3 flex flex-col gap-3">
                  <div class="flex justify-between items-start gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-slate-800 line-clamp-2 leading-tight">
                        {{ item.title }}
                      </div>
                      <div v-if="item.variantLabel" class="text-xs text-slate-500 mt-0.5">
                        {{ item.variantLabel }}
                      </div>
                    </div>
                    <!-- Remove item -->
                    <button 
                      @click="removeCartItem(index)"
                      class="text-slate-400 hover:text-red-500 p-1 -m-1 transition-colors"
                    >
                      <Icon name="lucide:x" class="w-4 h-4" />
                    </button>
                  </div>

                  <div class="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                    <div class="font-bold text-indigo-600">
                      {{ formatCurrency(item.price * item.quantity) }}
                    </div>
                    
                    <div class="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 shadow-sm">
                      <button
                        class="w-6 h-6 flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-sm disabled:opacity-50 transition-all font-medium"
                        @click="item.quantity--"
                        :disabled="item.quantity <= 1"
                      >
                        <Icon name="lucide:minus" class="w-3 h-3" />
                      </button>
                      <span class="w-8 text-center text-sm font-semibold text-slate-700">
                        {{ item.quantity }}
                      </span>
                      <button
                        class="w-6 h-6 flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-sm transition-all font-medium"
                        @click="item.quantity++"
                      >
                        <Icon name="lucide:plus" class="w-3 h-3" />
                      </button>
                    </div>
                  </div>
               </div>
            </div>

            <!-- Summary & Submit -->
            <div class="bg-white border-t border-slate-200 p-4 rounded-b-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
              <div class="space-y-2 mb-4">
                <div class="flex justify-between text-sm text-slate-600 font-medium">
                  <span>{{ t('admin.pages.orders.create.itemsTotal') }}</span>
                  <span>{{ formatCurrency(cartTotal) }}</span>
                </div>
                <div class="flex justify-between items-center text-lg font-bold">
                  <span class="text-slate-900">{{ t('admin.common.total') }}</span>
                  <span class="text-indigo-600">{{ formatCurrency(cartTotal) }}</span>
                </div>
              </div>

              <button
                class="w-full h-12 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                :class="canSubmit ? 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-500 shadow-teal-500/30 hover:shadow-lg' : 'bg-slate-300 cursor-not-allowed text-slate-100 shadow-none'"
                :disabled="!canSubmit || submitting"
                @click="submitOrder"
              >
                 <Icon v-if="submitting" name="lucide:loader-2" class="w-5 h-5 animate-spin" />
                 <Icon v-else name="lucide:check-circle" class="w-5 h-5" />
                 <span>{{ submitting ? t('admin.common.processing') : t('admin.pages.orders.create.submit') }}</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Variant Selection Modal inside create component for simplicity -->
    <TransitionRoot
      appear
      :show="variantModalOpen"
      as="template"
    >
      <Dialog
        as="div"
        class="relative z-50"
        @close="variantModalOpen = false"
      >
        <TransitionChild
          as="template"
          enter="duration-300 ease-out"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </TransitionChild>

        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as="template"
              enter="duration-300 ease-out"
              enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100"
              leave="duration-200 ease-in"
              leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95"
            >
              <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle
                  as="h3"
                  class="text-lg font-bold leading-6 text-slate-900 flex justify-between items-center"
                >
                  {{ selectedProductForVariant?.title || 'Select Variant' }}
                  <button
                    class="p-1 rounded-full hover:bg-slate-100 text-slate-400"
                    @click="variantModalOpen = false"
                  >
                    <Icon
                      name="lucide:x"
                      class="w-5 h-5"
                    />
                  </button>
                </DialogTitle>
                <div class="mt-4 space-y-2 max-h-[60vh] overflow-y-auto">
                  <div
                    v-if="loadingVariants"
                    class="py-8 text-center text-slate-500"
                  >
                    Loading variants...
                  </div>
                  <button
                    v-for="v in availableVariantsForSelection"
                    :key="v.id"
                    class="w-full p-4 rounded-xl border border-slate-100 hover:border-teal-500 hover:bg-teal-50 hover:ring-1 hover:ring-teal-500 transition-all flex justify-between items-center group"
                    @click="onVariantSelected(v)"
                  >
                    <div class="text-left">
                      <div class="font-semibold text-slate-900 group-hover:text-teal-800">
                        {{ v.label }}
                      </div>
                      <div class="text-xs text-slate-500 mt-0.5">
                        {{ v.availableStock }} in stock
                      </div>
                    </div>
                    <div class="font-bold text-teal-600">
                      {{ formatCurrency(v.price) }}
                    </div>
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCurrency } from '~/composables/useCurrency'
import { useAuthStore } from '~/stores/auth'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import BaseSelect from '~/components/ui/BaseSelect.vue'
import BaseInput from '~/components/ui/BaseInput.vue'
import { DZ_WILAYAS } from '~/shared/geo/dz'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const { t } = useI18n()
const { format: formatCurrency } = useCurrency()
const router = useRouter()
const authStore = useAuthStore()

// State
const customers = ref<any[]>([])
const products = ref<any[]>([])
const wilayas = ref(DZ_WILAYAS)

const form = ref({
    customerId: '',
    customerName: '',
    customerPhone: '',
    deliveryMode: 'home',
    shippingProvider: '',
    shippingWilayaCode: '',
    shippingCommuneCode: '',
    shippingAddressLine1: '',
    shippingNotes: ''
})

const maystroCommunes = ref<Array<{ id: number; name: string }>>([])
const maystroCommuneLoading = ref(false)
const maystroCommuneError = ref<string | null>(null)

type CartItem = {
    productId: string
    variantId?: string
    title: string
    variantLabel?: string
    price: number
    quantity: number
    image?: string
}

const cartItems = ref<CartItem[]>([])
const productSearch = ref('')
const submitting = ref(false)

// Variant Selection State
const variantModalOpen = ref(false)
const loadingVariants = ref(false)
const selectedProductForVariant = ref<any>(null)
const availableVariantsForSelection = ref<any[]>([])

// Computed
const searchedProducts = computed(() => {
    if (!productSearch.value.trim()) return []
    const q = productSearch.value.toLowerCase()
    return products.value.filter(p => 
        p.title.toLowerCase().includes(q) || 
        (p.sku || '').toLowerCase().includes(q)
    ).slice(0, 5) // Limit results
})

const cartTotal = computed(() => {
    return cartItems.value.reduce((total, item) => total + (item.price * item.quantity), 0)
})

const canSubmit = computed(() => {
    return cartItems.value.length > 0 && form.value.customerName.trim().length > 0
})

// Methods
onMounted(async () => {
    try {
        const [custRes, prodRes] = await Promise.all([
             $fetch('/api/admin/customers', { headers: { Authorization: `Bearer ${authStore.token}` } }),
             $fetch('/api/admin/products', { headers: { Authorization: `Bearer ${authStore.token}` }, query: { limit: 200 } })
        ])
        customers.value = custRes as any[]
        products.value = prodRes as any[]
    } catch (e) {
        console.error('Failed to load initial data', e)
    }
})

function onCustomerSelected(value: string | number | boolean | null) {
    const id = value == null ? '' : String(value)
    if (!id) {
        form.value.customerName = ''
        form.value.customerPhone = ''
        return
    }
    const c = customers.value.find(c => c.id === id)
    if (c) {
        form.value.customerName = c.name || ''
        form.value.customerPhone = c.phone || ''
    }
}

async function addProductToCart(product: any) {
    productSearch.value = '' // Clear search initially

    if (product.options && product.options.length > 0) {
        // Needs variant selection
        selectedProductForVariant.value = product
        variantModalOpen.value = true
        loadingVariants.value = true
        availableVariantsForSelection.value = []

        try {
            const response = await $fetch(`/api/admin/products/${product.id}`, {
               headers: { Authorization: `Bearer ${authStore.token}` }
            }) as any
            
            availableVariantsForSelection.value = (response.variants || []).map((v: any) => {
              const label = v.optionValues
                ? v.optionValues.map((ov: any) => ov.optionValue?.label).join(' / ')
                : 'Default'
              return {
                ...v,
                label,
                availableStock: v.stock - (v.reserved || 0)
              }
            })
        } catch (e) {
            console.error(e)
            variantModalOpen.value = false
        } finally {
            loadingVariants.value = false
        }
    } else {
        // Add default product immediately
        const existing = cartItems.value.find(i => i.productId === product.id && !i.variantId)
        if (existing) {
            existing.quantity++
        } else {
            cartItems.value.push({
                productId: product.id,
                title: product.title,
                price: product.price,
                quantity: 1,
            })
        }
    }
}

function onVariantSelected(variant: any) {
    if (!selectedProductForVariant.value) return

    const product = selectedProductForVariant.value
    const existing = cartItems.value.find(i => i.productId === product.id && i.variantId === variant.id)
    
    if (existing) {
        existing.quantity++
    } else {
        cartItems.value.push({
            productId: product.id,
            variantId: variant.id,
            title: product.title,
            variantLabel: variant.label,
            price: variant.price,
            quantity: 1,
        })
    }
    variantModalOpen.value = false
}

function removeCartItem(index: number) {
    cartItems.value.splice(index, 1)
}

watch(
  () => [form.value.shippingProvider, form.value.shippingWilayaCode] as const,
  async ([provider, wilaya], prev) => {
    const [prevProvider, prevWilaya] = prev || ['', '']
    if (process.server) return

    if (provider !== 'MAYSTRO') {
      maystroCommunes.value = []
      maystroCommuneError.value = null
      maystroCommuneLoading.value = false
      return
    }

    if (wilaya !== prevWilaya || provider !== prevProvider) {
      form.value.shippingCommuneCode = ''
    }

    const normalizedWilaya = String(wilaya || '').trim()
    if (!normalizedWilaya) {
      maystroCommunes.value = []
      maystroCommuneError.value = null
      maystroCommuneLoading.value = false
      return
    }

    maystroCommuneLoading.value = true
    maystroCommuneError.value = null
    try {
      const data = await $fetch('/api/delivery/maystro/communes', {
        query: { wilaya: normalizedWilaya },
        headers: { Authorization: `Bearer ${authStore.token}` }
      }) as any
      maystroCommunes.value = Array.isArray(data) ? data.map((c: any) => ({ id: Number(c.id), name: String(c.name) })) : []
    } catch (e: any) {
      maystroCommunes.value = []
      maystroCommuneError.value = e?.data?.statusMessage || e?.data?.message || 'Failed to load communes'
    } finally {
      maystroCommuneLoading.value = false
    }
  },
  { immediate: true }
)

async function submitOrder() {
    if (!canSubmit.value) return

    submitting.value = true
    try {
        const payload = {
            ...form.value,
            items: cartItems.value.map(i => ({
                productId: i.productId,
                variantId: i.variantId || null,
                quantity: i.quantity
            }))
        }

        const res = await $fetch('/api/admin/orders', {
            method: 'POST',
            body: payload,
            headers: { Authorization: `Bearer ${authStore.token}` }
        }) as any

        if (res.success && res.orderId) {
            router.push(`/admin/orders/${res.orderId}`)
        } else {
            alert(t('admin.common.error'))
        }
    } catch (e: any) {
        console.error(e)
        alert(e.data?.statusMessage || t('admin.common.error'))
    } finally {
        submitting.value = false
    }
}

</script>
