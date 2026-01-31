<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')

console.log('CozyThemeProvider mounted. Settings:', storeSettings.value)

const isRtl = computed(() => storeSettings.value?.language === 'ar')

useHead(() => ({
  htmlAttrs: {
    dir: isRtl.value ? 'rtl' : 'ltr',
    lang: storeSettings.value?.language || 'fr'
  }
}))

const storeStyle = computed(() => {
  // Default to Sage Green (#A4C3B2) if no primary color is set or if matching generic default
  const themeDefaultColor = '#A4C3B2' 
  const primaryColor = storeSettings.value?.primaryColor || themeDefaultColor
  
  // Helper to convert hex to rgb
  const hexToRgb = (hex: string) => {
    if (!hex || typeof hex !== 'string') return '164 195 178'
    hex = hex.replace('#', '')
    if (hex.length === 3) hex = hex.split('').map(char => char + char).join('')
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '164 195 178'
    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
  }

  return {
    '--brand': primaryColor,
    '--brand-rgb': hexToRgb(primaryColor),
    fontFamily: "'Nunito', sans-serif"
  } as Record<string, string>
})

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div
    class="min-h-screen bg-[#FDFBF7] font-cozy text-slate-600 selection:bg-brand-200 selection:text-brand-900"
    :style="storeStyle"
  >
    <slot />
  </div>
</template>
