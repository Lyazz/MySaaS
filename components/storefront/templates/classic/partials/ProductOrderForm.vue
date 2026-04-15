<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'
import { DZ_WILAYAS } from '~/shared/geo/dz'

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
const storeSettings = useState<any>('storeSettings')
const metaPixel = useMetaPixel()
const { currencyCode } = useCurrency()
const codEnabled = computed(() => storeSettings.value?.codEnabled !== false && storeSettings.value?.cartEnabled !== false)
const cartEnabled = computed(() => storeSettings.value?.cartEnabled !== false)
const wilayas = DZ_WILAYAS

const orderSubmitting = ref(false)
const addToCartSubmitting = ref(false)
const showSuccess = ref(false)
const successTitle = ref('')
const successMessage = ref('')
const orderError = ref('')
const quantity = ref(1)
const LOW_STOCK_THRESHOLD = 5

const totalPrice = computed(() => {
    return (props.currentPrice || 0) * quantity.value
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
    SELF: { label: storefrontContent.value.checkout.delivery.provider.self, icon: 'lucide:bike', color: 'teal' }
  }
  return allowed.map((key: string) => ({ key, ...providerMeta[key as keyof typeof providerMeta] }))
})

const maystroPrices = useMaystroDeliveryPrices({
  wilayaCode: () => quickForm.wilaya,
  communeCode: () => quickForm.commune
})

// Unified delivery options combining provider and mode
const deliveryOptions = computed(() => {
  const options: any[] = []
  
  availableProviders.value.forEach((provider: any) => {
    const homePrice =
      provider.key === 'MAYSTRO' && maystroPrices.homePrice.value != null
        ? String(Math.round(maystroPrices.homePrice.value))
        : provider.key === 'MAYSTRO'
          ? '—'
          : '350'
    const officePrice =
      provider.key === 'MAYSTRO' && maystroPrices.officePrice.value != null
        ? String(Math.round(maystroPrices.officePrice.value))
        : provider.key === 'MAYSTRO'
          ? '—'
          : '300'

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

const isMaystroPickup = computed(() => selectedDelivery.value?.provider === 'MAYSTRO' && selectedDelivery.value?.mode === 'pickup')
const pickupPoints = ref<Array<{ pickup_point: number; commune: number; name_lt?: string; name_ar?: string }>>([])
const pickupPointsLoading = ref(false)
const pickupPointsError = ref('')

const syncPickupPointCommune = () => {
  const selected = String(quickForm.pickupPoint || '').trim()
  if (!selected) return
  const point = pickupPoints.value.find((p) => String(p.pickup_point) === selected)
  if (!point?.commune) return
  const nextCommune = String(point.commune)
  if (nextCommune && quickForm.commune !== nextCommune) {
    quickForm.commune = nextCommune
  }
}

watchEffect(() => {
  const options = deliveryOptions.value
  if (!options.length) return
  const selected = quickForm.selectedDeliveryOption
  if (!selected || !options.some((opt: any) => opt.id === selected)) {
    quickForm.selectedDeliveryOption = options[0].id
  }
})

watch(
  [isMaystroPickup, () => quickForm.commune, () => quickForm.wilaya],
  async ([enabled, commune, wilaya]) => {
    pickupPointsError.value = ''
    pickupPoints.value = []

    if (!enabled) {
      quickForm.pickupPoint = ''
      return
    }

    if (!wilaya || !commune) return

    pickupPointsLoading.value = true
    try {
      const url = useTenantApiUrl(
        `/api/delivery/maystro/pickup-points?commune=${encodeURIComponent(commune)}&wilaya=${encodeURIComponent(wilaya)}&deliveryType=3&nearby=true`
      )
      const data = await $fetch<any[]>(url, {
        headers: {
          ...(useTenantApiHeaders() || {})
        }
      })
      pickupPoints.value = Array.isArray(data)
        ? data
            .map((p: any) => ({
              pickup_point: Number(p?.pickup_point),
              commune: Number(p?.commune),
              name_lt: p?.name_lt ? String(p.name_lt) : undefined,
              name_ar: p?.name_ar ? String(p.name_ar) : undefined
            }))
            .filter((p) => Number.isFinite(p.pickup_point) && p.pickup_point > 0 && Number.isFinite(p.commune))
        : []

      if (pickupPoints.value.length > 0) {
        const current = String(quickForm.pickupPoint || '').trim()
        if (!current || !pickupPoints.value.some((p) => String(p.pickup_point) === current)) {
          quickForm.pickupPoint = String(pickupPoints.value[0].pickup_point)
          syncPickupPointCommune()
        }
      }
    } catch (e: any) {
      pickupPoints.value = []
      pickupPointsError.value =
        e?.data?.statusMessage ||
        e?.data?.message ||
        'Failed to load pickup points'
    } finally {
      pickupPointsLoading.value = false
    }
  },
  { immediate: true }
)


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
    let values = [...variant.optionValues]
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
    if (codEnabled.value && !quickForm.selectedDeliveryOption) {
        orderError.value = storefrontContent.value.checkout.errors.deliveryRequired
        return
    }

    orderSubmitting.value = true

    try {
        const delivery = selectedDelivery.value
        const isMaystro = delivery?.provider === 'MAYSTRO'
        const maystroServiceLevel = delivery?.mode === 'pickup' ? 'office' : 'home'
        const maystroShippingAmount =
          isMaystro
            ? (maystroServiceLevel === 'office' ? maystroPrices.officePrice.value : maystroPrices.homePrice.value)
            : null

        if (isMaystro) {
          if (!quickForm.wilaya || !quickForm.commune) {
            orderError.value = storefrontContent.value.checkout.errors.deliveryRequired
            orderSubmitting.value = false
            return
          }
          if (delivery?.mode === 'pickup' && !String(quickForm.pickupPoint || '').trim()) {
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
            customerAddress: quickForm.address?.trim() || undefined,
            shippingAddressLine1: quickForm.address?.trim() || undefined,
            shippingWilayaCode: quickForm.wilaya || undefined,
            shippingCommuneCode: quickForm.commune || undefined,
            deliveryMode: delivery?.mode,
            shippingProvider: delivery?.provider || undefined,
            shippingPickupPoint: isMaystro && delivery?.mode === 'pickup' ? (quickForm.pickupPoint || undefined) : undefined,
            shippingServiceLevel: isMaystro ? maystroServiceLevel : undefined,
            shippingAmount: isMaystro && maystroShippingAmount != null ? maystroShippingAmount : undefined,
            shippingCurrency: isMaystro ? currencyCode.value : undefined,
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
        metaPixelIds: (props.product as any)?.metaPixelIds
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
        <!-- Quantity Selector -->
        <div class="flex items-center justify-between p-4 bg-white border border-slate-200 mb-6">
            <div class="flex flex-col gap-0.5">
                <span class="text-xs font-bold uppercase tracking-widest text-slate-900">{{ storefrontContent.productForm.quantity.label }}</span>
                <span v-if="product?.isActive === false" class="text-xs font-medium text-slate-500 mt-1">{{ storefrontContent.productForm.stock.unavailable }}</span>
                <span v-else-if="isOutOfStock" class="text-xs font-medium text-red-700 mt-1">{{ storefrontContent.productForm.stock.outOfStock }}</span>
                <span v-else-if="isLowStock" class="text-xs font-medium text-amber-700 mt-1">
                    {{ storefrontContent.productForm.stock.lowStock(maxQuantity) }}
                </span>
                <span v-else class="text-xs font-medium text-emerald-700 mt-1">{{ storefrontContent.product.inStock }}</span>
            </div>
            <div class="flex items-center border border-slate-300">
                <button 
                    type="button"
                    class="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                    :disabled="!canPurchase || quantity <= 1"
                    @click="decrementQuantity"
                >
                    <Icon name="lucide:minus" class="w-4 h-4" />
                </button>
                <input 
                    v-model.number="quantity" 
                    type="number" 
                    min="1" 
                    :max="maxQuantity"
                    class="w-12 text-center border-none bg-transparent font-bold text-slate-900 focus:ring-0 p-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    readonly
                >
                <button 
                    type="button"
                    class="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
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

        <!-- Quick COD Order Form -->
        <div
            v-if="codEnabled"
            data-test="cod-order-card"
            class="bg-white p-8 border border-slate-200 relative mb-6"
        >
            <div class="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
                <h3 class="font-serif font-bold text-slate-900 text-2xl">{{ storefrontContent.productForm.cod.title }}</h3>
                <span class="text-xs text-slate-500 font-bold uppercase tracking-widest">({{ storefrontContent.productForm.cod.badge }})</span>
            </div>
            
            <form class="space-y-6" @submit.prevent="handleOrderSubmit">
                <div class="space-y-2">
                <label class="block text-xs font-bold uppercase tracking-widest text-slate-900">{{ storefrontContent.checkout.form.fullName.label }}</label>
                <input 
                    v-model="quickForm.fullName"
                    type="text" 
                    :placeholder="storefrontContent.checkout.form.fullName.placeholder" 
                    class="block w-full h-12 border border-slate-300 bg-white px-4 text-slate-900 focus:border-slate-900 focus:ring-0 transition-all duration-200 outline-none rounded-none placeholder:text-slate-400"
                    :class="{ 'border-slate-900 bg-slate-50': !quickForm.fullName }"
                >
                </div>
                
                <div class="space-y-2">
                <label class="block text-xs font-bold uppercase tracking-widest text-slate-900">{{ storefrontContent.checkout.form.phone.label }}</label>
                <input
                    v-model="quickForm.phone"
                    type="tel"
                    :placeholder="storefrontContent.checkout.form.phone.placeholder"
                    class="block w-full h-12 border border-slate-300 bg-white px-4 text-slate-900 focus:border-slate-900 focus:ring-0 transition-all duration-200 outline-none rounded-none placeholder:text-slate-400"
                >
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                    <label class="block text-xs font-bold uppercase tracking-widest text-slate-900">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                    <div class="relative">
                    <select
                        v-model="quickForm.wilaya"
                        class="block w-full h-12 border border-slate-300 bg-white px-4 text-slate-900 focus:border-slate-900 focus:ring-0 transition-all duration-200 outline-none appearance-none cursor-pointer rounded-none"
                    >
                        <option value="" disabled>{{ storefrontContent.common.selectPlaceholder }}</option>
                        <option
                          v-for="w in wilayas"
                          :key="w.code"
                          :value="w.code"
                        >
                          {{ w.code }} - {{ w.name }}
                        </option>
                    </select>
                    <div class="absolute right-4 rtl:right-auto rtl:left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <Icon name="lucide:chevron-down" class="w-4 h-4 rtl:rotate-180" />
                    </div>
                    </div>
                </div>
                <div class="space-y-2">
                    <label class="block text-xs font-bold uppercase tracking-widest text-slate-900">{{ storefrontContent.checkout.form.commune.label }}</label>
                    <CommuneField
                    v-model="quickForm.commune"
                    :wilaya-code="quickForm.wilaya"
                    :placeholder="storefrontContent.checkout.form.commune.placeholder"
                    :input-class="'block w-full h-12 border border-slate-300 bg-white px-4 text-slate-900 focus:border-slate-900 focus:ring-0 transition-all duration-200 outline-none rounded-none placeholder:text-slate-400'"
                    :select-class="'block w-full h-12 border border-slate-300 bg-white px-4 text-slate-900 focus:border-slate-900 focus:ring-0 transition-all duration-200 outline-none rounded-none'"
                    />
                </div>
                </div>

                <div class="space-y-2">
                    <label class="block text-xs font-bold uppercase tracking-widest text-slate-900">{{ storefrontContent.checkout.form.address.label }}</label>
                    <input
                        v-model="quickForm.address"
                        type="text"
                        :placeholder="storefrontContent.checkout.form.address.placeholder"
                        class="block w-full h-12 border border-slate-300 bg-white px-4 text-slate-900 focus:border-slate-900 focus:ring-0 transition-all duration-200 outline-none rounded-none placeholder:text-slate-400"
                    >
                </div>
                <div class="space-y-3 mt-6">
                    <label class="block text-sm font-semibold text-slate-700 ml-1 rtl:ml-0 rtl:mr-1">
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
                            <Icon 
                            :name="option.icon" 
                            class="w-7 h-7 transition-colors duration-300"
                            :class="quickForm.selectedDeliveryOption === option.id 
                                ? `text-${option.color}-600` 
                                : 'text-slate-400 group-hover:text-slate-600'"
                            />
                        </div>
                        
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                            <h4 class="font-bold text-slate-900 text-sm">
                                {{ option.providerLabel }}
                            </h4>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
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
                            <div class="text-right">
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
                                <Icon name="lucide:check" class="w-3 h-3 text-white" />
                            </span>
                            </span>
                        </div>
                        </div>
                    </div>

                    <div
                        v-if="isMaystroPickup"
                        class="space-y-2 mt-4"
                    >
                        <label class="block text-sm font-semibold text-slate-700 ml-1 rtl:ml-0 rtl:mr-1">
                            {{ storefrontContent.checkout.delivery.mode.pickupPoint }}
                        </label>
                        <div class="relative">
                            <select
                                v-model="quickForm.pickupPoint"
                                class="block w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none appearance-none cursor-pointer shadow-sm disabled:opacity-70"
                                :disabled="!quickForm.commune || !quickForm.wilaya || pickupPointsLoading"
                                @change="syncPickupPointCommune"
                            >
                                <option value="" disabled>
                                {{ pickupPointsLoading ? 'Loading…' : 'Select stop desk…' }}
                                </option>
                                <option
                                v-for="p in pickupPoints"
                                :key="String(p.pickup_point)"
                                :value="String(p.pickup_point)"
                                >
                                {{ p.pickup_point }} - {{ p.name_lt || p.name_ar || `Commune ${p.commune}` }}
                                </option>
                            </select>
                            <div class="absolute right-4 rtl:right-auto rtl:left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                <Icon name="lucide:chevron-down" class="w-4 h-4" />
                            </div>
                        </div>
                        <p v-if="pickupPointsError" class="text-xs text-amber-700">
                        {{ pickupPointsError }}
                        </p>
                    </div>
                </div>



                <div
                    v-if="orderError"
                    class="p-4 border border-red-200 bg-red-50 text-red-700 text-sm"
                >
                    {{ orderError }}
                </div>

                <!-- Total Price Display -->
                <div class="flex items-center justify-between py-4 border-t border-b border-slate-100">
                    <span class="text-slate-600 font-serif text-lg italic">{{ storefrontContent.productForm.totalPrice }}</span>
                    <span class="text-xl font-bold font-serif text-slate-900">{{ totalPrice + (selectedDelivery?.price && selectedDelivery?.price !== 'FREE' && selectedDelivery?.price !== '—' ? Number(selectedDelivery.price) : 0) }} {{ currencyCode }}</span>
                </div>

                <button 
                type="submit"
                :disabled="orderSubmitting || !canPurchase"
                class="w-full h-14 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed text-white text-sm font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 group relative"
                >
                <span class="relative z-10 flex items-center gap-2" :class="{ 'opacity-0': orderSubmitting }">
                    <span>{{ orderSubmitting ? storefrontContent.productForm.cod.submitting : storefrontContent.productForm.cod.submit }}</span>
                    <Icon name="lucide:arrow-right" class="w-5 h-5 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 transition-transform" />
                </span>
                            
                <div v-if="orderSubmitting" class="absolute inset-0 flex items-center justify-center">
                    <Icon name="lucide:loader-2" class="animate-spin h-6 w-6 text-white" />
                </div>
                </button>
            </form>
        </div>

        <!-- Add to Cart Button (Only if Cart is Enabled) -->
        <div v-if="cartEnabled">
            <button 
                type="button"
                :disabled="addToCartSubmitting || !canPurchase"
                class="w-full h-14 bg-white border border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white text-sm font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3"
                @click="handleAddToCart"
            >
                    <Icon name="lucide:shopping-bag" class="w-5 h-5" />
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
            class="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-6 py-4 shadow-xl flex items-center gap-4 border border-slate-700"
        >
            <div class="w-6 h-6 flex items-center justify-center text-white shrink-0">
            <Icon name="lucide:check" class="w-5 h-5" />
            </div>
            <div>
            <div class="font-bold text-sm uppercase tracking-wider">{{ successTitle }}</div>
            <div class="text-xs text-slate-300">{{ successMessage }}</div>
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
    0%, 100% { border-color: #cbd5e1; background-color: white; }
    50% { border-color: #0f172a; background-color: #f8fafc; }
}
</style>
