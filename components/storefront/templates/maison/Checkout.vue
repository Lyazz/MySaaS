<script setup lang="ts">
import CarrierMark from '~/components/storefront/shared/CarrierMark.vue'
import { useCartStore } from '~/stores/cart'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'
import { DZ_WILAYAS } from '~/shared/geo/dz'

const cartStore = useCartStore()
const router = useRouter()
const storeSettings = useState<any>('storeSettings')
const storefrontContent = useStorefrontContent()
const { t } = useI18n({ useScope: 'global' })
const { currencyCode, format: formatCurrency } = useCurrency()
const cartEnabled = computed(() => storeSettings.value?.cartEnabled !== false && storeSettings.value?.codEnabled !== false)
const wilayas = DZ_WILAYAS

const minimumOrderAmount = computed(() => {
  const raw = Number(storeSettings.value?.minimumOrderAmountDzd ?? 1000)
  return Number.isFinite(raw) && raw >= 0 ? raw : 1000
})
const hideOptionalAddress = computed(() => storeSettings.value?.hideOptionalAddress !== false)

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

const form = ref({
  fullName: '',
  phone: '',
  wilaya: '',
  commune: '',
  address: '',
  pickupPoint: '',
  selectedDeliveryOption: ''
})

const maystroPrices = useDeliveryPrices({
  wilayaCode: () => form.value.wilaya,
  communeCode: () => form.value.commune
})

const deliveryOptions = computed(() => {
  const options: any[] = []
  availableProviders.value.forEach((provider: any) => {
    const providerPrices = maystroPrices.pricesByProvider.value?.[provider.key]
    const homePrice = providerPrices?.home != null ? String(Math.round(providerPrices.home)) : '—'
    const officePrice = providerPrices?.office != null ? String(Math.round(providerPrices.office)) : '—'

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
const loyalty = useCheckoutLoyalty()

watch(() => form.value.phone, (phone) => {
  loyalty.phone.value = phone.trim()
}, { immediate: true })

const selectedDelivery = computed(() => deliveryOptions.value.find((opt: any) => opt.id === form.value.selectedDeliveryOption))

const pickup = usePickupPoints({
  provider: () => selectedDelivery.value?.provider,
  mode: () => selectedDelivery.value?.mode,
  wilaya: () => form.value.wilaya,
  commune: () => form.value.commune,
  selected: () => form.value.pickupPoint,
  onSelect: (name) => { form.value.pickupPoint = name },
  onCommuneChange: (communeName) => { form.value.commune = communeName }
})

const isPickupSelected = pickup.isPickupSelected
const pickupPoints = pickup.points
const pickupPointsLoading = pickup.loading
const pickupPointsError = pickup.error
const syncPickupPointCommune = pickup.syncCommune

const discountedSubtotal = computed(() => Math.max(0, cartStore.total - cartStore.clearanceDiscount))

const grandTotal = computed(() => {
  const delivery = selectedDelivery.value
  if (!delivery || delivery.price === 'FREE' || delivery.price === '—') return discountedSubtotal.value
  const deliveryPrice = Number(delivery.price)
  return isNaN(deliveryPrice) ? discountedSubtotal.value : discountedSubtotal.value + deliveryPrice
})

const hasRequiredFields = computed(() => Boolean(form.value.fullName.trim() && form.value.phone.trim() &&
  form.value.wilaya &&
  form.value.commune && cartStore.hasItems && discountedSubtotal.value >= minimumOrderAmount.value && form.value.selectedDeliveryOption))

onMounted(() => { cartStore.loadFromLocalStorage() })

async function handleSubmit() {
  if (!cartEnabled.value) return
  errorMessage.value = ''
  cartStore.loadFromLocalStorage()
  if (!cartStore.hasItems) { errorMessage.value = storefrontContent.value.checkout.errors.emptyCart; return }
  if (!form.value.fullName.trim()) { errorMessage.value = storefrontContent.value.checkout.errors.fullNameRequired; return }
  if (!form.value.phone.trim()) { errorMessage.value = storefrontContent.value.checkout.errors.phoneRequired; return }
    if (!form.value.wilaya || !form.value.commune) {
      errorMessage.value = storefrontContent.value.checkout.errors.requiredFields || storefrontContent.value.checkout.errors.deliveryRequired
      return
    }
  if (!form.value.selectedDeliveryOption) { errorMessage.value = storefrontContent.value.checkout.errors.deliveryRequired; return }

  submitting.value = true
  try {
    const delivery = selectedDelivery.value
    const isMaystro = delivery?.provider === 'MAYSTRO'
    const maystroServiceLevel = delivery?.mode === 'pickup' ? 'office' : 'home'
    const providerPrices = delivery?.provider ? maystroPrices.pricesByProvider.value?.[delivery.provider] : undefined
    const maystroShippingAmount = providerPrices ? (maystroServiceLevel === 'office' ? providerPrices.office : providerPrices.home) : null

    if (isMaystro) {
      if (!form.value.wilaya || !form.value.commune) { errorMessage.value = storefrontContent.value.checkout.errors.deliveryRequired; return }
      if (delivery?.mode === 'pickup' && !String(form.value.pickupPoint || '').trim() ) { errorMessage.value = storefrontContent.value.checkout.errors.deliveryRequired; return }
      if (maystroShippingAmount == null) { errorMessage.value = storefrontContent.value.checkout.errors.shippingUnavailable; return }
    }

    const payload = {
      customerName: form.value.fullName.trim(),
      customerPhone: form.value.phone.trim(),
      customerAddress: hideOptionalAddress.value ? undefined : (form.value.address?.trim() || undefined),
      shippingAddressLine1: hideOptionalAddress.value ? undefined : (form.value.address?.trim() || undefined),
      shippingWilayaCode: form.value.wilaya || undefined,
      shippingCommuneCode: form.value.commune || undefined,
      deliveryMode: delivery?.mode,
      shippingProvider: delivery?.provider || undefined,
      shippingPickupPoint: delivery?.provider && delivery?.mode === 'pickup' ? (form.value.pickupPoint || undefined) : undefined,
      shippingServiceLevel: delivery?.provider ? maystroServiceLevel : undefined,
      shippingAmount: maystroShippingAmount != null ? maystroShippingAmount : undefined,
      shippingCurrency: delivery?.provider ? currencyCode.value : undefined,
      redeemPointsRequested: loyalty.redeemPointsRequested.value || undefined,
      items: cartStore.items.map(item => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity }))
    }

    const response = await $fetch<{ orderId: string }>(useTenantApiUrl('/api/orders'), {
      method: 'POST', body: payload, headers: { ...(useTenantApiHeaders() || {}) }
    })
    cartStore.clearCart()
    loyalty.reset()
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
        <h1 class="co__title">
          {{ storefrontContent.checkout.title }}
        </h1>
      </div>
    </div>

    <div class="co__body">
      <div
        v-if="!cartEnabled"
        class="co__disabled"
      >
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
                <input
                  v-model="form.fullName"
                  type="text"
                  :placeholder="storefrontContent.checkout.form.fullName.placeholder"
                  class="co__input"
                >
              </div>
              <div class="co__field">
                <label class="co__label">{{ storefrontContent.checkout.form.phone.label }}</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  :placeholder="storefrontContent.checkout.form.phone.placeholder"
                  class="co__input"
                >
              </div>
              <div class="co__field">
                <label class="co__label">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                <div class="co__select-wrap">
                  <WilayaField
                    v-model="form.wilaya"
                    input-class="co__select"
                    :placeholder="storefrontContent.checkout.form.wilaya.placeholder"
                  />
                  <svg
                    width="8"
                    height="5"
                    viewBox="0 0 8 5"
                    fill="none"
                    class="co__select-arrow"
                  >
                    <path
                      d="M1 1l3 3 3-3"
                      stroke="currentColor"
                      stroke-width="0.85"
                    />
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
              <div
                v-if="!hideOptionalAddress"
                class="co__field co__field--full"
              >
                <label class="co__label">{{ storefrontContent.checkout.form.address.label }}</label>
                <input
                  v-model="form.address"
                  type="text"
                  :placeholder="storefrontContent.checkout.form.address.placeholder"
                  class="co__input"
                >
              </div>
            </div>
          </div>

          <!-- Delivery options -->
          <div
            v-if="form.wilaya && form.commune"
            class="co__card"
          >
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
                    <CarrierMark
                      :provider="option.provider"
                      :icon="option.icon"
                      :alt="option.providerLabel"
                      style="width:13px;height:13px"
                    />
                  </div>
                  <div>
                    <p class="co__delivery-name">
                      {{ option.providerLabel }}
                    </p>
                    <p class="co__delivery-mode">
                      {{ option.modeLabel }}
                    </p>
                  </div>
                </div>
                <div class="co__delivery-right">
                  <span class="co__delivery-price">
                    {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
                  </span>
                  <span
                    class="co__radio"
                    :class="form.selectedDeliveryOption === option.id && 'is-checked'"
                  />
                </div>

                <!-- Maystro pickup info -->
                <div
                  v-if="option.mode === 'pickup' && option.provider && form.selectedDeliveryOption === option.id"
                  class="mt-3 pt-3 border-t border-slate-200"
                >
                  <StorefrontSharedPickupPointField
                    v-model="form.pickupPoint"
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
            </div>
          </div>
          <div
            v-else
            class="co__card co__delivery-hint"
          >
            <svg
              width="16"
              height="20"
              viewBox="0 0 10 12"
              fill="none"
              style="color:var(--at-muted)"
            >
              <path
                d="M5 11S1 7.5 1 4.5a4 4 0 018 0C9 7.5 5 11 5 11z"
                stroke="currentColor"
                stroke-width="0.75"
              />
            </svg>
            {{ storefrontContent.checkout.help.deliveryOptions }}
          </div>

          <!-- Error -->
          <div
            v-if="errorMessage"
            class="co__error"
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
            {{ errorMessage }}
          </div>
        </div>

        <!-- ── Right: Summary ─────────────────────────── -->
        <div class="co__summary-col">
          <div class="co__summary-card">
            <span class="at-label co__card-label">{{ storefrontContent.checkout.sections.orderSummary }}</span>

            <!-- Items -->
            <div class="co__summary-items">
              <div
                v-for="item in cartStore.items"
                :key="item.variantId || item.productId"
                class="co__summary-item"
              >
                <div class="co__item-img">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.title"
                    class="co__item-photo"
                  >
                  <span class="co__item-qty">{{ item.quantity }}</span>
                </div>
                <span class="co__item-name">{{ item.title }}</span>
                <span class="co__item-price">{{ formatCurrency(item.lineTotal ?? (item.price * item.quantity)) }}</span>
              </div>
            </div>

            <!-- Coupon -->
            <div class="co__coupon">
              <input
                v-model="couponCode"
                type="text"
                :placeholder="storefrontContent.checkout.coupon.placeholder"
                class="co__input co__coupon-input"
              >
              <button class="co__coupon-btn">
                {{ storefrontContent.actions.apply }}
              </button>
            </div>

            <!-- Totals -->
            <dl class="co__totals">
              <div
                v-if="selectedDelivery"
                class="co__total-row"
              >
                <dt>{{ storefrontContent.checkout.summary.deliveryOption }}</dt>
                <dd class="co__total-detail">
                  {{ selectedDelivery.providerLabel }} — {{ selectedDelivery.modeLabel }}
                </dd>
              </div>
              <div class="co__total-row">
                <dt>{{ storefrontContent.cart.summary.subtotal }}</dt>
                <dd>{{ formatCurrency(cartStore.total) }}</dd>
              </div>
              <div
                v-if="cartStore.clearanceDiscount > 0"
                class="co__total-row co__total-row--clearance"
              >
                <dt>{{ t('storefront.clearance.discountLine') }}</dt>
                <dd>-{{ formatCurrency(cartStore.clearanceDiscount) }}</dd>
              </div>
              <div
                v-if="selectedDelivery"
                class="co__total-row"
              >
                <dt>{{ storefrontContent.cart.summary.shipping }}</dt>
                <dd>{{ selectedDelivery.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${selectedDelivery.price} ${currencyCode}` }}</dd>
              </div>
              <div class="co__total-row co__total-row--grand">
                <dt>{{ storefrontContent.cart.summary.total }}</dt>
                <dd class="co__grand-price">
                  {{ formatCurrency(grandTotal) }}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              class="at-btn-solid"
              :disabled="submitting || !cartEnabled || !hasRequiredFields"
              @click="handleSubmit"
            >
              <Icon
                v-if="submitting"
                name="lucide:loader-2"
                style="width:14px;height:14px"
              />
              {{ submitting ? storefrontContent.checkout.actions.placingOrder : storefrontContent.checkout.actions.placeOrder }}
            </button>

            <NuxtLink
              to="/cart"
              class="co__back-link"
            >
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
  background: var(--at-grad-shell);
  padding: clamp(48px, 8vw, 96px) clamp(20px, 5vw, 80px) clamp(32px, 5vw, 56px);
}
.co__header-inner { max-width: 1200px; margin: 0 auto; }
.co__title {
  font-family: var(--at-f-display);
  font-size: clamp(3rem, 6vw, 5rem);
  font-weight: 600;
  letter-spacing: -0.03em;
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
  border: 1px solid var(--at-border-2);
  border-radius: var(--at-r-sm);
  background: var(--at-gold-dim);
  font-family: var(--at-f-mono);
  font-size: 11px;
  color: var(--at-gold-700);
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
  background: var(--at-grad-paper);
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-lg);
  box-shadow: var(--at-shadow-sm);
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
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--at-sub);
}

/* Inputs — explicit overrides for browser default white bg */
.co__input {
  display: block;
  width: 100%;
  background: var(--at-surface) !important;
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-sm);
  padding: 13px 15px;
  font-family: var(--at-f-mono);
  font-size: 12px;
  font-weight: 300;
  color: var(--at-text) !important;
  outline: none;
  box-shadow: inset 0 1px 2px rgba(58,40,14,0.045);
  transition: border-color 0.2s, box-shadow 0.2s;
  -webkit-appearance: none;
  box-sizing: border-box;
}
.co__input::placeholder { color: var(--at-faint) !important; }
.co__input:hover { border-color: var(--at-border-2); }
.co__input:focus { border-color: var(--at-gold); box-shadow: var(--at-ring); }

.co__select-wrap { position: relative; }
.co__select {
  display: block;
  width: 100%;
  background: var(--at-surface) !important;
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-sm);
  padding: 13px 36px 13px 15px;
  font-family: var(--at-f-mono);
  font-size: 12px;
  font-weight: 300;
  color: var(--at-text) !important;
  outline: none;
  appearance: none;
  cursor: pointer;
  box-shadow: inset 0 1px 2px rgba(58,40,14,0.045);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.co__select:hover { border-color: var(--at-border-2); }
.co__select:focus { border-color: var(--at-gold); box-shadow: var(--at-ring); }
/* Dark options for select elements */
.co__select option { background: var(--at-surface); color: var(--at-text); }
.co__select-arrow { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--at-muted); pointer-events: none; }

/* Delivery options */
.co__delivery-list { display: flex; flex-direction: column; gap: 1px; background: var(--at-border); border: 1px solid var(--at-border); border-radius: var(--at-r-sm); overflow: hidden; }
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
.co__delivery-opt.is-selected { background: var(--at-gold-dim); box-shadow: inset 2px 0 0 var(--at-gold); }
[dir='rtl'] .co__delivery-opt.is-selected { box-shadow: inset -2px 0 0 var(--at-gold); }
.co__delivery-left { display: flex; align-items: center; gap: 12px; }
.co__delivery-icon {
  width: 34px; height: 34px;
  background: var(--at-surface-2);
  border-radius: var(--at-r-pill);
  display: flex; align-items: center; justify-content: center;
  color: var(--at-sub); flex-shrink: 0;
}
.co__delivery-name { font-family: var(--at-f-mono); font-size: 11px; color: var(--at-text); margin-bottom: 2px; }
.co__delivery-mode { font-family: var(--at-f-mono); font-size: 9px; color: var(--at-muted); }
.co__delivery-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.co__delivery-price { font-family: var(--at-f-mono); font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--at-cream); }
.co__radio { width: 14px; height: 14px; border: 1px solid var(--at-border-2); border-radius: 50%; transition: background 0.15s, border-color 0.15s, box-shadow 0.15s; }
.co__radio.is-checked { background: var(--at-cream); border-color: var(--at-cream); box-shadow: inset 0 0 0 3px var(--at-surface); }

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
  border: 1px solid var(--at-skin-soft);
  border-radius: var(--at-r-sm);
  background: var(--at-skin-dim);
  font-family: var(--at-f-mono);
  font-size: 11px;
  color: var(--at-skin);
}

/* Summary */
.co__summary-col {}
.co__summary-card {
  background: var(--at-grad-paper);
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-lg);
  box-shadow: var(--at-shadow-md);
  padding: clamp(20px, 3vw, 32px);
  position: sticky;
  top: 80px;
}

.co__summary-items { display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--at-border); }
.co__summary-item { display: flex; align-items: center; gap: 12px; }
.co__item-img { position: relative; width: 48px; height: 48px; background: var(--at-grad-shell); border: 1px solid var(--at-border); border-radius: var(--at-r-sm); flex-shrink: 0; overflow: visible; }
.co__item-photo { border-radius: calc(var(--at-r-sm) - 1px); }
.co__item-photo { width: 100%; height: 100%; object-fit: cover; }
.co__item-qty {
  position: absolute;
  top: -3px; right: -3px;
  width: 17px; height: 17px;
  border-radius: var(--at-r-pill);
  background: var(--at-grad-green);
  color: #FFFBF0;
  font-family: var(--at-f-mono);
  font-size: 8px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  box-shadow: var(--at-shadow-xs);
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
  border-radius: var(--at-r-sm);
  padding: 0 18px;
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--at-sub);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}
.co__coupon-btn:hover { border-color: var(--at-cream); background: var(--at-cream); color: #FFFBF0; }

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
.co__total-row dd { color: var(--at-text); margin: 0; font-weight: 500; font-variant-numeric: tabular-nums; }
.co__total-row--clearance dt, .co__total-row--clearance dd { color: var(--at-skin) !important; }
.co__total-detail { font-size: 9px !important; color: var(--at-muted) !important; }
.co__total-row--grand {
  padding-top: 14px;
  border-top: 1px solid var(--at-border);
  font-size: 10px;
  letter-spacing: 0;
  text-transform: uppercase;
  margin-top: 4px;
}
.co__grand-price {
  font-family: var(--at-f-display) !important;
  font-size: 1.7rem !important;
  font-weight: 700;
  color: var(--at-cream) !important;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  text-transform: none;
}

.co__back-link {
  display: block;
  text-align: center;
  font-family: var(--at-f-mono);
  font-size: 9px;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--at-muted);
  text-decoration: none;
  padding: 14px;
  margin-top: 8px;
  transition: color 0.2s;
}
.co__back-link:hover { color: var(--at-gold-700); }
</style>
