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
  onCommuneChange: (communeId) => { quickForm.commune = communeId }
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
            orderError.value = 'Maystro shipping price unavailable for selected commune'
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
</script>

<template>
  <div>
    <!-- Quantity Selector (Global for both COD and Cart) -->
    <div class="flex items-center justify-between p-4 bg-white rounded-sm border border-stone-200 shadow-sm mb-6">
      <div class="flex flex-col gap-0.5">
        <span class="font-semibold text-slate-700">{{ storefrontContent.productForm.quantity.label }}</span>
        <span
          v-if="product?.isActive === false"
          class="text-xs font-semibold text-slate-500"
        >{{ storefrontContent.productForm.stock.unavailable }}</span>
        <span
          v-else-if="isOutOfStock"
          class="text-xs font-semibold text-red-700"
        >{{ storefrontContent.productForm.stock.outOfStock }}</span>
        <span
          v-else-if="isLowStock"
          class="text-xs font-semibold text-amber-700"
        >
          {{ storefrontContent.productForm.stock.lowStock(maxQuantity) }}
        </span>
        <span
          v-else
          class="text-xs font-semibold text-emerald-700"
        >{{ storefrontContent.product.inStock }}</span>
      </div>
      <div class="flex items-center bg-[#fdfbf7] rounded-sm shadow-inner border border-stone-200 p-1">
        <button 
          type="button"
          class="w-10 h-10 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded-sm transition-colors"
          :disabled="!canPurchase || quantity <= 1"
          @click="decrementQuantity"
        >
          <Icon
            name="lucide:minus"
            class="w-4 h-4"
          />
        </button>
        <span class="w-12 text-center font-bold text-slate-900">{{ quantity }}</span>
        <button 
          type="button"
          class="w-10 h-10 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded-sm transition-colors"
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
      class="flex items-center gap-2 px-4 py-3 mb-6 rounded-sm border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold"
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

    <!-- Quick COD Order Form -->
    <div
      v-if="codEnabled"
      data-test="cod-order-card"
      class="bg-white rounded-sm p-6 md:p-8 shadow-sm border border-stone-200 relative overflow-hidden"
    >
      <div class="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-brand-400 to-brand-600" />
            
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-sm bg-brand-50 flex items-center justify-center text-brand-700 shadow-sm ring-1 ring-brand-100">
          <Icon
            name="lucide:banknote"
            class="w-5 h-5"
          />
        </div>
        <div>
          <h3 class="font-stationery font-bold text-slate-900 text-xl leading-none">
            {{ storefrontContent.productForm.cod.title }}
          </h3>
          <span class="text-xs text-slate-500 font-medium">{{ storefrontContent.productForm.cod.badge }}</span>
        </div>
      </div>
            
      <form
        class="space-y-5"
        @submit.prevent="handleOrderSubmit"
      >
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-slate-700 ms-1">{{ storefrontContent.checkout.form.fullName.label }}</label>
          <input 
            v-model="quickForm.fullName"
            type="text" 
            :placeholder="storefrontContent.checkout.form.fullName.placeholder" 
            class="block w-full h-12 rounded-sm border border-stone-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200 outline-none shadow-sm"
            :class="{ 'animate-attention': !quickForm.fullName }"
          >
        </div>
                
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-slate-700 ms-1">{{ storefrontContent.checkout.form.phone.label }}</label>
          <input
            v-model="quickForm.phone"
            type="tel"
            :placeholder="storefrontContent.checkout.form.phone.placeholder"
            class="block w-full h-12 rounded-sm border border-stone-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200 outline-none shadow-sm"
          >
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="block text-sm font-semibold text-slate-700 ms-1">{{ storefrontContent.checkout.form.wilaya.label }}</label>
            <WilayaField
              v-model="quickForm.wilaya"
              input-class="block w-full h-12 rounded-sm border border-stone-300 bg-white px-4 text-slate-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200 outline-none appearance-none cursor-pointer shadow-sm"
              :placeholder="storefrontContent.checkout.form.wilaya.placeholder"
            />
          </div>
          <div class="space-y-2">
            <label class="block text-sm font-semibold text-slate-700 ms-1">{{ storefrontContent.checkout.form.commune.label }}</label>
            <CommuneField
              v-model="quickForm.commune"
              :wilaya-code="quickForm.wilaya"
              :placeholder="storefrontContent.checkout.form.commune.placeholder"
              :input-class="'block w-full h-12 rounded-sm border border-stone-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200 outline-none shadow-sm'"
              :select-class="'block w-full h-12 rounded-sm border border-stone-300 bg-white px-4 text-slate-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200 outline-none shadow-sm'"
            />
          </div>
        </div>

        <div
          v-if="!hideOptionalAddress"
          class="space-y-2"
        >
          <label class="block text-sm font-semibold text-slate-700 ms-1">{{ storefrontContent.checkout.form.address.label }}</label>
          <input
            v-model="quickForm.address"
            type="text"
            :placeholder="storefrontContent.checkout.form.address.placeholder"
            class="block w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
          >
        </div>
        <div
          v-if="quickForm.wilaya && quickForm.commune"
          class="space-y-3 mt-6"
        >
          <label class="block text-sm font-semibold text-slate-700 ms-1">
            {{ storefrontContent.checkout.sections.deliveryOptions }}
          </label>
          <div 
            v-for="option in deliveryOptions"
            :key="option.id"
            class="cursor-pointer relative rounded-2xl p-4 border-2 transition-all duration-300 group hover:scale-[1.005]"
            :class="quickForm.selectedDeliveryOption === option.id 
              ? 'border-brand-500 bg-brand-50/50 shadow-md' 
              : 'border-slate-100 hover:border-brand-200 hover:shadow-sm'"
            @click="quickForm.selectedDeliveryOption = option.id"
          >
            <div class="flex items-center gap-4">
              <div 
                class="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
                :class="quickForm.selectedDeliveryOption === option.id 
                  ? `bg-${option.color}-100` 
                  : 'bg-slate-100 group-hover:bg-slate-200'"
              >
                <CarrierMark
                  :provider="option.provider"
                  :icon="option.icon"
                  :alt="option.providerLabel"
                  class="w-7 h-7 transition-colors duration-300"
                  :class="quickForm.selectedDeliveryOption === option.id ? `text-${option.color}-600` : 'text-slate-400 group-hover:text-slate-600'"
                />
              </div>
                        
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h4 class="font-bold text-slate-900 text-sm">
                    {{ option.providerLabel }}
                  </h4>
                  <span
                    class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                    :class="option.mode === 'home' ? 'bg-emerald-100 text-emerald-700' : option.mode === 'pickup' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'"
                  >
                    {{ option.modeLabel }}
                  </span>
                </div>
                <p class="text-xs text-slate-500 leading-relaxed">
                  {{ option.description }}
                </p>
              </div>
                        
              <div class="flex items-center gap-3 flex-shrink-0">
                <div class="text-end">
                  <div class="font-bold text-brand-600 text-base">
                    {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
                  </div>
                </div>
                <span
                  class="block w-5 h-5 rounded-full border-2 transition-colors duration-300 flex-shrink-0"
                  :class="quickForm.selectedDeliveryOption === option.id 
                    ? 'border-brand-600 bg-brand-600 ring-4 ring-brand-100' 
                    : 'border-slate-300'"
                >
                  <span 
                    v-if="quickForm.selectedDeliveryOption === option.id"
                    class="block w-full h-full rounded-full flex items-center justify-center"
                  >
                    <Icon
                      name="lucide:check"
                      class="w-3 h-3 text-white"
                    />
                  </span>
                </span>
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
        <div
          v-else
          class="mt-6 px-4 py-3 border border-dashed border-slate-200 text-center text-xs text-slate-400"
        >
          <Icon
            name="lucide:map-pin"
            class="w-4 h-4 mx-auto mb-1 text-slate-300"
          />
          {{ storefrontContent.checkout.help.deliveryOptions }}
        </div>



        <div
          v-if="orderError"
          class="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm"
        >
          {{ orderError }}
        </div>

        <!-- Clearance discount -->
        <div
          v-if="quickOrderClearanceDiscount > 0"
          class="flex items-center justify-between py-2 text-sm"
        >
          <span class="text-amber-700 uppercase tracking-wider text-xs font-bold">{{ t('storefront.clearance.discountLine') }}</span>
          <span class="font-medium text-amber-700">-{{ formatAmount(quickOrderClearanceDiscount) }} {{ currencyCode }}</span>
        </div>

        <!-- Total Price Display -->
        <div class="flex items-center justify-between p-4 bg-[#fdfbf7] rounded-sm border border-stone-200">
          <span class="text-slate-600 font-medium">{{ storefrontContent.productForm.totalPrice }}</span>
          <span class="text-xl font-bold text-brand-600">{{ formatAmount(totalPrice + (selectedDelivery?.price && selectedDelivery?.price !== 'FREE' && selectedDelivery?.price !== '—' ? Number(selectedDelivery.price) : 0)) }} {{ currencyCode }}</span>
        </div>

        <button 
          type="submit"
          :disabled="orderSubmitting || !canPurchase"
          class="w-full h-14 bg-slate-900 hover:bg-brand-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold text-lg rounded-sm shadow-md transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-3 mt-6 group overflow-hidden relative"
        >
          <span
            class="relative z-10 flex items-center gap-2"
            :class="{ 'opacity-0': orderSubmitting }"
          >
            <span>{{ orderSubmitting ? storefrontContent.productForm.cod.submitting : storefrontContent.productForm.cod.submit }}</span>
            <Icon
              name="lucide:arrow-right"
              class="w-5 h-5 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 transition-transform"
            />
          </span>
                            
          <div
            v-if="orderSubmitting"
            class="absolute inset-0 flex items-center justify-center"
          >
            <Icon
              name="lucide:loader-2"
              class="animate-spin h-6 w-6 text-white"
            />
          </div>
        </button>
      </form>
    </div>

    <!-- Add to Cart Button (Only if Cart is Enabled) -->
    <div
      v-if="cartEnabled"
      class="mt-6"
    >
      <button 
        type="button"
        :disabled="addToCartSubmitting || !canPurchase"
        class="w-full h-14 bg-white border border-slate-900 text-slate-900 hover:bg-slate-50 font-bold text-lg rounded-sm transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
        @click="handleAddToCart"
      >
        <Icon
          name="lucide:handbag"
          class="w-5 h-5"
        />
        <span>{{ addToCartSubmitting ? storefrontContent.actions.adding : storefrontContent.actions.addToCart }}</span>
      </button>
    </div>
        
    <!-- Success Toast -->
    <Transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSuccess"
        class="fixed bottom-4 end-4 z-50 bg-slate-900 text-white px-6 py-4 rounded-sm shadow-xl flex items-center gap-4 border border-slate-700/50 backdrop-blur-md bg-slate-900/95"
      >
        <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
          <Icon
            name="lucide:check"
            class="w-5 h-5"
          />
        </div>
        <div>
          <div class="font-bold">
            {{ successTitle }}
          </div>
          <div class="text-xs text-slate-300">
            {{ successMessage }}
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.animate-attention {
    animation: attentionCaptivate 3s infinite cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes attentionCaptivate {
    0%, 100% { border-color: #e2e8f0; box-shadow: 0 0 0 0 rgba(0,0,0,0); transform: scale(1); background-color: white; }
    50% { border-color: var(--brand); box-shadow: 0 0 20px -5px color-mix(in srgb, var(--brand), transparent 50%); transform: scale(1.02); background-color: color-mix(in srgb, var(--brand), white 98%); }
}
</style>
