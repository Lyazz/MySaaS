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
const { invite } = useVariantSelectionInvite()
const needsVariantChoice = computed(() => hasVariants.value && !props.currentVariant)

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

const isOutOfStock = computed(() => !isInStock.value && !needsVariantChoice.value)

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

watch(() => props.currentVariant, () => { quantity.value = 1; orderError.value = '' })

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
    if (needsVariantChoice.value) { invite(); orderError.value = storefrontContent.value.productForm.errors.selectOptions; return }
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
    if (needsVariantChoice.value) { invite(); triggerSuccessToast(storefrontContent.value.productForm.errors.selectOptions, storefrontContent.value.productForm.chooseOptionsPrompt); return }
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
  <div>
    <!-- ══ Quantity ═══════════════════════════════════════════════════ -->
    <div class="kw-card flex items-center justify-between gap-4 p-4 mb-5">
      <div class="flex flex-col gap-0.5 min-w-0">
        <span class="kw-title text-sm">{{ storefrontContent.productForm.quantity.label }}</span>
        <span
          v-if="product?.isActive === false"
          class="text-xs font-bold text-[var(--kw-ink-soft)]"
        >{{ storefrontContent.productForm.stock.unavailable }}</span>
        <span
          v-else-if="needsVariantChoice"
          class="text-xs font-bold text-[var(--kw-ink-soft)]"
        >{{ storefrontContent.productForm.stock.selectOptions }}</span>
        <span
          v-else-if="isOutOfStock"
          class="text-xs font-bold text-red-600"
        >{{ storefrontContent.productForm.stock.outOfStock }}</span>
        <span
          v-else-if="isLowStock"
          class="text-xs font-bold text-[var(--kw-lemon-deep)]"
        >{{ storefrontContent.productForm.stock.lowStock(maxQuantity) }}</span>
        <span
          v-else
          class="text-xs font-bold text-[var(--kw-mint-deep)]"
        >{{ storefrontContent.product.inStock }}</span>
      </div>

      <div class="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          class="kw-icon-btn w-10 h-10 disabled:opacity-35 disabled:cursor-not-allowed"
          :disabled="!canPurchase || quantity <= 1"
          @click="decrementQuantity"
        >
          <Icon
            name="lucide:minus"
            class="w-4 h-4"
          />
        </button>
        <span class="kw-num w-11 text-center text-xl">{{ quantity }}</span>
        <button
          type="button"
          class="kw-btn w-10 h-10 !p-0 rounded-full"
          :disabled="!canPurchase || (maxQuantity > 0 && quantity >= maxQuantity)"
          @click="incrementQuantity"
        >
          <Icon
            name="lucide:plus"
            class="w-4 h-4"
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
      class="flex items-center gap-2.5 px-4 py-3 mb-4 rounded-[var(--kw-r)] text-xs font-extrabold text-[var(--kw-ink)]"
      style="background: var(--kw-lemon-soft)"
    >
      <Icon
        name="lucide:package-open"
        class="w-4 h-4 flex-shrink-0 text-[var(--kw-lemon-deep)]"
      />
      <span v-if="clearance.remainingForNextThreshold.value > 0">
        {{ t('storefront.clearance.progressHint', { remaining: clearance.remainingForNextThreshold.value }) }}
      </span>
      <span v-else>{{ t('storefront.clearance.unlockedHint') }}</span>
    </div>

    <!-- ══ Cash-on-delivery order form ════════════════════════════════ -->
    <div
      v-if="codEnabled"
      ref="mainOrderFormRef"
      data-test="cod-order-card"
      class="kw-card relative overflow-hidden p-6 md:p-7 mb-4"
    >
      <div
        class="absolute top-0 inset-x-0 h-1.5"
        style="background: linear-gradient(90deg, var(--kw-pink), var(--kw-lemon), var(--kw-mint), var(--kw-sky), var(--kw-lilac))"
      />

      <div class="flex items-center gap-3.5 mb-7 mt-2">
        <span
          class="w-11 h-11 kw-blob flex items-center justify-center flex-shrink-0"
          style="background: var(--kw-mint-soft)"
        >
          <Icon
            name="lucide:banknote"
            class="w-5 h-5 text-[var(--kw-mint-deep)]"
          />
        </span>
        <div class="min-w-0">
          <h3 class="kw-title text-lg leading-tight">
            {{ storefrontContent.productForm.cod.title }}
          </h3>
          <span class="text-xs font-bold text-[var(--kw-ink-soft)]">{{ storefrontContent.productForm.cod.badge }}</span>
        </div>
      </div>

      <form
        class="space-y-4"
        @submit.prevent="handleOrderSubmit"
      >
        <div>
          <label class="kw-label">{{ storefrontContent.checkout.form.fullName.label }}</label>
          <input
            v-model="quickForm.fullName"
            type="text"
            :placeholder="storefrontContent.checkout.form.fullName.placeholder"
            class="kw-field"
          >
        </div>

        <div>
          <label class="kw-label">{{ storefrontContent.checkout.form.phone.label }}</label>
          <input
            v-model="quickForm.phone"
            type="tel"
            :placeholder="storefrontContent.checkout.form.phone.placeholder"
            class="kw-field"
          >
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="kw-label">{{ storefrontContent.checkout.form.wilaya.label }}</label>
            <WilayaField
              v-model="quickForm.wilaya"
              input-class="kw-field appearance-none cursor-pointer"
              :placeholder="storefrontContent.checkout.form.wilaya.placeholder"
            />
          </div>
          <div>
            <label class="kw-label">{{ storefrontContent.checkout.form.commune.label }}</label>
            <CommuneField
              v-model="quickForm.commune"
              :wilaya-code="quickForm.wilaya"
              :placeholder="storefrontContent.checkout.form.commune.placeholder"
              input-class="kw-field"
              select-class="kw-field"
            />
          </div>
        </div>

        <div v-if="!hideOptionalAddress">
          <label class="kw-label">{{ storefrontContent.checkout.form.address.label }}</label>
          <input
            v-model="quickForm.address"
            type="text"
            :placeholder="storefrontContent.checkout.form.address.placeholder"
            class="kw-field"
          >
        </div>

        <!-- Delivery options -->
        <div
          v-if="quickForm.wilaya && quickForm.commune"
          class="space-y-2.5 pt-1"
        >
          <label class="kw-label">{{ storefrontContent.checkout.sections.deliveryOptions }}</label>
          <button
            v-for="option in deliveryOptions"
            :key="option.id"
            type="button"
            class="w-full text-start rounded-[var(--kw-r)] p-3.5 border-2 transition-all duration-300 flex items-center gap-3"
            :class="quickForm.selectedDeliveryOption === option.id
              ? 'border-[var(--kw-pink-deep)] bg-[var(--kw-pink-soft)]'
              : 'border-[var(--kw-line)] bg-white hover:border-[var(--kw-pink)]'"
            @click="quickForm.selectedDeliveryOption = option.id"
          >
            <span
              class="w-10 h-10 kw-blob flex items-center justify-center flex-shrink-0"
              :style="{ background: quickForm.selectedDeliveryOption === option.id ? 'var(--kw-surface)' : 'var(--kw-cream-2)' }"
            >
              <CarrierMark
                :provider="option.provider"
                :icon="option.icon"
                :alt="option.providerLabel"
                class="w-5 h-5"
                :class="quickForm.selectedDeliveryOption === option.id ? 'text-[var(--kw-pink-deep)]' : 'text-[var(--kw-ink-faint)]'"
              />
            </span>
            <span class="flex-1 min-w-0">
              <span class="flex items-center gap-2 mb-0.5">
                <span class="kw-title text-sm">{{ option.providerLabel }}</span>
                <span
                  class="kw-badge"
                  :class="option.mode === 'pickup' ? 'kw-badge-new' : 'kw-badge-low'"
                >{{ option.modeLabel }}</span>
              </span>
              <span class="block text-xs font-semibold text-[var(--kw-ink-soft)] line-clamp-2">{{ option.description }}</span>
            </span>
            <span class="flex items-center gap-2 flex-shrink-0">
              <span class="kw-num text-sm text-[var(--kw-pink-deep)]">
                {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
              </span>
              <span
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                :class="quickForm.selectedDeliveryOption === option.id
                  ? 'border-[var(--kw-pink-deep)] bg-[var(--kw-pink-deep)]'
                  : 'border-[var(--kw-line)]'"
              >
                <Icon
                  v-if="quickForm.selectedDeliveryOption === option.id"
                  name="lucide:check"
                  class="w-3 h-3 text-white"
                />
              </span>
            </span>
          </button>

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
          class="mt-3 px-4 py-4 rounded-[var(--kw-r)] border-2 border-dashed border-[var(--kw-line)] text-center text-xs font-bold text-[var(--kw-ink-faint)]"
        >
          <Icon
            name="lucide:map-pin"
            class="w-4 h-4 mx-auto mb-1.5"
          />
          {{ storefrontContent.checkout.help.deliveryOptions }}
        </div>

        <div
          v-if="orderError"
          class="px-4 py-3 rounded-[var(--kw-r)] bg-red-50 border-2 border-red-200 text-red-700 text-sm font-bold"
        >
          {{ orderError }}
        </div>

        <!-- Totals -->
        <div
          class="rounded-[var(--kw-r)] p-4 space-y-2.5"
          style="background: var(--kw-cream-2)"
        >
          <div class="flex items-center justify-between text-sm">
            <span class="font-bold text-[var(--kw-ink-soft)]">{{ storefrontContent.cart.summary.subtotal }}</span>
            <span class="kw-num">{{ formatAmount(subtotal) }} {{ currencyCode }}</span>
          </div>
          <div
            v-if="quickOrderClearanceDiscount > 0"
            class="flex items-center justify-between text-sm"
          >
            <span class="font-bold text-[var(--kw-lemon-deep)]">{{ t('storefront.clearance.discountLine') }}</span>
            <span class="kw-num text-[var(--kw-lemon-deep)]">-{{ formatAmount(quickOrderClearanceDiscount) }} {{ currencyCode }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="font-bold text-[var(--kw-ink-soft)]">{{ storefrontContent.cart.summary.shipping }}</span>
            <span
              class="kw-num"
              :class="deliveryFee === 0 ? 'text-[var(--kw-mint-deep)]' : ''"
            >
              {{ deliveryFee === 0 ? storefrontContent.checkout.delivery.free : `${formatAmount(deliveryFee)} ${currencyCode}` }}
            </span>
          </div>
          <div class="pt-2.5 border-t-2 border-dashed border-[var(--kw-line)] flex items-center justify-between">
            <span class="kw-title">{{ storefrontContent.cart.summary.total }}</span>
            <span class="kw-num text-2xl text-[var(--kw-pink-deep)]">{{ formatAmount(totalPrice) }} {{ currencyCode }}</span>
          </div>
        </div>

        <button
          type="submit"
          :disabled="orderSubmitting || (!canPurchase && !needsVariantChoice)"
          class="kw-btn kw-btn-lg w-full mt-1"
        >
          <Icon
            v-if="orderSubmitting"
            name="lucide:loader-2"
            class="w-5 h-5 animate-spin"
          />
          <span>{{ orderSubmitting ? storefrontContent.productForm.cod.submitting : storefrontContent.productForm.cod.submit }}</span>
          <Icon
            v-if="!orderSubmitting"
            name="lucide:arrow-right"
            class="w-5 h-5 rtl:rotate-180"
          />
        </button>
      </form>
    </div>

    <!-- ══ Add to cart ════════════════════════════════════════════════ -->
    <button
      v-if="cartEnabled"
      type="button"
      :disabled="addToCartSubmitting || (!canPurchase && !needsVariantChoice)"
      class="kw-btn kw-btn-ghost kw-btn-lg w-full mt-4"
      @click="handleAddToCart"
    >
      <Icon
        name="lucide:shopping-bag"
        class="w-5 h-5"
      />
      {{ addToCartSubmitting ? storefrontContent.actions.adding : storefrontContent.actions.addToCart }}
    </button>

    <!-- ══ Reassurance ════════════════════════════════════════════════ -->
    <div class="mt-7 grid grid-cols-3 gap-2.5">
      <div class="kw-card-flat flex flex-col items-center text-center gap-2 p-3.5">
        <span
          class="w-9 h-9 kw-blob flex items-center justify-center"
          style="background: var(--kw-sky-soft)"
        >
          <Icon
            name="lucide:truck"
            class="w-4 h-4 text-[var(--kw-sky-deep)]"
          />
        </span>
        <span class="text-[10px] font-extrabold leading-tight">{{ $t('storefront.product.features.delivery') }}</span>
      </div>
      <div class="kw-card-flat flex flex-col items-center text-center gap-2 p-3.5">
        <span
          class="w-9 h-9 kw-blob flex items-center justify-center"
          style="background: var(--kw-lemon-soft)"
        >
          <Icon
            name="lucide:headset"
            class="w-4 h-4 text-[var(--kw-lemon-deep)]"
          />
        </span>
        <span class="text-[10px] font-extrabold leading-tight">{{ $t('storefront.product.features.support') }}</span>
      </div>
      <div class="kw-card-flat flex flex-col items-center text-center gap-2 p-3.5">
        <span
          class="w-9 h-9 kw-blob flex items-center justify-center"
          style="background: var(--kw-mint-soft)"
        >
          <Icon
            name="lucide:shield-check"
            class="w-4 h-4 text-[var(--kw-mint-deep)]"
          />
        </span>
        <span class="text-[10px] font-extrabold leading-tight">{{ $t('storefront.product.features.securePayment') }}</span>
      </div>
    </div>

    <!-- ══ Toast ══════════════════════════════════════════════════════ -->
    <Transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSuccess"
        class="fixed bottom-4 end-4 z-50 bg-white px-5 py-3.5 rounded-[var(--kw-r)] shadow-xl flex items-center gap-3 border border-[var(--kw-line)]"
      >
        <span
          class="w-8 h-8 kw-blob flex items-center justify-center flex-shrink-0"
          style="background: var(--kw-mint)"
        >
          <Icon
            name="lucide:check"
            class="w-4 h-4 text-white"
          />
        </span>
        <div>
          <div class="kw-title text-sm">
            {{ successTitle }}
          </div>
          <div class="text-xs font-semibold text-[var(--kw-ink-soft)]">
            {{ successMessage }}
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ Mobile sticky bar ══════════════════════════════════════════ -->
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
        class="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[var(--kw-line)] p-3.5 md:hidden flex items-center gap-3.5"
        style="box-shadow: 0 -8px 24px -14px rgba(74,46,77,.5)"
      >
        <div class="flex flex-col min-w-0">
          <span class="text-[11px] font-bold text-[var(--kw-ink-soft)]">{{ storefrontContent.productForm.totalPrice }}</span>
          <span class="kw-num text-xl text-[var(--kw-pink-deep)] leading-none">{{ formatAmount(totalPrice) }} {{ currencyCode }}</span>
        </div>
        <button
          type="button"
          :disabled="!canPurchase"
          class="kw-btn flex-1"
          @click="scrollToForm"
        >
          {{ storefrontContent.productForm.cod.submit }}
          <Icon
            name="lucide:arrow-right"
            class="w-4 h-4 rtl:rotate-180"
          />
        </button>
      </div>
    </Transition>
  </div>
</template>
