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
  onCommuneChange: (communeId) => { form.value.commune = communeId }
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
  <div class="min-h-screen bg-gradient-to-b from-amber-50/30 to-white py-12">
    <div class="max-w-6xl mx-auto px-4">
      <h1 class="font-cozy font-black text-4xl text-slate-800 text-center mb-12">
        {{ storefrontContent.checkout.title }}
      </h1>

      <div
        v-if="!cartEnabled"
        class="mb-8 p-6 bg-amber-50 rounded-2xl text-amber-700 text-center"
      >
        {{ storefrontContent.checkout.disabled }}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <!-- Left: Form -->
        <div class="lg:col-span-7 space-y-8">
          <!-- Personal Info -->
          <div class="bg-white p-8 rounded-[2rem] shadow-soft">
            <h2 class="font-bold text-slate-800 text-xl mb-6 flex items-center gap-3">
              <div class="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-500">
                <Icon
                  name="lucide:user"
                  class="w-4 h-4"
                />
              </div>
              {{ storefrontContent.checkout.sections.customerInformation }}
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">{{ storefrontContent.checkout.form.fullName.label }}</label>
                <input
                  v-model="form.fullName"
                  type="text"
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all"
                  :placeholder="storefrontContent.checkout.form.fullName.placeholder"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">{{ storefrontContent.checkout.form.phone.label }}</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all"
                  :placeholder="storefrontContent.checkout.form.phone.placeholder"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                <WilayaField
                  v-model="form.wilaya"
                  input-class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none appearance-none cursor-pointer"
                  :placeholder="storefrontContent.checkout.form.wilaya.placeholder"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">{{ storefrontContent.checkout.form.commune.label }}</label>
                <CommuneField
                  v-model="form.commune"
                  :wilaya-code="form.wilaya"
                  :placeholder="storefrontContent.checkout.form.commune.placeholder"
                  :input-class="'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all'"
                  :select-class="'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all'"
                />
              </div>
              <div
                v-if="!hideOptionalAddress"
                class="md:col-span-2"
              >
                <label class="block text-sm font-medium text-slate-600 mb-2">{{ storefrontContent.checkout.form.address.label }}</label>
                <input
                  v-model="form.address"
                  type="text"
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all"
                  :placeholder="storefrontContent.checkout.form.address.placeholder"
                >
              </div>
            </div>
          </div>

          <!-- Delivery Options -->
          <div
            v-if="form.wilaya && form.commune"
            class="bg-white p-8 rounded-[2rem] shadow-soft"
          >
            <h2 class="font-bold text-slate-800 text-xl mb-6 flex items-center gap-3">
              <div class="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-500">
                <Icon
                  name="lucide:truck"
                  class="w-4 h-4"
                />
              </div>
              {{ storefrontContent.checkout.sections.deliveryMethod }}
            </h2>
            
            <div class="space-y-4">
              <div
                v-for="option in deliveryOptions"
                :key="option.id"
                class="p-4 rounded-2xl border-2 cursor-pointer transition-all"
                :class="form.selectedDeliveryOption === option.id 
                  ? 'border-brand-400 bg-brand-50 shadow-md' 
                  : 'border-slate-100 hover:border-brand-200'"
                @click="form.selectedDeliveryOption = option.id"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div
                      class="w-12 h-12 rounded-xl flex items-center justify-center"
                      :class="`bg-${option.color}-100 text-${option.color}-500`"
                    >
                      <CarrierMark
                        :provider="option.provider"
                        :icon="option.icon"
                        :alt="option.providerLabel"
                        class="w-6 h-6"
                      />
                    </div>
                    <div>
                      <h3 class="font-bold text-slate-700">
                        {{ option.providerLabel }}
                      </h3>
                      <p class="text-sm text-slate-400">
                        {{ option.modeLabel }}
                      </p>
                    </div>
                  </div>
                  <div class="text-end">
                    <span class="font-bold text-slate-700">
                      {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
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
          <div
            v-else
            class="bg-white p-8 rounded-[2rem] shadow-soft text-center text-sm text-slate-400"
          >
            <Icon
              name="lucide:map-pin"
              class="w-5 h-5 mx-auto mb-2 text-slate-300"
            />
            {{ storefrontContent.checkout.help.deliveryOptions }}
          </div>

          <!-- Error Message -->
          <div
            v-if="errorMessage"
            class="p-4 bg-red-50 rounded-2xl text-red-600 text-sm"
          >
            {{ errorMessage }}
          </div>
        </div>

        <!-- Right: Summary -->
        <div class="lg:col-span-5">
          <div class="bg-white p-8 rounded-[2rem] shadow-soft sticky top-24">
            <h2 class="font-bold text-slate-800 text-xl mb-6">
              {{ storefrontContent.checkout.sections.orderSummary }}
            </h2>

            <div class="space-y-4 mb-6">
              <div
                v-for="item in cartStore.items"
                :key="item.variantId || item.productId"
                class="flex gap-4"
              >
                <div class="w-16 h-16 bg-slate-50 rounded-xl overflow-hidden relative flex-shrink-0">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.title"
                    class="w-full h-full object-cover"
                  >
                  <span class="absolute -top-1 -end-1 bg-brand-500 text-white w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full">
                    {{ item.quantity }}
                  </span>
                </div>
                <div class="flex-grow">
                  <h4 class="font-medium text-slate-700">
                    {{ item.title }}
                  </h4>
                  <p
                    v-if="item.variantId"
                    class="text-xs text-slate-400"
                  >
                    {{ item.variantId.slice(0,8) }}
                  </p>
                </div>
                <div class="font-bold text-slate-700">
                  {{ formatCurrency(item.lineTotal ?? (item.price * item.quantity)) }}
                </div>
              </div>
            </div>

            <!-- Coupon -->
            <div class="mb-6 p-4 bg-slate-50 rounded-xl">
              <label class="block text-sm font-medium text-slate-600 mb-2">{{ storefrontContent.checkout.coupon.title }}</label>
              <div class="flex gap-2">
                <input
                  v-model="couponCode"
                  type="text"
                  :placeholder="storefrontContent.checkout.coupon.placeholder"
                  class="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 outline-none"
                >
                <button class="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-brand-500 transition-colors">
                  {{ storefrontContent.actions.apply }}
                </button>
              </div>
            </div>
            
            <dl class="space-y-3 text-sm mb-8">
              <div
                v-if="selectedDelivery"
                class="flex justify-between text-slate-500"
              >
                <dt>{{ storefrontContent.checkout.summary.deliveryOption }}</dt>
                <dd>{{ selectedDelivery.providerLabel }} - {{ selectedDelivery.modeLabel }}</dd>
              </div>
              <div class="flex justify-between text-slate-500">
                <dt>{{ storefrontContent.cart.summary.subtotal }}</dt>
                <dd class="font-medium text-slate-700">
                  {{ formatCurrency(cartStore.total) }}
                </dd>
              </div>
              <div
                v-if="cartStore.clearanceDiscount > 0"
                class="flex justify-between text-amber-600"
              >
                <dt>{{ t('storefront.clearance.discountLine') }}</dt>
                <dd class="font-medium text-amber-600">
                  -{{ formatCurrency(cartStore.clearanceDiscount) }}
                </dd>
              </div>
              <div
                v-if="selectedDelivery"
                class="flex justify-between text-slate-500"
              >
                <dt>{{ storefrontContent.cart.summary.shipping }}</dt>
                <dd>{{ selectedDelivery.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${selectedDelivery.price} ${currencyCode}` }}</dd>
              </div>
              <div class="flex justify-between text-lg font-bold pt-4 border-t border-slate-100">
                <dt class="text-slate-800">
                  {{ storefrontContent.cart.summary.total }}
                </dt>
                <dd class="text-brand-500">
                  {{ formatCurrency(grandTotal) }}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              :disabled="submitting || !cartEnabled || !hasRequiredFields"
              class="w-full bg-slate-800 text-white font-bold py-4 rounded-full shadow-lg hover:shadow-xl hover:bg-brand-500 hover:shadow-brand-300 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              @click="handleSubmit"
            >
              <Icon
                v-if="submitting"
                name="lucide:loader-2"
                class="w-5 h-5 animate-spin"
              />
              <span>{{ submitting ? storefrontContent.checkout.actions.placingOrder : storefrontContent.checkout.actions.placeOrder }}</span>
            </button>

            <NuxtLink
              to="/cart"
              class="block text-center text-slate-500 hover:text-brand-500 font-medium py-3 mt-4 transition-colors"
            >
              {{ storefrontContent.checkout.actions.returnToCart }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
