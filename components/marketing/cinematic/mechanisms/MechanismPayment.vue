<script setup lang="ts">
withDefaults(defineProps<{ size?: 'full' | 'compact' }>(), { size: 'full' })
</script>

<template>
  <div :class="['mech-pay', `mech-pay--${size}`]" aria-hidden="true">
    <svg viewBox="0 0 200 160" class="mech-pay__svg" xmlns="http://www.w3.org/2000/svg">
      <!-- Card -->
      <g class="mech-pay__card">
        <rect x="0" y="0" width="78" height="48" rx="6"
          fill="url(#mech-pay-card-grad)" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
        <rect x="8" y="10" width="14" height="10" rx="2" fill="rgba(212,255,77,0.7)" />
        <rect x="8" y="26" width="40" height="3" rx="1.5" fill="rgba(255,255,255,0.55)" />
        <rect x="8" y="33" width="28" height="2.5" rx="1.25" fill="rgba(255,255,255,0.3)" />
      </g>

      <!-- Terminal -->
      <g transform="translate(112, 50)">
        <!-- Pulse ring -->
        <circle cx="36" cy="30" r="14" class="mech-pay__pulse"
          fill="none" stroke="rgba(212,255,77,0.55)" stroke-width="1.5" />
        <!-- Terminal body -->
        <rect x="12" y="6" width="48" height="60" rx="6"
          fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
        <!-- Screen -->
        <rect x="18" y="12" width="36" height="22" rx="3"
          fill="rgba(0,0,0,0.45)" stroke="rgba(212,255,77,0.25)" />
        <!-- Slot -->
        <rect x="18" y="40" width="36" height="3" rx="1.5" fill="rgba(255,255,255,0.18)" />
        <!-- Buttons -->
        <circle cx="22" cy="54" r="2" fill="rgba(255,255,255,0.2)" />
        <circle cx="30" cy="54" r="2" fill="rgba(255,255,255,0.2)" />
        <circle cx="38" cy="54" r="2" fill="rgba(255,255,255,0.2)" />
        <circle cx="46" cy="54" r="2" fill="rgba(255,255,255,0.2)" />
        <circle cx="54" cy="54" r="2" fill="rgba(212,255,77,0.6)" />
        <!-- Check -->
        <g class="mech-pay__check" transform="translate(28, 16)">
          <circle cx="8" cy="8" r="8" fill="rgba(212,255,77,0.18)" stroke="rgba(212,255,77,0.8)" stroke-width="1" />
          <path d="M4.5 8 L7 10.5 L11.5 5.5" fill="none" stroke="rgb(212,255,77)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      </g>

      <!-- Amount ticker -->
      <g v-if="size === 'full'" class="mech-pay__amount" transform="translate(20, 130)">
        <text x="0" y="10" font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
          font-size="11" fill="rgba(255,255,255,0.85)" letter-spacing="0.05em">
          <tspan class="mech-pay__amount-num">0.00</tspan>
        </text>
        <text x="60" y="10" font-family="ui-monospace, monospace"
          font-size="9" fill="rgba(212,255,77,0.7)" letter-spacing="0.2em">PAID</text>
      </g>

      <defs>
        <linearGradient id="mech-pay-card-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,0.08)" />
          <stop offset="100%" stop-color="rgba(212,255,77,0.08)" />
        </linearGradient>
      </defs>
    </svg>
  </div>
</template>

<style scoped>
.mech-pay {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mech-pay--compact { aspect-ratio: 1; }
.mech-pay__svg { width: 100%; height: 100%; max-width: 360px; }

.mech-pay__card {
  animation: mech-pay-card 3.5s ease-in-out infinite;
  transform: translate(10px, 56px);
}
@keyframes mech-pay-card {
  0%   { transform: translate(-30px, 56px); opacity: 0; }
  15%  { opacity: 1; }
  40%  { transform: translate(96px, 56px); opacity: 1; }
  70%  { transform: translate(96px, 56px); opacity: 0.6; }
  85%  { transform: translate(96px, 56px); opacity: 0; }
  100% { transform: translate(-30px, 56px); opacity: 0; }
}

.mech-pay__pulse {
  transform-origin: 148px 80px;
  transform-box: fill-box;
  opacity: 0;
  animation: mech-pay-pulse 3.5s ease-out infinite;
}
@keyframes mech-pay-pulse {
  0%, 38%   { opacity: 0; transform: scale(0.4); }
  45%       { opacity: 0.9; transform: scale(0.4); }
  70%       { opacity: 0; transform: scale(2.4); }
  100%      { opacity: 0; transform: scale(2.4); }
}

.mech-pay__check {
  opacity: 0;
  animation: mech-pay-check 3.5s ease-out infinite;
}
@keyframes mech-pay-check {
  0%, 55%  { opacity: 0; transform: translate(28px, 16px) scale(0.6); }
  65%      { opacity: 1; transform: translate(28px, 16px) scale(1); }
  92%      { opacity: 1; transform: translate(28px, 16px) scale(1); }
  100%     { opacity: 0; transform: translate(28px, 16px) scale(0.6); }
}

.mech-pay__amount-num {
  animation: mech-pay-num-flash 3.5s steps(1) infinite;
}
@keyframes mech-pay-num-flash {
  0%, 30%   { fill: rgba(255,255,255,0.4); }
  35%       { fill: rgba(255,255,255,0.85); }
  100%      { fill: rgba(255,255,255,0.85); }
}

.mech-pay__amount {
  animation: mech-pay-amount-tick 3.5s steps(8) infinite;
}
@keyframes mech-pay-amount-tick {
  0%, 30%  { opacity: 0.5; }
  35%      { opacity: 1; }
  100%     { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .mech-pay__card,
  .mech-pay__pulse,
  .mech-pay__check,
  .mech-pay__amount,
  .mech-pay__amount-num {
    animation: none;
  }
  .mech-pay__card { transform: translate(96px, 56px); opacity: 1; }
  .mech-pay__check { opacity: 1; transform: translate(28px, 16px) scale(1); }
}
</style>
