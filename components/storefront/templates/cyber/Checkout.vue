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
      color: provider.color,
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
      color: provider.color,
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

const pickup = usePickupPoints({
  provider: () => selectedDelivery.value?.provider,
  mode: () => selectedDelivery.value?.mode,
  wilaya: () => form.value.wilaya,
  commune: () => form.value.commune,
  selected: () => form.value.pickupPoint,
  onSelect: (name) => { form.value.pickupPoint = name },
  onCommuneChange: (communeName) => { form.value.commune = communeName }
})

const isPickupSelected = pickup.isPickupSelected
const pickupPoints = pickup.points
const pickupPointsLoading = pickup.loading
const pickupPointsError = pickup.error
const syncPickupPointCommune = pickup.syncCommune

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
          
          if (delivery?.mode === 'pickup' && !String(form.value.pickupPoint || '').trim() ) {
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
          shippingPickupPoint: delivery?.provider && delivery?.mode === 'pickup' ? (form.value.pickupPoint || undefined) : undefined,
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
  <div class="synthwave-checkout min-h-screen py-10 font-sans relative">
    <!-- Synthwave Background -->
    <div class="fixed inset-0 z-0 pointer-events-none">
      <div class="absolute inset-0 bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0515]" />
      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[40%] bg-gradient-to-t from-[#ff2d95]/15 via-[#ff6b35]/5 to-transparent" />
      <div class="absolute bottom-0 left-0 right-0 h-[30%] bg-[linear-gradient(rgba(255,45,149,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,45,149,0.1)_1px,transparent_1px)] bg-[size:30px_30px] [perspective:500px] [transform:rotateX(60deg)] origin-bottom opacity-40" />
    </div>
    
    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">
          {{ storefrontContent.checkout.title }}
        </h1>
        <p class="text-lg text-purple-300/70 font-medium">
          {{ storefrontContent.cart.itemsCount(cartStore.itemCount) }}
        </p>
        <div
          v-if="!cartEnabled"
          class="mt-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 text-sm px-4 py-3"
        >
          {{ storefrontContent.checkout.disabled }}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left Column: Form & Delivery -->
        <div class="lg:col-span-7 space-y-8">
          <!-- Personal Info -->
          <div class="relative">
            <div class="absolute -inset-1 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-2xl blur" />
            <div class="relative bg-[#1a0a2e]/95 p-6 rounded-2xl border border-pink-500/30 backdrop-blur-sm">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="col-span-2 md:col-span-1 space-y-2">
                  <label class="block text-sm font-semibold text-purple-200 ms-1">{{ storefrontContent.checkout.form.fullName.label }}</label>
                  <input
                    v-model="form.fullName"
                    type="text"
                    class="w-full h-12 rounded-xl border border-purple-500/30 bg-purple-900/30 px-4 text-white placeholder:text-purple-400/50 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-200 outline-none"
                    :placeholder="storefrontContent.checkout.form.fullName.placeholder"
                  >
                </div>
                <div class="col-span-2 md:col-span-1 space-y-2">
                  <label class="block text-sm font-semibold text-purple-200 ms-1">{{ storefrontContent.checkout.form.phone.label }}</label>
                  <input
                    v-model="form.phone"
                    type="tel"
                    class="w-full h-12 rounded-xl border border-purple-500/30 bg-purple-900/30 px-4 text-white placeholder:text-purple-400/50 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-200 outline-none"
                    :placeholder="storefrontContent.checkout.form.phone.placeholder"
                  >
                </div>
                <div class="col-span-2 md:col-span-1 space-y-2">
                  <label class="block text-sm font-semibold text-purple-200 ms-1">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                  <WilayaField
                    v-model="form.wilaya"
                    input-class="w-full h-12 rounded-xl border border-purple-500/30 bg-purple-900/30 px-4 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-200 outline-none appearance-none cursor-pointer"
                    :placeholder="storefrontContent.checkout.form.wilaya.placeholder"
                  />
                </div>
                <div class="col-span-2 md:col-span-1 space-y-2">
                  <label class="block text-sm font-semibold text-purple-200 ms-1">{{ storefrontContent.checkout.form.commune.label }}</label>
                  <CommuneField
                    v-model="form.commune"
                    :wilaya-code="form.wilaya"
                    :placeholder="storefrontContent.checkout.form.commune.placeholder"
                    :input-class="'w-full h-12 rounded-xl border border-purple-500/30 bg-purple-900/30 px-4 text-white placeholder:text-purple-400/50 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-200 outline-none'"
                    :select-class="'w-full h-12 rounded-xl border border-purple-500/30 bg-purple-900/30 px-4 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-200 outline-none'"
                  />
                </div>
                <div
                  v-if="!hideOptionalAddress"
                  class="col-span-2 space-y-2"
                >
                  <label class="block text-sm font-semibold text-purple-200 ms-1">{{ storefrontContent.checkout.form.address.label }}</label>
                  <input
                    v-model="form.address"
                    type="text"
                    class="w-full h-12 rounded-xl border border-purple-500/30 bg-purple-900/30 px-4 text-white placeholder:text-purple-400/50 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-200 outline-none"
                    :placeholder="storefrontContent.checkout.form.address.placeholder"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Delivery Options -->
          <div
            v-if="form.wilaya && form.commune"
            class="relative"
          >
            <div class="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-pink-500/20 rounded-2xl blur" />
            <div class="relative bg-[#1a0a2e]/95 p-6 rounded-2xl border border-cyan-500/30 backdrop-blur-sm">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wide">
                  {{ storefrontContent.checkout.sections.deliveryOptions }}
                </h3>
                <span class="text-[10px] font-bold text-pink-400 bg-pink-500/20 px-2 py-1 rounded-full uppercase border border-pink-500/30">
                  {{ storefrontContent.checkout.required }}
                </span>
              </div>
              <p class="text-xs text-purple-300/60 mb-6 font-medium">
                {{ storefrontContent.checkout.help.deliveryOptions }}
              </p>
                      
              <div class="space-y-3">
                <div 
                  v-for="option in deliveryOptions"
                  :key="option.id"
                  class="cursor-pointer relative rounded-xl p-4 border transition-all duration-300 group"
                  :class="form.selectedDeliveryOption === option.id 
                    ? 'border-pink-500/70 bg-pink-500/10 shadow-[0_0_20px_rgba(255,45,149,0.15)]' 
                    : 'border-purple-500/30 hover:border-pink-500/40 hover:bg-purple-900/20'"
                  @click="form.selectedDeliveryOption = option.id"
                >
                  <div class="flex items-center gap-4">
                    <!-- Icon -->
                    <div 
                      class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 border"
                      :class="form.selectedDeliveryOption === option.id 
                        ? 'bg-gradient-to-br from-pink-500/30 to-orange-500/30 border-pink-500/50' 
                        : 'bg-purple-900/50 border-purple-500/30'"
                    >
                      <CarrierMark
                        :provider="option.provider"
                        :icon="option.icon"
                        :alt="option.providerLabel"
                        class="w-6 h-6 transition-colors duration-300"
                        :class="form.selectedDeliveryOption === option.id ? 'text-pink-400' : 'text-purple-400/70'"
                      />
                    </div>
                    
                    <!-- Details -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <h4 class="font-bold text-white text-sm">
                          {{ option.providerLabel }}
                        </h4>
                        <span
                          class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                          :class="option.mode === 'home' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : option.mode === 'pickup' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'"
                        >
                          {{ option.modeLabel }}
                        </span>
                      </div>
                      <p class="text-xs text-purple-300/60 leading-relaxed">
                        {{ option.description }}
                      </p>
                    </div>
                    
                    <!-- Price & Radio -->
                    <div class="flex items-center gap-3 flex-shrink-0">
                      <div class="text-end">
                        <div class="font-bold text-pink-400 text-base">
                          {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
                        </div>
                      </div>
                      <span
                        class="block w-5 h-5 rounded-full border-2 transition-all duration-300 flex-shrink-0"
                        :class="form.selectedDeliveryOption === option.id
                          ? 'border-pink-500 bg-pink-500 shadow-[0_0_10px_rgba(255,45,149,0.5)]'
                          : 'border-purple-500/50'"
                      >
                        <span
                          v-if="form.selectedDeliveryOption === option.id"
                          class="block w-full h-full rounded-full flex items-center justify-center"
                        >
                          <Icon
                            name="lucide:check"
                            class="w-3 h-3 text-white"
                          />
                        </span>
                      </span>
                    </div>
                  </div>
                  <div
                    v-if="option.mode === 'pickup' && option.provider && form.selectedDeliveryOption === option.id"
                    class="mt-3 pt-3 border-t border-slate-200"
                  >
                    <StorefrontSharedPickupPointField
                      v-model="form.pickupPoint"
                      :points="pickupPoints"
                      :loading="pickupPointsLoading"
                      :error="pickupPointsError"
                      :is-pickup-selected="isPickupSelected"
                      :label="storefrontContent.checkout.delivery.mode.pickupPoint"
                      :empty-label="storefrontContent.checkout.help.deliveryOptions"
                      @change="syncPickupPointCommune"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-else
            class="relative"
          >
            <div class="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-pink-500/20 rounded-2xl blur" />
            <div class="relative bg-[#1a0a2e]/95 p-6 rounded-2xl border border-cyan-500/30 backdrop-blur-sm text-center text-sm text-purple-300/60">
              <Icon
                name="lucide:map-pin"
                class="w-5 h-5 mx-auto mb-2 text-purple-500/40"
              />
              {{ storefrontContent.checkout.help.deliveryOptions }}
            </div>
          </div>
        </div>

        <!-- Right Column: Summary -->
        <div class="lg:col-span-5">
          <div class="relative lg:sticky lg:top-8">
            <div class="absolute -inset-1 bg-gradient-to-r from-orange-500/30 via-pink-500/30 to-purple-500/30 rounded-2xl blur" />
            <div class="relative bg-[#1a0a2e]/95 p-7 rounded-2xl border border-orange-500/30 backdrop-blur-sm">
              <div class="flex items-center justify-between mb-6 pb-4 border-b border-purple-500/20">
                <h2 class="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">
                  Order Summary
                </h2>
                <div class="flex items-center gap-1.5 text-sm font-semibold text-pink-400 bg-pink-500/20 px-3 py-1.5 rounded-full border border-pink-500/30">
                  <Icon
                    name="lucide:handbag"
                    class="w-4 h-4"
                  />
                  <span>{{ cartStore.itemCount }} {{ cartStore.itemCount === 1 ? 'item' : 'items' }}</span>
                </div>
              </div>

              <!-- Cart Items -->
              <div class="space-y-4 mb-6 max-h-80 overflow-y-auto pe-2">
                <div
                  v-for="item in cartStore.items"
                  :key="item.productId"
                  class="flex items-center gap-4 py-2 border-b border-purple-500/10 last:border-0"
                >
                  <div class="h-16 w-16 bg-purple-900/50 rounded-lg flex-shrink-0 overflow-hidden relative border border-purple-500/30">
                    <img
                      v-if="item.image"
                      :src="item.image"
                      :alt="item.title"
                      class="h-full w-full object-cover object-center"
                    >
                    <div
                      v-else
                      class="h-full w-full flex items-center justify-center text-purple-400/50"
                    >
                      <Icon
                        name="lucide:image"
                        class="w-8 h-8"
                      />
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-white text-sm truncate">
                      {{ item.title }}
                    </h4>
                    <p class="text-xs text-purple-300/60 mt-1">
                      x{{ item.quantity }}
                    </p>
                  </div>
                  <div class="font-bold text-pink-400 text-sm whitespace-nowrap">
                    {{ formatAmount(item.price) }} {{ currencyCode }}
                  </div>
                </div>
              </div>

              <!-- Coupon -->
              <div class="bg-gradient-to-br from-purple-900/50 to-pink-900/30 p-5 rounded-xl border border-purple-500/30 mb-6">
                <div class="flex justify-between items-center mb-3">
                  <div class="flex items-center gap-2">
                    <Icon
                      name="lucide:ticket-percent"
                      class="w-4 h-4 text-pink-400"
                    />
                    <h4 class="text-sm font-bold text-white">
                      {{ storefrontContent.checkout.coupon.title }}
                    </h4>
                  </div>
                  <span class="text-[10px] font-bold text-cyan-400 bg-cyan-500/20 px-2.5 py-1 rounded-full uppercase tracking-wide border border-cyan-500/30">
                    {{ storefrontContent.checkout.coupon.badge }}
                  </span>
                </div>
                <div class="flex gap-2">
                  <input
                    v-model="couponCode"
                    type="text"
                    :placeholder="storefrontContent.checkout.coupon.placeholder"
                    class="flex-1 h-11 rounded-xl border border-purple-500/30 bg-purple-900/30 px-4 text-sm text-white placeholder:text-purple-400/50 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-200 outline-none font-medium"
                  >
                  <button class="px-5 h-11 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-bold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-pink-500/20 whitespace-nowrap">
                    {{ storefrontContent.actions.apply }}
                  </button>
                </div>
              </div>

              <!-- Totals -->
              <div class="space-y-3 pt-4 border-t border-purple-500/20">
                <div
                  v-if="selectedDelivery"
                  class="flex justify-between text-sm"
                >
                  <span class="text-purple-300/60">{{ storefrontContent.checkout.summary.deliveryOption }}</span>
                  <div class="flex items-center gap-2">
                    <Icon
                      :name="selectedDelivery.icon"
                      class="w-4 h-4 text-purple-300"
                    />
                    <span class="font-medium text-white">{{ selectedDelivery.providerLabel }} - {{ selectedDelivery.modeLabel }}</span>
                  </div>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-purple-300/60">{{ storefrontContent.cart.summary.subtotal }}</span>
                  <span class="font-bold text-white">{{ formatAmount(cartStore.total) }} {{ currencyCode }}</span>
                </div>
                <div
                  v-if="cartStore.clearanceDiscount > 0"
                  class="flex justify-between text-sm"
                >
                  <span class="text-amber-400">{{ t('storefront.clearance.discountLine') }}</span>
                  <span class="font-medium text-amber-400">-{{ formatAmount(cartStore.clearanceDiscount) }} {{ currencyCode }}</span>
                </div>
                <div
                  v-if="selectedDelivery"
                  class="flex justify-between text-sm"
                >
                  <span class="text-purple-300/60">{{ storefrontContent.checkout.summary.shippingFee }}</span>
                  <span class="font-bold text-cyan-400">{{ selectedDelivery.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${selectedDelivery.price} ${currencyCode}` }}</span>
                </div>
                          
                <div class="flex justify-between items-end pt-4 border-t border-purple-500/20 mt-4">
                  <span class="font-bold text-xl text-white">{{ storefrontContent.cart.summary.total }}</span>
                  <span class="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">{{ formatAmount(grandTotal) }} {{ currencyCode }}</span>
                </div>
              </div>

              <div
                v-if="errorMessage"
                class="mt-4 rounded-xl border border-red-500/50 bg-red-500/10 text-red-300 text-sm px-4 py-3.5 flex items-start gap-3"
              >
                <Icon
                  name="lucide:alert-circle"
                  class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                />
                <span class="font-medium">{{ errorMessage }}</span>
              </div>

              <!-- Checkout Button -->
              <button 
                :disabled="submitting || !cartEnabled || !hasRequiredFields"
                class="w-full mt-6 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-bold py-4 px-6 rounded-xl shadow-xl shadow-pink-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-pink-500/40 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2.5 group relative overflow-hidden uppercase tracking-wide"
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
  </div>
</template>

<style scoped>
.synthwave-checkout {
    font-family: 'Inter', system-ui, sans-serif;
}
</style>
