<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const brandColor = useStorefrontTemplateBrandColor('arena')

const storeStyle = computed(() => {
  const primaryColor = brandColor.value.color

  const hexToRgb = (hex: string) => {
    if (!hex || typeof hex !== 'string') return '0 184 252'
    hex = hex.replace('#', '')
    if (hex.length === 3) {
      hex = hex.split('').map((char) => char + char).join('')
    }
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '0 184 252'
    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
  }

  return {
    '--brand': primaryColor,
    '--brand-rgb': hexToRgb(primaryColor),
    fontFamily: "'Inter', 'Outfit', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    // Shared LocaleSwitcher — dark chrome for the near-black arena storefront
    '--ls-surface': '#0f141c',
    '--ls-border': 'rgba(255,255,255,0.10)',
    '--ls-shadow': '0 20px 46px -16px rgba(0,0,0,0.7)',
    '--ls-radius': '12px',
    '--ls-text': '#94a3b8',
    '--ls-text-strong': '#f1f5f9',
    '--ls-hover-bg': 'rgba(255,255,255,0.06)'
  } as Record<string, string>
})

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div
    class="min-h-screen bg-[#06080c] font-sans text-slate-300 antialiased selection:bg-brand-500/30 selection:text-white"
    :style="storeStyle"
  >
    <slot />
  </div>
</template>
