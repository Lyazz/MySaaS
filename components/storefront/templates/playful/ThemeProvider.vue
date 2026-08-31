<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

/*
 * Playful — "candy kawaii".
 *
 * The palette is fixed on purpose: a single tenant colour cannot carry a
 * multi-hue candy system, so the six sweets below are constants and the
 * merchant's brand colour only drives the primary CTA + focus ring
 * (`--kw-brand`). `--brand` / `--brand-rgb` stay published for the shared
 * storefront components that resolve Tailwind's `brand-*` scale.
 */
const cartStore = useCartStore()
const brandColor = useStorefrontTemplateBrandColor('playful')

const storeStyle = computed(() => ({
  '--brand': brandColor.value.color,
  '--brand-rgb': brandColor.value.rgb,
  '--kw-brand': brandColor.value.color,
  '--kw-brand-rgb': brandColor.value.rgb
}) as Record<string, string>)

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div
    class="kw-theme"
    :style="storeStyle"
  >
    <slot />
  </div>
</template>

<style>
/* ═══════════════════════════════════════════════════════════════════════
   PLAYFUL — candy kawaii design system
   Every token and component class is prefixed `kw-`. Type styles are real
   classes (never bare element selectors) so Tailwind utilities written on
   the same node still win.

   Specificity note: this block is injected AFTER Tailwind, so a `kw-` class
   and a utility of equal specificity resolve in favour of `kw-`. Component
   classes that set `display` (kw-btn, kw-icon-btn, kw-chip, kw-badge,
   kw-field, kw-label) therefore beat `hidden` / `md:flex` on the same node —
   reach for the `!` important variant there (`md:!hidden`).
   ═══════════════════════════════════════════════════════════════════════ */

.kw-theme {
  /* Grounds */
  --kw-cream: #FFF6FA;
  --kw-cream-2: #FFEDF5;
  --kw-surface: #FFFFFF;
  --kw-line: #F7D8E7;
  --kw-line-soft: #FCEAF2;

  /* Ink — plum, never black: black reads harsh against pastels */
  --kw-ink: #4A2E4D;
  --kw-ink-soft: #8C6F93;
  --kw-ink-faint: #B49CB8;

  /* The six sweets */
  --kw-pink: #FF8FBE;
  --kw-pink-deep: #ED5A96;
  --kw-pink-soft: #FFE3EE;
  --kw-sky: #96D9F5;
  --kw-sky-deep: #3FAEDF;
  --kw-sky-soft: #DFF3FC;
  --kw-mint: #A5E9CB;
  --kw-mint-deep: #2FAE81;
  --kw-mint-soft: #DFF7EC;
  --kw-lemon: #FFDD8A;
  --kw-lemon-deep: #E9A31A;
  --kw-lemon-soft: #FFF4D9;
  --kw-lilac: #C9B2FA;
  --kw-lilac-deep: #7E56E0;
  --kw-lilac-soft: #EFE7FE;
  --kw-peach: #FFC3A6;

  --kw-brand: #ED5A96;

  /* Shape + motion */
  --kw-r-sm: 14px;
  --kw-r: 22px;
  --kw-r-lg: 30px;
  --kw-r-xl: 40px;
  --kw-spring: cubic-bezier(.34, 1.4, .64, 1);

  --kw-display-font: 'Baloo 2', 'Nunito', ui-rounded, system-ui, sans-serif;
  --kw-body-font: 'Nunito', ui-rounded, system-ui, sans-serif;

  font-family: var(--kw-body-font);
  color: var(--kw-ink);
  background: var(--kw-cream);
}

/* ── Type ───────────────────────────────────────────────────────────── */

.kw-display {
  font-family: var(--kw-display-font);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.015em;
  color: var(--kw-ink);
}

.kw-title {
  font-family: var(--kw-display-font);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.01em;
  color: var(--kw-ink);
}

.kw-kicker {
  font-family: var(--kw-body-font);
  font-weight: 800;
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--kw-pink-deep);
}

.kw-lede {
  font-size: 1.02rem;
  line-height: 1.65;
  color: var(--kw-ink-soft);
}

.kw-num {
  font-family: var(--kw-display-font);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* ── Surfaces ───────────────────────────────────────────────────────── */

.kw-card {
  background: var(--kw-surface);
  border: 1.5px solid var(--kw-line-soft);
  border-radius: var(--kw-r-lg);
  box-shadow: 0 10px 30px -22px rgba(74, 46, 77, .55);
}

.kw-card-flat {
  background: var(--kw-surface);
  border: 1.5px solid var(--kw-line-soft);
  border-radius: var(--kw-r);
}

/*
 * Blob: the signature silhouette. Four asymmetric corner radii read as a
 * hand-drawn pebble rather than a rounded rectangle; the hover variant
 * morphs to a second blob so the shape itself feels alive.
 */
.kw-blob {
  border-radius: 58% 42% 47% 53% / 47% 52% 48% 53%;
}

.kw-blob-2 {
  border-radius: 44% 56% 58% 42% / 55% 44% 56% 45%;
}

.kw-blob-hover {
  transition: border-radius .7s var(--kw-spring), transform .45s var(--kw-spring);
}

.kw-blob-hover:hover {
  border-radius: 44% 56% 58% 42% / 55% 44% 56% 45%;
}

/* ── Buttons: candy gloss (inner highlight + soft coloured bloom) ───── */

.kw-btn {
  --c: var(--kw-brand);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  font-family: var(--kw-display-font);
  font-weight: 700;
  font-size: .95rem;
  line-height: 1;
  color: #fff;
  padding: .95rem 1.7rem;
  border-radius: 999px;
  border: none;
  background: var(--c);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, .5),
    inset 0 -3px 0 rgba(0, 0, 0, .12),
    0 12px 22px -12px color-mix(in srgb, var(--c), #000 25%);
  transition: transform .3s var(--kw-spring), box-shadow .3s ease, filter .3s ease;
  cursor: pointer;
}

.kw-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: saturate(1.08);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, .5),
    inset 0 -3px 0 rgba(0, 0, 0, .12),
    0 18px 26px -14px color-mix(in srgb, var(--c), #000 25%);
}

.kw-btn:active:not(:disabled) {
  transform: translateY(1px) scale(.985);
}

.kw-btn:disabled {
  opacity: .45;
  cursor: not-allowed;
  box-shadow: none;
}

.kw-btn-pink { --c: var(--kw-pink-deep); }
.kw-btn-sky { --c: var(--kw-sky-deep); }
.kw-btn-mint { --c: var(--kw-mint-deep); }
.kw-btn-lilac { --c: var(--kw-lilac-deep); }

/* Lemon needs plum ink — white on yellow fails contrast */
.kw-btn-lemon {
  --c: var(--kw-lemon);
  color: #5A3B05;
}

.kw-btn-ghost {
  background: var(--kw-surface);
  color: var(--kw-ink);
  border: 1.5px solid var(--kw-line);
  box-shadow: 0 8px 18px -14px rgba(74, 46, 77, .6);
}

.kw-btn-ghost:hover:not(:disabled) {
  background: var(--kw-pink-soft);
  border-color: var(--kw-pink);
  filter: none;
  box-shadow: 0 12px 20px -14px rgba(74, 46, 77, .6);
}

.kw-btn-sm {
  padding: .6rem 1.15rem;
  font-size: .85rem;
}

.kw-btn-lg {
  padding: 1.1rem 2.1rem;
  font-size: 1.08rem;
}

/* ── Round icon button ─────────────────────────────────────────────── */

.kw-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 999px;
  background: var(--kw-surface);
  border: 1.5px solid var(--kw-line);
  color: var(--kw-ink-soft);
  transition: transform .3s var(--kw-spring), color .2s ease, background .2s ease, border-color .2s ease;
}

.kw-icon-btn:hover {
  color: var(--kw-pink-deep);
  background: var(--kw-pink-soft);
  border-color: var(--kw-pink);
  transform: translateY(-2px);
}

/* ── Chips / badges ────────────────────────────────────────────────── */

.kw-chip {
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  padding: .5rem 1rem;
  border-radius: 999px;
  font-family: var(--kw-body-font);
  font-weight: 700;
  font-size: .82rem;
  background: var(--kw-surface);
  color: var(--kw-ink-soft);
  border: 1.5px solid var(--kw-line);
  white-space: nowrap;
  transition: transform .3s var(--kw-spring), background .2s ease, color .2s ease, border-color .2s ease;
  cursor: pointer;
}

.kw-chip:hover { transform: translateY(-2px); border-color: var(--kw-pink); }

.kw-chip-on {
  background: var(--kw-ink);
  color: #fff;
  border-color: var(--kw-ink);
}

.kw-badge {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  padding: .28rem .6rem;
  border-radius: 999px;
  font-family: var(--kw-display-font);
  font-weight: 700;
  font-size: .7rem;
  line-height: 1;
  letter-spacing: .01em;
}

.kw-badge-sale { background: var(--kw-pink-deep); color: #fff; }
.kw-badge-new { background: var(--kw-mint-deep); color: #fff; }
.kw-badge-low { background: var(--kw-lemon); color: #5A3B05; }
.kw-badge-out { background: #EDE4EF; color: var(--kw-ink-soft); }

/* ── Fields ────────────────────────────────────────────────────────── */

.kw-field {
  display: block;
  width: 100%;
  height: 3rem;
  padding: 0 1.1rem;
  border-radius: 999px;
  background: var(--kw-surface);
  border: 1.5px solid var(--kw-line);
  color: var(--kw-ink);
  font-family: var(--kw-body-font);
  font-weight: 600;
  font-size: .95rem;
  outline: none;
  transition: border-color .2s ease, box-shadow .2s ease;
}

.kw-field::placeholder { color: var(--kw-ink-faint); font-weight: 500; }

.kw-field:focus {
  border-color: var(--kw-brand);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--kw-brand), transparent 82%);
}

.kw-field-boxy { border-radius: var(--kw-r-sm); }

.kw-label {
  display: block;
  font-family: var(--kw-display-font);
  font-weight: 700;
  font-size: .85rem;
  color: var(--kw-ink);
  margin: 0 0 .45rem .9rem;
}

/* ── Decorative edges ──────────────────────────────────────────────── */

/*
 * Scalloped hem: circles of the page ground punched along the bottom of a
 * band, so sections meet on a cut-cookie edge instead of a straight rule.
 */
.kw-scallop {
  position: relative;
}

.kw-scallop::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 22px;
  background-image: radial-gradient(circle at 11px 11px, var(--kw-scallop-fill, var(--kw-cream)) 11px, transparent 11.5px);
  background-size: 22px 22px;
  background-repeat: repeat-x;
  pointer-events: none;
  z-index: 2;
}

/* Sprinkles: confetti capsules, used sparingly as a band texture */
.kw-sprinkles {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Cg fill='none' stroke-linecap='round' stroke-width='5'%3E%3Cpath d='M14 20l10-7' stroke='%23FF8FBE'/%3E%3Cpath d='M62 12l3 12' stroke='%2396D9F5'/%3E%3Cpath d='M112 26l-9 8' stroke='%23FFDD8A'/%3E%3Cpath d='M34 62l11 4' stroke='%23C9B2FA'/%3E%3Cpath d='M92 70l2 12' stroke='%23A5E9CB'/%3E%3Cpath d='M133 60l-6 10' stroke='%23FF8FBE'/%3E%3Cpath d='M18 112l9-8' stroke='%23A5E9CB'/%3E%3Cpath d='M68 122l12 2' stroke='%23FFDD8A'/%3E%3Cpath d='M118 108l-3 12' stroke='%2396D9F5'/%3E%3C/g%3E%3C/svg%3E");
  background-size: 150px 150px;
}

/* Candy bands used behind hero-adjacent sections */
.kw-band-pink { background: linear-gradient(135deg, var(--kw-pink-soft), #FFF6FA 60%); }
.kw-band-sky { background: linear-gradient(135deg, var(--kw-sky-soft), #FFF6FA 60%); }
.kw-band-lilac { background: linear-gradient(135deg, var(--kw-lilac-soft), #FFF6FA 60%); }
.kw-band-mint { background: linear-gradient(135deg, var(--kw-mint-soft), #FFF6FA 60%); }

/* ── Utilities ─────────────────────────────────────────────────────── */

.kw-hide-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.kw-hide-scroll::-webkit-scrollbar { display: none; }

.kw-theme ::-webkit-scrollbar { width: 12px; height: 12px; }
.kw-theme ::-webkit-scrollbar-track { background: var(--kw-cream-2); }
.kw-theme ::-webkit-scrollbar-thumb {
  background: var(--kw-pink);
  border-radius: 999px;
  border: 3px solid var(--kw-cream-2);
}
.kw-theme ::-webkit-scrollbar-thumb:hover { background: var(--kw-pink-deep); }

.kw-theme ::selection {
  background: var(--kw-lemon);
  color: #5A3B05;
}

/* ── Motion: one entrance, one idle float, both opt-out aware ──────── */

@keyframes kwRise {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: none; }
}

.kw-rise { animation: kwRise .65s var(--kw-spring) both; }

@keyframes kwFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}

.kw-float { animation: kwFloat 5.5s ease-in-out infinite; }

@keyframes kwPop {
  0% { transform: scale(.7); opacity: 0; }
  60% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.kw-pop { animation: kwPop .38s var(--kw-spring) both; }

@media (prefers-reduced-motion: reduce) {
  .kw-theme *,
  .kw-theme *::before,
  .kw-theme *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
  }

  .kw-rise { opacity: 1; transform: none; }
}
</style>
