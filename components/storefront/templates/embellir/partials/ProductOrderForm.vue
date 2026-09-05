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

const rawSubtotal = computed(() => (props.currentPrice || 0) * quantity.value)

const totalPrice = computed(() => {
    return Math.max(0, rawSubtotal.value - quickOrderClearanceDiscount.value)
})

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
    if (quantity.value > 1) {
        quantity.value--
    }
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

const maystroPrices = useDeliveryPrices({
  wilayaCode: () => quickForm.wilaya,
  communeCode: () => quickForm.commune
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

onMounted(() => {
    cartStore.loadFromLocalStorage()
})

watch(() => props.currentVariant, () => {
    quantity.value = 1
    orderError.value = ''
})

watch([() => props.currentStock, () => props.currentVariant], () => {
    if (!canPurchase.value) {
        quantity.value = 1
        return
    }
    if (maxQuantity.value > 0 && quantity.value > maxQuantity.value) {
        quantity.value = Math.max(1, maxQuantity.value)
    }
})


function getVariantTitle(variant: any) {
    if (!variant.optionValues || variant.optionValues.length === 0) return ''

    // Sort logic
    const values = [...variant.optionValues]
    if (props.product.options && props.product.options.length > 0) {
       const optionPos = new Map(props.product.options.map((o: any) => [o.id, o.position]))
        values.sort((a: any, b: any) => {
            const posA = optionPos.get(a.optionValue?.optionId) ?? 999
            const posB = optionPos.get(b.optionValue?.optionId) ?? 999
            return (posA as number) - (posB as number)
        })
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

    if (!canPurchase.value) {
        orderError.value = storefrontContent.value.productForm.errors.outOfStockVariant
        return
    }

    if (codEnabled.value && !quickForm.fullName.trim()) {
        orderError.value = storefrontContent.value.checkout.errors.fullNameRequired
        return
    }

    if (codEnabled.value && !quickForm.phone.trim()) {
        orderError.value = storefrontContent.value.checkout.errors.phoneRequired
        return
    }
    if (codEnabled.value && (!quickForm.wilaya || !quickForm.commune)) {
        orderError.value = storefrontContent.value.checkout.errors.requiredFields || storefrontContent.value.checkout.errors.deliveryRequired
        return
    }
    if (codEnabled.value && !quickForm.selectedDeliveryOption) {
        orderError.value = storefrontContent.value.checkout.errors.deliveryRequired
        return
    }

    orderSubmitting.value = true

    try {
        const delivery = selectedDelivery.value
        const isMaystro = delivery?.provider === 'MAYSTRO'
        const maystroServiceLevel = delivery?.mode === 'pickup' ? 'office' : 'home'
        const providerPrices = delivery?.provider ? maystroPrices.pricesByProvider.value?.[delivery.provider] : undefined
        const maystroShippingAmount =
          providerPrices
            ? (maystroServiceLevel === 'office' ? providerPrices.office : providerPrices.home)
          : null

        if (isMaystro) {

          if (delivery?.mode === 'pickup' && !String(quickForm.pickupPoint || '').trim() ) {
            orderError.value = storefrontContent.value.checkout.errors.deliveryRequired
            orderSubmitting.value = false
            return
          }
          if (maystroShippingAmount == null) {
            orderError.value = storefrontContent.value.checkout.errors.shippingUnavailable
            orderSubmitting.value = false
            return
          }
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
            items: [
                {
                    productId: props.product.id,
                    variantId: props.currentVariant?.id,
                    quantity: quantity.value
                }
            ]
        }

        const currency = storeSettings.value?.currencyCode || 'DZD'
        metaPixel.initiateCheckout({
            contents: [
                {
                    id: props.product.id,
                    quantity: quantity.value,
                    item_price: Number(props.currentPrice || 0)
                }
            ],
            numItems: quantity.value,
            value: totalPrice.value,
            currency,
            pixelIds: (props.product as any)?.metaPixelIds
        })

        const response = await $fetch<{ orderId: string }>(useTenantApiUrl('/api/orders'), {
            method: 'POST',
            body: payload,
            headers: {
                ...(useTenantApiHeaders() || {})
            }
        })

        triggerSuccessToast(
            storefrontContent.value.toasts.orderReceived.title,
            storefrontContent.value.toasts.orderReceived.message
        )
        cartStore.clearCart()
        quickForm.fullName = ''
        quickForm.phone = ''
        quickForm.wilaya = ''
        quickForm.commune = ''
        quickForm.address = ''

        router.push({
            path: '/order-success',
            query: { orderId: response.orderId }
        })
    } catch (error: any) {
        console.error('Quick order failed:', error)
        orderError.value =
            error?.data?.statusMessage ||
            error?.data?.message ||
            storefrontContent.value.checkout.errors.submitFailed
    } finally {
        orderSubmitting.value = false
    }
}

const handleAddToCart = async () => {
    if (!props.product) return
    if (needsVariantChoice.value) { invite(); triggerSuccessToast(storefrontContent.value.productForm.errors.selectOptions, storefrontContent.value.productForm.chooseOptionsPrompt); return }
    if (!canPurchase.value) {
        triggerSuccessToast(
            storefrontContent.value.actions.outOfStock,
            storefrontContent.value.toasts.outOfStock.message
        )
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

    triggerSuccessToast(
        storefrontContent.value.toasts.addedToCart.title,
        storefrontContent.value.toasts.addedToCart.message
    )
    addToCartSubmitting.value = false
}

// Mobile Sticky Buy Bar Logic
const mainOrderFormRef = ref<HTMLElement | null>(null)
const showStickyBar = ref(false)

onMounted(() => {
    cartStore.loadFromLocalStorage()

    // Setup observer to detect when main form is out of view
    const observer = new IntersectionObserver((entries) => {
        const entry = entries[0]
        // Show sticky bar when the main form is NOT intersecting (out of view)
        showStickyBar.value = !entry.isIntersecting
    }, {
        root: null,
        threshold: 0.1, // Trigger when 10% of form is visible
        rootMargin: '0px 0px -20% 0px' // Offset to trigger slightly before it's completely gone
    })

    if (mainOrderFormRef.value) {
        observer.observe(mainOrderFormRef.value)
    }

    onUnmounted(() => {
        if (mainOrderFormRef.value) observer.unobserve(mainOrderFormRef.value)
        observer.disconnect()
    })
})

const scrollToForm = () => {
    if (mainOrderFormRef.value) {
        // Calculate position slightly above the form to give it some breathing room
        const yOffset = -20;
        const y = mainOrderFormRef.value.getBoundingClientRect().top + window.scrollY + yOffset;

        window.scrollTo({ top: y, behavior: 'smooth' })

        // If the form is focused, the user can immediately interact
        setTimeout(() => {
           if (codEnabled.value && quickForm.fullName === '') {
               const firstInput = mainOrderFormRef.value?.querySelector('input[type="text"]') as HTMLElement | null
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
    <!-- Quantity -->
    <div class="flex items-center justify-between gap-4 border border-[#CBBDAB] bg-[#FDFAF4] p-4 mb-6">
      <div class="flex flex-col gap-1 min-w-0">
        <span class="emb-label text-[#16211E]">{{ storefrontContent.productForm.quantity.label }}</span>
        <span
          v-if="product?.isActive === false"
          class="text-xs font-semibold text-[#5A6763]"
        >{{ storefrontContent.productForm.stock.unavailable }}</span>
        <span
          v-else-if="needsVariantChoice"
          class="text-xs font-semibold text-[#5A6763]"
        >{{ storefrontContent.productForm.stock.selectOptions }}</span>
        <span
          v-else-if="isOutOfStock"
          class="text-xs font-semibold text-[#B4593F]"
        >{{ storefrontContent.productForm.stock.outOfStock }}</span>
        <span
          v-else-if="isLowStock"
          class="text-xs font-semibold text-[#8A5A18]"
        >{{ storefrontContent.productForm.stock.lowStock(maxQuantity) }}</span>
        <span
          v-else
          class="text-xs font-semibold text-brand-700"
        >{{ storefrontContent.product.inStock }}</span>
      </div>
      <div class="flex items-stretch gap-px bg-[#CBBDAB] border border-[#CBBDAB] shrink-0">
        <button
          type="button"
          class="w-11 h-11 flex items-center justify-center bg-[#FDFAF4] text-[#16211E] hover:bg-brand-600 hover:text-[#FDFAF4] transition-colors disabled:bg-[#F2ECE1] disabled:text-[#B3AA9E] disabled:cursor-not-allowed"
          :disabled="!canPurchase || quantity <= 1"
          :aria-label="storefrontContent.productForm.quantity.label"
          @click="decrementQuantity"
        >
          <Icon
            name="lucide:minus"
            class="w-4 h-4"
          />
        </button>
        <span class="w-12 h-11 flex items-center justify-center bg-[#FDFAF4] emb-display text-lg text-[#16211E] tabular-nums">{{ quantity }}</span>
        <button
          type="button"
          class="w-11 h-11 flex items-center justify-center bg-[#FDFAF4] text-[#16211E] hover:bg-brand-600 hover:text-[#FDFAF4] transition-colors disabled:bg-[#F2ECE1] disabled:text-[#B3AA9E] disabled:cursor-not-allowed"
          :disabled="!canPurchase || (maxQuantity > 0 && quantity >= maxQuantity)"
          :aria-label="storefrontContent.productForm.quantity.label"
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
      class="flex items-center gap-2.5 px-4 py-3 mb-6 border-s-2 border-[#DFA254] bg-[#FDFAF4] text-[#8A5A18] text-xs font-semibold"
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

    <!-- Cash on delivery -->
    <div
      v-if="codEnabled"
      ref="mainOrderFormRef"
      data-test="cod-order-card"
      class="border border-[#CBBDAB] bg-[#FDFAF4]"
    >
      <div class="flex items-center gap-3 bg-brand-600 text-[#FDFAF4] px-6 py-4">
        <Icon
          name="lucide:banknote"
          class="w-5 h-5 text-[#DFA254] shrink-0"
        />
        <div class="min-w-0">
          <h3 class="emb-display text-xl leading-none text-[#FDFAF4]">
            {{ storefrontContent.productForm.cod.title }}
          </h3>
          <span class="text-xs text-[#F2ECE1]/70">{{ storefrontContent.productForm.cod.badge }}</span>
        </div>
      </div>

      <form
        class="p-6 space-y-5"
        @submit.prevent="handleOrderSubmit"
      >
        <div class="space-y-2">
          <label class="block emb-label text-[#8E9793]">{{ storefrontContent.checkout.form.fullName.label }}</label>
          <input
            v-model="quickForm.fullName"
            type="text"
            :placeholder="storefrontContent.checkout.form.fullName.placeholder"
            class="block w-full h-12 border border-[#CBBDAB] bg-[#FDFAF4] px-4 text-[#16211E] placeholder:text-[#8E9793] focus:border-brand-600 focus:ring-0 transition-colors outline-none"
            :class="{ 'emb-attention': !quickForm.fullName }"
          >
        </div>

        <div class="space-y-2">
          <label class="block emb-label text-[#8E9793]">{{ storefrontContent.checkout.form.phone.label }}</label>
          <input
            v-model="quickForm.phone"
            type="tel"
            :placeholder="storefrontContent.checkout.form.phone.placeholder"
            class="block w-full h-12 border border-[#CBBDAB] bg-[#FDFAF4] px-4 text-[#16211E] placeholder:text-[#8E9793] focus:border-brand-600 focus:ring-0 transition-colors outline-none"
          >
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="block emb-label text-[#8E9793]">{{ storefrontContent.checkout.form.wilaya.label }}</label>
            <WilayaField
              v-model="quickForm.wilaya"
              input-class="block w-full h-12 border border-[#CBBDAB] bg-[#FDFAF4] px-4 text-[#16211E] focus:border-brand-600 focus:ring-0 transition-colors outline-none appearance-none cursor-pointer"
              :placeholder="storefrontContent.checkout.form.wilaya.placeholder"
            />
          </div>
          <div class="space-y-2">
            <label class="block emb-label text-[#8E9793]">{{ storefrontContent.checkout.form.commune.label }}</label>
            <CommuneField
              v-model="quickForm.commune"
              :wilaya-code="quickForm.wilaya"
              :placeholder="storefrontContent.checkout.form.commune.placeholder"
              :input-class="'block w-full h-12 border border-[#CBBDAB] bg-[#FDFAF4] px-4 text-[#16211E] placeholder:text-[#8E9793] focus:border-brand-600 focus:ring-0 transition-colors outline-none'"
              :select-class="'block w-full h-12 border border-[#CBBDAB] bg-[#FDFAF4] px-4 text-[#16211E] focus:border-brand-600 focus:ring-0 transition-colors outline-none'"
            />
          </div>
        </div>

        <div
          v-if="!hideOptionalAddress"
          class="space-y-2"
        >
          <label class="block emb-label text-[#8E9793]">{{ storefrontContent.checkout.form.address.label }}</label>
          <input
            v-model="quickForm.address"
            type="text"
            :placeholder="storefrontContent.checkout.form.address.placeholder"
            class="block w-full h-12 border border-[#CBBDAB] bg-[#FDFAF4] px-4 text-[#16211E] placeholder:text-[#8E9793] focus:border-brand-600 focus:ring-0 transition-colors outline-none"
          >
        </div>

        <!-- Delivery -->
        <div
          v-if="quickForm.wilaya && quickForm.commune"
          class="space-y-3 pt-2"
        >
          <p class="emb-label text-[#8E9793]">
            {{ storefrontContent.checkout.sections.deliveryOptions }}
          </p>
          <button
            v-for="option in deliveryOptions"
            :key="option.id"
            type="button"
            class="w-full text-start border p-4 transition-colors"
            :class="quickForm.selectedDeliveryOption === option.id
              ? 'border-brand-600 bg-[#F2ECE1]'
              : 'border-[#CBBDAB] bg-[#FDFAF4] hover:border-[#DFA254]'"
            @click="quickForm.selectedDeliveryOption = option.id"
          >
            <div class="flex items-center gap-4">
              <span
                class="w-11 h-11 flex items-center justify-center shrink-0 transition-colors"
                :class="quickForm.selectedDeliveryOption === option.id
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
                  :class="quickForm.selectedDeliveryOption === option.id
                    ? 'border-brand-600 bg-brand-600'
                    : 'border-[#CBBDAB]'"
                >
                  <Icon
                    v-if="quickForm.selectedDeliveryOption === option.id"
                    name="lucide:check"
                    class="w-3 h-3 text-[#FDFAF4]"
                  />
                </span>
              </div>
            </div>
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
          class="flex items-center gap-2.5 px-4 py-3 border border-dashed border-[#CBBDAB] text-xs text-[#8E9793]"
        >
          <Icon
            name="lucide:map-pin"
            class="w-4 h-4 text-[#DFA254] shrink-0"
          />
          {{ storefrontContent.checkout.help.deliveryOptions }}
        </div>

        <div
          v-if="orderError"
          class="flex items-start gap-2.5 px-4 py-3 border-s-2 border-[#B4593F] bg-[#FBF0EC] text-[#8E3A22] text-sm"
        >
          <Icon
            name="lucide:alert-circle"
            class="w-4 h-4 shrink-0 mt-0.5"
          />
          <span>{{ orderError }}</span>
        </div>

        <!-- Totals -->
        <div class="border border-[#CBBDAB] bg-[#F2ECE1] p-4 space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span class="text-[#5A6763]">{{ storefrontContent.cart.summary.subtotal }}</span>
            <span class="font-semibold text-[#16211E] tabular-nums">{{ formatAmount(rawSubtotal) }} {{ currencyCode }}</span>
          </div>

          <div
            v-if="quickOrderClearanceDiscount > 0"
            class="flex items-center justify-between text-sm"
          >
            <span class="text-[#8A5A18]">{{ t('storefront.clearance.discountLine') }}</span>
            <span class="font-semibold text-[#8A5A18] tabular-nums">-{{ formatAmount(quickOrderClearanceDiscount) }} {{ currencyCode }}</span>
          </div>

          <div
            v-if="selectedDelivery"
            class="flex items-center justify-between text-sm"
          >
            <span class="text-[#5A6763]">{{ storefrontContent.checkout.summary.shippingFee }}</span>
            <span class="font-semibold text-brand-700 tabular-nums">
              {{ selectedDelivery.price === 'FREE' ? storefrontContent.checkout.delivery.free : (selectedDelivery.price === '—' ? '—' : `${selectedDelivery.price} ${currencyCode}`) }}
            </span>
          </div>

          <div class="flex items-baseline justify-between pt-3 border-t border-[#CBBDAB]">
            <span class="emb-label text-[#16211E]">{{ storefrontContent.productForm.totalPrice }}</span>
            <span class="emb-display text-2xl text-brand-700 tabular-nums">
              {{ formatAmount(totalPrice + (selectedDelivery?.price && selectedDelivery?.price !== 'FREE' && selectedDelivery?.price !== '—' ? Number(selectedDelivery.price) : 0)) }} {{ currencyCode }}
            </span>
          </div>
        </div>

        <button
          type="submit"
          :disabled="orderSubmitting || (!canPurchase && !needsVariantChoice)"
          class="w-full h-14 bg-brand-600 text-[#FDFAF4] emb-label hover:bg-[#DFA254] hover:text-[#062622] transition-colors disabled:bg-[#CBBDAB] disabled:text-[#5A6763] disabled:cursor-not-allowed flex items-center justify-center gap-3"
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
            class="w-4 h-4 rtl:rotate-180"
          />
        </button>
      </form>
    </div>

    <!-- Add to cart -->
    <div
      v-if="cartEnabled"
      class="mt-4"
    >
      <button
        type="button"
        :disabled="addToCartSubmitting || (!canPurchase && !needsVariantChoice)"
        class="w-full h-14 border border-[#16211E] bg-transparent text-[#16211E] emb-label hover:bg-[#16211E] hover:text-[#FDFAF4] transition-colors disabled:border-[#CBBDAB] disabled:text-[#B3AA9E] disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center justify-center gap-3"
        @click="handleAddToCart"
      >
        <Icon
          name="lucide:shopping-bag"
          class="w-4 h-4"
        />
        <span>{{ addToCartSubmitting ? storefrontContent.actions.adding : storefrontContent.actions.addToCart }}</span>
      </button>
    </div>

    <!-- Trust: three tiles, one grout line wide -->
    <div class="mt-10">
      <p class="emb-label text-[#8E9793] text-center mb-4">
        {{ t('storefront.product.whyChooseUs') }}
      </p>
      <div class="grid grid-cols-3 gap-px bg-[#CBBDAB] border border-[#CBBDAB]">
        <div class="flex flex-col items-center text-center gap-2.5 bg-[#FDFAF4] py-5 px-2">
          <Icon
            name="lucide:truck"
            class="w-5 h-5 text-brand-700"
          />
          <span class="text-[11px] font-semibold text-[#5A6763] leading-tight">{{ t('storefront.product.features.delivery') }}</span>
        </div>
        <div class="flex flex-col items-center text-center gap-2.5 bg-[#FDFAF4] py-5 px-2">
          <Icon
            name="lucide:headset"
            class="w-5 h-5 text-brand-700"
          />
          <span class="text-[11px] font-semibold text-[#5A6763] leading-tight">{{ t('storefront.product.features.support') }}</span>
        </div>
        <div class="flex flex-col items-center text-center gap-2.5 bg-[#FDFAF4] py-5 px-2">
          <Icon
            name="lucide:shield-check"
            class="w-5 h-5 text-brand-700"
          />
          <span class="text-[11px] font-semibold text-[#5A6763] leading-tight">{{ t('storefront.product.features.securePayment') }}</span>
        </div>
      </div>
    </div>

    <!-- Success toast -->
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
        class="fixed bottom-4 end-4 z-50 bg-[#062622] text-[#F2ECE1] px-5 py-4 shadow-xl flex items-center gap-4 border-s-2 border-[#DFA254]"
      >
        <span class="emb-star w-5 h-5 text-[#DFA254] shrink-0" />
        <div>
          <div class="emb-label text-[#FDFAF4]">
            {{ successTitle }}
          </div>
          <div class="text-xs text-[#F2ECE1]/60 mt-1">
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
        class="fixed bottom-0 inset-x-0 z-40 bg-[#FDFAF4] border-t border-[#CBBDAB] p-3 md:hidden flex items-center gap-3"
      >
        <div class="flex flex-col min-w-0">
          <span class="emb-label text-[#8E9793]">{{ storefrontContent.productForm.totalPrice }}</span>
          <span class="emb-display text-lg text-brand-700 leading-tight tabular-nums truncate">{{ formatAmount(totalPrice + (selectedDelivery?.price && selectedDelivery?.price !== 'FREE' && selectedDelivery?.price !== '—' ? Number(selectedDelivery.price) : 0)) }} {{ currencyCode }}</span>
        </div>
        <button
          type="button"
          :disabled="!canPurchase"
          class="flex-1 h-12 bg-brand-600 text-[#FDFAF4] emb-label hover:bg-[#DFA254] hover:text-[#062622] transition-colors disabled:bg-[#CBBDAB] disabled:text-[#5A6763] disabled:cursor-not-allowed flex items-center justify-center gap-2"
          @click="scrollToForm"
        >
          <span>{{ storefrontContent.productForm.cod.submit }}</span>
          <Icon
            name="lucide:arrow-right"
            class="w-4 h-4 rtl:rotate-180"
          />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* A quiet nudge on the first empty field: the rule warms, nothing moves. */
.emb-attention {
    animation: embAttention 3s infinite ease-in-out;
}

@keyframes embAttention {
    0%, 100% { border-color: #CBBDAB; }
    50% { border-color: #DFA254; }
}

@media (prefers-reduced-motion: reduce) {
    .emb-attention { animation: none; }
}
</style>
