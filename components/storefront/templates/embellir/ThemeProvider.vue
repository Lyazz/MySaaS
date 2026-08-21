<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const brandColor = useStorefrontTemplateBrandColor('embellir')

const storeStyle = computed(() => {
  const primaryColor = brandColor.value.color

  // Helper to convert hex to rgb
  const hexToRgb = (hex: string) => {
    // Ensure hex is valid
    if (!hex || typeof hex !== 'string') return '14 63 58'

    // Remove hash
    hex = hex.replace('#', '')

    // Handle short hex
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('')
    }

    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '14 63 58'

    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
  }

  const result = {
    '--brand': primaryColor,
    '--brand-rgb': hexToRgb(primaryColor),
    fontFamily: "'Karla', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
  } as Record<string, string>

  return result
})

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div
    class="embellir-theme min-h-screen bg-[#F2ECE1] font-['Karla',_sans-serif] text-[#16211E]"
    :style="storeStyle"
  >
    <slot />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,500;6..96,600&family=Karla:wght@300;400;500;600;700&display=swap');

/*
 * Embellir — the hammam, not the spa. Deep glazed zellige green for the
 * chrome, warm polished plaster (tadelakt) for the page, one bright note of
 * orange blossom. Flat, tiled, hard-cornered: the opposite of the soft
 * rounded shapes the other wellness themes reach for.
 */
.embellir-theme {
  /* Fallbacks so teleported subtrees still resolve the brand-* scale. */
  --brand: #0E3F3A;
  --brand-rgb: 14 63 58;
  --emb-glaze: var(--brand);
  --emb-glaze-deep: #062622;
  --emb-tadelakt: #F2ECE1;
  --emb-marble: #FDFAF4;
  --emb-neroli: #DFA254;
  --emb-clay: #CBBDAB;
  --emb-ink: #16211E;
  --emb-ink-soft: #5A6763;
  --emb-ink-faint: #8E9793;
  --emb-radius: 2px;
  -webkit-font-smoothing: antialiased;
}

/* Bodoni is the cosmetics-counter voice: high contrast, set tight. */
.embellir-theme h1,
.embellir-theme h2,
.embellir-theme h3,
.embellir-theme h4,
.embellir-theme .emb-display {
  font-family: 'Bodoni Moda', 'Bodoni 72', Didot, ui-serif, Georgia, serif;
  font-weight: 500;
  letter-spacing: -0.01em;
}

/* Eyebrows and data labels: Karla, wide, small, never a third family. */
.embellir-theme .emb-label {
  font-family: 'Karla', ui-sans-serif, system-ui, sans-serif;
  font-weight: 600;
  font-size: 11px;
  line-height: 1.4;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

/*
 * The signature: a khatim (8-point star) tessellation, two overlapping
 * squares per tile, repeated so the tile edges continue across the seam.
 */
.embellir-theme .emb-zellige {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cg fill='none' stroke='%23DFA254' stroke-width='1'%3E%3Cpath d='M24 3 45 24 24 45 3 24Z'/%3E%3Cpath d='M9 9h30v30H9Z'/%3E%3Cpath d='M0 -21 21 0 0 21 -21 0Z'/%3E%3Cpath d='M-15 -15h30v30h-30Z'/%3E%3Cpath d='M48 -21 69 0 48 21 27 0Z'/%3E%3Cpath d='M33 -15h30v30h-30Z'/%3E%3Cpath d='M0 27 21 48 0 69 -21 48Z'/%3E%3Cpath d='M-15 33h30v30h-30Z'/%3E%3Cpath d='M48 27 69 48 48 69 27 48Z'/%3E%3Cpath d='M33 33h30v30h-30Z'/%3E%3C/g%3E%3C/svg%3E");
  background-repeat: repeat;
}

/* A single tile from that pattern, used as a divider mark and bullet. */
.embellir-theme .emb-star {
  display: inline-block;
  background-color: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 0 24 12 12 24 0 12Z'/%3E%3Cpath d='M3.5 3.5h17v17h-17Z'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 0 24 12 12 24 0 12Z'/%3E%3Cpath d='M3.5 3.5h17v17h-17Z'/%3E%3C/svg%3E") center / contain no-repeat;
}

/*
 * A set tile: hairline frame, a breath of marble, then the neroli rule.
 * Every product image and every panel that wants weight uses this. The rule
 * is an outline on the inner element so it paints over the image, not under.
 */
.embellir-theme .emb-plate,
.embellir-theme .emb-plate-dark {
  position: relative;
  padding: 5px;
}

.embellir-theme .emb-plate {
  border: 1px solid var(--emb-clay);
  background: var(--emb-marble);
}

.embellir-theme .emb-plate-dark {
  border: 1px solid rgba(223, 162, 84, 0.3);
  background: var(--emb-glaze);
}

.embellir-theme .emb-plate-inner {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  outline: 1px solid rgba(223, 162, 84, 0.5);
  outline-offset: 0;
}

/* Glaze: a slow sheen across the tile on hover. The only card motion. */
.embellir-theme .emb-glaze-sweep {
  position: relative;
  overflow: hidden;
}

.embellir-theme .emb-glaze-sweep::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 36%, rgba(255, 255, 255, 0.4) 50%, transparent 64%);
  transform: translateX(-130%);
  transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.3, 1);
  pointer-events: none;
  z-index: 2;
}

.embellir-theme .group:hover .emb-glaze-sweep::after,
.embellir-theme .emb-glaze-sweep:hover::after {
  transform: translateX(130%);
}

/* Staged hero reveal: eyebrow, rule, title, copy, action. */
.embellir-theme .emb-rise {
  animation: embRise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes embRise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

.embellir-theme .emb-draw {
  animation: embDraw 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  transform-origin: left center;
}

.embellir-theme:dir(rtl) .emb-draw {
  transform-origin: right center;
}

@keyframes embDraw {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

.embellir-theme :focus-visible {
  outline: 2px solid var(--emb-neroli);
  outline-offset: 2px;
}

.embellir-theme ::selection {
  background: rgba(14, 63, 58, 0.16);
  color: #16211E;
}

.embellir-theme ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.embellir-theme ::-webkit-scrollbar-track {
  background: #F2ECE1;
}
.embellir-theme ::-webkit-scrollbar-thumb {
  background: #CBBDAB;
  border: 3px solid #F2ECE1;
}
.embellir-theme ::-webkit-scrollbar-thumb:hover {
  background: var(--emb-glaze);
}

@media (prefers-reduced-motion: reduce) {
  .embellir-theme .emb-rise,
  .embellir-theme .emb-draw {
    animation: none;
  }
  .embellir-theme .emb-glaze-sweep::after {
    display: none;
  }
  .embellir-theme *,
  .embellir-theme *::before,
  .embellir-theme *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
</style>
