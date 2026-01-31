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
  // Default to Street Yellow (#FFDE00) if no primary color is set OR if the set color matches the generic default (#0d9488) and we want to enforce theme default
  // Actually, user requirement: "by default the template gets its original color and it's up to the user if he want to change"
  // If storeSettings.primaryColor exists, use it. If not, use theme default.
  // Note: Existing backend might default primaryColor to teal (#0d9488) on creation. 
  // We can check if it matches that teal, and if so, override with theme default? 
  // Or simpler: just default to #FFDE00 here if primaryColor is missing.
  
  const themeDefaultColor = '#FFDE00' // Street Yellow
  const primaryColor = storeSettings.value?.primaryColor || themeDefaultColor
  
  // Helper to convert hex to rgb
  const hexToRgb = (hex: string) => {
    if (!hex || typeof hex !== 'string') return '255 222 0'
    hex = hex.replace('#', '')
    if (hex.length === 3) hex = hex.split('').map(char => char + char).join('')
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '255 222 0'
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
