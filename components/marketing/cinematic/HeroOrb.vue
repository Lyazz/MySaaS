<template>
  <div class="hero-3d" aria-hidden="true">
    <div class="hero-3d__halo" />

    <div class="hero-3d__stage">
      <!-- Wilaya grid (back layer) -->
      <svg class="wilaya-grid" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#C6F432" stop-opacity="0.5" />
            <stop offset="100%" stop-color="#C6F432" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="arc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#C6F432" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#C6F432" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- Connecting arcs from hub to each wilaya -->
        <line
          v-for="w in WILAYAS"
          :key="`arc-${w.code}`"
          :x1="50"
          :y1="50"
          :x2="w.x"
          :y2="w.y"
          stroke="url(#arc-grad)"
          stroke-width="0.18"
          stroke-dasharray="0.6 1.2"
          class="wilaya-arc"
        />

        <!-- Wilaya dots -->
        <g
          v-for="(w, i) in WILAYAS"
          :key="`dot-${w.code}`"
          :style="{ '--i': i }"
          class="wilaya-node"
        >
          <circle
            :cx="w.x"
            :cy="w.y"
            :r="w.code === '16' ? 1.2 : 0.8"
            class="wilaya-dot"
          />
          <circle
            :cx="w.x"
            :cy="w.y"
            :r="w.code === '16' ? 2.4 : 1.8"
            class="wilaya-dot-glow"
          />
        </g>

        <!-- Outbound delivery packets (4 looping) -->
        <circle
          v-for="(t, i) in OUTBOUND_TARGETS"
          :key="`out-${i}`"
          r="0.55"
          class="packet packet--out"
          :style="{
            '--tx': `${t.x - 50}`,
            '--ty': `${t.y - 50}`,
            animationDelay: `${i * 1.1}s`
          }"
          cx="50"
          cy="50"
        />

        <!-- Inbound revenue packets -->
        <circle
          v-for="(t, i) in INBOUND_SOURCES"
          :key="`in-${i}`"
          r="0.5"
          class="packet packet--in"
          :style="{
            '--tx': `${t.x - 50}`,
            '--ty': `${t.y - 50}`,
            animationDelay: `${i * 0.9 + 0.4}s`
          }"
          :cx="t.x"
          :cy="t.y"
        />
      </svg>

      <!-- Central commerce hub -->
      <div class="hub">
        <div class="hub__pulse" />
        <div class="hub__pulse hub__pulse--delay" />

        <svg class="hub__rings" viewBox="0 0 100 100">
          <ellipse
            cx="50" cy="50" rx="34" ry="34"
            fill="none"
            stroke="rgba(198,244,50,0.25)"
            stroke-width="0.4"
            stroke-dasharray="2 3"
            class="hub__ring hub__ring--slow"
          />
          <ellipse
            cx="50" cy="50" rx="26" ry="26"
            fill="none"
            stroke="rgba(198,244,50,0.4)"
            stroke-width="0.3"
            stroke-dasharray="1 2"
            class="hub__ring hub__ring--rev"
          />
        </svg>

        <div class="hub__core">
          <div class="hub__core-inner">
            <div class="hub__core-metric">
              <div class="hub__core-value cinematic-mono-num">{{ currentMetric.value }}</div>
              <div class="hub__core-label">{{ currentMetric.label }}</div>
            </div>
            <div class="hub__core-bars">
              <span v-for="(h, i) in BAR_HEIGHTS" :key="i" :style="{ height: `${h}%`, animationDelay: `${i * 0.15}s` }" />
            </div>
          </div>
        </div>
      </div>

      <!-- Floating chips -->
      <div class="hero-3d__chip hero-3d__chip--tl">
        <Icon name="lucide:bell" class="h-3.5 w-3.5 text-lime-neon" />
        <div class="min-w-0">
          <div class="text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--m-text-faint)]">{{ t('saasLanding.hero.orb.newOrder') }}</div>
          <div class="text-xs text-white">+ {{ currentOrder.wilaya }} · <span class="cinematic-mono-num">{{ currentOrder.amount }}</span> DA</div>
        </div>
      </div>

      <div class="hero-3d__chip hero-3d__chip--tr">
        <Icon name="lucide:truck" class="h-3.5 w-3.5 text-lime-neon" />
        <div class="min-w-0">
          <div class="text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--m-text-faint)]">{{ t('saasLanding.hero.orb.shipping') }}</div>
          <div class="text-xs text-white">{{ currentProvider }} · {{ t('saasLanding.hero.orb.live') }}</div>
        </div>
        <span class="ml-1 h-1.5 w-1.5 rounded-full bg-lime-neon shadow-[0_0_8px_rgba(198,244,50,0.8)]" />
      </div>

      <div class="hero-3d__chip hero-3d__chip--bl">
        <Icon name="lucide:banknote" class="h-3.5 w-3.5 text-lime-neon" />
        <div class="min-w-0">
          <div class="text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--m-text-faint)]">{{ t('saasLanding.hero.orb.payment') }}</div>
          <div class="text-xs text-white">{{ t('saasLanding.hero.orb.codAccepted') }}</div>
        </div>
      </div>

      <div class="hero-3d__chip hero-3d__chip--br">
        <Icon name="lucide:trending-up" class="h-3.5 w-3.5 text-lime-neon" />
        <div class="min-w-0">
          <div class="text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--m-text-faint)]">{{ t('saasLanding.hero.orb.today') }}</div>
          <div class="cinematic-mono-num text-xs text-white">DA {{ formattedRevenue }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

const WILAYAS = [
  { code: '16', name: 'Alger',       x: 50, y: 28 },
  { code: '31', name: 'Oran',        x: 28, y: 32 },
  { code: '25', name: 'Constantine', x: 70, y: 26 },
  { code: '19', name: 'Sétif',       x: 60, y: 30 },
  { code: '23', name: 'Annaba',      x: 80, y: 24 },
  { code: '09', name: 'Blida',       x: 50, y: 34 },
  { code: '06', name: 'Béjaïa',      x: 62, y: 26 },
  { code: '13', name: 'Tlemcen',     x: 18, y: 36 },
  { code: '15', name: 'Tizi Ouzou',  x: 56, y: 26 },
  { code: '02', name: 'Chlef',       x: 40, y: 32 },
  { code: '05', name: 'Batna',       x: 66, y: 38 },
  { code: '07', name: 'Biskra',      x: 60, y: 48 },
  { code: '17', name: 'Djelfa',      x: 50, y: 52 },
  { code: '47', name: 'Ghardaïa',    x: 48, y: 64 },
  { code: '30', name: 'Ouargla',     x: 62, y: 66 },
  { code: '11', name: 'Tamanrasset', x: 52, y: 86 }
]

const OUTBOUND_TARGETS = [WILAYAS[1], WILAYAS[4], WILAYAS[7], WILAYAS[14]]
const INBOUND_SOURCES = [WILAYAS[2], WILAYAS[5], WILAYAS[10], WILAYAS[3]]

const PROVIDERS = ['Maystro', 'Yalidine', 'ZR Express']
const ORDER_SAMPLES = [
  { wilaya: 'Oran',        amount: '4 200' },
  { wilaya: 'Alger',       amount: '6 850' },
  { wilaya: 'Constantine', amount: '3 100' },
  { wilaya: 'Sétif',       amount: '5 400' },
  { wilaya: 'Annaba',      amount: '2 750' },
  { wilaya: 'Blida',       amount: '7 200' }
]

const METRICS = computed(() => [
  { label: t('saasLanding.hero.orb.metrics.ordersPerHour'),  value: '184'    },
  { label: t('saasLanding.hero.orb.metrics.avgBasket'),      value: '4 320'  },
  { label: t('saasLanding.hero.orb.metrics.conversion'),     value: '3.8 %'  },
  { label: t('saasLanding.hero.orb.metrics.activeWilayas'),  value: '48 / 58'},
  { label: t('saasLanding.hero.orb.metrics.deliveredToday'), value: '1 247'  }
])

const BAR_HEIGHTS = [40, 70, 55, 85, 62, 78, 48]

const providerIdx = ref(0)
const orderIdx = ref(0)
const metricIdx = ref(0)
const revenue = ref(142380)

const currentProvider = computed(() => PROVIDERS[providerIdx.value])
const currentOrder = computed(() => ORDER_SAMPLES[orderIdx.value])
const currentMetric = computed(() => METRICS.value[metricIdx.value])
const formattedRevenue = computed(() =>
  revenue.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
)

let providerTimer: ReturnType<typeof setInterval> | null = null
let orderTimer: ReturnType<typeof setInterval> | null = null
let revenueTimer: ReturnType<typeof setInterval> | null = null
let metricTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  providerTimer = setInterval(() => {
    providerIdx.value = (providerIdx.value + 1) % PROVIDERS.length
  }, 4000)

  orderTimer = setInterval(() => {
    orderIdx.value = (orderIdx.value + 1) % ORDER_SAMPLES.length
  }, 3500)

  revenueTimer = setInterval(() => {
    revenue.value += Math.floor(50 + Math.random() * 250)
    if (revenue.value > 999999) revenue.value = 142380
  }, 2000)

  metricTimer = setInterval(() => {
    metricIdx.value = (metricIdx.value + 1) % METRICS.value.length
  }, 2800)
})

onBeforeUnmount(() => {
  if (providerTimer) clearInterval(providerTimer)
  if (orderTimer) clearInterval(orderTimer)
  if (revenueTimer) clearInterval(revenueTimer)
  if (metricTimer) clearInterval(metricTimer)
})
</script>

<style scoped>
.hero-3d {
  position: relative;
  width: clamp(280px, 38vw, 460px);
  aspect-ratio: 1.05 / 1;
  margin-inline: auto;
  perspective: 1100px;
}

.hero-3d__halo {
  position: absolute;
  inset: 8%;
  border-radius: 999px;
  background: radial-gradient(circle at 50% 50%, rgba(198, 244, 50, 0.28), transparent 60%);
  filter: blur(28px);
  animation: pulse-glow 5s ease-in-out infinite;
}

.hero-3d__stage {
  position: absolute;
  inset: 0;
  animation: hero-stage-float 8s ease-in-out infinite;
}

@keyframes hero-stage-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
}

/* Wilaya grid */
.wilaya-grid {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.wilaya-arc {
  opacity: 0.55;
}

.wilaya-dot {
  fill: #C6F432;
  filter: drop-shadow(0 0 1.5px rgba(198, 244, 50, 0.9));
}

.wilaya-dot-glow {
  fill: #C6F432;
  opacity: 0;
  transform-origin: center;
  transform-box: fill-box;
  animation: wilaya-glow 6s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.32s);
}

@keyframes wilaya-glow {
  0%, 90%, 100% { opacity: 0; transform: scale(0.6); }
  10%           { opacity: 0.45; transform: scale(1); }
  25%           { opacity: 0; transform: scale(1.6); }
}

/* Packets travelling along arcs */
.packet {
  fill: #C6F432;
  filter: drop-shadow(0 0 2px rgba(198, 244, 50, 0.9));
}

.packet--out {
  animation: packet-out 4.4s ease-in-out infinite;
}

.packet--in {
  fill: #ffffff;
  animation: packet-in 4.8s ease-in-out infinite;
}

@keyframes packet-out {
  0%   { transform: translate(0, 0); opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { transform: translate(calc(var(--tx) * 1%), calc(var(--ty) * 1%)); opacity: 0; }
}

@keyframes packet-in {
  0%   { transform: translate(0, 0); opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { transform: translate(calc(var(--tx) * -1%), calc(var(--ty) * -1%)); opacity: 0; }
}

/* Hub */
.hub {
  position: absolute;
  top: 50%;
  left: 50%;
  width: clamp(170px, 22vw, 240px);
  height: clamp(170px, 22vw, 240px);
  transform: translate(-50%, -50%);
}

.hub__pulse {
  position: absolute;
  inset: 25%;
  border-radius: 999px;
  border: 1px solid rgba(198, 244, 50, 0.6);
  animation: hub-pulse 3s ease-out infinite;
}

.hub__pulse--delay {
  animation-delay: 1.5s;
}

@keyframes hub-pulse {
  0%   { opacity: 0.7; transform: scale(0.6); }
  100% { opacity: 0;   transform: scale(2.4); }
}

.hub__rings {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hub__ring--slow {
  transform-origin: center;
  animation: ring-spin 30s linear infinite;
}

.hub__ring--rev {
  transform-origin: center;
  animation: ring-spin 45s linear infinite reverse;
}

@keyframes ring-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.hub__core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 56%;
  height: 56%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(198,244,50,0.18), rgba(10,16,20,0.95) 70%);
  border: 1px solid rgba(198, 244, 50, 0.45);
  box-shadow:
    0 0 24px rgba(198, 244, 50, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
}

.hub__core-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0 0.4rem;
}

.hub__core-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  animation: metric-fade 2.8s ease-in-out infinite;
}

.hub__core-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  line-height: 1;
}

.hub__core-label {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.6rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(198, 244, 50, 0.9);
  white-space: nowrap;
  text-align: center;
}

.hub__core-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 18px;
  width: 65%;
}

.hub__core-bars span {
  flex: 1;
  background: linear-gradient(to top, rgba(198, 244, 50, 0.9), rgba(198, 244, 50, 0.3));
  border-radius: 1px;
  animation: bar-pulse 2s ease-in-out infinite;
  transform-origin: bottom;
}

@keyframes bar-pulse {
  0%, 100% { transform: scaleY(0.45); opacity: 0.7; }
  50%      { transform: scaleY(1);    opacity: 1;   }
}

@keyframes metric-fade {
  0%, 88%, 100% { opacity: 1; transform: translateY(0); }
  92%           { opacity: 0; transform: translateY(-3px); }
  96%           { opacity: 0; transform: translateY(3px); }
}

/* Chips (kept from previous design) */
.hero-3d__chip {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 16, 20, 0.78);
  backdrop-filter: blur(14px);
  box-shadow: 0 14px 40px -16px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  white-space: nowrap;
  z-index: 2;
  animation: chip-bob 6s ease-in-out infinite;
}

.hero-3d__chip--tl { top: 4%;  left: -6%;  animation-delay: -1s; }
.hero-3d__chip--tr { top: 8%;  right: -8%; animation-delay: -3s; }
.hero-3d__chip--bl { bottom: 12%; left: -8%; animation-delay: -2s; }
.hero-3d__chip--br { bottom: 4%;  right: -4%; animation-delay: -4s; }

@keyframes chip-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}

@media (prefers-reduced-motion: reduce) {
  .hero-3d__halo,
  .hero-3d__stage,
  .hero-3d__chip,
  .hub__pulse,
  .hub__ring--slow,
  .hub__ring--rev,
  .wilaya-dot-glow,
  .packet--out,
  .packet--in,
  .hub__core-bars span,
  .hub__core-metric {
    animation: none !important;
  }
  .packet--out,
  .packet--in {
    opacity: 0;
  }
}
</style>
