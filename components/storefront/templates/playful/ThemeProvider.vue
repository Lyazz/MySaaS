<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const brandColor = useStorefrontTemplateBrandColor('playful')

const storeStyle = computed(() => {
  const primaryColor = brandColor.value.color
  
  // Helper to convert hex to rgb
  const hexToRgb = (hex: string) => {
    // Ensure hex is valid
    if (!hex || typeof hex !== 'string') return '147 51 234'
    
    // Remove hash
    hex = hex.replace('#', '')
    
    // Handle short hex
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('')
    }
    
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '147 51 234'
    
    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
  }

  const result = {
    '--brand': primaryColor,
    '--brand-rgb': hexToRgb(primaryColor),
    fontFamily: "'Nunito', 'Quicksand', 'Baloo 2', 'Comic Neue', sans-serif"
  } as Record<string, string>

  return result
})

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div
    class="min-h-screen bg-[#faf5ff] font-sans text-slate-700 selection:bg-[#fde68a] selection:text-amber-900 playful-theme"
    :style="storeStyle"
  >
    <slot />
  </div>
</template>

<style>
/* Global playful styles */
.playful-theme {
  scroll-behavior: smooth;
}
.playful-theme body {
  /* Add a subtle dot pattern background on the body for texture */
  background-image: radial-gradient(#e9d5ff 2px, transparent 2px);
  background-size: 32px 32px;
  background-color: #faf5ff;
}

/* Make inputs look friendlier globally within playful theme */
.playful-theme input, 
.playful-theme select, 
.playful-theme textarea {
  @apply rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium;
}

/* Custom scrollbar for webkit to match the theme - SCIOPED */
.playful-theme::-webkit-scrollbar,
.playful-theme ::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}
.playful-theme::-webkit-scrollbar-track,
.playful-theme ::-webkit-scrollbar-track {
  background: #faf5ff;
  border-left: 2px solid #f3e8ff;
}
.playful-theme::-webkit-scrollbar-thumb,
.playful-theme ::-webkit-scrollbar-thumb {
  background: #c084fc;
  border-radius: 10px;
  border: 3px solid #faf5ff;
}
.playful-theme::-webkit-scrollbar-thumb:hover,
.playful-theme ::-webkit-scrollbar-thumb:hover {
  background: #a855f7;
}

@keyframes wave {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@keyframes shimmer {
  100% { transform: translateX(100%); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

/* Bouncy hover states for buttons */
.btn-bouncy:hover {
  animation: float 1s ease-in-out infinite;
}
</style>
