<template>
  <div class="bg-[#f8faf9] min-h-screen py-10 font-sans text-stone-600 selection:bg-brand-100 selection:text-brand-900">
    <!-- Decorative Background -->
    <div class="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
         <div class="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-gradient-to-br from-orange-100/40 to-transparent rounded-full blur-3xl"></div>
         <div class="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-gradient-to-bl from-green-100/40 to-transparent rounded-full blur-3xl"></div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <!-- Header -->
      <div class="mb-10 text-center">
        <h1 class="text-4xl font-bold text-stone-900 mb-2">
          {{ storefrontContent.checkout.title }}
        </h1>
        <p class="text-lg text-stone-500 font-medium">
          {{ storefrontContent.cart.itemsCount(cartStore.itemCount) }}
        </p>
        <div
          v-if="!cartEnabled"
          class="mt-6 inline-block rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-sm px-6 py-2 font-bold uppercase tracking-wider shadow-sm"
        >
          {{ storefrontContent.checkout.disabled }}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        <!-- Left Column: Attributes & Delivery -->
        <div class="lg:col-span-7 space-y-10">
          <!-- Personal Info -->
          <div class="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100 relative overflow-hidden group">
            <div class="absolute top-0 inset-x-0 h-1 bg-stone-100"></div>
            
            <h3 class="text-xl font-bold text-stone-900 mb-8 flex items-center gap-3">
                <span class="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-sm font-sans font-bold shadow-lg">1</span>
                {{ storefrontContent.checkout.sections.customerInformation }}
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="col-span-2 md:col-span-1 space-y-3">
                <label class="block text-xs font-bold uppercase tracking-widest text-stone-500 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.fullName.label }}</label>
                <input
                  v-model="form.fullName"
                  type="text"
                  class="w-full h-14 rounded-2xl border-2 border-stone-100 bg-stone-50 px-5 text-stone-900 placeholder:text-stone-300 focus:border-stone-900 focus:ring-0 transition-all duration-300 outline-none font-medium"
                  :placeholder="storefrontContent.checkout.form.fullName.placeholder"
                >
              </div>
              <div class="col-span-2 md:col-span-1 space-y-3">
                <label class="block text-xs font-bold uppercase tracking-widest text-stone-500 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.phone.label }}</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  class="w-full h-14 rounded-2xl border-2 border-stone-100 bg-stone-50 px-5 text-stone-900 placeholder:text-stone-300 focus:border-stone-900 focus:ring-0 transition-all duration-300 outline-none font-medium"
                  :placeholder="storefrontContent.checkout.form.phone.placeholder"
                >
              </div>
              <div class="col-span-2 md:col-span-1 space-y-3">
                <label class="block text-xs font-bold uppercase tracking-widest text-stone-500 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                <div class="relative">
                  <select
                    v-model="form.wilaya"
                    class="w-full h-14 rounded-2xl border-2 border-stone-100 bg-stone-50 px-5 text-stone-900 focus:border-stone-900 focus:ring-0 transition-all duration-300 outline-none appearance-none cursor-pointer font-medium"
	                  >
	                    <option value="" disabled>
	                      {{ storefrontContent.checkout.form.wilaya.placeholder }}
	                    </option>
	                    <option
	                      v-for="w in wilayas"
	                      :key="w.code"
	                      :value="w.code"
	                    >
	                      {{ w.code }} - {{ w.name }}
	                    </option>
	                  </select>
                  <div class="absolute right-5 rtl:right-auto rtl:left-5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                    <Icon name="lucide:chevron-down" class="w-5 h-5" />
                  </div>
                </div>
              </div>
	              <div class="col-span-2 md:col-span-1 space-y-3">
	                <label class="block text-xs font-bold uppercase tracking-widest text-stone-500 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.commune.label }}</label>
	                <CommuneField
	                  v-model="form.commune"
	                  :wilaya-code="form.wilaya"
	                  :placeholder="storefrontContent.checkout.form.commune.placeholder"
	                  :input-class="'w-full h-14 rounded-2xl border-2 border-stone-100 bg-stone-50 px-5 text-stone-900 placeholder:text-stone-300 focus:border-stone-900 focus:ring-0 transition-all duration-300 outline-none font-medium'"
	                  :select-class="'w-full h-14 rounded-2xl border-2 border-stone-100 bg-stone-50 px-5 text-stone-900 focus:border-stone-900 focus:ring-0 transition-all duration-300 outline-none font-medium'"
	                />
	              </div>
              <div class="col-span-2 space-y-3">
                <label class="block text-xs font-bold uppercase tracking-widest text-stone-500 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.address.label }}</label>
                <input
                  v-model="form.address"
                  type="text"
                  class="w-full h-14 rounded-2xl border-2 border-stone-100 bg-stone-50 px-5 text-stone-900 placeholder:text-stone-300 focus:border-stone-900 focus:ring-0 transition-all duration-300 outline-none font-medium"
                  :placeholder="storefrontContent.checkout.form.address.placeholder"
                >
              </div>
            </div>
          </div>

          <!-- Delivery Options -->
          <div class="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100">
            <div class="flex items-center justify-between mb-8">
              <h3 class="text-xl font-bold text-stone-900 flex items-center gap-3">
                <span class="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-sm font-sans font-bold shadow-lg">2</span>
                {{ storefrontContent.checkout.sections.deliveryMethod }}
              </h3>
            </div>
                    
            <div class="space-y-4">
              <div 
                v-for="option in deliveryOptions"
                :key="option.id"
                class="cursor-pointer relative rounded-3xl p-6 border-2 transition-all duration-300 group hover:scale-[1.01]"
                :class="form.selectedDeliveryOption === option.id 
                  ? 'border-stone-900 bg-stone-50 shadow-md' 
                  : 'border-stone-100 hover:border-stone-300'"
                @click="form.selectedDeliveryOption = option.id"
              >
                <div class="flex items-center gap-5">
                  <!-- Icon -->
                  <div 
                    class="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-sm border border-white"
                    :class="form.selectedDeliveryOption === option.id 
                      ? `bg-stone-900 text-white` 
                      : `bg-${option.color}-50 text-${option.color}-600`"
                  >
                    <Icon :name="option.icon" class="w-7 h-7" />
                  </div>
                  
                  <!-- Details -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-3 mb-1">
                      <h4 class="font-bold text-stone-900 text-base">
                        {{ option.providerLabel }}
                      </h4>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border"
                        :class="option.mode === 'home' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-blue-50 text-blue-800 border-blue-100'"
                      >
                        {{ option.modeLabel }}
                      </span>
                    </div>
                    <p class="text-xs text-stone-500 font-medium opacity-80">
                      {{ option.description }}
                    </p>
                  </div>
                  
                  <!-- Price & Radio -->
                  <div class="flex items-center gap-4 flex-shrink-0">
                    <div class="text-right">
                      <div class="font-bold text-stone-900 text-base">
                        {{
                          option.price === 'FREE'
                            ? storefrontContent.checkout.delivery.free
                            : option.price === '—'
                              ? '—'
                              : `${option.price} ${currencyCode}`
                        }}
                      </div>
                    </div>
                    <div
                      class="w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center"
                      :class="form.selectedDeliveryOption === option.id 
                        ? 'border-stone-900 bg-stone-900' 
                        : 'border-stone-300'"
                    >
                      <Icon v-if="form.selectedDeliveryOption === option.id" name="lucide:check" class="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Right Column: Summary (Receipt Style) -->
        <div class="lg:col-span-5 relative">
          <div class="bg-white px-8 py-10 shadow-2xl relative ticket-container lg:sticky lg:top-24 transform hover:scale-[1.01] transition-transform duration-500">
             <!-- Jagged edges -->
             <div class="absolute top-0 left-0 right-0 h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAxMCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ibm9uZSI+PHBhdGggZD0iTTAgMTBMMTAgMEwyMCAxMEgweiIgZmlsbD0iI2Y4ZmFmOSIvPjwvc3ZnPg==')] bg-repeat-x bg-[length:20px_10px] transform -translate-y-full"></div>
             <div class="absolute bottom-0 left-0 right-0 h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAxMCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ibm9uZSI+PHBhdGggZD0iTTAgMEwxMCAxMEwyMCAwSDB6IiBmaWxsPSIjZjhmYWY5Ii8+PC9zdmc+')] bg-repeat-x bg-[length:20px_10px] transform translate-y-full"></div>

            <div class="flex items-center justify-center mb-8 pb-6 border-b-2 border-stone-900 border-double">
              <h2 class="text-2xl font-bold text-stone-900 uppercase tracking-widest text-center">
                {{ storefrontContent.checkout.sections.orderSummary }}
              </h2>
            </div>

            <!-- Cart Items -->
            <div class="space-y-4 mb-8 max-h-80 overflow-y-auto pr-2 text-sm">
              <div
                v-for="item in cartStore.items"
                :key="item.productId"
                class="flex justify-between items-start pb-4 border-b border-dashed border-stone-200 last:border-0"
              >
                <div class="flex-1 pr-4">
                  <h4 class="font-bold text-stone-900 uppercase">
                    {{ item.title }}
                  </h4>
                  <p class="text-xs text-stone-500 mt-1">
                    {{ storefrontContent.checkout.summary.quantityShort }}: {{ item.quantity }} x {{ item.price }} {{ currencyCode }}
                  </p>
                </div>
                <div class="font-bold text-stone-900">
                  {{ (Number(item.lineTotal ?? (Number(item.price) * item.quantity))).toFixed(2) }} {{ currencyCode }}
                </div>
              </div>
            </div>

            <!-- Coupon -->
            <div class="p-4 bg-stone-50 rounded-xl border border-dashed border-stone-300 mb-8">
              <div class="flex gap-2">
                  <input
                    v-model="couponCode"
                    type="text"
                    :placeholder="storefrontContent.checkout.coupon.placeholder"
                    class="flex-1 h-10 bg-transparent border-b border-stone-300 text-sm focus:border-stone-900 focus:outline-none placeholder:text-stone-400"
                  >
                <button class="text-xs font-bold uppercase tracking-widest text-stone-900 hover:text-brand-600 transition-colors">
                  {{ storefrontContent.actions.apply }}
                </button>
              </div>
            </div>

            <!-- Totals -->
            <div class="space-y-3 pt-6 border-t-2 border-stone-900 border-dashed text-sm">
              <div class="flex justify-between">
                <span class="text-stone-600 uppercase">{{ storefrontContent.cart.summary.subtotal }}</span>
                <span class="font-bold text-stone-900">{{ cartStore.total }} {{ currencyCode }}</span>
              </div>
              <div v-if="selectedDelivery" class="flex justify-between">
                <span class="text-stone-600 uppercase">{{ storefrontContent.cart.summary.shipping }}</span>
                <span class="font-bold text-stone-900">{{ selectedDelivery.price }} {{ currencyCode }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-stone-600 uppercase">{{ storefrontContent.cart.summary.tax }}</span>
                <span class="font-bold text-stone-900">0.00 {{ currencyCode }}</span>
              </div>
                        
              <div class="flex justify-between items-end pt-6 mt-4 border-t-2 border-stone-900">
                <span class="font-bold text-xl text-stone-900 uppercase">{{ storefrontContent.cart.summary.total }}</span>
                <span class="font-bold text-2xl text-stone-900">{{ cartStore.total }} {{ currencyCode }}</span>
              </div>
            </div>

            <div
              v-if="errorMessage"
              class="mt-6 p-4 bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wide border border-red-200 text-center"
            >
              {{ errorMessage }}
            </div>

            <!-- Checkout Button -->
            <button 
              :disabled="submitting || !cartEnabled || !hasRequiredFields"
              class="w-full mt-8 bg-stone-900 hover:bg-stone-800 text-white font-bold py-5 px-6 rounded-xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 group relative overflow-hidden"
              @click="handleSubmit"
            >
              <Icon
                v-if="submitting"
                name="lucide:loader-2"
                class="w-5 h-5 animate-spin"
              />
              <span class="text-sm uppercase tracking-widest">
                {{ submitting ? storefrontContent.checkout.actions.placingOrder : (!cartEnabled ? storefrontContent.checkout.disabledShort : storefrontContent.checkout.actions.placeOrder) }}
              </span>
              <Icon
                v-if="!submitting && cartEnabled && hasRequiredFields"
                name="lucide:check-circle"
                class="w-5 h-5"
              />
            </button>
            
            <div class="mt-6 text-center">
                 <Icon name="lucide:shield-check" class="w-5 h-5 text-stone-300 mx-auto mb-2" />
                 <p class="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                     {{ storefrontContent.checkout.secureTransaction }}
                 </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watchEffect } from 'vue'
import { useCartStore } from '~/stores/cart'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'
import { DZ_WILAYAS } from '~/shared/geo/dz'

const router = useRouter()
const cartStore = useCartStore()
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

const form = reactive({
  fullName: '',
  phone: '',
  wilaya: '',
  commune: '',
  address: '',
  selectedDeliveryOption: ''
})

const maystroPrices = useMaystroDeliveryPrices({
  wilayaCode: () => form.wilaya,
  communeCode: () => form.commune
})

const deliveryOptions = computed(() => {
  const options: any[] = []

  availableProviders.value.forEach((provider: any) => {
    const homePrice =
      provider.key === 'MAYSTRO' && maystroPrices.homePrice.value != null
        ? String(Math.round(maystroPrices.homePrice.value))
        : provider.key === 'MAYSTRO'
          ? '—'
          : '350'
    const officePrice =
      provider.key === 'MAYSTRO' && maystroPrices.officePrice.value != null
        ? String(Math.round(maystroPrices.officePrice.value))
        : provider.key === 'MAYSTRO'
          ? '—'
          : '300'

    options.push({
      id: `${provider.key}-home`,
      provider: provider.key,
      providerLabel: provider.label,
      mode: 'home',
      modeLabel: storefrontContent.value.checkout.delivery.mode.homeDelivery,
      price: homePrice,
      description: storefrontContent.value.checkout.delivery.description.homeDelivery,
      icon: provider.icon,
      color: provider.color
    })

    options.push({
      id: `${provider.key}-pickup`,
      provider: provider.key,
      providerLabel: provider.label,
      mode: 'pickup',
      modeLabel: storefrontContent.value.checkout.delivery.mode.pickupPoint,
      price: officePrice,
      description: storefrontContent.value.checkout.delivery.description.pickupPoint,
      icon: provider.icon,
      color: provider.color
    })
  })

  if (storeSettings.value?.storePickupEnabled === true) {
    options.push({
      id: 'store-pickup',
      provider: null,
      providerLabel: 'Store',
      mode: 'store',
      modeLabel: storefrontContent.value.checkout.delivery.mode.storePickup,
      price: 'FREE',
      description: storefrontContent.value.checkout.delivery.description.storePickup,
      icon: 'lucide:store',
      color: 'green'
    })
  }

  return options
})

watchEffect(() => {
  const options = deliveryOptions.value
  if (!options.length) return
  const selected = form.selectedDeliveryOption
  if (!selected || !options.some((opt: any) => opt.id === selected)) {
    form.selectedDeliveryOption = options[0].id
  }
})

const couponCode = ref('')
const submitting = ref(false)
const errorMessage = ref('')

const selectedDelivery = computed(() => deliveryOptions.value.find((opt: any) => opt.id === form.selectedDeliveryOption))

const hasRequiredFields = computed(() => Boolean(form.fullName.trim() && form.phone.trim() && cartStore.hasItems && form.selectedDeliveryOption))

const handleSubmit = async () => {
  if (!cartEnabled.value) return
  errorMessage.value = ''

  cartStore.loadFromLocalStorage()
  if (!cartStore.hasItems) {
    errorMessage.value = storefrontContent.value.checkout.errors.emptyCart
    return
  }

  if (!form.fullName.trim()) {
    errorMessage.value = storefrontContent.value.checkout.errors.fullNameRequired
    return
  }
  if (!form.phone.trim()) {
    errorMessage.value = storefrontContent.value.checkout.errors.phoneRequired
    return
  }
  if (!form.selectedDeliveryOption) {
    errorMessage.value = storefrontContent.value.checkout.errors.deliveryRequired
    return
  }
  if (!hasRequiredFields.value) {
    errorMessage.value = storefrontContent.value.checkout.errors.requiredFields
    return
  }

  submitting.value = true
  try {
    const delivery = selectedDelivery.value
    const isMaystro = delivery?.provider === 'MAYSTRO'
    const maystroServiceLevel = delivery?.mode === 'pickup' ? 'office' : 'home'
    const maystroShippingAmount =
      isMaystro
        ? (maystroServiceLevel === 'office' ? maystroPrices.officePrice.value : maystroPrices.homePrice.value)
        : null

    if (isMaystro) {
      if (!form.wilaya || !form.commune) {
        errorMessage.value = storefrontContent.value.checkout.errors.deliveryRequired
        return
      }
      if (maystroShippingAmount == null) {
        errorMessage.value = 'Maystro shipping price unavailable for selected commune'
        return
      }
    }

    const url = useTenantApiUrl('/api/orders')
    const payload = {
      customerName: form.fullName.trim(),
      customerPhone: form.phone.trim(),
      customerAddress: form.address?.trim() || undefined,
      shippingAddressLine1: form.address?.trim() || undefined,
      shippingWilayaCode: form.wilaya || undefined,
      shippingCommuneCode: form.commune || undefined,
      deliveryMode: delivery?.mode,
      shippingProvider: delivery?.provider || undefined,
      shippingServiceLevel: isMaystro ? maystroServiceLevel : undefined,
      shippingAmount: isMaystro && maystroShippingAmount != null ? maystroShippingAmount : undefined,
      shippingCurrency: isMaystro ? currencyCode.value : undefined,
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

onMounted(() => {
  cartStore.loadFromLocalStorage()
  if (!cartStore.hasItems) router.push('/')
})
</script>
