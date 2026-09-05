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
const { currencyCode, format: formatCurrency } = useCurrency()
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

const rawSubtotal = computed(() => (props.currentPrice || 0) * quantity.value)

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

const totalPrice = computed(() => Math.max(0, rawSubtotal.value - quickOrderClearanceDiscount.value))
const hasVariants = computed(() => Array.isArray(props.product?.variants) && props.product.variants.length > 0)
const { invite } = useVariantSelectionInvite()
const needsVariantChoice = computed(() => hasVariants.value && !props.currentVariant)
const maxQuantity = computed(() => {
  if (props.currentVariant?.trackInventory === false) return 99
  return Math.max(0, Number(props.currentStock ?? 0))
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
    options.push({ id: `${provider.key}-home`, provider: provider.key, providerLabel: provider.label, mode: 'home', modeLabel: storefrontContent.value.checkout.delivery.mode.homeDelivery, icon: provider.icon, color: provider.color, price: homePrice, description: storefrontContent.value.checkout.delivery.description.homeDelivery })
    options.push({ id: `${provider.key}-pickup`, provider: provider.key, providerLabel: provider.label, mode: 'pickup', modeLabel: storefrontContent.value.checkout.delivery.mode.pickupPoint, icon: provider.icon, color: provider.color, price: officePrice, description: storefrontContent.value.checkout.delivery.description.pickupPoint })
  })
  if (storeSettings.value?.storePickupEnabled === true) {
    options.push({ id: 'store-pickup', provider: null, providerLabel: 'Store', mode: 'store', modeLabel: storefrontContent.value.checkout.delivery.mode.storePickup, icon: 'lucide:store', color: 'green', price: 'FREE', description: storefrontContent.value.checkout.delivery.description.storePickup })
  }
  return options
})

const selectedDelivery = computed(() => deliveryOptions.value.find((opt: any) => opt.id === quickForm.selectedDeliveryOption))
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

onMounted(() => { cartStore.loadFromLocalStorage() })
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
  successTitle.value = title; successMessage.value = message; showSuccess.value = true
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
    const maystroShippingAmount = providerPrices ? (maystroServiceLevel === 'office' ? providerPrices.office : providerPrices.home) : null
    if (isMaystro) {
      if (!quickForm.wilaya || !quickForm.commune) { orderError.value = storefrontContent.value.checkout.errors.deliveryRequired; orderSubmitting.value = false; return }
      if (delivery?.mode === 'pickup' && !String(quickForm.pickupPoint || '').trim() ) { orderError.value = storefrontContent.value.checkout.errors.deliveryRequired; orderSubmitting.value = false; return }
      if (maystroShippingAmount == null) { orderError.value = storefrontContent.value.checkout.errors.shippingUnavailable; orderSubmitting.value = false; return }
    }
    const payload = {
      customerName: quickForm.fullName.trim(), customerPhone: quickForm.phone.trim(),
      customerAddress: hideOptionalAddress.value ? undefined : (quickForm.address?.trim() || undefined), shippingAddressLine1: hideOptionalAddress.value ? undefined : (quickForm.address?.trim() || undefined),
      shippingWilayaCode: quickForm.wilaya || undefined, shippingCommuneCode: quickForm.commune || undefined,
      deliveryMode: delivery?.mode, shippingProvider: delivery?.provider || undefined,
      shippingPickupPoint: delivery?.provider && delivery?.mode === 'pickup' ? (quickForm.pickupPoint || undefined) : undefined,
      shippingServiceLevel: delivery?.provider ? maystroServiceLevel : undefined,
      shippingAmount: maystroShippingAmount != null ? maystroShippingAmount : undefined,
      shippingCurrency: delivery?.provider ? currencyCode.value : undefined,
      items: [{ productId: props.product.id, variantId: props.currentVariant?.id, quantity: quantity.value }]
    }
    const currency = storeSettings.value?.currencyCode || 'DZD'
    metaPixel.initiateCheckout({ contents: [{ id: props.product.id, quantity: quantity.value, item_price: Number(props.currentPrice || 0) }], numItems: quantity.value, value: totalPrice.value, currency, pixelIds: (props.product as any)?.metaPixelIds })
    const response = await $fetch<{ orderId: string }>(useTenantApiUrl('/api/orders'), { method: 'POST', body: payload, headers: { ...(useTenantApiHeaders() || {}) } })
    triggerSuccessToast(storefrontContent.value.toasts.orderReceived.title, storefrontContent.value.toasts.orderReceived.message)
    cartStore.clearCart()
    quickForm.fullName = ''; quickForm.phone = ''; quickForm.wilaya = ''; quickForm.commune = ''; quickForm.address = ''
    router.push({ path: '/order-success', query: { orderId: response.orderId } })
  } catch (error: any) {
    orderError.value = error?.data?.statusMessage || error?.data?.message || storefrontContent.value.checkout.errors.submitFailed
  } finally { orderSubmitting.value = false }
}

const handleAddToCart = async () => {
  if (!props.product) return
  if (needsVariantChoice.value) { invite(); triggerSuccessToast(storefrontContent.value.productForm.errors.selectOptions, storefrontContent.value.productForm.chooseOptionsPrompt); return }
  if (!canPurchase.value) { triggerSuccessToast(storefrontContent.value.actions.outOfStock, storefrontContent.value.toasts.outOfStock.message); return }
  addToCartSubmitting.value = true
  const variantLabel = props.currentVariant ? getVariantTitle(props.currentVariant) : ''
  const scopedPricing = buildScopedProductPricing(props.product, props.currentVariant)
  cartStore.addItem({ productId: props.product.id, variantId: props.currentVariant?.id, title: props.product.title + (variantLabel ? ` (${variantLabel})` : ''), slug: props.product.slug, price: props.currentPrice, bundleDeals: props.product?.bundleDeals || [], stock: cartStockCap.value, image: props.activeImage, quantity: quantity.value, metaPixelIds: (props.product as any)?.metaPixelIds, isClearance: Boolean(props.product?.isClearance), promotionApplied: scopedPricing.promotionApplied })
  triggerSuccessToast(storefrontContent.value.toasts.addedToCart.title, storefrontContent.value.toasts.addedToCart.message)
  addToCartSubmitting.value = false
}

/*
 * Mobile sticky buy bar — the same conversion aid modern has: once the COD card
 * has scrolled out of view the total and the order button follow the customer,
 * and tapping it brings them back to the form (and into its first field, not
 * the header search).
 */
const mainOrderFormRef = ref<HTMLElement | null>(null)
const showStickyBar = ref(false)

onMounted(() => {
    const observer = new IntersectionObserver((entries) => {
        showStickyBar.value = !entries[0].isIntersecting
    }, { root: null, threshold: 0.1, rootMargin: '0px 0px -20% 0px' })

    if (mainOrderFormRef.value) observer.observe(mainOrderFormRef.value)

    onUnmounted(() => {
        if (mainOrderFormRef.value) observer.unobserve(mainOrderFormRef.value)
        observer.disconnect()
    })
})

const stickyBarTotal = computed(() => {
    const price = selectedDelivery.value?.price
    const shipping = price && price !== 'FREE' && price !== '—' ? Number(price) : 0
    return totalPrice.value + (Number.isNaN(shipping) ? 0 : shipping)
})

const scrollToForm = () => {
    if (!mainOrderFormRef.value) return
    const y = mainOrderFormRef.value.getBoundingClientRect().top + window.scrollY - 20
    window.scrollTo({ top: y, behavior: 'smooth' })
    setTimeout(() => {
        if (!codEnabled.value || quickForm.fullName !== '') return
        const firstInput = mainOrderFormRef.value?.querySelector('input[type="text"]') as HTMLElement | null
        firstInput?.focus()
    }, 500)
}
</script>

<template>
  <div class="order-form">
    <!-- Qty + stock -->
    <div class="order-form__qty-row">
      <div class="order-form__stock">
        <span
          v-if="product?.isActive === false"
          class="order-form__stock-label is-unavailable"
        >{{ storefrontContent.productForm.stock.unavailable }}</span>
        <span
          v-else-if="needsVariantChoice"
          class="order-form__stock-label is-unavailable"
        >{{ storefrontContent.productForm.stock.selectOptions }}</span>
        <span
          v-else-if="isOutOfStock"
          class="order-form__stock-label is-oos"
        >{{ storefrontContent.productForm.stock.outOfStock }}</span>
        <span
          v-else-if="isLowStock"
          class="order-form__stock-label is-low"
        >{{ storefrontContent.productForm.stock.lowStock(maxQuantity) }}</span>
        <span
          v-else
          class="order-form__stock-label is-ok"
        >{{ storefrontContent.product.inStock }}</span>
        <span class="order-form__qty-heading">{{ storefrontContent.productForm.quantity.label }}</span>
      </div>
      <div class="order-form__qty-ctrl">
        <button
          type="button"
          class="order-form__qty-btn"
          :disabled="!canPurchase || quantity <= 1"
          @click="decrementQuantity"
        >
          <svg
            width="8"
            height="2"
            viewBox="0 0 8 2"
            fill="none"
          ><path
            d="M1 1h6"
            stroke="currentColor"
            stroke-width="0.85"
          /></svg>
        </button>
        <span class="order-form__qty-val">{{ quantity }}</span>
        <button
          type="button"
          class="order-form__qty-btn"
          :disabled="!canPurchase || (maxQuantity > 0 && quantity >= maxQuantity)"
          @click="incrementQuantity"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
          ><path
            d="M4 1v6M1 4h6"
            stroke="currentColor"
            stroke-width="0.85"
          /></svg>
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
      class="order-form__clearance"
    >
      <Icon
        name="lucide:package-open"
        style="width:14px;height:14px;flex-shrink:0"
      />
      <span v-if="clearance.remainingForNextThreshold.value > 0">
        {{ t('storefront.clearance.progressHint', { remaining: clearance.remainingForNextThreshold.value }) }}
      </span>
      <span v-else>{{ t('storefront.clearance.unlockedHint') }}</span>
    </div>

    <!-- COD form -->
    <div
      v-if="codEnabled"
      ref="mainOrderFormRef"
      class="order-form__cod"
      data-test="cod-order-card"
    >
      <div class="order-form__cod-head">
        <div class="order-form__cod-icon">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <rect
              x="1"
              y="3"
              width="12"
              height="8"
              stroke="currentColor"
              stroke-width="0.75"
            />
            <path
              d="M1 6h12"
              stroke="currentColor"
              stroke-width="0.75"
            />
            <path
              d="M4 9h3"
              stroke="currentColor"
              stroke-width="0.75"
            />
          </svg>
        </div>
        <div>
          <p class="order-form__cod-title">
            {{ storefrontContent.productForm.cod.title }}
          </p>
          <span class="order-form__cod-badge">{{ storefrontContent.productForm.cod.badge }}</span>
        </div>
      </div>

      <form
        class="order-form__fields"
        @submit.prevent="handleOrderSubmit"
      >
        <div class="order-form__field">
          <label class="order-form__label">{{ storefrontContent.checkout.form.fullName.label }}</label>
          <input
            v-model="quickForm.fullName"
            type="text"
            :placeholder="storefrontContent.checkout.form.fullName.placeholder"
            class="at-input"
          >
        </div>

        <div class="order-form__field">
          <label class="order-form__label">{{ storefrontContent.checkout.form.phone.label }}</label>
          <input
            v-model="quickForm.phone"
            type="tel"
            :placeholder="storefrontContent.checkout.form.phone.placeholder"
            class="at-input"
          >
        </div>

        <div class="order-form__grid2">
          <div class="order-form__field">
            <label class="order-form__label">{{ storefrontContent.checkout.form.wilaya.label }}</label>
            <div class="order-form__select-wrap">
              <WilayaField
                v-model="quickForm.wilaya"
                input-class="at-select"
                :placeholder="storefrontContent.checkout.form.wilaya.placeholder"
              />
              <svg
                width="8"
                height="5"
                viewBox="0 0 8 5"
                fill="none"
                class="order-form__select-arrow"
              >
                <path
                  d="M1 1l3 3 3-3"
                  stroke="currentColor"
                  stroke-width="0.85"
                />
              </svg>
            </div>
          </div>
          <div class="order-form__field">
            <label class="order-form__label">{{ storefrontContent.checkout.form.commune.label }}</label>
            <CommuneField
              v-model="quickForm.commune"
              :wilaya-code="quickForm.wilaya"
              :placeholder="storefrontContent.checkout.form.commune.placeholder"
              :input-class="'at-input'"
              :select-class="'at-select'"
            />
          </div>
        </div>

        <div
          v-if="!hideOptionalAddress"
          class="order-form__field"
        >
          <label class="order-form__label">{{ storefrontContent.checkout.form.address.label }}</label>
          <input
            v-model="quickForm.address"
            type="text"
            :placeholder="storefrontContent.checkout.form.address.placeholder"
            class="at-input"
          >
        </div>

        <div
          v-if="quickForm.wilaya && quickForm.commune"
          class="order-form__field"
        >
          <label class="order-form__label">{{ storefrontContent.checkout.sections.deliveryOptions }}</label>
          <div class="order-form__delivery-list">
            <div
              v-for="option in deliveryOptions"
              :key="option.id"
              class="order-form__delivery-opt"
              :class="quickForm.selectedDeliveryOption === option.id && 'is-selected'"
              @click="quickForm.selectedDeliveryOption = option.id"
            >
              <div class="order-form__delivery-left">
                <div class="order-form__delivery-icon-wrap">
                  <CarrierMark
                    :provider="option.provider"
                    :icon="option.icon"
                    :alt="option.providerLabel"
                    style="width:13px;height:13px"
                  />
                </div>
                <div>
                  <p class="order-form__delivery-name">
                    {{ option.providerLabel }}
                  </p>
                  <p class="order-form__delivery-mode">
                    {{ option.modeLabel }}
                  </p>
                </div>
              </div>
              <div class="order-form__delivery-right">
                <span class="order-form__delivery-price">
                  {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
                </span>
                <span
                  class="order-form__delivery-radio"
                  :class="quickForm.selectedDeliveryOption === option.id && 'is-checked'"
                />
              </div>
            </div>

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
        </div>
        <div
          v-else
          class="order-form__field order-form__delivery-hint"
        >
          <Icon
            name="lucide:map-pin"
            style="width:14px;height:14px;margin:0 auto 4px;display:block;color:var(--at-sub)"
          />
          {{ storefrontContent.checkout.help.deliveryOptions }}
        </div>

        <div
          v-if="orderError"
          class="order-form__error"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style="flex-shrink:0"
          >
            <circle
              cx="6"
              cy="6"
              r="5"
              stroke="currentColor"
              stroke-width="0.75"
            />
            <path
              d="M6 3v4M6 9v.5"
              stroke="currentColor"
              stroke-width="0.75"
            />
          </svg>
          {{ orderError }}
        </div>

        <div
          v-if="quickOrderClearanceDiscount > 0"
          style="display:flex; align-items:center; justify-content:space-between; padding: 6px 14px; font-family: var(--at-f-mono); font-size: 9px; letter-spacing: 0; text-transform: uppercase; color: var(--at-gold);"
        >
          <span>{{ t('storefront.clearance.discountLine') }}</span>
          <span>-{{ formatCurrency(quickOrderClearanceDiscount) }}</span>
        </div>

        <div class="order-form__total">
          <span class="order-form__total-label">{{ storefrontContent.productForm.totalPrice }}</span>
          <span class="order-form__total-price">
            {{ formatCurrency(totalPrice + (selectedDelivery?.price && selectedDelivery?.price !== 'FREE' && selectedDelivery?.price !== '—' ? Number(selectedDelivery.price) : 0)) }}
          </span>
        </div>

        <button
          type="submit"
          class="at-btn-solid"
          :disabled="orderSubmitting || (!canPurchase && !needsVariantChoice)"
        >
          <Icon
            v-if="orderSubmitting"
            name="lucide:loader-2"
            style="width:14px;height:14px"
          />
          {{ orderSubmitting ? storefrontContent.productForm.cod.submitting : storefrontContent.productForm.cod.submit }}
        </button>
      </form>
    </div>

    <div v-if="cartEnabled">
      <button
        type="button"
        class="at-btn-ghost"
        :disabled="addToCartSubmitting || (!canPurchase && !needsVariantChoice)"
        @click="handleAddToCart"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M2 2h1.5l2 8h7l1.5-5H4.5"
            stroke="currentColor"
            stroke-width="0.85"
          />
          <circle
            cx="7"
            cy="13"
            r="1"
            fill="currentColor"
          />
          <circle
            cx="12"
            cy="13"
            r="1"
            fill="currentColor"
          />
        </svg>
        {{ addToCartSubmitting ? storefrontContent.actions.adding : storefrontContent.actions.addToCart }}
      </button>
    </div>

    <Transition name="form-toast">
      <div
        v-if="showSuccess"
        class="order-form__toast"
      >
        <div class="order-form__toast-icon">
          <svg
            width="10"
            height="8"
            viewBox="0 0 10 8"
            fill="none"
          >
            <path
              d="M1 4l3 3 5-6"
              stroke="currentColor"
              stroke-width="1"
            />
          </svg>
        </div>
        <div>
          <div class="order-form__toast-title">
            {{ successTitle }}
          </div>
          <div class="order-form__toast-msg">
            {{ successMessage }}
          </div>
        </div>
      </div>
    </Transition>
    <!-- Mobile sticky buy bar -->
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
        class="order-form__sticky"
      >
        <div class="flex flex-col min-w-0">
          <span class="order-form__sticky-label">{{ storefrontContent.cart.summary.total }}</span>
          <span class="order-form__sticky-total">{{ formatCurrency(stickyBarTotal) }}</span>
        </div>
        <button
          type="button"
          :disabled="!canPurchase"
          class="order-form__sticky-btn"
          @click="scrollToForm"
        >
          {{ storefrontContent.productForm.cod.submit }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.order-form { display: flex; flex-direction: column; gap: 16px; }

.order-form__qty-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-md);
  background: var(--at-grad-paper);
  box-shadow: var(--at-shadow-xs);
}
.order-form__stock { display: flex; flex-direction: column; gap: 3px; }
.order-form__stock-label { font-family: var(--at-f-mono); font-size: 10px; font-weight: 400; letter-spacing: 0; }
.order-form__stock-label.is-ok { color: var(--at-success); }
.order-form__stock-label.is-low { color: var(--at-gold-700); }
.order-form__stock-label.is-oos { color: var(--at-skin); }
.order-form__stock-label.is-unavailable { color: var(--at-muted); }
.order-form__qty-heading { font-family: var(--at-f-mono); font-size: 9px; letter-spacing: 0; text-transform: uppercase; color: var(--at-muted); }

.order-form__qty-ctrl { display: flex; align-items: center; border: 1px solid var(--at-border-2); border-radius: var(--at-r-pill); background: var(--at-surface); overflow: hidden; }
.order-form__qty-btn { width: 32px; height: 32px; background: none; border: none; color: var(--at-sub); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: color 0.15s; }
.order-form__qty-btn:hover { color: var(--at-gold-700); background: var(--at-gold-dim); }
.order-form__qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.order-form__qty-val { min-width: 36px; text-align: center; font-family: var(--at-f-mono); font-size: 12px; color: var(--at-text); border-left: 1px solid var(--at-border-2); border-right: 1px solid var(--at-border-2); line-height: 32px; }

.order-form__clearance { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: 1px solid var(--at-skin-soft); border-radius: var(--at-r-sm); background: var(--at-skin-dim); font-family: var(--at-f-mono); font-size: 10px; font-weight: 500; color: var(--at-skin); }

.order-form__cod { border: 1px solid var(--at-border); border-radius: var(--at-r-md); background: var(--at-grad-paper); box-shadow: var(--at-shadow-sm); overflow: hidden; }
.order-form__cod-head { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--at-border); background: var(--at-grad-shell); }
.order-form__cod-icon { width: 34px; height: 34px; background: var(--at-grad-green); border-radius: var(--at-r-pill); display: flex; align-items: center; justify-content: center; color: #FFFBF0; flex-shrink: 0; box-shadow: var(--at-shadow-xs); }
.order-form__cod-title { font-family: var(--at-f-mono); font-size: 11px; color: var(--at-text); margin-bottom: 2px; }
.order-form__cod-badge { font-family: var(--at-f-mono); font-size: 8px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--at-gold-700); }

.order-form__fields { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.order-form__field { display: flex; flex-direction: column; gap: 6px; }
.order-form__label { font-family: var(--at-f-mono); font-size: 9px; letter-spacing: 0; text-transform: uppercase; color: var(--at-sub); }
.order-form__grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.order-form__select-wrap { position: relative; }
.order-form__select-arrow { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--at-muted); pointer-events: none; }

.order-form__delivery-list { display: flex; flex-direction: column; gap: 1px; background: var(--at-border); border: 1px solid var(--at-border); border-radius: var(--at-r-sm); overflow: hidden; }
.order-form__delivery-opt { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; background: var(--at-surface); cursor: pointer; transition: background 0.15s; }
.order-form__delivery-opt:hover { background: var(--at-surface-2); }
.order-form__delivery-opt.is-selected { background: var(--at-gold-dim); box-shadow: inset 2px 0 0 var(--at-gold); }
[dir='rtl'] .order-form__delivery-opt.is-selected { box-shadow: inset -2px 0 0 var(--at-gold); }
.order-form__delivery-left { display: flex; align-items: center; gap: 10px; }
.order-form__delivery-icon-wrap { width: 30px; height: 30px; background: var(--at-surface-2); border-radius: var(--at-r-pill); display: flex; align-items: center; justify-content: center; color: var(--at-sub); flex-shrink: 0; }
.order-form__delivery-name { font-family: var(--at-f-mono); font-size: 10px; color: var(--at-text); margin-bottom: 1px; }
.order-form__delivery-mode { font-family: var(--at-f-mono); font-size: 9px; color: var(--at-muted); letter-spacing: 0; }
.order-form__delivery-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.order-form__delivery-price { font-family: var(--at-f-mono); font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--at-cream); }
.order-form__delivery-radio { width: 14px; height: 14px; border: 1px solid var(--at-border-2); border-radius: 50%; flex-shrink: 0; transition: background 0.15s, border-color 0.15s, box-shadow 0.15s; }
.order-form__delivery-radio.is-checked { background: var(--at-cream); border-color: var(--at-cream); box-shadow: inset 0 0 0 3px var(--at-surface); }

.order-form__pickup { background: var(--at-surface-2); border-radius: var(--at-r-sm); padding: 10px 14px; }
.order-form__pickup-loading { display: flex; align-items: center; gap: 8px; font-family: var(--at-f-mono); font-size: 10px; color: var(--at-sub); }
.order-form__pickup-stopdesk { display: flex; align-items: center; gap: 8px; font-family: var(--at-f-mono); font-size: 10px; color: var(--at-sub); margin-bottom: 6px; }
.order-form__pickup-stopdesk svg { color: var(--at-sub); flex-shrink: 0; }
.order-form__pickup-name { display: flex; align-items: center; gap: 8px; font-family: var(--at-f-mono); font-size: 11px; color: var(--at-text); }
.order-form__pickup-name svg { color: var(--at-gold); flex-shrink: 0; }
.order-form__pickup-error { font-family: var(--at-f-mono); font-size: 10px; color: var(--at-error); margin-top: 6px; }

.order-form__error { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border: 1px solid var(--at-skin-soft); border-radius: var(--at-r-sm); background: var(--at-skin-dim); font-family: var(--at-f-mono); font-size: 10px; color: var(--at-skin); }

.order-form__total { display: flex; align-items: baseline; justify-content: space-between; padding: 14px 16px; background: var(--at-grad-shell); border: 1px solid var(--at-border); border-radius: var(--at-r-md); box-shadow: var(--at-shadow-xs); }
.order-form__total-label { font-family: var(--at-f-mono); font-size: 9px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--at-sub); }
.order-form__total-price { font-family: var(--at-f-display); font-size: 1.7rem; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; color: var(--at-cream); }

.order-form__toast { position: fixed; bottom: 20px; right: 20px; z-index: 100; background: var(--at-grad-paper); border: 1px solid var(--at-border); border-radius: var(--at-r-md); box-shadow: var(--at-shadow-lg); padding: 14px 18px; display: flex; align-items: center; gap: 12px; }
.order-form__toast-icon { width: 28px; height: 28px; background: var(--at-grad-green); border-radius: var(--at-r-pill); display: flex; align-items: center; justify-content: center; color: #FFFBF0; flex-shrink: 0; }
.order-form__toast-title { font-family: var(--at-f-mono); font-size: 11px; font-weight: 400; color: var(--at-text); }
.order-form__toast-msg { font-family: var(--at-f-mono); font-size: 10px; font-weight: 300; color: var(--at-sub); margin-top: 2px; }

.form-toast-enter-active { transition: opacity 0.3s, transform 0.3s; }
.form-toast-leave-active { transition: opacity 0.15s; }
.form-toast-enter-from { opacity: 0; transform: translateY(8px); }
.form-toast-leave-to { opacity: 0; }

.order-form__sticky {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  background: var(--at-grad-paper);
  border-top: 1px solid var(--at-border);
  box-shadow: var(--at-shadow-lg);
}
@media (min-width: 768px) { .order-form__sticky { display: none; } }
.order-form__sticky-label {
  font-family: var(--at-f-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--at-muted);
}
.order-form__sticky-total {
  font-family: var(--at-f-display);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--at-cream);
  line-height: 1;
}
.order-form__sticky-btn {
  flex: 1;
  height: 46px;
  border: 1px solid var(--at-border-2);
  border-radius: var(--at-r-pill);
  background: var(--at-grad-gold-ink);
  color: #FFFBF0;
  font-family: var(--at-f-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  cursor: pointer;
  transition: opacity 0.25s ease;
}
.order-form__sticky-btn:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
