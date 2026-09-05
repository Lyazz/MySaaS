<script setup lang="ts">
const storeSettings = useState<any>('storeSettings')
const cartStore = useCartStore()
const { currencyCode, formatAmount } = useCurrency()
const loyalty = useCheckoutLoyalty()

const enabled = computed(() => storeSettings.value?.loyaltyEnabled === true)
const minRedeemPoints = computed(() => Math.max(0, Number(storeSettings.value?.loyaltyMinRedeemPoints || 0)))
const redeemRate = computed(() => Number(storeSettings.value?.loyaltyRedeemRateDzdPerPoint || 0))
const detectedPhone = computed(() => loyalty.phone.value)
const requestedPointsInput = computed({
  get: () => (loyalty.redeemPointsRequested.value > 0 ? String(loyalty.redeemPointsRequested.value) : ''),
  set: (value: string) => loyalty.setRedeemPointsRequested(value)
})
const estimatedDiscount = computed(() => loyalty.redeemedAmount.value)
const canRedeem = computed(() => loyalty.availablePoints.value >= minRedeemPoints.value)
const balanceMessage = computed(() => {
  if (!detectedPhone.value) return 'Entrez votre numero de telephone pour afficher votre solde et vos points utilisables.'
  if (loyalty.summaryLoading.value) return 'Verification de votre solde en cours...'
  if (loyalty.summaryError.value) return loyalty.summaryError.value
  if (loyalty.availablePoints.value > 0) {
    if (canRedeem.value) return `Vous pouvez utiliser jusqu'a ${loyalty.availablePoints.value} points sur cette commande.`
    return `Solde actuel: ${loyalty.availablePoints.value} points. Minimum requis pour utiliser vos points: ${minRedeemPoints.value}.`
  }
  return 'Aucun point disponible pour ce numero pour le moment.'
})

let refreshTimer: ReturnType<typeof setTimeout> | null = null

watch(
  [
    detectedPhone,
    () => loyalty.redeemPointsRequested.value,
    () => cartStore.items.map((item) => `${item.productId}:${item.variantId || ''}:${item.quantity}`).join('|')
  ],
  () => {
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      loyalty.refreshSummary()
    }, 250)
  },
  { immediate: true }
)

onUnmounted(() => {
  if (refreshTimer) clearTimeout(refreshTimer)
})
</script>

<template>
  <div
    v-if="enabled && cartStore.hasItems"
    class="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8"
  >
    <div class="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-5 shadow-sm">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] lg:items-start">
        <div class="space-y-4">
          <div class="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            <Icon name="lucide:badge-percent" class="h-4 w-4" />
            Programme de points
          </div>
          <p class="text-sm font-medium text-slate-900">
            Retrouvez ici vos points disponibles, ce que cette commande va vous faire gagner, et ce que vous pouvez utiliser maintenant.
          </p>
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-emerald-100 bg-white/80 p-4">
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Base points</div>
              <div class="mt-2 text-2xl font-bold text-slate-900">{{ loyalty.basePointsToEarn.value }}</div>
            </div>
            <div class="rounded-2xl border border-emerald-100 bg-white/80 p-4">
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Product points</div>
              <div class="mt-2 text-2xl font-bold text-slate-900">{{ loyalty.productPointsToEarn.value }}</div>
            </div>
            <div class="rounded-2xl border border-emerald-100 bg-white/80 p-4">
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Total to earn</div>
              <div class="mt-2 text-2xl font-bold text-slate-900">{{ loyalty.totalPointsToEarn.value }}</div>
              <div class="mt-1 text-xs text-slate-500">
                {{ loyalty.basePointsToEarn.value }} + {{ loyalty.productPointsToEarn.value }}
              </div>
            </div>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white/85 p-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Current balance</div>
                <div class="mt-1 text-xl font-bold text-slate-900">{{ loyalty.availablePoints.value }} points</div>
              </div>
              <div v-if="detectedPhone" class="text-xs text-slate-500">
                Telephone: {{ detectedPhone }}
              </div>
            </div>
            <p class="mt-2 text-xs text-slate-600">
              {{ balanceMessage }}
            </p>
          </div>
        </div>

        <div class="rounded-2xl border border-emerald-100 bg-white/80 p-4">
          <div class="text-sm font-semibold text-slate-900">
            Utiliser mes points
          </div>
          <p class="mt-1 text-xs text-slate-600">
            Minimum: {{ minRedeemPoints }} points
            <span v-if="redeemRate > 0"> · 1 point = {{ formatAmount(redeemRate) }} {{ currencyCode }}</span>
          </p>
          <label class="mt-4 block text-sm font-semibold text-slate-900">
            Points a utiliser
          </label>
          <input
            v-model="requestedPointsInput"
            inputmode="numeric"
            type="number"
            min="0"
            step="1"
            class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            placeholder="0"
          >
          <p class="mt-2 text-xs text-slate-600">
            Reduction estimee: {{ formatAmount(estimatedDiscount) }} {{ currencyCode }}
          </p>
          <p v-if="loyalty.pendingRedeemPoints.value > 0" class="mt-2 text-xs text-amber-700">
            {{ loyalty.pendingRedeemPoints.value }} points sont deja reserves sur une autre commande en cours.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
