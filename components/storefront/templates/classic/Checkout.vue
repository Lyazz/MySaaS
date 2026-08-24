<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'
import { DZ_WILAYAS } from '~/shared/geo/dz'

const cartStore = useCartStore()
const router = useRouter()
const storeSettings = useState<any>('storeSettings')
const storefrontContent = useStorefrontContent()
const { t } = useI18n({ useScope: 'global' })
const { currencyCode, formatAmount } = useCurrency()
const cartEnabled = computed(() => storeSettings.value?.cartEnabled !== false && storeSettings.value?.codEnabled !== false)
const wilayas = DZ_WILAYAS

const minimumOrderAmount = computed(() => {
  const raw = Number(storeSettings.value?.minimumOrderAmountDzd ?? 1000)
  return Number.isFinite(raw) && raw >= 0 ? raw : 1000
})
const hideOptionalAddress = computed(() => storeSettings.value?.hideOptionalAddress !== false)

// Available delivery providers based on store settings
const availableProviders = computed(() => {
  const allowed = storeSettings.value?.allowedDeliveryProviders || ['SELF']
  const providerMeta = {
    MAYSTRO: { label: 'Maystro', icon: 'lucide:truck', color: 'emerald' },
    YALIDINE: { label: 'Yalidine', icon: 'lucide:package', color: 'blue' },
    ECOTRACK: { label: 'Ecotrack', icon: 'lucide:send', color: 'purple' },
    ZR_EXPRESS: { label: 'ZR Express', icon: 'lucide:zap', color: 'orange' },
    SELF: { label: storefrontContent.value.checkout.delivery.provider.self, icon: 'lucide:bike', color: 'lime' }
  }
  return allowed.map((key: string) => ({ key, ...providerMeta[key as keyof typeof providerMeta] }))
})

// Unified delivery options combining provider and mode
const deliveryOptions = computed(() => {
  const options: any[] = []
  
  // Add provider options (home + pickup for each)
  availableProviders.value.forEach((provider: any) => {
    const providerPrices = maystroPrices.pricesByProvider.value?.[provider.key]
    const homePrice = providerPrices?.home != null ? String(Math.round(providerPrices.home)) : '—'
    const officePrice = providerPrices?.office != null ? String(Math.round(providerPrices.office)) : '—'

    // Home delivery option
    options.push({
      id: `${provider.key}-home`,
      provider: provider.key,
      providerLabel: provider.label,
      mode: 'home',
      modeLabel: storefrontContent.value.checkout.delivery.mode.homeDelivery,
      icon: provider.icon,
      color: provider.color,
      price: homePrice,
      description: storefrontContent.value.checkout.delivery.description.homeDelivery
    })
    
    // Pickup point option
    options.push({
      id: `${provider.key}-pickup`,
      provider: provider.key,
      providerLabel: provider.label,
      mode: 'pickup',
      modeLabel: storefrontContent.value.checkout.delivery.mode.pickupPoint,
      icon: provider.icon,
      color: provider.color,
      price: officePrice,
      description: storefrontContent.value.checkout.delivery.description.pickupPoint
    })
  })
  
  // Store pickup as last option
  if (storeSettings.value?.storePickupEnabled === true) {
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
  }
  
  return options
})

const form = ref({
  fullName: '',
  phone: '',
  wilaya: '',
  commune: '',
  address: '',
  pickupPoint: '',
  selectedDeliveryOption: ''
})

const maystroPrices = useDeliveryPrices({
  wilayaCode: () => form.value.wilaya,
  communeCode: () => form.value.commune
})

watchEffect(() => {
  const options = deliveryOptions.value
  if (!options.length) return
  const selected = form.value.selectedDeliveryOption
  if (!selected || !options.some((opt: any) => opt.id === selected)) {
    form.value.selectedDeliveryOption = options[0].id
  }
})

const submitting = ref(false)
const errorMessage = ref('')
const couponCode = ref('')
const loyalty = useCheckoutLoyalty()

watch(() => form.value.phone, (phone) => {
  loyalty.phone.value = phone.trim()
}, { immediate: true })

const selectedDelivery = computed(() =>
  deliveryOptions.value.find((opt: any) => opt.id === form.value.selectedDeliveryOption)
)

const isMaystroPickup = computed(() => selectedDelivery.value?.provider === 'MAYSTRO' && selectedDelivery.value?.mode === 'pickup')
const isMaystroAvailable = computed(() => availableProviders.value.some((p: any) => p.key === 'MAYSTRO'))
const pickupPoints = ref<Array<{ pickup_point: number; commune: number; name?: string; name_lt?: string; name_ar?: string; delivery_type: number }>>([])
const pickupPointsLoading = ref(false)
const pickupPointsError = ref('')
const stopDeskName = ref('')

const syncPickupPointCommune = () => {
  const name = (form.value.pickupPoint || '').trim()
  if (!name) return
  const point = pickupPoints.value.filter(p => p.delivery_type === 3).find((p) => (p.name || p.name_lt || p.name_ar || '') === name)
  if (!point?.commune) return
  const nextCommune = String(point.commune)
  if (nextCommune && form.value.commune !== nextCommune) form.value.commune = nextCommune
}

watch(
  [isMaystroPickup, isMaystroAvailable, () => form.value.commune, () => form.value.wilaya],
  async ([isPickup, maystroEnabled, commune, wilaya]) => {
    pickupPointsError.value = ''
    pickupPoints.value = []
    stopDeskName.value = ''
    form.value.pickupPoint = ''
    if (!maystroEnabled || !wilaya || !commune) return
    if (!isPickup) return
    pickupPointsLoading.value = true
    try {
      const url = useTenantApiUrl(`/api/delivery/maystro/pickup-points?commune=${encodeURIComponent(commune as string)}&wilaya=${encodeURIComponent(wilaya as string)}&nearby=true`)
      const data = await $fetch<any[]>(url, { headers: { ...(useTenantApiHeaders() || {}) } })
      pickupPoints.value = Array.isArray(data)
        ? data.map((p: any) => ({
            pickup_point: Number(p?.pickup_point),
            commune: Number(p?.commune),
            name: p?.name ? String(p.name) : (p?.name_lt ? String(p.name_lt) : (p?.name_ar ? String(p.name_ar) : undefined)),
            name_lt: p?.name_lt ? String(p.name_lt) : undefined,
            name_ar: p?.name_ar ? String(p.name_ar) : undefined,
            delivery_type: Number(p?.delivery_type)
          })).filter((p) => Number.isFinite(p.commune) && p.commune > 0)
        : []
      const stopDesk = pickupPoints.value.find(p => p.delivery_type === 2)
      stopDeskName.value = stopDesk ? (stopDesk.name || stopDesk.name_lt || stopDesk.name_ar || '') : ''
      const relaisPoints = pickupPoints.value.filter(p => p.delivery_type === 3)
      if (relaisPoints.length > 0) {
        form.value.pickupPoint = relaisPoints[0].name || relaisPoints[0].name_lt || relaisPoints[0].name_ar || ''
        syncPickupPointCommune()
      } else if (pickupPoints.value.length === 0) {
        pickupPointsError.value = 'Aucun point relais disponible dans cette région'
      }
    } catch (e: any) {
      pickupPoints.value = []
      pickupPointsError.value = e?.data?.statusMessage || e?.data?.message || 'Failed to load pickup points'
    } finally {
      pickupPointsLoading.value = false
    }
  },
  { immediate: true }
)

const discountedSubtotal = computed(() => Math.max(0, cartStore.total - cartStore.clearanceDiscount))

const grandTotal = computed(() => {
  const delivery = selectedDelivery.value
  if (!delivery || delivery.price === 'FREE' || delivery.price === '—') return discountedSubtotal.value
  const deliveryPrice = Number(delivery.price)
  return isNaN(deliveryPrice) ? discountedSubtotal.value : discountedSubtotal.value + deliveryPrice
})

const hasRequiredFields = computed(() => Boolean(
  form.value.fullName.trim() &&
  form.value.phone.trim() &&
  form.value.wilaya &&
  form.value.commune &&
  cartStore.hasItems &&
  discountedSubtotal.value >= minimumOrderAmount.value &&
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
    if (!form.value.wilaya || !form.value.commune) {
      errorMessage.value = storefrontContent.value.checkout.errors.requiredFields || storefrontContent.value.checkout.errors.deliveryRequired
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
        const isMaystro = delivery?.provider === 'MAYSTRO'
        const maystroServiceLevel = delivery?.mode === 'pickup' ? 'office' : 'home'
        const providerPrices = delivery?.provider ? maystroPrices.pricesByProvider.value?.[delivery.provider] : undefined
        const maystroShippingAmount =
          providerPrices
            ? (maystroServiceLevel === 'office' ? providerPrices.office : providerPrices.home)
          : null

        if (isMaystro) {
          
          if (delivery?.mode === 'pickup' && !String(form.value.pickupPoint || '').trim() && !stopDeskName.value) {
            errorMessage.value = storefrontContent.value.checkout.errors.deliveryRequired
            return
          }
          if (maystroShippingAmount == null) {
            errorMessage.value = 'Maystro shipping price unavailable for selected commune'
            return
          }
        }
        const payload = {
          customerName: form.value.fullName.trim(),
          customerPhone: form.value.phone.trim(),
          customerAddress: hideOptionalAddress.value ? undefined : (form.value.address?.trim() || undefined),
          shippingAddressLine1: hideOptionalAddress.value ? undefined : (form.value.address?.trim() || undefined),
          shippingWilayaCode: form.value.wilaya || undefined,
          shippingCommuneCode: form.value.commune || undefined,
          deliveryMode: delivery?.mode,
          shippingProvider: delivery?.provider || undefined,
          shippingPickupPoint: isMaystro && delivery?.mode === 'pickup' ? (form.value.pickupPoint || undefined) : undefined,
          shippingServiceLevel: delivery?.provider ? maystroServiceLevel : undefined,
          shippingAmount: maystroShippingAmount != null ? maystroShippingAmount : undefined,
          shippingCurrency: delivery?.provider ? currencyCode.value : undefined,
          redeemPointsRequested: loyalty.redeemPointsRequested.value || undefined,
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
        loyalty.reset()
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
  <div class="bg-white min-h-screen py-12 font-serif text-slate-600">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-12 text-center">
        <h1 class="text-4xl font-serif font-bold text-slate-900 mb-2">
          {{ storefrontContent.checkout.title }}
        </h1>
        <p class="text-sm uppercase tracking-widest text-slate-500 font-bold">
          {{ storefrontContent.checkout.itemsInCart(cartStore.itemCount) }}
        </p>
        <div
          v-if="!cartEnabled"
          class="mt-6 border border-amber-200 bg-amber-50 text-amber-800 text-sm px-6 py-4 inline-block"
        >
          {{ storefrontContent.checkout.disabled }}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <!-- Left Column: Attributes & Delivery -->
        <div class="lg:col-span-7 space-y-12">
          <!-- Personal Info -->
          <div>
             <h3 class="text-xs font-bold uppercase tracking-widest text-slate-900 mb-6 border-b border-slate-200 pb-2">
                {{ storefrontContent.checkout.sections.customerInformation }}
             </h3>
             <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-xs font-bold uppercase tracking-widest text-slate-500">{{ storefrontContent.checkout.form.fullName.label }}</label>
                <input
                  v-model="form.fullName"
                  type="text"
                  class="w-full h-12 border border-slate-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-0 transition-all outline-none rounded-none"
                  :placeholder="storefrontContent.checkout.form.fullName.placeholder"
                >
              </div>
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-xs font-bold uppercase tracking-widest text-slate-500">{{ storefrontContent.checkout.form.phone.label }}</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  class="w-full h-12 border border-slate-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-0 transition-all outline-none rounded-none"
                  :placeholder="storefrontContent.checkout.form.phone.placeholder"
                >
              </div>
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-xs font-bold uppercase tracking-widest text-slate-500">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                <WilayaField
                        v-model="form.wilaya"
                        input-class="w-full h-12 border border-slate-300 bg-white px-4 text-slate-900 focus:border-slate-900 focus:ring-0 transition-all outline-none appearance-none cursor-pointer rounded-none"
                        :placeholder="storefrontContent.checkout.form.wilaya.placeholder"
                      />
              </div>
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-xs font-bold uppercase tracking-widest text-slate-500">{{ storefrontContent.checkout.form.commune.label }}</label>
                <CommuneField
                  v-model="form.commune"
                  :wilaya-code="form.wilaya"
                  :placeholder="storefrontContent.checkout.form.commune.placeholder"
                  :input-class="'w-full h-12 border border-slate-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-0 transition-all outline-none rounded-none'"
                  :select-class="'w-full h-12 border border-slate-300 bg-white px-4 text-slate-900 focus:border-slate-900 focus:ring-0 transition-all outline-none rounded-none'"
                />
              </div>
              <div v-if="!hideOptionalAddress" class="col-span-2 space-y-2">
                <label class="block text-xs font-bold uppercase tracking-widest text-slate-500">{{ storefrontContent.checkout.form.address.label }}</label>
                <input
                  v-model="form.address"
                  type="text"
                  class="w-full h-12 border border-slate-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-0 transition-all outline-none rounded-none"
                  :placeholder="storefrontContent.checkout.form.address.placeholder"
                >
              </div>
            </div>
          </div>

          <!-- Delivery Options -->
          <div v-if="form.wilaya && form.commune">
            <div class="flex items-center justify-between mb-6 border-b border-slate-200 pb-2">
              <h3 class="text-xs font-bold uppercase tracking-widest text-slate-900">
                {{ storefrontContent.checkout.sections.deliveryMethod }}
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
                    {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
                  </div>
                </div>
                <div v-if="option.mode === 'pickup' && option.provider === 'MAYSTRO' && (pickupPointsLoading || stopDeskName || form.pickupPoint || pickupPointsError)" class="mt-3 pt-3 border-t border-slate-200">
                  <div v-if="pickupPointsLoading" class="flex items-center gap-2 text-xs text-slate-500">
                    <Icon name="lucide:loader-2" class="w-3 h-3 animate-spin" />
                    Loading...
                  </div>
                  <template v-else>
                    <div v-if="stopDeskName" class="flex items-center gap-2 text-xs text-slate-400">
                      <Icon name="lucide:building-2" class="w-3 h-3 text-slate-300 flex-shrink-0" />
                      <span>{{ stopDeskName }}</span>
                    </div>
                    <div v-if="form.pickupPoint" class="flex items-center gap-2 text-xs mt-1">
                      <Icon name="lucide:map-pin" class="w-3 h-3 text-blue-600" />
                      <span class="font-bold text-slate-900">{{ form.pickupPoint }}</span>
                    </div>
                  </template>
                  <p v-if="pickupPointsError" class="text-xs text-amber-600 mt-1">{{ pickupPointsError }}</p>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="p-5 border border-slate-200 text-center text-sm text-slate-400">
            <Icon name="lucide:map-pin" class="w-5 h-5 mx-auto mb-2 text-slate-300" />
            {{ storefrontContent.checkout.help.deliveryOptions }}
          </div>

        </div>

        <!-- Right Column: Summary -->
        <div class="lg:col-span-5">
          <div class="bg-slate-50 p-8 border border-slate-200 sticky top-24">
            <h2 class="text-lg font-serif font-bold text-slate-900 mb-6 border-b border-slate-200 pb-4">
              {{ storefrontContent.checkout.sections.orderSummary }}
            </h2>
            
            <!-- Cart Items -->
            <div class="space-y-6 mb-8 max-h-96 overflow-y-auto pe-2">
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
                        {{ storefrontContent.checkout.summary.quantityShort }}: {{ item.quantity }}
                    </p>
                  </div>
                  <div class="font-bold text-slate-900 text-sm">
                    {{ formatAmount(item.price) }} {{ currencyCode }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Coupon -->
            <div class="flex gap-2 mb-8 border-t border-slate-200 pt-6">
                <input
                  v-model="couponCode"
                  type="text"
                  :placeholder="storefrontContent.checkout.coupon.title"
                  class="flex-1 h-10 border-b border-slate-300 bg-transparent px-2 text-sm text-slate-900 focus:border-slate-900 focus:ring-0 transition-all outline-none rounded-none"
                >
              <button class="px-4 h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest transition-colors">
                {{ storefrontContent.actions.apply }}
              </button>
            </div>

            <!-- Totals -->
            <div class="space-y-4 pt-4 border-t border-slate-200">
              <div class="flex justify-between text-sm">
                <span class="text-slate-500 uppercase tracking-wider text-xs font-bold">{{ storefrontContent.cart.summary.subtotal }}</span>
                <span class="font-medium text-slate-900">{{ formatAmount(cartStore.total) }} {{ currencyCode }}</span>
              </div>
              <div v-if="cartStore.clearanceDiscount > 0" class="flex justify-between text-sm">
                <span class="text-amber-700 uppercase tracking-wider text-xs font-bold">{{ t('storefront.clearance.discountLine') }}</span>
                <span class="font-medium text-amber-700">-{{ formatAmount(cartStore.clearanceDiscount) }} {{ currencyCode }}</span>
              </div>
              <div v-if="selectedDelivery" class="flex justify-between text-sm">
                <span class="text-slate-500 uppercase tracking-wider text-xs font-bold">{{ storefrontContent.cart.summary.shipping }}</span>
                <span class="font-medium text-slate-900">{{ selectedDelivery.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${selectedDelivery.price} ${currencyCode}` }}</span>
              </div>
                        
              <div class="flex justify-between items-end pt-6 border-t border-slate-200 mt-4">
                <span class="font-serif font-bold text-xl text-slate-900">{{ storefrontContent.cart.summary.total }}</span>
                <span class="font-serif font-bold text-xl text-slate-900">{{ formatAmount(grandTotal) }} {{ currencyCode }}</span>
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
                {{ submitting ? storefrontContent.checkout.actions.placingOrder : (!cartEnabled ? storefrontContent.checkout.disabledShort : storefrontContent.checkout.actions.placeOrder) }}
              </span>
              <Icon
                v-if="!submitting && cartEnabled && hasRequiredFields"
                name="lucide:arrow-right"
                class="w-4 h-4 relative z-10 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:rotate-180"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
