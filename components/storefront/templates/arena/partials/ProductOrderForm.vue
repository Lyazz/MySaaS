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
    SELF: { label: storefrontContent.value.checkout.delivery.provider.self, icon: 'lucide:bike', color: 'lime' }
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
        <!-- Quantity Selector (Global for both COD and Cart) -->
        <div class="flex items-center justify-between p-4 bg-[#0b0f14] rounded-2xl border border-white/10 shadow-sm mb-6">
            <div class="flex flex-col gap-0.5">
                <span class="font-semibold text-slate-300">{{ storefrontContent.productForm.quantity.label }}</span>
                <span v-if="product?.isActive === false" class="text-xs font-semibold text-slate-500">{{ storefrontContent.productForm.stock.unavailable }}</span>
                <span v-else-if="isOutOfStock" class="text-xs font-semibold text-red-700">{{ storefrontContent.productForm.stock.outOfStock }}</span>
                <span v-else-if="isLowStock" class="text-xs font-semibold text-amber-700">
                    {{ storefrontContent.productForm.stock.lowStock(maxQuantity) }}
                </span>
                <span v-else class="text-xs font-semibold text-emerald-700">{{ storefrontContent.product.inStock }}</span>
            </div>
            <div class="flex items-center bg-[#06080c] rounded-xl shadow-inner border border-white/10 p-1">
                <button 
                    type="button"
                    class="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-white/[0.06] rounded-lg transition-colors"
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
                    class="w-12 text-center border-none bg-transparent font-bold text-white focus:ring-0 p-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    readonly
                >
                <button 
                    type="button"
                    class="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-white/[0.06] rounded-lg transition-colors"
                    :disabled="!canPurchase || (maxQuantity > 0 && quantity >= maxQuantity)"
                    @click="incrementQuantity"
                >
                    <Icon name="lucide:plus" class="w-4 h-4" />
                </button>
            </div>
        </div>

        <!-- Testimonial / Social Proof -->
        <div class="mb-6 bg-brand-500/10/50 rounded-2xl p-4 border border-brand-100 flex items-center gap-4 shadow-sm relative overflow-hidden">
            <!-- Subtle background shine -->
            <div class="absolute top-0 right-0 -m-4 w-24 h-24 bg-brand-200/30 rounded-full blur-2xl"></div>
            
            <div class="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 relative z-10">
                <img src="https://i.pravatar.cc/100?img=5" alt="Customer" class="w-full h-full object-cover">
            </div>
            <div class="relative z-10">
                <p class="text-sm font-bold text-slate-200 leading-tight">"Loved it, will buy again!"</p>
                <div class="flex text-amber-400 my-0.5 drop-shadow-sm">
                    <Icon name="lucide:star" class="w-3 h-3 fill-current" />
                    <Icon name="lucide:star" class="w-3 h-3 fill-current" />
                    <Icon name="lucide:star" class="w-3 h-3 fill-current" />
                    <Icon name="lucide:star" class="w-3 h-3 fill-current" />
                    <Icon name="lucide:star" class="w-3 h-3 fill-current" />
                </div>
                <p class="text-xs text-slate-500 font-medium">Susanae from NY city just bought one!</p>
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
            ref="mainOrderFormRef"
            data-test="cod-order-card"
            class="bg-[#0b0f14] rounded-3xl p-6 md:p-8 shadow-soft border border-white/[0.06] relative overflow-hidden"
        >
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-brand-600" />
            
            <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 shadow-sm ring-1 ring-brand-100">
                <Icon name="lucide:banknote" class="w-5 h-5" />
                </div>
                <div>
                <h3 class="font-sans font-bold text-white text-xl leading-none">{{ storefrontContent.productForm.cod.title }}</h3>
                <span class="text-xs text-slate-500 font-medium">{{ storefrontContent.productForm.cod.badge }}</span>
                </div>
            </div>
            
            <form class="space-y-5" @submit.prevent="handleOrderSubmit">
                <div class="space-y-2">
                <label class="block text-sm font-semibold text-slate-300 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.fullName.label }}</label>
                <input 
                    v-model="quickForm.fullName"
                    type="text" 
                    :placeholder="storefrontContent.checkout.form.fullName.placeholder" 
                    class="block w-full h-12 rounded-xl border border-white/10 bg-[#0b0f14] px-4 text-white placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                    :class="{ 'animate-attention': !quickForm.fullName }"
                >
                </div>
                
                <div class="space-y-2">
                <label class="block text-sm font-semibold text-slate-300 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.phone.label }}</label>
                <input
                    v-model="quickForm.phone"
                    type="tel"
                    :placeholder="storefrontContent.checkout.form.phone.placeholder"
                    class="block w-full h-12 rounded-xl border border-white/10 bg-[#0b0f14] px-4 text-white placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                >
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                    <label class="block text-sm font-semibold text-slate-300 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                    <div class="relative">
                    <select
                        v-model="quickForm.wilaya"
                        class="block w-full h-12 rounded-xl border border-white/10 bg-[#0b0f14] px-4 text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none appearance-none cursor-pointer shadow-sm"
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
                    <label class="block text-sm font-semibold text-slate-300 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.commune.label }}</label>
                    <CommuneField
                        v-model="quickForm.commune"
                        :wilaya-code="quickForm.wilaya"
                        :placeholder="storefrontContent.checkout.form.commune.placeholder"
                        :input-class="'block w-full h-12 rounded-xl border border-white/10 bg-[#0b0f14] px-4 text-white placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm'"
                        :select-class="'block w-full h-12 rounded-xl border border-white/10 bg-[#0b0f14] px-4 text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm'"
                    />
                </div>
                </div>

                <div v-if="!hideOptionalAddress" class="space-y-2">
                    <label class="block text-sm font-semibold text-slate-300 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.address.label }}</label>
                    <input
                        v-model="quickForm.address"
                        type="text"
                        :placeholder="storefrontContent.checkout.form.address.placeholder"
                        class="block w-full h-12 rounded-xl border border-white/10 bg-[#0b0f14] px-4 text-white placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                    >
                </div>

                <div v-if="quickForm.wilaya && quickForm.commune" class="space-y-3 mt-6">
                    <label class="block text-sm font-semibold text-slate-300 ml-1 rtl:ml-0 rtl:mr-1">
                        {{ storefrontContent.checkout.sections.deliveryOptions }}
                    </label>
                    <div 
                        v-for="option in deliveryOptions"
                        :key="option.id"
                        class="cursor-pointer relative rounded-2xl p-4 border-2 transition-all duration-300 group hover:scale-[1.005]"
                        :class="quickForm.selectedDeliveryOption === option.id 
                        ? 'border-brand-500 bg-brand-500/10/50 shadow-md' 
                        : 'border-white/[0.06] hover:border-brand-200 hover:shadow-sm'"
                        @click="quickForm.selectedDeliveryOption = option.id"
                    >
                        <div class="flex items-center gap-4">
                        <div 
                            class="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
                            :class="quickForm.selectedDeliveryOption === option.id 
                            ? `bg-${option.color}-100` 
                            : 'bg-[#0b0f14] group-hover:bg-[#111820]'"
                        >
                            <Icon 
                            :name="option.icon" 
                            class="w-7 h-7 transition-colors duration-300"
                            :class="quickForm.selectedDeliveryOption === option.id 
                                ? `text-${option.color}-600` 
                                : 'text-slate-400 group-hover:text-slate-400'"
                            />
                        </div>
                        
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                            <h4 class="font-bold text-white text-sm">
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
                            <div class="font-bold text-brand-500 text-base">
                                {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
                            </div>
                            </div>
                            <span
                            class="block w-5 h-5 rounded-full border-2 transition-colors duration-300 flex-shrink-0"
                            :class="quickForm.selectedDeliveryOption === option.id 
                                ? 'border-brand-600 bg-brand-500 ring-4 ring-brand-100' 
                                : 'border-white/15'"
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
                        <label class="block text-sm font-semibold text-slate-300 ml-1 rtl:ml-0 rtl:mr-1">
                            {{ storefrontContent.checkout.delivery.mode.pickupPoint }}
                        </label>
                        <div
                            v-if="pickupPointsLoading"
                            class="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-[#06080c] text-sm text-slate-500"
                        >
                            <Icon name="lucide:loader-2" class="w-4 h-4 animate-spin shrink-0" />
                            Loading…
                        </div>
                        <template v-else>
                            <div
                                v-if="stopDeskName"
                                class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-[#06080c] text-sm text-slate-500"
                            >
                                <Icon name="lucide:building-2" class="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{{ stopDeskName }}</span>
                            </div>
                            <div
                                v-if="isMaystroPickup && quickForm.pickupPoint"
                                class="flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-200 bg-blue-50"
                            >
                                <Icon name="lucide:map-pin" class="w-4 h-4 text-blue-600 shrink-0" />
                                <span class="text-sm font-semibold text-white">
                                    {{ quickForm.pickupPoint }}
                                </span>
                            </div>
                        </template>
                        <p v-if="pickupPointsError" class="text-xs text-amber-700">
                            {{ pickupPointsError }}
                        </p>
                    </div>
                </div>
                <div v-else class="mt-6 px-4 py-3 border border-dashed border-white/10 text-center text-xs text-slate-400">
                    <Icon name="lucide:map-pin" class="w-4 h-4 mx-auto mb-1 text-slate-300" />
                    {{ storefrontContent.checkout.help.deliveryOptions }}
                </div>

                <div
                    v-if="orderError"
                    class="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm"
                >
                    {{ orderError }}
                </div>

                <!-- Total Price Display -->
                <div class="bg-[#06080c] rounded-xl border border-white/[0.06] p-4 space-y-3">
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-slate-500">{{ storefrontContent.cart.summary.subtotal }}</span>
                        <span class="font-bold text-slate-200">{{ formatAmount(totalPrice) }} {{ currencyCode }}</span>
                    </div>

                    <div v-if="selectedDelivery" class="flex items-center justify-between text-sm">
                        <span class="text-slate-500">{{ storefrontContent.checkout.summary.shippingFee }}</span>
                        <span class="font-bold text-brand-500">
                            {{ selectedDelivery.price === 'FREE' ? storefrontContent.checkout.delivery.free : (selectedDelivery.price === '—' ? '—' : `${selectedDelivery.price} ${currencyCode}`) }}
                        </span>
                    </div>

                    <div class="flex items-center justify-between pt-3 border-t border-white/10">
                        <span class="text-slate-300 font-bold">{{ storefrontContent.productForm.totalPrice }}</span>
                        <span class="text-xl font-bold text-brand-500">
                            {{ formatAmount(totalPrice + (selectedDelivery?.price && selectedDelivery?.price !== 'FREE' && selectedDelivery?.price !== '—' ? Number(selectedDelivery.price) : 0)) }} {{ currencyCode }}
                        </span>
                    </div>
                </div>

                <button 
                type="submit"
                :disabled="orderSubmitting || !canPurchase"
                class="w-full h-14 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-bold text-xl rounded-xl shadow-lg shadow-brand-500/30 hover:shadow-brand-600/50 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-3 mt-6 group overflow-hidden relative"
                >
                <!-- Animated Shine Effect -->
                <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shine z-0"></div>

                <span class="relative z-10 flex items-center gap-2" :class="{ 'opacity-0': orderSubmitting }">
                    <span>{{ orderSubmitting ? storefrontContent.productForm.cod.submitting : storefrontContent.productForm.cod.submit }}</span>
                    <Icon name="lucide:arrow-right" class="w-6 h-6 group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5 rtl:rotate-180 transition-transform duration-300" />
                </span>
                            
                <div v-if="orderSubmitting" class="absolute inset-0 flex items-center justify-center z-10">
                    <Icon name="lucide:loader-2" class="animate-spin h-6 w-6 text-white" />
                </div>
                </button>
            </form>
        </div>

        <!-- Add to Cart Button (Only if Cart is Enabled) -->
        <div v-if="cartEnabled" class="mt-4">
            <button 
                type="button"
                :disabled="addToCartSubmitting || !canPurchase"
                class="w-full h-14 bg-brand-500/10 border-2 border-brand-500 text-brand-400 hover:bg-brand-100 font-bold text-lg rounded-xl transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
                @click="handleAddToCart"
            >
                <Icon name="lucide:shopping-bag" class="w-5 h-5" />
                <span>{{ addToCartSubmitting ? storefrontContent.actions.adding : storefrontContent.actions.addToCart }}</span>
            </button>
        </div>

        <!-- Trust Badges -->
        <div class="mt-8 space-y-4">
            <p class="text-center font-semibold text-slate-400 text-sm mb-4">{{ $t('storefront.product.whyChooseUs') }}</p>
            <div class="grid grid-cols-3 gap-2">
                <div class="flex flex-col items-center text-center gap-2 p-2 rounded-xl bg-[#0b0f14] border border-white/[0.06] py-3 shadow-sm hover:shadow-md transition-shadow">
                    <div class="w-10 h-10 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center">
                        <Icon name="lucide:truck" class="w-5 h-5" />
                    </div>
                    <span class="text-[10px] font-bold text-slate-300 leading-tight">{{ $t('storefront.product.features.delivery') }}</span>
                </div>
                <div class="flex flex-col items-center text-center gap-2 p-2 rounded-xl bg-[#0b0f14] border border-white/[0.06] py-3 shadow-sm hover:shadow-md transition-shadow">
                    <div class="w-10 h-10 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center">
                        <Icon name="lucide:headset" class="w-5 h-5" />
                    </div>
                    <span class="text-[10px] font-bold text-slate-300 leading-tight">{{ $t('storefront.product.features.support') }}</span>
                </div>
                <div class="flex flex-col items-center text-center gap-2 p-2 rounded-xl bg-[#0b0f14] border border-white/[0.06] py-3 shadow-sm hover:shadow-md transition-shadow">
                    <div class="w-10 h-10 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center">
                        <Icon name="lucide:shield-check" class="w-5 h-5" />
                    </div>
                    <span class="text-[10px] font-bold text-slate-300 leading-tight">{{ $t('storefront.product.features.securePayment') }}</span>
                </div>
            </div>
            
            <div class="mt-6 flex items-center justify-center gap-4 text-slate-400">
                <Icon name="lucide:credit-card" class="h-6 w-auto" />
                <Icon name="lucide:smartphone" class="h-6 w-auto" />
                <Icon name="lucide:banknote" class="h-6 w-auto" />
            </div>
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
            class="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4 border border-slate-700/50 backdrop-blur-md bg-slate-900/95"
        >
            <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
            <Icon name="lucide:check" class="w-5 h-5" />
            </div>
            <div>
            <div class="font-bold">{{ successTitle }}</div>
            <div class="text-xs text-slate-300">{{ successMessage }}</div>
            </div>
        </div>
        </Transition>

        <!-- Mobile Sticky Buy Bar -->
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
            class="fixed bottom-0 left-0 right-0 z-40 bg-[#0b0f14] border-t border-white/10 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] p-4 md:hidden flex items-center justify-between gap-4"
        >
            <div class="flex flex-col">
                <span class="text-xs text-slate-500 font-medium">Total</span>
                <span class="text-xl font-bold text-brand-500 leading-none">{{ formatAmount(totalPrice + (selectedDelivery?.price && selectedDelivery?.price !== 'FREE' && selectedDelivery?.price !== '—' ? Number(selectedDelivery.price) : 0)) }} {{ currencyCode }}</span>
            </div>
            <button
                type="button"
                :disabled="!canPurchase"
                @click="scrollToForm"
                class="flex-1 h-12 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-lg shadow-brand-500/30 transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2 relative overflow-hidden group"
            >
                <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shine z-0"></div>
                <span class="relative z-10 flex items-center gap-2">
                    <span>{{ storefrontContent.productForm.cod.submit }}</span>
                    <Icon name="lucide:arrow-right" class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
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
    0%, 100% { border-color: #e2e8f0; box-shadow: 0 0 0 0 rgba(0,0,0,0); transform: scale(1); background-color: white; }
    50% { border-color: var(--brand); box-shadow: 0 0 20px -5px color-mix(in srgb, var(--brand), transparent 50%); transform: scale(1.02); background-color: color-mix(in srgb, var(--brand), white 98%); }
}
</style>
