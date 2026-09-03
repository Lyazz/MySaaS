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
        }        const payload = {
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
  <div class="space-y-6">
    <!-- Quantity -->
    <div class="flex items-center justify-between border-y border-[#DAD2C4] py-4">
      <div class="flex flex-col gap-0.5">
        <span class="ed-label !mb-0">{{ storefrontContent.productForm.quantity.label }}</span>
        <span v-if="product?.isActive === false" class="ed-ui text-xs text-[#8A7E6E]">{{ storefrontContent.productForm.stock.unavailable }}</span>
        <span v-else-if="needsVariantChoice" class="ed-ui text-xs text-[#8A7E6E]">{{ storefrontContent.productForm.stock.selectOptions }}</span>
        <span v-else-if="isOutOfStock" class="ed-ui text-xs text-[#B8532E] font-semibold">{{ storefrontContent.productForm.stock.outOfStock }}</span>
        <span v-else-if="isLowStock" class="ed-ui text-xs text-[#97401F] font-semibold">{{ storefrontContent.productForm.stock.lowStock(maxQuantity) }}</span>
        <span v-else class="ed-ui text-xs text-[#4A4038]">{{ storefrontContent.product.inStock }}</span>
      </div>
      <div class="flex items-center border border-[#C4B8A4]">
        <button
          type="button"
          class="w-10 h-10 flex items-center justify-center text-[#4A4038] hover:bg-[#EFE8DA] transition-colors disabled:opacity-30"
          :disabled="!canPurchase || quantity <= 1"
          @click="decrementQuantity"
        >
          <Icon name="lucide:minus" class="w-4 h-4" />
        </button>
        <span class="w-12 text-center ed-ui font-semibold text-[#262019] tabular-nums border-x border-[#C4B8A4]">{{ quantity }}</span>
        <button
          type="button"
          class="w-10 h-10 flex items-center justify-center text-[#4A4038] hover:bg-[#EFE8DA] transition-colors disabled:opacity-30"
          :disabled="!canPurchase || (maxQuantity > 0 && quantity >= maxQuantity)"
          @click="incrementQuantity"
        >
          <Icon name="lucide:plus" class="w-4 h-4" />
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
      class="flex items-center gap-2 px-4 py-3 border border-[#DBC7B2] bg-[#EFE0D5] text-[#97401F] ed-ui text-xs font-medium"
    >
      <Icon name="lucide:package-open" class="w-4 h-4 flex-shrink-0" />
      <span v-if="clearance.remainingForNextThreshold.value > 0">
        {{ t('storefront.clearance.progressHint', { remaining: clearance.remainingForNextThreshold.value }) }}
      </span>
      <span v-else>{{ t('storefront.clearance.unlockedHint') }}</span>
    </div>

    <!-- Quick COD order -->
    <div
      v-if="codEnabled"
      ref="mainOrderFormRef"
      data-test="cod-order-card"
      class="border border-[#262019] bg-[#FBF8F2]"
    >
      <div class="flex items-center gap-3 px-6 py-4 border-b border-[#DAD2C4]">
        <Icon name="lucide:banknote" class="w-5 h-5 text-[#B8532E]" />
        <div>
          <h3 class="ed-display text-[19px] text-[#262019]">{{ storefrontContent.productForm.cod.title }}</h3>
          <span class="ed-ui text-[11px] uppercase tracking-[0.12em] text-[#8A7E6E]">{{ storefrontContent.productForm.cod.badge }}</span>
        </div>
      </div>

      <form class="p-6 space-y-4" @submit.prevent="handleOrderSubmit">
        <div>
          <label class="ed-label">{{ storefrontContent.checkout.form.fullName.label }}</label>
          <input v-model="quickForm.fullName" type="text" :placeholder="storefrontContent.checkout.form.fullName.placeholder" class="ed-input">
        </div>

        <div>
          <label class="ed-label">{{ storefrontContent.checkout.form.phone.label }}</label>
          <input v-model="quickForm.phone" type="tel" :placeholder="storefrontContent.checkout.form.phone.placeholder" class="ed-input">
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="ed-label">{{ storefrontContent.checkout.form.wilaya.label }}</label>
            <WilayaField
              v-model="quickForm.wilaya"
              input-class="ed-input ed-select"
              :placeholder="storefrontContent.checkout.form.wilaya.placeholder"
            />
          </div>
          <div>
            <label class="ed-label">{{ storefrontContent.checkout.form.commune.label }}</label>
            <CommuneField
              v-model="quickForm.commune"
              :wilaya-code="quickForm.wilaya"
              :placeholder="storefrontContent.checkout.form.commune.placeholder"
              :input-class="'ed-input'"
              :select-class="'ed-input ed-select'"
            />
          </div>
        </div>

        <div v-if="!hideOptionalAddress">
          <label class="ed-label">{{ storefrontContent.checkout.form.address.label }}</label>
          <input v-model="quickForm.address" type="text" :placeholder="storefrontContent.checkout.form.address.placeholder" class="ed-input">
        </div>

        <div v-if="quickForm.wilaya && quickForm.commune" class="space-y-2.5 pt-2">
          <label class="ed-label">{{ storefrontContent.checkout.sections.deliveryOptions }}</label>
          <div
            v-for="option in deliveryOptions"
            :key="option.id"
            class="cursor-pointer border p-4 transition-colors"
            :class="quickForm.selectedDeliveryOption === option.id
              ? 'border-[#262019] bg-[#F4EFE6]'
              : 'border-[#DAD2C4] hover:border-[#8A7E6E]'"
            @click="quickForm.selectedDeliveryOption = option.id"
          >
            <div class="flex items-center gap-4">
              <CarrierMark
                :provider="option.provider"
                :icon="option.icon"
                :alt="option.providerLabel"
                class="w-6 h-6 shrink-0"
                :class="quickForm.selectedDeliveryOption === option.id ? 'text-[#262019]' : 'text-[#8A7E6E]'"
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="ed-display text-[15px] text-[#262019]">{{ option.providerLabel }}</h4>
                  <span class="ed-ui text-[9px] font-semibold uppercase tracking-[0.12em] border border-[#C4B8A4] text-[#8A7E6E] px-1.5 py-0.5">{{ option.modeLabel }}</span>
                </div>
                <p class="ed-ui text-xs text-[#8A7E6E] leading-relaxed mt-0.5">{{ option.description }}</p>
              </div>
              <div class="flex items-center gap-3 shrink-0">
                <span class="ed-display text-[15px] text-[#B8532E]">
                  {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
                </span>
                <span
                  class="block w-4 h-4 rounded-full border transition-colors"
                  :class="quickForm.selectedDeliveryOption === option.id ? 'border-[#262019] border-[5px]' : 'border-[#C4B8A4]'"
                />
              </div>
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
        <div v-else class="px-4 py-3 border border-dashed border-[#C4B8A4] text-center ed-ui text-xs text-[#8A7E6E]">
          <Icon name="lucide:map-pin" class="w-4 h-4 mx-auto mb-1 text-[#C4B8A4]" />
          {{ storefrontContent.checkout.help.deliveryOptions }}
        </div>

        <div v-if="orderError" class="px-4 py-3 border border-[#B8532E] bg-[#EFE0D5] text-[#97401F] ed-ui text-sm">
          {{ orderError }}
        </div>

        <div v-if="quickOrderClearanceDiscount > 0" class="flex items-center justify-between py-1 ed-ui text-sm">
          <span class="text-[#97401F] uppercase tracking-[0.12em] text-xs font-semibold">{{ t('storefront.clearance.discountLine') }}</span>
          <span class="text-[#97401F] font-medium">−{{ formatCurrency(quickOrderClearanceDiscount) }}</span>
        </div>

        <div class="flex items-center justify-between border-t border-[#262019] pt-4">
          <span class="ed-label !mb-0">{{ storefrontContent.productForm.totalPrice }}</span>
          <span class="ed-display text-2xl text-[#B8532E]">
            {{ formatCurrency(totalPrice + (selectedDelivery?.price && selectedDelivery?.price !== 'FREE' && selectedDelivery?.price !== '—' ? Number(selectedDelivery.price) : 0)) }}
          </span>
        </div>

        <button
          type="submit"
          :disabled="orderSubmitting || (!canPurchase && !needsVariantChoice)"
          class="ed-btn-solid w-full"
        >
          <Icon v-if="orderSubmitting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
          <span>{{ orderSubmitting ? storefrontContent.productForm.cod.submitting : storefrontContent.productForm.cod.submit }}</span>
        </button>
      </form>
    </div>

    <!-- Add to cart -->
    <div v-if="cartEnabled">
      <button
        type="button"
        :disabled="addToCartSubmitting || (!canPurchase && !needsVariantChoice)"
        class="ed-btn-line w-full"
        @click="handleAddToCart"
      >
        <Icon name="lucide:shopping-bag" class="w-4 h-4" />
        <span>{{ addToCartSubmitting ? storefrontContent.actions.adding : storefrontContent.actions.addToCart }}</span>
      </button>
    </div>

    <!-- Toast -->
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSuccess"
        class="fixed bottom-4 end-4 z-50 bg-[#FBF8F2] border border-[#C4B8A4] px-5 py-4 shadow-[0_20px_44px_-28px_rgba(38,32,25,0.5)] flex items-center gap-4"
      >
        <div class="w-9 h-9 bg-[#EFE0D5] flex items-center justify-center shrink-0">
          <Icon name="lucide:check" class="w-4 h-4 text-[#97401F]" />
        </div>
        <div>
          <div class="ed-display text-[15px] text-[#262019]">{{ successTitle }}</div>
          <div class="ed-ui text-xs text-[#8A7E6E]">{{ successMessage }}</div>
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
        class="ed-theme fixed bottom-0 inset-x-0 z-40 bg-[#FBF8F2] border-t border-[#262019] p-4 md:hidden flex items-center justify-between gap-4"
      >
        <div class="flex flex-col min-w-0">
          <span class="ed-ui text-[11px] uppercase tracking-[0.16em] text-[#8A7E6E]">{{ storefrontContent.cart.summary.total }}</span>
          <span class="ed-display text-xl text-[#262019] leading-none">{{ formatCurrency(stickyBarTotal) }}</span>
        </div>
        <button
          type="button"
          :disabled="!canPurchase"
          class="flex-1 h-12 bg-[#262019] hover:bg-[#3A3128] disabled:bg-[#C4B8A4] disabled:cursor-not-allowed text-[#FBF8F2] ed-ui text-sm uppercase tracking-[0.16em] transition-colors"
          @click="scrollToForm"
        >
          {{ storefrontContent.productForm.cod.submit }}
        </button>
      </div>
    </Transition>
  </div>
</template>
