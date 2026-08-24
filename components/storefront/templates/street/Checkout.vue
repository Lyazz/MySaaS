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
  <div class="min-h-screen bg-white">
    <div class="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
      <!-- Left: Form -->
      <div class="p-8 lg:p-16 border-e-4 border-black">
        <h1 class="font-street text-5xl mb-8 uppercase">
          {{ storefrontContent.checkout.title }}
        </h1>

        <div
          v-if="!cartEnabled"
          class="mb-8 p-4 border-4 border-black bg-yellow-100 font-mono text-sm uppercase"
        >
          {{ storefrontContent.checkout.disabled }}
        </div>

        <!-- Personal Info -->
        <div class="space-y-6 mb-12">
          <h2 class="font-street text-2xl uppercase border-b-4 border-black pb-2">
            {{ storefrontContent.checkout.sections.customerInformation }}
          </h2>
                
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2 md:col-span-1">
              <label class="block font-street text-xl uppercase mb-1">{{ storefrontContent.checkout.form.fullName.label }}</label>
              <input
                v-model="form.fullName"
                type="text"
                class="w-full bg-gray-100 border-2 border-black p-3 font-mono focus:shadow-[4px_4px_0_0_var(--brand)] outline-none"
                :placeholder="storefrontContent.checkout.form.fullName.placeholder"
              >
            </div>
            <div class="col-span-2 md:col-span-1">
              <label class="block font-street text-xl uppercase mb-1">{{ storefrontContent.checkout.form.phone.label }}</label>
              <input
                v-model="form.phone"
                type="tel"
                class="w-full bg-gray-100 border-2 border-black p-3 font-mono focus:shadow-[4px_4px_0_0_var(--brand)] outline-none"
                :placeholder="storefrontContent.checkout.form.phone.placeholder"
              >
            </div>
            <div>
              <label class="block font-street text-xl uppercase mb-1">{{ storefrontContent.checkout.form.wilaya.label }}</label>
              <WilayaField
                v-model="form.wilaya"
                input-class="w-full bg-gray-100 border-2 border-black p-3 font-mono focus:shadow-[4px_4px_0_0_var(--brand)] outline-none appearance-none cursor-pointer"
                :placeholder="storefrontContent.checkout.form.wilaya.placeholder"
              />
            </div>
            <div>
              <label class="block font-street text-xl uppercase mb-1">{{ storefrontContent.checkout.form.commune.label }}</label>
              <CommuneField
                v-model="form.commune"
                :wilaya-code="form.wilaya"
                :placeholder="storefrontContent.checkout.form.commune.placeholder"
                :input-class="'w-full bg-gray-100 border-2 border-black p-3 font-mono focus:shadow-[4px_4px_0_0_var(--brand)] outline-none'"
                :select-class="'w-full bg-gray-100 border-2 border-black p-3 font-mono focus:shadow-[4px_4px_0_0_var(--brand)] outline-none'"
              />
            </div>
            <div
              v-if="!hideOptionalAddress"
              class="col-span-2"
            >
              <label class="block font-street text-xl uppercase mb-1">{{ storefrontContent.checkout.form.address.label }}</label>
              <input
                v-model="form.address"
                type="text"
                class="w-full bg-gray-100 border-2 border-black p-3 font-mono focus:shadow-[4px_4px_0_0_var(--brand)] outline-none"
                :placeholder="storefrontContent.checkout.form.address.placeholder"
              >
            </div>
          </div>
        </div>

        <!-- Delivery Options -->
        <div
          v-if="form.wilaya && form.commune"
          class="space-y-6 mb-12"
        >
          <h2 class="font-street text-2xl uppercase border-b-4 border-black pb-2">
            {{ storefrontContent.checkout.sections.deliveryMethod }}
          </h2>
                
          <div class="space-y-4">
            <div
              v-for="option in deliveryOptions"
              :key="option.id"
              class="border-2 border-black p-4 cursor-pointer transition-all"
              :class="form.selectedDeliveryOption === option.id 
                ? 'bg-brand shadow-[4px_4px_0_0_#000]' 
                : 'bg-white hover:bg-gray-50'"
              @click="form.selectedDeliveryOption = option.id"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 border-2 border-black flex items-center justify-center bg-white">
                    <CarrierMark
                      :provider="option.provider"
                      :icon="option.icon"
                      :alt="option.providerLabel"
                      class="w-6 h-6"
                    />
                  </div>
                  <div>
                    <h3 class="font-street text-xl uppercase">
                      {{ option.providerLabel }}
                    </h3>
                    <p class="font-mono text-xs uppercase text-gray-600">
                      {{ option.modeLabel }}
                    </p>
                  </div>
                </div>
                <div class="text-end">
                  <span class="font-mono font-bold">
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
          class="space-y-6 mb-12"
        >
          <h2 class="font-street text-2xl uppercase border-b-4 border-black pb-2">
            {{ storefrontContent.checkout.sections.deliveryMethod }}
          </h2>
          <div class="border-2 border-black p-4 bg-white text-center font-mono text-sm text-gray-500">
            <Icon
              name="lucide:map-pin"
              class="w-5 h-5 mx-auto mb-2 text-gray-400"
            />
            {{ storefrontContent.checkout.help.deliveryOptions }}
          </div>
        </div>

        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="mb-6 p-4 border-4 border-black bg-red-100 font-mono text-sm uppercase text-red-700"
        >
          {{ errorMessage }}
        </div>

        <div class="pt-8 border-t-4 border-black flex justify-between items-center">
          <NuxtLink
            to="/cart"
            class="font-mono text-sm underline hover:bg-black hover:text-white px-1"
          >
            {{ storefrontContent.checkout.actions.returnToCart }}
          </NuxtLink>
          <button
            type="button"
            :disabled="submitting || !cartEnabled || !hasRequiredFields"
            class="bg-brand border-2 border-black px-8 py-3 font-street text-xl uppercase shadow-[4px_4px_0_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            @click="handleSubmit"
          >
            <Icon
              v-if="submitting"
              name="lucide:loader-2"
              class="w-6 h-6 animate-spin"
            />
            <span>{{ submitting ? storefrontContent.checkout.actions.placingOrder : storefrontContent.checkout.actions.placeOrder }}</span>
          </button>
        </div>
      </div>

      <!-- Right: Summary -->
      <div class="bg-gray-100 p-8 lg:p-16 border-t-4 lg:border-t-0 border-black">
        <div class="max-w-md mx-auto sticky top-24">
          <h2 class="font-street text-3xl uppercase border-b-4 border-black pb-4 mb-8">
            {{ storefrontContent.checkout.sections.orderSummary }}
          </h2>

          <div class="space-y-6 mb-8">
            <div
              v-for="item in cartStore.items"
              :key="item.variantId || item.productId"
              class="flex gap-4 relative"
            >
              <div class="w-16 h-16 border-2 border-black bg-white rounded-none relative overflow-hidden">
                <img
                  v-if="item.image"
                  :src="item.image"
                  :alt="item.title"
                  class="w-full h-full object-cover"
                >
                <span class="absolute -top-2 -end-2 bg-black text-white w-6 h-6 flex items-center justify-center font-mono text-xs font-bold rounded-full border border-white">
                  {{ item.quantity }}
                </span>
              </div>
              <div class="flex-grow">
                <h4 class="font-street uppercase text-lg">
                  {{ item.title }}
                </h4>
                <p
                  v-if="item.variantId"
                  class="font-mono text-xs text-gray-500"
                >
                  {{ item.variantId.slice(0,8) }}
                </p>
              </div>
              <div class="font-mono font-bold">
                {{ formatCurrency(item.lineTotal ?? (item.price * item.quantity)) }}
              </div>
            </div>
          </div>

          <!-- Coupon -->
          <div class="mb-8 p-4 border-2 border-black bg-white">
            <label class="block font-street text-lg uppercase mb-2">{{ storefrontContent.checkout.coupon.title }}</label>
            <div class="flex gap-2">
              <input
                v-model="couponCode"
                type="text"
                :placeholder="storefrontContent.checkout.coupon.placeholder"
                class="flex-1 bg-gray-100 border-2 border-black p-2 font-mono text-sm uppercase focus:shadow-[2px_2px_0_0_var(--brand)] outline-none"
              >
              <button class="px-4 py-2 bg-black text-white font-mono text-sm uppercase hover:bg-brand hover:text-black transition-colors">
                {{ storefrontContent.actions.apply }}
              </button>
            </div>
          </div>
                
          <div class="border-t-4 border-black pt-8 space-y-4 font-mono uppercase">
            <div
              v-if="selectedDelivery"
              class="flex justify-between text-gray-500 text-sm"
            >
              <span>{{ storefrontContent.checkout.summary.deliveryOption }}</span>
              <span>{{ selectedDelivery.providerLabel }} - {{ selectedDelivery.modeLabel }}</span>
            </div>
            <div class="flex justify-between text-gray-500">
              <span>{{ storefrontContent.cart.summary.subtotal }}</span>
              <span>{{ formatCurrency(cartStore.total) }}</span>
            </div>
            <div
              v-if="cartStore.clearanceDiscount > 0"
              class="flex justify-between text-amber-700 font-bold"
            >
              <span>{{ t('storefront.clearance.discountLine') }}</span>
              <span>-{{ formatCurrency(cartStore.clearanceDiscount) }}</span>
            </div>
            <div
              v-if="selectedDelivery"
              class="flex justify-between text-gray-500"
            >
              <span>{{ storefrontContent.cart.summary.shipping }}</span>
              <span>{{ selectedDelivery.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${selectedDelivery.price} ${currencyCode}` }}</span>
            </div>
            <div class="flex justify-between text-xl font-bold pt-4 text-black border-t-2 border-gray-300">
              <span>{{ storefrontContent.cart.summary.total }}</span>
              <span>{{ formatCurrency(grandTotal) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
