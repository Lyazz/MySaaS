<script setup lang="ts">
import CarrierMark from '~/components/storefront/shared/CarrierMark.vue'
import { useCartStore } from '~/stores/cart'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'
import { DZ_WILAYAS } from '~/shared/geo/dz'

const cartStore = useCartStore()
const router = useRouter()
const storeSettings = useState<any>('storeSettings')
const storefrontContent = useStorefrontContent()
const { currencyCode, formatAmount } = useCurrency()
const { t } = useI18n({ useScope: 'global' })
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
const promo = useCheckoutPromoCode()
const couponCode = promo.codeInput
promo.watchCart()
const loyalty = useCheckoutLoyalty()

watch(() => form.value.phone, (phone) => {
  loyalty.phone.value = phone.trim()
  promo.phone.value = phone.trim()
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

// The promo code comes off the subtotal, and a free-shipping code off the
// delivery line. Both are re-priced by the server when the order is placed.
const promoShippingDiscount = computed(() => {
  if (!promo.freeShipping.value) return 0
  const delivery = selectedDelivery.value
  if (!delivery || delivery.price === 'FREE' || delivery.price === '—') return 0
  const price = Number(delivery.price)
  return isNaN(price) ? 0 : price
})

const promoTotalDiscount = computed(() => promo.discountAmount.value + promoShippingDiscount.value)

const promoDiscountLabel = computed(() => (
  promo.appliedCode.value
    ? `${storefrontContent.value.checkout.coupon.title} (${promo.appliedCode.value})`
    : storefrontContent.value.checkout.coupon.title
))

const couponButtonLabel = computed(() => {
  if (promo.checking.value) return storefrontContent.value.checkout.coupon.checking
  return promo.applied.value
    ? storefrontContent.value.checkout.coupon.remove
    : storefrontContent.value.actions.apply
})

async function applyPromoCode() {
  if (promo.applied.value) {
    promo.reset()
    return
  }
  await promo.apply(storefrontContent.value.checkout.coupon.invalid)
}

const discountedSubtotal = computed(() => Math.max(0, cartStore.total - cartStore.clearanceDiscount))

const promoAdjustedSubtotal = computed(() => Math.max(0, discountedSubtotal.value - promo.discountAmount.value))

const grandTotal = computed(() => {
  const delivery = selectedDelivery.value
  if (!delivery || delivery.price === 'FREE' || delivery.price === '—') return promoAdjustedSubtotal.value
  const deliveryPrice = Number(delivery.price)
  if (isNaN(deliveryPrice)) return promoAdjustedSubtotal.value
  return promoAdjustedSubtotal.value + Math.max(0, deliveryPrice - promoShippingDiscount.value)
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

          if (delivery?.mode === 'pickup' && !String(form.value.pickupPoint || '').trim() ) {
            errorMessage.value = storefrontContent.value.checkout.errors.deliveryRequired
            return
          }
          if (maystroShippingAmount == null) {
            errorMessage.value = storefrontContent.value.checkout.errors.shippingUnavailable
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
          promoCode: promo.appliedCode.value || undefined,
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
        promo.reset()
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
  <div class="bg-[#F2ECE1] min-h-screen text-[#16211E]">
    <!-- Head -->
    <div class="relative bg-brand-600 text-[#F2ECE1] overflow-hidden">
      <div class="emb-zellige opacity-[0.09] absolute inset-0 pointer-events-none" />
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div class="flex items-end justify-between gap-6">
          <h1 class="emb-display text-4xl md:text-[52px] leading-none text-[#FDFAF4]">
            {{ storefrontContent.checkout.title }}
          </h1>
          <div class="hidden sm:flex items-center gap-3 shrink-0">
            <span class="emb-label text-[#F2ECE1]/70">{{ storefrontContent.cart.itemsCount(cartStore.itemCount) }}</span>
            <span class="h-12 w-12 border border-[#DFA254] text-[#DFA254] flex items-center justify-center text-sm font-bold tabular-nums">
              {{ cartStore.itemCount }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      <div
        v-if="!cartEnabled"
        class="mb-8 border-s-2 border-[#DFA254] bg-[#FDFAF4] text-[#8A5A18] text-sm px-4 py-3.5"
      >
        {{ storefrontContent.checkout.disabled }}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <!-- Left: details -->
        <div class="lg:col-span-7 space-y-8">
          <!-- Customer -->
          <div class="border border-[#CBBDAB] bg-[#FDFAF4]">
            <div class="flex items-center gap-3 px-6 py-4 border-b border-[#CBBDAB]">
              <span class="emb-star w-3 h-3 text-[#DFA254]" />
              <h2 class="emb-label text-[#16211E]">
                {{ storefrontContent.checkout.sections.customerInformation }}
              </h2>
            </div>

            <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="space-y-2">
                <label class="block emb-label text-[#8E9793]">{{ storefrontContent.checkout.form.fullName.label }}</label>
                <input
                  v-model="form.fullName"
                  type="text"
                  class="w-full h-12 border border-[#CBBDAB] bg-[#FDFAF4] px-4 text-[#16211E] placeholder:text-[#8E9793] focus:border-brand-600 focus:ring-0 transition-colors outline-none"
                  :placeholder="storefrontContent.checkout.form.fullName.placeholder"
                >
              </div>
              <div class="space-y-2">
                <label class="block emb-label text-[#8E9793]">{{ storefrontContent.checkout.form.phone.label }}</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  class="w-full h-12 border border-[#CBBDAB] bg-[#FDFAF4] px-4 text-[#16211E] placeholder:text-[#8E9793] focus:border-brand-600 focus:ring-0 transition-colors outline-none"
                  :placeholder="storefrontContent.checkout.form.phone.placeholder"
                >
              </div>
              <div class="space-y-2">
                <label class="block emb-label text-[#8E9793]">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                <WilayaField
                  v-model="form.wilaya"
                  input-class="w-full h-12 border border-[#CBBDAB] bg-[#FDFAF4] px-4 text-[#16211E] focus:border-brand-600 focus:ring-0 transition-colors outline-none appearance-none cursor-pointer"
                  :placeholder="storefrontContent.checkout.form.wilaya.placeholder"
                />
              </div>
              <div class="space-y-2">
                <label class="block emb-label text-[#8E9793]">{{ storefrontContent.checkout.form.commune.label }}</label>
                <CommuneField
                  v-model="form.commune"
                  :wilaya-code="form.wilaya"
                  :placeholder="storefrontContent.checkout.form.commune.placeholder"
                  :input-class="'w-full h-12 border border-[#CBBDAB] bg-[#FDFAF4] px-4 text-[#16211E] placeholder:text-[#8E9793] focus:border-brand-600 focus:ring-0 transition-colors outline-none'"
                  :select-class="'w-full h-12 border border-[#CBBDAB] bg-[#FDFAF4] px-4 text-[#16211E] focus:border-brand-600 focus:ring-0 transition-colors outline-none'"
                />
              </div>

              <div
                v-if="isPickupSelected"
                class="md:col-span-2 space-y-2"
              >
                <label class="block emb-label text-[#8E9793]">{{ storefrontContent.checkout.delivery.mode.pickupPoint }}</label>
                <div
                  v-if="pickupPointsLoading"
                  class="flex items-center gap-2 px-4 py-3 border border-[#CBBDAB] bg-[#F2ECE1] text-sm text-[#5A6763]"
                >
                  <Icon
                    name="lucide:loader-2"
                    class="w-4 h-4 animate-spin shrink-0"
                  />
                  {{ storefrontContent.checkout.actions.placingOrder }}
                </div>
                <div
                  v-else-if="form.pickupPoint"
                  class="flex items-center gap-3 px-4 py-3 border-s-2 border-brand-600 bg-[#F2ECE1]"
                >
                  <Icon
                    name="lucide:map-pin"
                    class="w-4 h-4 text-brand-700 shrink-0"
                  />
                  <span class="text-sm font-semibold text-[#16211E]">{{ form.pickupPoint }}</span>
                </div>
                <p
                  v-if="pickupPointsError"
                  class="text-xs text-[#8A5A18]"
                >
                  {{ pickupPointsError }}
                </p>
              </div>

              <div
                v-if="!hideOptionalAddress"
                class="md:col-span-2 space-y-2"
              >
                <label class="block emb-label text-[#8E9793]">{{ storefrontContent.checkout.form.address.label }}</label>
                <input
                  v-model="form.address"
                  type="text"
                  class="w-full h-12 border border-[#CBBDAB] bg-[#FDFAF4] px-4 text-[#16211E] placeholder:text-[#8E9793] focus:border-brand-600 focus:ring-0 transition-colors outline-none"
                  :placeholder="storefrontContent.checkout.form.address.placeholder"
                >
              </div>
            </div>
          </div>

          <!-- Delivery -->
          <div
            v-if="form.wilaya && form.commune"
            class="border border-[#CBBDAB] bg-[#FDFAF4]"
          >
            <div class="flex items-center justify-between gap-3 px-6 py-4 border-b border-[#CBBDAB]">
              <div class="flex items-center gap-3">
                <span class="emb-star w-3 h-3 text-[#DFA254]" />
                <h2 class="emb-label text-[#16211E]">
                  {{ storefrontContent.checkout.sections.deliveryOptions }}
                </h2>
              </div>
              <span class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A5A18] border border-[#DFA254] px-2 py-1">
                {{ storefrontContent.checkout.required }}
              </span>
            </div>

            <div class="p-6 space-y-3">
              <p class="text-xs text-[#5A6763] mb-2">
                {{ storefrontContent.checkout.help.deliveryOptions }}
              </p>

              <button
                v-for="option in deliveryOptions"
                :key="option.id"
                type="button"
                class="w-full text-start border p-4 transition-colors"
                :class="form.selectedDeliveryOption === option.id
                  ? 'border-brand-600 bg-[#F2ECE1]'
                  : 'border-[#CBBDAB] bg-[#FDFAF4] hover:border-[#DFA254]'"
                @click="form.selectedDeliveryOption = option.id"
              >
                <div class="flex items-center gap-4">
                  <span
                    class="w-11 h-11 flex items-center justify-center shrink-0 transition-colors"
                    :class="form.selectedDeliveryOption === option.id
                      ? 'bg-brand-600 text-[#FDFAF4]'
                      : 'bg-[#F2ECE1] text-[#5A6763]'"
                  >
                    <CarrierMark
                      :provider="option.provider"
                      :icon="option.icon"
                      :alt="option.providerLabel"
                      class="w-5 h-5"
                    />
                  </span>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-semibold text-[#16211E] text-sm">{{ option.providerLabel }}</span>
                      <span class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A5A18] border border-[#DFA254] px-1.5 py-0.5">
                        {{ option.modeLabel }}
                      </span>
                    </div>
                    <p class="text-xs text-[#5A6763] mt-1 leading-relaxed">
                      {{ option.description }}
                    </p>
                  </div>

                  <div class="flex items-center gap-3 shrink-0">
                    <span class="emb-display text-base text-brand-700 tabular-nums whitespace-nowrap">
                      {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
                    </span>
                    <span
                      class="w-4 h-4 border flex items-center justify-center transition-colors"
                      :class="form.selectedDeliveryOption === option.id
                        ? 'border-brand-600 bg-brand-600'
                        : 'border-[#CBBDAB]'"
                    >
                      <Icon
                        v-if="form.selectedDeliveryOption === option.id"
                        name="lucide:check"
                        class="w-3 h-3 text-[#FDFAF4]"
                      />
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
              </button>
            </div>
          </div>

          <div
            v-else
            class="flex items-center gap-3 border border-dashed border-[#CBBDAB] px-6 py-5 text-sm text-[#8E9793]"
          >
            <Icon
              name="lucide:map-pin"
              class="w-4 h-4 text-[#DFA254] shrink-0"
            />
            {{ storefrontContent.checkout.help.deliveryOptions }}
          </div>
        </div>

        <!-- Right: summary -->
        <div class="lg:col-span-5">
          <div class="border border-[#CBBDAB] bg-[#FDFAF4] lg:sticky lg:top-28">
            <div class="flex items-center justify-between gap-3 bg-brand-600 text-[#FDFAF4] px-6 py-5">
              <h2 class="emb-display text-2xl leading-none">
                {{ storefrontContent.checkout.sections.orderSummary }}
              </h2>
              <span class="emb-label text-[#DFA254]">{{ storefrontContent.cart.itemsCount(cartStore.itemCount) }}</span>
            </div>

            <div class="p-6">
              <!-- Items -->
              <ul class="space-y-4 max-h-72 overflow-y-auto pe-1">
                <li
                  v-for="item in cartStore.items"
                  :key="item.variantId || item.productId"
                  class="flex items-center gap-4 pb-4 border-b border-[#CBBDAB] last:border-0 last:pb-0"
                >
                  <div class="h-14 w-14 shrink-0 overflow-hidden border border-[#CBBDAB] bg-[#F2ECE1]">
                    <img
                      v-if="item.image"
                      :src="item.image"
                      :alt="item.title"
                      class="h-full w-full object-cover object-center"
                    >
                    <div
                      v-else
                      class="h-full w-full flex items-center justify-center text-[#CBBDAB]"
                    >
                      <Icon
                        name="lucide:image"
                        class="w-6 h-6"
                      />
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-[#16211E] truncate">
                      {{ item.title }}
                    </p>
                    <p class="text-xs text-[#8E9793] mt-0.5 tabular-nums">
                      {{ storefrontContent.checkout.summary.quantityShort }}{{ item.quantity }}
                    </p>
                  </div>
                  <span class="text-sm font-semibold text-[#16211E] tabular-nums whitespace-nowrap">
                    {{ formatAmount(item.price) }} {{ currencyCode }}
                  </span>
                </li>
              </ul>

              <!-- Coupon -->
              <div class="mt-6 pt-6 border-t border-[#CBBDAB]">
                <div class="flex items-center justify-between gap-3 mb-3">
                  <span class="emb-label text-[#16211E]">{{ storefrontContent.checkout.coupon.title }}</span>
                  <span class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A5A18] border border-[#DFA254] px-2 py-0.5">
                    {{ storefrontContent.checkout.coupon.badge }}
                  </span>
                </div>
                <div class="flex gap-px bg-[#CBBDAB] border border-[#CBBDAB]">
                  <input
                    v-model="couponCode"
                    :disabled="promo.applied.value"
                    type="text"
                    :placeholder="storefrontContent.checkout.coupon.placeholder"
                    class="flex-1 min-w-0 h-11 border-0 bg-[#FDFAF4] px-4 text-sm text-[#16211E] placeholder:text-[#8E9793] focus:ring-0 outline-none"
                  >
                  <button
                    type="button"
                    class="px-5 h-11 bg-brand-600 text-[#FDFAF4] emb-label hover:bg-[#DFA254] hover:text-[#062622] transition-colors whitespace-nowrap"
                    :disabled="promo.checking.value"
                    @click="applyPromoCode"
                  >
                    {{ couponButtonLabel }}
                  </button>
                </div>
                <p
                  v-if="promo.errorMessage.value"
                  class="mt-2 text-xs text-red-500"
                >
                  {{ promo.errorMessage.value }}
                </p>
                <p
                  v-else-if="promo.applied.value"
                  class="mt-2 text-xs text-emerald-600"
                >
                  {{ promo.freeShipping.value
                    ? storefrontContent.checkout.coupon.freeShipping
                    : storefrontContent.checkout.coupon.applied(promo.appliedCode.value) }}
                </p>
              </div>

              <!-- Totals -->
              <dl class="mt-6 pt-6 border-t border-[#CBBDAB] space-y-3">
                <div
                  v-if="selectedDelivery"
                  class="flex items-center justify-between gap-3 text-sm"
                >
                  <dt class="text-[#5A6763]">
                    {{ storefrontContent.checkout.summary.deliveryOption }}
                  </dt>
                  <dd class="flex items-center gap-2 text-[#16211E] font-medium text-end">
                    <Icon
                      :name="selectedDelivery.icon"
                      class="w-4 h-4 text-[#8E9793] shrink-0"
                    />
                    <span>{{ selectedDelivery.providerLabel }} — {{ selectedDelivery.modeLabel }}</span>
                  </dd>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <dt class="text-[#5A6763]">
                    {{ storefrontContent.cart.summary.subtotal }}
                  </dt>
                  <dd class="font-semibold text-[#16211E] tabular-nums">
                    {{ formatAmount(cartStore.total) }} {{ currencyCode }}
                  </dd>
                </div>
                <div
                  v-if="cartStore.clearanceDiscount > 0"
                  class="flex items-center justify-between text-sm"
                >
                  <dt class="text-[#8A5A18]">
                    {{ t('storefront.clearance.discountLine') }}
                  </dt>
                  <dd class="font-semibold text-[#8A5A18] tabular-nums">
                    -{{ formatAmount(cartStore.clearanceDiscount) }} {{ currencyCode }}
                  </dd>
                </div>
                <div
                  v-if="promoTotalDiscount > 0"
                  class="flex items-center justify-between text-sm"
                >
                  <dt class="text-[#8A5A18]">
                    {{ promoDiscountLabel }}
                  </dt>
                  <dd class="font-semibold text-[#8A5A18] tabular-nums">
                    -{{ formatAmount(promoTotalDiscount) }} {{ currencyCode }}
                  </dd>
                </div>
                <div
                  v-if="selectedDelivery"
                  class="flex items-center justify-between text-sm"
                >
                  <dt class="text-[#5A6763]">
                    {{ storefrontContent.checkout.summary.shippingFee }}
                  </dt>
                  <dd class="font-semibold text-brand-700 tabular-nums">
                    {{ selectedDelivery.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${selectedDelivery.price} ${currencyCode}` }}
                  </dd>
                </div>

                <div class="flex items-baseline justify-between pt-4 border-t border-[#CBBDAB]">
                  <dt class="emb-label text-[#16211E]">
                    {{ storefrontContent.cart.summary.total }}
                  </dt>
                  <dd class="emb-display text-3xl text-brand-700 tabular-nums">
                    {{ formatAmount(grandTotal) }} {{ currencyCode }}
                  </dd>
                </div>
              </dl>

              <p class="text-xs text-[#8E9793] mt-3">
                {{ storefrontContent.checkout.minimumOrder(formatAmount(minimumOrderAmount), currencyCode) }}
              </p>

              <div
                v-if="errorMessage"
                class="mt-5 flex items-start gap-2.5 px-4 py-3 border-s-2 border-[#B4593F] bg-[#FBF0EC] text-[#8E3A22] text-sm"
              >
                <Icon
                  name="lucide:alert-circle"
                  class="w-4 h-4 shrink-0 mt-0.5"
                />
                <span>{{ errorMessage }}</span>
              </div>

              <button
                type="button"
                :disabled="submitting || !cartEnabled || !hasRequiredFields"
                class="w-full mt-6 h-14 bg-brand-600 text-[#FDFAF4] emb-label hover:bg-[#DFA254] hover:text-[#062622] transition-colors disabled:bg-[#CBBDAB] disabled:text-[#5A6763] disabled:cursor-not-allowed flex items-center justify-center gap-3"
                @click="handleSubmit"
              >
                <Icon
                  v-if="submitting"
                  name="lucide:loader-2"
                  class="w-5 h-5 animate-spin"
                />
                <span>
                  {{ submitting ? storefrontContent.checkout.actions.placingOrder : (!cartEnabled ? storefrontContent.checkout.disabledShort : storefrontContent.checkout.actions.placeOrder) }}
                </span>
                <Icon
                  v-if="!submitting && cartEnabled && hasRequiredFields"
                  name="lucide:arrow-right"
                  class="w-4 h-4 rtl:rotate-180"
                />
              </button>

              <p class="mt-4 flex items-center justify-center gap-2 text-xs text-[#8E9793]">
                <Icon
                  name="lucide:shield-check"
                  class="w-3.5 h-3.5 text-brand-700"
                />
                {{ storefrontContent.checkout.secureTransaction }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
