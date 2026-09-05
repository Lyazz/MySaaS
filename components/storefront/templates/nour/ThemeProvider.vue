<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const brandColor = useStorefrontTemplateBrandColor('nour')

const storeStyle = computed(() => {
  const primaryColor = brandColor.value.color

  // Helper to convert hex to rgb
  const hexToRgb = (hex: string) => {
    // Ensure hex is valid
    if (!hex || typeof hex !== 'string') return '122 59 70'

    // Remove hash
    hex = hex.replace('#', '')

    // Handle short hex
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('')
    }

    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '122 59 70'

    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
  }

  const result = {
    '--brand': primaryColor,
    '--brand-rgb': hexToRgb(primaryColor),
    fontFamily: "'Jost', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
  } as Record<string, string>

  return result
})

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div
    class="nour-theme min-h-screen bg-[#FAF3EA] font-['Jost',_sans-serif] text-[#2E1E20]"
    :style="storeStyle"
  >
    <slot />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Marcellus&family=Jost:wght@300;400;500;600;700&display=swap');

/* Elegant serif headings across the Nour Élégance theme, soft sans body */
.nour-theme h1,
.nour-theme h2,
.nour-theme h3,
.nour-theme h4 {
  font-family: 'Marcellus', serif;
}

.nour-theme {
  -webkit-font-smoothing: antialiased;

  /* Shared LocaleSwitcher — ivory card, gold hairline, rose accent */
  --ls-surface: #fffdf8;
  --ls-border: rgba(201, 162, 75, 0.38);
  --ls-shadow: 0 16px 38px -16px rgba(46, 30, 32, 0.24);
  --ls-radius: 4px;
  --ls-text: #6b5658;
  --ls-text-strong: #2e1e20;
  --ls-hover-bg: rgba(201, 162, 75, 0.12);
  --ls-accent: color-mix(in srgb, var(--brand) 62%, #2e1e20);
  --ls-accent-soft: rgba(122, 59, 70, 0.1);
}

.nour-theme ::selection {
  background: rgba(122, 59, 70, 0.16);
  color: #2E1E20;
}

/* Soft, gold-tinted scrollbar for a refined feel */
.nour-theme ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.nour-theme ::-webkit-scrollbar-track {
  background: #FAF3EA;
}
.nour-theme ::-webkit-scrollbar-thumb {
  background: rgba(201, 162, 75, 0.45);
  border-radius: 999px;
}
</style>
