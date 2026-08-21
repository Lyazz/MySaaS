<script setup lang="ts">
import type { ProductCardVariantModalItem } from '~/composables/useProductCardVariantGuard'
import { useCartStore } from '~/stores/cart'

type TemplateKey =
  | 'classic'
  | 'modern'
  | 'interior'
  | 'minimal'
  | 'street'
  | 'cozy'
  | 'cyber'
  | 'stationnery'
  | 'food'
  | 'wellness'
  | 'playful'
  | 'activewear'
  | 'chrono'
  | 'maison'
  | 'arena'
  | 'nour'
  | 'embellir'

type ThemeTokens = {
  overlay: string
  panel: string
  font: string
  title: string
  subtitle: string
  row: string
  rowLabel: string
  rowMeta: string
  price: string
  addBtn: string
  closeBtn: string
  unavailable: string
}

const modal = useProductCardVariantModalState()
const {
  open,
  loading,
  error,
  productId,
  productTitle,
  productSlug,
  fallbackImage,
  bundleDeals,
  metaPixelIds,
  templateKey,
  variants
} = modal

onMounted(() => {
  modal.close()
})
const cartStore = useCartStore()
const storefrontContent = useStorefrontContent()
const { format: formatCurrency } = useCurrency()

const themeTokens: Record<TemplateKey | 'default', ThemeTokens> = {
  modern: {
    overlay: 'bg-slate-900/60',
    panel: 'bg-white border border-slate-200',
    font: 'font-sans',
    title: 'text-slate-900',
    subtitle: 'text-slate-500',
    row: 'border-slate-200 hover:border-brand-300 hover:bg-brand-50/30',
    rowLabel: 'text-slate-900',
    rowMeta: 'text-slate-500',
    price: 'text-brand-700',
    addBtn: 'bg-slate-900 text-white hover:bg-brand-600',
    closeBtn: 'text-slate-500 hover:text-slate-900',
    unavailable: 'text-red-600'
  },
  interior: {
    overlay: 'bg-slate-900/65',
    panel: 'bg-white border border-slate-200 rounded-3xl',
    font: 'font-sans',
    title: 'text-slate-900',
    subtitle: 'text-slate-500',
    row: 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40',
    rowLabel: 'text-slate-900',
    rowMeta: 'text-slate-500',
    price: 'text-emerald-700',
    addBtn: 'bg-slate-900 text-white hover:bg-emerald-600',
    closeBtn: 'text-slate-500 hover:text-slate-900',
    unavailable: 'text-red-600'
  },
  minimal: {
    overlay: 'bg-slate-900/60',
    panel: 'bg-white border border-slate-200',
    font: 'font-sans',
    title: 'text-slate-900',
    subtitle: 'text-slate-500',
    row: 'border-slate-200 hover:border-slate-400',
    rowLabel: 'text-slate-900',
    rowMeta: 'text-slate-500',
    price: 'text-slate-900',
    addBtn: 'bg-slate-900 text-white hover:bg-slate-700',
    closeBtn: 'text-slate-500 hover:text-slate-900',
    unavailable: 'text-red-700'
  },
  classic: {
    overlay: 'bg-slate-900/60',
    panel: 'bg-white border border-slate-200',
    font: 'font-serif',
    title: 'text-slate-900',
    subtitle: 'text-slate-500',
    row: 'border-slate-200 hover:border-brand-300 hover:bg-brand-50/30',
    rowLabel: 'text-slate-900',
    rowMeta: 'text-slate-500',
    price: 'text-brand-700',
    addBtn: 'bg-slate-900 text-white hover:bg-brand-600',
    closeBtn: 'text-slate-500 hover:text-slate-900',
    unavailable: 'text-red-600'
  },
  food: {
    overlay: 'bg-stone-900/55',
    panel: 'bg-white border border-stone-200 rounded-[2rem]',
    font: 'font-sans',
    title: 'text-stone-900',
    subtitle: 'text-stone-500',
    row: 'border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/30',
    rowLabel: 'text-stone-900',
    rowMeta: 'text-stone-500',
    price: 'text-emerald-700',
    addBtn: 'bg-stone-900 text-white hover:bg-emerald-600',
    closeBtn: 'text-stone-500 hover:text-stone-900',
    unavailable: 'text-red-600'
  },
  cozy: {
    overlay: 'bg-amber-900/35',
    panel: 'bg-white border border-amber-100 rounded-[2rem]',
    font: 'font-cozy',
    title: 'text-amber-900',
    subtitle: 'text-amber-700/80',
    row: 'border-amber-200 hover:border-brand-300 hover:bg-amber-50/60',
    rowLabel: 'text-amber-900',
    rowMeta: 'text-amber-700/80',
    price: 'text-brand-700',
    addBtn: 'bg-brand-600 text-white hover:bg-brand-700',
    closeBtn: 'text-amber-700 hover:text-amber-900',
    unavailable: 'text-red-600'
  },
  cyber: {
    overlay: 'bg-black/80',
    panel: 'bg-[#140b24] border border-pink-500/40',
    font: '',
    title: 'text-pink-200',
    subtitle: 'text-purple-300/80',
    row: 'border-purple-500/30 hover:border-pink-400/60 hover:bg-pink-500/10',
    rowLabel: 'text-white',
    rowMeta: 'text-purple-200/80',
    price: 'text-pink-300',
    addBtn: 'bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:brightness-110',
    closeBtn: 'text-purple-200 hover:text-white',
    unavailable: 'text-red-300'
  },
  arena: {
    overlay: 'bg-black/80',
    panel: 'bg-[#0b0f14] border border-brand-500/30',
    font: 'font-sans',
    title: 'text-white',
    subtitle: 'text-slate-300',
    row: 'border-white/10 hover:border-brand-500/50 hover:bg-brand-500/10',
    rowLabel: 'text-white font-bold uppercase tracking-[0.08em]',
    rowMeta: 'text-slate-400',
    price: 'text-brand-500',
    addBtn: 'bg-brand-500 text-[#02060a] hover:bg-brand-400',
    closeBtn: 'text-slate-300 hover:text-white',
    unavailable: 'text-red-300'
  },
  stationnery: {
    overlay: 'bg-stone-900/60',
    panel: 'bg-white border border-stone-200',
    font: 'font-stationery',
    title: 'text-stone-900',
    subtitle: 'text-stone-500',
    row: 'border-stone-200 hover:border-red-300 hover:bg-red-50/20',
    rowLabel: 'text-stone-900',
    rowMeta: 'text-stone-500',
    price: 'text-red-700',
    addBtn: 'bg-stone-900 text-white hover:bg-red-600',
    closeBtn: 'text-stone-500 hover:text-stone-900',
    unavailable: 'text-red-600'
  },
  street: {
    overlay: 'bg-black/70',
    panel: 'bg-[#fffdf6] border-2 border-black',
    font: 'font-street',
    title: 'text-black',
    subtitle: 'text-black/65',
    row: 'border-2 border-black/20 hover:border-black hover:bg-[#ffe9d2]',
    rowLabel: 'text-black font-black uppercase',
    rowMeta: 'text-black/70',
    price: 'text-black',
    addBtn: 'bg-black text-white hover:bg-brand-600',
    closeBtn: 'text-black/60 hover:text-black',
    unavailable: 'text-red-700'
  },
  wellness: {
    overlay: 'bg-stone-900/55',
    panel: 'bg-white border border-stone-200 rounded-3xl',
    font: 'font-wellness',
    title: 'text-stone-900',
    subtitle: 'text-stone-500',
    row: 'border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/40',
    rowLabel: 'text-stone-900',
    rowMeta: 'text-stone-500',
    price: 'text-emerald-700',
    addBtn: 'bg-stone-900 text-white hover:bg-emerald-600',
    closeBtn: 'text-stone-500 hover:text-stone-900',
    unavailable: 'text-red-700'
  },
  playful: {
    overlay: 'bg-violet-900/55',
    panel: 'bg-white border-2 border-violet-200 rounded-3xl',
    font: 'font-sans',
    title: 'text-violet-800',
    subtitle: 'text-violet-500',
    row: 'border-violet-200 hover:border-pink-300 hover:bg-pink-50/40',
    rowLabel: 'text-violet-900',
    rowMeta: 'text-violet-500',
    price: 'text-pink-600',
    addBtn: 'bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:brightness-110',
    closeBtn: 'text-violet-500 hover:text-violet-900',
    unavailable: 'text-red-600'
  },
  activewear: {
    overlay: 'bg-black/75',
    panel: 'bg-[#101010] border-2 border-[#333]',
    font: 'font-activewear',
    title: 'text-white',
    subtitle: 'text-zinc-400',
    row: 'border-2 border-[#333] hover:border-brand-500 hover:bg-zinc-900',
    rowLabel: 'text-white font-bold uppercase',
    rowMeta: 'text-zinc-400',
    price: 'text-brand-400',
    addBtn: 'bg-brand-500 text-black hover:bg-brand-400 font-black uppercase',
    closeBtn: 'text-zinc-400 hover:text-white',
    unavailable: 'text-red-400'
  },
  chrono: {
    overlay: 'bg-[#06080f]/85',
    panel: 'bg-[#111827] border border-[#3d4b63]',
    font: 'font-serif',
    title: 'text-[#E8E0D5]',
    subtitle: 'text-[#A6A19A]',
    row: 'border-[#3d4b63] hover:border-[#A67C52] hover:bg-[#1a2538]',
    rowLabel: 'text-[#E8E0D5]',
    rowMeta: 'text-[#A6A19A]',
    price: 'text-[#D4C5A9]',
    addBtn: 'bg-[#A67C52] text-white hover:brightness-110',
    closeBtn: 'text-[#A6A19A] hover:text-[#E8E0D5]',
    unavailable: 'text-[#f08a7b]'
  },
  maison: {
    overlay: 'bg-stone-900/60',
    panel: 'bg-[#f8f5ef] border border-[#d8d0c0]',
    font: '',
    title: 'text-[#3c3428]',
    subtitle: 'text-[#6f6659]',
    row: 'border-[#d8d0c0] hover:border-[#a58d6a] hover:bg-[#f2ece1]',
    rowLabel: 'text-[#3c3428]',
    rowMeta: 'text-[#6f6659]',
    price: 'text-[#7d6542]',
    addBtn: 'bg-[#3c3428] text-white hover:bg-[#7d6542]',
    closeBtn: 'text-[#6f6659] hover:text-[#3c3428]',
    unavailable: 'text-red-700'
  },
  nour: {
    overlay: 'bg-[#2E1E20]/55',
    panel: 'bg-[#FFFDF9] border border-[#C9A24B]/40 rounded-[20px]',
    font: '',
    title: 'text-[#2E1E20]',
    subtitle: 'text-[#6B5850]',
    row: 'border-[#C9A24B]/35 hover:border-brand-300 hover:bg-[#FAF3EA]',
    rowLabel: 'text-[#2E1E20]',
    rowMeta: 'text-[#6B5850]',
    price: 'text-brand-700',
    addBtn: 'bg-[#2E1E20] text-white hover:bg-brand-700',
    closeBtn: 'text-[#9C8B82] hover:text-[#2E1E20]',
    unavailable: 'text-rose-700'
  },
  embellir: {
    overlay: 'bg-[#062622]/70',
    panel: 'bg-[#FDFAF4] border border-[#CBBDAB] !rounded-[2px]',
    font: '',
    title: 'text-[#16211E]',
    subtitle: 'text-[#5A6763]',
    row: '!rounded-[2px] border-[#CBBDAB] hover:border-[#DFA254] hover:bg-[#F2ECE1]',
    rowLabel: 'text-[#16211E]',
    rowMeta: 'text-[#5A6763]',
    price: 'text-brand-700',
    addBtn: '!rounded-[2px] bg-brand-600 text-[#FDFAF4] hover:bg-[#DFA254] hover:text-[#062622]',
    closeBtn: '!rounded-[2px] text-[#5A6763] hover:text-[#16211E]',
    unavailable: 'text-[#B4593F]'
  },
  default: {
    overlay: 'bg-slate-900/60',
    panel: 'bg-white border border-slate-200',
    font: 'font-sans',
    title: 'text-slate-900',
    subtitle: 'text-slate-500',
    row: 'border-slate-200 hover:border-brand-300 hover:bg-brand-50/30',
    rowLabel: 'text-slate-900',
    rowMeta: 'text-slate-500',
    price: 'text-brand-700',
    addBtn: 'bg-slate-900 text-white hover:bg-brand-600',
    closeBtn: 'text-slate-500 hover:text-slate-900',
    unavailable: 'text-red-600'
  }
}

const tokens = computed(() => {
  const key = templateKey.value || 'default'
  return themeTokens[key] || themeTokens.default
})

const isOutOfStock = (variant: ProductCardVariantModalItem) => !variant.inStock

const handleClose = () => {
  modal.close()
}

const handleVariantSelect = (variant: ProductCardVariantModalItem) => {
  if (!variant || isOutOfStock(variant)) return
  if (!productId.value || !productSlug.value) return

  cartStore.addItem({
    productId: productId.value,
    variantId: variant.id,
    title: `${productTitle.value} (${variant.label})`,
    slug: productSlug.value,
    price: Number(variant.price || 0),
    stock: variant.trackInventory ? variant.stock : 9999,
    image: variant.imageUrl || fallbackImage.value || undefined,
    bundleDeals: bundleDeals.value || [],
    metaPixelIds: metaPixelIds.value || []
  })

  if (process.client) {
    alert(storefrontContent.value.product.addedToCart(`${productTitle.value} (${variant.label})`))
  }

  modal.close()
}
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-150"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-[120] flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0"
        :class="tokens.overlay"
        @click="handleClose"
      />

      <div
        class="relative z-10 w-full max-w-xl rounded-2xl p-5 sm:p-6 shadow-2xl"
        :class="[tokens.panel, tokens.font]"
      >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-xl font-semibold leading-tight" :class="tokens.title">
                {{ storefrontContent.cart.item.variant }}
              </h3>
              <p class="mt-1 text-sm" :class="tokens.subtitle">
                {{ productTitle }}
              </p>
            </div>
            <button
              type="button"
              class="rounded-full p-2 transition-colors"
              :class="tokens.closeBtn"
              @click="handleClose"
            >
              <Icon name="lucide:x" class="h-5 w-5" />
            </button>
          </div>

          <div v-if="loading" class="py-10 text-center">
            <Icon name="lucide:loader-circle" class="mx-auto h-7 w-7 animate-spin opacity-70" :class="tokens.subtitle" />
            <p class="mt-2 text-sm" :class="tokens.subtitle">
              {{ storefrontContent.actions.adding }}
            </p>
          </div>

          <div v-else-if="error" class="py-6">
            <p class="text-sm font-medium text-red-600">{{ error }}</p>
          </div>

          <div v-else class="mt-4 max-h-[55vh] space-y-3 overflow-y-auto pe-1">
            <div
              v-for="variant in variants"
              :key="variant.id"
              class="rounded-xl border p-3 sm:p-4 transition-colors"
              :class="tokens.row"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold sm:text-base" :class="tokens.rowLabel">
                    {{ variant.label }}
                  </p>
                  <p class="mt-1 text-xs sm:text-sm" :class="tokens.rowMeta">
                    <span v-if="variant.trackInventory">{{ variant.stock }} • {{ storefrontContent.product.inStock }}</span>
                    <span v-else>{{ storefrontContent.product.inStock }}</span>
                  </p>
                </div>
                <div class="shrink-0 text-end">
                  <p class="text-sm font-semibold sm:text-base" :class="tokens.price">
                    {{ formatCurrency(variant.price) }}
                  </p>
                </div>
              </div>

              <div class="mt-3 flex justify-end">
                <button
                  type="button"
                  class="rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm"
                  :disabled="isOutOfStock(variant)"
                  :class="isOutOfStock(variant) ? `${tokens.unavailable} cursor-not-allowed border border-current bg-transparent` : tokens.addBtn"
                  @click="handleVariantSelect(variant)"
                >
                  {{ isOutOfStock(variant) ? storefrontContent.actions.outOfStock : storefrontContent.actions.addToCart }}
                </button>
              </div>
            </div>
          </div>
      </div>
    </div>
  </Transition>
</template>
