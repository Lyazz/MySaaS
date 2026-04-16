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

const totalPrice = computed(() => (props.currentPrice || 0) * quantity.value)
const hasVariants = computed(() => Array.isArray(props.product?.variants) && props.product.variants.length > 0)
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
    SELF: { label: storefrontContent.value.checkout.delivery.provider.self, icon: 'lucide:bike', color: 'teal' }
  }
  return allowed.map((key: string) => ({ key, ...providerMeta[key as keyof typeof providerMeta] }))
})

const maystroPrices = useMaystroDeliveryPrices({
  wilayaCode: () => quickForm.wilaya,
  communeCode: () => quickForm.commune
})

const deliveryOptions = computed(() => {
  const options: any[] = []
  availableProviders.value.forEach((provider: any) => {
    const homePrice = provider.key === 'MAYSTRO' && maystroPrices.homePrice.value != null
      ? String(Math.round(maystroPrices.homePrice.value)) : provider.key === 'MAYSTRO' ? '—' : '350'
    const officePrice = provider.key === 'MAYSTRO' && maystroPrices.officePrice.value != null
      ? String(Math.round(maystroPrices.officePrice.value)) : provider.key === 'MAYSTRO' ? '—' : '300'
    options.push({ id: `${provider.key}-home`, provider: provider.key, providerLabel: provider.label, mode: 'home', modeLabel: storefrontContent.value.checkout.delivery.mode.homeDelivery, icon: provider.icon, color: provider.color, price: homePrice, description: storefrontContent.value.checkout.delivery.description.homeDelivery })
    options.push({ id: `${provider.key}-pickup`, provider: provider.key, providerLabel: provider.label, mode: 'pickup', modeLabel: storefrontContent.value.checkout.delivery.mode.pickupPoint, icon: provider.icon, color: provider.color, price: officePrice, description: storefrontContent.value.checkout.delivery.description.pickupPoint })
  })
  if (storeSettings.value?.storePickupEnabled === true) {
    options.push({ id: 'store-pickup', provider: null, providerLabel: 'Store', mode: 'store', modeLabel: storefrontContent.value.checkout.delivery.mode.storePickup, icon: 'lucide:store', color: 'green', price: 'FREE', description: storefrontContent.value.checkout.delivery.description.storePickup })
  }
  return options
})

const selectedDelivery = computed(() => deliveryOptions.value.find((opt: any) => opt.id === quickForm.selectedDeliveryOption))
const isMaystroPickup = computed(() => selectedDelivery.value?.provider === 'MAYSTRO' && selectedDelivery.value?.mode === 'pickup')
const pickupPoints = ref<Array<{ pickup_point: number; commune: number; name?: string; name_lt?: string; name_ar?: string }>>([])
const pickupPointsLoading = ref(false)
const pickupPointsError = ref('')

const syncPickupPointCommune = () => {
  const name = (quickForm.pickupPoint || '').trim()
  if (!name) return
  const point = pickupPoints.value.find((p) => (p.name_lt || p.name_ar || '') === name)
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

watch([isMaystroPickup, () => quickForm.commune, () => quickForm.wilaya], async ([enabled, commune, wilaya]) => {
  pickupPointsError.value = ''
  pickupPoints.value = []
  if (!enabled) { quickForm.pickupPoint = ''; return }
  if (!wilaya || !commune) return
  pickupPointsLoading.value = true
  try {
    const url = useTenantApiUrl(`/api/delivery/maystro/pickup-points?commune=${encodeURIComponent(commune)}&wilaya=${encodeURIComponent(wilaya)}&deliveryType=2&nearby=true`)
    const data = await $fetch<any[]>(url, { headers: { ...(useTenantApiHeaders() || {}) } })
    pickupPoints.value = Array.isArray(data)
      ? data.map((p: any) => ({ pickup_point: Number(p?.pickup_point), commune: Number(p?.commune), name: p?.name ? String(p.name) : undefined, name_lt: p?.name_lt ? String(p.name_lt) : undefined, name_ar: p?.name_ar ? String(p.name_ar) : undefined })).filter((p) => Number.isFinite(p.commune) && p.commune > 0)
      : []
    if (pickupPoints.value.length > 0) {
      const current = (quickForm.pickupPoint || '').trim()
      if (!current || !pickupPoints.value.some((p) => (p.name_lt || p.name_ar || '') === current)) {
        quickForm.pickupPoint = pickupPoints.value[0].name_lt || pickupPoints.value[0].name_ar || ''
        syncPickupPointCommune()
      }
    }
  } catch (e: any) {
    pickupPoints.value = []
    pickupPointsError.value = e?.data?.statusMessage || e?.data?.message || 'Failed to load pickup points'
  } finally { pickupPointsLoading.value = false }
}, { immediate: true })

onMounted(() => { cartStore.loadFromLocalStorage() })
watch(() => props.currentVariant, () => { quantity.value = 1 })
watch([() => props.currentStock, () => props.currentVariant], () => {
  if (!canPurchase.value) { quantity.value = 1; return }
  if (maxQuantity.value > 0 && quantity.value > maxQuantity.value) quantity.value = Math.max(1, maxQuantity.value)
})

function getVariantTitle(variant: any) {
  if (!variant.optionValues || variant.optionValues.length === 0) return ''
  let values = [...variant.optionValues]
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
  orderError.value = ''
  if (!canPurchase.value) { orderError.value = storefrontContent.value.productForm.errors.outOfStockVariant; return }
  if (codEnabled.value && !quickForm.fullName.trim()) { orderError.value = storefrontContent.value.checkout.errors.fullNameRequired; return }
  if (codEnabled.value && !quickForm.phone.trim()) { orderError.value = storefrontContent.value.checkout.errors.phoneRequired; return }
  if (codEnabled.value && !quickForm.selectedDeliveryOption) { orderError.value = storefrontContent.value.checkout.errors.deliveryRequired; return }
  orderSubmitting.value = true
  try {
    const delivery = selectedDelivery.value
    const isMaystro = delivery?.provider === 'MAYSTRO'
    const maystroServiceLevel = delivery?.mode === 'pickup' ? 'office' : 'home'
    const maystroShippingAmount = isMaystro ? (maystroServiceLevel === 'office' ? maystroPrices.officePrice.value : maystroPrices.homePrice.value) : null
    if (isMaystro) {
      if (!quickForm.wilaya || !quickForm.commune) { orderError.value = storefrontContent.value.checkout.errors.deliveryRequired; orderSubmitting.value = false; return }
      if (delivery?.mode === 'pickup' && !String(quickForm.pickupPoint || '').trim()) { orderError.value = storefrontContent.value.checkout.errors.deliveryRequired; orderSubmitting.value = false; return }
      if (maystroShippingAmount == null) { orderError.value = 'Maystro shipping price unavailable for selected commune'; orderSubmitting.value = false; return }
    }
    const payload = {
      customerName: quickForm.fullName.trim(), customerPhone: quickForm.phone.trim(),
      customerAddress: quickForm.address?.trim() || undefined, shippingAddressLine1: quickForm.address?.trim() || undefined,
      shippingWilayaCode: quickForm.wilaya || undefined, shippingCommuneCode: quickForm.commune || undefined,
      deliveryMode: delivery?.mode, shippingProvider: delivery?.provider || undefined,
      shippingPickupPoint: isMaystro && delivery?.mode === 'pickup' ? (quickForm.pickupPoint || undefined) : undefined,
      shippingServiceLevel: isMaystro ? maystroServiceLevel : undefined,
      shippingAmount: isMaystro && maystroShippingAmount != null ? maystroShippingAmount : undefined,
      shippingCurrency: isMaystro ? currencyCode.value : undefined,
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
  if (!canPurchase.value) { triggerSuccessToast(storefrontContent.value.actions.outOfStock, storefrontContent.value.toasts.outOfStock.message); return }
  addToCartSubmitting.value = true
  const variantLabel = props.currentVariant ? getVariantTitle(props.currentVariant) : ''
  cartStore.addItem({ productId: props.product.id, variantId: props.currentVariant?.id, title: props.product.title + (variantLabel ? ` (${variantLabel})` : ''), slug: props.product.slug, price: props.currentPrice, bundleDeals: props.product?.bundleDeals || [], stock: cartStockCap.value, image: props.activeImage, quantity: quantity.value, metaPixelIds: (props.product as any)?.metaPixelIds })
  triggerSuccessToast(storefrontContent.value.toasts.addedToCart.title, storefrontContent.value.toasts.addedToCart.message)
  addToCartSubmitting.value = false
}
</script>

<template>
  <div class="space-y-5">
    <!-- Quantity Selector -->
    <div class="flex items-center justify-between p-4 border border-[#E8E0D4] bg-white">
      <div class="flex flex-col gap-0.5">
        <span class="text-xs tracking-[0.12em] uppercase text-[#7A6558]">{{ storefrontContent.productForm.quantity.label }}</span>
        <span v-if="product?.isActive === false" class="text-xs text-[#B0A090]">{{ storefrontContent.productForm.stock.unavailable }}</span>
        <span v-else-if="isOutOfStock" class="text-xs text-red-500 font-medium">{{ storefrontContent.productForm.stock.outOfStock }}</span>
        <span v-else-if="isLowStock" class="text-xs text-amber-600 font-medium">{{ storefrontContent.productForm.stock.lowStock(maxQuantity) }}</span>
        <span v-else class="text-xs text-green-600 font-medium">{{ storefrontContent.product.inStock }}</span>
      </div>
      <div class="flex items-center border border-[#E8E0D4]">
        <button
          type="button"
          class="w-9 h-9 flex items-center justify-center text-[#7A6558] hover:text-[#2C2420] transition-colors disabled:opacity-30"
          :disabled="!canPurchase || quantity <= 1"
          @click="decrementQuantity"
        >
          <Icon name="lucide:minus" class="w-3 h-3" />
        </button>
        <span class="w-10 text-center text-sm font-medium text-[#2C2420]">{{ quantity }}</span>
        <button
          type="button"
          class="w-9 h-9 flex items-center justify-center text-[#7A6558] hover:text-[#2C2420] transition-colors disabled:opacity-30"
          :disabled="!canPurchase || (maxQuantity > 0 && quantity >= maxQuantity)"
          @click="incrementQuantity"
        >
          <Icon name="lucide:plus" class="w-3 h-3" />
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
      class="border border-[#E8E0D4] bg-white p-6"
    >
      <div class="flex items-center gap-3 mb-6 pb-4 border-b border-[#E8E0D4]">
        <div class="w-9 h-9 bg-[#C17B4E]/10 flex items-center justify-center">
          <Icon name="lucide:banknote" class="w-4 h-4 text-[#C17B4E]" />
        </div>
        <div>
          <h3 class="text-sm font-medium text-[#2C2420]">{{ storefrontContent.productForm.cod.title }}</h3>
          <span class="text-[10px] text-[#B0A090] tracking-wider uppercase">{{ storefrontContent.productForm.cod.badge }}</span>
        </div>
      </div>

      <form class="space-y-4" @submit.prevent="handleOrderSubmit">
        <div>
          <label class="block text-xs text-[#7A6558] mb-2">{{ storefrontContent.checkout.form.fullName.label }}</label>
          <input
            v-model="quickForm.fullName"
            type="text"
            :placeholder="storefrontContent.checkout.form.fullName.placeholder"
            class="block w-full border border-[#E8E0D4] bg-[#FAF8F5] px-4 py-3 text-sm text-[#2C2420] placeholder:text-[#B0A090] focus:border-[#C17B4E] focus:ring-1 focus:ring-[#C17B4E]/20 outline-none transition-colors"
          >
        </div>

        <div>
          <label class="block text-xs text-[#7A6558] mb-2">{{ storefrontContent.checkout.form.phone.label }}</label>
          <input
            v-model="quickForm.phone"
            type="tel"
            :placeholder="storefrontContent.checkout.form.phone.placeholder"
            class="block w-full border border-[#E8E0D4] bg-[#FAF8F5] px-4 py-3 text-sm text-[#2C2420] placeholder:text-[#B0A090] focus:border-[#C17B4E] focus:ring-1 focus:ring-[#C17B4E]/20 outline-none transition-colors"
          >
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-[#7A6558] mb-2">{{ storefrontContent.checkout.form.wilaya.label }}</label>
            <div class="relative">
              <select
                v-model="quickForm.wilaya"
                class="block w-full border border-[#E8E0D4] bg-[#FAF8F5] px-3 py-3 text-sm text-[#2C2420] focus:border-[#C17B4E] outline-none appearance-none cursor-pointer"
              >
                <option value="" disabled>{{ storefrontContent.common.selectPlaceholder }}</option>
                <option v-for="w in wilayas" :key="w.code" :value="w.code">{{ w.code }} - {{ w.name }}</option>
              </select>
              <Icon name="lucide:chevron-down" class="w-3 h-3 text-[#B0A090] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div>
            <label class="block text-xs text-[#7A6558] mb-2">{{ storefrontContent.checkout.form.commune.label }}</label>
            <CommuneField
              v-model="quickForm.commune"
              :wilaya-code="quickForm.wilaya"
              :placeholder="storefrontContent.checkout.form.commune.placeholder"
              :input-class="'block w-full border border-[#E8E0D4] bg-[#FAF8F5] px-3 py-3 text-sm text-[#2C2420] placeholder:text-[#B0A090] focus:border-[#C17B4E] outline-none transition-colors'"
              :select-class="'block w-full border border-[#E8E0D4] bg-[#FAF8F5] px-3 py-3 text-sm text-[#2C2420] focus:border-[#C17B4E] outline-none transition-colors'"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs text-[#7A6558] mb-2">{{ storefrontContent.checkout.form.address.label }}</label>
          <input
            v-model="quickForm.address"
            type="text"
            :placeholder="storefrontContent.checkout.form.address.placeholder"
            class="block w-full border border-[#E8E0D4] bg-[#FAF8F5] px-4 py-3 text-sm text-[#2C2420] placeholder:text-[#B0A090] focus:border-[#C17B4E] outline-none transition-colors"
          >
        </div>

        <!-- Delivery options -->
        <div class="space-y-2 pt-2">
          <label class="block text-xs tracking-[0.12em] uppercase text-[#7A6558]">
            {{ storefrontContent.checkout.sections.deliveryOptions }}
          </label>
          <div
            v-for="option in deliveryOptions"
            :key="option.id"
            class="cursor-pointer p-3 border transition-all flex items-center justify-between gap-3"
            :class="quickForm.selectedDeliveryOption === option.id
              ? 'border-[#C17B4E] bg-[#C17B4E]/5'
              : 'border-[#E8E0D4] hover:border-[#D4C4B4]'"
            @click="quickForm.selectedDeliveryOption = option.id"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-[#F0EBE3] flex items-center justify-center shrink-0">
                <Icon :name="option.icon" class="w-4 h-4 text-[#7A6558]" />
              </div>
              <div>
                <p class="text-xs font-medium text-[#2C2420]">{{ option.providerLabel }}</p>
                <p class="text-[10px] text-[#B0A090]">{{ option.modeLabel }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-sm font-semibold text-[#C17B4E]">
                {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
              </span>
              <span
                class="w-3.5 h-3.5 border rounded-full flex items-center justify-center"
                :class="quickForm.selectedDeliveryOption === option.id ? 'border-[#C17B4E] bg-[#C17B4E]' : 'border-[#D4C4B4]'"
              >
                <Icon v-if="quickForm.selectedDeliveryOption === option.id" name="lucide:check" class="w-2 h-2 text-white" />
              </span>
            </div>
          </div>

          <!-- Maystro pickup point -->
          <div v-if="isMaystroPickup" class="mt-2">
            <div v-if="pickupPointsLoading" class="flex items-center gap-2 px-3 py-2.5 border border-[#E8E0D4] text-xs text-[#7A6558]">
              <Icon name="lucide:loader-2" class="w-3 h-3 animate-spin" /> Chargement...
            </div>
            <div v-else-if="quickForm.pickupPoint" class="flex items-center gap-2 px-3 py-2.5 border border-[#E8E0D4] bg-[#F0EBE3] text-sm text-[#2C2420]">
              <Icon name="lucide:map-pin" class="w-3 h-3 text-[#C17B4E] shrink-0" />
              {{ quickForm.pickupPoint }}
            </div>
            <p v-if="pickupPointsError" class="text-xs text-amber-600 mt-1">{{ pickupPointsError }}</p>
          </div>
        </div>

        <!-- Error -->
        <div v-if="orderError" class="p-3 border border-red-200 bg-red-50 text-red-600 text-xs">{{ orderError }}</div>

        <!-- Total -->
        <div class="flex items-center justify-between p-3 bg-[#F0EBE3]">
          <span class="text-xs text-[#7A6558]">{{ storefrontContent.productForm.totalPrice }}</span>
          <span class="font-bold text-lg text-[#C17B4E]">{{ formatCurrency(totalPrice + (selectedDelivery?.price && selectedDelivery?.price !== 'FREE' && selectedDelivery?.price !== '—' ? Number(selectedDelivery.price) : 0)) }}</span>
        </div>

        <button
          type="submit"
          :disabled="orderSubmitting || !canPurchase"
          class="w-full bg-[#2C2420] text-white text-xs tracking-[0.2em] uppercase py-4 hover:bg-[#C17B4E] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Icon v-if="orderSubmitting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
          {{ orderSubmitting ? storefrontContent.productForm.cod.submitting : storefrontContent.productForm.cod.submit }}
        </button>
      </form>
    </div>

    <!-- Add to Cart -->
    <div v-if="cartEnabled">
      <button
        type="button"
        :disabled="addToCartSubmitting || !canPurchase"
        class="w-full border border-[#2C2420] text-[#2C2420] text-xs tracking-[0.2em] uppercase py-4 hover:bg-[#2C2420] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        @click="handleAddToCart"
      >
        <Icon name="lucide:shopping-bag" class="w-4 h-4" />
        {{ addToCartSubmitting ? storefrontContent.actions.adding : storefrontContent.actions.addToCart }}
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
        class="fixed bottom-4 right-4 z-50 bg-white px-5 py-4 shadow-2xl border border-[#E8E0D4] flex items-center gap-4"
      >
        <div class="w-8 h-8 bg-[#C17B4E]/10 flex items-center justify-center shrink-0">
          <Icon name="lucide:check" class="w-4 h-4 text-[#C17B4E]" />
        </div>
        <div>
          <div class="text-sm font-medium text-[#2C2420]">{{ successTitle }}</div>
          <div class="text-xs text-[#7A6558]">{{ successMessage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
