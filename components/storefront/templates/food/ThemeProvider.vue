<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()

  const storeStyle = computed(() => {
    const primaryColor = '#ea580c' // Orange-600 default
  
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
      '--font-serif': "'Playfair Display', Georgia, Cambria, 'Times New Roman', Times, serif"
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
