<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div class="atelier-theme">
    <slot />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap');

:root {
  --at-bg:        #FBF3E6;
  --at-surface:   #FFF9EA;
  --at-surface-2: #F7E4BD;
  --at-border:    #E4C58F;
  --at-border-2:  #BE9960;
  --at-muted:     #8F7655;
  --at-sub:       #3F5E43;
  --at-text:      #1D2419;
  --at-cream:     #0B4A25;
  --at-gold:      #B38335;
  --at-green:     #0B4A25;
  --at-gold-dim:  rgba(179,131,53,0.18);
  --at-error:     #B84036;
  --at-success:   #0B4A25;

  --at-f-display: 'Fraunces', 'Noto Sans Arabic', Georgia, serif;
  --at-f-mono:    'Noto Sans Arabic', ui-sans-serif, system-ui, sans-serif;
}

.atelier-theme {
  background: var(--at-bg);
  color: var(--at-text);
  font-family: var(--at-f-mono);
  font-weight: 300;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

.atelier-theme *::selection {
  background: var(--at-gold-dim);
  color: var(--at-cream);
}

/* Scrollbar */
.atelier-theme ::-webkit-scrollbar { width: 4px; height: 4px; }
.atelier-theme ::-webkit-scrollbar-track { background: var(--at-surface); }
.atelier-theme ::-webkit-scrollbar-thumb { background: var(--at-border-2); }

/* Shared typography */
.at-label {
  font-family: var(--at-f-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--at-gold);
}

.at-display {
  font-family: var(--at-f-display);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.05;
  color: var(--at-cream);
}

.at-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 14px 28px;
  background: transparent;
  border: 1px solid rgba(11,74,37,0.24);
  font-family: var(--at-f-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--at-text);
  cursor: pointer;
  text-decoration: none;
  position: relative;
  overflow: hidden;
  transition: color 0.3s, border-color 0.3s;
}
.at-btn-primary::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--at-gold);
  transform: translateX(-101%);
  transition: transform 0.4s cubic-bezier(0.76, 0, 0.24, 1);
}
.at-btn-primary:hover::before { transform: translateX(0); }
.at-btn-primary:hover { border-color: var(--at-gold); }
.at-btn-primary > * { position: relative; }

.at-btn-solid {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 16px 28px;
  background: var(--at-cream);
  border: none;
  font-family: var(--at-f-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--at-bg);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.25s, color 0.25s;
}
.at-btn-solid:hover { background: var(--at-gold); color: var(--at-bg); }
.at-btn-solid:disabled { opacity: 0.4; cursor: not-allowed; }

.at-btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  width: 100%;
  border: 1px solid var(--at-border-2);
  background: transparent;
  font-family: var(--at-f-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--at-sub);
  cursor: pointer;
  text-decoration: none;
  justify-content: center;
  transition: border-color 0.25s, color 0.25s;
}
.at-btn-ghost:hover { border-color: var(--at-gold); color: var(--at-gold); }

.at-input {
  display: block;
  width: 100%;
  background: var(--at-surface) !important;
  border: 1px solid var(--at-border);
  padding: 12px 14px;
  font-family: var(--at-f-mono);
  font-size: 12px;
  font-weight: 300;
  color: var(--at-text) !important;
  outline: none;
  transition: border-color 0.2s;
  -webkit-appearance: none;
}
.at-input::placeholder { color: var(--at-muted); }
.at-input:focus { border-color: var(--at-gold); }

.at-select {
  display: block;
  width: 100%;
  background: var(--at-surface) !important;
  border: 1px solid var(--at-border);
  padding: 12px 36px 12px 14px;
  font-family: var(--at-f-mono);
  font-size: 12px;
  font-weight: 300;
  color: var(--at-text) !important;
  outline: none;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s;
}
.at-select:focus { border-color: var(--at-gold); }
.at-select option { background: var(--at-surface); color: var(--at-text); }

@keyframes at-fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes at-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.25; }
}
</style>
