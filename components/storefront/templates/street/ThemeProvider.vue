<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')

console.log('StreetThemeProvider mounted. Settings:', storeSettings.value)

const isRtl = computed(() => storeSettings.value?.language === 'ar')

useHead(() => ({
  htmlAttrs: {
    dir: isRtl.value ? 'rtl' : 'ltr',
    lang: storeSettings.value?.language || 'fr'
  }
}))

const storeStyle = computed(() => {
  const primaryColor = '#FACC15' // Yellow 400
  
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
    fontFamily: "'Anton', sans-serif"
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
