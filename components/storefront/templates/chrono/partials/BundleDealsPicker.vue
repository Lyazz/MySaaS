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
      const savings = Math.max(0, baseTotal - bundlePrice)
      return {
        id: d.id,
        bundleQty,
        bundlePrice,
        tag: tagLabel(d.tag),
        savings,
        disabled: !Number.isFinite(bundleQty) || bundleQty < 2 || bundleQty > maxQuantity || !Number.isFinite(bundlePrice)
      }
    })
    .filter((o) => !o.disabled)
    .sort((a, b) => a.bundleQty - b.bundleQty)
})

const onPick = (qty: number) => {
  if (props.disabled) return
  emit('selectQty', qty)
}
</script>

<template>
  <div v-if="offers.length" class="mt-8 mb-6">
    <div class="flex items-center gap-3 mb-5">
      <div class="w-8 h-8 flex items-center justify-center border" style="background-color:#1A1F2E; border-color:rgba(166,124,82,0.25); border-radius:1px; color:#A67C52;">
        <Icon name="lucide:gift" class="w-4 h-4" />
      </div>
      <h3 class="text-sm font-medium tracking-[0.2em] uppercase" style="color:#A67C52;">{{ t('storefront.bundleDeals.title') }}</h3>
    </div>
    
    <div class="space-y-3">
      <button
        v-for="(o, index) in offers"
        :key="o.id || String(o.bundleQty)"
        type="button"
        class="w-full relative flex flex-col sm:flex-row sm:items-center justify-between p-4 border transition-all duration-300 text-start group overflow-hidden gap-3 sm:gap-4"
        :style="disabled 
          ? 'background-color:#0B0E16; border-color:rgba(212,197,169,0.05); color:#3A3530; cursor:not-allowed;' 
          : 'background-color:#131720; border-color:rgba(212,197,169,0.08); color:#C2B89A; cursor:pointer;'"
        :disabled="disabled"
        @click="onPick(o.bundleQty)"
      >
        <!-- Subtle hover overlay -->
        <div class="absolute inset-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100 z-0 pointer-events-none" style="background:linear-gradient(to right, rgba(166,124,82,0.05), transparent);"></div>
        
        <div class="relative z-10 flex items-start sm:items-center gap-3 sm:gap-4 flex-1">
            <!-- Simulated Radio -->
            <div class="w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 mt-0.5 sm:mt-0"
                 :style="disabled ? 'border-color:#2A2520;' : 'border-color:rgba(212,197,169,0.2);'"
                 :class="!disabled ? 'group-hover:border-[#A67C52]' : ''">
                <div class="w-2 h-2 rounded-full transition-transform scale-0 group-hover:scale-100" style="background-color:#A67C52;"></div>
            </div>

            <div class="flex-1 min-w-0 flex flex-col justify-center">
                <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="text-base font-medium tracking-wide shrink-0 leading-none" style="color:#E8E0D5; font-family:'Cormorant Garamond',serif;">{{ t('storefront.bundleDeals.buy', { qty: o.bundleQty }) }}</span>
                    <span
                        v-if="o.tag"
                        class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
                        style="background-color:#A67C52; color:#fff; border-radius:1px;"
                    >
                        {{ o.tag }}
                    </span>
                    <span v-else-if="index === offers.length - 1" class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border animate-pulse" style="border-color:#A67C52; color:#A67C52; border-radius:1px;">
                        BEST VALUE
                    </span>
                </div>
                <div v-if="o.savings > 0" class="text-xs font-medium tracking-wide uppercase" style="color:#70A080;">
                    {{ t('storefront.bundleDeals.save', { amount: formatCurrency(o.savings) }) }}
                </div>
            </div>
        </div>

        <div class="relative z-10 sm:text-end shrink-0 ms-8 sm:ms-auto flex sm:flex-col items-baseline sm:items-end gap-2 sm:gap-0 mt-1 sm:mt-0">
            <div class="text-lg font-light tracking-tight leading-none whitespace-nowrap" style="color:#D4C5A9; font-family:'Cormorant Garamond',serif;">
                {{ formatCurrency(o.bundlePrice) }}
            </div>
            <div v-if="o.savings > 0" class="text-xs line-through whitespace-nowrap sm:mt-1.5" style="color:#4A4540;">
                {{ formatCurrency(Number(unitPrice) * o.bundleQty) }}
            </div>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
