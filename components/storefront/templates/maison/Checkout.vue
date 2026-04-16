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
const pickupPoints = ref<Array<{ pickup_point: number; commune: number; name?: string; name_lt?: string; name_ar?: string }>>([])
const pickupPointsLoading = ref(false)
const pickupPointsError = ref('')

const syncPickupPointCommune = () => {
  const name = (form.value.pickupPoint || '').trim()
  if (!name) return
  const point = pickupPoints.value.find((p) => (p.name || p.name_lt || p.name_ar || '') === name)
  if (!point?.commune) return
  const nextCommune = String(point.commune)
  if (nextCommune && form.value.commune !== nextCommune) form.value.commune = nextCommune
}

watch(
  [isMaystroPickup, () => form.value.commune, () => form.value.wilaya],
  async ([enabled, commune, wilaya]) => {
    pickupPointsError.value = ''
    pickupPoints.value = []
    if (!enabled) { form.value.pickupPoint = ''; return }
    if (!wilaya || !commune) return
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
            name_ar: p?.name_ar ? String(p.name_ar) : undefined
          })).filter((p) => Number.isFinite(p.commune) && p.commune > 0)
        : []
      if (pickupPoints.value.length > 0) {
        const current = (form.value.pickupPoint || '').trim()
        if (!current || !pickupPoints.value.some((p) => (p.name || p.name_lt || p.name_ar || '') === current)) {
          form.value.pickupPoint = pickupPoints.value[0].name || pickupPoints.value[0].name_lt || pickupPoints.value[0].name_ar || ''
          syncPickupPointCommune()
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
  <div class="min-h-screen py-12 md:py-16">
    <div class="max-w-6xl mx-auto px-6">
      <!-- Header -->
      <div class="mb-12">
        <p class="text-[10px] tracking-[0.3em] uppercase text-[#C17B4E] mb-3">Finaliser</p>
        <h1 class="font-maison-serif text-4xl font-semibold text-[#2C2420]">{{ storefrontContent.checkout.title }}</h1>
      </div>

      <div v-if="!cartEnabled" class="mb-8 p-5 border border-amber-200 bg-amber-50 text-amber-700 text-sm">
        {{ storefrontContent.checkout.disabled }}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <!-- Left: Form -->
        <div class="lg:col-span-7 space-y-6">
          <!-- Customer info -->
          <div class="bg-white border border-[#E8E0D4] p-8">
            <h2 class="text-[10px] tracking-[0.25em] uppercase font-bold text-[#B0A090] mb-6">
              {{ storefrontContent.checkout.sections.customerInformation }}
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label class="block text-xs text-[#7A6558] mb-2">{{ storefrontContent.checkout.form.fullName.label }}</label>
                <input
                  v-model="form.fullName"
                  type="text"
                  :placeholder="storefrontContent.checkout.form.fullName.placeholder"
                  class="w-full border border-[#E8E0D4] bg-[#FAF8F5] py-3 px-4 text-sm text-[#2C2420] placeholder:text-[#B0A090] focus:border-[#C17B4E] focus:ring-1 focus:ring-[#C17B4E]/20 outline-none transition-colors"
                >
              </div>
              <div>
                <label class="block text-xs text-[#7A6558] mb-2">{{ storefrontContent.checkout.form.phone.label }}</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  :placeholder="storefrontContent.checkout.form.phone.placeholder"
                  class="w-full border border-[#E8E0D4] bg-[#FAF8F5] py-3 px-4 text-sm text-[#2C2420] placeholder:text-[#B0A090] focus:border-[#C17B4E] focus:ring-1 focus:ring-[#C17B4E]/20 outline-none transition-colors"
                >
              </div>
              <div>
                <label class="block text-xs text-[#7A6558] mb-2">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                <div class="relative">
                  <select
                    v-model="form.wilaya"
                    class="w-full border border-[#E8E0D4] bg-[#FAF8F5] py-3 px-4 text-sm text-[#2C2420] focus:border-[#C17B4E] outline-none appearance-none cursor-pointer"
                  >
                    <option value="" disabled>{{ storefrontContent.checkout.form.wilaya.placeholder }}</option>
                    <option v-for="w in wilayas" :key="w.code" :value="w.code">{{ w.code }} - {{ w.name }}</option>
                  </select>
                  <Icon name="lucide:chevron-down" class="w-4 h-4 text-[#B0A090] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label class="block text-xs text-[#7A6558] mb-2">{{ storefrontContent.checkout.form.commune.label }}</label>
                <CommuneField
                  v-model="form.commune"
                  :wilaya-code="form.wilaya"
                  :placeholder="storefrontContent.checkout.form.commune.placeholder"
                  :input-class="'w-full border border-[#E8E0D4] bg-[#FAF8F5] py-3 px-4 text-sm text-[#2C2420] placeholder:text-[#B0A090] focus:border-[#C17B4E] outline-none transition-colors'"
                  :select-class="'w-full border border-[#E8E0D4] bg-[#FAF8F5] py-3 px-4 text-sm text-[#2C2420] focus:border-[#C17B4E] outline-none transition-colors'"
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-xs text-[#7A6558] mb-2">{{ storefrontContent.checkout.form.address.label }}</label>
                <input
                  v-model="form.address"
                  type="text"
                  :placeholder="storefrontContent.checkout.form.address.placeholder"
                  class="w-full border border-[#E8E0D4] bg-[#FAF8F5] py-3 px-4 text-sm text-[#2C2420] placeholder:text-[#B0A090] focus:border-[#C17B4E] focus:ring-1 focus:ring-[#C17B4E]/20 outline-none transition-colors"
                >
              </div>
            </div>
          </div>

          <!-- Delivery options -->
          <div class="bg-white border border-[#E8E0D4] p-8">
            <h2 class="text-[10px] tracking-[0.25em] uppercase font-bold text-[#B0A090] mb-6">
              {{ storefrontContent.checkout.sections.deliveryMethod }}
            </h2>
            <div class="space-y-3">
              <div
                v-for="option in deliveryOptions"
                :key="option.id"
                class="p-4 border cursor-pointer transition-all flex items-center justify-between gap-4"
                :class="form.selectedDeliveryOption === option.id
                  ? 'border-[#C17B4E] bg-[#C17B4E]/5'
                  : 'border-[#E8E0D4] hover:border-[#D4C4B4]'"
                @click="form.selectedDeliveryOption = option.id"
              >
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 bg-[#F0EBE3] flex items-center justify-center shrink-0">
                    <Icon :name="option.icon" class="w-5 h-5 text-[#7A6558]" />
                  </div>
                  <div>
                    <h3 class="text-sm font-medium text-[#2C2420]">{{ option.providerLabel }}</h3>
                    <p class="text-xs text-[#B0A090]">{{ option.modeLabel }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="font-semibold text-[#C17B4E] text-sm">
                    {{ option.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${option.price} ${currencyCode}` }}
                  </span>
                  <span
                    class="w-4 h-4 border-2 rounded-full shrink-0 flex items-center justify-center transition-colors"
                    :class="form.selectedDeliveryOption === option.id ? 'border-[#C17B4E] bg-[#C17B4E]' : 'border-[#D4C4B4]'"
                  >
                    <Icon v-if="form.selectedDeliveryOption === option.id" name="lucide:check" class="w-2.5 h-2.5 text-white" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Error -->
          <div v-if="errorMessage" class="p-4 border border-red-200 bg-red-50 text-red-600 text-sm">
            {{ errorMessage }}
          </div>
        </div>

        <!-- Right: Summary -->
        <div class="lg:col-span-5">
          <div class="bg-white border border-[#E8E0D4] p-8 sticky top-24">
            <h2 class="text-[10px] tracking-[0.25em] uppercase font-bold text-[#B0A090] mb-6">
              {{ storefrontContent.checkout.sections.orderSummary }}
            </h2>

            <!-- Items -->
            <div class="space-y-4 mb-6 pb-6 border-b border-[#E8E0D4]">
              <div v-for="item in cartStore.items" :key="item.variantId || item.productId" class="flex gap-4">
                <div class="w-14 h-14 bg-[#F5F0EA] flex-shrink-0 relative overflow-hidden">
                  <img v-if="item.image" :src="item.image" :alt="item.title" class="w-full h-full object-cover">
                  <span class="absolute -top-0.5 -right-0.5 bg-[#C17B4E] text-white w-4 h-4 text-[9px] font-bold rounded-full flex items-center justify-center">{{ item.quantity }}</span>
                </div>
                <div class="flex-grow min-w-0">
                  <p class="text-sm text-[#2C2420] font-medium truncate">{{ item.title }}</p>
                </div>
                <p class="font-semibold text-[#2C2420] text-sm shrink-0">{{ formatCurrency(item.lineTotal ?? (item.price * item.quantity)) }}</p>
              </div>
            </div>

            <!-- Coupon -->
            <div class="mb-6">
              <div class="flex gap-2">
                <input
                  v-model="couponCode"
                  type="text"
                  :placeholder="storefrontContent.checkout.coupon.placeholder"
                  class="flex-1 border border-[#E8E0D4] bg-[#FAF8F5] py-2.5 px-3 text-xs text-[#2C2420] placeholder:text-[#B0A090] focus:border-[#C17B4E] outline-none"
                >
                <button class="px-4 py-2.5 bg-[#2C2420] text-white text-xs tracking-[0.12em] uppercase hover:bg-[#C17B4E] transition-colors">
                  {{ storefrontContent.actions.apply }}
                </button>
              </div>
            </div>

            <!-- Totals -->
            <dl class="space-y-3 text-sm text-[#7A6558] mb-8">
              <div v-if="selectedDelivery" class="flex justify-between">
                <dt>{{ storefrontContent.checkout.summary.deliveryOption }}</dt>
                <dd class="text-[#2C2420] text-xs">{{ selectedDelivery.providerLabel }} — {{ selectedDelivery.modeLabel }}</dd>
              </div>
              <div class="flex justify-between">
                <dt>{{ storefrontContent.cart.summary.subtotal }}</dt>
                <dd class="font-medium text-[#2C2420]">{{ formatCurrency(cartStore.total) }}</dd>
              </div>
              <div v-if="selectedDelivery" class="flex justify-between">
                <dt>{{ storefrontContent.cart.summary.shipping }}</dt>
                <dd>{{ selectedDelivery.price === 'FREE' ? storefrontContent.checkout.delivery.free : `${selectedDelivery.price} ${currencyCode}` }}</dd>
              </div>
              <div class="flex justify-between pt-4 border-t border-[#E8E0D4] text-base">
                <dt class="font-semibold text-[#2C2420]">{{ storefrontContent.cart.summary.total }}</dt>
                <dd class="font-bold text-[#C17B4E]">{{ formatCurrency(cartStore.total) }}</dd>
              </div>
            </dl>

            <button
              type="button"
              :disabled="submitting || !cartEnabled || !hasRequiredFields"
              class="w-full py-4 bg-[#2C2420] text-white text-xs tracking-[0.2em] uppercase hover:bg-[#C17B4E] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              @click="handleSubmit"
            >
              <Icon v-if="submitting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
              {{ submitting ? storefrontContent.checkout.actions.placingOrder : storefrontContent.checkout.actions.placeOrder }}
            </button>

            <NuxtLink to="/cart" class="block text-center text-xs tracking-[0.12em] uppercase text-[#7A6558] hover:text-[#C17B4E] py-3 mt-3 transition-colors">
              {{ storefrontContent.checkout.actions.returnToCart }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
