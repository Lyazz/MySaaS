<script setup lang="ts">
// ThemeProvider for Cyber Synthwave template
const storeSettings = useState<any>('storeSettings')

console.log('CyberThemeProvider mounted. Settings:', storeSettings.value)

const isRtl = computed(() => storeSettings.value?.language === 'ar')

useHead(() => ({
  htmlAttrs: {
    dir: isRtl.value ? 'rtl' : 'ltr',
    lang: storeSettings.value?.language || 'fr'
  }
}))

const storeStyle = computed(() => {
  const primaryColor = '#F43F5E' // Rose 500
  
  // Helper to convert hex to rgb
  const hexToRgb = (hex: string) => {
    if (!hex || typeof hex !== 'string') return '244 63 94'
    hex = hex.replace('#', '')
    if (hex.length === 3) hex = hex.split('').map(char => char + char).join('')
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '244 63 94'
    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
  }

  return {
    '--brand': primaryColor,
    '--brand-rgb': hexToRgb(primaryColor),
    fontFamily: "'Orbitron', sans-serif",
    backgroundColor: '#0d0515',
    color: '#e9d5ff',
    minHeight: '100vh'
  } as Record<string, string>
})
</script>

<template>
  <div class="cyber-theme-provider" :style="storeStyle">
    <slot />
  </div>
</template>

<style>
/* Global Cyber Synthwave Theme Styles */

/* Scrollbar styling */
.cyber-theme-provider ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

.cyber-theme-provider ::-webkit-scrollbar-track {
    background: #1a0a2e;
}

.cyber-theme-provider ::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #ff2d95, #ff6b35);
    border-radius: 4px;
}

.cyber-theme-provider ::-webkit-scrollbar-thumb:hover {
    background: #ff2d95;
}

/* Selection styling */
.cyber-theme-provider ::selection {
    background: rgba(255, 45, 149, 0.3);
    color: white;
}

/* Focus outline styling */
.cyber-theme-provider *:focus-visible {
    outline: 2px solid #ff2d95;
    outline-offset: 2px;
}
</style>
