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
    MAYSTRO: { label: 'Maystro', icon: 'lucide:truck', color: 'emerald' },
    YALIDINE: { label: 'Yalidine', icon: 'lucide:package', color: 'blue' },
    ECOTRACK: { label: 'Ecotrack', icon: 'lucide:send', color: 'purple' },
    ZR_EXPRESS: { label: 'ZR Express', icon: 'lucide:zap', color: 'orange' },
    SELF: { label: storefrontContent.value.checkout.delivery.provider.self, icon: 'lucide:bike', color: 'lime' }
  }
  return allowed.map((key: string) => ({ key, ...providerMeta[key as keyof typeof providerMeta] }))
})

// Unified delivery options
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
  <div class="ed-theme">
    <div class="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-10 py-10 md:py-16">
      <div class="border-b border-[#262019] pb-6 mb-10">
        <p class="ed-kicker mb-3">{{ storefrontContent.checkout.secureTransaction }}</p>
        <h1 class="ed-display text-4xl md:text-6xl text-[#262019]">{{ storefrontContent.checkout.title }}</h1>
      </div>

      <div v-if="!cartEnabled" class="mb-8 px-5 py-4 border border-[#B8532E] bg-[#EFE0D5] text-[#97401F] ed-ui text-sm text-center">
        {{ storefrontContent.checkout.disabled }}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        <!-- Form -->
        <div class="lg:col-span-7 space-y-10">
          <!-- Customer info -->
          <section>
            <h2 class="ed-display text-2xl text-[#262019] mb-1 flex items-baseline gap-3">
              <span class="ed-num text-lg">01</span>{{ storefrontContent.checkout.sections.customerInformation }}
            </h2>
            <span class="ed-rule block mt-3 mb-6" />

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label class="ed-label">{{ storefrontContent.checkout.form.fullName.label }}</label>
                <input v-model="form.fullName" type="text" class="ed-input" :placeholder="storefrontContent.checkout.form.fullName.placeholder">
              </div>
              <div>
                <label class="ed-label">{{ storefrontContent.checkout.form.phone.label }}</label>
                <input v-model="form.phone" type="tel" class="ed-input" :placeholder="storefrontContent.checkout.form.phone.placeholder">
              </div>
              <div>
                <label class="ed-label">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                <WilayaField
                  v-model="form.wilaya"
                  input-class="ed-input ed-select"
                  :placeholder="storefrontContent.checkout.form.wilaya.placeholder"
                />
              </div>
              <div>
                <label class="ed-label">{{ storefrontContent.checkout.form.commune.label }}</label>
                <CommuneField
                  v-model="form.commune"
                  :wilaya-code="form.wilaya"
                  :placeholder="storefrontContent.checkout.form.commune.placeholder"
                  :input-class="'ed-input'"
                  :select-class="'ed-input ed-select'"
                />
              </div>
              <div v-if="!hideOptionalAddress" class="md:col-span-2">
                <label class="ed-label">{{ storefrontContent.checkout.form.address.label }}</label>
                <input v-model="form.address" type="text" class="ed-input" :placeholder="storefrontContent.checkout.form.address.placeholder">
              </div>
            </div>
          </section>

          <!-- Delivery -->
          <section v-if="form.wilaya && form.commune">
            <h2 class="ed-display text-2xl text-[#262019] mb-1 flex items-baseline gap-3">
              <span class="ed-num text-lg">02</span>{{ storefrontContent.checkout.sections.deliveryMethod }}
            </h2>
            <span class="ed-rule block mt-3 mb-6" />

            <div class="space-y-2.5">
              <div
                v-for="option in deliveryOptions"
                :key="option.id"
                class="p-4 border cursor-pointer transition-colors"
                :class="form.selectedDeliveryOption === option.id ? 'border-[#262019] bg-[#F4EFE6]' : 'border-[#DAD2C4] hover:border-[#8A7E6E]'"
                @click="form.selectedDeliveryOption = option.id"
              >
                <div class="flex items-center justify-between gap-4">
                  <div class="flex items-center gap-4 min-w-0">
                    <CarrierMark
                      :provider="option.provider"
                      :icon="option.icon"
                      :alt="option.providerLabel"
                      class="w-6 h-6 shrink-0"
                      :class="form.selectedDeliveryOption === option.id ? 'text-[#262019]' : 'text-[#8A7E6E]'"
                    />
                    <div class="min-w-0">
                      <h3 class="ed-display text-[16px] text-[#262019]">{{ option.providerLabel }}</h3>
                      <p class="ed-ui text-xs text-[#8A7E6E]">{{ option.modeLabel }}</p>
                    </div>
                  </div>
                  <span class="ed-display text-[16px] text-[#B8532E] shrink-0">
                    {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
                  </span>
                </div>
                <div
                  v-if="option.mode === 'pickup' && option.provider && form.selectedDeliveryOption === option.id"
                  class="mt-3 pt-3 border-t border-[#DAD2C4]"
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
          </section>
          <section v-else>
            <h2 class="ed-display text-2xl text-[#262019] mb-1 flex items-baseline gap-3">
              <span class="ed-num text-lg">02</span>{{ storefrontContent.checkout.sections.deliveryMethod }}
            </h2>
            <span class="ed-rule block mt-3 mb-6" />
            <div class="px-4 py-6 border border-dashed border-[#C4B8A4] text-center ed-ui text-xs text-[#8A7E6E]">
              <Icon name="lucide:map-pin" class="w-5 h-5 mx-auto mb-2 text-[#C4B8A4]" />
              {{ storefrontContent.checkout.help.deliveryOptions }}
            </div>
          </section>

          <div v-if="errorMessage" class="px-4 py-3 border border-[#B8532E] bg-[#EFE0D5] text-[#97401F] ed-ui text-sm">
            {{ errorMessage }}
          </div>
        </div>

        <!-- Summary -->
        <div class="lg:col-span-5">
          <div class="border border-[#262019] bg-[#FBF8F2] p-7 lg:sticky lg:top-24">
            <h2 class="ed-display text-xl text-[#262019] mb-6 pb-4 border-b border-[#DAD2C4]">{{ storefrontContent.checkout.sections.orderSummary }}</h2>

            <div class="space-y-4 mb-6">
              <div v-for="item in cartStore.items" :key="item.variantId || item.productId" class="flex gap-3.5">
                <div class="w-14 h-16 bg-[#F4EFE6] border border-[#DAD2C4] overflow-hidden relative flex-shrink-0">
                  <img v-if="item.image" :src="item.image" :alt="item.title" class="w-full h-full object-cover">
                  <span class="absolute top-0 end-0 bg-[#262019] text-[#F4EFE6] w-5 h-5 flex items-center justify-center ed-ui text-[10px] font-bold">{{ item.quantity }}</span>
                </div>
                <div class="flex-grow min-w-0">
                  <h4 class="ed-display text-[15px] text-[#262019] leading-snug">{{ item.title }}</h4>
                  <p v-if="item.variantId" class="ed-ui text-[11px] text-[#8A7E6E] mt-0.5">{{ storefrontContent.cart.item.variant }}</p>
                </div>
                <div class="ed-display text-[15px] text-[#262019] shrink-0">{{ formatCurrency(item.lineTotal ?? (item.price * item.quantity)) }}</div>
              </div>
            </div>

            <!-- Coupon -->
            <div class="mb-6 pt-4 border-t border-[#DAD2C4]">
              <label class="ed-label">{{ storefrontContent.checkout.coupon.title }}</label>
              <div class="flex gap-2">
                <input v-model="couponCode" type="text" :placeholder="storefrontContent.checkout.coupon.placeholder" class="ed-input flex-1">
                <button class="ed-btn-line !px-5 !py-3 shrink-0">{{ storefrontContent.actions.apply }}</button>
              </div>
            </div>

            <dl class="space-y-3 ed-ui text-sm mb-7">
              <div v-if="selectedDelivery" class="flex justify-between text-[#8A7E6E]">
                <dt>{{ storefrontContent.checkout.summary.deliveryOption }}</dt>
                <dd class="text-end">{{ selectedDelivery.providerLabel }} — {{ selectedDelivery.modeLabel }}</dd>
              </div>
              <div class="flex justify-between text-[#8A7E6E]">
                <dt>{{ storefrontContent.cart.summary.subtotal }}</dt>
                <dd class="text-[#262019] font-semibold">{{ formatCurrency(cartStore.total) }}</dd>
              </div>
              <div v-if="cartStore.clearanceDiscount > 0" class="flex justify-between text-[#97401F]">
                <dt>{{ t('storefront.clearance.discountLine') }}</dt>
                <dd class="font-semibold">−{{ formatCurrency(cartStore.clearanceDiscount) }}</dd>
              </div>
              <div v-if="selectedDelivery" class="flex justify-between text-[#8A7E6E]">
                <dt>{{ storefrontContent.cart.summary.shipping }}</dt>
                <dd>{{ selectedDelivery.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${selectedDelivery.price} ${currencyCode}` }}</dd>
              </div>
              <div class="flex justify-between items-baseline pt-4 border-t border-[#262019]">
                <dt class="ed-display text-lg text-[#262019]">{{ storefrontContent.cart.summary.total }}</dt>
                <dd class="ed-display text-2xl text-[#B8532E]">{{ formatCurrency(grandTotal) }}</dd>
              </div>
            </dl>

            <button
              type="button"
              :disabled="submitting || !cartEnabled || !hasRequiredFields"
              class="ed-btn-solid w-full"
              @click="handleSubmit"
            >
              <Icon v-if="submitting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
              <span>{{ submitting ? storefrontContent.checkout.actions.placingOrder : storefrontContent.checkout.actions.placeOrder }}</span>
            </button>

            <NuxtLink to="/cart" class="block text-center ed-link ed-ui text-[11px] font-semibold uppercase tracking-[0.14em] mt-4">
              {{ storefrontContent.checkout.actions.returnToCart }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
