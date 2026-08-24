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
const { currencyCode, formatAmount } = useCurrency()
const cartEnabled = computed(() => storeSettings.value?.cartEnabled !== false && storeSettings.value?.codEnabled !== false)
const wilayas = DZ_WILAYAS

const minimumOrderAmount = computed(() => {
  const raw = Number(storeSettings.value?.minimumOrderAmountDzd ?? 1000)
  return Number.isFinite(raw) && raw >= 0 ? raw : 1000
})
const hideOptionalAddress = computed(() => storeSettings.value?.hideOptionalAddress !== false)

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

const deliveryOptions = computed(() => {
  const options: any[] = []
  availableProviders.value.forEach((provider: any) => {
    const providerPrices = maystroPrices.pricesByProvider.value?.[provider.key]
    const homePrice = providerPrices?.home != null ? String(Math.round(providerPrices.home)) : '—'
    const officePrice = providerPrices?.office != null ? String(Math.round(providerPrices.office)) : '—'

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
      const url = useTenantApiUrl(
        `/api/delivery/maystro/pickup-points?commune=${encodeURIComponent(commune as string)}&wilaya=${encodeURIComponent(wilaya as string)}&nearby=true`
      )
      const data = await $fetch<any[]>(url, {
        headers: { ...(useTenantApiHeaders() || {}) }
      })
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

const inputClass = 'w-full h-12 bg-[#04060a] border border-white/10 px-4 text-white text-sm placeholder:text-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition-colors outline-none'

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
        const maystroShippingAmount = providerPrices
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
          headers: { ...(useTenantApiHeaders() || {}) }
        })

        cartStore.clearCart()
        loyalty.reset()
        router.push({ path: '/order-success', query: { orderId: response.orderId } })
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
  <div class="bg-[#06080c] min-h-screen text-slate-300">
    <!-- HUD page header -->
    <div class="border-b border-white/[0.06] bg-black">
      <div class="h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-60" />
      <div class="max-w-[1400px] mx-auto px-5 lg:px-10 py-12">
        <p class="flex items-center gap-3 mb-4">
          <span class="w-8 h-px bg-brand-500" />
          
        </p>
        <div class="flex items-end justify-between gap-6">
          <h1 class="text-4xl md:text-6xl font-black uppercase tracking-[-0.04em] text-white leading-[0.92]">
            {{ storefrontContent.checkout.title }}
          </h1>
          <div v-if="cartStore.hasItems" class="border-s-2 border-brand-500 ps-4">
            <div class="text-2xl font-black text-white">{{ String(cartStore.itemCount).padStart(2, '0') }}</div>
            
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-[1400px] mx-auto px-5 lg:px-10 py-10 lg:py-14">
      <!-- Disabled banner -->
      <div
        v-if="!cartEnabled"
        class="mb-6 border border-amber-400/40 bg-amber-500/10 text-amber-300 text-sm px-5 py-3 flex items-center gap-3"
      >
        <Icon name="lucide:alert-triangle" class="w-4 h-4" />
        <span class="font-bold uppercase tracking-[0.12em] text-xs">{{ storefrontContent.checkout.disabled }}</span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left: form -->
        <div class="lg:col-span-7 space-y-6">
          <!-- Personal info card -->
          <div class="relative bg-[#0b0f14] border border-white/[0.06] p-6 sm:p-8">
            <span class="pointer-events-none absolute top-0 start-0 w-3 h-3 border-t-2 border-s-2 border-brand-500" />
            <span class="pointer-events-none absolute top-0 end-0 w-3 h-3 border-t-2 border-e-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 start-0 w-3 h-3 border-b-2 border-s-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 end-0 w-3 h-3 border-b-2 border-e-2 border-brand-500" />

            
            

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="md:col-span-1">
                <label class="block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 mb-2">{{ storefrontContent.checkout.form.fullName.label }}</label>
                <input v-model="form.fullName" type="text" :class="inputClass" :placeholder="storefrontContent.checkout.form.fullName.placeholder" />
              </div>
              <div class="md:col-span-1">
                <label class="block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 mb-2">{{ storefrontContent.checkout.form.phone.label }}</label>
                <input v-model="form.phone" type="tel" :class="inputClass" :placeholder="storefrontContent.checkout.form.phone.placeholder" />
              </div>
              <div class="md:col-span-1">
                <label class="block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 mb-2">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                <div class="relative">
                  <WilayaField
                    v-model="form.wilaya"
                    :input-class="`${inputClass} appearance-none cursor-pointer pr-10`"
                    :placeholder="storefrontContent.checkout.form.wilaya.placeholder"
                  />
                </div>
              </div>
              <div class="md:col-span-1">
                <label class="block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 mb-2">{{ storefrontContent.checkout.form.commune.label }}</label>
                <CommuneField
                  v-model="form.commune"
                  :wilaya-code="form.wilaya"
                  :placeholder="storefrontContent.checkout.form.commune.placeholder"
                  :input-class="inputClass"
                  :select-class="`${inputClass} appearance-none cursor-pointer pr-10`"
                />
              </div>
              <div v-if="isMaystroPickup" class="md:col-span-2">
                <label class="block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 mb-2">{{ storefrontContent.checkout.delivery.mode.pickupPoint }}</label>
                <div v-if="pickupPointsLoading" class="flex items-center gap-2 px-4 py-3 border border-white/10 bg-[#04060a] text-xs text-slate-500">
                  <Icon name="lucide:loader-2" class="w-4 h-4 animate-spin" />
                  Loading…
                </div>
                <div v-else-if="form.pickupPoint" class="flex items-center gap-3 px-4 py-3 border border-brand-500/40 bg-brand-500/5">
                  <Icon name="lucide:map-pin" class="w-4 h-4 text-brand-500" />
                  <span class="text-sm font-bold text-white">{{ form.pickupPoint }}</span>
                </div>
                <p v-if="pickupPointsError" class="mt-2 text-xs text-amber-400">{{ pickupPointsError }}</p>
              </div>
              <div v-if="!hideOptionalAddress" class="md:col-span-2">
                <label class="block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 mb-2">{{ storefrontContent.checkout.form.address.label }}</label>
                <input v-model="form.address" type="text" :class="inputClass" :placeholder="storefrontContent.checkout.form.address.placeholder" />
              </div>
            </div>
          </div>

          <!-- Delivery options -->
          <div v-if="form.wilaya && form.commune" class="relative bg-[#0b0f14] border border-white/[0.06] p-6 sm:p-8">
            <span class="pointer-events-none absolute top-0 start-0 w-3 h-3 border-t-2 border-s-2 border-brand-500" />
            <span class="pointer-events-none absolute top-0 end-0 w-3 h-3 border-t-2 border-e-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 start-0 w-3 h-3 border-b-2 border-s-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 end-0 w-3 h-3 border-b-2 border-e-2 border-brand-500" />

            <div class="flex items-center justify-between mb-2">
              
              <span class="text-[9px] font-black uppercase tracking-[0.28em] text-brand-500 border border-brand-500/40 bg-brand-500/10 px-2 py-1">{{ storefrontContent.checkout.required }}</span>
            </div>
            <h3 class="text-lg font-black uppercase tracking-[-0.01em] text-white mb-1">{{ storefrontContent.checkout.sections.deliveryOptions }}</h3>
            <p class="text-xs text-slate-500 mb-6">{{ storefrontContent.checkout.help.deliveryOptions }}</p>

            <div class="space-y-2">
              <button
                v-for="option in deliveryOptions"
                :key="option.id"
                type="button"
                class="w-full text-start relative flex items-center gap-4 p-4 border transition-colors group"
                :class="form.selectedDeliveryOption === option.id
                  ? 'border-brand-500 bg-brand-500/5'
                  : 'border-white/[0.06] hover:border-white/15'"
                @click="form.selectedDeliveryOption = option.id"
              >
                <div
                  class="w-12 h-12 flex items-center justify-center flex-shrink-0 border transition-colors"
                  :class="form.selectedDeliveryOption === option.id ? 'border-brand-500 bg-brand-500 text-[#02060a]' : 'border-white/15 text-slate-400 group-hover:text-white'"
                >
                  <CarrierMark :provider="option.provider" :icon="option.icon" :alt="option.providerLabel" class="w-5 h-5" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <h4 class="text-sm font-black uppercase tracking-[0.04em] text-white">{{ option.providerLabel }}</h4>
                    <span class="text-[9px] font-black uppercase tracking-[0.22em] px-2 py-0.5 border"
                      :class="option.mode === 'home' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300' : option.mode === 'pickup' ? 'border-brand-500/40 bg-brand-500/10 text-brand-500' : 'border-white/15 bg-white/5 text-slate-300'"
                    >{{ option.modeLabel }}</span>
                  </div>
                  <p class="text-xs text-slate-500 leading-relaxed">{{ option.description }}</p>
                </div>
                <div class="flex items-center gap-3 flex-shrink-0">
                  <span class="text-sm font-black tracking-[-0.02em]"
                    :class="form.selectedDeliveryOption === option.id ? 'text-brand-500' : 'text-white'"
                  >
                    {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
                  </span>
                  <span
                    class="w-5 h-5 border-2 flex items-center justify-center transition-colors"
                    :class="form.selectedDeliveryOption === option.id ? 'border-brand-500 bg-brand-500' : 'border-white/20'"
                  >
                    <Icon v-if="form.selectedDeliveryOption === option.id" name="lucide:check" class="w-3 h-3 text-[#02060a]" />
                  </span>
                </div>

                <div v-if="option.mode === 'pickup' && option.provider === 'MAYSTRO' && (pickupPointsLoading || stopDeskName || form.pickupPoint || pickupPointsError)" class="absolute left-0 right-0 top-full mt-2 px-4 py-2 bg-[#04060a] border border-white/[0.06] text-xs">
                  <div v-if="pickupPointsLoading" class="flex items-center gap-2 text-slate-500">
                    <Icon name="lucide:loader-2" class="w-3 h-3 animate-spin" />
                    Loading...
                  </div>
                  <template v-else>
                    <div v-if="stopDeskName" class="flex items-center gap-2 text-slate-500">
                      <Icon name="lucide:building-2" class="w-3 h-3 text-slate-400" />
                      <span>{{ stopDeskName }}</span>
                    </div>
                    <div v-if="form.pickupPoint" class="flex items-center gap-2 mt-1">
                      <Icon name="lucide:map-pin" class="w-3 h-3 text-brand-500" />
                      <span class="font-bold text-slate-200">{{ form.pickupPoint }}</span>
                    </div>
                  </template>
                  <p v-if="pickupPointsError" class="text-amber-400 mt-1">{{ pickupPointsError }}</p>
                </div>
              </button>
            </div>
          </div>
          <div v-else class="bg-[#0b0f14] border border-white/[0.06] p-8 text-center text-sm text-slate-500">
            <Icon name="lucide:map-pin" class="w-6 h-6 mx-auto mb-2 text-brand-500" />
            <p class="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">{{ storefrontContent.checkout.help.deliveryOptions }}</p>
          </div>
        </div>

        <!-- Right: summary -->
        <div class="lg:col-span-5">
          <div class="relative bg-[#0b0f14] border border-white/[0.06] p-6 sm:p-8 lg:sticky lg:top-24">
            <span class="pointer-events-none absolute top-0 start-0 w-3 h-3 border-t-2 border-s-2 border-brand-500" />
            <span class="pointer-events-none absolute top-0 end-0 w-3 h-3 border-t-2 border-e-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 start-0 w-3 h-3 border-b-2 border-s-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 end-0 w-3 h-3 border-b-2 border-e-2 border-brand-500" />

            <div class="flex items-center justify-between pb-5 mb-5 border-b border-white/[0.06]">
              <div>
                
                <h2 class="text-xl font-black uppercase tracking-[-0.01em] text-white">Order Summary</h2>
              </div>
              <span class="text-[9px] font-black uppercase tracking-[0.22em] text-brand-500 border border-brand-500/40 bg-brand-500/10 px-2.5 py-1.5 flex items-center gap-1.5">
                <Icon name="lucide:shopping-cart" class="w-3 h-3" />
                {{ cartStore.itemCount }}
              </span>
            </div>

            <!-- Items -->
            <ul class="space-y-3 mb-6 max-h-72 overflow-y-auto pe-1 custom-scrollbar">
              <li v-for="item in cartStore.items" :key="item.productId" class="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                <div class="h-14 w-14 bg-[#04060a] border border-white/[0.06] flex-shrink-0 overflow-hidden">
                  <img v-if="item.image" :src="item.image" :alt="item.title" class="h-full w-full object-cover" />
                  <div v-else class="h-full w-full flex items-center justify-center text-slate-700">
                    <Icon name="lucide:image" class="w-5 h-5" />
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="text-xs font-black uppercase tracking-[0.04em] text-white truncate">{{ item.title }}</h4>
                  <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 mt-0.5">×{{ item.quantity }}</p>
                </div>
                <div class="text-sm font-black text-brand-500 whitespace-nowrap">
                  {{ formatAmount(item.price) }}
                </div>
              </li>
            </ul>

            <!-- Coupon -->
            <div class="border border-white/[0.06] bg-[#04060a] p-4 mb-6">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <Icon name="lucide:ticket-percent" class="w-4 h-4 text-brand-500" />
                  <h4 class="text-[10px] font-black uppercase tracking-[0.28em] text-white">{{ storefrontContent.checkout.coupon.title }}</h4>
                </div>
                <span class="text-[9px] font-black uppercase tracking-[0.22em] text-brand-500">{{ storefrontContent.checkout.coupon.badge }}</span>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="couponCode"
                  type="text"
                  :placeholder="storefrontContent.checkout.coupon.placeholder"
                  class="flex-1 h-10 bg-[#0b0f14] border border-white/10 px-3 text-xs text-white placeholder:text-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 outline-none uppercase tracking-wider"
                />
                <button class="px-4 h-10 bg-brand-500 text-[#02060a] text-[10px] font-black uppercase tracking-[0.22em] hover:bg-white transition-colors whitespace-nowrap">
                  {{ storefrontContent.actions.apply }}
                </button>
              </div>
            </div>

            <!-- Totals -->
            <dl class="space-y-3 pb-4 border-b border-white/[0.06]">
              <div v-if="selectedDelivery" class="flex justify-between text-xs">
                <dt class="font-bold uppercase tracking-[0.18em] text-slate-500">{{ storefrontContent.checkout.summary.deliveryOption }}</dt>
                <dd class="flex items-center gap-2 font-bold text-white">
                  <Icon :name="selectedDelivery.icon" class="w-3.5 h-3.5 text-brand-500" />
                  <span>{{ selectedDelivery.providerLabel }} · {{ selectedDelivery.modeLabel }}</span>
                </dd>
              </div>
              <div class="flex justify-between text-xs">
                <dt class="font-bold uppercase tracking-[0.18em] text-slate-500">{{ storefrontContent.cart.summary.subtotal }}</dt>
                <dd class="font-black text-white">{{ formatAmount(cartStore.total) }} {{ currencyCode }}</dd>
              </div>
              <div v-if="cartStore.clearanceDiscount > 0" class="flex justify-between text-xs">
                <dt class="font-bold uppercase tracking-[0.18em] text-amber-400">{{ t('storefront.clearance.discountLine') }}</dt>
                <dd class="font-black text-amber-400">-{{ formatAmount(cartStore.clearanceDiscount) }} {{ currencyCode }}</dd>
              </div>
              <div v-if="selectedDelivery" class="flex justify-between text-xs">
                <dt class="font-bold uppercase tracking-[0.18em] text-slate-500">{{ storefrontContent.checkout.summary.shippingFee }}</dt>
                <dd class="font-black text-brand-500">{{ selectedDelivery.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${selectedDelivery.price} ${currencyCode}` }}</dd>
              </div>
            </dl>

            <div class="flex justify-between items-end pt-4">
              <span class="text-sm font-black uppercase tracking-[0.18em] text-white">{{ storefrontContent.cart.summary.total }}</span>
              <span class="text-3xl font-black text-brand-500 tracking-[-0.03em]">{{ formatAmount(grandTotal) }} <span class="text-sm">{{ currencyCode }}</span></span>
            </div>
            <p class="text-[10px] text-slate-600 mt-2 uppercase tracking-[0.18em]">
              {{ storefrontContent.checkout.minimumOrder(formatAmount(minimumOrderAmount), currencyCode) }}
            </p>

            <!-- Error -->
            <div v-if="errorMessage" class="mt-4 border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs px-4 py-3 flex items-start gap-2.5">
              <Icon name="lucide:alert-circle" class="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span class="font-bold">{{ errorMessage }}</span>
            </div>

            <!-- Submit -->
            <button
              :disabled="submitting || !cartEnabled || !hasRequiredFields"
              class="w-full mt-6 bg-brand-500 text-[#02060a] py-4 px-6 text-[11px] font-black uppercase tracking-[0.22em] hover:bg-white transition-colors disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 [clip-path:polygon(3%_0,100%_0,97%_100%,0_100%)]"
              @click="handleSubmit"
            >
              <Icon v-if="submitting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
              <span>{{ submitting ? storefrontContent.checkout.actions.placingOrder : (!cartEnabled ? storefrontContent.checkout.disabledShort : storefrontContent.checkout.actions.placeOrder) }}</span>
              <Icon v-if="!submitting && cartEnabled && hasRequiredFields" name="lucide:arrow-right" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
