<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'
import { DZ_WILAYAS } from '~/shared/geo/dz'

const cartStore = useCartStore()
const router = useRouter()
const storeSettings = useState<any>('storeSettings')
const storefrontContent = useStorefrontContent()
const { currencyCode, format: formatCurrency } = useCurrency()
const cartEnabled = computed(() => storeSettings.value?.cartEnabled !== false && storeSettings.value?.codEnabled !== false)
const wilayas = DZ_WILAYAS

// Available delivery providers based on store settings
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
  cartStore.total >= 1000 &&
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
          customerAddress: form.value.address?.trim() || undefined,
          shippingAddressLine1: form.value.address?.trim() || undefined,
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
  <div class="min-h-screen bg-stone-50 py-12 font-wellness text-stone-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Loading State -->
      <div v-if="submitting" class="fixed inset-0 bg-stone-50/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
         <div class="w-16 h-16 border-4 border-stone-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
         <p class="text-stone-600 font-wellness text-lg animate-pulse">{{ storefrontContent.checkout.actions.placingOrder }}</p>
      </div>

      <!-- Header -->
      <div class="mb-10 text-center">
        <h1 class="text-4xl font-wellness font-bold text-stone-900 mb-2">
          {{ storefrontContent.checkout.title }}
        </h1>
        <p class="text-stone-500">
          {{ storefrontContent.checkout.secureTransaction }}
        </p>
        <div
          v-if="!cartEnabled"
          class="mt-4 inline-block rounded-full border border-amber-200 bg-amber-50 text-amber-900 text-sm px-6 py-2"
        >
          {{ storefrontContent.checkout.disabled }}
        </div>
      </div>

      <div class="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start xl:gap-x-16">
        <!-- Main Form Column -->
        <section class="lg:col-span-7 space-y-8">
          
          <form @submit.prevent="handleSubmit" class="space-y-8">
            
            <!-- Personal Info -->
            <div class="bg-white rounded-[2rem] shadow-sm border border-stone-100 p-8">
              <h2 class="text-xl font-wellness text-stone-900 mb-6 flex items-center gap-3">
                 <span class="flex items-center justify-center w-8 h-8 rounded-full bg-stone-100 text-stone-600 text-sm font-bold">1</span>
                 Contact Information
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div class="col-span-2 md:col-span-1 space-y-2">
                    <label class="block text-sm font-medium text-stone-700 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.fullName.label }}</label>
                    <input
                      v-model="form.fullName"
                      type="text"
                      class="w-full h-12 rounded-xl border border-stone-200 bg-stone-50 px-4 text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                    :placeholder="storefrontContent.checkout.form.fullName.placeholder"
                    >
                 </div>
                 <div class="col-span-2 md:col-span-1 space-y-2">
                    <label class="block text-sm font-medium text-stone-700 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.phone.label }}</label>
                    <input
                      v-model="form.phone"
                      type="tel"
                      class="w-full h-12 rounded-xl border border-stone-200 bg-stone-50 px-4 text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                    :placeholder="storefrontContent.checkout.form.phone.placeholder"
                    >
                 </div>
                 <div class="col-span-2 md:col-span-1 space-y-2">
                    <label class="block text-sm font-medium text-stone-700 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                    <div class="relative">
	                      <select
	                        v-model="form.wilaya"
	                        class="w-full h-12 rounded-xl border border-stone-200 bg-stone-50 px-4 text-stone-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none appearance-none cursor-pointer shadow-sm"
	                      >
	                        <option value="" disabled>{{ storefrontContent.checkout.form.wilaya.placeholder }}</option>
	                        <option
	                          v-for="w in wilayas"
	                          :key="w.code"
	                          :value="w.code"
	                        >
	                          {{ w.code }} - {{ w.name }}
	                        </option>
	                      </select>
                      <div class="absolute right-4 rtl:right-auto rtl:left-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500">
                        <Icon name="lucide:chevron-down" class="w-4 h-4" />
                      </div>
                    </div>
                 </div>
	                 <div class="col-span-2 md:col-span-1 space-y-2">
	                    <label class="block text-sm font-medium text-stone-700 ml-1">{{ storefrontContent.checkout.form.commune.label }}</label>
	                    <CommuneField
	                      v-model="form.commune"
	                      :wilaya-code="form.wilaya"
	                      :placeholder="storefrontContent.checkout.form.commune.placeholder"
	                      :input-class="'w-full h-12 rounded-xl border border-stone-200 bg-stone-50 px-4 text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm'"
	                      :select-class="'w-full h-12 rounded-xl border border-stone-200 bg-stone-50 px-4 text-stone-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm'"
	                    />
	                 </div>
                 <div class="col-span-2 space-y-2">
                    <label class="block text-sm font-medium text-stone-700 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.address.label }}</label>
                    <input
                      v-model="form.address"
                      type="text"
                      class="w-full h-12 rounded-xl border border-stone-200 bg-stone-50 px-4 text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                    :placeholder="storefrontContent.checkout.form.address.placeholder"
                    >
                 </div>
              </div>
            </div>

            <!-- Delivery Options -->
            <div v-if="form.wilaya && form.commune" class="bg-white rounded-[2rem] shadow-sm border border-stone-100 p-8">
               <h2 class="text-xl font-wellness text-stone-900 mb-6 flex items-center gap-3">
                 <span class="flex items-center justify-center w-8 h-8 rounded-full bg-stone-100 text-stone-600 text-sm font-bold">2</span>
                 {{ storefrontContent.checkout.sections.deliveryOptions }}
              </h2>
               <div class="space-y-4">
                  <div
                    v-for="option in deliveryOptions"
                    :key="option.id"
                    class="cursor-pointer relative rounded-2xl p-4 border transition-all duration-300 group hover:shadow-md"
                    :class="form.selectedDeliveryOption === option.id 
                      ? 'border-brand-500 bg-brand-50/30' 
                      : 'border-stone-200 hover:border-brand-300 bg-white'"
                    @click="form.selectedDeliveryOption = option.id"
                  >
                    <div class="flex items-center gap-4">
                       <!-- Icon -->
                       <div 
                         class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
                         :class="form.selectedDeliveryOption === option.id ? `bg-${option.color}-100 text-${option.color}-700` : 'bg-stone-100 text-stone-400 group-hover:text-stone-600'"
                       >
                         <Icon :name="option.icon" class="w-6 h-6" />
                       </div>

                       <!-- Details -->
                       <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 mb-1">
                             <h4 class="font-bold text-stone-900 text-sm">{{ option.providerLabel }}</h4>
                             <span 
                               class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                               :class="option.mode === 'home' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'"
                             >
                               {{ option.modeLabel }}
                             </span>
                          </div>
                          <p class="text-xs text-stone-500">{{ option.description }}</p>
                       </div>

                       <!-- Price & Check -->
                       <div class="flex items-center gap-4">
                          <div class="font-bold text-brand-700 text-sm">
                             {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
                          </div>
                          <div
                            class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                            :class="form.selectedDeliveryOption === option.id ? 'border-brand-600 bg-brand-600' : 'border-stone-300'"
                          >
                             <Icon v-if="form.selectedDeliveryOption === option.id" name="lucide:check" class="w-3.5 h-3.5 text-white" />
                          </div>
                       </div>
                    </div>
                    <div v-if="option.mode === 'pickup' && option.provider === 'MAYSTRO' && (pickupPointsLoading || stopDeskName || form.pickupPoint || pickupPointsError)" class="mt-3 pt-3 border-t border-stone-100">
                      <div v-if="pickupPointsLoading" class="flex items-center gap-2 text-xs text-stone-500">
                        <Icon name="lucide:loader-2" class="w-3 h-3 animate-spin" />
                        Loading...
                      </div>
                      <template v-else>
                        <div v-if="stopDeskName" class="flex items-center gap-2 text-xs text-stone-400">
                          <Icon name="lucide:building-2" class="w-3 h-3 text-stone-300 flex-shrink-0" />
                          <span>{{ stopDeskName }}</span>
                        </div>
                        <div v-if="form.pickupPoint" class="flex items-center gap-2 text-xs mt-1">
                          <Icon name="lucide:map-pin" class="w-3 h-3 text-brand-600" />
                          <span class="font-semibold text-stone-800">{{ form.pickupPoint }}</span>
                        </div>
                      </template>
                      <p v-if="pickupPointsError" class="text-xs text-amber-600 mt-1">{{ pickupPointsError }}</p>
                    </div>
                  </div>
               </div>
            </div>
            <div v-else class="bg-white rounded-[2rem] shadow-sm border border-stone-100 p-8 text-center text-sm text-stone-400">
              <Icon name="lucide:map-pin" class="w-5 h-5 mx-auto mb-2 text-stone-300" />
              {{ storefrontContent.checkout.help.deliveryOptions }}
            </div>

            <div
              v-if="errorMessage"
              class="rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-3 flex items-start gap-3"
            >
              <Icon name="lucide:alert-circle" class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span class="font-medium">{{ errorMessage }}</span>
            </div>

            <!-- Submit Button -->
            <button
               type="submit"
               :disabled="submitting || cartStore.items.length === 0 || !hasRequiredFields"
               class="w-full flex items-center justify-center rounded-full border border-transparent bg-stone-900 px-8 py-5 text-base font-bold text-white shadow-lg hover:bg-brand-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
            >
               <span v-if="submitting" class="flex items-center gap-2">
                 <Icon name="lucide:loader-2" class="w-5 h-5 animate-spin" />
                 {{ storefrontContent.checkout.actions.placingOrder }}
               </span>
               <span v-else>
                 {{ storefrontContent.checkout.actions.placeOrder }} • {{ formatCurrency(grandTotal) }}
               </span>
            </button>
            <p class="text-center text-xs text-stone-400 mt-2 flex items-center justify-center gap-1">
               <Icon name="lucide:lock" class="w-3 h-3" />
               {{ storefrontContent.checkout.secureTransaction }}
            </p>
          </form>
        </section>

        <!-- Order Summary Sidebar -->
        <section class="mt-16 bg-white rounded-[2.5rem] shadow-lg border border-stone-100 px-8 py-10 lg:col-span-5 lg:mt-0 lg:sticky lg:top-8">
           <div class="flex items-center justify-between mb-8 pb-6 border-b border-stone-100">
             <h2 class="text-2xl font-wellness text-stone-900">{{ storefrontContent.checkout.orderSummaryTitle }}</h2>
             <span class="bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-sm font-bold">
               {{ storefrontContent.checkout.itemsInCart(cartStore.itemCount) }}
             </span>
           </div>

           <ul role="list" class="space-y-6 mb-8 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-stone-200">
              <li v-for="item in cartStore.items" :key="item.variantId" class="flex py-2">
                 <div class="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-stone-100 bg-stone-50">
                    <img :src="item.image" :alt="item.title" class="h-full w-full object-cover object-center">
                 </div>
                 <div class="ml-4 flex flex-1 flex-col">
                    <div>
                       <div class="flex justify-between text-base font-medium text-stone-900">
                          <h3 class="line-clamp-1 mr-2 px-1">{{ item.title }}</h3>
                          <p class="font-wellness text-sm">{{ formatCurrency(item.price) }}</p>
                       </div>
                       <p class="mt-1 text-sm text-stone-500">{{ item.variantName || storefrontContent.cart.item.standardItem }}</p>
                    </div>
                    <div class="flex flex-1 items-end justify-between text-sm">
                       <p class="text-stone-500">{{ storefrontContent.checkout.summary.quantityShort }} {{ item.quantity }}</p>
                    </div>
                 </div>
              </li>
           </ul>

           <!-- Coupon -->
            <div class="bg-stone-50 p-4 rounded-xl border border-stone-200 mb-6">
              <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2">
                  <Icon name="lucide:ticket" class="w-4 h-4 text-brand-600" />
                  <span class="text-sm font-medium text-stone-700">{{ storefrontContent.checkout.coupon.title }}</span>
                </div>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="couponCode"
                  type="text"
                  :placeholder="storefrontContent.checkout.coupon.placeholder"
                  class="flex-1 h-10 rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
                >
                <button class="px-4 h-10 bg-stone-800 hover:bg-brand-700 text-white font-medium text-sm rounded-lg transition-all">
                  {{ storefrontContent.actions.apply }}
                </button>
              </div>
            </div>

           <div class="border-t border-stone-100 pt-6 space-y-4">
              <div class="flex items-center justify-between text-sm">
                 <dt class="text-stone-600">{{ storefrontContent.cart.summary.subtotal }}</dt>
                 <dd class="font-medium text-stone-900">{{ formatCurrency(cartStore.total) }}</dd>
              </div>
              <div v-if="selectedDelivery" class="flex items-center justify-between text-sm">
                 <dt class="text-stone-600 flex items-center gap-1">
                   Shipping
                   <span class="text-xs text-stone-400">({{ selectedDelivery.providerLabel }})</span>
                 </dt>
                 <dd class="font-medium text-brand-700">{{ selectedDelivery.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${selectedDelivery.price} ${currencyCode}` }}</dd>
              </div>
              <div class="flex items-center justify-between border-t border-stone-100 pt-4">
                 <dt class="text-xl font-wellness text-stone-900">{{ storefrontContent.cart.summary.total }}</dt>
                 <dd class="text-xl font-wellness text-stone-900">{{ formatCurrency(grandTotal) }}</dd>
              </div>
           </div>
        </section>
      </div>
    </div>
  </div>
</template>
