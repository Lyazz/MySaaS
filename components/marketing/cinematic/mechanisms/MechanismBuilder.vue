<script setup lang="ts">
withDefaults(defineProps<{ size?: 'full' | 'compact' }>(), { size: 'full' })
</script>

<template>
  <div :class="['mech-builder', `mech-builder--${size}`]" aria-hidden="true">
    <svg viewBox="0 0 200 160" class="mech-builder__svg" xmlns="http://www.w3.org/2000/svg">
      <!-- Page frame -->
      <rect x="20" y="14" width="160" height="132" rx="8"
        fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.08)" stroke-width="1" />

      <!-- Block A: Hero -->
      <g class="mech-builder__block mech-builder__block--a">
        <rect x="28" y="22" width="144" height="40" rx="4"
          fill="rgba(255,255,255,0.04)" stroke="rgba(212,255,77,0.35)" stroke-width="1" />
        <rect x="34" y="30" width="60" height="6" rx="2" fill="rgba(212,255,77,0.55)" />
        <rect x="34" y="40" width="90" height="3" rx="1.5" fill="rgba(255,255,255,0.18)" />
        <rect x="34" y="46" width="70" height="3" rx="1.5" fill="rgba(255,255,255,0.12)" />
      </g>

      <!-- Block B: product grid -->
      <g class="mech-builder__block mech-builder__block--b">
        <rect x="28" y="68" width="44" height="32" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" />
        <rect x="78" y="68" width="44" height="32" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" />
        <rect x="128" y="68" width="44" height="32" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(212,255,77,0.3)" />
      </g>

      <!-- Block C: footer -->
      <g class="mech-builder__block mech-builder__block--c">
        <rect x="28" y="106" width="144" height="32" rx="4"
          fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.08)" />
        <circle cx="40" cy="122" r="2.5" fill="rgba(212,255,77,0.55)" />
        <rect x="48" y="120" width="40" height="3" rx="1.5" fill="rgba(255,255,255,0.18)" />
        <rect x="48" y="126" width="28" height="3" rx="1.5" fill="rgba(255,255,255,0.1)" />
      </g>

      <!-- Cursor -->
      <g v-if="size === 'full'" class="mech-builder__cursor">
        <path d="M0 0 L0 12 L3.5 9 L5.5 13 L7.5 12 L5.5 8 L9 8 Z"
          fill="#fff" stroke="rgba(0,0,0,0.5)" stroke-width="0.5" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.mech-builder {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mech-builder--compact {
  aspect-ratio: 1;
}
.mech-builder__svg {
  width: 100%;
  height: 100%;
  max-width: 360px;
}

.mech-builder__block {
  opacity: 0;
  transform: translateY(-14px);
  animation: mech-builder-drop 4s ease-in-out infinite;
}
.mech-builder__block--a { animation-delay: 0s; }
.mech-builder__block--b { animation-delay: 0.7s; }
.mech-builder__block--c { animation-delay: 1.4s; }

@keyframes mech-builder-drop {
  0%   { opacity: 0; transform: translateY(-14px); }
  10%  { opacity: 1; transform: translateY(0); }
  85%  { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-14px); }
}

.mech-builder__cursor {
  animation: mech-builder-cursor 4s ease-in-out infinite;
}
@keyframes mech-builder-cursor {
  0%   { transform: translate(160px, 18px); opacity: 0; }
  8%   { opacity: 1; }
  20%  { transform: translate(160px, 28px); }
  32%  { transform: translate(150px, 78px); }
  52%  { transform: translate(150px, 78px); }
  64%  { transform: translate(150px, 116px); }
  88%  { opacity: 1; transform: translate(150px, 116px); }
  100% { opacity: 0; transform: translate(160px, 18px); }
}

@media (prefers-reduced-motion: reduce) {
  .mech-builder__block,
  .mech-builder__cursor {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
