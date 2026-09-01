<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const brandColor = useStorefrontTemplateBrandColor('food')

  const storeStyle = computed(() => {
    const primaryColor = brandColor.value.color
  
    // Helper to convert hex to rgb
    const hexToRgb = (hex: string) => {
      // Ensure hex is valid
      if (!hex || typeof hex !== 'string') return '234 88 12'
      
      // Remove hash
      hex = hex.replace('#', '')
      
      // Handle short hex
      if (hex.length === 3) {
          hex = hex.split('').map(char => char + char).join('')
      }
      
      const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      if (!result) return '234 88 12'
      
      return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
    }
  
    const result = {
      '--brand': primaryColor,
      '--brand-rgb': hexToRgb(primaryColor),
      fontFamily: "'Nunito', sans-serif",
      '--font-serif': "'Playfair Display', Georgia, Cambria, 'Times New Roman', Times, serif",
      // Shared LocaleSwitcher — warm, rounded to match the food chrome
      '--ls-surface': '#ffffff',
      '--ls-border': 'rgba(28,25,23,0.12)',
      '--ls-shadow': '0 16px 38px -14px rgba(28,25,23,0.22)',
      '--ls-radius': '14px',
      '--ls-text': '#57534e',
      '--ls-text-strong': '#1c1917',
      '--ls-hover-bg': 'rgba(28,25,23,0.05)',
      '--ls-accent': 'color-mix(in srgb, var(--brand) 58%, #1c1917)'
    } as Record<string, string>

  return result
})

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div
    class="min-h-screen bg-stone-50 font-sans text-stone-600"
    :style="storeStyle"
  >
    <slot />
  </div>
</template>
