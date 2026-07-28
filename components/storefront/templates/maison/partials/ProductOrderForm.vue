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
const hideOptionalAddress = computed(() => storeSettings.value?.hideOptionalAddress !== false)

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
    SELF: { label: storefrontContent.value.checkout.delivery.provider.self, icon: 'lucide:bike', color: 'lime' }
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
const isMaystroAvailable = computed(() => availableProviders.value.some((p: any) => p.key === 'MAYSTRO'))
const pickupPoints = ref<Array<{ pickup_point: number; commune: number; name?: string; name_lt?: string; name_ar?: string; delivery_type: number }>>([])
const pickupPointsLoading = ref(false)
const pickupPointsError = ref('')
const stopDeskName = ref('')

const syncPickupPointCommune = () => {
  const name = (quickForm.pickupPoint || '').trim()
  if (!name) return
  const point = pickupPoints.value.filter(p => p.delivery_type === 3).find((p) => (p.name_lt || p.name_ar || '') === name)
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

watch([isMaystroPickup, isMaystroAvailable, () => quickForm.commune, () => quickForm.wilaya], async ([isPickup, maystroEnabled, commune, wilaya]) => {
  pickupPointsError.value = ''
  pickupPoints.value = []
  stopDeskName.value = ''
  if (!isPickup) quickForm.pickupPoint = ''
  if (!maystroEnabled || !wilaya || !commune) return
  pickupPointsLoading.value = true
  try {
    const url = useTenantApiUrl(`/api/delivery/maystro/pickup-points?commune=${encodeURIComponent(commune as string)}&wilaya=${encodeURIComponent(wilaya as string)}&nearby=true`)
    const data = await $fetch<any[]>(url, { headers: { ...(useTenantApiHeaders() || {}) } })
    pickupPoints.value = Array.isArray(data)
      ? data.map((p: any) => ({ pickup_point: Number(p?.pickup_point), commune: Number(p?.commune), name: p?.name ? String(p.name) : undefined, name_lt: p?.name_lt ? String(p.name_lt) : undefined, name_ar: p?.name_ar ? String(p.name_ar) : undefined, delivery_type: Number(p?.delivery_type) })).filter((p) => Number.isFinite(p.commune) && p.commune > 0)
      : []
    const stopDesk = pickupPoints.value.find(p => p.delivery_type === 2)
    stopDeskName.value = stopDesk ? (stopDesk.name_lt || stopDesk.name_ar || stopDesk.name || '') : ''
    if (isPickup) {
      const relaisPoints = pickupPoints.value.filter(p => p.delivery_type === 3)
      if (relaisPoints.length > 0) {
        const current = (quickForm.pickupPoint || '').trim()
        if (!current || !relaisPoints.some((p) => (p.name_lt || p.name_ar || '') === current)) {
          quickForm.pickupPoint = relaisPoints[0].name_lt || relaisPoints[0].name_ar || ''
          syncPickupPointCommune()
        }
      } else {
        quickForm.pickupPoint = ''
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
    const maystroShippingAmount = isMaystro ? (maystroServiceLevel === 'office' ? maystroPrices.officePrice.value : maystroPrices.homePrice.value) : null
    if (isMaystro) {
      if (!quickForm.wilaya || !quickForm.commune) { orderError.value = storefrontContent.value.checkout.errors.deliveryRequired; orderSubmitting.value = false; return }
      if (delivery?.mode === 'pickup' && !String(quickForm.pickupPoint || '').trim() && !stopDeskName.value) { orderError.value = storefrontContent.value.checkout.errors.deliveryRequired; orderSubmitting.value = false; return }
      if (maystroShippingAmount == null) { orderError.value = 'Maystro shipping price unavailable for selected commune'; orderSubmitting.value = false; return }
    }
    const payload = {
      customerName: quickForm.fullName.trim(), customerPhone: quickForm.phone.trim(),
      customerAddress: hideOptionalAddress.value ? undefined : (quickForm.address?.trim() || undefined), shippingAddressLine1: hideOptionalAddress.value ? undefined : (quickForm.address?.trim() || undefined),
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
  <div class="order-form">
    <!-- Qty + stock -->
    <div class="order-form__qty-row">
      <div class="order-form__stock">
        <span v-if="product?.isActive === false" class="order-form__stock-label is-unavailable">{{ storefrontContent.productForm.stock.unavailable }}</span>
        <span v-else-if="isOutOfStock" class="order-form__stock-label is-oos">{{ storefrontContent.productForm.stock.outOfStock }}</span>
        <span v-else-if="isLowStock" class="order-form__stock-label is-low">{{ storefrontContent.productForm.stock.lowStock(maxQuantity) }}</span>
        <span v-else class="order-form__stock-label is-ok">{{ storefrontContent.product.inStock }}</span>
        <span class="order-form__qty-heading">{{ storefrontContent.productForm.quantity.label }}</span>
      </div>
      <div class="order-form__qty-ctrl">
        <button type="button" class="order-form__qty-btn" :disabled="!canPurchase || quantity <= 1" @click="decrementQuantity">
          <svg width="8" height="2" viewBox="0 0 8 2" fill="none"><path d="M1 1h6" stroke="currentColor" stroke-width="0.85"/></svg>
        </button>
        <span class="order-form__qty-val">{{ quantity }}</span>
        <button type="button" class="order-form__qty-btn" :disabled="!canPurchase || (maxQuantity > 0 && quantity >= maxQuantity)" @click="incrementQuantity">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M4 1v6M1 4h6" stroke="currentColor" stroke-width="0.85"/></svg>
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

    <!-- COD form -->
    <div v-if="codEnabled" class="order-form__cod" data-test="cod-order-card">
      <div class="order-form__cod-head">
        <div class="order-form__cod-icon">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="3" width="12" height="8" stroke="currentColor" stroke-width="0.75"/>
            <path d="M1 6h12" stroke="currentColor" stroke-width="0.75"/>
            <path d="M4 9h3" stroke="currentColor" stroke-width="0.75"/>
          </svg>
        </div>
        <div>
          <p class="order-form__cod-title">{{ storefrontContent.productForm.cod.title }}</p>
          <span class="order-form__cod-badge">{{ storefrontContent.productForm.cod.badge }}</span>
        </div>
      </div>

      <form class="order-form__fields" @submit.prevent="handleOrderSubmit">
        <div class="order-form__field">
          <label class="order-form__label">{{ storefrontContent.checkout.form.fullName.label }}</label>
          <input v-model="quickForm.fullName" type="text" :placeholder="storefrontContent.checkout.form.fullName.placeholder" class="at-input">
        </div>

        <div class="order-form__field">
          <label class="order-form__label">{{ storefrontContent.checkout.form.phone.label }}</label>
          <input v-model="quickForm.phone" type="tel" :placeholder="storefrontContent.checkout.form.phone.placeholder" class="at-input">
        </div>

        <div class="order-form__grid2">
          <div class="order-form__field">
            <label class="order-form__label">{{ storefrontContent.checkout.form.wilaya.label }}</label>
            <div class="order-form__select-wrap">
              <WilayaField v-model="quickForm.wilaya" input-class="at-select" :placeholder="storefrontContent.checkout.form.wilaya.placeholder" />
              <svg width="8" height="5" viewBox="0 0 8 5" fill="none" class="order-form__select-arrow">
                <path d="M1 1l3 3 3-3" stroke="currentColor" stroke-width="0.85"/>
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

        <div v-if="!hideOptionalAddress" class="order-form__field">
          <label class="order-form__label">{{ storefrontContent.checkout.form.address.label }}</label>
          <input v-model="quickForm.address" type="text" :placeholder="storefrontContent.checkout.form.address.placeholder" class="at-input">
        </div>

        <div v-if="quickForm.wilaya && quickForm.commune" class="order-form__field">
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
                  <Icon :name="option.icon" style="width:13px;height:13px" />
                </div>
                <div>
                  <p class="order-form__delivery-name">{{ option.providerLabel }}</p>
                  <p class="order-form__delivery-mode">{{ option.modeLabel }}</p>
                </div>
              </div>
              <div class="order-form__delivery-right">
                <span class="order-form__delivery-price">
                  {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
                </span>
                <span class="order-form__delivery-radio" :class="quickForm.selectedDeliveryOption === option.id && 'is-checked'" />
              </div>
            </div>

            <div v-if="isMaystroAvailable && (pickupPointsLoading || stopDeskName || isMaystroPickup)" class="order-form__pickup">
              <div v-if="pickupPointsLoading" class="order-form__pickup-loading">
                <Icon name="lucide:loader-2" style="width:12px;height:12px" /> Chargement…
              </div>
              <template v-else>
                <div v-if="stopDeskName" class="order-form__pickup-stopdesk">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1" y="3" width="8" height="6" stroke="currentColor" stroke-width="0.75"/><path d="M3 3V2a2 2 0 014 0v1" stroke="currentColor" stroke-width="0.75"/></svg>
                  {{ stopDeskName }}
                </div>
                <div v-if="isMaystroPickup && quickForm.pickupPoint" class="order-form__pickup-name">
                  <svg width="10" height="12" viewBox="0 0 10 12" fill="none"><path d="M5 11S1 7.5 1 4.5a4 4 0 018 0C9 7.5 5 11 5 11z" stroke="currentColor" stroke-width="0.75"/><circle cx="5" cy="4.5" r="1.5" stroke="currentColor" stroke-width="0.75"/></svg>
                  {{ quickForm.pickupPoint }}
                </div>
              </template>
              <p v-if="pickupPointsError" class="order-form__pickup-error">{{ pickupPointsError }}</p>
            </div>
          </div>
        </div>
        <div v-else class="order-form__field order-form__delivery-hint">
          <Icon name="lucide:map-pin" style="width:14px;height:14px;margin:0 auto 4px;display:block;color:var(--at-sub)" />
          {{ storefrontContent.checkout.help.deliveryOptions }}
        </div>

        <div v-if="orderError" class="order-form__error">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="flex-shrink:0">
            <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="0.75"/>
            <path d="M6 3v4M6 9v.5" stroke="currentColor" stroke-width="0.75"/>
          </svg>
          {{ orderError }}
        </div>

        <div class="order-form__total">
          <span class="order-form__total-label">{{ storefrontContent.productForm.totalPrice }}</span>
          <span class="order-form__total-price">
            {{ formatCurrency(totalPrice + (selectedDelivery?.price && selectedDelivery?.price !== 'FREE' && selectedDelivery?.price !== '—' ? Number(selectedDelivery.price) : 0)) }}
          </span>
        </div>

        <button type="submit" class="at-btn-solid" :disabled="orderSubmitting || !canPurchase">
          <Icon v-if="orderSubmitting" name="lucide:loader-2" style="width:14px;height:14px" />
          {{ orderSubmitting ? storefrontContent.productForm.cod.submitting : storefrontContent.productForm.cod.submit }}
        </button>
      </form>
    </div>

    <div v-if="cartEnabled">
      <button type="button" class="at-btn-ghost" :disabled="addToCartSubmitting || !canPurchase" @click="handleAddToCart">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M2 2h1.5l2 8h7l1.5-5H4.5" stroke="currentColor" stroke-width="0.85"/>
          <circle cx="7" cy="13" r="1" fill="currentColor"/>
          <circle cx="12" cy="13" r="1" fill="currentColor"/>
        </svg>
        {{ addToCartSubmitting ? storefrontContent.actions.adding : storefrontContent.actions.addToCart }}
      </button>
    </div>

    <Transition name="form-toast">
      <div v-if="showSuccess" class="order-form__toast">
        <div class="order-form__toast-icon">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l3 3 5-6" stroke="currentColor" stroke-width="1"/>
          </svg>
        </div>
        <div>
          <div class="order-form__toast-title">{{ successTitle }}</div>
          <div class="order-form__toast-msg">{{ successMessage }}</div>
        </div>
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
  background: var(--at-surface);
}
.order-form__stock { display: flex; flex-direction: column; gap: 3px; }
.order-form__stock-label { font-family: var(--at-f-mono); font-size: 10px; font-weight: 400; letter-spacing: 0; }
.order-form__stock-label.is-ok { color: var(--at-success); }
.order-form__stock-label.is-low { color: var(--at-gold); }
.order-form__stock-label.is-oos { color: var(--at-error); }
.order-form__stock-label.is-unavailable { color: var(--at-muted); }
.order-form__qty-heading { font-family: var(--at-f-mono); font-size: 9px; letter-spacing: 0; text-transform: uppercase; color: var(--at-muted); }

.order-form__qty-ctrl { display: flex; align-items: center; border: 1px solid var(--at-border-2); }
.order-form__qty-btn { width: 32px; height: 32px; background: none; border: none; color: var(--at-sub); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: color 0.15s; }
.order-form__qty-btn:hover { color: var(--at-gold); }
.order-form__qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.order-form__qty-val { min-width: 36px; text-align: center; font-family: var(--at-f-mono); font-size: 12px; color: var(--at-text); border-left: 1px solid var(--at-border-2); border-right: 1px solid var(--at-border-2); line-height: 32px; }

.order-form__cod { border: 1px solid var(--at-border); background: var(--at-surface); }
.order-form__cod-head { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--at-border); }
.order-form__cod-icon { width: 34px; height: 34px; background: var(--at-gold-dim); display: flex; align-items: center; justify-content: center; color: var(--at-gold); flex-shrink: 0; }
.order-form__cod-title { font-family: var(--at-f-mono); font-size: 11px; color: var(--at-text); margin-bottom: 2px; }
.order-form__cod-badge { font-family: var(--at-f-mono); font-size: 8px; letter-spacing: 0; text-transform: uppercase; color: var(--at-gold); }

.order-form__fields { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.order-form__field { display: flex; flex-direction: column; gap: 6px; }
.order-form__label { font-family: var(--at-f-mono); font-size: 9px; letter-spacing: 0; text-transform: uppercase; color: var(--at-sub); }
.order-form__grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.order-form__select-wrap { position: relative; }
.order-form__select-arrow { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--at-muted); pointer-events: none; }

.order-form__delivery-list { display: flex; flex-direction: column; gap: 1px; background: var(--at-border); }
.order-form__delivery-opt { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; background: var(--at-surface); cursor: pointer; transition: background 0.15s; }
.order-form__delivery-opt:hover { background: var(--at-surface-2); }
.order-form__delivery-opt.is-selected { background: rgba(213,168,93,0.07); }
.order-form__delivery-left { display: flex; align-items: center; gap: 10px; }
.order-form__delivery-icon-wrap { width: 28px; height: 28px; background: var(--at-surface-2); display: flex; align-items: center; justify-content: center; color: var(--at-sub); flex-shrink: 0; }
.order-form__delivery-name { font-family: var(--at-f-mono); font-size: 10px; color: var(--at-text); margin-bottom: 1px; }
.order-form__delivery-mode { font-family: var(--at-f-mono); font-size: 9px; color: var(--at-muted); letter-spacing: 0; }
.order-form__delivery-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.order-form__delivery-price { font-family: var(--at-f-mono); font-size: 11px; font-weight: 400; color: var(--at-gold); }
.order-form__delivery-radio { width: 12px; height: 12px; border: 1px solid var(--at-border-2); border-radius: 50%; flex-shrink: 0; transition: background 0.15s, border-color 0.15s; }
.order-form__delivery-radio.is-checked { background: var(--at-gold); border-color: var(--at-gold); }

.order-form__pickup { background: var(--at-surface-2); padding: 10px 14px; }
.order-form__pickup-loading { display: flex; align-items: center; gap: 8px; font-family: var(--at-f-mono); font-size: 10px; color: var(--at-sub); }
.order-form__pickup-stopdesk { display: flex; align-items: center; gap: 8px; font-family: var(--at-f-mono); font-size: 10px; color: var(--at-sub); margin-bottom: 6px; }
.order-form__pickup-stopdesk svg { color: var(--at-sub); flex-shrink: 0; }
.order-form__pickup-name { display: flex; align-items: center; gap: 8px; font-family: var(--at-f-mono); font-size: 11px; color: var(--at-text); }
.order-form__pickup-name svg { color: var(--at-gold); flex-shrink: 0; }
.order-form__pickup-error { font-family: var(--at-f-mono); font-size: 10px; color: var(--at-error); margin-top: 6px; }

.order-form__error { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border: 1px solid rgba(224,106,85,0.4); background: rgba(224,106,85,0.08); font-family: var(--at-f-mono); font-size: 10px; color: var(--at-error); }

.order-form__total { display: flex; align-items: baseline; justify-content: space-between; padding: 12px 14px; background: var(--at-surface-2); border: 1px solid var(--at-border); }
.order-form__total-label { font-family: var(--at-f-mono); font-size: 9px; letter-spacing: 0; text-transform: uppercase; color: var(--at-sub); }
.order-form__total-price { font-family: var(--at-f-display); font-size: 1.6rem; font-weight: 400; color: var(--at-gold); }

.order-form__toast { position: fixed; bottom: 20px; right: 20px; z-index: 100; background: var(--at-surface); border: 1px solid var(--at-border-2); padding: 14px 18px; display: flex; align-items: center; gap: 12px; }
.order-form__toast-icon { width: 26px; height: 26px; background: var(--at-gold-dim); display: flex; align-items: center; justify-content: center; color: var(--at-gold); flex-shrink: 0; }
.order-form__toast-title { font-family: var(--at-f-mono); font-size: 11px; font-weight: 400; color: var(--at-text); }
.order-form__toast-msg { font-family: var(--at-f-mono); font-size: 10px; font-weight: 300; color: var(--at-sub); margin-top: 2px; }

.form-toast-enter-active { transition: opacity 0.3s, transform 0.3s; }
.form-toast-leave-active { transition: opacity 0.15s; }
.form-toast-enter-from { opacity: 0; transform: translateY(8px); }
.form-toast-leave-to { opacity: 0; }
</style>
