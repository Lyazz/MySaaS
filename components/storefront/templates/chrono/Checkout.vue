<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'
import { DZ_WILAYAS } from '~/shared/geo/dz'

const cartStore = useCartStore()
const router = useRouter()
const storeSettings = useState<any>('storeSettings')
const storefrontContent = useStorefrontContent()
const { currencyCode } = useCurrency()
const cartEnabled = computed(() => storeSettings.value?.cartEnabled !== false && storeSettings.value?.codEnabled !== false)
const wilayas = DZ_WILAYAS

const availableProviders = computed(() => {
  const allowed = storeSettings.value?.allowedDeliveryProviders || ['SELF']
  const providerMeta = {
    MAYSTRO: { label: 'Maystro', icon: 'lucide:truck', color: 'emerald' },
    YALIDINE: { label: 'Yalidine', icon: 'lucide:package', color: 'blue' },
    ECOTRACK: { label: 'Ecotrack', icon: 'lucide:send', color: 'purple' },
    ZR_EXPRESS: { label: 'ZR Express', icon: 'lucide:zap', color: 'orange' },
    SELF: { label: storefrontContent.value.checkout.delivery.provider.self, icon: 'lucide:bike', color: 'teal' }
  }
  return allowed.map((key: string) => ({ key, ...providerMeta[key as keyof typeof providerMeta] }))
})

const deliveryOptions = computed(() => {
  const options: any[] = []
  availableProviders.value.forEach((provider: any) => {
    options.push({
      id: `${provider.key}-home`,
      provider: provider.key,
      providerLabel: provider.label,
      mode: 'home',
      modeLabel: storefrontContent.value.checkout.delivery.mode.homeDelivery,
      icon: provider.icon,
      color: provider.color,
      price: '350',
      description: storefrontContent.value.checkout.delivery.description.homeDelivery
    })
    options.push({
      id: `${provider.key}-pickup`,
      provider: provider.key,
      providerLabel: provider.label,
      mode: 'pickup',
      modeLabel: storefrontContent.value.checkout.delivery.mode.pickupPoint,
      icon: provider.icon,
      color: provider.color,
      price: '300',
      description: storefrontContent.value.checkout.delivery.description.pickupPoint
    })
  })
  options.push({
    id: 'store-pickup',
    provider: null,
    providerLabel: 'Store',
    mode: 'store',
    modeLabel: storefrontContent.value.checkout.delivery.mode.storePickup,
    icon: 'lucide:store',
    color: 'green',
    price: 'FREE',
    description: storefrontContent.value.checkout.delivery.description.storePickup
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
      errorMessage.value = storefrontContent.value.checkout.errors.emptyCart
      return
    }
    if (!form.value.fullName.trim()) {
      errorMessage.value = storefrontContent.value.checkout.errors.fullNameRequired
      return
    }
    if (!form.value.phone.trim()) {
      errorMessage.value = storefrontContent.value.checkout.errors.phoneRequired
      return
    }
    if (!form.value.selectedDeliveryOption) {
      errorMessage.value = storefrontContent.value.checkout.errors.deliveryRequired
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
        errorMessage.value =
          error?.data?.statusMessage ||
          error?.data?.message ||
          storefrontContent.value.checkout.errors.submitFailed
    } finally {
        submitting.value = false
    }
}
</script>

<template>
  <div class="min-h-screen py-10 text-gray-400" style="background-color:#0E1117; font-family:'Cormorant Garamond',serif;">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white">{{ storefrontContent.checkout.title }}</h1>
        <p class="text-lg text-gray-500 font-medium">{{ storefrontContent.cart.itemsCount(cartStore.itemCount) }}</p>
        <div v-if="!cartEnabled" class="mt-3 border border-amber-700/30 bg-amber-950/30 text-amber-400 text-sm px-4 py-3" style="border-radius: 2px;">
          {{ storefrontContent.checkout.disabled }}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left Column -->
        <div class="lg:col-span-7 space-y-8">
          <!-- Personal Info -->
          <div class="bg-[#0B0E16] p-6 border border-[#A67C52]/10" style="border-radius: 2px;">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-sm font-semibold text-[#A67C52] ml-1 rtl:ml-0 rtl:mr-1 tracking-wider uppercase text-xs">{{ storefrontContent.checkout.form.fullName.label }}</label>
                <input v-model="form.fullName" type="text" class="w-full h-12 bg-[#131720] border border-[#A67C52]/20 px-4 text-white placeholder:text-gray-600 focus:border-[#A67C52] focus:ring-2 focus:ring-[#A67C52]/20 transition-all outline-none" style="border-radius: 2px;" :placeholder="storefrontContent.checkout.form.fullName.placeholder" >
              </div>
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-sm font-semibold text-[#A67C52] ml-1 rtl:ml-0 rtl:mr-1 tracking-wider uppercase text-xs">{{ storefrontContent.checkout.form.phone.label }}</label>
                <input v-model="form.phone" type="tel" class="w-full h-12 bg-[#131720] border border-[#A67C52]/20 px-4 text-white placeholder:text-gray-600 focus:border-[#A67C52] focus:ring-2 focus:ring-[#A67C52]/20 transition-all outline-none" style="border-radius: 2px;" :placeholder="storefrontContent.checkout.form.phone.placeholder" >
              </div>
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-sm font-semibold text-[#A67C52] ml-1 rtl:ml-0 rtl:mr-1 tracking-wider uppercase text-xs">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                <div class="relative">
                  <select v-model="form.wilaya" class="w-full h-12 bg-[#131720] border border-[#A67C52]/20 px-4 text-white focus:border-[#A67C52] focus:ring-2 focus:ring-[#A67C52]/20 transition-all outline-none appearance-none cursor-pointer" style="border-radius: 2px;">
                    <option value="" disabled>{{ storefrontContent.checkout.form.wilaya.placeholder }}</option>
                    <option
                      v-for="w in wilayas"
                      :key="w.code"
                      :value="w.code"
                      style="background:#0E1117;"
                    >
                      {{ w.code }} - {{ w.name }}
                    </option>
                  </select>
                  <div class="absolute right-4 rtl:right-auto rtl:left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <Icon name="lucide:chevron-down" class="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-sm font-semibold text-[#A67C52] ml-1 rtl:ml-0 rtl:mr-1 tracking-wider uppercase text-xs">{{ storefrontContent.checkout.form.commune.label }}</label>
                <input
                  v-model="form.commune"
                  type="text"
                  class="w-full h-12 bg-[#131720] border border-[#A67C52]/20 px-4 text-white placeholder:text-gray-600 focus:border-[#A67C52] focus:ring-2 focus:ring-[#A67C52]/20 transition-all outline-none"
                  style="border-radius: 2px;"
                  :placeholder="storefrontContent.checkout.form.commune.placeholder"
                >
              </div>
              <div class="col-span-2 space-y-2">
                <label class="block text-sm font-semibold text-[#A67C52] ml-1 rtl:ml-0 rtl:mr-1 tracking-wider uppercase text-xs">{{ storefrontContent.checkout.form.address.label }}</label>
                <input v-model="form.address" type="text" class="w-full h-12 bg-[#131720] border border-[#A67C52]/20 px-4 text-white placeholder:text-gray-600 focus:border-[#A67C52] focus:ring-2 focus:ring-[#A67C52]/20 transition-all outline-none" style="border-radius: 2px;" :placeholder="storefrontContent.checkout.form.address.placeholder" >
              </div>
            </div>
          </div>

          <!-- Delivery Options -->
          <div class="bg-[#0B0E16] p-6 border border-[#A67C52]/10" style="border-radius: 2px;">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-bold text-[#A67C52] uppercase tracking-[0.2em]">{{ storefrontContent.checkout.sections.deliveryOptions }}</h3>
              <span class="text-[10px] font-bold text-[#A67C52] bg-[#A67C52]/10 px-2 py-1 uppercase border border-[#A67C52]/20" style="border-radius: 2px;">{{ storefrontContent.checkout.required }}</span>
            </div>
            <p class="text-xs text-gray-500 mb-6 font-medium">{{ storefrontContent.checkout.help.deliveryOptions }}</p>
                    
            <div class="space-y-3">
              <div 
                v-for="option in deliveryOptions"
                :key="option.id"
                class="cursor-pointer relative p-4 border-2 transition-all duration-300 group hover:scale-[1.005]"
                :class="form.selectedDeliveryOption === option.id 
                  ? 'border-[#A67C52] bg-[#A67C52]/5 shadow-md shadow-[#A67C52]/5' 
                  : 'border-[#A67C52]/10 hover:border-[#A67C52]/30 hover:shadow-sm'"
                style="border-radius: 2px;"
                @click="form.selectedDeliveryOption = option.id"
              >
                <div class="flex items-center gap-4">
                  <div 
                    class="w-14 h-14 flex items-center justify-center flex-shrink-0 transition-all duration-300 border"
                    :class="form.selectedDeliveryOption === option.id 
                      ? 'bg-[#A67C52]/10 border-[#A67C52]/30' 
                      : 'bg-[#131720] border-[#A67C52]/10 group-hover:border-[#A67C52]/20'"
                    style="border-radius: 2px;"
                  >
                    <Icon 
                      :name="option.icon" 
                      class="w-7 h-7 transition-colors duration-300"
                      :class="form.selectedDeliveryOption === option.id 
                        ? 'text-[#A67C52]' 
                        : 'text-gray-600 group-hover:text-gray-400'"
                    />
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <h4 class="font-bold text-white text-sm">{{ option.providerLabel }}</h4>
                      <span class="text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide border"
                        :class="option.mode === 'home' ? 'bg-emerald-950/50 border-emerald-800/30 text-emerald-400' : option.mode === 'pickup' ? 'bg-blue-950/50 border-blue-800/30 text-blue-400' : 'bg-green-950/50 border-green-800/30 text-green-400'"
                        style="border-radius: 2px;"
                      >{{ option.modeLabel }}</span>
                    </div>
                    <p class="text-xs text-gray-500 leading-relaxed">{{ option.description }}</p>
                  </div>
                  
                  <div class="flex items-center gap-3 flex-shrink-0">
                    <div class="text-right">
                      <div class="font-bold text-[#A67C52] text-base">{{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}</div>
                    </div>
                    <span
                      class="block w-5 h-5 border-2 transition-colors duration-300 flex-shrink-0"
                      :class="form.selectedDeliveryOption === option.id 
                        ? 'border-[#A67C52] bg-[#A67C52] ring-4 ring-[#A67C52]/20' 
                        : 'border-gray-600'"
                      style="border-radius: 2px;"
                    >
                      <span v-if="form.selectedDeliveryOption === option.id" class="block w-full h-full flex items-center justify-center">
                        <Icon name="lucide:check" class="w-3 h-3 text-black" />
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
          <div class="bg-[#0B0E16] p-7 border border-[#A67C52]/20 sticky top-24" style="border-radius: 2px;">
            <div class="flex items-center justify-between mb-6 pb-4 border-b border-[#A67C52]/10">
              <h2 class="text-xl font-bold text-white">Order Summary</h2>
              <div class="flex items-center gap-1.5 text-sm font-semibold text-[#A67C52] bg-[#A67C52]/10 px-3 py-1.5 border border-[#A67C52]/20" style="border-radius: 2px;">
                <Icon name="lucide:handbag" class="w-4 h-4" />
                <span>{{ cartStore.itemCount }} {{ cartStore.itemCount === 1 ? 'item' : 'items' }}</span>
              </div>
            </div>

            <!-- Cart Items -->
            <div class="space-y-4 mb-6 max-h-80 overflow-y-auto pr-2">
              <div v-for="item in cartStore.items" :key="item.productId" class="flex items-center gap-4 py-2 border-b border-[#A67C52]/5 last:border-0">
                <div class="h-16 w-16 bg-[#131720] flex-shrink-0 overflow-hidden relative border border-[#A67C52]/10" style="border-radius: 2px;">
                  <img v-if="item.image" :src="item.image" :alt="item.title" class="h-full w-full object-cover object-center" >
                  <div v-else class="h-full w-full flex items-center justify-center bg-[#131720] text-gray-700">
                    <Icon name="lucide:image" class="w-8 h-8" />
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-bold text-white text-sm truncate">{{ item.title }}</h4>
                  <p class="text-xs text-gray-500 mt-1">x{{ item.quantity }}</p>
                </div>
                <div class="font-bold text-[#A67C52] text-sm whitespace-nowrap">{{ item.price }} {{ currencyCode }}</div>
              </div>
            </div>

            <!-- Coupon -->
            <div class="bg-[#A67C52]/5 p-5 border border-[#A67C52]/20 mb-6" style="border-radius: 2px;">
              <div class="flex justify-between items-center mb-3">
                <div class="flex items-center gap-2">
                  <Icon name="lucide:ticket-percent" class="w-4 h-4 text-[#A67C52]" />
                  <h4 class="text-sm font-bold text-white">{{ storefrontContent.checkout.coupon.title }}</h4>
                </div>
                <span class="text-[10px] font-bold text-[#A67C52] bg-[#A67C52]/10 px-2.5 py-1 uppercase tracking-wide border border-[#A67C52]/20" style="border-radius: 2px;">• {{ storefrontContent.checkout.coupon.badge }}</span>
              </div>
              <div class="flex gap-2">
                <input v-model="couponCode" type="text" :placeholder="storefrontContent.checkout.coupon.placeholder" class="flex-1 h-11 bg-[#131720] border-2 border-[#A67C52]/20 px-4 text-sm text-white placeholder:text-gray-600 focus:border-[#A67C52] focus:ring-2 focus:ring-[#A67C52]/20 transition-all outline-none font-medium" style="border-radius: 2px;" >
                <button class="px-5 h-11 bg-[#A67C52] hover:bg-[#d4b85c] text-black font-bold text-sm transition-all whitespace-nowrap tracking-wider uppercase" style="border-radius: 2px;">{{ storefrontContent.actions.apply }}</button>
              </div>
            </div>

            <!-- Totals -->
            <div class="space-y-3 pt-4 border-t border-[#A67C52]/10">
              <div v-if="selectedDelivery" class="flex justify-between text-sm">
                <span class="text-gray-500">{{ storefrontContent.checkout.summary.deliveryOption }}</span>
                <div class="flex items-center gap-2">
                  <Icon :name="selectedDelivery.icon" class="w-4 h-4 text-gray-400" />
                  <span class="font-medium text-white">{{ selectedDelivery.providerLabel }} - {{ selectedDelivery.modeLabel }}</span>
                </div>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-500">{{ storefrontContent.cart.summary.subtotal }}</span>
                <span class="font-bold text-white">{{ cartStore.total }} {{ currencyCode }}</span>
              </div>
              <div v-if="selectedDelivery" class="flex justify-between text-sm">
                <span class="text-gray-500">{{ storefrontContent.checkout.summary.shippingFee }}</span>
                <span class="font-bold text-[#A67C52]">{{ selectedDelivery.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${selectedDelivery.price} ${currencyCode}` }}</span>
              </div>
                        
              <div class="flex justify-between items-end pt-4 border-t border-[#A67C52]/10 mt-4">
                <span class="font-bold text-xl text-white">{{ storefrontContent.cart.summary.total }}</span>
                <span class="font-bold text-xl text-[#A67C52]">{{ cartStore.total }} {{ currencyCode }}</span>
              </div>
              <p class="text-xs text-gray-600 mt-1">{{ storefrontContent.checkout.minimumOrder('1,000', currencyCode) }}</p>
            </div>

            <div v-if="errorMessage" class="mt-4 border-2 border-red-800/30 bg-red-950/30 text-red-400 text-sm px-4 py-3.5 flex items-start gap-3" style="border-radius: 2px;">
              <Icon name="lucide:alert-circle" class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span class="font-medium">{{ errorMessage }}</span>
            </div>

            <!-- Checkout Button -->
            <button 
              :disabled="submitting || !cartEnabled || !hasRequiredFields"
              class="w-full mt-6 bg-gradient-to-r from-[#A67C52] to-[#d4b85c] hover:from-[#d4b85c] hover:to-[#A67C52] text-black font-bold py-4 px-6 shadow-xl shadow-[#A67C52]/10 transition-all duration-300 hover:shadow-2xl hover:shadow-[#A67C52]/20 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2.5 group relative overflow-hidden tracking-wider uppercase"
              style="border-radius: 2px;"
              @click="handleSubmit"
            >
              <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Icon v-if="submitting" name="lucide:loader-2" class="w-5 h-5 animate-spin relative z-10" />
              <span class="relative z-10 text-base">
                {{ submitting ? storefrontContent.checkout.actions.placingOrder : (!cartEnabled ? storefrontContent.checkout.disabledShort : storefrontContent.checkout.actions.placeOrder) }}
              </span>
              <Icon v-if="!submitting && cartEnabled && hasRequiredFields" name="lucide:arrow-right" class="w-5 h-5 relative z-10 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
