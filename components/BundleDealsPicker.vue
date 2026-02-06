<script setup lang="ts">
import en from '~/locales/en.json'
import fr from '~/locales/fr.json'
import ar from '~/locales/ar.json'

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
const storeSettings = useState<any>('storeSettings')
const language = computed(() => String(storeSettings.value?.language || 'fr').toLowerCase())

const dict = computed(() => {
  const base = language.value.split('-')[0]
  if (base === 'ar') return ar as any
  if (base === 'en') return en as any
  return fr as any
})

const t = (path: string): string => {
  const parts = path.split('.')
  let cur: any = dict.value
  for (const p of parts) cur = cur?.[p]
  return typeof cur === 'string' ? cur : path
}

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
      const savings = baseTotal - bundlePrice
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
    .filter((o) => o.savings > 0)
    .sort((a, b) => a.bundleQty - b.bundleQty)
})

const onPick = (qty: number) => {
  if (props.disabled) return
  emit('selectQty', qty)
}
</script>

<template>
  <div v-if="offers.length" class="mt-4">
    <div class="text-xs font-medium text-slate-500 mb-2">Bundle deals</div>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="o in offers"
        :key="o.id || String(o.bundleQty)"
        type="button"
        class="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-left disabled:opacity-50"
        :disabled="disabled"
        @click="onPick(o.bundleQty)"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="text-sm font-semibold text-slate-800">Buy {{ o.bundleQty }}</div>
          <span
            v-if="o.tag"
            class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-brand-600 text-white"
          >
            {{ o.tag }}
          </span>
        </div>
        <div class="text-xs text-slate-600">
          {{ formatCurrency(o.bundlePrice) }}
          <span class="text-emerald-700 font-medium">· Save {{ formatCurrency(o.savings) }}</span>
        </div>
      </button>
    </div>
  </div>
</template>
