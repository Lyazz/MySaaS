<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const brandColor = useStorefrontTemplateBrandColor('maison')

const atelierStyle = computed(() => ({
  '--brand': brandColor.value.color,
  '--brand-rgb': brandColor.value.rgb,
  '--at-cream': brandColor.value.color,
  '--at-green': brandColor.value.color,
  '--at-success': brandColor.value.color,
  '--at-brand-dim': `rgba(${brandColor.value.rgb.replaceAll(' ', ',')},0.14)`
} as Record<string, string>))

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div class="atelier-theme" :style="atelierStyle">
    <slot />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,600&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap');

:root {
  /* ── Shell — the paper the shop is printed on ─────────────── */
  --at-bg:        #FAF2E3;
  --at-bg-2:      #F3E7CF;
  --at-surface:   #FFFBF0;
  --at-surface-2: #F7E7C6;
  --at-surface-3: #EEDCB3;

  /* ── Hairlines ────────────────────────────────────────────── */
  --at-border:    #E7CE9C;
  --at-border-2:  #C8A369;
  --at-hair:      rgba(11,74,37,0.14);

  /* ── Kernel — the greens ──────────────────────────────────── */
  --at-green:     #0B4A25;
  --at-green-900: #052A16;
  --at-green-800: #073B1D;
  --at-green-600: #1D6136;
  --at-green-400: #4E8858;
  --at-leaf:      #9CBB8C;

  /* ── Honey — the golds ────────────────────────────────────── */
  --at-gold:      #B38335;
  --at-gold-700:  #8B6322;
  --at-gold-500:  #CB9E4E;
  --at-gold-300:  #E7C888;
  --at-gold-dim:  rgba(179,131,53,0.16);

  /* ── Skin — the rose under the shell: price drops, alerts ─── */
  --at-skin:      #9C4C5B;
  --at-skin-soft: #C88E96;
  --at-skin-dim:  rgba(156,76,91,0.10);

  /* ── Ink ──────────────────────────────────────────────────── */
  --at-text:      #1C2318;
  --at-ink-2:     #3A462F;
  --at-sub:       #3F5E43;
  --at-muted:     #775F3E;
  --at-faint:     #9C8659;

  /* ── Semantics ────────────────────────────────────────────── */
  --at-cream:     #0B4A25;
  --at-error:     #A63F45;
  --at-success:   #0B4A25;
  --at-brand-dim: rgba(11,74,37,0.14);

  /* ── Depth — shadows cast in bark, never in grey ──────────── */
  --at-shadow-xs: 0 1px 2px rgba(58,40,14,0.05);
  --at-shadow-sm: 0 2px 4px rgba(58,40,14,0.05), 0 8px 20px -12px rgba(58,40,14,0.18);
  --at-shadow-md: 0 3px 8px rgba(58,40,14,0.05), 0 22px 48px -22px rgba(58,40,14,0.26);
  --at-shadow-lg: 0 6px 14px rgba(58,40,14,0.06), 0 40px 84px -32px rgba(58,40,14,0.34);
  --at-shadow-green: 0 22px 48px -22px rgba(11,74,37,0.36);
  --at-ring:      0 0 0 3px rgba(179,131,53,0.18);

  /* ── Inks that pour ───────────────────────────────────────── */
  --at-grad-gold:  linear-gradient(135deg, #E0BB72 0%, #B38335 52%, #8B6322 100%);
  --at-grad-gold-ink: linear-gradient(135deg, #A4732A 0%, #8B6322 55%, #6E4E1A 100%);
  --at-grad-green: linear-gradient(145deg, #146032 0%, #0B4A25 54%, #052A16 100%);
  --at-grad-paper: linear-gradient(180deg, #FFFCF4 0%, #FAF2E3 100%);
  --at-grad-shell: linear-gradient(135deg, #F9EBCE 0%, #EFDCB3 100%);
  --at-grad-hair:  linear-gradient(90deg, transparent, var(--at-border-2) 22%, var(--at-gold) 50%, var(--at-border-2) 78%, transparent);

  /* ── Corners — the leaf is the house shape ────────────────── */
  --at-r-sm:   10px;
  --at-r-md:   18px;
  --at-r-lg:   28px;
  --at-r-leaf: 28px 28px 38px 0;
  --at-r-pill: 999px;

  /* ── Grain — the tooth of the paper ───────────────────────── */
  --at-grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");

  --at-f-display: 'Fraunces', 'Noto Sans Arabic', Georgia, serif;
  --at-f-mono:    'Noto Sans Arabic', ui-sans-serif, system-ui, sans-serif;
}

.atelier-theme {
  /* Every green below is mixed from --at-green, which the tenant's brand
     colour overrides inline — so the whole ramp follows the brand. */
  --at-green-900: color-mix(in srgb, var(--at-green) 60%, #04150B);
  --at-green-800: color-mix(in srgb, var(--at-green) 80%, #04150B);
  --at-green-600: color-mix(in srgb, var(--at-green) 84%, #FFFBF0);
  --at-green-400: color-mix(in srgb, var(--at-green) 56%, #FFFBF0);
  --at-leaf:      color-mix(in srgb, var(--at-green) 34%, #E9DCBC);
  --at-hair:      color-mix(in srgb, var(--at-green) 15%, transparent);
  --at-sub:       color-mix(in srgb, var(--at-green) 58%, #4A5940);
  --at-grad-green: linear-gradient(145deg,
                     color-mix(in srgb, var(--at-green) 86%, #FFFBF0) 0%,
                     var(--at-green) 54%,
                     color-mix(in srgb, var(--at-green) 60%, #04150B) 100%);
  --at-shadow-green: 0 22px 48px -22px color-mix(in srgb, var(--at-green) 42%, transparent);

  /* Shared LocaleSwitcher — pressed shell paper, gold accent */
  --ls-surface: var(--at-surface);
  --ls-border: var(--at-border);
  --ls-shadow: var(--at-shadow-md);
  --ls-radius: var(--at-r-sm);
  --ls-text: var(--at-sub);
  --ls-text-strong: var(--at-text);
  --ls-hover-bg: var(--at-surface-2);
  --ls-accent: var(--at-gold-700);
  --ls-accent-soft: var(--at-gold-dim);

  background-color: var(--at-bg);
  background-image:
    radial-gradient(1100px 620px at 8% -12%, rgba(179,131,53,0.13), transparent 62%),
    radial-gradient(900px 540px at 102% 2%, var(--at-brand-dim), transparent 60%),
    var(--at-grain);
  background-repeat: no-repeat, no-repeat, repeat;
  color: var(--at-text);
  font-family: var(--at-f-mono);
  font-weight: 300;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

[dir='rtl'] .atelier-theme,
.atelier-theme[dir='rtl'] { --at-r-leaf: 28px 28px 0 38px; }

.atelier-theme *::selection {
  background: var(--at-gold-dim);
  color: var(--at-green-900);
}

/* Scrollbar */
.atelier-theme ::-webkit-scrollbar { width: 5px; height: 5px; }
.atelier-theme ::-webkit-scrollbar-track { background: var(--at-surface-2); }
.atelier-theme ::-webkit-scrollbar-thumb { background: var(--at-border-2); border-radius: 999px; }
.atelier-theme ::-webkit-scrollbar-thumb:hover { background: var(--at-gold); }

/* Shared typography */
.at-label {
  font-family: var(--at-f-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--at-gold-700);
}
/* The editorial tick that opens every eyebrow — inline-block so it survives
   both the block and the flex contexts the label is dropped into. */
.at-label::before {
  content: '';
  display: inline-block;
  vertical-align: middle;
  width: 18px;
  height: 1px;
  margin-inline-end: 8px;
  background: currentColor;
  opacity: 0.55;
}

.at-display {
  font-family: var(--at-f-display);
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.05;
  color: var(--at-cream);
}

/* A hairline that fades out of the paper and catches gold in the middle */
.at-rule {
  height: 1px;
  border: 0;
  background: var(--at-grad-hair);
  opacity: 0.7;
}

.at-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 14px 30px;
  background: transparent;
  border: 1px solid var(--at-hair);
  border-radius: var(--at-r-pill);
  font-family: var(--at-f-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--at-text);
  cursor: pointer;
  text-decoration: none;
  position: relative;
  overflow: hidden;
  transition: color 0.3s, border-color 0.3s, box-shadow 0.3s, transform 0.3s;
}
.at-btn-primary::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--at-grad-gold-ink);
  transform: translateX(-101%);
  transition: transform 0.45s cubic-bezier(0.76, 0, 0.24, 1);
}
.at-btn-primary:hover::before { transform: translateX(0); }
.at-btn-primary:hover {
  border-color: transparent;
  color: #FFFBF0;
  box-shadow: var(--at-shadow-sm);
  transform: translateY(-1px);
}
.at-btn-primary > * { position: relative; }

.at-btn-solid {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 16px 30px;
  background: var(--at-grad-green);
  border: none;
  border-radius: var(--at-r-pill);
  font-family: var(--at-f-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #FFFBF0;
  cursor: pointer;
  text-decoration: none;
  box-shadow: var(--at-shadow-green);
  transition: background 0.3s, box-shadow 0.3s, transform 0.25s, filter 0.3s;
}
.at-btn-solid:hover {
  background: var(--at-grad-gold-ink);
  box-shadow: var(--at-shadow-md);
  transform: translateY(-1px);
}
.at-btn-solid:active { transform: translateY(0); }
.at-btn-solid:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
  filter: saturate(0.55);
}

.at-btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  width: 100%;
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-pill);
  background: var(--at-surface);
  font-family: var(--at-f-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--at-sub);
  cursor: pointer;
  text-decoration: none;
  justify-content: center;
  transition: border-color 0.25s, color 0.25s, background 0.25s, box-shadow 0.25s;
}
.at-btn-ghost:hover {
  border-color: var(--at-gold);
  color: var(--at-gold-700);
  background: var(--at-surface-2);
  box-shadow: var(--at-shadow-xs);
}

.at-input {
  display: block;
  width: 100%;
  background: var(--at-surface) !important;
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-sm);
  padding: 13px 15px;
  font-family: var(--at-f-mono);
  font-size: 12px;
  font-weight: 300;
  color: var(--at-text) !important;
  outline: none;
  box-shadow: inset 0 1px 2px rgba(58,40,14,0.045);
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  -webkit-appearance: none;
}
.at-input::placeholder { color: var(--at-faint); }
.at-input:hover { border-color: var(--at-border-2); }
.at-input:focus {
  border-color: var(--at-gold);
  box-shadow: var(--at-ring), inset 0 1px 2px rgba(58,40,14,0.03);
}

.at-select {
  display: block;
  width: 100%;
  background: var(--at-surface) !important;
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-sm);
  padding: 13px 36px 13px 15px;
  font-family: var(--at-f-mono);
  font-size: 12px;
  font-weight: 300;
  color: var(--at-text) !important;
  outline: none;
  appearance: none;
  cursor: pointer;
  box-shadow: inset 0 1px 2px rgba(58,40,14,0.045);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.at-select:hover { border-color: var(--at-border-2); }
.at-select:focus {
  border-color: var(--at-gold);
  box-shadow: var(--at-ring), inset 0 1px 2px rgba(58,40,14,0.03);
}
.at-select option { background: var(--at-surface); color: var(--at-text); }

@keyframes at-fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes at-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.25; }
}
@keyframes at-shimmer {
  from { background-position: -160% 0; }
  to   { background-position: 260% 0; }
}
</style>
