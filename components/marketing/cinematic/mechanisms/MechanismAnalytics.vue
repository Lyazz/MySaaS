<script setup lang="ts">
withDefaults(defineProps<{ size?: 'full' | 'compact' }>(), { size: 'full' })
</script>

<template>
  <div :class="['mech-an', `mech-an--${size}`]" aria-hidden="true">
    <svg viewBox="0 0 200 160" class="mech-an__svg" xmlns="http://www.w3.org/2000/svg">
      <!-- Frame -->
      <rect x="14" y="14" width="172" height="132" rx="8"
        fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.06)" />

      <!-- KPI -->
      <g v-if="size === 'full'" transform="translate(26, 30)">
        <text x="0" y="0" font-family="ui-monospace, monospace" font-size="8"
          fill="rgba(255,255,255,0.4)" letter-spacing="0.22em">REVENUE</text>
        <text x="0" y="22" font-family="ui-monospace, monospace" font-size="22"
          fill="rgb(255,255,255)" font-weight="500" letter-spacing="0.02em" class="mech-an__kpi">
          <tspan class="mech-an__kpi-num mech-an__kpi-num--0">0</tspan>
          <tspan class="mech-an__kpi-num mech-an__kpi-num--1" x="0" y="22">62</tspan>
          <tspan class="mech-an__kpi-num mech-an__kpi-num--2" x="0" y="22">158</tspan>
          <tspan class="mech-an__kpi-num mech-an__kpi-num--3" x="0" y="22">248</tspan>
        </text>
        <text x="44" y="22" font-family="ui-monospace, monospace" font-size="9"
          fill="rgba(212,255,77,0.7)" class="mech-an__kpi-trend">↑ 24%</text>
      </g>

      <!-- Bars baseline -->
      <line x1="26" y1="124" x2="174" y2="124" stroke="rgba(255,255,255,0.08)" stroke-width="0.8" />

      <!-- Bars (origin bottom) -->
      <g class="mech-an__bars">
        <rect class="mech-an__bar mech-an__bar--1" x="34" y="124" width="20" height="40"
          fill="rgba(255,255,255,0.18)" rx="2" />
        <rect class="mech-an__bar mech-an__bar--2" x="64" y="124" width="20" height="60"
          fill="rgba(255,255,255,0.22)" rx="2" />
        <rect class="mech-an__bar mech-an__bar--3" x="94" y="124" width="20" height="48"
          fill="rgba(255,255,255,0.18)" rx="2" />
        <rect class="mech-an__bar mech-an__bar--4" x="124" y="124" width="20" height="74"
          fill="rgba(212,255,77,0.5)" rx="2" />
      </g>

      <!-- Trend line -->
      <polyline class="mech-an__line"
        points="44,98 74,82 104,90 134,62 164,72"
        fill="none" stroke="rgb(212,255,77)" stroke-width="1.6"
        stroke-linecap="round" stroke-linejoin="round" />

      <!-- Endpoint pulse -->
      <circle class="mech-an__dot" cx="164" cy="72" r="3" fill="rgb(212,255,77)" />
    </svg>
  </div>
</template>

<style scoped>
.mech-an {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mech-an--compact { aspect-ratio: 1; }
.mech-an__svg { width: 100%; height: 100%; max-width: 360px; }

.mech-an__bar {
  transform-origin: 50% 124px;
  transform: scaleY(0);
  animation: mech-an-bar 4s ease-out infinite;
}
.mech-an__bar--1 { animation-delay: 0.1s; }
.mech-an__bar--2 { animation-delay: 0.3s; }
.mech-an__bar--3 { animation-delay: 0.5s; }
.mech-an__bar--4 { animation-delay: 0.7s; }

@keyframes mech-an-bar {
  0%   { transform: scaleY(0); }
  20%  { transform: scaleY(1); }
  85%  { transform: scaleY(1); }
  100% { transform: scaleY(0); }
}

.mech-an__line {
  stroke-dasharray: 220;
  stroke-dashoffset: 220;
  animation: mech-an-line 4s ease-out infinite;
}
@keyframes mech-an-line {
  0%   { stroke-dashoffset: 220; }
  35%  { stroke-dashoffset: 0; }
  85%  { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 220; }
}

.mech-an__dot {
  opacity: 0;
  transform-origin: 164px 72px;
  transform-box: fill-box;
  animation: mech-an-dot 4s ease-out infinite;
}
@keyframes mech-an-dot {
  0%, 50% { opacity: 0; transform: scale(0.4); }
  60%     { opacity: 1; transform: scale(1.6); }
  68%     { opacity: 1; transform: scale(1); }
  88%     { opacity: 1; transform: scale(1); }
  100%    { opacity: 0; transform: scale(0.4); }
}

.mech-an__kpi-num { opacity: 0; }
.mech-an__kpi-num--0 { animation: mech-an-num 4s steps(1) infinite; animation-delay: 0s; }
.mech-an__kpi-num--1 { animation: mech-an-num 4s steps(1) infinite; animation-delay: 0.4s; }
.mech-an__kpi-num--2 { animation: mech-an-num 4s steps(1) infinite; animation-delay: 0.7s; }
.mech-an__kpi-num--3 { animation: mech-an-num 4s steps(1) infinite; animation-delay: 1s; }

@keyframes mech-an-num {
  0%   { opacity: 1; }
  10%  { opacity: 1; }
  10.01%, 100% { opacity: 0; }
}
.mech-an__kpi-num--3 {
  animation: mech-an-num-final 4s steps(1) infinite;
  animation-delay: 1s;
}
@keyframes mech-an-num-final {
  0%   { opacity: 1; }
  88%  { opacity: 1; }
  88.01%, 100% { opacity: 0; }
}

.mech-an__kpi-trend {
  opacity: 0;
  animation: mech-an-trend 4s ease-out infinite;
  animation-delay: 1.2s;
}
@keyframes mech-an-trend {
  0%   { opacity: 0; transform: translateX(-4px); }
  10%  { opacity: 1; transform: translateX(0); }
  85%  { opacity: 1; }
  100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .mech-an__bar,
  .mech-an__line,
  .mech-an__dot,
  .mech-an__kpi-num,
  .mech-an__kpi-trend {
    animation: none;
  }
  .mech-an__bar { transform: scaleY(1); }
  .mech-an__line { stroke-dashoffset: 0; }
  .mech-an__dot { opacity: 1; transform: scale(1); }
  .mech-an__kpi-num--3 { opacity: 1; }
  .mech-an__kpi-trend { opacity: 1; transform: none; }
}
</style>
