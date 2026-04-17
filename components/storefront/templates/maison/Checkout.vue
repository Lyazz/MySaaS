<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'
import { DZ_WILAYAS } from '~/shared/geo/dz'

const cartStore = useCartStore()
const router = useRouter()
const storeSettings = useState<any>('storeSettings')
const storefrontContent = useStorefrontContent()
const { currencyCode, format: formatCurrency } = useCurrency()
const cartEnabled = computed(() => storeSettings.value?.cartEnabled !== false && storeSettings.value?.codEnabled !== false)
const wilayas = DZ_WILAYAS

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

const form = ref({
  fullName: '',
  phone: '',
  wilaya: '',
  commune: '',
  address: '',
  pickupPoint: '',
  selectedDeliveryOption: ''
})

const maystroPrices = useMaystroDeliveryPrices({
  wilayaCode: () => form.value.wilaya,
  communeCode: () => form.value.commune
})

const deliveryOptions = computed(() => {
  const options: any[] = []
  availableProviders.value.forEach((provider: any) => {
    const homePrice = provider.key === 'MAYSTRO' && maystroPrices.homePrice.value != null
      ? String(Math.round(maystroPrices.homePrice.value)) : provider.key === 'MAYSTRO' ? '—' : '350'
    const officePrice = provider.key === 'MAYSTRO' && maystroPrices.officePrice.value != null
      ? String(Math.round(maystroPrices.officePrice.value)) : provider.key === 'MAYSTRO' ? '—' : '300'

    options.push({ id: `${provider.key}-home`, provider: provider.key, providerLabel: provider.label, mode: 'home', modeLabel: storefrontContent.value.checkout.delivery.mode.homeDelivery, icon: provider.icon, color: provider.color, price: homePrice })
    options.push({ id: `${provider.key}-pickup`, provider: provider.key, providerLabel: provider.label, mode: 'pickup', modeLabel: storefrontContent.value.checkout.delivery.mode.pickupPoint, icon: provider.icon, color: provider.color, price: officePrice })
  })
  if (storeSettings.value?.storePickupEnabled === true) {
    options.push({ id: 'store-pickup', provider: null, providerLabel: 'Store', mode: 'store', modeLabel: storefrontContent.value.checkout.delivery.mode.storePickup, icon: 'lucide:store', color: 'green', price: 'FREE' })
  }
  return options
})

watchEffect(() => {
  const options = deliveryOptions.value
  if (!options.length) return
  const selected = form.value.selectedDeliveryOption
  if (!selected || !options.some((opt: any) => opt.id === selected)) {
    form.value.selectedDeliveryOption = options[0].id
  }
})

const submitting = ref(false)
const errorMessage = ref('')
const couponCode = ref('')

const selectedDelivery = computed(() => deliveryOptions.value.find((opt: any) => opt.id === form.value.selectedDeliveryOption))

const isMaystroPickup = computed(() => selectedDelivery.value?.provider === 'MAYSTRO' && selectedDelivery.value?.mode === 'pickup')
const isMaystroAvailable = computed(() => availableProviders.value.some((p: any) => p.key === 'MAYSTRO'))
const pickupPoints = ref<Array<{ pickup_point: number; commune: number; name?: string; name_lt?: string; name_ar?: string; delivery_type: number }>>([])
const pickupPointsLoading = ref(false)
const pickupPointsError = ref('')
const stopDeskName = ref('')

const syncPickupPointCommune = () => {
  const name = (form.value.pickupPoint || '').trim()
  if (!name) return
  const point = pickupPoints.value.filter(p => p.delivery_type === 3).find((p) => (p.name || p.name_lt || p.name_ar || '') === name)
  if (!point?.commune) return
  const nextCommune = String(point.commune)
  if (nextCommune && form.value.commune !== nextCommune) form.value.commune = nextCommune
}

watch(
  [isMaystroPickup, isMaystroAvailable, () => form.value.commune, () => form.value.wilaya],
  async ([isPickup, maystroEnabled, commune, wilaya]) => {
    pickupPointsError.value = ''
    pickupPoints.value = []
    stopDeskName.value = ''
    if (!isPickup) form.value.pickupPoint = ''
    if (!maystroEnabled || !wilaya || !commune) return
    pickupPointsLoading.value = true
    try {
      const url = useTenantApiUrl(`/api/delivery/maystro/pickup-points?commune=${encodeURIComponent(commune as string)}&wilaya=${encodeURIComponent(wilaya as string)}&nearby=true`)
      const data = await $fetch<any[]>(url, { headers: { ...(useTenantApiHeaders() || {}) } })
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
          const current = (form.value.pickupPoint || '').trim()
          if (!current || !relaisPoints.some((p) => (p.name || p.name_lt || p.name_ar || '') === current)) {
            form.value.pickupPoint = relaisPoints[0].name || relaisPoints[0].name_lt || relaisPoints[0].name_ar || ''
            syncPickupPointCommune()
          }
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

const grandTotal = computed(() => {
  const delivery = selectedDelivery.value
  if (!delivery || delivery.price === 'FREE' || delivery.price === '—') return cartStore.total
  const deliveryPrice = Number(delivery.price)
  return isNaN(deliveryPrice) ? cartStore.total : cartStore.total + deliveryPrice
})

const hasRequiredFields = computed(() => Boolean(form.value.fullName.trim() && form.value.phone.trim() && cartStore.hasItems && cartStore.total >= 1000 && form.value.selectedDeliveryOption))

onMounted(() => { cartStore.loadFromLocalStorage() })

async function handleSubmit() {
  if (!cartEnabled.value) return
  errorMessage.value = ''
  cartStore.loadFromLocalStorage()
  if (!cartStore.hasItems) { errorMessage.value = storefrontContent.value.checkout.errors.emptyCart; return }
  if (!form.value.fullName.trim()) { errorMessage.value = storefrontContent.value.checkout.errors.fullNameRequired; return }
  if (!form.value.phone.trim()) { errorMessage.value = storefrontContent.value.checkout.errors.phoneRequired; return }
  if (!form.value.selectedDeliveryOption) { errorMessage.value = storefrontContent.value.checkout.errors.deliveryRequired; return }

  submitting.value = true
  try {
    const delivery = selectedDelivery.value
    const isMaystro = delivery?.provider === 'MAYSTRO'
    const maystroServiceLevel = delivery?.mode === 'pickup' ? 'office' : 'home'
    const maystroShippingAmount = isMaystro ? (maystroServiceLevel === 'office' ? maystroPrices.officePrice.value : maystroPrices.homePrice.value) : null

    if (isMaystro) {
      if (!form.value.wilaya || !form.value.commune) { errorMessage.value = storefrontContent.value.checkout.errors.deliveryRequired; return }
      if (delivery?.mode === 'pickup' && !String(form.value.pickupPoint || '').trim()) { errorMessage.value = storefrontContent.value.checkout.errors.deliveryRequired; return }
      if (maystroShippingAmount == null) { errorMessage.value = 'Maystro shipping price unavailable for selected commune'; return }
    }

    const payload = {
      customerName: form.value.fullName.trim(),
      customerPhone: form.value.phone.trim(),
      customerAddress: form.value.address?.trim() || undefined,
      shippingAddressLine1: form.value.address?.trim() || undefined,
      shippingWilayaCode: form.value.wilaya || undefined,
      shippingCommuneCode: form.value.commune || undefined,
      deliveryMode: delivery?.mode,
      shippingProvider: delivery?.provider || undefined,
      shippingPickupPoint: isMaystro && delivery?.mode === 'pickup' ? (form.value.pickupPoint || undefined) : undefined,
      shippingServiceLevel: isMaystro ? maystroServiceLevel : undefined,
      shippingAmount: isMaystro && maystroShippingAmount != null ? maystroShippingAmount : undefined,
      shippingCurrency: isMaystro ? currencyCode.value : undefined,
      items: cartStore.items.map(item => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity }))
    }

    const response = await $fetch<{ orderId: string }>(useTenantApiUrl('/api/orders'), {
      method: 'POST', body: payload, headers: { ...(useTenantApiHeaders() || {}) }
    })
    cartStore.clearCart()
    router.push({ path: '/order-success', query: { orderId: response.orderId } })
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.data?.message || storefrontContent.value.checkout.errors.submitFailed
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="co">
    <div class="co__header">
      <div class="co__header-inner">
        <span class="at-label">Finaliser</span>
        <h1 class="co__title">{{ storefrontContent.checkout.title }}</h1>
      </div>
    </div>

    <div class="co__body">
      <div v-if="!cartEnabled" class="co__disabled">
        {{ storefrontContent.checkout.disabled }}
      </div>

      <div class="co__layout">
        <!-- ── Left: Form ──────────────────────────────── -->
        <div class="co__form-col">
          <!-- Customer info -->
          <div class="co__card">
            <span class="at-label co__card-label">{{ storefrontContent.checkout.sections.customerInformation }}</span>
            <div class="co__grid2">
              <div class="co__field">
                <label class="co__label">{{ storefrontContent.checkout.form.fullName.label }}</label>
                <input v-model="form.fullName" type="text" :placeholder="storefrontContent.checkout.form.fullName.placeholder" class="co__input">
              </div>
              <div class="co__field">
                <label class="co__label">{{ storefrontContent.checkout.form.phone.label }}</label>
                <input v-model="form.phone" type="tel" :placeholder="storefrontContent.checkout.form.phone.placeholder" class="co__input">
              </div>
              <div class="co__field">
                <label class="co__label">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                <div class="co__select-wrap">
                  <select v-model="form.wilaya" class="co__select">
                    <option value="" disabled>{{ storefrontContent.checkout.form.wilaya.placeholder }}</option>
                    <option v-for="w in wilayas" :key="w.code" :value="w.code">{{ w.code }} - {{ w.name }}</option>
                  </select>
                  <svg width="8" height="5" viewBox="0 0 8 5" fill="none" class="co__select-arrow">
                    <path d="M1 1l3 3 3-3" stroke="currentColor" stroke-width="0.85"/>
                  </svg>
                </div>
              </div>
              <div class="co__field">
                <label class="co__label">{{ storefrontContent.checkout.form.commune.label }}</label>
                <CommuneField
                  v-model="form.commune"
                  :wilaya-code="form.wilaya"
                  :placeholder="storefrontContent.checkout.form.commune.placeholder"
                  :input-class="'co__input'"
                  :select-class="'co__select'"
                />
              </div>
              <div class="co__field co__field--full">
                <label class="co__label">{{ storefrontContent.checkout.form.address.label }}</label>
                <input v-model="form.address" type="text" :placeholder="storefrontContent.checkout.form.address.placeholder" class="co__input">
              </div>
            </div>
          </div>

          <!-- Delivery options -->
          <div v-if="form.wilaya && form.commune" class="co__card">
            <span class="at-label co__card-label">{{ storefrontContent.checkout.sections.deliveryMethod }}</span>
            <div class="co__delivery-list">
              <div
                v-for="option in deliveryOptions"
                :key="option.id"
                class="co__delivery-opt"
                :class="form.selectedDeliveryOption === option.id && 'is-selected'"
                @click="form.selectedDeliveryOption = option.id"
              >
                <div class="co__delivery-left">
                  <div class="co__delivery-icon">
                    <Icon :name="option.icon" style="width:13px;height:13px" />
                  </div>
                  <div>
                    <p class="co__delivery-name">{{ option.providerLabel }}</p>
                    <p class="co__delivery-mode">{{ option.modeLabel }}</p>
                  </div>
                </div>
                <div class="co__delivery-right">
                  <span class="co__delivery-price">
                    {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
                  </span>
                  <span class="co__radio" :class="form.selectedDeliveryOption === option.id && 'is-checked'" />
                </div>

                <!-- Maystro pickup info -->
                <div v-if="option.mode === 'pickup' && option.provider === 'MAYSTRO' && (pickupPointsLoading || stopDeskName || pickupPointsError)" class="co__pickup-info">
                  <div v-if="pickupPointsLoading" class="co__pickup-loading">
                    <Icon name="lucide:loader-2" style="width:11px;height:11px" /> Chargement…
                  </div>
                  <template v-else>
                    <div v-if="stopDeskName" class="co__pickup-desk">
                      <svg width="10" height="12" viewBox="0 0 10 12" fill="none"><path d="M5 11S1 7.5 1 4.5a4 4 0 018 0C9 7.5 5 11 5 11z" stroke="currentColor" stroke-width="0.75"/><circle cx="5" cy="4.5" r="1.5" stroke="currentColor" stroke-width="0.75"/></svg>
                      {{ stopDeskName }}
                    </div>
                    <div v-if="form.selectedDeliveryOption === option.id && form.pickupPoint" class="co__pickup-point">
                      <svg width="10" height="12" viewBox="0 0 10 12" fill="none"><path d="M5 11S1 7.5 1 4.5a4 4 0 018 0C9 7.5 5 11 5 11z" stroke="currentColor" stroke-width="0.75"/><circle cx="5" cy="4.5" r="1.5" stroke="currentColor" stroke-width="0.75"/></svg>
                      {{ form.pickupPoint }}
                    </div>
                  </template>
                  <p v-if="pickupPointsError" class="co__pickup-error">{{ pickupPointsError }}</p>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="co__card co__delivery-hint">
            <svg width="16" height="20" viewBox="0 0 10 12" fill="none" style="color:var(--at-muted)">
              <path d="M5 11S1 7.5 1 4.5a4 4 0 018 0C9 7.5 5 11 5 11z" stroke="currentColor" stroke-width="0.75"/>
            </svg>
            {{ storefrontContent.checkout.help.deliveryOptions }}
          </div>

          <!-- Error -->
          <div v-if="errorMessage" class="co__error">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="flex-shrink:0">
              <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="0.75"/>
              <path d="M6 3v4M6 9v.5" stroke="currentColor" stroke-width="0.75"/>
            </svg>
            {{ errorMessage }}
          </div>
        </div>

        <!-- ── Right: Summary ─────────────────────────── -->
        <div class="co__summary-col">
          <div class="co__summary-card">
            <span class="at-label co__card-label">{{ storefrontContent.checkout.sections.orderSummary }}</span>

            <!-- Items -->
            <div class="co__summary-items">
              <div v-for="item in cartStore.items" :key="item.variantId || item.productId" class="co__summary-item">
                <div class="co__item-img">
                  <img v-if="item.image" :src="item.image" :alt="item.title" class="co__item-photo">
                  <span class="co__item-qty">{{ item.quantity }}</span>
                </div>
                <span class="co__item-name">{{ item.title }}</span>
                <span class="co__item-price">{{ formatCurrency(item.lineTotal ?? (item.price * item.quantity)) }}</span>
              </div>
            </div>

            <!-- Coupon -->
            <div class="co__coupon">
              <input v-model="couponCode" type="text" :placeholder="storefrontContent.checkout.coupon.placeholder" class="co__input co__coupon-input">
              <button class="co__coupon-btn">{{ storefrontContent.actions.apply }}</button>
            </div>

            <!-- Totals -->
            <dl class="co__totals">
              <div v-if="selectedDelivery" class="co__total-row">
                <dt>{{ storefrontContent.checkout.summary.deliveryOption }}</dt>
                <dd class="co__total-detail">{{ selectedDelivery.providerLabel }} — {{ selectedDelivery.modeLabel }}</dd>
              </div>
              <div class="co__total-row">
                <dt>{{ storefrontContent.cart.summary.subtotal }}</dt>
                <dd>{{ formatCurrency(cartStore.total) }}</dd>
              </div>
              <div v-if="selectedDelivery" class="co__total-row">
                <dt>{{ storefrontContent.cart.summary.shipping }}</dt>
                <dd>{{ selectedDelivery.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${selectedDelivery.price} ${currencyCode}` }}</dd>
              </div>
              <div class="co__total-row co__total-row--grand">
                <dt>{{ storefrontContent.cart.summary.total }}</dt>
                <dd class="co__grand-price">{{ formatCurrency(grandTotal) }}</dd>
              </div>
            </dl>

            <button
              type="button"
              class="at-btn-solid"
              :disabled="submitting || !cartEnabled || !hasRequiredFields"
              @click="handleSubmit"
            >
              <Icon v-if="submitting" name="lucide:loader-2" style="width:14px;height:14px" />
              {{ submitting ? storefrontContent.checkout.actions.placingOrder : storefrontContent.checkout.actions.placeOrder }}
            </button>

            <NuxtLink to="/cart" class="co__back-link">
              {{ storefrontContent.checkout.actions.returnToCart }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.co { min-height: 100vh; }

/* Header */
.co__header {
  border-bottom: 1px solid var(--at-border);
  background: var(--at-surface);
  padding: clamp(48px, 8vw, 96px) clamp(20px, 5vw, 80px) clamp(32px, 5vw, 56px);
}
.co__header-inner { max-width: 1200px; margin: 0 auto; }
.co__title {
  font-family: var(--at-f-display);
  font-size: clamp(3rem, 6vw, 5rem);
  font-weight: 300;
  letter-spacing: -0.02em;
  line-height: 1.0;
  color: var(--at-cream);
  margin-top: 10px;
}

/* Body */
.co__body {
  max-width: 1200px;
  margin: 0 auto;
  padding: clamp(32px, 5vw, 56px) clamp(20px, 5vw, 80px);
}

.co__disabled {
  padding: 14px 18px;
  border: 1px solid rgba(201,150,42,0.4);
  background: rgba(201,150,42,0.06);
  font-family: var(--at-f-mono);
  font-size: 11px;
  color: #C9962A;
  margin-bottom: 24px;
}

.co__layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}
@media (min-width: 1024px) {
  .co__layout { grid-template-columns: 1fr 380px; gap: 32px; }
}

/* Cards */
.co__form-col { display: flex; flex-direction: column; gap: 16px; }
.co__card {
  background: var(--at-surface);
  border: 1px solid var(--at-border);
  padding: clamp(20px, 3vw, 32px);
}
.co__card-label { display: block; margin-bottom: 20px; }
.co__delivery-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--at-f-mono);
  font-size: 11px;
  color: var(--at-muted);
}

/* Form fields */
.co__grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 640px) { .co__grid2 { grid-template-columns: 1fr; } }
.co__field { display: flex; flex-direction: column; gap: 7px; }
.co__field--full { grid-column: 1 / -1; }
.co__label {
  font-family: var(--at-f-mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--at-sub);
}

/* Inputs — explicit overrides for browser default white bg */
.co__input {
  display: block;
  width: 100%;
  background: var(--at-bg) !important;
  border: 1px solid var(--at-border);
  padding: 12px 14px;
  font-family: var(--at-f-mono);
  font-size: 12px;
  font-weight: 300;
  color: var(--at-text) !important;
  outline: none;
  transition: border-color 0.2s;
  -webkit-appearance: none;
  box-sizing: border-box;
}
.co__input::placeholder { color: var(--at-muted) !important; }
.co__input:focus { border-color: var(--at-gold); }

.co__select-wrap { position: relative; }
.co__select {
  display: block;
  width: 100%;
  background: var(--at-bg) !important;
  border: 1px solid var(--at-border);
  padding: 12px 36px 12px 14px;
  font-family: var(--at-f-mono);
  font-size: 12px;
  font-weight: 300;
  color: var(--at-text) !important;
  outline: none;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s;
}
.co__select:focus { border-color: var(--at-gold); }
/* Dark options for select elements */
.co__select option { background: var(--at-surface); color: var(--at-text); }
.co__select-arrow { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--at-muted); pointer-events: none; }

/* Delivery options */
.co__delivery-list { display: flex; flex-direction: column; gap: 1px; background: var(--at-border); }
.co__delivery-opt {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: var(--at-surface);
  cursor: pointer;
  transition: background 0.15s;
}
.co__delivery-opt:hover { background: var(--at-surface-2); }
.co__delivery-opt.is-selected { background: rgba(184,146,74,0.07); }
.co__delivery-left { display: flex; align-items: center; gap: 12px; }
.co__delivery-icon {
  width: 32px; height: 32px;
  background: var(--at-surface-2);
  display: flex; align-items: center; justify-content: center;
  color: var(--at-sub); flex-shrink: 0;
}
.co__delivery-name { font-family: var(--at-f-mono); font-size: 11px; color: var(--at-text); margin-bottom: 2px; }
.co__delivery-mode { font-family: var(--at-f-mono); font-size: 9px; color: var(--at-muted); }
.co__delivery-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.co__delivery-price { font-family: var(--at-f-mono); font-size: 12px; font-weight: 400; color: var(--at-gold); }
.co__radio { width: 12px; height: 12px; border: 1px solid var(--at-border-2); border-radius: 50%; transition: background 0.15s, border-color 0.15s; }
.co__radio.is-checked { background: var(--at-gold); border-color: var(--at-gold); }

.co__pickup-info { flex-basis: 100%; padding-top: 10px; border-top: 1px solid var(--at-border); }
.co__pickup-loading { display: flex; align-items: center; gap: 8px; font-family: var(--at-f-mono); font-size: 10px; color: var(--at-sub); }
.co__pickup-desk { display: flex; align-items: center; gap: 8px; font-family: var(--at-f-mono); font-size: 10px; color: var(--at-sub); }
.co__pickup-desk svg { color: var(--at-muted); }
.co__pickup-point { display: flex; align-items: center; gap: 8px; font-family: var(--at-f-mono); font-size: 11px; color: var(--at-text); margin-top: 4px; }
.co__pickup-point svg { color: var(--at-gold); }
.co__pickup-error { font-family: var(--at-f-mono); font-size: 10px; color: var(--at-error); margin-top: 6px; }

/* Error */
.co__error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid rgba(192,57,43,0.35);
  background: rgba(192,57,43,0.06);
  font-family: var(--at-f-mono);
  font-size: 11px;
  color: var(--at-error);
}

/* Summary */
.co__summary-col {}
.co__summary-card {
  background: var(--at-surface);
  border: 1px solid var(--at-border);
  padding: clamp(20px, 3vw, 32px);
  position: sticky;
  top: 80px;
}

.co__summary-items { display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--at-border); }
.co__summary-item { display: flex; align-items: center; gap: 12px; }
.co__item-img { position: relative; width: 48px; height: 48px; background: var(--at-surface-2); flex-shrink: 0; overflow: hidden; }
.co__item-photo { width: 100%; height: 100%; object-fit: cover; }
.co__item-qty {
  position: absolute;
  top: -3px; right: -3px;
  width: 16px; height: 16px;
  background: var(--at-gold);
  color: var(--at-bg);
  font-family: var(--at-f-mono);
  font-size: 8px;
  font-weight: 400;
  display: flex; align-items: center; justify-content: center;
}
.co__item-name { flex: 1; font-family: var(--at-f-mono); font-size: 11px; color: var(--at-text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.co__item-price { font-family: var(--at-f-mono); font-size: 11px; color: var(--at-sub); flex-shrink: 0; }

/* Coupon */
.co__coupon { display: flex; gap: 8px; margin-bottom: 20px; }
.co__coupon-input { flex: 1; }
.co__coupon-btn {
  background: var(--at-surface-2);
  border: 1px solid var(--at-border-2);
  padding: 0 16px;
  font-family: var(--at-f-mono);
  font-size: 9px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--at-sub);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.2s, color 0.2s;
}
.co__coupon-btn:hover { border-color: var(--at-gold); color: var(--at-gold); }

/* Totals */
.co__totals { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
.co__total-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-family: var(--at-f-mono);
  font-size: 11px;
  color: var(--at-sub);
}
.co__total-row dt { }
.co__total-row dd { color: var(--at-text); margin: 0; }
.co__total-detail { font-size: 9px !important; color: var(--at-muted) !important; }
.co__total-row--grand {
  padding-top: 14px;
  border-top: 1px solid var(--at-border);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-top: 4px;
}
.co__grand-price {
  font-family: var(--at-f-display) !important;
  font-size: 1.6rem !important;
  font-weight: 400;
  color: var(--at-gold) !important;
  letter-spacing: 0;
  text-transform: none;
}

.co__back-link {
  display: block;
  text-align: center;
  font-family: var(--at-f-mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--at-muted);
  text-decoration: none;
  padding: 14px;
  margin-top: 8px;
  transition: color 0.2s;
}
.co__back-link:hover { color: var(--at-gold); }
</style>
