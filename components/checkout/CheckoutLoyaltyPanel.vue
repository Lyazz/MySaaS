<script setup lang="ts">
const storeSettings = useState<any>('storeSettings')
const cartStore = useCartStore()
const { currencyCode } = useCurrency()
const loyalty = useCheckoutLoyalty()

const enabled = computed(() => storeSettings.value?.loyaltyEnabled === true)
const minRedeemPoints = computed(() => Math.max(0, Number(storeSettings.value?.loyaltyMinRedeemPoints || 0)))
const redeemRate = computed(() => Number(storeSettings.value?.loyaltyRedeemRateDzdPerPoint || 0))
const detectedPhone = computed(() => loyalty.phone.value)
const requestedPointsInput = computed({
  get: () => (loyalty.redeemPointsRequested.value > 0 ? String(loyalty.redeemPointsRequested.value) : ''),
  set: (value: string) => loyalty.setRedeemPointsRequested(value)
})
const estimatedDiscount = computed(() =>
  redeemRate.value > 0 ? Number((loyalty.redeemPointsRequested.value * redeemRate.value).toFixed(2)) : 0
)
</script>

<template>
  <div
    v-if="enabled && cartStore.hasItems"
    class="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8"
  >
    <div class="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-5 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="space-y-2">
          <div class="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            <Icon name="lucide:badge-percent" class="h-4 w-4" />
            Programme de points
          </div>
          <p class="text-sm font-medium text-slate-900">
            Utilisez le meme numero de telephone que votre compte client pour debiter vos points au checkout.
          </p>
          <p class="text-xs text-slate-600">
            Minimum: {{ minRedeemPoints }} points
            <span v-if="redeemRate > 0"> · 1 point = {{ redeemRate }} {{ currencyCode }}</span>
            <span v-if="detectedPhone"> · Telephone detecte: {{ detectedPhone }}</span>
          </p>
        </div>

        <div class="w-full max-w-sm">
          <label class="mb-2 block text-sm font-semibold text-slate-900">
            Points a utiliser
          </label>
          <input
            v-model="requestedPointsInput"
            inputmode="numeric"
            type="number"
            min="0"
            step="1"
            class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            placeholder="0"
          >
          <p class="mt-2 text-xs text-slate-600">
            Reduction estimee: {{ estimatedDiscount.toLocaleString() }} {{ currencyCode }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
