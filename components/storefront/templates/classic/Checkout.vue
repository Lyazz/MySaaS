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
    description: 'Pick up at our store locally'
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

        const response = await $fetch(url, {
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
  <div class="bg-white min-h-screen py-12 font-serif text-slate-600">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-12 text-center">
        <h1 class="text-4xl font-serif font-bold text-slate-900 mb-2">
          Checkout
        </h1>
        <p class="text-sm uppercase tracking-widest text-slate-500 font-bold">
          {{ cartStore.itemCount }} items in your cart
        </p>
        <div
          v-if="!cartEnabled"
          class="mt-6 border border-amber-200 bg-amber-50 text-amber-800 text-sm px-6 py-4 inline-block"
        >
          Checkout is currently disabled for this store.
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <!-- Left Column: Attributes & Delivery -->
        <div class="lg:col-span-7 space-y-12">
          <!-- Personal Info -->
          <div>
             <h3 class="text-xs font-bold uppercase tracking-widest text-slate-900 mb-6 border-b border-slate-200 pb-2">
                Customer Information
             </h3>
             <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-xs font-bold uppercase tracking-widest text-slate-500">Full name</label>
                <input
                  v-model="form.fullName"
                  type="text"
                  class="w-full h-12 border border-slate-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-0 transition-all outline-none rounded-none"
                  placeholder="e.g. John Doe"
                >
              </div>
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-xs font-bold uppercase tracking-widest text-slate-500">Phone</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  class="w-full h-12 border border-slate-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-0 transition-all outline-none rounded-none"
                  placeholder="0XXXXXXXX"
                >
              </div>
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-xs font-bold uppercase tracking-widest text-slate-500">Wilaya</label>
                <div class="relative">
                  <select
                    v-model="form.wilaya"
                    class="w-full h-12 border border-slate-300 bg-white px-4 text-slate-900 focus:border-slate-900 focus:ring-0 transition-all outline-none appearance-none cursor-pointer rounded-none"
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
                <label class="block text-xs font-bold uppercase tracking-widest text-slate-500">City</label>
                <div class="relative">
                  <select
                    v-model="form.commune"
                    class="w-full h-12 border border-slate-300 bg-white px-4 text-slate-900 focus:border-slate-900 focus:ring-0 transition-all outline-none appearance-none cursor-pointer rounded-none"
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
                <label class="block text-xs font-bold uppercase tracking-widest text-slate-500">Address (optional)</label>
                <input
                  v-model="form.address"
                  type="text"
                  class="w-full h-12 border border-slate-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-0 transition-all outline-none rounded-none"
                  placeholder="Street address, apartment, etc."
                >
              </div>
            </div>
          </div>

          <!-- Delivery Options -->
          <div>
            <div class="flex items-center justify-between mb-6 border-b border-slate-200 pb-2">
              <h3 class="text-xs font-bold uppercase tracking-widest text-slate-900">
                Delivery Method
              </h3>
            </div>
                    
            <div class="space-y-4">
              <div 
                v-for="option in deliveryOptions"
                :key="option.id"
                class="cursor-pointer relative p-5 border transition-all duration-300 group"
                :class="form.selectedDeliveryOption === option.id 
                  ? 'border-slate-900 bg-slate-50' 
                  : 'border-slate-200 hover:border-slate-400'"
                @click="form.selectedDeliveryOption = option.id"
              >
                <div class="flex items-center gap-5">
                  <!-- Radio Visual -->
                   <div 
                      class="w-5 h-5 border flex items-center justify-center flex-shrink-0"
                      :class="form.selectedDeliveryOption === option.id ? 'border-slate-900 bg-slate-900' : 'border-slate-300'"
                   >
                       <Icon v-if="form.selectedDeliveryOption === option.id" name="lucide:check" class="w-3 h-3 text-white" />
                   </div>

                  <!-- Details -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <h4 class="font-bold text-slate-900 text-sm uppercase tracking-wider">
                        {{ option.providerLabel }}
                      </h4>
                      <span class="text-[10px] font-bold px-2 py-0.5 border"
                        :class="option.mode === 'home' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-slate-200 text-slate-600 bg-slate-50'"
                      >
                        {{ option.modeLabel }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-500">
                      {{ option.description }}
                    </p>
                  </div>
                  
                  <!-- Price -->
                  <div class="font-bold text-slate-900 text-sm">
                    {{ option.price === 'Free' ? option.price : `${option.price} ${currencyCode}` }}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Right Column: Summary -->
        <div class="lg:col-span-5">
          <div class="bg-slate-50 p-8 border border-slate-200 sticky top-24">
            <h2 class="text-lg font-serif font-bold text-slate-900 mb-6 border-b border-slate-200 pb-4">
              Order Summary
            </h2>
            
            <!-- Cart Items -->
            <div class="space-y-6 mb-8 max-h-96 overflow-y-auto pr-2">
              <div
                v-for="item in cartStore.items"
                :key="item.productId"
                class="flex gap-4"
              >
                <div class="h-20 w-16 bg-white border border-slate-200 flex-shrink-0 overflow-hidden relative">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.title"
                    class="h-full w-full object-cover object-center"
                  >
                  <div
                    v-else
                    class="h-full w-full flex items-center justify-center bg-slate-50 text-slate-300"
                  >
                    <Icon name="lucide:image" class="w-6 h-6" />
                  </div>
                </div>
                <div class="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <h4 class="font-bold text-slate-900 text-sm font-serif line-clamp-2">
                        {{ item.title }}
                    </h4>
                    <p class="text-xs text-slate-500 mt-1 uppercase tracking-wider">
                        Qty: {{ item.quantity }}
                    </p>
                  </div>
                  <div class="font-bold text-slate-900 text-sm">
                    {{ item.price }} {{ currencyCode }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Coupon -->
            <div class="flex gap-2 mb-8 border-t border-slate-200 pt-6">
              <input
                v-model="couponCode"
                type="text"
                placeholder="Coupon code"
                class="flex-1 h-10 border-b border-slate-300 bg-transparent px-2 text-sm text-slate-900 focus:border-slate-900 focus:ring-0 transition-all outline-none rounded-none"
              >
              <button class="px-4 h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest transition-colors">
                Apply
              </button>
            </div>

            <!-- Totals -->
            <div class="space-y-4 pt-4 border-t border-slate-200">
              <div class="flex justify-between text-sm">
                <span class="text-slate-500 uppercase tracking-wider text-xs font-bold">Subtotal</span>
                <span class="font-medium text-slate-900">{{ cartStore.total }} {{ currencyCode }}</span>
              </div>
              <div v-if="selectedDelivery" class="flex justify-between text-sm">
                <span class="text-slate-500 uppercase tracking-wider text-xs font-bold">Shipping</span>
                <span class="font-medium text-slate-900">{{ selectedDelivery.price === 'Free' ? selectedDelivery.price : `${selectedDelivery.price} ${currencyCode}` }}</span>
              </div>
                        
              <div class="flex justify-between items-end pt-6 border-t border-slate-200 mt-4">
                <span class="font-serif font-bold text-xl text-slate-900">Total</span>
                <span class="font-serif font-bold text-xl text-slate-900">{{ cartStore.total }} {{ currencyCode }}</span>
              </div>
            </div>

            <div
              v-if="errorMessage"
              class="mt-6 border border-red-200 bg-red-50 text-red-800 text-xs px-4 py-3 font-medium"
            >
              {{ errorMessage }}
            </div>

            <!-- Checkout Button -->
            <button 
              :disabled="submitting || !cartEnabled || !hasRequiredFields"
              class="w-full mt-8 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-4 px-6 uppercase tracking-widest text-xs transition-all duration-300 flex items-center justify-center gap-2 group relative overflow-hidden"
              @click="handleSubmit"
            >
              <span class="relative z-10">
                {{ submitting ? 'Processing...' : (!cartEnabled ? 'Checkout Disabled' : 'Place Order') }}
              </span>
              <Icon
                v-if="!submitting && cartEnabled && hasRequiredFields"
                name="lucide:arrow-right"
                class="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
