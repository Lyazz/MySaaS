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
const { currencyCode, format: formatCurrency } = useCurrency()
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
const isMaystroAvailable = computed(() => availableProviders.value.some((p: any) => p.key === 'MAYSTRO'))
const pickupPoints = ref<Array<{ pickup_point: number; commune: number; name?: string; name_lt?: string; name_ar?: string; delivery_type: number }>>([])
const pickupPointsLoading = ref(false)
const pickupPointsError = ref('')
const stopDeskName = ref('')

const syncPickupPointCommune = () => {
  const name = (quickForm.pickupPoint || '').trim()
  if (!name) return
  const point = pickupPoints.value.filter(p => p.delivery_type === 3).find((p) => (p.name || p.name_lt || p.name_ar || '') === name)
  if (!point?.commune) return
  const nextCommune = String(point.commune)
  if (nextCommune && quickForm.commune !== nextCommune) quickForm.commune = nextCommune
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
  [isMaystroPickup, isMaystroAvailable, () => quickForm.commune, () => quickForm.wilaya],
  async ([isPickup, maystroEnabled, commune, wilaya]) => {
    pickupPointsError.value = ''
    pickupPoints.value = []
    stopDeskName.value = ''
    if (!isPickup) quickForm.pickupPoint = ''
    if (!maystroEnabled || !wilaya || !commune) return

    pickupPointsLoading.value = true
    try {
      const url = useTenantApiUrl(
        `/api/delivery/maystro/pickup-points?commune=${encodeURIComponent(commune as string)}&wilaya=${encodeURIComponent(wilaya as string)}&nearby=true`
      )
      const data = await $fetch<any[]>(url, {
        headers: { ...(useTenantApiHeaders() || {}) }
      })
      pickupPoints.value = Array.isArray(data)
        ? data.map((p: any) => ({
            pickup_point: Number(p?.pickup_point),
            commune: Number(p?.commune),
            name: p?.name ? String(p.name) : (p?.name_lt ? String(p.name_lt) : (p?.name_ar ? String(p.name_ar) : undefined)),
            name_lt: p?.name_lt ? String(p.name_lt) : undefined,
            name_ar: p?.name_ar ? String(p.name_ar) : undefined,
            delivery_type: Number(p?.delivery_type)
          })).filter((p) => Number.isFinite(p.commune) && p.commune > 0)
        : []
      const stopDesk = pickupPoints.value.find(p => p.delivery_type === 2)
      stopDeskName.value = stopDesk ? (stopDesk.name || stopDesk.name_lt || stopDesk.name_ar || '') : ''
      if (isPickup) {
        const relaisPoints = pickupPoints.value.filter(p => p.delivery_type === 3)
        if (relaisPoints.length > 0) {
          const current = (quickForm.pickupPoint || '').trim()
          if (!current || !relaisPoints.some((p) => (p.name || p.name_lt || p.name_ar || '') === current)) {
            quickForm.pickupPoint = relaisPoints[0].name || relaisPoints[0].name_lt || relaisPoints[0].name_ar || ''
            syncPickupPointCommune()
          }
        } else {
          quickForm.pickupPoint = ''
        }
      }
    } catch (e: any) {
      pickupPoints.value = []
      pickupPointsError.value = e?.data?.statusMessage || e?.data?.message || 'Failed to load pickup points'
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
          if (delivery?.mode === 'pickup' && !String(quickForm.pickupPoint || '').trim() && !stopDeskName.value) {
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
  <div class="space-y-6">
    <!-- Quantity Selector -->
    <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
      <div class="flex flex-col gap-0.5">
        <span class="font-medium text-slate-700">{{ storefrontContent.productForm.quantity.label }}</span>
        <span v-if="product?.isActive === false" class="text-xs text-slate-400">{{ storefrontContent.productForm.stock.unavailable }}</span>
        <span v-else-if="isOutOfStock" class="text-xs text-red-500 font-medium">{{ storefrontContent.productForm.stock.outOfStock }}</span>
        <span v-else-if="isLowStock" class="text-xs text-amber-600 font-medium">
          {{ storefrontContent.productForm.stock.lowStock(maxQuantity) }}
        </span>
        <span v-else class="text-xs text-green-600 font-medium">{{ storefrontContent.product.inStock }}</span>
      </div>
      <div class="flex items-center bg-white rounded-full border border-slate-200">
        <button 
          type="button"
          class="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-l-full transition-colors disabled:opacity-30"
          :disabled="!canPurchase || quantity <= 1"
          @click="decrementQuantity"
        >
          <Icon name="lucide:minus" class="w-4 h-4 text-slate-500" />
        </button>
        <span class="w-12 text-center font-bold text-slate-700">{{ quantity }}</span>
        <button 
          type="button"
          class="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-r-full transition-colors disabled:opacity-30"
          :disabled="!canPurchase || (maxQuantity > 0 && quantity >= maxQuantity)"
          @click="incrementQuantity"
        >
          <Icon name="lucide:plus" class="w-4 h-4 text-slate-500" />
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
      class="bg-white p-6 rounded-[2rem] shadow-soft border border-slate-100"
    >
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-full flex items-center justify-center bg-brand-100 text-brand-500">
          <Icon name="lucide:banknote" class="w-5 h-5" />
        </div>
        <div>
          <h3 class="font-bold text-slate-800">{{ storefrontContent.productForm.cod.title }}</h3>
          <span class="text-xs text-slate-400">{{ storefrontContent.productForm.cod.badge }}</span>
        </div>
      </div>
      
      <form class="space-y-4" @submit.prevent="handleOrderSubmit">
        <div>
          <label class="block text-sm font-medium text-slate-600 mb-2">{{ storefrontContent.checkout.form.fullName.label }}</label>
          <input 
            v-model="quickForm.fullName"
            type="text" 
            :placeholder="storefrontContent.checkout.form.fullName.placeholder" 
            class="block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all"
          >
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-600 mb-2">{{ storefrontContent.checkout.form.phone.label }}</label>
          <input
            v-model="quickForm.phone"
            type="tel"
            :placeholder="storefrontContent.checkout.form.phone.placeholder"
            class="block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all"
          >
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-2">{{ storefrontContent.checkout.form.wilaya.label }}</label>
            <div class="relative">
              <select
                v-model="quickForm.wilaya"
                class="block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none appearance-none cursor-pointer"
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
              <div class="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Icon name="lucide:chevron-down" class="w-4 h-4 rtl:rotate-180" />
              </div>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-2">{{ storefrontContent.checkout.form.commune.label }}</label>
            <CommuneField
              v-model="quickForm.commune"
              :wilaya-code="quickForm.wilaya"
              :placeholder="storefrontContent.checkout.form.commune.placeholder"
              :input-class="'block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all'"
              :select-class="'block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all'"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-600 mb-2">{{ storefrontContent.checkout.form.address.label }}</label>
          <input
            v-model="quickForm.address"
            type="text"
            :placeholder="storefrontContent.checkout.form.address.placeholder"
            class="block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all"
          >
        </div>
                <div v-if="quickForm.wilaya && quickForm.commune" class="space-y-3 mt-6">
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
                        v-if="isMaystroAvailable && (pickupPointsLoading || stopDeskName || isMaystroPickup)"
                        class="space-y-2 mt-4"
                    >
                        <label class="block text-sm font-semibold text-slate-700 ml-1 rtl:ml-0 rtl:mr-1">
                            {{ storefrontContent.checkout.delivery.mode.pickupPoint }}
                        </label>
                        <div
                            v-if="pickupPointsLoading"
                            class="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500"
                        >
                            <Icon name="lucide:loader-2" class="w-4 h-4 animate-spin shrink-0" />
                            Loading…
                        </div>
                        <template v-else>
                            <div
                                v-if="stopDeskName"
                                class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500"
                            >
                                <Icon name="lucide:building-2" class="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{{ stopDeskName }}</span>
                            </div>
                            <div
                                v-if="isMaystroPickup && quickForm.pickupPoint"
                                class="flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-200 bg-blue-50"
                            >
                                <Icon name="lucide:map-pin" class="w-4 h-4 text-blue-600 shrink-0" />
                                <span class="text-sm font-semibold text-slate-900">
                                    {{ quickForm.pickupPoint }}
                                </span>
                            </div>
                        </template>
                        <p v-if="pickupPointsError" class="text-xs text-amber-700">
                            {{ pickupPointsError }}
                        </p>
                    </div>
                </div>
                <div v-else class="mt-6 px-4 py-3 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    <Icon name="lucide:map-pin" class="w-4 h-4 mx-auto mb-1 text-slate-300" />
                    {{ storefrontContent.checkout.help.deliveryOptions }}
                </div>



        <div
          v-if="orderError"
          class="p-3 bg-red-50 rounded-xl text-red-600 text-sm"
        >
          {{ orderError }}
        </div>

        <!-- Total Price Display -->
        <div class="flex items-center justify-between p-4 bg-brand-50 rounded-xl">
          <span class="text-slate-600 font-medium">{{ storefrontContent.productForm.totalPrice }}</span>
          <span class="font-bold text-xl text-brand-500">{{ formatCurrency(totalPrice + (selectedDelivery?.price && selectedDelivery?.price !== 'FREE' && selectedDelivery?.price !== '—' ? Number(selectedDelivery.price) : 0)) }}</span>
        </div>

        <button 
          type="submit"
          :disabled="orderSubmitting || !canPurchase"
          class="w-full bg-brand-500 text-white font-bold py-4 rounded-full shadow-lg shadow-brand-200 hover:bg-brand-600 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Icon v-if="orderSubmitting" name="lucide:loader-2" class="w-5 h-5 animate-spin" />
          <span>{{ orderSubmitting ? storefrontContent.productForm.cod.submitting : storefrontContent.productForm.cod.submit }}</span>
        </button>
      </form>
    </div>

    <!-- Add to Cart Button -->
    <div v-if="cartEnabled">
      <button 
        type="button"
        :disabled="addToCartSubmitting || !canPurchase"
        class="w-full bg-slate-800 text-white font-bold py-4 rounded-full hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        @click="handleAddToCart"
      >
        <Icon name="lucide:handbag" class="w-5 h-5" />
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
        class="fixed bottom-4 right-4 z-50 bg-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-4"
      >
        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
          <Icon name="lucide:check" class="w-5 h-5 text-green-600" />
        </div>
        <div>
          <div class="font-bold text-slate-800">{{ successTitle }}</div>
          <div class="text-sm text-slate-500">{{ successMessage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
