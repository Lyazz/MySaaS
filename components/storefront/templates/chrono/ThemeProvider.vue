<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const brandColor = useStorefrontTemplateBrandColor('chrono')

const storeStyle = computed(() => {
  const primaryColor = brandColor.value.color
  
  const hexToRgb = (hex: string) => {
    if (!hex || typeof hex !== 'string') return '166 124 82'
    hex = hex.replace('#', '')
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('')
    }
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '166 124 82'
    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
  }

  const result = {
    '--brand': primaryColor,
    '--brand-rgb': hexToRgb(primaryColor),
    fontFamily: "'Cormorant Garamond', 'Playfair Display', ui-serif, Georgia, Cambria, serif"
  } as Record<string, string>

  return result
})

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div
    class="min-h-screen"
    style="background-color: #0E1117; color: #E8E0D5;"
    :style="storeStyle"
  >
    <slot />
  </div>
</template>
