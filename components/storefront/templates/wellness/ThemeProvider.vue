<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const brandColor = useStorefrontTemplateBrandColor('wellness')

const storeStyle = computed(() => {
  const primaryColor = brandColor.value.color

  // Helper to convert hex to rgb
  const hexToRgb = (hex: string) => {
    // Ensure hex is valid
    if (!hex || typeof hex !== 'string') return '110 122 51'

    // Remove hash
    hex = hex.replace('#', '')

    // Handle short hex
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('')
    }

    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '110 122 51'

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
  Herbarium apothecary. Namespaced under .wl-root so nothing leaks into the
  other storefront templates.

  The structure is unchanged: a hairline, a knocked-out gap in that hairline,
  and tabular numerals. What the palette adds is a colour vocabulary borrowed
  from the attarine — the herbalist's stall — where every hue states a fact
  rather than setting a mood.

    olive    the house. Links, seals, section rules, anything alive.
    saffron  caution. Low stock, a clock running down.
    henna    a price that came down. Nothing else is allowed to use it.
    zellige  the deep ground. Footer and inverted panels only.

  Ink and paper still carry all the type, so no meaning depends on a reader
  parsing a tint correctly.
*/

.wl-root {
  /* Label stock */
  --wl-paper: #F1F2EC;
  --wl-card: #FCFCF9;
  --wl-linen: #F7F5EC;
  --wl-tint: #E7EADC;
  --wl-ink: #1B1A16;
  --wl-muted: #6E6E62;
  --wl-rule: #D4D5CB;
  --wl-rule-strong: #B6B7AA;

  /* Attarine accents */
  --wl-olive: #6E7A33;
  --wl-olive-deep: #4E5722;
  --wl-olive-soft: #A3AC7A;
  --wl-olive-wash: #E3E7D2;
  --wl-zellige: #16413E;
  --wl-zellige-deep: #0E2C2A;
  --wl-saffron: #8E6114;
  --wl-saffron-wash: #F3EAD5;
  --wl-henna: #8E3B26;
  --wl-henna-wash: #EFDFD8;
  --wl-alert: #B3261E;
  --wl-alert-wash: #F7E3E0;

  /* Shadows are cast in tile green, not black: paper on paper, not on grey. */
  --wl-shadow: 0 1px 1px rgba(27, 26, 22, 0.03), 0 10px 26px -18px rgba(22, 65, 62, 0.32);
  --wl-shadow-lg: 0 2px 3px rgba(27, 26, 22, 0.04), 0 28px 60px -30px rgba(22, 65, 62, 0.45);

  /* Shared LocaleSwitcher — label stock, squared, olive accent */
  --ls-surface: var(--wl-card);
  --ls-border: var(--wl-rule-strong);
  --ls-shadow: var(--wl-shadow-lg);
  --ls-radius: 0px;
  --ls-text: var(--wl-muted);
  --ls-text-strong: var(--wl-ink);
  --ls-hover-bg: var(--wl-olive-wash);
  --ls-accent: var(--wl-olive-deep);
  --ls-accent-soft: var(--wl-olive-wash);

  position: relative;
  /*
    Pressed-paper tooth. It lives in the root background, behind every panel,
    so nothing has to opt out of it and no overlay ever sits over content.
  */
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23g)' opacity='0.05'/%3E%3C/svg%3E");
  background-repeat: repeat;
}

/* Selection reads as a highlighter drawn across the label. */
.wl-root ::selection {
  background: var(--wl-olive-wash);
  color: var(--wl-ink);
}
.wl-root :is(input, textarea) {
  caret-color: var(--wl-olive-deep);
}

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
  The rule now fades toward the margin, so it reads as drawn by hand rather
  than as a border that happens to stop.
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
  flex: 1 1 0%;
  background: linear-gradient(to right, var(--wl-rule-strong), var(--wl-rule) 45%, rgba(212, 213, 203, 0.15));
}
.wl-root .wl-ruled::before {
  background: linear-gradient(to left, var(--wl-rule-strong), var(--wl-rule) 45%, rgba(212, 213, 203, 0.15));
}
.wl-root .wl-ruled--start::before { display: none; }
.wl-root .wl-ruled--end::after { display: none; }

/* Drawn in olive, for the head of a section the store actually curates. */
.wl-root .wl-ruled--olive::before,
.wl-root .wl-ruled--olive::after {
  height: 2px;
  background: linear-gradient(to right, var(--wl-olive), var(--wl-olive-soft) 38%, rgba(163, 172, 122, 0.1));
}
.wl-root .wl-ruled--olive::before {
  background: linear-gradient(to left, var(--wl-olive), var(--wl-olive-soft) 38%, rgba(163, 172, 122, 0.1));
}

/* Eyebrow: the olive tick that opens a block of microtype. */
.wl-root .wl-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  color: var(--wl-olive-deep);
}
.wl-root .wl-eyebrow::before {
  content: '';
  width: 1.5rem;
  height: 2px;
  flex: none;
  background: var(--wl-olive);
}

/* Underline that draws in on hover — the only decorative motion in the set. */
.wl-root .wl-underline {
  background-image: linear-gradient(var(--wl-olive), var(--wl-olive));
  background-repeat: no-repeat;
  background-position: 0 100%;
  background-size: 0% 2px;
  transition: background-size 320ms cubic-bezier(0.4, 0, 0.2, 1);
}
.wl-root .wl-underline:hover,
.wl-root a:hover .wl-underline,
.wl-root .group:hover .wl-underline {
  background-size: 100% 2px;
}

/*
  Chips. One shape, and the hue is the whole message: olive states, saffron
  cautions, henna marks a markdown, ink asserts. Each keeps dark type on its
  own wash so the label still reads if the tint is missed.
*/
.wl-root .wl-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--wl-rule);
  background: var(--wl-card);
  color: var(--wl-muted);
}
.wl-root .wl-chip--olive {
  background: var(--wl-olive-wash);
  border-color: var(--wl-olive-soft);
  color: var(--wl-olive-deep);
}
.wl-root .wl-chip--saffron {
  background: var(--wl-saffron-wash);
  border-color: rgba(142, 97, 20, 0.42);
  color: var(--wl-saffron);
}
.wl-root .wl-chip--henna {
  background: var(--wl-henna);
  border-color: var(--wl-henna);
  color: #F6EDE9;
}
.wl-root .wl-chip--ink {
  background: var(--wl-ink);
  border-color: var(--wl-ink);
  color: var(--wl-paper);
}

/*
  The specimen mount. A herbarium sheet holds its subject under a paper corner
  pasted across one edge; this draws that corner in olive on every image
  window. It is the one ornament in the theme, so nothing else competes.
*/
.wl-root .wl-specimen {
  position: relative;
}
.wl-root .wl-specimen::after {
  content: '';
  position: absolute;
  inset-block-end: 0;
  inset-inline-end: 0;
  width: 2.25rem;
  height: 2.25rem;
  pointer-events: none;
  z-index: 5;
  background: linear-gradient(to bottom right, transparent 49.5%, var(--wl-olive-wash) 50%);
  border-top: 1px solid var(--wl-olive-soft);
  transition: width 420ms cubic-bezier(0.22, 1, 0.36, 1), height 420ms cubic-bezier(0.22, 1, 0.36, 1);
}
/* Mirrored for RTL, so the corner stays on the outer edge of the sheet. */
[dir='rtl'] .wl-root .wl-specimen::after,
.wl-root [dir='rtl'] .wl-specimen::after {
  background: linear-gradient(to bottom left, transparent 49.5%, var(--wl-olive-wash) 50%);
}
.wl-root .group:hover .wl-specimen::after,
.wl-root .wl-specimen:hover::after {
  width: 3rem;
  height: 3rem;
}

/*
  Primary action. Ink ground, with olive rising from the baseline on hover —
  the button greens the way a leaf does rather than swapping fill.
*/
.wl-root .wl-cta {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  background: var(--wl-ink);
  color: var(--wl-paper);
}
.wl-root .wl-cta::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(to top, var(--wl-olive-deep), var(--wl-zellige));
  transform: scaleY(0);
  transform-origin: bottom;
  transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
}
.wl-root .wl-cta:hover::before,
.wl-root .wl-cta:focus-visible::before {
  transform: scaleY(1);
}
.wl-root .wl-cta:disabled::before,
.wl-root .wl-cta[disabled]::before {
  transform: scaleY(0);
}

/* Secondary action: a ruled outline that fills with the wash. */
.wl-root .wl-cta-ghost {
  border: 1px solid var(--wl-rule-strong);
  color: var(--wl-ink);
  background: transparent;
  transition: background-color 220ms ease, border-color 220ms ease, color 220ms ease;
}
.wl-root .wl-cta-ghost:hover {
  background: var(--wl-olive-wash);
  border-color: var(--wl-olive);
  color: var(--wl-olive-deep);
}

/* Raised paper: the plate cards, drawers and panels sit on. */
.wl-root .wl-plate {
  background: var(--wl-card);
  border: 1px solid var(--wl-rule);
  box-shadow: var(--wl-shadow);
}
.wl-root .wl-plate-lg {
  box-shadow: var(--wl-shadow-lg);
}

/* The deep ground: glazed tile green, warmed by olive light from one corner. */
.wl-root .wl-ground-deep {
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23g)' opacity='0.05'/%3E%3C/svg%3E"),
    radial-gradient(120% 150% at 8% 0%, rgba(110, 122, 51, 0.32), transparent 60%),
    linear-gradient(to bottom, var(--wl-zellige), var(--wl-zellige-deep));
  color: rgba(241, 242, 236, 0.7);
}
.wl-root .wl-ground-deep .wl-on-deep { color: #F1F2EC; }
.wl-root .wl-ground-deep a:hover { color: #F1F2EC; }

/* Quiet washes, so consecutive sections can be told apart without a border. */
.wl-root .wl-ground-linen { background-color: var(--wl-linen); }
.wl-root .wl-ground-tint {
  background: linear-gradient(to bottom, var(--wl-tint), var(--wl-paper));
}

/* Fields: focus greens the baseline instead of glowing. */
.wl-root .wl-field {
  background: var(--wl-card);
  border: 1px solid var(--wl-rule);
  color: var(--wl-ink);
  transition: border-color 200ms ease, box-shadow 200ms ease, background-color 200ms ease;
}
.wl-root .wl-field:focus,
.wl-root .wl-field:focus-visible {
  outline: none;
  border-color: var(--wl-olive);
  box-shadow: inset 0 -2px 0 0 var(--wl-olive);
}

/*
  Keyboard focus. The app defines no storefront-wide focus style, so state it
  here rather than trusting the browser default to survive a reset.
*/
.wl-root :is(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--wl-olive-deep);
  outline-offset: 2px;
}
/* On the deep ground the olive outline disappears; switch to paper. */
.wl-root .wl-ground-deep :is(a, button, [tabindex]):focus-visible {
  outline-color: #F1F2EC;
}

.wl-root .wl-scrollbar-hide {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.wl-root .wl-scrollbar-hide::-webkit-scrollbar { display: none; }

/* The sticky shop sidebar scrolls; give it a rule, not a grey slab. */
.wl-root .custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: var(--wl-olive-soft) transparent;
}
.wl-root .custom-scrollbar::-webkit-scrollbar { width: 4px; }
.wl-root .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.wl-root .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--wl-olive-soft); }
.wl-root .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--wl-olive); }

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
  border-color: var(--wl-rule);
  background: var(--wl-card);
  box-shadow: var(--wl-shadow);
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
  color: var(--wl-muted);
  border-inline-end: 1px solid var(--wl-rule);
}
.wl-root nav[aria-label="Products pagination"] button:last-child {
  border-inline-end: 0;
}
.wl-root nav[aria-label="Products pagination"] button:hover:not(:disabled) {
  background: var(--wl-olive-wash);
  color: var(--wl-olive-deep);
}
.wl-root nav[aria-label="Products pagination"] button[aria-current="page"] {
  background: var(--wl-ink);
  color: var(--wl-paper);
  box-shadow: inset 0 -3px 0 0 var(--wl-olive);
}
.wl-root nav[aria-label="Products pagination"] span {
  color: var(--wl-muted);
}

/* --- Price range filter --- */
.wl-root .wl-pricefilter .price-range-input {
  border-radius: 0;
  border-color: var(--wl-rule);
  background: var(--wl-card);
  color: var(--wl-ink);
  font-variant-numeric: tabular-nums;
}
.wl-root .wl-pricefilter .price-range-input:focus {
  border-color: var(--wl-olive);
  background: #ffffff;
  box-shadow: inset 0 -2px 0 0 var(--wl-olive);
  --tw-ring-shadow: 0 0 #0000;
}
.wl-root .wl-pricefilter label > span:not(.sr-only) {
  font-family: 'Archivo Narrow', 'Archivo', sans-serif;
  letter-spacing: 0.1em;
  color: var(--wl-muted);
}
/* Slider rail + fill */
.wl-root .wl-pricefilter .relative.rounded-full {
  border-radius: 0;
  background: var(--wl-rule);
}
.wl-root .wl-pricefilter .relative.rounded-full > div {
  border-radius: 0;
  background: linear-gradient(to right, var(--wl-olive-soft), var(--wl-olive-deep));
}
/* Thumbs: doubled class to beat the component's scoped rule */
.wl-root.wl-root .wl-pricefilter .price-range-slider::-webkit-slider-thumb {
  border-radius: 0;
  border: 1px solid var(--wl-olive-deep);
  background: var(--wl-card);
  box-shadow: inset 0 0 0 2px var(--wl-olive-wash);
}
.wl-root.wl-root .wl-pricefilter .price-range-slider::-moz-range-thumb {
  border-radius: 0;
  border: 1px solid var(--wl-olive-deep);
  background: var(--wl-card);
  box-shadow: inset 0 0 0 2px var(--wl-olive-wash);
}

/* --- Clearance banner: henna, because a clearance is a markdown --- */
.wl-root .wl-shared-banner > div {
  background: linear-gradient(to right, var(--wl-henna), #74301F);
  color: #F6EDE9;
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
  box-shadow: 0 28px 70px -30px rgba(22, 65, 62, 0.5);
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
  background: #EFDFD8;
  color: #8E3B26;
  border: 1px solid rgba(142, 59, 38, 0.4);
}
.cl-wellness .cl-cta {
  background: #1B1A16;
  color: #F1F2EC;
  font-family: 'Archivo Narrow', 'Archivo', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  box-shadow: inset 0 -3px 0 0 #6E7A33;
}
.cl-wellness .cl-gift-number {
  font-variant-numeric: tabular-nums;
  color: #8E3B26;
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

/* ------------------------------------------------------------------
   Shared storefront pages (order success, order confirmation, category
   index, legal pages) render inside this theme but are not template-owned,
   so they arrive in a generic gray/slate palette with soft radii.

   No wellness file uses gray/zinc/neutral, bare `shadow`, or any radius
   other than rounded-full. So every selector below can only ever match
   markup that came from a shared page — which is exactly the intent.
   The other templates never see these rules.
   ------------------------------------------------------------------ */

/* Grounds and surfaces */
.wl-root .bg-gray-50,
.wl-root .bg-slate-50,
.wl-root .bg-slate-100,
.wl-root .bg-gray-100 { background-color: var(--wl-paper); }
.wl-root .bg-white { background-color: var(--wl-card); }

/* Ink */
.wl-root .text-gray-900,
.wl-root .text-slate-900,
.wl-root .text-gray-800,
.wl-root .text-slate-800,
.wl-root .text-gray-700,
.wl-root .text-slate-700 { color: var(--wl-ink); }

/* Secondary text */
.wl-root .text-gray-600,
.wl-root .text-gray-500,
.wl-root .text-gray-400,
.wl-root .text-slate-600,
.wl-root .text-slate-500,
.wl-root .text-slate-400 { color: var(--wl-muted); }

/* Rules */
.wl-root .border-gray-100,
.wl-root .border-gray-200,
.wl-root .border-gray-300,
.wl-root .border-slate-100,
.wl-root .border-slate-200,
.wl-root .border-slate-300 { border-color: var(--wl-rule); }
.wl-root .divide-gray-200 > :not([hidden]) ~ :not([hidden]),
.wl-root .divide-slate-200 > :not([hidden]) ~ :not([hidden]) { border-color: var(--wl-rule); }

/*
  Square everything except rounded-full: wellness itself only ever uses
  rounded-full, and only for things that are genuinely circular.
*/
.wl-root :is(.rounded, .rounded-sm, .rounded-md, .rounded-lg, .rounded-xl, .rounded-2xl, .rounded-3xl) {
  border-radius: 0;
}

/* Wellness uses shadow-lg / shadow-2xl deliberately; bare shadow is foreign. */
.wl-root :is(.shadow, .shadow-sm) {
  box-shadow: none;
}
/* A shared card with no shadow needs its edge back. */
.wl-root .bg-white.shadow,
.wl-root .bg-white.shadow-sm {
  border: 1px solid var(--wl-rule);
  box-shadow: var(--wl-shadow);
}

/* Headings on shared pages take the display voice; wellness ones already have it. */
.wl-root main :is(h1, h2):not([class*="wl-display"]) {
  font-family: 'Fraunces', 'Solway', Georgia, serif;
  font-variation-settings: 'opsz' 90;
  font-weight: 400;
  letter-spacing: -0.012em;
}

/* Order ids and reference codes read as label data. */
.wl-root main .font-mono {
  font-family: 'Archivo Narrow', 'Archivo', sans-serif;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.08em;
  color: var(--wl-olive-deep);
}

/*
  Semantic hues on shared pages map onto the attarine accents rather than
  flattening to ink — a confirmed order should still read as confirmed.
*/
.wl-root :is(.bg-green-100, .bg-emerald-100) { background-color: var(--wl-olive-wash); }
.wl-root :is(.text-green-600, .text-green-700, .text-green-800, .text-emerald-600) { color: var(--wl-olive-deep); }
.wl-root :is(.bg-amber-100, .bg-yellow-100) { background-color: var(--wl-saffron-wash); }
.wl-root :is(.text-amber-600, .text-amber-700, .text-amber-800, .text-yellow-700) { color: var(--wl-saffron); }
.wl-root :is(.bg-red-100, .bg-rose-100) { background-color: var(--wl-henna-wash); }
.wl-root :is(.text-red-600, .text-red-700, .text-rose-600) { color: var(--wl-henna); }
/*
  Round badges on shared pages become plates. Keyed off a background this
  theme has already remapped, so wellness's own circles (the checkout
  spinner) keep their radius.
*/
.wl-root :is(.bg-green-100, .bg-emerald-100, .bg-gray-50, .bg-gray-100, .bg-slate-50, .bg-slate-100).rounded-full {
  border-radius: 0;
  border: 1px solid var(--wl-rule);
}
.wl-root :is(.bg-green-100, .bg-emerald-100).rounded-full {
  border-color: var(--wl-olive-soft);
}
/* Translucent chips laid over imagery on shared pages get the same treatment. */
.wl-root main :is([class*="bg-white/"], .bg-white).rounded-full {
  border-radius: 0;
  background-color: var(--wl-card);
  border: 1px solid var(--wl-rule);
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
