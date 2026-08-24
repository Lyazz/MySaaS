<script setup lang="ts">
import CarrierMark from '~/components/storefront/shared/CarrierMark.vue'
import { useCartStore } from '~/stores/cart'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'
import { DZ_WILAYAS } from '~/shared/geo/dz'

const cartStore = useCartStore()
const router = useRouter()
const storeSettings = useState<any>('storeSettings')
const storefrontContent = useStorefrontContent()
const { t } = useI18n({ useScope: 'global' })
const { currencyCode, format: formatCurrency } = useCurrency()
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
    MAYSTRO: { label: 'Maystro', icon: 'lucide:truck' },
    YALIDINE: { label: 'Yalidine', icon: 'lucide:package' },
    ECOTRACK: { label: 'Ecotrack', icon: 'lucide:send' },
    ZR_EXPRESS: { label: 'ZR Express', icon: 'lucide:zap' },
    SELF: { label: storefrontContent.value.checkout.delivery.provider.self, icon: 'lucide:bike' }
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

        const response = await $fetch<{ orderId: string }>(url, {
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
  <div class="min-h-screen bg-wl-paper py-12 md:py-16 font-wellness text-wl-ink">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      <!-- Loading State -->
      <div v-if="submitting" class="fixed inset-0 bg-wl-paper/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
         <div class="w-10 h-10 border border-wl-rule border-t-wl-ink rounded-full animate-spin mb-5"></div>
         <p class="wl-label text-wl-muted">{{ storefrontContent.checkout.actions.placingOrder }}</p>
      </div>

      <!-- Header -->
      <div class="mb-10">
        <div class="wl-ruled wl-ruled--start">
          <h1 class="wl-display text-3xl md:text-[2.5rem] text-wl-ink leading-none flex-shrink-0">
            {{ storefrontContent.checkout.title }}
          </h1>
          <p class="wl-label text-wl-muted flex-shrink-0 hidden sm:block">
            {{ storefrontContent.checkout.secureTransaction }}
          </p>
        </div>
        <div
          v-if="!cartEnabled"
          class="mt-5 inline-block border border-wl-saffron/40 bg-wl-saffronWash text-wl-saffron wl-label px-5 py-2.5"
        >
          {{ storefrontContent.checkout.disabled }}
        </div>
      </div>

      <div class="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start xl:gap-x-16">
        <!-- Main Form Column -->
        <section class="lg:col-span-7 space-y-8">
          
          <form @submit.prevent="handleSubmit" class="space-y-8">
            
            <!-- Personal Info -->
            <div class="bg-wl-card border border-wl-rule p-6 sm:p-8">
              <h2 class="wl-label text-wl-ink mb-6 flex items-center gap-3 pb-4 border-b border-wl-rule">
                 <span class="wl-num flex items-center justify-center w-6 h-6 border border-wl-ruleStrong text-wl-muted">1</span>
                 Contact Information
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div class="col-span-2 md:col-span-1 space-y-2">
                    <label class="block wl-label text-wl-muted">{{ storefrontContent.checkout.form.fullName.label }}</label>
                    <input
                      v-model="form.fullName"
                      type="text"
                      class="w-full h-12 border border-wl-rule bg-wl-paper px-4 text-wl-ink placeholder:text-wl-muted/60 focus:border-wl-ink focus:bg-white transition-colors outline-none"
                    :placeholder="storefrontContent.checkout.form.fullName.placeholder"
                    >
                 </div>
                 <div class="col-span-2 md:col-span-1 space-y-2">
                    <label class="block wl-label text-wl-muted">{{ storefrontContent.checkout.form.phone.label }}</label>
                    <input
                      v-model="form.phone"
                      type="tel"
                      class="w-full h-12 border border-wl-rule bg-wl-paper px-4 wl-num text-wl-ink placeholder:text-wl-muted/60 focus:border-wl-ink focus:bg-white transition-colors outline-none"
                    :placeholder="storefrontContent.checkout.form.phone.placeholder"
                    >
                 </div>
                 <div class="col-span-2 md:col-span-1 space-y-2">
                    <label class="block wl-label text-wl-muted">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                    <WilayaField
                        v-model="form.wilaya"
                        input-class="w-full h-12 border border-wl-rule bg-wl-paper px-4 text-wl-ink focus:border-wl-ink focus:bg-white transition-colors outline-none appearance-none cursor-pointer"
                        :placeholder="storefrontContent.checkout.form.wilaya.placeholder"
                      />
                 </div>
                 <div class="col-span-2 md:col-span-1 space-y-2">
                    <label class="block wl-label text-wl-muted">{{ storefrontContent.checkout.form.commune.label }}</label>
                    <CommuneField
                      v-model="form.commune"
                      :wilaya-code="form.wilaya"
                      :placeholder="storefrontContent.checkout.form.commune.placeholder"
                      :input-class="'w-full h-12 border border-wl-rule bg-wl-paper px-4 text-wl-ink placeholder:text-wl-muted/60 focus:border-wl-ink focus:bg-white transition-colors outline-none'"
                      :select-class="'w-full h-12 border border-wl-rule bg-wl-paper px-4 text-wl-ink focus:border-wl-ink focus:bg-white transition-colors outline-none'"
                    />
                 </div>
                 <div v-if="!hideOptionalAddress" class="col-span-2 space-y-2">
                    <label class="block wl-label text-wl-muted">{{ storefrontContent.checkout.form.address.label }}</label>
                    <input
                      v-model="form.address"
                      type="text"
                      class="w-full h-12 border border-wl-rule bg-wl-paper px-4 text-wl-ink placeholder:text-wl-muted/60 focus:border-wl-ink focus:bg-white transition-colors outline-none"
                    :placeholder="storefrontContent.checkout.form.address.placeholder"
                    >
                 </div>
              </div>
            </div>

            <!-- Delivery Options -->
            <div v-if="form.wilaya && form.commune" class="bg-wl-card border border-wl-rule p-6 sm:p-8">
               <h2 class="wl-label text-wl-ink mb-6 flex items-center gap-3 pb-4 border-b border-wl-rule">
                 <span class="wl-num flex items-center justify-center w-6 h-6 border border-wl-ruleStrong text-wl-muted">2</span>
                 {{ storefrontContent.checkout.sections.deliveryOptions }}
              </h2>
               <div class="-space-y-px">
                  <div
                    v-for="option in deliveryOptions"
                    :key="option.id"
                    class="cursor-pointer relative p-4 border transition-colors duration-200 group"
                    :class="form.selectedDeliveryOption === option.id
                      ? 'border-wl-ink bg-wl-paper z-10'
                      : 'border-wl-rule hover:border-wl-ruleStrong bg-transparent'"
                    @click="form.selectedDeliveryOption = option.id"
                  >
                    <div class="flex items-center gap-4">
                       <!-- Icon -->
                       <div
                         class="w-10 h-10 border flex items-center justify-center flex-shrink-0 transition-colors duration-200"
                         :class="form.selectedDeliveryOption === option.id ? 'border-wl-ink bg-wl-ink text-wl-paper' : 'border-wl-rule text-wl-muted'"
                       >
                         <CarrierMark :provider="option.provider" :icon="option.icon" :alt="option.providerLabel" class="w-4 h-4" />
                       </div>

                       <!-- Details -->
                       <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2.5 mb-1">
                             <h4 class="wl-display-sm text-wl-ink text-base">{{ option.providerLabel }}</h4>
                             <span class="wl-label text-wl-muted">
                               {{ option.modeLabel }}
                             </span>
                          </div>
                          <p class="text-xs text-wl-muted">{{ option.description }}</p>
                       </div>

                       <!-- Price & Check -->
                       <div class="flex items-center gap-4 flex-shrink-0">
                          <div class="wl-num font-medium text-wl-ink text-sm">
                             {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
                          </div>
                          <div
                            class="w-5 h-5 border flex items-center justify-center transition-colors"
                            :class="form.selectedDeliveryOption === option.id ? 'border-wl-ink bg-wl-ink' : 'border-wl-ruleStrong'"
                          >
                             <Icon v-if="form.selectedDeliveryOption === option.id" name="lucide:check" class="w-3 h-3 text-wl-paper" />
                          </div>
                       </div>
                    </div>
                    <div v-if="option.mode === 'pickup' && option.provider === 'MAYSTRO' && (pickupPointsLoading || stopDeskName || form.pickupPoint || pickupPointsError)" class="mt-3 pt-3 border-t border-wl-rule">
                      <div v-if="pickupPointsLoading" class="flex items-center gap-2 text-xs text-wl-muted">
                        <Icon name="lucide:loader-2" class="w-3 h-3 animate-spin" />
                        Loading...
                      </div>
                      <template v-else>
                        <div v-if="stopDeskName" class="flex items-center gap-2 text-xs text-wl-muted">
                          <Icon name="lucide:building-2" class="w-3 h-3 flex-shrink-0" />
                          <span>{{ stopDeskName }}</span>
                        </div>
                        <div v-if="form.pickupPoint" class="flex items-center gap-2 text-xs mt-1">
                          <Icon name="lucide:map-pin" class="w-3 h-3 text-wl-ink" />
                          <span class="font-medium text-wl-ink">{{ form.pickupPoint }}</span>
                        </div>
                      </template>
                      <p v-if="pickupPointsError" class="text-xs text-wl-saffron mt-1">{{ pickupPointsError }}</p>
                    </div>
                  </div>
               </div>
            </div>
            <div v-else class="bg-wl-card border border-wl-rule p-8 text-center text-sm text-wl-muted">
              <Icon name="lucide:map-pin" class="w-5 h-5 mx-auto mb-3 text-wl-muted" />
              {{ storefrontContent.checkout.help.deliveryOptions }}
            </div>

            <div
              v-if="errorMessage"
              class="border border-wl-alert/40 bg-wl-alertWash text-wl-alert text-sm px-4 py-3.5 flex items-start gap-3"
            >
              <Icon name="lucide:alert-circle" class="w-4 h-4 text-wl-alert flex-shrink-0 mt-0.5" />
              <span class="font-medium">{{ errorMessage }}</span>
            </div>

            <!-- Submit Button -->
            <button
               type="submit"
               :disabled="submitting || cartStore.items.length === 0 || !hasRequiredFields"
               class="wl-cta w-full flex items-center justify-center px-8 py-5 wl-label focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wl-ink focus-visible:ring-offset-2 focus-visible:ring-offset-wl-paper transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
               <span v-if="submitting" class="flex items-center gap-2">
                 <Icon name="lucide:loader-2" class="w-4 h-4 animate-spin" />
                 {{ storefrontContent.checkout.actions.placingOrder }}
               </span>
               <span v-else class="flex items-center gap-2">
                 {{ storefrontContent.checkout.actions.placeOrder }} <span class="text-wl-paper/50">•</span> <span class="wl-num">{{ formatCurrency(grandTotal) }}</span>
               </span>
            </button>
            <p class="text-center wl-label text-wl-muted mt-3 flex items-center justify-center gap-1.5">
               <Icon name="lucide:lock" class="w-3 h-3" />
               {{ storefrontContent.checkout.secureTransaction }}
            </p>
          </form>
        </section>

        <!-- Order Summary Sidebar -->
        <section class="mt-12 bg-wl-card border border-wl-rule px-6 sm:px-7 py-7 lg:col-span-5 lg:mt-0 lg:sticky lg:top-24">
           <div class="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-wl-rule">
             <h2 class="wl-label text-wl-ink">{{ storefrontContent.checkout.sections.orderSummary }}</h2>
             <span class="wl-label wl-num text-wl-muted">
               {{ storefrontContent.checkout.itemsInCart(cartStore.itemCount) }}
             </span>
           </div>

           <ul role="list" class="mb-6 max-h-96 overflow-y-auto">
              <li v-for="item in cartStore.items" :key="item.variantId" class="flex py-4 border-b border-wl-rule/60 last:border-0">
                 <div class="h-16 w-16 flex-shrink-0 overflow-hidden border border-wl-rule bg-wl-paper">
                    <img :src="item.image" :alt="item.title" class="h-full w-full object-cover object-center">
                 </div>
                 <div class="ms-4 flex flex-1 flex-col min-w-0">
                    <div>
                       <div class="flex justify-between gap-3 text-wl-ink">
                          <h3 class="wl-display-sm text-sm line-clamp-1">{{ item.title }}</h3>
                          <p class="wl-num text-sm flex-shrink-0">{{ formatCurrency(item.price) }}</p>
                       </div>
                       <p class="mt-1 wl-label text-wl-muted">{{ item.variantName || storefrontContent.cart.item.standardItem }}</p>
                    </div>
                    <div class="flex flex-1 items-end justify-between">
                       <p class="wl-label wl-num text-wl-muted">{{ storefrontContent.checkout.summary.quantityShort }} {{ item.quantity }}</p>
                    </div>
                 </div>
              </li>
           </ul>

           <!-- Coupon -->
            <div class="border-t border-wl-rule pt-5 mb-5">
              <div class="flex items-center gap-2 mb-2.5">
                <Icon name="lucide:ticket" class="w-3.5 h-3.5 text-wl-muted" />
                <span class="wl-label text-wl-muted">{{ storefrontContent.checkout.coupon.title }}</span>
              </div>
              <div class="flex">
                <input
                  v-model="couponCode"
                  type="text"
                  :placeholder="storefrontContent.checkout.coupon.placeholder"
                  class="flex-1 min-w-0 h-11 border border-wl-rule bg-wl-paper px-3 text-sm text-wl-ink placeholder:text-wl-muted/60 focus:border-wl-ink focus:bg-white transition-colors outline-none"
                >
                <button class="wl-cta px-5 h-11 wl-label flex-shrink-0">
                  {{ storefrontContent.actions.apply }}
                </button>
              </div>
            </div>

           <div class="border-t border-wl-rule pt-5 space-y-3.5">
              <div class="flex items-center justify-between gap-4 text-sm">
                 <dt class="text-wl-muted">{{ storefrontContent.cart.summary.subtotal }}</dt>
                 <dd class="wl-num font-medium text-wl-ink">{{ formatCurrency(cartStore.total) }}</dd>
              </div>
              <div v-if="cartStore.clearanceDiscount > 0" class="flex items-center justify-between gap-4 text-sm">
                 <dt class="text-wl-henna font-medium">{{ t('storefront.clearance.discountLine') }}</dt>
                 <dd class="wl-num font-medium text-wl-henna">-{{ formatCurrency(cartStore.clearanceDiscount) }}</dd>
              </div>
              <div v-if="selectedDelivery" class="flex items-center justify-between gap-4 text-sm">
                 <dt class="text-wl-muted flex items-baseline gap-1.5 min-w-0">
                   Shipping
                   <span class="wl-label text-wl-muted/70 truncate">{{ selectedDelivery.providerLabel }}</span>
                 </dt>
                 <dd class="wl-num font-medium text-wl-ink flex-shrink-0">{{ selectedDelivery.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${selectedDelivery.price} ${currencyCode}` }}</dd>
              </div>
              <div class="flex items-baseline justify-between gap-4 border-t border-wl-ruleStrong pt-4 mt-4">
                 <dt class="wl-label text-wl-ink">{{ storefrontContent.cart.summary.total }}</dt>
                 <dd class="wl-num wl-display text-2xl text-wl-ink">{{ formatCurrency(grandTotal) }}</dd>
              </div>
           </div>
        </section>
      </div>
    </div>
  </div>
</template>
