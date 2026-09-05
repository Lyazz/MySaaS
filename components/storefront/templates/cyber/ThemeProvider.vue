<script setup lang="ts">
// ThemeProvider for Cyber Synthwave template
const brandColor = useStorefrontTemplateBrandColor('cyber')

const storeStyle = computed(() => {
  const primaryColor = brandColor.value.color
  
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
    minHeight: '100vh',
    // Shared LocaleSwitcher — deep violet chrome with a neon edge
    '--ls-surface': '#1a0a2e',
    '--ls-border': 'rgba(var(--brand-rgb) / 0.45)',
    '--ls-shadow': '0 0 0 1px rgba(var(--brand-rgb) / 0.25), 0 20px 46px -16px rgba(0,0,0,0.8)',
    '--ls-radius': '4px',
    '--ls-text': '#c4b5fd',
    '--ls-text-strong': '#f5f3ff',
    '--ls-hover-bg': 'rgba(233,213,255,0.08)',
    '--ls-accent': 'rgb(var(--brand-rgb))',
    '--ls-accent-soft': 'rgba(var(--brand-rgb) / 0.16)'
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
    background: linear-gradient(to bottom, var(--brand), #ff6b35);
    border-radius: 4px;
}

.cyber-theme-provider ::-webkit-scrollbar-thumb:hover {
    background: var(--brand);
}

/* Selection styling */
.cyber-theme-provider ::selection {
    background: rgba(var(--brand-rgb) / 0.3);
    color: white;
}

/* Focus outline styling */
.cyber-theme-provider *:focus-visible {
    outline: 2px solid var(--brand);
    outline-offset: 2px;
}
</style>
