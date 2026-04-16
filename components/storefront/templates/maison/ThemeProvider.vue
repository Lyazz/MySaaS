<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()

const storeStyle = computed(() => {
  const primaryColor = '#C17B4E' // Terracotta / Clay

  const hexToRgb = (hex: string) => {
    if (!hex || typeof hex !== 'string') return '193 123 78'
    hex = hex.replace('#', '')
    if (hex.length === 3) hex = hex.split('').map(char => char + char).join('')
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '193 123 78'
    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
  }

  return {
    '--brand': primaryColor,
    '--brand-rgb': hexToRgb(primaryColor),
    fontFamily: "'DM Sans', sans-serif"
  } as Record<string, string>
})

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div
    class="min-h-screen bg-[#FAF8F5] text-[#2C2420] selection:bg-[#C17B4E]/20 selection:text-[#2C2420]"
    :style="storeStyle"
  >
    <slot />
  </div>
</template>

<style>
.font-maison-serif {
  font-family: 'Cormorant Garamond', 'Georgia', serif;
}
</style>
