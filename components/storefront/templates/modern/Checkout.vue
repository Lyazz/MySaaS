<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'

const cartStore = useCartStore()
const router = useRouter()
const storeSettings = useState<any>('storeSettings')
const { currencyCode } = useCurrency()
const cartEnabled = computed(() => storeSettings.value?.cartEnabled !== false && storeSettings.value?.codEnabled !== false)

// Available delivery providers based on store settings
const availableProviders = computed(() => {
  const allowed = storeSettings.value?.allowedDeliveryProviders || ['SELF']
  const providerMeta = {
    MAYSTRO: { label: 'Maystro', icon: 'lucide:truck', color: 'emerald' },
    YALIDINE: { label: 'Yalidine', icon: 'lucide:package', color: 'blue' },
    ECOTRACK: { label: 'Ecotrack', icon: 'lucide:send', color: 'purple' },
    ZR_EXPRESS: { label: 'ZR Express', icon: 'lucide:zap', color: 'orange' },
    SELF: { label: 'Self Delivery', icon: 'lucide:bike', color: 'teal' }
  }
  return allowed.map((key: string) => ({ key, ...providerMeta[key as keyof typeof providerMeta] }))
})

// Unified delivery options combining provider and mode
const deliveryOptions = computed(() => {
  const options: any[] = []
  
  // Add provider options (home + pickup for each)
  availableProviders.value.forEach((provider: any) => {
    // Home delivery option
    options.push({
      id: `${provider.key}-home`,
      provider: provider.key,
      providerLabel: provider.label,
      mode: 'home',
      modeLabel: 'Home Delivery',
      icon: provider.icon,
      color: provider.color,
      price: '350', // Placeholder
      description: 'Delivered to your doorstep'
    })
    
    // Pickup point option
    options.push({
      id: `${provider.key}-pickup`,
      provider: provider.key,
      providerLabel: provider.label,
      mode: 'pickup',
      modeLabel: 'Pickup Point',
      icon: provider.icon,
      color: provider.color,
      price: '300', // Placeholder
      description: 'Collect from nearby location'
    })
  })
  
  // Store pickup as last option
  options.push({
    id: 'store-pickup',
    provider: null,
    providerLabel: 'Store',
    mode: 'store',
    modeLabel: 'Store Pickup',
    icon: 'lucide:store',
    color: 'green',
    price: 'Free',
    description: 'Pick up at our store in Ouled Fayet'
  })
  
  return options
})

const form = ref({
  fullName: '',
  phone: '',
  wilaya: '',
  commune: '',
  address: '',
  selectedDeliveryOption: deliveryOptions.value[0]?.id || 'store-pickup'
})

const submitting = ref(false)
const errorMessage = ref('')
const couponCode = ref('')

const selectedDelivery = computed(() => 
  deliveryOptions.value.find((opt: any) => opt.id === form.value.selectedDeliveryOption)
)

const hasRequiredFields = computed(() => Boolean(
  form.value.fullName.trim() && 
  form.value.phone.trim() && 
  cartStore.hasItems &&
  form.value.selectedDeliveryOption
))

onMounted(() => {
  cartStore.loadFromLocalStorage()
})

async function handleSubmit() {
    if (!cartEnabled.value) return
    errorMessage.value = ''

    // Ensure hydrated cart state
    cartStore.loadFromLocalStorage()

    if (!cartStore.hasItems) {
      errorMessage.value = 'Your cart is empty.'
      return
    }

    if (!form.value.fullName.trim()) {
      errorMessage.value = 'Please enter your full name.'
      return
    }

    if (!form.value.phone.trim()) {
      errorMessage.value = 'Phone number is required to place your order.'
      return
    }

    if (!form.value.selectedDeliveryOption) {
      errorMessage.value = 'Please select a delivery option.'
      return
    }

    submitting.value = true

    try {
        const delivery = selectedDelivery.value
        const url = useTenantApiUrl('/api/orders')
        const payload = {
          customerName: form.value.fullName.trim(),
          customerPhone: form.value.phone.trim(),
          customerAddress: form.value.address?.trim() || undefined,
          shippingAddressLine1: form.value.address?.trim() || undefined,
          shippingWilayaCode: form.value.wilaya || undefined,
          shippingCommuneCode: form.value.commune || undefined,
          deliveryMode: delivery?.mode,
          shippingProvider: delivery?.provider || undefined,
          items: cartStore.items.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity
          }))
        }

        const response = await $fetch<{ orderId: string }>(url, {
          method: 'POST',
          body: payload,
          headers: {
            ...(useTenantApiHeaders() || {})
          }
        })

        cartStore.clearCart()
        router.push({
          path: '/order-success',
          query: { orderId: response.orderId }
        })
    } catch (error: any) {
        console.error('Checkout submission failed:', error)
        errorMessage.value = error?.data?.statusMessage || error?.data?.message || 'Failed to place order. Please try again.'
    } finally {
        submitting.value = false
    }
}
</script>

<template>
  <div class="bg-[#f8faf9] min-h-screen py-10 font-sans text-slate-600">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-slate-900">
          Checkout
        </h1>
        <p class="text-lg text-slate-500 font-medium">
          {{ cartStore.itemCount }} items
        </p>
        <div
          v-if="!cartEnabled"
          class="mt-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm px-4 py-3"
        >
          Checkout is currently disabled for this store.
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left Column: Attributes & Delivery -->
        <div class="lg:col-span-7 space-y-8">
          <!-- Personal Info -->
          <div class="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-sm font-semibold text-slate-700 ml-1">Full name</label>
                <input
                  v-model="form.fullName"
                  type="text"
                  class="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                  placeholder="e.g. John Doe"
                >
              </div>
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-sm font-semibold text-slate-700 ml-1">Phone</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  class="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                  placeholder="0XXXXXXXX"
                >
              </div>
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-sm font-semibold text-slate-700 ml-1">Wilaya</label>
                <div class="relative">
                  <select
                    v-model="form.wilaya"
                    class="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none appearance-none cursor-pointer shadow-sm"
                  >
                    <option
                      value=""
                      disabled
                      selected
                    >
                      Select a wilaya...
                    </option>
                    <option value="16">
                      16 - Alger
                    </option>
                    <!-- Mock options -->
                  </select>
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <Icon name="lucide:chevron-down" class="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-sm font-semibold text-slate-700 ml-1">City</label>
                <div class="relative">
                  <select
                    v-model="form.commune"
                    class="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none appearance-none cursor-pointer shadow-sm"
                  >
                    <option
                      value=""
                      disabled
                      selected
                    >
                      Select a commune
                    </option>
                    <!-- Mock options -->
                  </select>
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <Icon name="lucide:chevron-down" class="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div class="col-span-2 space-y-2">
                <label class="block text-sm font-semibold text-slate-700 ml-1">Address (optional)</label>
                <input
                  v-model="form.address"
                  type="text"
                  class="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                  placeholder="Street address, apartment, etc."
                >
              </div>
            </div>
          </div>

          <!-- Delivery Options -->
          <div class="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Delivery Options
              </h3>
              <span class="text-[10px] font-bold text-brand-600 bg-brand-100 px-2 py-1 rounded-full uppercase">
                Required
              </span>
            </div>
            <p class="text-xs text-slate-500 mb-6 font-medium">
              Choose your preferred delivery method and provider.
            </p>
                    
            <div class="space-y-3">
              <div 
                v-for="option in deliveryOptions"
                :key="option.id"
                class="cursor-pointer relative rounded-2xl p-4 border-2 transition-all duration-300 group hover:scale-[1.005]"
                :class="form.selectedDeliveryOption === option.id 
                  ? 'border-brand-500 bg-brand-50/50 shadow-md' 
                  : 'border-slate-100 hover:border-brand-200 hover:shadow-sm'"
                @click="form.selectedDeliveryOption = option.id"
              >
                <div class="flex items-center gap-4">
                  <!-- Icon -->
                  <div 
                    class="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
                    :class="form.selectedDeliveryOption === option.id 
                      ? `bg-${option.color}-100` 
                      : 'bg-slate-100 group-hover:bg-slate-200'"
                  >
                    <Icon 
                      :name="option.icon" 
                      class="w-7 h-7 transition-colors duration-300"
                      :class="form.selectedDeliveryOption === option.id 
                        ? `text-${option.color}-600` 
                        : 'text-slate-400 group-hover:text-slate-600'"
                    />
                  </div>
                  
                  <!-- Details -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <h4 class="font-bold text-slate-900 text-sm">
                        {{ option.providerLabel }}
                      </h4>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                        :class="option.mode === 'home' ? 'bg-emerald-100 text-emerald-700' : option.mode === 'pickup' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'"
                      >
                        {{ option.modeLabel }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-500 leading-relaxed">
                      {{ option.description }}
                    </p>
                  </div>
                  
                  <!-- Price & Radio -->
                  <div class="flex items-center gap-3 flex-shrink-0">
                    <div class="text-right">
                      <div class="font-bold text-brand-600 text-base">
                        {{ option.price === 'Free' ? option.price : `${option.price} ${currencyCode}` }}
                      </div>
                    </div>
                    <span
                      class="block w-5 h-5 rounded-full border-2 transition-colors duration-300 flex-shrink-0"
                      :class="form.selectedDeliveryOption === option.id 
                        ? 'border-brand-600 bg-brand-600 ring-4 ring-brand-100' 
                        : 'border-slate-300'"
                    >
                      <span 
                        v-if="form.selectedDeliveryOption === option.id"
                        class="block w-full h-full rounded-full flex items-center justify-center"
                      >
                        <Icon name="lucide:check" class="w-3 h-3 text-white" />
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Right Column: Summary -->
        <div class="lg:col-span-5">
          <div class="bg-white p-7 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 sticky top-24">
            <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h2 class="text-xl font-bold text-slate-900">
                Order Summary
              </h2>
              <div class="flex items-center gap-1.5 text-sm font-semibold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full">
                <Icon name="lucide:handbag" class="w-4 h-4" />
                <span>{{ cartStore.itemCount }} {{ cartStore.itemCount === 1 ? 'item' : 'items' }}</span>
              </div>
            </div>

            <!-- Cart Items -->
            <div class="space-y-4 mb-6 max-h-80 overflow-y-auto pr-2">
              <div
                v-for="item in cartStore.items"
                :key="item.productId"
                class="flex items-center gap-4 py-2 border-b border-slate-50 last:border-0"
              >
                <div class="h-16 w-16 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden relative border border-slate-200">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.title"
                    class="h-full w-full object-cover object-center"
                  >
                  <div
                    v-else
                    class="h-full w-full flex items-center justify-center bg-slate-100 text-slate-300"
                  >
                    <Icon name="lucide:image" class="w-8 h-8" />
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-bold text-slate-900 text-sm truncate">
                    {{ item.title }}
                  </h4>
                  <p class="text-xs text-slate-500 mt-1">
                    x{{ item.quantity }}
                  </p>
                </div>
                <div class="font-bold text-brand-600 text-sm whitespace-nowrap">
                  {{ item.price }} {{ currencyCode }}
                </div>
              </div>
            </div>

            <!-- Coupon -->
            <div class="bg-gradient-to-br from-brand-50/30 to-brand-100/20 p-5 rounded-2xl border border-brand-200/50 mb-6 backdrop-blur-sm">
              <div class="flex justify-between items-center mb-3">
                <div class="flex items-center gap-2">
                  <Icon name="lucide:ticket-percent" class="w-4 h-4 text-brand-600" />
                  <h4 class="text-sm font-bold text-slate-800">
                    Coupon code
                  </h4>
                </div>
                <span class="text-[10px] font-bold text-brand-700 bg-brand-200/60 px-2.5 py-1 rounded-full uppercase tracking-wide">
                  • Discount
                </span>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="couponCode"
                  type="text"
                  placeholder="Enter code (e.g., BIENVENUE10)"
                  class="flex-1 h-11 rounded-xl border-2 border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm font-medium"
                >
                <button class="px-5 h-11 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-brand-200 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap">
                  Apply
                </button>
              </div>
            </div>

            <!-- Totals -->
            <div class="space-y-3 pt-4 border-t border-slate-100">
              <div v-if="selectedDelivery" class="flex justify-between text-sm">
                <span class="text-slate-500">Delivery option</span>
                <div class="flex items-center gap-2">
                  <Icon :name="selectedDelivery.icon" class="w-4 h-4 text-slate-600" />
                  <span class="font-medium text-slate-900">{{ selectedDelivery.providerLabel }} - {{ selectedDelivery.modeLabel }}</span>
                </div>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Subtotal</span>
                <span class="font-bold text-slate-900">{{ cartStore.total }} {{ currencyCode }}</span>
              </div>
              <div v-if="selectedDelivery" class="flex justify-between text-sm">
                <span class="text-slate-500">Shipping fee</span>
                <span class="font-bold text-brand-600">{{ selectedDelivery.price === 'Free' ? selectedDelivery.price : `${selectedDelivery.price} ${currencyCode}` }}</span>
              </div>
                        
              <div class="flex justify-between items-end pt-4 border-t border-slate-100 mt-4">
                <span class="font-bold text-xl text-slate-900">Total</span>
                <span class="font-bold text-xl text-slate-900">{{ cartStore.total }} {{ currencyCode }}</span>
              </div>
              <p class="text-xs text-slate-400 mt-1">
                Minimum order: 1,000 {{ currencyCode }}.
              </p>
            </div>

            <div
              v-if="errorMessage"
              class="mt-4 rounded-xl border-2 border-red-300 bg-red-50 text-red-800 text-sm px-4 py-3.5 flex items-start gap-3"
            >
              <Icon name="lucide:alert-circle" class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span class="font-medium">{{ errorMessage }}</span>
            </div>

            <!-- Checkout Button -->
            <button 
              :disabled="submitting || !cartEnabled || !hasRequiredFields"
              class="w-full mt-6 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-bold py-4 px-6 rounded-xl shadow-xl shadow-brand-300/30 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-400/40 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2.5 group relative overflow-hidden"
              @click="handleSubmit"
            >
              <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Icon
                v-if="submitting"
                name="lucide:loader-2"
                class="w-5 h-5 animate-spin relative z-10"
              />
              <span class="relative z-10 text-base">
                {{ submitting ? 'Placing order...' : (!cartEnabled ? 'Checkout disabled' : 'Place order') }}
              </span>
              <Icon
                v-if="!submitting && cartEnabled && hasRequiredFields"
                name="lucide:arrow-right"
                class="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
