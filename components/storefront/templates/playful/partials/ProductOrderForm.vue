<script setup lang="ts">
import CarrierMark from '~/components/storefront/shared/CarrierMark.vue'
import { useCartStore } from '~/stores/cart'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'
import { DZ_WILAYAS } from '~/shared/geo/dz'
import { buildScopedProductPricing } from '~/shared/pricing/product-pricing'
import { computeClearanceDiscount } from '~/shared/pricing/clearance-pricing'
import { moneyToCents, centsToMoney } from '~/shared/pricing/bundle-pricing'

const props = defineProps<{
    product: any
    currentVariant: any
    currentPrice: number
    currentStock: number
    activeImage: string
}>()

const router = useRouter()
const cartStore = useCartStore()
const storefrontContent = useStorefrontContent()
const { t } = useI18n({ useScope: 'global' })
const storeSettings = useState<any>('storeSettings')
const metaPixel = useMetaPixel()
const { currencyCode, formatAmount } = useCurrency()
const codEnabled = computed(() => storeSettings.value?.codEnabled !== false && storeSettings.value?.cartEnabled !== false)
const cartEnabled = computed(() => storeSettings.value?.cartEnabled !== false)
const wilayas = DZ_WILAYAS
const hideOptionalAddress = computed(() => storeSettings.value?.hideOptionalAddress !== false)

const orderSubmitting = ref(false)
const addToCartSubmitting = ref(false)
const showSuccess = ref(false)
const successTitle = ref('')
const successMessage = ref('')
const orderError = ref('')
const quantity = ref(1)
const LOW_STOCK_THRESHOLD = 5

const subtotal = computed(() => (props.currentPrice || 0) * quantity.value)

const deliveryFee = computed(() => {
    if (!selectedDelivery.value) return 0
    const p = selectedDelivery.value.price
    if (!p || p === 'FREE' || p === '—') return 0
    return Number(p) || 0
})

const quickOrderClearanceDiscount = computed(() => {
    if (!clearance.isProductEligible(props.product)) return 0
    const scopedPricing = buildScopedProductPricing(props.product, props.currentVariant)
    if (scopedPricing.promotionApplied) return 0
    if (Array.isArray(props.product?.bundleDeals) && props.product.bundleDeals.length > 0) return 0

    const result = computeClearanceDiscount({
        lines: [{ key: 'quick-order', unitPriceCents: moneyToCents(props.currentPrice || 0), quantity: quantity.value }],
        multiple: clearance.config.value.multiple,
        divisor: clearance.config.value.divisor
    })
    return centsToMoney(result.discountCents)
})

const totalPrice = computed(() => Math.max(0, subtotal.value - quickOrderClearanceDiscount.value) + deliveryFee.value)

const hasVariants = computed(() => Array.isArray(props.product?.variants) && props.product.variants.length > 0)

const maxQuantity = computed(() => {
    if (props.currentVariant?.trackInventory === false) return 99
    const stock = Number(props.currentStock ?? 0)
    return Math.max(0, stock)
})

const isInStock = computed(() => {
    if (props.product?.isActive === false) return false
    if (hasVariants.value && !props.currentVariant) return false
    if (props.currentVariant?.trackInventory === false) return true
    return maxQuantity.value > 0
})

const isOutOfStock = computed(() => !isInStock.value)

const isLowStock = computed(() => {
    if (!isInStock.value) return false
    if (props.currentVariant?.trackInventory === false) return false
    return maxQuantity.value > 0 && maxQuantity.value <= LOW_STOCK_THRESHOLD
})

const canPurchase = computed(() => isInStock.value)
const cartStockCap = computed(() => (props.currentVariant?.trackInventory === false ? 9999 : maxQuantity.value))

const incrementQuantity = () => {
    if (!canPurchase.value) return
    if (maxQuantity.value > 0 && quantity.value >= maxQuantity.value) return
    quantity.value++
}

const decrementQuantity = () => {
    if (!canPurchase.value) return
    if (quantity.value > 1) quantity.value--
}

const selectBundleQty = (qty: number) => {
    if (!canPurchase.value) return
    const cap = maxQuantity.value > 0 ? maxQuantity.value : qty
    quantity.value = Math.max(1, Math.min(qty, cap))
}

const clearance = useClearanceDiscount()
const isClearanceEligible = computed(() => clearance.isProductEligible(props.product))

const quickForm = reactive({
    fullName: '',
    phone: '',
    wilaya: '',
    commune: '',
    address: '',
    pickupPoint: '',
    selectedDeliveryOption: ''
})

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

const maystroPrices = useDeliveryPrices({
  wilayaCode: () => quickForm.wilaya,
  communeCode: () => quickForm.commune
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

const selectedDelivery = computed(() =>
  deliveryOptions.value.find((opt: any) => opt.id === quickForm.selectedDeliveryOption)
)

const pickup = usePickupPoints({
  provider: () => selectedDelivery.value?.provider,
  mode: () => selectedDelivery.value?.mode,
  wilaya: () => quickForm.wilaya,
  commune: () => quickForm.commune,
  selected: () => quickForm.pickupPoint,
  onSelect: (name) => { quickForm.pickupPoint = name },
  onCommuneChange: (communeName) => { quickForm.commune = communeName }
})

const isPickupSelected = pickup.isPickupSelected
const pickupPoints = pickup.points
const pickupPointsLoading = pickup.loading
const pickupPointsError = pickup.error
const syncPickupPointCommune = pickup.syncCommune

onMounted(() => cartStore.loadFromLocalStorage())

watch(() => props.currentVariant, () => { quantity.value = 1 })

watch([() => props.currentStock, () => props.currentVariant], () => {
    if (!canPurchase.value) { quantity.value = 1; return }
    if (maxQuantity.value > 0 && quantity.value > maxQuantity.value) quantity.value = Math.max(1, maxQuantity.value)
})

function getVariantTitle(variant: any) {
    if (!variant.optionValues || variant.optionValues.length === 0) return ''
    const values = [...variant.optionValues]
    if (props.product.options && props.product.options.length > 0) {
       const optionPos = new Map(props.product.options.map((o: any) => [o.id, o.position]))
       values.sort((a: any, b: any) => ((optionPos.get(a.optionValue?.optionId) ?? 999) as number) - ((optionPos.get(b.optionValue?.optionId) ?? 999) as number))
    }
    return values.map((ov: any) => ov.optionValue?.label).join(' / ')
}

const triggerSuccessToast = (title: string, message: string) => {
    successTitle.value = title
    successMessage.value = message
    showSuccess.value = true
    setTimeout(() => { showSuccess.value = false }, 3000)
}

const handleOrderSubmit = async () => {
    if (!props.product) return
    orderError.value = ''
    if (!canPurchase.value) { orderError.value = storefrontContent.value.productForm.errors.outOfStockVariant; return }
    if (codEnabled.value && !quickForm.fullName.trim()) { orderError.value = storefrontContent.value.checkout.errors.fullNameRequired; return }
    if (codEnabled.value && !quickForm.phone.trim()) { orderError.value = storefrontContent.value.checkout.errors.phoneRequired; return }
    if (codEnabled.value && (!quickForm.wilaya || !quickForm.commune)) {
        orderError.value = storefrontContent.value.checkout.errors.requiredFields || storefrontContent.value.checkout.errors.deliveryRequired
        return
    }
    if (codEnabled.value && !quickForm.selectedDeliveryOption) { orderError.value = storefrontContent.value.checkout.errors.deliveryRequired; return }

    orderSubmitting.value = true
    try {
        const delivery = selectedDelivery.value
        const isMaystro = delivery?.provider === 'MAYSTRO'
        const maystroServiceLevel = delivery?.mode === 'pickup' ? 'office' : 'home'
        const providerPrices = delivery?.provider ? maystroPrices.pricesByProvider.value?.[delivery.provider] : undefined
        const maystroShippingAmount = providerPrices
            ? (maystroServiceLevel === 'office' ? providerPrices.office : providerPrices.home)
            : null

        if (isMaystro) {
          if (!quickForm.wilaya || !quickForm.commune) { orderError.value = storefrontContent.value.checkout.errors.deliveryRequired; orderSubmitting.value = false; return }
          if (delivery?.mode === 'pickup' && !String(quickForm.pickupPoint || '').trim() ) { orderError.value = storefrontContent.value.checkout.errors.deliveryRequired; orderSubmitting.value = false; return }
          if (maystroShippingAmount == null) { orderError.value = 'Maystro shipping price unavailable for selected commune'; orderSubmitting.value = false; return }
        }

        const payload = {
            customerName: quickForm.fullName.trim(),
            customerPhone: quickForm.phone.trim(),
            customerAddress: hideOptionalAddress.value ? undefined : (quickForm.address?.trim() || undefined),
            shippingAddressLine1: hideOptionalAddress.value ? undefined : (quickForm.address?.trim() || undefined),
            shippingWilayaCode: quickForm.wilaya || undefined,
            shippingCommuneCode: quickForm.commune || undefined,
            deliveryMode: delivery?.mode,
            shippingProvider: delivery?.provider || undefined,
            shippingPickupPoint: delivery?.provider && delivery?.mode === 'pickup' ? (quickForm.pickupPoint || undefined) : undefined,
            shippingServiceLevel: delivery?.provider ? maystroServiceLevel : undefined,
            shippingAmount: maystroShippingAmount != null ? maystroShippingAmount : undefined,
            shippingCurrency: delivery?.provider ? currencyCode.value : undefined,
            items: [{ productId: props.product.id, variantId: props.currentVariant?.id, quantity: quantity.value }]
        }

        const currency = storeSettings.value?.currencyCode || 'DZD'
        metaPixel.initiateCheckout({
            contents: [{ id: props.product.id, quantity: quantity.value, item_price: Number(props.currentPrice || 0) }],
            numItems: quantity.value,
            value: totalPrice.value,
            currency,
            pixelIds: (props.product as any)?.metaPixelIds
        })

        const response = await $fetch<{ orderId: string }>(useTenantApiUrl('/api/orders'), {
            method: 'POST',
            body: payload,
            headers: { ...(useTenantApiHeaders() || {}) }
        })

        triggerSuccessToast(storefrontContent.value.toasts.orderReceived.title, storefrontContent.value.toasts.orderReceived.message)
        cartStore.clearCart()
        quickForm.fullName = ''
        quickForm.phone = ''
        quickForm.wilaya = ''
        quickForm.commune = ''
        quickForm.address = ''

        router.push({ path: '/order-success', query: { orderId: response.orderId } })
    } catch (error: any) {
        orderError.value = error?.data?.statusMessage || error?.data?.message || storefrontContent.value.checkout.errors.submitFailed
    } finally {
        orderSubmitting.value = false
    }
}

const handleAddToCart = async () => {
    if (!props.product) return
    if (!canPurchase.value) {
        triggerSuccessToast(storefrontContent.value.actions.outOfStock, storefrontContent.value.toasts.outOfStock.message)
        return
    }
    addToCartSubmitting.value = true
    const variantLabel = props.currentVariant ? getVariantTitle(props.currentVariant) : ''
    const scopedPricing = buildScopedProductPricing(props.product, props.currentVariant)
    cartStore.addItem({
        productId: props.product.id,
        variantId: props.currentVariant?.id,
        title: props.product.title + (variantLabel ? ` (${variantLabel})` : ''),
        slug: props.product.slug,
        price: props.currentPrice,
        bundleDeals: props.product?.bundleDeals || [],
        stock: cartStockCap.value,
        image: props.activeImage,
        quantity: quantity.value,
        metaPixelIds: (props.product as any)?.metaPixelIds,
        isClearance: Boolean(props.product?.isClearance),
        promotionApplied: scopedPricing.promotionApplied
    })
    triggerSuccessToast(storefrontContent.value.toasts.addedToCart.title, storefrontContent.value.toasts.addedToCart.message)
    addToCartSubmitting.value = false
}

const mainOrderFormRef = ref<HTMLElement | null>(null)
const showStickyBar = ref(false)

onMounted(() => {
    cartStore.loadFromLocalStorage()
    const observer = new IntersectionObserver((entries) => {
        showStickyBar.value = !entries[0].isIntersecting
    }, { root: null, threshold: 0.1, rootMargin: '0px 0px -20% 0px' })
    if (mainOrderFormRef.value) observer.observe(mainOrderFormRef.value)
    onUnmounted(() => { if (mainOrderFormRef.value) observer.unobserve(mainOrderFormRef.value); observer.disconnect() })
})

const scrollToForm = () => {
    if (mainOrderFormRef.value) {
        const y = mainOrderFormRef.value.getBoundingClientRect().top + window.scrollY - 20
        window.scrollTo({ top: y, behavior: 'smooth' })
        setTimeout(() => {
            if (codEnabled.value && quickForm.fullName === '') {
                const firstInput = document.querySelector('input[type="text"]') as HTMLElement
                if (firstInput) firstInput.focus()
            }
        }, 500)
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }
}
</script>

<template>
  <div style="font-family: 'DM Sans', sans-serif">
    <!-- Quantity + Stock -->
    <div class="flex items-center justify-between p-4 bg-white rounded-3xl border-3 border-violet-100 shadow-[0_3px_0_0_#ddd6fe] mb-5">
      <div class="flex flex-col gap-0.5">
        <span
          class="font-black text-stone-700 text-sm"
          style="font-family: 'Fredoka', sans-serif"
        >{{ storefrontContent.productForm.quantity.label }}</span>
        <span
          v-if="product?.isActive === false"
          class="text-xs font-bold text-stone-500"
        >{{ storefrontContent.productForm.stock.unavailable }}</span>
        <span
          v-else-if="isOutOfStock"
          class="text-xs font-bold text-red-600"
        >{{ storefrontContent.productForm.stock.outOfStock }}</span>
        <span
          v-else-if="isLowStock"
          class="text-xs font-bold text-amber-600"
        >{{ storefrontContent.productForm.stock.lowStock(maxQuantity) }}</span>
        <span
          v-else
          class="text-xs font-bold text-emerald-600"
        >{{ storefrontContent.product.inStock }}</span>
      </div>
      <!-- Qty stamp buttons -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="w-10 h-10 rounded-full bg-violet-50 border-3 border-violet-100 flex items-center justify-center text-violet-700 font-black shadow-[0_3px_0_0_#ddd6fe] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
          :disabled="!canPurchase || quantity <= 1"
          @click="decrementQuantity"
        >
          <Icon
            name="lucide:minus"
            class="w-4 h-4 stroke-[2.5]"
          />
        </button>
        <span class="w-12 text-center font-black text-stone-900 text-lg">{{ quantity }}</span>
        <button
          type="button"
          class="w-10 h-10 rounded-full bg-amber-400 border-3 border-amber-300 flex items-center justify-center text-amber-900 font-black shadow-[0_3px_0_0_#d97706] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
          :disabled="!canPurchase || (maxQuantity > 0 && quantity >= maxQuantity)"
          @click="incrementQuantity"
        >
          <Icon
            name="lucide:plus"
            class="w-4 h-4 stroke-[2.5]"
          />
        </button>
      </div>
    </div>

    <BundleDealsPicker
      :bundle-deals="product?.bundleDeals || []"
      :unit-price="currentPrice"
      :max-quantity="maxQuantity"
      :disabled="!canPurchase"
      @select-qty="selectBundleQty"
    />

    <div
      v-if="isClearanceEligible"
      class="flex items-center gap-2 px-4 py-3 mb-4 rounded-2xl border-3 border-amber-300 bg-amber-50 text-amber-800 text-xs font-black"
    >
      <Icon
        name="lucide:package-open"
        class="w-4 h-4 flex-shrink-0"
      />
      <span v-if="clearance.remainingForNextThreshold.value > 0">
        {{ t('storefront.clearance.progressHint', { remaining: clearance.remainingForNextThreshold.value }) }}
      </span>
      <span v-else>{{ t('storefront.clearance.unlockedHint') }}</span>
    </div>

    <!-- COD Order Form -->
    <div
      v-if="codEnabled"
      ref="mainOrderFormRef"
      data-test="cod-order-card"
      class="bg-white rounded-3xl border-3 border-violet-100 p-6 shadow-[0_4px_0_0_#ddd6fe] relative overflow-hidden mb-4"
    >
      <!-- Top accent stripe -->
      <div class="absolute top-0 start-0 end-0 h-1.5 bg-gradient-to-r from-violet-500 via-pink-400 to-amber-400 rounded-t-3xl" />

      <div class="flex items-center gap-3 mb-6 mt-1">
        <div class="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 flex-shrink-0">
          <Icon
            name="lucide:banknote"
            class="w-5 h-5"
          />
        </div>
        <div>
          <h3
            class="font-black text-stone-900 text-lg leading-none"
            style="font-family: 'Fredoka', sans-serif"
          >
            {{ storefrontContent.productForm.cod.title }}
          </h3>
          <span class="text-xs text-stone-500 font-medium">{{ storefrontContent.productForm.cod.badge }}</span>
        </div>
      </div>

      <form
        class="space-y-4"
        @submit.prevent="handleOrderSubmit"
      >
        <!-- Name -->
        <div>
          <label
            class="block text-sm font-black text-stone-700 mb-1.5 ms-1"
            style="font-family: 'Fredoka', sans-serif"
          >
            {{ storefrontContent.checkout.form.fullName.label }}
          </label>
          <input
            v-model="quickForm.fullName"
            type="text"
            :placeholder="storefrontContent.checkout.form.fullName.placeholder"
            class="block w-full h-11 rounded-2xl border-3 border-violet-100 bg-white px-4 text-stone-900 placeholder:text-stone-400 focus:border-violet-400 focus:outline-none transition-colors shadow-sm"
          >
        </div>

        <!-- Phone -->
        <div>
          <label
            class="block text-sm font-black text-stone-700 mb-1.5 ms-1"
            style="font-family: 'Fredoka', sans-serif"
          >
            {{ storefrontContent.checkout.form.phone.label }}
          </label>
          <input
            v-model="quickForm.phone"
            type="tel"
            :placeholder="storefrontContent.checkout.form.phone.placeholder"
            class="block w-full h-11 rounded-2xl border-3 border-violet-100 bg-white px-4 text-stone-900 placeholder:text-stone-400 focus:border-violet-400 focus:outline-none transition-colors shadow-sm"
          >
        </div>

        <!-- Wilaya + Commune -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label
              class="block text-sm font-black text-stone-700 mb-1.5 ms-1"
              style="font-family: 'Fredoka', sans-serif"
            >
              {{ storefrontContent.checkout.form.wilaya.label }}
            </label>
            <WilayaField
              v-model="quickForm.wilaya"
              input-class="block w-full h-11 rounded-2xl border-3 border-violet-100 bg-white px-4 text-stone-900 focus:border-violet-400 focus:outline-none appearance-none cursor-pointer transition-colors shadow-sm"
              :placeholder="storefrontContent.checkout.form.wilaya.placeholder"
            />
          </div>
          <div>
            <label
              class="block text-sm font-black text-stone-700 mb-1.5 ms-1"
              style="font-family: 'Fredoka', sans-serif"
            >
              {{ storefrontContent.checkout.form.commune.label }}
            </label>
            <CommuneField
              v-model="quickForm.commune"
              :wilaya-code="quickForm.wilaya"
              :placeholder="storefrontContent.checkout.form.commune.placeholder"
              :input-class="'block w-full h-11 rounded-2xl border-3 border-violet-100 bg-white px-4 text-stone-900 placeholder:text-stone-400 focus:border-violet-400 focus:outline-none transition-colors shadow-sm'"
              :select-class="'block w-full h-11 rounded-2xl border-3 border-violet-100 bg-white px-4 text-stone-900 focus:border-violet-400 focus:outline-none transition-colors shadow-sm'"
            />
          </div>
        </div>

        <!-- Address -->
        <div v-if="!hideOptionalAddress">
          <label
            class="block text-sm font-black text-stone-700 mb-1.5 ms-1"
            style="font-family: 'Fredoka', sans-serif"
          >
            {{ storefrontContent.checkout.form.address.label }}
          </label>
          <input
            v-model="quickForm.address"
            type="text"
            :placeholder="storefrontContent.checkout.form.address.placeholder"
            class="block w-full h-11 rounded-2xl border-3 border-violet-100 bg-white px-4 text-stone-900 placeholder:text-stone-400 focus:border-violet-400 focus:outline-none transition-colors shadow-sm"
          >
        </div>

        <!-- Delivery Options -->
        <div
          v-if="quickForm.wilaya && quickForm.commune"
          class="space-y-2 mt-2"
        >
          <label
            class="block text-sm font-black text-stone-700 mb-2"
            style="font-family: 'Fredoka', sans-serif"
          >
            {{ storefrontContent.checkout.sections.deliveryOptions }}
          </label>
          <div
            v-for="option in deliveryOptions"
            :key="option.id"
            class="cursor-pointer rounded-2xl p-3.5 border-3 transition-all duration-200 flex items-center gap-3"
            :class="quickForm.selectedDeliveryOption === option.id
              ? 'border-violet-500 bg-violet-50 shadow-[0_3px_0_0_#8b5cf6]'
              : 'border-violet-100 hover:border-violet-300'"
            @click="quickForm.selectedDeliveryOption = option.id"
          >
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
              :class="quickForm.selectedDeliveryOption === option.id ? 'bg-violet-100' : 'bg-stone-100'"
            >
              <CarrierMark
                :provider="option.provider"
                :icon="option.icon"
                :alt="option.providerLabel"
                class="w-5 h-5"
                :class="quickForm.selectedDeliveryOption === option.id ? 'text-violet-600' : 'text-stone-400'"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <span class="font-black text-stone-900 text-sm">{{ option.providerLabel }}</span>
                <span
                  class="text-[10px] font-black px-2 py-0.5 rounded-full"
                  :class="option.mode === 'home' ? 'bg-emerald-100 text-emerald-700' : option.mode === 'pickup' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'"
                >{{ option.modeLabel }}</span>
              </div>
              <p class="text-xs text-stone-500">
                {{ option.description }}
              </p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span class="font-black text-violet-700 text-sm">
                {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
              </span>
              <span
                class="w-4.5 h-4.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
                :class="quickForm.selectedDeliveryOption === option.id ? 'border-violet-600 bg-violet-600' : 'border-stone-300'"
              >
                <Icon
                  v-if="quickForm.selectedDeliveryOption === option.id"
                  name="lucide:check"
                  class="w-2.5 h-2.5 text-white"
                />
              </span>
            </div>
          </div>

          <!-- Pickup points -->
          <StorefrontSharedPickupPointField
            v-model="quickForm.pickupPoint"
            :points="pickupPoints"
            :loading="pickupPointsLoading"
            :error="pickupPointsError"
            :is-pickup-selected="isPickupSelected"
            :label="storefrontContent.checkout.delivery.mode.pickupPoint"
            :empty-label="storefrontContent.checkout.help.deliveryOptions"
            @change="syncPickupPointCommune"
          />
        </div>

        <div
          v-else
          class="mt-3 px-4 py-3 border-3 border-dashed border-violet-100 rounded-2xl text-center text-xs text-stone-400"
        >
          <Icon
            name="lucide:map-pin"
            class="w-4 h-4 mx-auto mb-1 text-stone-300"
          />
          {{ storefrontContent.checkout.help.deliveryOptions }}
        </div>

        <!-- Error -->
        <div
          v-if="orderError"
          class="p-3 rounded-xl border-3 border-red-200 bg-red-50 text-red-700 text-sm font-medium"
        >
          {{ orderError }}
        </div>

        <!-- Price Breakdown -->
        <div class="bg-violet-50 rounded-2xl border-3 border-violet-100 p-4 space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-stone-600 font-medium">{{ storefrontContent.checkout.summary.subtotal }}</span>
            <span class="font-black text-stone-900">{{ formatAmount(subtotal) }} {{ currencyCode }}</span>
          </div>
          <div
            v-if="quickOrderClearanceDiscount > 0"
            class="flex items-center justify-between text-sm"
          >
            <span class="text-amber-700 font-medium">{{ t('storefront.clearance.discountLine') }}</span>
            <span class="font-black text-amber-700">-{{ formatAmount(quickOrderClearanceDiscount) }} {{ currencyCode }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-stone-600 font-medium">{{ storefrontContent.checkout.summary.shipping }}</span>
            <span
              class="font-black"
              :class="deliveryFee === 0 ? 'text-emerald-600' : 'text-stone-900'"
            >
              {{ deliveryFee === 0 ? storefrontContent.checkout.delivery.free : `${formatAmount(deliveryFee)} ${currencyCode}` }}
            </span>
          </div>
          <div class="border-t-2 border-violet-200 pt-2 flex items-center justify-between">
            <span
              class="font-black text-stone-900"
              style="font-family: 'Fredoka', sans-serif"
            >{{ storefrontContent.checkout.summary.total }}</span>
            <span
              class="text-xl font-black text-violet-700"
              style="font-family: 'Fredoka', sans-serif"
            >
              {{ formatAmount(totalPrice) }} {{ currencyCode }}
            </span>
          </div>
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="orderSubmitting || !canPurchase"
          class="w-full h-14 bg-violet-700 text-white font-black text-lg rounded-full shadow-[0_6px_0_0_#4c1d95] hover:-translate-y-1 active:translate-y-2 active:shadow-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3 mt-2 relative overflow-hidden group"
          style="font-family: 'Fredoka', sans-serif"
        >
          <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shine z-0" />
          <span
            class="relative z-10 flex items-center gap-2"
            :class="{ 'opacity-0': orderSubmitting }"
          >
            {{ orderSubmitting ? storefrontContent.productForm.cod.submitting : storefrontContent.productForm.cod.submit }}
            <Icon
              name="lucide:arrow-right"
              class="w-5 h-5 group-hover:translate-x-1.5 transition-transform"
            />
          </span>
          <div
            v-if="orderSubmitting"
            class="absolute inset-0 flex items-center justify-center z-10"
          >
            <Icon
              name="lucide:loader-2"
              class="animate-spin h-6 w-6 text-white"
            />
          </div>
        </button>
      </form>
    </div>

    <!-- Add to Cart -->
    <div
      v-if="cartEnabled"
      class="mt-4"
    >
      <button
        type="button"
        :disabled="addToCartSubmitting || !canPurchase"
        class="w-full h-13 bg-amber-400 text-amber-900 font-black text-base rounded-full border-3 border-amber-300 shadow-[0_4px_0_0_#d97706] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        style="font-family: 'Fredoka', sans-serif; height: 3.25rem"
        @click="handleAddToCart"
      >
        <Icon
          name="lucide:shopping-bag"
          class="w-5 h-5 stroke-[2.5]"
        />
        {{ addToCartSubmitting ? storefrontContent.actions.adding : storefrontContent.actions.addToCart }}
      </button>
    </div>

    <!-- Trust badges -->
    <div class="mt-7 grid grid-cols-3 gap-2">
      <div class="flex flex-col items-center text-center gap-1.5 p-3 rounded-2xl bg-white border-3 border-violet-100">
        <div class="w-9 h-9 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
          <Icon
            name="lucide:truck"
            class="w-4.5 h-4.5"
          />
        </div>
        <span class="text-[10px] font-black text-stone-700 leading-tight">{{ $t('storefront.product.features.delivery') }}</span>
      </div>
      <div class="flex flex-col items-center text-center gap-1.5 p-3 rounded-2xl bg-white border-3 border-violet-100">
        <div class="w-9 h-9 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
          <Icon
            name="lucide:headset"
            class="w-4.5 h-4.5"
          />
        </div>
        <span class="text-[10px] font-black text-stone-700 leading-tight">{{ $t('storefront.product.features.support') }}</span>
      </div>
      <div class="flex flex-col items-center text-center gap-1.5 p-3 rounded-2xl bg-white border-3 border-violet-100">
        <div class="w-9 h-9 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
          <Icon
            name="lucide:shield-check"
            class="w-4.5 h-4.5"
          />
        </div>
        <span class="text-[10px] font-black text-stone-700 leading-tight">{{ $t('storefront.product.features.securePayment') }}</span>
      </div>
    </div>

    <!-- Success Toast -->
    <Transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSuccess"
        class="fixed bottom-4 end-4 z-50 bg-stone-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-stone-700/50"
      >
        <div class="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
          <Icon
            name="lucide:check"
            class="w-4 h-4"
          />
        </div>
        <div>
          <div class="font-black text-sm">
            {{ successTitle }}
          </div>
          <div class="text-xs text-stone-400">
            {{ successMessage }}
          </div>
        </div>
      </div>
    </Transition>

    <!-- Mobile Sticky Bar -->
    <Transition
      enter-active-class="transform transition ease-out duration-300"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transform transition ease-in duration-200"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div
        v-if="showStickyBar && codEnabled"
        class="fixed bottom-0 left-0 right-0 z-40 bg-[#fffbf0] border-t-3 border-violet-100 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] p-4 md:hidden flex items-center gap-4"
      >
        <div class="flex flex-col">
          <span class="text-xs text-stone-500 font-medium">Total</span>
          <span
            class="text-xl font-black text-violet-700 leading-none"
            style="font-family: 'Fredoka', sans-serif"
          >
            {{ formatAmount(totalPrice) }} {{ currencyCode }}
          </span>
        </div>
        <button
          type="button"
          :disabled="!canPurchase"
          class="flex-1 h-13 bg-violet-700 text-white font-black text-base rounded-full shadow-[0_4px_0_0_#4c1d95] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
          style="font-family: 'Fredoka', sans-serif; height: 3.25rem"
          @click="scrollToForm"
        >
          {{ storefrontContent.productForm.cod.submit }}
          <Icon
            name="lucide:arrow-right"
            class="w-5 h-5"
          />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.animate-attention {
  animation: attentionCaptivate 3s infinite cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes attentionCaptivate {
  0%, 100% { border-color: #ddd6fe; background-color: white; transform: scale(1); }
  50% { border-color: #7c3aed; background-color: #f5f3ff; transform: scale(1.01); }
}
</style>
