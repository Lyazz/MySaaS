<script setup lang="ts">
withDefaults(defineProps<{ size?: 'full' | 'compact' }>(), { size: 'full' })
</script>

<template>
  <div :class="['mech-log', `mech-log--${size}`]" aria-hidden="true">
    <svg viewBox="0 0 200 160" class="mech-log__svg" xmlns="http://www.w3.org/2000/svg">
      <!-- Track (dashed line) -->
      <line x1="30" y1="80" x2="170" y2="80"
        stroke="rgba(255,255,255,0.15)" stroke-width="1.2" stroke-dasharray="3 4"
        class="mech-log__track" />

      <!-- Node 1: warehouse -->
      <g class="mech-log__node mech-log__node--1" transform="translate(30, 80)">
        <circle r="14" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" />
        <circle r="14" class="mech-log__ring" fill="none" stroke="rgb(212,255,77)" stroke-width="1.4" />
        <!-- warehouse icon -->
        <path d="M-7 -3 L0 -7 L7 -3 L7 5 L-7 5 Z" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1" stroke-linejoin="round" />
        <rect x="-3" y="-1" width="6" height="6" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="0.8" />
      </g>

      <!-- Node 2: transit -->
      <g class="mech-log__node mech-log__node--2" transform="translate(100, 80)">
        <circle r="14" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" />
        <circle r="14" class="mech-log__ring" fill="none" stroke="rgb(212,255,77)" stroke-width="1.4" />
        <!-- truck icon -->
        <rect x="-7" y="-3" width="9" height="7" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1" />
        <path d="M2 -1 L7 -1 L7 4 L2 4 Z" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1" />
        <circle cx="-4" cy="5" r="1.6" fill="rgba(255,255,255,0.7)" />
        <circle cx="4" cy="5" r="1.6" fill="rgba(255,255,255,0.7)" />
      </g>

      <!-- Node 3: home -->
      <g class="mech-log__node mech-log__node--3" transform="translate(170, 80)">
        <circle r="14" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" />
        <circle r="14" class="mech-log__ring" fill="none" stroke="rgb(212,255,77)" stroke-width="1.4" />
        <!-- home icon -->
        <path d="M-7 1 L0 -6 L7 1 L7 6 L-7 6 Z" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1" stroke-linejoin="round" />
        <rect x="-2" y="2" width="4" height="4" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="0.8" />
      </g>

      <!-- Package -->
      <g class="mech-log__pkg">
        <rect x="-7" y="-7" width="14" height="14" rx="2"
          fill="rgba(212,255,77,0.12)" stroke="rgb(212,255,77)" stroke-width="1.2" />
        <line x1="-7" y1="0" x2="7" y2="0" stroke="rgb(212,255,77)" stroke-width="0.8" stroke-dasharray="1 1.5" />
        <line x1="0" y1="-7" x2="0" y2="0" stroke="rgb(212,255,77)" stroke-width="0.8" />
      </g>

      <!-- Status label -->
      <g v-if="size === 'full'" class="mech-log__label" transform="translate(60, 120)">
        <rect x="0" y="0" width="80" height="18" rx="9"
          fill="rgba(212,255,77,0.06)" stroke="rgba(212,255,77,0.3)" />
        <text x="40" y="12" font-family="ui-monospace, monospace" font-size="8"
          fill="rgb(212,255,77)" text-anchor="middle" letter-spacing="0.18em">
          <tspan class="mech-log__label-text mech-log__label-text--1">PICKED</tspan>
          <tspan class="mech-log__label-text mech-log__label-text--2" x="40" y="12">IN TRANSIT</tspan>
          <tspan class="mech-log__label-text mech-log__label-text--3" x="40" y="12">DELIVERED</tspan>
        </text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.mech-log {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mech-log--compact { aspect-ratio: 1; }
.mech-log__svg { width: 100%; height: 100%; max-width: 360px; }

.mech-log__track {
  animation: mech-log-track 4s linear infinite;
}
@keyframes mech-log-track {
  0%   { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -28; }
}

/* Package travels along the track */
.mech-log__pkg {
  animation: mech-log-pkg 4s ease-in-out infinite;
  transform: translate(30px, 80px);
}
@keyframes mech-log-pkg {
  0%       { transform: translate(30px, 80px); opacity: 0; }
  8%       { opacity: 1; transform: translate(30px, 80px); }
  20%      { transform: translate(30px, 80px); }
  42%      { transform: translate(100px, 80px); }
  55%      { transform: translate(100px, 80px); }
  78%      { transform: translate(170px, 80px); }
  92%      { opacity: 1; transform: translate(170px, 80px); }
  100%     { opacity: 0; transform: translate(170px, 80px); }
}

/* Node rings pulse when package arrives */
.mech-log__ring {
  opacity: 0;
  transform-origin: center;
  transform-box: fill-box;
}
.mech-log__node--1 .mech-log__ring { animation: mech-log-ring 4s ease-out infinite; animation-delay: 0s; }
.mech-log__node--2 .mech-log__ring { animation: mech-log-ring 4s ease-out infinite; animation-delay: 1.6s; }
.mech-log__node--3 .mech-log__ring { animation: mech-log-ring 4s ease-out infinite; animation-delay: 3s; }

@keyframes mech-log-ring {
  0%   { opacity: 0; transform: scale(0.7); }
  6%   { opacity: 0.9; transform: scale(0.9); }
  18%  { opacity: 0; transform: scale(1.6); }
  100% { opacity: 0; transform: scale(1.6); }
}

/* Status label text swap */
.mech-log__label-text {
  opacity: 0;
}
.mech-log__label-text--1 { animation: mech-log-text 4s steps(1) infinite; animation-delay: 0s; }
.mech-log__label-text--2 { animation: mech-log-text 4s steps(1) infinite; animation-delay: 1.4s; }
.mech-log__label-text--3 { animation: mech-log-text 4s steps(1) infinite; animation-delay: 2.8s; }

@keyframes mech-log-text {
  0%   { opacity: 1; }
  35%  { opacity: 1; }
  35.01%, 100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .mech-log__track,
  .mech-log__pkg,
  .mech-log__ring,
  .mech-log__label-text {
    animation: none;
  }
  .mech-log__pkg { transform: translate(170px, 80px); opacity: 1; }
  .mech-log__node--3 .mech-log__ring { opacity: 0.5; }
  .mech-log__label-text--3 { opacity: 1; }
}
</style>
