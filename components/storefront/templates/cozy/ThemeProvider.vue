<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const brandColor = useStorefrontTemplateBrandColor('cozy')

/*
 * Cozy — "slow living" editorial. The house palette is fixed (warm ivory, ink
 * brown, one note of burnt terracotta) so every tenant store reads as the same
 * print title. The tenant's --brand survives only as a quiet interactive accent
 * (selected states, focus rings) via the brand-* scale.
 */
const storeStyle = computed(() => {
  const primaryColor = brandColor.value.color

  const hexToRgb = (hex: string) => {
    if (!hex || typeof hex !== 'string') return '184 83 46'
    hex = hex.replace('#', '')
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '184 83 46'
    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
  }

  return {
    '--brand': primaryColor,
    '--brand-rgb': hexToRgb(primaryColor)
  } as Record<string, string>
})

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div class="ed-theme min-h-screen" :style="storeStyle">
    <slot />
  </div>
</template>

<style>
/*
 * ── Cozy · slow-living editorial ─────────────────────────────────────────────
 * Newsreader is the magazine voice (display + running text, real italics).
 * Hanken Grotesk sets every piece of UI microtype: nav, labels, buttons, forms.
 * Fonts are loaded from nuxt.config app.head so this file stays render-blocking
 * free; the stacks below fall back cleanly if the network is slow.
 */

.ed-theme {
  /* Ground — the paper the title is printed on */
  --ed-paper:        #F4EFE6;
  --ed-paper-2:      #EFE8DA;   /* alternate band */
  --ed-card:         #FBF8F2;   /* raised surface, inputs, image mats */
  --ed-card-2:       #F7F2E8;

  /* Ink */
  --ed-ink:          #262019;   /* headlines, solid buttons */
  --ed-ink-2:        #4A4038;   /* running text */
  --ed-muted:        #8A7E6E;   /* captions, meta, disabled */

  /* Hairlines — the whole layout is built on these */
  --ed-rule:         #DAD2C4;
  --ed-rule-strong:  #C4B8A4;

  /* The one accent — burnt terracotta */
  --ed-accent:       #B8532E;
  --ed-accent-deep:  #97401F;   /* holds AA on paper, hover ground */
  --ed-accent-wash:  #EFE0D5;

  /* Footer — the darkest page in the issue */
  --ed-footer:       #1E1912;
  --ed-footer-ink:   #E8E0D2;
  --ed-footer-rule:  rgba(232, 224, 210, 0.16);

  /* Type */
  --ed-serif: 'Newsreader', Georgia, Cambria, 'Times New Roman', serif;
  --ed-sans:  'Hanken Grotesk', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

  --ed-radius: 2px;

  background-color: var(--ed-paper);
  color: var(--ed-ink-2);
  font-family: var(--ed-serif);
  font-weight: 400;
  font-size: 17px;
  line-height: 1.65;
  font-optical-sizing: auto;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Headlines: Newsreader, set tight, near-book weight — the editorial signature */
.ed-theme h1,
.ed-theme h2,
.ed-theme h3,
.ed-theme h4,
.ed-display {
  font-family: var(--ed-serif);
  font-weight: 400;
  letter-spacing: -0.021em;
  line-height: 1.08;
}

/* Headings default to ink; the .ed-display class carries only the type, so it
   can sit on a price or a label and still take a text-* colour utility. */
.ed-theme h1,
.ed-theme h2,
.ed-theme h3,
.ed-theme h4 {
  color: var(--ed-ink);
}

/* UI voice — anything that is chrome rather than editorial copy */
.ed-ui { font-family: var(--ed-sans); }

.ed-theme ::selection {
  background: var(--ed-accent-wash);
  color: var(--ed-accent-deep);
}

.ed-theme :focus-visible {
  outline: 2px solid rgb(var(--brand-rgb) / 1);
  outline-offset: 2px;
}

/* ── Kicker / eyebrow: sans, wide, small, opened by a rule tick ────────────── */
.ed-kicker {
  font-family: var(--ed-sans);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ed-accent-deep);
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.ed-kicker::before {
  content: '';
  width: 26px;
  height: 1px;
  background: currentColor;
  opacity: 0.55;
  flex-shrink: 0;
}
.ed-kicker--plain { display: inline-block; }
.ed-kicker--plain::before { display: none; }

/* The running section numeral — italic figure in accent */
.ed-num {
  font-family: var(--ed-serif);
  font-style: italic;
  font-weight: 400;
  color: var(--ed-accent);
  letter-spacing: 0;
}

/* A hairline that reads as a print rule */
.ed-rule {
  height: 1px;
  border: 0;
  background: var(--ed-rule);
}

/*
 * The contents-page leader: the run of dots between an entry and its page
 * number. Sits on its own flex child so the two ends stay hard-aligned.
 */
.ed-leader {
  flex: 1 1 auto;
  min-width: 24px;
  align-self: flex-end;
  margin: 0 14px 6px;
  border-bottom: 1px dotted var(--ed-rule-strong);
}

/* Standing figure for a ranked entry — big, quiet, set in the accent */
.ed-rank {
  font-family: var(--ed-serif);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--ed-rule-strong);
}

/* Opening capital for an editorial paragraph */
.ed-dropcap::first-letter {
  font-family: var(--ed-serif);
  font-size: 3.6em;
  line-height: 0.8;
  float: inline-start;
  margin-inline-end: 0.12em;
  margin-top: 0.06em;
  color: var(--ed-accent);
}

/* Field labels */
.ed-label {
  display: block;
  font-family: var(--ed-sans);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ed-muted);
  margin-bottom: 8px;
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */
.ed-btn-solid,
.ed-btn-line,
.ed-btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-family: var(--ed-sans);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 15px 28px;
  border-radius: var(--ed-radius);
  border: 1px solid transparent;
  cursor: pointer;
  text-decoration: none;
  transition: background-color 0.22s ease, color 0.22s ease, border-color 0.22s ease;
}

.ed-btn-solid {
  background: var(--ed-ink);
  color: var(--ed-paper);
  border-color: var(--ed-ink);
}
.ed-btn-solid:hover {
  background: var(--ed-accent-deep);
  border-color: var(--ed-accent-deep);
}

.ed-btn-line {
  background: transparent;
  color: var(--ed-ink);
  border-color: var(--ed-ink);
}
.ed-btn-line:hover {
  background: var(--ed-ink);
  color: var(--ed-paper);
}

.ed-btn-ghost {
  background: var(--ed-card);
  color: var(--ed-ink-2);
  border-color: var(--ed-rule-strong);
}
.ed-btn-ghost:hover {
  border-color: var(--ed-ink);
  color: var(--ed-ink);
}

.ed-btn-solid:disabled,
.ed-btn-line:disabled,
.ed-btn-ghost:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ed-btn-solid:disabled:hover { background: var(--ed-ink); border-color: var(--ed-ink); }

/* ── Form controls ──────────────────────────────────────────────────────── */
.ed-input,
.ed-select,
.ed-textarea {
  display: block;
  width: 100%;
  background: var(--ed-card) !important;
  border: 1px solid var(--ed-rule-strong);
  border-radius: var(--ed-radius);
  padding: 12px 14px;
  font-family: var(--ed-sans);
  font-size: 14px;
  font-weight: 400;
  color: var(--ed-ink) !important;
  outline: none;
  -webkit-appearance: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.ed-textarea { resize: vertical; min-height: 108px; line-height: 1.6; }
.ed-select { padding-inline-end: 38px; cursor: pointer; appearance: none; }
.ed-input::placeholder,
.ed-textarea::placeholder { color: var(--ed-muted); }
.ed-input:hover,
.ed-select:hover,
.ed-textarea:hover { border-color: var(--ed-ink-2); }
.ed-input:focus,
.ed-select:focus,
.ed-textarea:focus {
  border-color: var(--ed-accent);
  box-shadow: 0 0 0 3px var(--ed-accent-wash);
}
.ed-select option { background: var(--ed-card); color: var(--ed-ink); }

/*
 * A select that reads as a line of type rather than a control — used in
 * toolbars. Declared here rather than fought for with Tailwind `!` utilities,
 * which lose to the `background: … !important` above on source order.
 */
.ed-select.ed-select--bare {
  background: transparent !important;
  border: 0;
  border-radius: 0;
  padding: 8px 24px 8px 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ed-ink-2) !important;
  width: auto;
}
.ed-select.ed-select--bare:hover { color: var(--ed-ink) !important; }
.ed-select.ed-select--bare:focus { box-shadow: none; }
[dir='rtl'] .ed-select.ed-select--bare { padding: 8px 0 8px 24px; }

/* ── Inline link ───────────────────────────────────────────────────────── */
.ed-link {
  color: var(--ed-ink);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
  text-decoration-color: var(--ed-rule-strong);
  transition: text-decoration-color 0.18s ease, color 0.18s ease;
}
.ed-link:hover {
  color: var(--ed-accent-deep);
  text-decoration-color: var(--ed-accent);
}

/* ── Rich-text (product descriptions) ──────────────────────────────────── */
.ed-prose { color: var(--ed-ink-2); font-family: var(--ed-serif); line-height: 1.75; }
.ed-prose > * + * { margin-top: 1.1em; }
.ed-prose h1, .ed-prose h2, .ed-prose h3, .ed-prose h4 {
  font-family: var(--ed-serif);
  color: var(--ed-ink);
  line-height: 1.2;
  margin-top: 1.6em;
}
.ed-prose h2 { font-size: 1.5em; }
.ed-prose h3 { font-size: 1.25em; }
.ed-prose a { color: var(--ed-accent-deep); text-decoration: underline; text-underline-offset: 3px; }
.ed-prose ul, .ed-prose ol { padding-inline-start: 1.3em; }
.ed-prose ul { list-style: none; }
.ed-prose ul > li { position: relative; padding-inline-start: 1.1em; }
.ed-prose ul > li::before {
  content: '';
  position: absolute;
  inset-inline-start: 0;
  top: 0.75em;
  width: 14px;
  height: 1px;
  background: var(--ed-accent);
}
.ed-prose ol { list-style: decimal; }
.ed-prose blockquote {
  border-inline-start: 2px solid var(--ed-accent);
  padding-inline-start: 1.1em;
  font-style: italic;
  color: var(--ed-ink);
}
.ed-prose img { border: 1px solid var(--ed-rule); }
.ed-prose strong { color: var(--ed-ink); font-weight: 600; }

/* ── Scrollbar ────────────────────────────────────────────────────────── */
.ed-theme ::-webkit-scrollbar { width: 10px; height: 10px; }
.ed-theme ::-webkit-scrollbar-track { background: var(--ed-paper-2); }
.ed-theme ::-webkit-scrollbar-thumb {
  background: var(--ed-rule-strong);
  border: 3px solid var(--ed-paper-2);
}
.ed-theme ::-webkit-scrollbar-thumb:hover { background: var(--ed-muted); }

/* ── Motion ───────────────────────────────────────────────────────────── */
@keyframes ed-rise {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ed-rise { animation: ed-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
.ed-rise-2 { animation: ed-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both; }
.ed-rise-3 { animation: ed-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.16s both; }

@media (prefers-reduced-motion: reduce) {
  .ed-theme *,
  .ed-theme *::before,
  .ed-theme *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
</style>
