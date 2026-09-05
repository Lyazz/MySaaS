<script setup lang="ts">
withDefaults(defineProps<{ size?: 'full' | 'compact' }>(), { size: 'full' })
</script>

<template>
  <div :class="['mech-loc', `mech-loc--${size}`]" aria-hidden="true">
    <svg viewBox="0 0 160 160" class="mech-loc__svg" xmlns="http://www.w3.org/2000/svg">
      <!-- Outer frame -->
      <rect x="20" y="36" width="120" height="88" rx="10"
        fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.1)" />

      <!-- Direction arrows -->
      <g class="mech-loc__arrow mech-loc__arrow--ltr" transform="translate(80, 110)">
        <path d="M-18 0 L18 0 M12 -4 L18 0 L12 4" fill="none" stroke="rgba(212,255,77,0.7)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
      </g>
      <g class="mech-loc__arrow mech-loc__arrow--rtl" transform="translate(80, 110)">
        <path d="M18 0 L-18 0 M-12 -4 L-18 0 L-12 4" fill="none" stroke="rgba(212,255,77,0.7)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
      </g>

      <!-- Glyph (centered) -->
      <g transform="translate(80, 76)" text-anchor="middle">
        <text class="mech-loc__glyph mech-loc__glyph--en" font-family="ui-sans-serif, system-ui" font-size="40" font-weight="600" fill="rgba(255,255,255,0.95)" y="14">EN</text>
        <text class="mech-loc__glyph mech-loc__glyph--fr" font-family="ui-sans-serif, system-ui" font-size="40" font-weight="600" fill="rgba(255,255,255,0.95)" y="14">FR</text>
        <text class="mech-loc__glyph mech-loc__glyph--ar" font-family="ui-sans-serif, system-ui" font-size="40" font-weight="600" fill="rgb(212,255,77)" y="14">AR</text>
      </g>

      <!-- Top label -->
      <text x="80" y="28" font-family="ui-monospace, monospace" font-size="8" fill="rgba(255,255,255,0.4)" letter-spacing="0.22em" text-anchor="middle">LOCALE</text>
    </svg>
  </div>
</template>

<style scoped>
.mech-loc {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mech-loc--compact { aspect-ratio: 1; }
.mech-loc__svg { width: 100%; height: 100%; max-width: 360px; }

.mech-loc__glyph {
  opacity: 0;
}
.mech-loc__glyph--en { animation: mech-loc-glyph 4.5s ease-in-out infinite; animation-delay: 0s; }
.mech-loc__glyph--fr { animation: mech-loc-glyph 4.5s ease-in-out infinite; animation-delay: 1.5s; }
.mech-loc__glyph--ar { animation: mech-loc-glyph 4.5s ease-in-out infinite; animation-delay: 3s; }

@keyframes mech-loc-glyph {
  0%   { opacity: 0; transform: translateY(6px); }
  10%  { opacity: 1; transform: translateY(0); }
  30%  { opacity: 1; transform: translateY(0); }
  40%  { opacity: 0; transform: translateY(-6px); }
  100% { opacity: 0; transform: translateY(-6px); }
}

.mech-loc__arrow--ltr {
  opacity: 0;
  animation: mech-loc-arrow-ltr 4.5s ease-in-out infinite;
}
.mech-loc__arrow--rtl {
  opacity: 0;
  animation: mech-loc-arrow-rtl 4.5s ease-in-out infinite;
}
@keyframes mech-loc-arrow-ltr {
  0%, 60%   { opacity: 1; }
  60.01%, 100% { opacity: 0; }
}
@keyframes mech-loc-arrow-rtl {
  0%, 66%   { opacity: 0; }
  66.01%, 95% { opacity: 1; }
  100%      { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .mech-loc__glyph,
  .mech-loc__arrow--ltr,
  .mech-loc__arrow--rtl {
    animation: none;
  }
  .mech-loc__glyph--en { opacity: 1; transform: none; }
  .mech-loc__arrow--ltr { opacity: 1; }
}
</style>
