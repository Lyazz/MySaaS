<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const brandColor = useStorefrontTemplateBrandColor('wellness')

const storeStyle = computed(() => {
  const primaryColor = brandColor.value.color

  // Helper to convert hex to rgb
  const hexToRgb = (hex: string) => {
    // Ensure hex is valid
    if (!hex || typeof hex !== 'string') return '138 154 91'

    // Remove hash
    hex = hex.replace('#', '')

    // Handle short hex
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('')
    }

    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '138 154 91'

    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
  }

  const result = {
    '--brand': primaryColor,
    '--brand-rgb': hexToRgb(primaryColor),
    fontFamily: "'Archivo', system-ui, -apple-system, sans-serif"
  } as Record<string, string>

  return result
})

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div
    class="wl-root min-h-screen bg-wl-paper font-wellness text-wl-ink antialiased"
    :style="storeStyle"
  >
    <slot />
  </div>
</template>

<style>
/*
  Apothecary label system. Namespaced under .wl-root so nothing leaks into the
  other storefront templates. Three devices carry the whole design:
  a hairline, a knocked-out gap in that hairline, and tabular numerals.
*/

/* Utility microtype: eyebrows, badges, counts, units, field labels. */
.wl-root .wl-label {
  font-family: 'Archivo Narrow', 'Archivo', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.6875rem;
  line-height: 1.2;
  /* Microtype often carries machine strings (SKUs, keys). Never let one blow out the page. */
  overflow-wrap: anywhere;
}

/* Display voice. opsz is what gives Fraunces its high-contrast label cut. */
.wl-root .wl-display {
  font-family: 'Fraunces', 'Solway', Georgia, serif;
  font-variation-settings: 'opsz' 120;
  font-weight: 400;
  letter-spacing: -0.015em;
}
.wl-root .wl-display-sm {
  font-family: 'Fraunces', 'Solway', Georgia, serif;
  font-variation-settings: 'opsz' 24;
  font-weight: 500;
  letter-spacing: -0.005em;
}

/* Every number on a label is set tabular so columns of prices align. */
.wl-root .wl-num {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
}

/*
  The signature: a rule that runs the full width with the heading knocked out
  of it. Built with a flex row so the gap tracks the text, not a fixed width.
*/
.wl-root .wl-ruled {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  min-width: 0;
}
/* Text in the gap wraps rather than pushing the rule past the viewport. */
.wl-root .wl-ruled > * {
  min-width: 0;
  overflow-wrap: anywhere;
}
.wl-root .wl-ruled::before,
.wl-root .wl-ruled::after {
  content: '';
  height: 1px;
  background: #D4D5CB;
  flex: 1 1 0%;
}
.wl-root .wl-ruled--start::before { display: none; }
.wl-root .wl-ruled--end::after { display: none; }

/* Underline that draws in on hover — the only decorative motion in the set. */
.wl-root .wl-underline {
  background-image: linear-gradient(currentColor, currentColor);
  background-repeat: no-repeat;
  background-position: 0 100%;
  background-size: 0% 1px;
  transition: background-size 320ms cubic-bezier(0.4, 0, 0.2, 1);
}
.wl-root .wl-underline:hover,
.wl-root a:hover .wl-underline,
.wl-root .group:hover .wl-underline {
  background-size: 100% 1px;
}

/*
  Keyboard focus. The app defines no storefront-wide focus style, so state it
  here rather than trusting the browser default to survive a reset.
*/
.wl-root :is(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid #1B1A16;
  outline-offset: 2px;
}

.wl-root .wl-scrollbar-hide {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.wl-root .wl-scrollbar-hide::-webkit-scrollbar { display: none; }

/* ------------------------------------------------------------------
   Shared storefront components, brought into the apothecary system.

   These components are used by all 16 templates, so none of them are
   edited directly. Every rule below is scoped to .wl-root (or to the
   .cl-wellness hook for the dialog, which teleports to <body> and so
   escapes the theme wrapper). The other templates are untouched.

   .wl-root is doubled in places purely to out-specify the components'
   own scoped styles, which carry a [data-v-*] attribute.
   ------------------------------------------------------------------ */

/* --- Product pagination: aria hooks, no markup change needed --- */
.wl-root nav[aria-label="Products pagination"] > div > div {
  border-radius: 0;
  border-color: #D4D5CB;
  background: #FCFCF9;
  box-shadow: none;
  gap: 0;
  padding: 0;
}
.wl-root nav[aria-label="Products pagination"] button {
  border-radius: 0;
  font-family: 'Archivo Narrow', 'Archivo', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
  color: #6E6E62;
  border-inline-end: 1px solid #D4D5CB;
}
.wl-root nav[aria-label="Products pagination"] button:last-child {
  border-inline-end: 0;
}
.wl-root nav[aria-label="Products pagination"] button:hover:not(:disabled) {
  background: #F1F2EC;
  color: #1B1A16;
}
.wl-root nav[aria-label="Products pagination"] button[aria-current="page"] {
  background: #1B1A16;
  color: #F1F2EC;
}
.wl-root nav[aria-label="Products pagination"] span {
  color: #6E6E62;
}

/* --- Price range filter --- */
.wl-root .wl-pricefilter .price-range-input {
  border-radius: 0;
  border-color: #D4D5CB;
  background: #F1F2EC;
  color: #1B1A16;
  font-variant-numeric: tabular-nums;
}
.wl-root .wl-pricefilter .price-range-input:focus {
  border-color: #1B1A16;
  background: #ffffff;
  box-shadow: none;
  --tw-ring-shadow: 0 0 #0000;
}
.wl-root .wl-pricefilter label > span:not(.sr-only) {
  font-family: 'Archivo Narrow', 'Archivo', sans-serif;
  letter-spacing: 0.1em;
  color: #6E6E62;
}
/* Slider rail + fill */
.wl-root .wl-pricefilter .relative.rounded-full {
  border-radius: 0;
  background: #D4D5CB;
}
.wl-root .wl-pricefilter .relative.rounded-full > div {
  border-radius: 0;
  background: #1B1A16;
}
/* Thumbs: doubled class to beat the component's scoped rule */
.wl-root.wl-root .wl-pricefilter .price-range-slider::-webkit-slider-thumb {
  border-radius: 0;
  border: 1px solid #1B1A16;
  background: #FCFCF9;
  box-shadow: none;
}
.wl-root.wl-root .wl-pricefilter .price-range-slider::-moz-range-thumb {
  border-radius: 0;
  border: 1px solid #1B1A16;
  background: #FCFCF9;
  box-shadow: none;
}

/* --- Clearance banner --- */
.wl-root .wl-shared-banner > div {
  background: #1B1A16;
  color: #F1F2EC;
}
.wl-root .wl-shared-banner .truncate,
.wl-root .wl-shared-banner .font-semibold {
  font-family: 'Archivo Narrow', 'Archivo', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.6875rem;
}
.wl-root .wl-shared-banner button {
  border-radius: 0;
}

/* --- Announcement bar marquee: label microtype --- */
.wl-root .marquee-group .inline-block {
  font-family: 'Archivo Narrow', 'Archivo', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.6875rem;
}

/* --- Clearance dialog (teleported to <body>, hooked via .cl-wellness) --- */
.cl-wellness .cl-panel {
  border-radius: 0;
  border: 1px solid #B6B7AA;
  background: #FCFCF9;
  box-shadow: 0 24px 60px -20px rgba(27, 26, 22, 0.35);
}
/* Retire the glassware: auroras, motes, orbits, sheens and halos */
.cl-wellness .cl-aurora,
.cl-wellness .cl-mote,
.cl-wellness .cl-pane-sheen,
.cl-wellness .cl-cta-sheen,
.cl-wellness .cl-glass-edge,
.cl-wellness .cl-halo,
.cl-wellness .cl-aura,
.cl-wellness .cl-bloom,
.cl-wellness .cl-orbit,
.cl-wellness .cl-ripple,
.cl-wellness .cl-beacon,
.cl-wellness .cl-arc,
.cl-wellness .cl-gift-glow {
  display: none !important;
}
.cl-wellness .cl-emblem,
.cl-wellness .cl-emblem-wrap,
.cl-wellness .cl-badge,
.cl-wellness .cl-gift,
.cl-wellness .cl-dot,
.cl-wellness .cl-grabber,
.cl-wellness .cl-coupon,
.cl-wellness .cl-coupon-wrap,
.cl-wellness .cl-close,
.cl-wellness .cl-cta {
  border-radius: 0;
}
.cl-wellness .cl-badge,
.cl-wellness .cl-coupon {
  font-family: 'Archivo Narrow', 'Archivo', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  background: #F1F2EC;
  color: #6E6E62;
  border: 1px solid #D4D5CB;
}
.cl-wellness .cl-cta {
  background: #1B1A16;
  color: #F1F2EC;
  font-family: 'Archivo Narrow', 'Archivo', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  box-shadow: none;
}
.cl-wellness .cl-gift-number {
  font-variant-numeric: tabular-nums;
  color: #1B1A16;
}
.cl-wellness .cl-close {
  border: 1px solid #D4D5CB;
  background: #FCFCF9;
  color: #6E6E62;
}
/* Kill the ambient animation loops; the panel is a notice, not a light show */
.cl-wellness .cl-breathe,
.cl-wellness .cl-sway,
.cl-wellness .cl-drift-a,
.cl-wellness .cl-drift-b,
.cl-wellness .cl-perf {
  animation: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .wl-root *,
  .wl-root *::before,
  .wl-root *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
</style>
