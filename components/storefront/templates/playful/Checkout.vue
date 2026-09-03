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
        }) as { orderId: string }

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
  <div class="bg-[var(--kw-cream)] min-h-screen pb-16">
    <!-- ══ Head ═══════════════════════════════════════════════════════ -->
    <section class="kw-band-mint kw-scallop pt-10 pb-14 md:pt-12 md:pb-16 mb-10">
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <p class="kw-kicker mb-3">
          {{ storefrontContent.checkout.sections.customerInformation }}
        </p>
        <h1 class="kw-display text-3xl md:text-[2.8rem] mb-2">
          {{ storefrontContent.checkout.title }}
        </h1>
        <p class="kw-lede">
          {{ storefrontContent.cart.itemsCount(cartStore.itemCount) }}
        </p>

        <div
          v-if="!cartEnabled"
          class="mt-5 rounded-[var(--kw-r)] px-4 py-3.5 text-sm font-bold text-[var(--kw-ink)]"
          style="background: var(--kw-lemon-soft)"
        >
          {{ storefrontContent.checkout.disabled }}
        </div>
      </div>
    </section>

    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- ══ Left: details ════════════════════════════════════════════ -->
        <div class="lg:col-span-7 space-y-6">
          <div class="kw-card p-6 md:p-7">
            <div class="flex items-center gap-3.5 mb-7">
              <span
                class="w-10 h-10 kw-blob flex items-center justify-center flex-shrink-0"
                style="background: var(--kw-pink-soft)"
              >
                <Icon
                  name="lucide:user-round"
                  class="w-5 h-5 text-[var(--kw-pink-deep)]"
                />
              </span>
              <h2 class="kw-title text-lg">
                {{ storefrontContent.checkout.sections.customerInformation }}
              </h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label class="kw-label">{{ storefrontContent.checkout.form.fullName.label }}</label>
                <input
                  v-model="form.fullName"
                  type="text"
                  class="kw-field"
                  :placeholder="storefrontContent.checkout.form.fullName.placeholder"
                >
              </div>
              <div>
                <label class="kw-label">{{ storefrontContent.checkout.form.phone.label }}</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  class="kw-field"
                  :placeholder="storefrontContent.checkout.form.phone.placeholder"
                >
              </div>
              <div>
                <label class="kw-label">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                <WilayaField
                  v-model="form.wilaya"
                  input-class="kw-field appearance-none cursor-pointer"
                  :placeholder="storefrontContent.checkout.form.wilaya.placeholder"
                />
              </div>
              <div>
                <label class="kw-label">{{ storefrontContent.checkout.form.commune.label }}</label>
                <CommuneField
                  v-model="form.commune"
                  :wilaya-code="form.wilaya"
                  :placeholder="storefrontContent.checkout.form.commune.placeholder"
                  input-class="kw-field"
                  select-class="kw-field"
                />
              </div>
              <div
                v-if="!hideOptionalAddress"
                class="md:col-span-2"
              >
                <label class="kw-label">{{ storefrontContent.checkout.form.address.label }}</label>
                <input
                  v-model="form.address"
                  type="text"
                  class="kw-field"
                  :placeholder="storefrontContent.checkout.form.address.placeholder"
                >
              </div>
            </div>
          </div>

          <!-- Delivery -->
          <div
            v-if="form.wilaya && form.commune"
            class="kw-card p-6 md:p-7"
          >
            <div class="flex items-center justify-between gap-4 mb-2">
              <div class="flex items-center gap-3.5">
                <span
                  class="w-10 h-10 kw-blob flex items-center justify-center flex-shrink-0"
                  style="background: var(--kw-sky-soft)"
                >
                  <Icon
                    name="lucide:truck"
                    class="w-5 h-5 text-[var(--kw-sky-deep)]"
                  />
                </span>
                <h2 class="kw-title text-lg">
                  {{ storefrontContent.checkout.sections.deliveryOptions }}
                </h2>
              </div>
              <span class="kw-badge kw-badge-sale">{{ storefrontContent.checkout.required }}</span>
            </div>
            <p class="kw-lede text-sm mb-6 ms-[3.4rem]">
              {{ storefrontContent.checkout.help.deliveryOptions }}
            </p>

            <div class="space-y-3">
              <div
                v-for="option in deliveryOptions"
                :key="option.id"
                class="rounded-[var(--kw-r)] border-2 transition-all duration-300 overflow-hidden"
                :class="form.selectedDeliveryOption === option.id
                  ? 'border-[var(--kw-pink-deep)] bg-[var(--kw-pink-soft)]'
                  : 'border-[var(--kw-line)] bg-white hover:border-[var(--kw-pink)]'"
              >
                <button
                  type="button"
                  class="w-full text-start p-4 flex items-center gap-4"
                  @click="form.selectedDeliveryOption = option.id"
                >
                  <span
                    class="w-12 h-12 kw-blob flex items-center justify-center flex-shrink-0"
                    :style="{ background: form.selectedDeliveryOption === option.id ? 'var(--kw-surface)' : 'var(--kw-cream-2)' }"
                  >
                    <CarrierMark
                      :provider="option.provider"
                      :icon="option.icon"
                      :alt="option.providerLabel"
                      class="w-6 h-6"
                      :class="form.selectedDeliveryOption === option.id ? 'text-[var(--kw-pink-deep)]' : 'text-[var(--kw-ink-faint)]'"
                    />
                  </span>

                  <span class="flex-1 min-w-0">
                    <span class="flex items-center gap-2 mb-1">
                      <span class="kw-title text-sm">{{ option.providerLabel }}</span>
                      <span
                        class="kw-badge"
                        :class="option.mode === 'pickup' ? 'kw-badge-new' : 'kw-badge-low'"
                      >{{ option.modeLabel }}</span>
                    </span>
                    <span class="block text-xs font-semibold text-[var(--kw-ink-soft)]">{{ option.description }}</span>
                  </span>

                  <span class="flex items-center gap-3 flex-shrink-0">
                    <span class="kw-num text-[var(--kw-pink-deep)]">
                      {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
                    </span>
                    <span
                      class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
                      :class="form.selectedDeliveryOption === option.id
                        ? 'border-[var(--kw-pink-deep)] bg-[var(--kw-pink-deep)]'
                        : 'border-[var(--kw-line)] bg-white'"
                    >
                      <Icon
                        v-if="form.selectedDeliveryOption === option.id"
                        name="lucide:check"
                        class="w-3.5 h-3.5 text-white"
                      />
                    </span>
                  </span>
                </button>

                <div
                  v-if="option.mode === 'pickup' && option.provider && form.selectedDeliveryOption === option.id"
                  class="px-4 pb-4 pt-1"
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

          <div
            v-else
            class="kw-card p-8 text-center"
          >
            <span
              class="w-14 h-14 kw-blob mx-auto mb-4 flex items-center justify-center"
              style="background: var(--kw-sky-soft)"
            >
              <Icon
                name="lucide:map-pin"
                class="w-6 h-6 text-[var(--kw-sky-deep)]"
              />
            </span>
            <p class="kw-lede text-sm">
              {{ storefrontContent.checkout.help.deliveryOptions }}
            </p>
          </div>
        </div>

        <!-- ══ Right: summary ═══════════════════════════════════════════ -->
        <div class="lg:col-span-5">
          <div class="kw-card p-6 md:p-7 lg:sticky lg:top-[9.5rem] relative overflow-hidden">
            <div
              class="absolute top-0 inset-x-0 h-1.5"
              style="background: linear-gradient(90deg, var(--kw-pink), var(--kw-lemon), var(--kw-mint), var(--kw-sky))"
            />

            <div class="flex items-center justify-between gap-3 mb-6 mt-1.5">
              <h2 class="kw-display text-xl">
                {{ storefrontContent.checkout.sections.orderSummary }}
              </h2>
              <span class="kw-chip !cursor-default">
                <Icon
                  name="lucide:shopping-bag"
                  class="w-3.5 h-3.5"
                />
                {{ storefrontContent.checkout.itemsInCart(cartStore.itemCount) }}
              </span>
            </div>

            <div class="space-y-3 mb-6 max-h-80 overflow-y-auto pe-1 kw-hide-scroll">
              <div
                v-for="item in cartStore.items"
                :key="item.productId"
                class="flex items-center gap-3.5"
              >
                <span
                  class="h-14 w-14 kw-blob flex-shrink-0 overflow-hidden"
                  style="background: var(--kw-pink-soft)"
                >
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.title"
                    class="h-full w-full object-cover"
                  >
                  <span
                    v-else
                    class="h-full w-full flex items-center justify-center text-[var(--kw-pink)]"
                  >
                    <Icon
                      name="lucide:image"
                      class="w-6 h-6"
                    />
                  </span>
                </span>
                <div class="flex-1 min-w-0">
                  <h4 class="kw-title text-sm truncate">
                    {{ item.title }}
                  </h4>
                  <p class="text-xs font-bold text-[var(--kw-ink-faint)] mt-0.5">
                    {{ storefrontContent.checkout.summary.quantityShort }}{{ item.quantity }}
                  </p>
                </div>
                <span class="kw-num text-sm text-[var(--kw-pink-deep)] whitespace-nowrap">{{ formatAmount(item.price) }} {{ currencyCode }}</span>
              </div>
            </div>

            <!-- Coupon -->
            <div
              class="rounded-[var(--kw-r)] p-4 mb-6"
              style="background: var(--kw-lemon-soft)"
            >
              <div class="flex items-center justify-between gap-2 mb-3">
                <span class="flex items-center gap-2">
                  <Icon
                    name="lucide:ticket-percent"
                    class="w-4 h-4 text-[var(--kw-lemon-deep)]"
                  />
                  <span class="kw-title text-sm">{{ storefrontContent.checkout.coupon.title }}</span>
                </span>
                <span class="kw-badge kw-badge-low">{{ storefrontContent.checkout.coupon.badge }}</span>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="couponCode"
                  type="text"
                  :placeholder="storefrontContent.checkout.coupon.placeholder"
                  class="kw-field h-11 flex-1 min-w-0"
                >
                <button class="kw-btn kw-btn-sm kw-btn-lemon flex-shrink-0">
                  {{ storefrontContent.actions.apply }}
                </button>
              </div>
            </div>

            <!-- Totals -->
            <dl class="space-y-3 pt-1">
              <div
                v-if="selectedDelivery"
                class="flex items-start justify-between gap-3 text-sm"
              >
                <dt class="font-bold text-[var(--kw-ink-soft)]">
                  {{ storefrontContent.checkout.summary.deliveryOption }}
                </dt>
                <dd class="font-bold text-end">
                  {{ selectedDelivery.providerLabel }} — {{ selectedDelivery.modeLabel }}
                </dd>
              </div>
              <div class="flex items-center justify-between text-sm">
                <dt class="font-bold text-[var(--kw-ink-soft)]">
                  {{ storefrontContent.cart.summary.subtotal }}
                </dt>
                <dd class="kw-num">
                  {{ formatAmount(cartStore.total) }} {{ currencyCode }}
                </dd>
              </div>
              <div
                v-if="cartStore.clearanceDiscount > 0"
                class="flex items-center justify-between text-sm"
              >
                <dt class="font-bold text-[var(--kw-lemon-deep)]">
                  {{ t('storefront.clearance.discountLine') }}
                </dt>
                <dd class="kw-num text-[var(--kw-lemon-deep)]">
                  -{{ formatAmount(cartStore.clearanceDiscount) }} {{ currencyCode }}
                </dd>
              </div>
              <div
                v-if="selectedDelivery"
                class="flex items-center justify-between text-sm"
              >
                <dt class="font-bold text-[var(--kw-ink-soft)]">
                  {{ storefrontContent.checkout.summary.shippingFee }}
                </dt>
                <dd class="kw-num text-[var(--kw-sky-deep)]">
                  {{ selectedDelivery.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${selectedDelivery.price} ${currencyCode}` }}
                </dd>
              </div>

              <div
                class="flex items-center justify-between rounded-[var(--kw-r)] px-4 py-3.5 mt-2"
                style="background: var(--kw-cream-2)"
              >
                <dt class="kw-title">
                  {{ storefrontContent.cart.summary.total }}
                </dt>
                <dd class="kw-num text-2xl text-[var(--kw-pink-deep)]">
                  {{ formatAmount(grandTotal) }} {{ currencyCode }}
                </dd>
              </div>
            </dl>

            <p class="text-xs font-semibold text-[var(--kw-ink-faint)] mt-3 text-center">
              {{ storefrontContent.checkout.minimumOrder(formatAmount(minimumOrderAmount), currencyCode) }}
            </p>

            <div
              v-if="errorMessage"
              class="mt-5 rounded-[var(--kw-r)] bg-red-50 border-2 border-red-200 text-red-700 text-sm font-bold px-4 py-3.5 flex items-start gap-3"
            >
              <Icon
                name="lucide:alert-circle"
                class="w-5 h-5 flex-shrink-0 mt-0.5"
              />
              <span>{{ errorMessage }}</span>
            </div>

            <button
              :disabled="submitting || !cartEnabled || !hasRequiredFields"
              class="kw-btn kw-btn-lg w-full mt-7"
              @click="handleSubmit"
            >
              <Icon
                v-if="submitting"
                name="lucide:loader-2"
                class="w-5 h-5 animate-spin"
              />
              <span>{{ submitting ? storefrontContent.checkout.actions.placingOrder : (!cartEnabled ? storefrontContent.checkout.disabledShort : storefrontContent.checkout.actions.placeOrder) }}</span>
              <Icon
                v-if="!submitting && cartEnabled && hasRequiredFields"
                name="lucide:check-circle-2"
                class="w-5 h-5"
              />
            </button>

            <p class="flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--kw-ink-faint)] mt-4">
              <Icon
                name="lucide:shield-check"
                class="w-3.5 h-3.5"
              />
              {{ storefrontContent.checkout.secureTransaction }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
