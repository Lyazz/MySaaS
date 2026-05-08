<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'
import { DZ_WILAYAS } from '~/shared/geo/dz'

const cartStore = useCartStore()
const router = useRouter()
const storeSettings = useState<any>('storeSettings')
const storefrontContent = useStorefrontContent()
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

const maystroPrices = useMaystroDeliveryPrices({
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

const grandTotal = computed(() => {
  const delivery = selectedDelivery.value
  if (!delivery || delivery.price === 'FREE' || delivery.price === '—') return cartStore.total
  const deliveryPrice = Number(delivery.price)
  return isNaN(deliveryPrice) ? cartStore.total : cartStore.total + deliveryPrice
})

const hasRequiredFields = computed(() => Boolean(
  form.value.fullName.trim() &&
  form.value.phone.trim() &&
  cartStore.hasItems &&
  cartStore.total >= minimumOrderAmount.value &&
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
        const maystroShippingAmount =
          isMaystro
            ? (maystroServiceLevel === 'office' ? maystroPrices.officePrice.value : maystroPrices.homePrice.value)
            : null

        if (isMaystro) {
          if (!form.value.wilaya || !form.value.commune) {
            errorMessage.value = storefrontContent.value.checkout.errors.deliveryRequired
            return
          }
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
</script>

<template>
  <div class="bg-[#f8faf9] min-h-screen py-10 font-sans text-slate-600">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-slate-900">
          {{ storefrontContent.checkout.title }}
        </h1>
        <p class="text-lg text-slate-500 font-medium">
          {{ storefrontContent.cart.itemsCount(cartStore.itemCount) }}
        </p>
        <div
          v-if="!cartEnabled"
          class="mt-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm px-4 py-3"
        >
          {{ storefrontContent.checkout.disabled }}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left Column: Attributes & Delivery -->
        <div class="lg:col-span-7 space-y-8">
          <!-- Personal Info -->
          <div class="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-sm font-semibold text-slate-700 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.fullName.label }}</label>
                <input
                  v-model="form.fullName"
                  type="text"
                  class="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                  :placeholder="storefrontContent.checkout.form.fullName.placeholder"
                >
              </div>
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-sm font-semibold text-slate-700 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.phone.label }}</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  class="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                  :placeholder="storefrontContent.checkout.form.phone.placeholder"
                >
              </div>
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-sm font-semibold text-slate-700 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                <div class="relative">
                  <select
                    v-model="form.wilaya"
                    class="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none appearance-none cursor-pointer shadow-sm"
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
                  <div class="absolute right-4 rtl:right-auto rtl:left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <Icon name="lucide:chevron-down" class="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div class="col-span-2 md:col-span-1 space-y-2">
                <label class="block text-sm font-semibold text-slate-700 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.commune.label }}</label>
                <CommuneField
                  v-model="form.commune"
                  :wilaya-code="form.wilaya"
                  :placeholder="storefrontContent.checkout.form.commune.placeholder"
                  :input-class="'w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm'"
                  :select-class="'w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm'"
                />
              </div>
              <div v-if="!hideOptionalAddress" class="col-span-2 space-y-2">
                <label class="block text-sm font-semibold text-slate-700 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.address.label }}</label>
                <input
                  v-model="form.address"
                  type="text"
                  class="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                  :placeholder="storefrontContent.checkout.form.address.placeholder"
                >
              </div>
            </div>
          </div>

          <!-- Delivery Options -->
          <div v-if="form.wilaya && form.commune" class="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wide">
                {{ storefrontContent.checkout.sections.deliveryOptions }}
              </h3>
              <span class="text-[10px] font-bold text-brand-600 bg-brand-100 px-2 py-1 rounded-full uppercase">
                {{ storefrontContent.checkout.required }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mb-6 font-medium">
              {{ storefrontContent.checkout.help.deliveryOptions }}
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
                        {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
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
                <div v-if="option.mode === 'pickup' && option.provider === 'MAYSTRO' && (pickupPointsLoading || stopDeskName || form.pickupPoint || pickupPointsError)" class="mt-3 pt-3 border-t border-slate-100">
                  <div v-if="pickupPointsLoading" class="flex items-center gap-2 text-xs text-slate-500">
                    <Icon name="lucide:loader-2" class="w-3 h-3 animate-spin" />
                    Loading...
                  </div>
                  <template v-else>
                    <div v-if="stopDeskName" class="flex items-center gap-2 text-xs text-slate-500">
                      <Icon name="lucide:building-2" class="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span>{{ stopDeskName }}</span>
                    </div>
                    <div v-if="form.pickupPoint" class="flex items-center gap-2 text-xs mt-1">
                      <Icon name="lucide:map-pin" class="w-3 h-3 text-blue-600" />
                      <span class="font-semibold text-slate-800">{{ form.pickupPoint }}</span>
                    </div>
                  </template>
                  <p v-if="pickupPointsError" class="text-xs text-amber-600 mt-1">{{ pickupPointsError }}</p>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="bg-white p-6 rounded-3xl shadow-soft border border-slate-100 text-center text-sm text-slate-400">
            <Icon name="lucide:map-pin" class="w-5 h-5 mx-auto mb-2 text-slate-300" />
            {{ storefrontContent.checkout.help.deliveryOptions }}
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
                  {{ formatAmount(item.price) }} {{ currencyCode }}
                </div>
              </div>
            </div>

            <!-- Coupon -->
            <div class="bg-gradient-to-br from-brand-50/30 to-brand-100/20 p-5 rounded-2xl border border-brand-200/50 mb-6 backdrop-blur-sm">
              <div class="flex justify-between items-center mb-3">
                <div class="flex items-center gap-2">
                  <Icon name="lucide:ticket-percent" class="w-4 h-4 text-brand-600" />
                  <h4 class="text-sm font-bold text-slate-800">
                    {{ storefrontContent.checkout.coupon.title }}
                  </h4>
                </div>
                <span class="text-[10px] font-bold text-brand-700 bg-brand-200/60 px-2.5 py-1 rounded-full uppercase tracking-wide">
                  • {{ storefrontContent.checkout.coupon.badge }}
                </span>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="couponCode"
                  type="text"
                  :placeholder="storefrontContent.checkout.coupon.placeholder"
                  class="flex-1 h-11 rounded-xl border-2 border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm font-medium"
                >
                <button class="px-5 h-11 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-brand-200 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap">
                  {{ storefrontContent.actions.apply }}
                </button>
              </div>
            </div>

            <!-- Totals -->
            <div class="space-y-3 pt-4 border-t border-slate-100">
              <div v-if="selectedDelivery" class="flex justify-between text-sm">
                <span class="text-slate-500">{{ storefrontContent.checkout.summary.deliveryOption }}</span>
                <div class="flex items-center gap-2">
                  <Icon :name="selectedDelivery.icon" class="w-4 h-4 text-slate-600" />
                  <span class="font-medium text-slate-900">{{ selectedDelivery.providerLabel }} - {{ selectedDelivery.modeLabel }}</span>
                </div>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">{{ storefrontContent.cart.summary.subtotal }}</span>
                <span class="font-bold text-slate-900">{{ formatAmount(cartStore.total) }} {{ currencyCode }}</span>
              </div>
              <div v-if="selectedDelivery" class="flex justify-between text-sm">
                <span class="text-slate-500">{{ storefrontContent.checkout.summary.shippingFee }}</span>
                <span class="font-bold text-brand-600">{{ selectedDelivery.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${selectedDelivery.price} ${currencyCode}` }}</span>
              </div>
                        
              <div class="flex justify-between items-end pt-4 border-t border-slate-100 mt-4">
                <span class="font-bold text-xl text-slate-900">{{ storefrontContent.cart.summary.total }}</span>
                <span class="font-bold text-xl text-slate-900">{{ formatAmount(grandTotal) }} {{ currencyCode }}</span>
              </div>
              <p class="text-xs text-slate-400 mt-1">
                {{ storefrontContent.checkout.minimumOrder(formatAmount(minimumOrderAmount), currencyCode) }}
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
                {{ submitting ? storefrontContent.checkout.actions.placingOrder : (!cartEnabled ? storefrontContent.checkout.disabledShort : storefrontContent.checkout.actions.placeOrder) }}
              </span>
              <Icon
                v-if="!submitting && cartEnabled && hasRequiredFields"
                name="lucide:arrow-right"
                class="w-5 h-5 relative z-10 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:rotate-180"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
