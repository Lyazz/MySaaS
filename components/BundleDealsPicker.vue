<script setup lang="ts">
type BundleDeal = {
  id?: string
  bundleQty: number
  bundlePrice: number | string
  tag?: string | null
}

const props = defineProps<{
  bundleDeals: BundleDeal[]
  unitPrice: number
  maxQuantity?: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'selectQty', qty: number): void
}>()

const { format: formatCurrency } = useCurrency()
const { t } = useI18n({ useScope: 'global' })

const tagLabel = (tag: string | null | undefined): string | null => {
  if (!tag) return null
  return t(`bundleTags.${String(tag).toUpperCase()}`)
}

const offers = computed(() => {
  const unitPrice = Number(props.unitPrice || 0)
  const maxQuantity = Number(props.maxQuantity ?? Number.POSITIVE_INFINITY)

  const deals = Array.isArray(props.bundleDeals) ? props.bundleDeals : []
  return deals
    .map((d) => {
      const bundleQty = Math.floor(Number(d.bundleQty))
      const bundlePrice = Number(d.bundlePrice)
      const baseTotal = unitPrice * bundleQty
      const savings = Math.max(0, baseTotal - bundlePrice) // Prevent negative savings from breaking the UI
      return {
        id: d.id,
        bundleQty,
        bundlePrice,
        tag: tagLabel(d.tag),
        savings,
        // Only disable if quantity is invalid or price is completely broken
        disabled: !Number.isFinite(bundleQty) || bundleQty < 2 || bundleQty > maxQuantity || !Number.isFinite(bundlePrice)
      }
    })
    .filter((o) => !o.disabled)
    // Removed strict savings > 0 filter to ensure bundles set by the admin always show up, 
    // even if the base price vs bundle price math is temporarily equal (e.g., free gift bundles)
    .sort((a, b) => a.bundleQty - b.bundleQty)
})

const onPick = (qty: number) => {
  if (props.disabled) return
  emit('selectQty', qty)
}
</script>

<template>
  <div v-if="offers.length" class="mt-8 mb-6">
    <div class="flex items-center gap-2 mb-4">
      <div class="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
        <Icon name="lucide:gift" class="w-4 h-4" />
      </div>
      <h3 class="text-lg font-bold text-slate-900 tracking-tight">{{ t('storefront.bundleDeals.title') }}</h3>
    </div>
    
    <div class="space-y-3">
      <button
        v-for="(o, index) in offers"
        :key="o.id || String(o.bundleQty)"
        type="button"
        class="w-full relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 text-start group overflow-hidden gap-3 sm:gap-4"
        :class="[
          disabled ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50' : 'bg-white border-brand-100/50 hover:border-brand-500 hover:shadow-lg hover:shadow-brand-500/10 cursor-pointer'
        ]"
        :disabled="disabled"
        @click="onPick(o.bundleQty)"
      >
        <!-- Subtle gradient background purely for aesthetics -->
        <div class="absolute inset-0 bg-gradient-to-r from-brand-50/0 via-brand-50/0 to-brand-50/50 opacity-0 group-hover:opacity-100 transition-opacity z-0 pointer-events-none"></div>
        
        <div class="relative z-10 flex items-start sm:items-center gap-3 sm:gap-4 flex-1">
            <!-- Simulated Radio Button -->
            <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm bg-white shrink-0 mt-0.5 sm:mt-0"
                 :class="disabled ? 'border-slate-300' : 'border-slate-300 group-hover:border-brand-500'">
                <div class="w-2.5 h-2.5 rounded-full bg-brand-500 scale-0 group-hover:scale-100 transition-transform"></div>
            </div>

            <div class="flex-1 min-w-0 flex flex-col justify-center">
                <div class="flex flex-wrap items-center gap-2 mb-1 sm:mb-0.5">
                    <span class="text-base font-bold text-slate-900 shrink-0 leading-none">{{ t('storefront.bundleDeals.buy', { qty: o.bundleQty }) }}</span>
                    <span
                        v-if="o.tag"
                        class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-sm shrink-0 leading-tight"
                    >
                        {{ o.tag }}
                    </span>
                    <span v-else-if="index === offers.length - 1" class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-sm animate-pulse shrink-0 leading-tight">
                        BEST VALUE
                    </span>
                </div>
                <div v-if="o.savings > 0" class="text-sm font-semibold text-emerald-600">
                    {{ t('storefront.bundleDeals.save', { amount: formatCurrency(o.savings) }) }}
                </div>
            </div>
        </div>

        <!-- Prices Section (Pushed right on desktop, aligned left on mobile) -->
        <div class="relative z-10 sm:text-end shrink-0 ms-8 sm:ms-auto flex sm:flex-col items-baseline sm:items-end gap-2 sm:gap-0 mt-1 sm:mt-0">
            <div class="text-lg font-black text-slate-900 leading-none whitespace-nowrap">
                {{ formatCurrency(o.bundlePrice) }}
            </div>
            <div v-if="o.savings > 0" class="text-xs text-slate-400 line-through whitespace-nowrap sm:mt-1">
                {{ formatCurrency(Number(unitPrice) * o.bundleQty) }}
            </div>
        </div>
      </button>
    </div>
  </div>
</template>
