<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const brandColor = useStorefrontTemplateBrandColor('interior')

const storeStyle = computed(() => {
  const primaryColor = brandColor.value.color
  
  // Helper to convert hex to rgb
  const hexToRgb = (hex: string) => {
    // Ensure hex is valid
    if (!hex || typeof hex !== 'string') return '13 148 136'
    
    // Remove hash
    hex = hex.replace('#', '')
    
    // Handle short hex
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('')
    }
    
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '13 148 136'
    
    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
  }

  const result = {
    '--brand': primaryColor,
    '--brand-rgb': hexToRgb(primaryColor),
    fontFamily: "'Outfit', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    // Shared LocaleSwitcher
    '--ls-surface': '#ffffff',
    '--ls-border': 'rgba(15,23,42,0.10)',
    '--ls-shadow': '0 14px 34px -14px rgba(15,23,42,0.20)',
    '--ls-radius': '10px',
    '--ls-text': '#475569',
    '--ls-text-strong': '#0f172a',
    '--ls-hover-bg': 'rgba(15,23,42,0.05)',
    '--ls-accent': 'color-mix(in srgb, var(--brand) 58%, #0f172a)'
  } as Record<string, string>

  return result
})

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div
    class="min-h-screen bg-slate-50 font-sans text-slate-600"
    :style="storeStyle"
  >
    <slot />
  </div>
</template>
