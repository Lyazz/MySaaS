<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const brandColor = useStorefrontTemplateBrandColor('stationnery')

const storeStyle = computed(() => {
  const primaryColor = brandColor.value.color
  
  // Helper to convert hex to rgb
  const hexToRgb = (hex: string) => {
    // Ensure hex is valid
    if (!hex || typeof hex !== 'string') return '51 65 85'
    
    // Remove hash
    hex = hex.replace('#', '')
    
    // Handle short hex
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('')
    }
    
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '51 65 85'
    
    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
  }

  const result = {
    '--brand': primaryColor,
    '--brand-rgb': hexToRgb(primaryColor),
    fontFamily: "'Merriweather', 'Playfair Display', serif",
    // Shared LocaleSwitcher — paper-warm, tight corners
    '--ls-surface': '#fdfbf7',
    '--ls-border': 'rgba(30,41,59,0.14)',
    '--ls-shadow': '0 14px 32px -14px rgba(30,41,59,0.20)',
    '--ls-radius': '6px',
    '--ls-text': '#475569',
    '--ls-text-strong': '#1e293b',
    '--ls-hover-bg': 'rgba(30,41,59,0.05)',
    '--ls-accent': 'color-mix(in srgb, var(--brand) 58%, #1e293b)'
  } as Record<string, string>

  return result
})

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div
    class="min-h-screen bg-[#fdfbf7] font-stationery text-slate-800"
    :style="storeStyle"
  >
    <slot />
  </div>
</template>
