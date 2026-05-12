<script setup lang="ts">
withDefaults(defineProps<{ size?: 'full' | 'compact' }>(), { size: 'full' })
</script>

<template>
  <div :class="['mech-ten', `mech-ten--${size}`]" aria-hidden="true">
    <svg viewBox="0 0 160 160" class="mech-ten__svg" xmlns="http://www.w3.org/2000/svg">
      <!-- 2x2 grid of tenant cards -->
      <g class="mech-ten__cell mech-ten__cell--1" transform="translate(20, 20)">
        <rect width="56" height="56" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" />
        <rect x="6" y="6" width="20" height="3" rx="1.5" fill="rgba(212,255,77,0.7)" />
        <rect x="6" y="14" width="44" height="2" rx="1" fill="rgba(255,255,255,0.2)" />
        <rect x="6" y="20" width="32" height="2" rx="1" fill="rgba(255,255,255,0.14)" />
        <circle cx="48" cy="8" r="2" fill="rgb(212,255,77)" />
      </g>
      <g class="mech-ten__cell mech-ten__cell--2" transform="translate(84, 20)">
        <rect width="56" height="56" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" />
        <rect x="6" y="6" width="16" height="3" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="6" y="14" width="40" height="2" rx="1" fill="rgba(255,255,255,0.2)" />
        <rect x="6" y="20" width="36" height="2" rx="1" fill="rgba(255,255,255,0.14)" />
        <circle cx="8" cy="48" r="2" fill="rgb(212,255,77)" />
      </g>
      <g class="mech-ten__cell mech-ten__cell--3" transform="translate(20, 84)">
        <rect width="56" height="56" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" />
        <rect x="6" y="6" width="22" height="3" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="6" y="14" width="36" height="2" rx="1" fill="rgba(255,255,255,0.2)" />
        <rect x="6" y="20" width="28" height="2" rx="1" fill="rgba(255,255,255,0.14)" />
        <circle cx="48" cy="48" r="2" fill="rgb(212,255,77)" />
      </g>
      <g class="mech-ten__cell mech-ten__cell--4" transform="translate(84, 84)">
        <rect width="56" height="56" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(212,255,77,0.35)" />
        <rect x="6" y="6" width="18" height="3" rx="1.5" fill="rgba(212,255,77,0.7)" />
        <rect x="6" y="14" width="42" height="2" rx="1" fill="rgba(255,255,255,0.2)" />
        <rect x="6" y="20" width="30" height="2" rx="1" fill="rgba(255,255,255,0.14)" />
        <circle cx="8" cy="8" r="2" fill="rgb(212,255,77)" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.mech-ten {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mech-ten--compact { aspect-ratio: 1; }
.mech-ten__svg { width: 100%; height: 100%; max-width: 360px; }

.mech-ten__cell {
  transform-origin: center;
  transform-box: fill-box;
  animation: mech-ten-breathe 5s ease-in-out infinite;
}
.mech-ten__cell--1 { animation-delay: 0s; }
.mech-ten__cell--2 { animation-delay: 1.2s; }
.mech-ten__cell--3 { animation-delay: 2.5s; }
.mech-ten__cell--4 { animation-delay: 0.6s; }

@keyframes mech-ten-breathe {
  0%, 100% { opacity: 0.55; transform: scale(0.97); }
  50%      { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .mech-ten__cell { animation: none; opacity: 1; transform: none; }
}
</style>
