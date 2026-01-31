<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'

const cartStore = useCartStore()
const router = useRouter()
const storeSettings = useState<any>('storeSettings')
const { currencyCode, format: formatCurrency } = useCurrency()
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

// Unified delivery options
const deliveryOptions = computed(() => {
  const options: any[] = []
  
  availableProviders.value.forEach((provider: any) => {
    options.push({
      id: `${provider.key}-home`,
      provider: provider.key,
      providerLabel: provider.label,
      mode: 'home',
      modeLabel: 'Home Delivery',
      icon: provider.icon,
      color: provider.color,
      price: '350',
      description: 'Delivered to your doorstep'
    })
    
    options.push({
      id: `${provider.key}-pickup`,
      provider: provider.key,
      providerLabel: provider.label,
      mode: 'pickup',
      modeLabel: 'Pickup Point',
      icon: provider.icon,
      color: provider.color,
      price: '300',
      description: 'Collect from nearby location'
    })
  })
  
  options.push({
    id: 'store-pickup',
    provider: null,
    providerLabel: 'Store',
    mode: 'store',
    modeLabel: 'Store Pickup',
    icon: 'lucide:store',
    color: 'green',
    price: 'Free',
    description: 'Pick up at our store'
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
  <div class="min-h-screen bg-gradient-to-b from-amber-50/30 to-white py-12">
    <div class="max-w-6xl mx-auto px-4">

      <h1 class="font-cozy font-black text-4xl text-slate-800 text-center mb-12">Checkout</h1>

      <div
        v-if="!cartEnabled"
        class="mb-8 p-6 bg-amber-50 rounded-2xl text-amber-700 text-center"
      >
        Checkout is currently disabled for this store.
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        <!-- Left: Form -->
        <div class="lg:col-span-7 space-y-8">

          <!-- Personal Info -->
          <div class="bg-white p-8 rounded-[2rem] shadow-soft">
            <h2 class="font-bold text-slate-800 text-xl mb-6 flex items-center gap-3">
              <div class="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-500">
                <Icon name="lucide:user" class="w-4 h-4" />
              </div>
              Your Information
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">Full Name</label>
                <input
                  v-model="form.fullName"
                  type="text"
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all"
                  placeholder="John Doe"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">Phone</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all"
                  placeholder="0XXXXXXXXX"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">Wilaya</label>
                <div class="relative">
                  <select
                    v-model="form.wilaya"
                    class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select...</option>
                    <option value="16">16 - Alger</option>
                    <option value="31">31 - Oran</option>
                  </select>
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <Icon name="lucide:chevron-down" class="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">Commune</label>
                <input
                  v-model="form.commune"
                  type="text"
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all"
                  placeholder="Bab Ezzouar"
                >
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-600 mb-2">Address (Optional)</label>
                <input
                  v-model="form.address"
                  type="text"
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all"
                  placeholder="Street, building, apartment"
                >
              </div>
            </div>
          </div>

          <!-- Delivery Options -->
          <div class="bg-white p-8 rounded-[2rem] shadow-soft">
            <h2 class="font-bold text-slate-800 text-xl mb-6 flex items-center gap-3">
              <div class="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-500">
                <Icon name="lucide:truck" class="w-4 h-4" />
              </div>
              Delivery Method
            </h2>
            
            <div class="space-y-4">
              <div
                v-for="option in deliveryOptions"
                :key="option.id"
                class="p-4 rounded-2xl border-2 cursor-pointer transition-all"
                :class="form.selectedDeliveryOption === option.id 
                  ? 'border-brand-400 bg-brand-50 shadow-md' 
                  : 'border-slate-100 hover:border-brand-200'"
                @click="form.selectedDeliveryOption = option.id"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center" :class="`bg-${option.color}-100 text-${option.color}-500`">
                      <Icon :name="option.icon" class="w-6 h-6" />
                    </div>
                    <div>
                      <h3 class="font-bold text-slate-700">{{ option.providerLabel }}</h3>
                      <p class="text-sm text-slate-400">{{ option.modeLabel }}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <span class="font-bold text-slate-700">
                      {{ option.price === 'Free' ? option.price : `${option.price} ${currencyCode}` }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <div
            v-if="errorMessage"
            class="p-4 bg-red-50 rounded-2xl text-red-600 text-sm"
          >
            {{ errorMessage }}
          </div>

        </div>

        <!-- Right: Summary -->
        <div class="lg:col-span-5">
          <div class="bg-white p-8 rounded-[2rem] shadow-soft sticky top-24">
            <h2 class="font-bold text-slate-800 text-xl mb-6">Order Summary</h2>

            <div class="space-y-4 mb-6">
              <div v-for="item in cartStore.items" :key="item.variantId || item.productId" class="flex gap-4">
                <div class="w-16 h-16 bg-slate-50 rounded-xl overflow-hidden relative flex-shrink-0">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.title"
                    class="w-full h-full object-cover"
                  >
                  <span class="absolute -top-1 -right-1 bg-brand-500 text-white w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full">
                    {{ item.quantity }}
                  </span>
                </div>
                <div class="flex-grow">
                  <h4 class="font-medium text-slate-700">{{ item.title }}</h4>
                  <p v-if="item.variantId" class="text-xs text-slate-400">{{ item.variantId.slice(0,8) }}</p>
                </div>
                <div class="font-bold text-slate-700">{{ formatCurrency(item.price * item.quantity) }}</div>
              </div>
            </div>

            <!-- Coupon -->
            <div class="mb-6 p-4 bg-slate-50 rounded-xl">
              <label class="block text-sm font-medium text-slate-600 mb-2">Coupon Code</label>
              <div class="flex gap-2">
                <input
                  v-model="couponCode"
                  type="text"
                  placeholder="Enter code"
                  class="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 outline-none"
                >
                <button class="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-brand-500 transition-colors">
                  Apply
                </button>
              </div>
            </div>
            
            <dl class="space-y-3 text-sm mb-8">
              <div v-if="selectedDelivery" class="flex justify-between text-slate-500">
                <dt>Delivery</dt>
                <dd>{{ selectedDelivery.providerLabel }} - {{ selectedDelivery.modeLabel }}</dd>
              </div>
              <div class="flex justify-between text-slate-500">
                <dt>Subtotal</dt>
                <dd class="font-medium text-slate-700">{{ formatCurrency(cartStore.total) }}</dd>
              </div>
              <div v-if="selectedDelivery" class="flex justify-between text-slate-500">
                <dt>Shipping</dt>
                <dd>{{ selectedDelivery.price === 'Free' ? selectedDelivery.price : `${selectedDelivery.price} ${currencyCode}` }}</dd>
              </div>
              <div class="flex justify-between text-lg font-bold pt-4 border-t border-slate-100">
                <dt class="text-slate-800">Total</dt>
                <dd class="text-brand-500">{{ formatCurrency(cartStore.total) }}</dd>
              </div>
            </dl>

            <button
              type="button"
              :disabled="submitting || !cartEnabled || !hasRequiredFields"
              class="w-full bg-slate-800 text-white font-bold py-4 rounded-full shadow-lg hover:shadow-xl hover:bg-brand-500 hover:shadow-brand-300 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              @click="handleSubmit"
            >
              <Icon v-if="submitting" name="lucide:loader-2" class="w-5 h-5 animate-spin" />
              <span>{{ submitting ? 'Processing...' : 'Place Order' }}</span>
            </button>

            <NuxtLink to="/cart" class="block text-center text-slate-500 hover:text-brand-500 font-medium py-3 mt-4 transition-colors">
              ← Return to Cart
            </NuxtLink>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
