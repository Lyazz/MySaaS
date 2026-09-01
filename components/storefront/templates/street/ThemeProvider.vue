<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const brandColor = useStorefrontTemplateBrandColor('street')

const storeStyle = computed(() => {
  const primaryColor = brandColor.value.color
  
  // Helper to convert hex to rgb
  const hexToRgb = (hex: string) => {
    if (!hex || typeof hex !== 'string') return '250 204 21'
    hex = hex.replace('#', '')
    if (hex.length === 3) hex = hex.split('').map(char => char + char).join('')
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '250 204 21'
    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
  }

  return {
    '--brand': primaryColor,
    '--brand-rgb': hexToRgb(primaryColor),
    fontFamily: "'Anton', sans-serif",
    // Shared LocaleSwitcher — hard-edged, high-contrast to match street
    '--ls-surface': '#ffffff',
    '--ls-border': '#000000',
    '--ls-shadow': '4px 4px 0 rgba(0,0,0,1)',
    '--ls-radius': '0px',
    '--ls-text': '#171717',
    '--ls-text-strong': '#000000',
    '--ls-hover-bg': 'rgba(0,0,0,0.06)',
    '--ls-accent': '#000000',
    '--ls-accent-soft': 'rgba(0,0,0,0.08)'
  } as Record<string, string>
})

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div
    class="min-h-screen bg-white font-street text-black selection:bg-brand selection:text-black"
    :style="storeStyle"
  >
    <slot />
  </div>
</template>
