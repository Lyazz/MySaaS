<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const brandColor = useStorefrontTemplateBrandColor('activewear')

const storeStyle = computed(() => {
  const primaryColor = brandColor.value.color
  
  // Helper to convert hex to rgb
  const hexToRgb = (hex: string) => {
    // Ensure hex is valid
    if (!hex || typeof hex !== 'string') return '234 179 8' // rgb(234, 179, 8)
    
    // Remove hash
    hex = hex.replace('#', '')
    
    // Handle short hex
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('')
    }
    
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '234 179 8'
    
    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
  }

  const result = {
    '--brand': primaryColor,
    '--brand-rgb': hexToRgb(primaryColor),
    fontFamily: "'Teko', sans-serif",
    // Shared LocaleSwitcher — dark chrome to sit on the black storefront
    '--ls-surface': '#111111',
    '--ls-border': 'rgba(255,255,255,0.14)',
    '--ls-shadow': '0 18px 44px -14px rgba(0,0,0,0.75)',
    '--ls-radius': '2px',
    '--ls-text': '#a3a3a3',
    '--ls-text-strong': '#fafafa',
    '--ls-hover-bg': 'rgba(255,255,255,0.06)'
  } as Record<string, string>

  return result
})

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div
    class="min-h-screen bg-black font-activewear text-gray-300 selection:bg-yellow-400 selection:text-black"
    :style="storeStyle"
  >
    <slot />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Teko:wght@300;400;500;600;700&display=swap');

.font-activewear {
  font-family: 'Teko', sans-serif;
}
</style>
