<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()

const storeStyle = computed(() => {
  const primaryColor = '#EAB308' // Electric Yellow
  
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
    fontFamily: "'Teko', sans-serif"
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
