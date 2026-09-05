<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type Slide = {
  eyebrow: string
  headlinePre: string
  headlineAccent: string
  headlinePost?: string
  subhead: string
  meta: string[]
  address: string
}

const props = defineProps<{
  slides: Slide[]
  primaryCta: { label: string; to: string }
  secondaryCta: { label: string; to: string }
}>()

const current = ref(0)
const total = computed(() => props.slides.length)
const isHovered = ref(false)
const FAST_MS = 5000
const SLOW_MS = 15000
let timer: ReturnType<typeof setInterval> | null = null

function go(i: number) {
  current.value = (i + total.value) % total.value
  restart()
}
function next() { go(current.value + 1) }
function prev() { go(current.value - 1) }

function restart() {
  if (timer) clearInterval(timer)
  const ms = isHovered.value ? SLOW_MS : FAST_MS
  timer = setInterval(() => { current.value = (current.value + 1) % total.value }, ms)
}
function onEnter() { isHovered.value = true;  restart() }
function onLeave() { isHovered.value = false; restart() }

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') next()
  if (e.key === 'ArrowLeft') prev()
}

onMounted(() => {
  restart()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <section class="hero-carousel" :class="{ 'is-hovered': isHovered }" @mouseenter="onEnter" @mouseleave="onLeave">
    <div class="cinematic-container hc-wrap">
      <div class="hc-stage-grid">
        <!-- Copy column -->
        <div class="hc-copy">
          <div
            v-for="(slide, i) in slides"
            :key="i"
            class="hc-slide"
            :class="{ 'is-active': i === current }"
            :aria-hidden="i !== current"
          >
            <div class="hc-eyebrow">
              <span class="hc-dot" />{{ slide.eyebrow }}
            </div>
            <h1 class="hc-headline">
              {{ slide.headlinePre }}
              <br />
              <em>{{ slide.headlineAccent }}</em>
              <template v-if="slide.headlinePost">{{ ' ' + slide.headlinePost }}</template>
            </h1>

            <div class="hc-actions">
              <NuxtLink :to="primaryCta.to" class="hc-btn hc-btn-primary">
                {{ primaryCta.label }}
                <Icon name="lucide:arrow-right" class="h-4 w-4" />
              </NuxtLink>
              <NuxtLink :to="secondaryCta.to" class="hc-btn hc-btn-ghost">
                <Icon name="lucide:layout-grid" class="h-4 w-4" />
                {{ secondaryCta.label }}
              </NuxtLink>
            </div>

            <div class="hc-meta-row">
              <div v-for="(m, k) in slide.meta" :key="k" class="hc-meta">
                <span class="hc-tick">✓</span>{{ m }}
              </div>
            </div>
          </div>
        </div>

        <!-- Visual stage -->
        <div class="hc-stage">
          <!-- Scene 1: Delivery -->
          <div class="hc-scene" :class="{ 'is-active': current === 0 }">
            <svg class="hc-svg" viewBox="0 0 720 540" preserveAspectRatio="xMidYMid meet">
              <defs>
                <radialGradient id="hcMapGlow" cx="50%" cy="50%" r="60%">
                  <stop offset="0" stop-color="#C6F432" stop-opacity=".30" />
                  <stop offset="1" stop-color="#05070A" stop-opacity="0" />
                </radialGradient>
                <linearGradient id="hcRouteGrad" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stop-color="#C6F432" stop-opacity=".2" />
                  <stop offset=".5" stop-color="#C6F432" />
                  <stop offset="1" stop-color="#C6F432" stop-opacity=".2" />
                </linearGradient>
                <filter id="hcGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" />
                </filter>
              </defs>
              <circle cx="360" cy="270" r="220" fill="url(#hcMapGlow)" />
              <g fill="rgba(198,244,50,0.06)" stroke="rgba(198,244,50,0.40)" stroke-width="1.2">
                <path class="anim-draw" style="--len:1400" d="M180,180 Q220,140 290,150 Q360,150 420,130 Q510,120 560,160 Q610,210 600,280 Q610,360 540,400 Q470,440 380,440 Q280,430 230,400 Q170,360 170,290 Q170,220 180,180Z" />
              </g>
              <g>
                <circle cx="380" cy="180" r="3" fill="rgba(198,244,50,0.5)" />
                <circle cx="430" cy="220" r="3" fill="rgba(198,244,50,0.5)" />
                <circle cx="320" cy="250" r="3" fill="rgba(198,244,50,0.5)" />
                <circle cx="500" cy="280" r="3" fill="rgba(198,244,50,0.5)" />
                <circle cx="260" cy="310" r="3" fill="rgba(198,244,50,0.5)" />
                <circle cx="450" cy="350" r="3" fill="rgba(198,244,50,0.5)" />
                <circle cx="350" cy="380" r="3" fill="rgba(198,244,50,0.5)" />
              </g>
              <path stroke="url(#hcRouteGrad)" stroke-width="2.6" fill="none"
                d="M210,400 C 260,330 280,260 360,230 C 440,200 510,250 560,200"
                filter="url(#hcGlow)" class="anim-draw anim-flow" style="--len:900" />
              <path stroke="rgba(198,244,50,0.4)" stroke-width="1.2" stroke-dasharray="3 5" fill="none"
                d="M210,400 C 320,420 420,400 510,360 C 560,330 590,300 600,260" class="anim-draw" style="--len:700" />
              <g class="anim-lift">
                <circle cx="210" cy="400" r="9" fill="#C6F432" filter="url(#hcGlow)" />
                <circle cx="210" cy="400" r="18" fill="none" stroke="#C6F432" stroke-width="1.2" class="anim-ping" />
                <text x="190" y="430" class="hc-lbl">hub · 01</text>
              </g>
              <g>
                <circle cx="560" cy="200" r="8" fill="#C6F432" />
                <circle cx="560" cy="200" r="16" fill="none" stroke="#C6F432" stroke-width="1.2" class="anim-ping" style="animation-delay:.6s" />
                <text x="540" y="185" class="hc-lbl">hub · 02</text>
              </g>
              <g>
                <circle cx="600" cy="260" r="6" fill="#9FD41A" />
                <circle cx="600" cy="260" r="13" fill="none" stroke="#9FD41A" stroke-width="1" class="anim-ping" style="animation-delay:1.1s" />
                <text x="582" y="285" class="hc-lbl">hub · 03</text>
              </g>
              <g class="anim-ride anim-glow" style="--route:'M210,400 C 260,330 280,260 360,230 C 440,200 510,250 560,200'">
                <g transform="translate(-14,-9)">
                  <rect x="0" y="0" width="24" height="14" rx="2" fill="#0A1014" stroke="#C6F432" stroke-width="1.4" />
                  <rect x="16" y="3" width="10" height="11" rx="1.5" fill="#C6F432" />
                  <circle cx="6" cy="15" r="2.5" fill="#05070A" stroke="#C6F432" stroke-width="1" />
                  <circle cx="20" cy="15" r="2.5" fill="#05070A" stroke="#C6F432" stroke-width="1" />
                </g>
              </g>
              <!-- ambient drift particles -->
              <g filter="url(#hcGlow)" opacity=".55">
                <circle r="1.4" fill="#C6F432"><animateMotion dur="9s" repeatCount="indefinite" path="M120,460 Q300,360 200,120" /></circle>
                <circle r="1.2" fill="#9FD41A"><animateMotion dur="11s" begin="-3s" repeatCount="indefinite" path="M620,440 Q500,300 580,80" /></circle>
                <circle r="1.6" fill="#C6F432"><animateMotion dur="7.5s" begin="-2s" repeatCount="indefinite" path="M80,300 Q160,180 240,80" /></circle>
              </g>
            </svg>
            <div class="hc-fcard d1" style="right:5%;top:14%;width:200px">
              <h4>Order · live</h4>
              <div class="big neon">ETA 14 min</div>
              <div class="row" style="margin-top:8px"><span>Express carrier</span><span class="pill">live</span></div>
              <div class="row"><span>Status</span><span class="mono neon">in transit</span></div>
            </div>
            <div class="hc-fcard d2" style="left:3%;bottom:9%;width:220px">
              <h4>On-time · 30d</h4>
              <div class="big">98.7<span class="mono" style="font-size:14px;color:var(--m-text-dim)">%</span></div>
              <div class="row"><span>Deliveries tracked</span><span class="mono neon">▲ 2.1%</span></div>
            </div>
          </div>

          <!-- Scene 2: Advanced Inventory Control -->
          <div class="hc-scene" :class="{ 'is-active': current === 1 }">
            <svg class="hc-svg" viewBox="0 0 720 540" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="hcStockBar" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stop-color="#9FD41A" />
                  <stop offset="1" stop-color="#C6F432" />
                </linearGradient>
                <linearGradient id="hcStockPanelBg" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stop-color="#0A1014" />
                  <stop offset="1" stop-color="#05070A" />
                </linearGradient>
              </defs>

              <!-- subtle background grid -->
              <g stroke="rgba(198,244,50,0.05)" stroke-width="0.6" fill="none">
                <path d="M0,140 L720,140" /><path d="M0,280 L720,280" /><path d="M0,420 L720,420" />
                <path d="M180,0 L180,540" /><path d="M360,0 L360,540" /><path d="M540,0 L540,540" />
              </g>

              <!-- ───── MAIN: SKU REGISTRY ───── -->
              <g transform="translate(80,80)">
                <rect x="0" y="0" width="460" height="340" rx="14" fill="url(#hcStockPanelBg)" stroke="rgba(198,244,50,0.30)" stroke-width="1.2" filter="url(#hcGlow)" />
                <!-- Header -->
                <rect x="0" y="0" width="460" height="32" rx="14" fill="rgba(198,244,50,0.08)" />
                <rect x="0" y="20" width="460" height="12" fill="rgba(198,244,50,0.08)" />
                <text x="14" y="20" class="hc-lbl" style="fill:#C6F432;font-size:9px;letter-spacing:.20em">SKU REGISTRY · LIVE</text>
                <circle cx="160" cy="16" r="3" fill="#C6F432" filter="url(#hcGlow)" class="anim-blink" />
                <text x="446" y="20" text-anchor="end" class="hc-mono" style="fill:#C6F432;font-size:9px">14:32:08</text>
                <line x1="0" y1="32" x2="460" y2="32" stroke="rgba(198,244,50,0.30)" />

                <!-- Column headers -->
                <g transform="translate(14,46)">
                  <text class="hc-mono" style="font-size:7px;fill:rgba(198,244,50,0.6);letter-spacing:.20em">SKU</text>
                  <text x="76" class="hc-mono" style="font-size:7px;fill:rgba(198,244,50,0.6);letter-spacing:.20em">PRODUCT</text>
                  <text x="206" class="hc-mono" style="font-size:7px;fill:rgba(198,244,50,0.6);letter-spacing:.20em">VARIANTS</text>
                  <text x="300" class="hc-mono" style="font-size:7px;fill:rgba(198,244,50,0.6);letter-spacing:.20em">STOCK · REORDER</text>
                  <text x="432" text-anchor="end" class="hc-mono" style="font-size:7px;fill:rgba(198,244,50,0.6);letter-spacing:.20em">STATUS</text>
                </g>
                <line x1="14" y1="50" x2="446" y2="50" stroke="rgba(198,244,50,0.15)" />

                <!-- Row 1: SKU-A1 Aurora Tee · healthy -->
                <g transform="translate(14,56)" class="anim-drop" style="animation-delay:.2s">
                  <rect x="0" y="0" width="432" height="44" rx="6" fill="rgba(198,244,50,0.04)" />
                  <text x="6" y="18" class="hc-mono" style="fill:#C6F432;font-size:10px;font-weight:600">SKU-A1</text>
                  <text x="6" y="34" class="hc-mono" style="font-size:7px;fill:rgba(198,244,50,0.5);letter-spacing:.10em">·active·</text>
                  <text x="76" y="18" class="hc-dz" style="fill:#E7ECEE;font-size:11px;font-weight:500">Aurora Tee</text>
                  <text x="76" y="32" class="hc-dz" style="font-size:8px;fill:rgba(231,236,238,0.45)">Apparel</text>
                  <g transform="translate(206,12)">
                    <rect x="0"  y="0" width="16" height="16" rx="3" fill="rgba(198,244,50,0.16)" stroke="#C6F432" stroke-width="0.6" />
                    <text x="8"  y="11" text-anchor="middle" class="hc-mono" style="fill:#C6F432;font-size:7px">S</text>
                    <rect x="20" y="0" width="16" height="16" rx="3" fill="rgba(198,244,50,0.30)" stroke="#C6F432" stroke-width="0.6" />
                    <text x="28" y="11" text-anchor="middle" class="hc-mono" style="fill:#C6F432;font-size:7px">M</text>
                    <rect x="40" y="0" width="16" height="16" rx="3" fill="rgba(198,244,50,0.16)" stroke="#C6F432" stroke-width="0.6" />
                    <text x="48" y="11" text-anchor="middle" class="hc-mono" style="fill:#C6F432;font-size:7px">L</text>
                  </g>
                  <g transform="translate(300,22)">
                    <rect x="0" y="0" width="90" height="6" rx="3" fill="rgba(198,244,50,0.08)" />
                    <rect x="0" y="0" width="76" height="6" rx="3" fill="url(#hcStockBar)" filter="url(#hcGlow)" />
                    <line x1="22" y1="-3" x2="22" y2="9" stroke="rgba(231,236,238,0.45)" stroke-width="0.7" stroke-dasharray="1.2 1.2" />
                  </g>
                  <text x="300" y="38" class="hc-mono" style="font-size:7px;fill:rgba(231,236,238,0.4);letter-spacing:.10em">142 · reorder@40</text>
                  <circle cx="396" cy="16" r="2.6" fill="#C6F432" filter="url(#hcGlow)" />
                  <text x="402" y="19" class="hc-mono" style="fill:#C6F432;font-size:7px;font-weight:600;letter-spacing:.18em">HEALTHY</text>
                </g>

                <!-- Row 2: SKU-B2 Cosmo Hoodie · low -->
                <g transform="translate(14,106)" class="anim-drop" style="animation-delay:.35s">
                  <rect x="0" y="0" width="432" height="44" rx="6" fill="rgba(159,212,26,0.06)" stroke="rgba(159,212,26,0.20)" stroke-width="0.6" />
                  <text x="6" y="18" class="hc-mono" style="fill:#9FD41A;font-size:10px;font-weight:600">SKU-B2</text>
                  <text x="6" y="34" class="hc-mono" style="font-size:7px;fill:rgba(159,212,26,0.55);letter-spacing:.10em">·active·</text>
                  <text x="76" y="18" class="hc-dz" style="fill:#E7ECEE;font-size:11px;font-weight:500">Cosmo Hoodie</text>
                  <text x="76" y="32" class="hc-dz" style="font-size:8px;fill:rgba(231,236,238,0.45)">Apparel</text>
                  <g transform="translate(206,12)">
                    <rect x="0"  y="0" width="16" height="16" rx="3" fill="rgba(198,244,50,0.16)" stroke="#C6F432" stroke-width="0.6" />
                    <text x="8"  y="11" text-anchor="middle" class="hc-mono" style="fill:#C6F432;font-size:7px">M</text>
                    <rect x="20" y="0" width="16" height="16" rx="3" fill="rgba(198,244,50,0.16)" stroke="#C6F432" stroke-width="0.6" />
                    <text x="28" y="11" text-anchor="middle" class="hc-mono" style="fill:#C6F432;font-size:7px">L</text>
                  </g>
                  <g transform="translate(300,22)">
                    <rect x="0" y="0" width="90" height="6" rx="3" fill="rgba(159,212,26,0.10)" />
                    <rect x="0" y="0" width="26" height="6" rx="3" fill="#9FD41A" filter="url(#hcGlow)" class="anim-blink" />
                    <line x1="22" y1="-3" x2="22" y2="9" stroke="rgba(231,236,238,0.55)" stroke-width="0.7" stroke-dasharray="1.2 1.2" />
                  </g>
                  <text x="300" y="38" class="hc-mono" style="font-size:7px;fill:rgba(159,212,26,0.7);letter-spacing:.10em">48 · reorder@40</text>
                  <g class="anim-blink">
                    <path d="M393,18 L396,12 L399,18 Z" fill="#9FD41A" />
                    <text x="402" y="19" class="hc-mono" style="fill:#9FD41A;font-size:7px;font-weight:600;letter-spacing:.18em">LOW</text>
                  </g>
                </g>

                <!-- Row 3: SKU-C3 Nova Pant · healthy -->
                <g transform="translate(14,156)" class="anim-drop" style="animation-delay:.5s">
                  <rect x="0" y="0" width="432" height="44" rx="6" fill="rgba(198,244,50,0.04)" />
                  <text x="6" y="18" class="hc-mono" style="fill:#C6F432;font-size:10px;font-weight:600">SKU-C3</text>
                  <text x="6" y="34" class="hc-mono" style="font-size:7px;fill:rgba(198,244,50,0.5);letter-spacing:.10em">·active·</text>
                  <text x="76" y="18" class="hc-dz" style="fill:#E7ECEE;font-size:11px;font-weight:500">Nova Pant</text>
                  <text x="76" y="32" class="hc-dz" style="font-size:8px;fill:rgba(231,236,238,0.45)">Apparel · 3 batches</text>
                  <g transform="translate(206,12)">
                    <rect x="0"  y="0" width="16" height="16" rx="3" fill="rgba(198,244,50,0.16)" stroke="#C6F432" stroke-width="0.6" />
                    <text x="8"  y="11" text-anchor="middle" class="hc-mono" style="fill:#C6F432;font-size:7px">S</text>
                    <rect x="20" y="0" width="16" height="16" rx="3" fill="rgba(198,244,50,0.30)" stroke="#C6F432" stroke-width="0.6" />
                    <text x="28" y="11" text-anchor="middle" class="hc-mono" style="fill:#C6F432;font-size:7px">M</text>
                    <rect x="40" y="0" width="16" height="16" rx="3" fill="rgba(198,244,50,0.16)" stroke="#C6F432" stroke-width="0.6" />
                    <text x="48" y="11" text-anchor="middle" class="hc-mono" style="fill:#C6F432;font-size:7px">L</text>
                    <rect x="60" y="0" width="16" height="16" rx="3" fill="rgba(198,244,50,0.16)" stroke="#C6F432" stroke-width="0.6" />
                    <text x="68" y="11" text-anchor="middle" class="hc-mono" style="fill:#C6F432;font-size:7px">XL</text>
                  </g>
                  <g transform="translate(300,22)">
                    <rect x="0" y="0" width="90" height="6" rx="3" fill="rgba(198,244,50,0.08)" />
                    <rect x="0" y="0" width="86" height="6" rx="3" fill="url(#hcStockBar)" filter="url(#hcGlow)" />
                    <line x1="22" y1="-3" x2="22" y2="9" stroke="rgba(231,236,238,0.45)" stroke-width="0.7" stroke-dasharray="1.2 1.2" />
                  </g>
                  <text x="300" y="38" class="hc-mono" style="font-size:7px;fill:rgba(231,236,238,0.4);letter-spacing:.10em">287 · reorder@40</text>
                  <circle cx="396" cy="16" r="2.6" fill="#C6F432" filter="url(#hcGlow)" />
                  <text x="402" y="19" class="hc-mono" style="fill:#C6F432;font-size:7px;font-weight:600;letter-spacing:.18em">HEALTHY</text>
                </g>

                <!-- Row 4: SKU-D4 Lunar Cap · restock -->
                <g transform="translate(14,206)" class="anim-drop" style="animation-delay:.65s">
                  <rect x="0" y="0" width="432" height="44" rx="6" fill="rgba(198,244,50,0.025)" stroke="rgba(198,244,50,0.18)" stroke-width="0.6" stroke-dasharray="2 2" />
                  <text x="6" y="18" class="hc-mono" style="fill:rgba(198,244,50,0.55);font-size:10px;font-weight:600">SKU-D4</text>
                  <text x="6" y="34" class="hc-mono" style="font-size:7px;fill:rgba(198,244,50,0.40);letter-spacing:.10em">·critical·</text>
                  <text x="76" y="18" class="hc-dz" style="fill:#E7ECEE;font-size:11px;font-weight:500">Lunar Cap</text>
                  <text x="76" y="32" class="hc-dz" style="font-size:8px;fill:rgba(231,236,238,0.45)">Accessories</text>
                  <g transform="translate(206,12)">
                    <rect x="0" y="0" width="16" height="16" rx="3" fill="rgba(198,244,50,0.08)" stroke="rgba(198,244,50,0.40)" stroke-width="0.6" stroke-dasharray="1.2 1.2" />
                    <text x="8" y="11" text-anchor="middle" class="hc-mono" style="fill:rgba(198,244,50,0.6);font-size:8px">·</text>
                  </g>
                  <g transform="translate(300,22)">
                    <rect x="0" y="0" width="90" height="6" rx="3" fill="rgba(198,244,50,0.06)" />
                    <rect x="0" y="0" width="8" height="6" rx="3" fill="rgba(198,244,50,0.50)" filter="url(#hcGlow)" class="anim-blink" style="animation-duration:.9s" />
                    <line x1="22" y1="-3" x2="22" y2="9" stroke="rgba(231,236,238,0.55)" stroke-width="0.7" stroke-dasharray="1.2 1.2" />
                  </g>
                  <text x="300" y="38" class="hc-mono" style="font-size:7px;fill:rgba(198,244,50,0.55);letter-spacing:.10em">12 · reorder@40</text>
                  <g class="anim-blink" style="animation-duration:.9s">
                    <g stroke="rgba(198,244,50,0.65)" stroke-width="1.4" fill="none" stroke-linecap="round">
                      <line x1="392" y1="13" x2="398" y2="19" />
                      <line x1="398" y1="13" x2="392" y2="19" />
                    </g>
                    <text x="402" y="19" class="hc-mono" style="fill:rgba(198,244,50,0.65);font-size:7px;font-weight:600;letter-spacing:.18em">RESTOCK</text>
                  </g>
                </g>

                <!-- Row 5: SKU-E5 Solar Sock · healthy -->
                <g transform="translate(14,256)" class="anim-drop" style="animation-delay:.8s">
                  <rect x="0" y="0" width="432" height="44" rx="6" fill="rgba(198,244,50,0.04)" />
                  <text x="6" y="18" class="hc-mono" style="fill:#C6F432;font-size:10px;font-weight:600">SKU-E5</text>
                  <text x="6" y="34" class="hc-mono" style="font-size:7px;fill:rgba(198,244,50,0.5);letter-spacing:.10em">·active·</text>
                  <text x="76" y="18" class="hc-dz" style="fill:#E7ECEE;font-size:11px;font-weight:500">Solar Sock</text>
                  <text x="76" y="32" class="hc-dz" style="font-size:8px;fill:rgba(231,236,238,0.45)">Apparel · batch:2</text>
                  <g transform="translate(206,12)">
                    <rect x="0"  y="0" width="16" height="16" rx="3" fill="rgba(198,244,50,0.16)" stroke="#C6F432" stroke-width="0.6" />
                    <text x="8"  y="11" text-anchor="middle" class="hc-mono" style="fill:#C6F432;font-size:7px">S</text>
                    <rect x="20" y="0" width="16" height="16" rx="3" fill="rgba(198,244,50,0.30)" stroke="#C6F432" stroke-width="0.6" />
                    <text x="28" y="11" text-anchor="middle" class="hc-mono" style="fill:#C6F432;font-size:7px">M</text>
                  </g>
                  <g transform="translate(300,22)">
                    <rect x="0" y="0" width="90" height="6" rx="3" fill="rgba(198,244,50,0.08)" />
                    <rect x="0" y="0" width="68" height="6" rx="3" fill="url(#hcStockBar)" filter="url(#hcGlow)" />
                    <line x1="22" y1="-3" x2="22" y2="9" stroke="rgba(231,236,238,0.45)" stroke-width="0.7" stroke-dasharray="1.2 1.2" />
                  </g>
                  <text x="300" y="38" class="hc-mono" style="font-size:7px;fill:rgba(231,236,238,0.4);letter-spacing:.10em">198 · reorder@40</text>
                  <circle cx="396" cy="16" r="2.6" fill="#C6F432" filter="url(#hcGlow)" />
                  <text x="402" y="19" class="hc-mono" style="fill:#C6F432;font-size:7px;font-weight:600;letter-spacing:.18em">HEALTHY</text>
                </g>

                <!-- Footer summary chips -->
                <line x1="14" y1="312" x2="446" y2="312" stroke="rgba(198,244,50,0.20)" />
                <g transform="translate(14,322)" class="anim-drop" style="animation-delay:.95s">
                  <text x="0"   y="10" class="hc-mono" style="font-size:7px;fill:rgba(231,236,238,0.45);letter-spacing:.14em">PURCHASES ·</text>
                  <text x="60"  y="10" class="hc-mono" style="font-size:9px;fill:#C6F432;letter-spacing:.10em">3</text>
                  <text x="86"  y="10" class="hc-mono" style="font-size:7px;fill:rgba(231,236,238,0.45);letter-spacing:.14em">SUPPLIERS ·</text>
                  <text x="146" y="10" class="hc-mono" style="font-size:9px;fill:#C6F432;letter-spacing:.10em">8</text>
                  <text x="172" y="10" class="hc-mono" style="font-size:7px;fill:rgba(231,236,238,0.45);letter-spacing:.14em">BATCHES ·</text>
                  <text x="222" y="10" class="hc-mono" style="font-size:9px;fill:#C6F432;letter-spacing:.10em">12</text>
                  <text x="252" y="10" class="hc-mono" style="font-size:7px;fill:rgba(231,236,238,0.45);letter-spacing:.14em">AUDITS ·</text>
                  <text x="296" y="10" class="hc-mono" style="font-size:9px;fill:#C6F432;letter-spacing:.10em">Q4-26</text>
                  <text x="432" y="10" text-anchor="end" class="hc-mono" style="font-size:7px;fill:rgba(198,244,50,0.7);letter-spacing:.14em">↑ 4.2% / 7d</text>
                </g>
              </g>

              <!-- ───── TOP-RIGHT: STOCK HEALTH GAUGE ───── -->
              <g transform="translate(555,80)">
                <rect x="0" y="0" width="145" height="120" rx="12" fill="url(#hcStockPanelBg)" stroke="rgba(198,244,50,0.25)" stroke-width="1" filter="url(#hcGlow)" />
                <text x="14" y="20" class="hc-lbl" style="fill:#C6F432;font-size:8px;letter-spacing:.20em">STOCK HEALTH</text>
                <line x1="0" y1="28" x2="145" y2="28" stroke="rgba(198,244,50,0.20)" />
                <g transform="translate(72,72)">
                  <circle r="32" fill="none" stroke="rgba(198,244,50,0.10)" stroke-width="4" />
                  <circle r="32" fill="none" stroke="#C6F432" stroke-width="4" stroke-linecap="round"
                          transform="rotate(-90)" filter="url(#hcGlow)" stroke-dasharray="0 201">
                    <animate attributeName="stroke-dasharray" from="0 201" to="185 201" dur="1.6s" begin="0.4s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".2 .8 .2 1" />
                  </circle>
                  <text y="3" text-anchor="middle" class="hc-mono" style="fill:#E7ECEE;font-size:22px;font-weight:600">92</text>
                  <text y="14" text-anchor="middle" class="hc-mono" style="font-size:7px;fill:rgba(198,244,50,0.6);letter-spacing:.20em">% HEALTHY</text>
                </g>
                <text x="72" y="110" text-anchor="middle" class="hc-mono" style="font-size:7px;fill:rgba(231,236,238,0.5);letter-spacing:.10em">↑ 4.2 vs last week</text>
              </g>

              <!-- ───── MID-RIGHT: MOVEMENTS · 24H ───── -->
              <g transform="translate(555,212)">
                <rect x="0" y="0" width="145" height="110" rx="12" fill="url(#hcStockPanelBg)" stroke="rgba(198,244,50,0.25)" stroke-width="1" filter="url(#hcGlow)" />
                <text x="14" y="20" class="hc-lbl" style="fill:#C6F432;font-size:8px;letter-spacing:.20em">MOVEMENTS · 24H</text>
                <line x1="0" y1="28" x2="145" y2="28" stroke="rgba(198,244,50,0.20)" />
                <g transform="translate(11,38)">
                  <line x1="0" y1="28" x2="124" y2="28" stroke="rgba(198,244,50,0.30)" stroke-width="0.6" />
                  <g fill="url(#hcStockBar)" filter="url(#hcGlow)">
                    <rect x="0"   y="16" width="6" height="12" class="anim-bar" />
                    <rect x="11"  y="10" width="6" height="18" class="anim-bar" style="animation-delay:.1s" />
                    <rect x="22"  y="4"  width="6" height="24" class="anim-bar" style="animation-delay:.2s" />
                    <rect x="33"  y="14" width="6" height="14" class="anim-bar" style="animation-delay:.3s" />
                    <rect x="44"  y="8"  width="6" height="20" class="anim-bar" style="animation-delay:.4s" />
                    <rect x="55"  y="2"  width="6" height="26" class="anim-bar" style="animation-delay:.5s" />
                    <rect x="66"  y="12" width="6" height="16" class="anim-bar" style="animation-delay:.6s" />
                    <rect x="77"  y="6"  width="6" height="22" class="anim-bar" style="animation-delay:.7s" />
                    <rect x="88"  y="18" width="6" height="10" class="anim-bar" style="animation-delay:.8s" />
                    <rect x="99"  y="10" width="6" height="18" class="anim-bar" style="animation-delay:.9s" />
                    <rect x="110" y="4"  width="6" height="24" class="anim-bar" style="animation-delay:1s" />
                  </g>
                  <g fill="rgba(159,212,26,0.55)">
                    <rect x="0"   y="28" width="6" height="8"  class="anim-bar" style="animation-delay:.15s" />
                    <rect x="11"  y="28" width="6" height="12" class="anim-bar" style="animation-delay:.25s" />
                    <rect x="22"  y="28" width="6" height="6"  class="anim-bar" style="animation-delay:.35s" />
                    <rect x="33"  y="28" width="6" height="10" class="anim-bar" style="animation-delay:.45s" />
                    <rect x="44"  y="28" width="6" height="14" class="anim-bar" style="animation-delay:.55s" />
                    <rect x="55"  y="28" width="6" height="8"  class="anim-bar" style="animation-delay:.65s" />
                    <rect x="66"  y="28" width="6" height="12" class="anim-bar" style="animation-delay:.75s" />
                    <rect x="77"  y="28" width="6" height="6"  class="anim-bar" style="animation-delay:.85s" />
                    <rect x="88"  y="28" width="6" height="10" class="anim-bar" style="animation-delay:.95s" />
                    <rect x="99"  y="28" width="6" height="14" class="anim-bar" style="animation-delay:1.05s" />
                    <rect x="110" y="28" width="6" height="8"  class="anim-bar" style="animation-delay:1.15s" />
                  </g>
                </g>
                <text x="14"  y="96" class="hc-mono" style="font-size:7px;fill:#C6F432;letter-spacing:.10em">↑ 1,248 in</text>
                <text x="131" y="96" text-anchor="end" class="hc-mono" style="font-size:7px;fill:rgba(159,212,26,0.8);letter-spacing:.10em">↓ 982 out</text>
              </g>

              <!-- ───── BOTTOM-RIGHT: ALERTS ───── -->
              <g transform="translate(555,334)">
                <rect x="0" y="0" width="145" height="86" rx="12" fill="url(#hcStockPanelBg)" stroke="rgba(198,244,50,0.25)" stroke-width="1" filter="url(#hcGlow)" />
                <text x="14" y="20" class="hc-lbl" style="fill:#C6F432;font-size:8px;letter-spacing:.20em">ALERTS</text>
                <circle cx="60" cy="16" r="2.6" fill="#9FD41A" filter="url(#hcGlow)" class="anim-blink" />
                <text x="131" y="20" text-anchor="end" class="hc-mono" style="fill:#C6F432;font-size:10px;font-weight:600">2</text>
                <line x1="0" y1="28" x2="145" y2="28" stroke="rgba(198,244,50,0.20)" />
                <g transform="translate(10,36)" class="anim-drop" style="animation-delay:.7s">
                  <rect x="0" y="0" width="125" height="20" rx="4" fill="rgba(159,212,26,0.08)" stroke="rgba(159,212,26,0.35)" stroke-width="0.6" />
                  <path d="M5,6 L8,12 L11,6 Z" fill="#9FD41A" class="anim-blink" />
                  <text x="16" y="13" class="hc-mono" style="fill:#9FD41A;font-size:8px;letter-spacing:.10em">SKU-B2 · 48</text>
                  <text x="121" y="13" text-anchor="end" class="hc-mono" style="fill:#C6F432;font-size:7px;letter-spacing:.18em">QUEUE</text>
                </g>
                <g transform="translate(10,60)" class="anim-drop" style="animation-delay:.85s">
                  <rect x="0" y="0" width="125" height="20" rx="4" fill="rgba(198,244,50,0.04)" stroke="rgba(198,244,50,0.30)" stroke-width="0.6" stroke-dasharray="2 2" />
                  <g stroke="rgba(198,244,50,0.65)" stroke-width="1.2" fill="none" stroke-linecap="round" class="anim-blink" style="animation-duration:.9s">
                    <line x1="5"  y1="6" x2="11" y2="12" />
                    <line x1="11" y1="6" x2="5"  y2="12" />
                  </g>
                  <text x="16" y="13" class="hc-mono" style="fill:rgba(198,244,50,0.75);font-size:8px;letter-spacing:.10em">SKU-D4 · 12</text>
                  <text x="121" y="13" text-anchor="end" class="hc-mono" style="fill:#C6F432;font-size:7px;letter-spacing:.18em">QUEUE</text>
                </g>
              </g>

              <!-- ───── BOTTOM: BARCODE LIVE SCAN ───── -->
              <g transform="translate(80,444)">
                <rect x="0" y="0" width="460" height="60" rx="10" fill="url(#hcStockPanelBg)" stroke="rgba(198,244,50,0.25)" stroke-width="1" filter="url(#hcGlow)" />
                <text x="14" y="18" class="hc-lbl" style="fill:#C6F432;font-size:8px;letter-spacing:.20em">BARCODE · LIVE SCAN</text>
                <text x="446" y="18" text-anchor="end" class="hc-mono" style="fill:#C6F432;font-size:8px">SCANS · 1,284 / 24H</text>
                <line x1="0" y1="22" x2="460" y2="22" stroke="rgba(198,244,50,0.20)" />
                <g transform="translate(14,28)" fill="#C6F432">
                  <rect x="0"   y="0" width="2" height="24" /><rect x="4"   y="0" width="1" height="24" />
                  <rect x="7"   y="0" width="3" height="24" /><rect x="12"  y="0" width="1" height="24" />
                  <rect x="15"  y="0" width="2" height="24" /><rect x="19"  y="0" width="1" height="24" />
                  <rect x="22"  y="0" width="2" height="24" /><rect x="26"  y="0" width="3" height="24" />
                  <rect x="31"  y="0" width="1" height="24" /><rect x="34"  y="0" width="2" height="24" />
                  <rect x="38"  y="0" width="2" height="24" /><rect x="42"  y="0" width="1" height="24" />
                  <rect x="45"  y="0" width="3" height="24" /><rect x="50"  y="0" width="2" height="24" />
                  <rect x="54"  y="0" width="1" height="24" /><rect x="57"  y="0" width="2" height="24" />
                  <rect x="61"  y="0" width="2" height="24" /><rect x="65"  y="0" width="1" height="24" />
                  <rect x="68"  y="0" width="3" height="24" /><rect x="73"  y="0" width="2" height="24" />
                  <rect x="77"  y="0" width="1" height="24" /><rect x="80"  y="0" width="2" height="24" />
                  <rect x="84"  y="0" width="3" height="24" /><rect x="89"  y="0" width="1" height="24" />
                  <rect x="92"  y="0" width="2" height="24" /><rect x="96"  y="0" width="1" height="24" />
                  <rect x="99"  y="0" width="2" height="24" /><rect x="103" y="0" width="1" height="24" />
                  <rect x="106" y="0" width="3" height="24" /><rect x="111" y="0" width="2" height="24" />
                  <rect x="115" y="0" width="1" height="24" /><rect x="118" y="0" width="2" height="24" />
                  <rect x="122" y="0" width="2" height="24" /><rect x="126" y="0" width="1" height="24" />
                  <rect x="129" y="0" width="3" height="24" /><rect x="134" y="0" width="2" height="24" />
                  <rect x="138" y="0" width="1" height="24" /><rect x="141" y="0" width="2" height="24" />
                  <rect x="145" y="0" width="3" height="24" /><rect x="150" y="0" width="1" height="24" />
                  <rect x="153" y="0" width="2" height="24" /><rect x="157" y="0" width="1" height="24" />
                  <rect x="160" y="0" width="2" height="24" /><rect x="164" y="0" width="3" height="24" />
                  <rect x="169" y="0" width="1" height="24" /><rect x="172" y="0" width="2" height="24" />
                  <rect x="176" y="0" width="2" height="24" /><rect x="180" y="0" width="1" height="24" />
                  <rect x="183" y="0" width="3" height="24" /><rect x="188" y="0" width="2" height="24" />
                  <rect x="192" y="0" width="1" height="24" /><rect x="195" y="0" width="2" height="24" />
                  <rect x="199" y="0" width="2" height="24" /><rect x="203" y="0" width="1" height="24" />
                  <rect x="206" y="0" width="3" height="24" /><rect x="211" y="0" width="2" height="24" />
                  <rect x="215" y="0" width="1" height="24" /><rect x="218" y="0" width="2" height="24" />
                  <rect x="222" y="0" width="3" height="24" /><rect x="227" y="0" width="1" height="24" />
                  <rect x="230" y="0" width="2" height="24" /><rect x="234" y="0" width="1" height="24" />
                  <rect x="237" y="0" width="2" height="24" /><rect x="241" y="0" width="2" height="24" />
                  <rect x="245" y="0" width="1" height="24" /><rect x="248" y="0" width="3" height="24" />
                  <rect x="253" y="0" width="2" height="24" /><rect x="257" y="0" width="1" height="24" />
                  <rect x="260" y="0" width="2" height="24" /><rect x="264" y="0" width="2" height="24" />
                  <rect x="268" y="0" width="1" height="24" /><rect x="271" y="0" width="3" height="24" />
                  <rect x="276" y="0" width="2" height="24" /><rect x="280" y="0" width="1" height="24" />
                  <rect x="283" y="0" width="2" height="24" /><rect x="287" y="0" width="3" height="24" />
                  <rect x="292" y="0" width="1" height="24" /><rect x="295" y="0" width="2" height="24" />
                  <rect x="299" y="0" width="2" height="24" /><rect x="303" y="0" width="1" height="24" />
                  <rect x="306" y="0" width="3" height="24" /><rect x="311" y="0" width="2" height="24" />
                  <rect x="315" y="0" width="1" height="24" /><rect x="318" y="0" width="2" height="24" />
                  <rect x="322" y="0" width="2" height="24" /><rect x="326" y="0" width="1" height="24" />
                  <rect x="329" y="0" width="3" height="24" /><rect x="334" y="0" width="2" height="24" />
                  <rect x="338" y="0" width="1" height="24" /><rect x="341" y="0" width="2" height="24" />
                  <rect x="345" y="0" width="3" height="24" /><rect x="350" y="0" width="1" height="24" />
                  <rect x="353" y="0" width="2" height="24" /><rect x="357" y="0" width="1" height="24" />
                  <rect x="360" y="0" width="2" height="24" /><rect x="364" y="0" width="3" height="24" />
                  <rect x="369" y="0" width="1" height="24" /><rect x="372" y="0" width="2" height="24" />
                  <rect x="376" y="0" width="2" height="24" /><rect x="380" y="0" width="1" height="24" />
                  <rect x="383" y="0" width="3" height="24" /><rect x="388" y="0" width="2" height="24" />
                  <rect x="392" y="0" width="1" height="24" /><rect x="395" y="0" width="2" height="24" />
                  <rect x="399" y="0" width="2" height="24" /><rect x="403" y="0" width="1" height="24" />
                  <rect x="406" y="0" width="3" height="24" /><rect x="411" y="0" width="2" height="24" />
                  <rect x="415" y="0" width="1" height="24" /><rect x="418" y="0" width="2" height="24" />
                  <rect x="422" y="0" width="3" height="24" /><rect x="427" y="0" width="2" height="24" />
                </g>
                <!-- Sweeping scan beam (glow halo + sharp line) -->
                <rect y="26" width="16" height="28" fill="url(#hcStockBar)" opacity="0.22">
                  <animate attributeName="x" values="6;438;6" dur="3.4s" repeatCount="indefinite" />
                </rect>
                <rect y="26" width="2.4" height="28" fill="#C6F432" filter="url(#hcGlow)" opacity="0.9">
                  <animate attributeName="x" values="13;446;13" dur="3.4s" repeatCount="indefinite" />
                </rect>
              </g>

              <!-- Sweeping data scanline -->
              <g class="hc-scan-laser" filter="url(#hcGlow)">
                <line x1="0" y1="0" x2="0" y2="540" stroke="#C6F432" stroke-width="1.4" opacity=".5" />
                <line x1="0" y1="0" x2="0" y2="540" stroke="#C6F432" stroke-width="3" opacity=".2" />
              </g>

              <!-- Ambient data threads between panels -->
              <g filter="url(#hcGlow)" opacity=".55">
                <circle r="1.4" fill="#C6F432"><animateMotion dur="6s" repeatCount="indefinite" path="M540,140 Q580,200 555,280" /></circle>
                <circle r="1.2" fill="#9FD41A"><animateMotion dur="7.5s" begin="-2s" repeatCount="indefinite" path="M540,250 Q570,320 555,380" /></circle>
                <circle r="1.6" fill="#C6F432"><animateMotion dur="5s" begin="-1s" repeatCount="indefinite" path="M310,420 Q400,470 540,470" /></circle>
                <circle r="1.2" fill="#9FD41A"><animateMotion dur="6.5s" begin="-3s" repeatCount="indefinite" path="M540,300 Q500,360 310,440" /></circle>
              </g>
            </svg>
            <div class="hc-fcard d1" style="left:3%;top:8%;width:200px">
              <h4>Stock event · live</h4>
              <div class="big neon">+24 units</div>
              <div class="row" style="margin-top:8px"><span>SKU-A1 · Aurora Tee</span><span class="pill">in</span></div>
              <div class="row"><span>Batch #B-2419</span><span class="mono neon">verified</span></div>
            </div>
            <div class="hc-fcard d2" style="right:5%;bottom:10%;width:220px">
              <h4>Auto-reorder · queued</h4>
              <div class="row" style="margin-top:4px"><span>SKU-B2 · Cosmo</span><span class="mono neon">120 u</span></div>
              <div class="row"><span>SKU-D4 · Lunar</span><span class="mono neon">80 u</span></div>
              <div class="row"><span>Supplier 02</span><span class="pill">dispatched</span></div>
            </div>
          </div>

          <!-- Scene 3: Storefront Themes -->
          <div class="hc-scene hc-themes" :class="{ 'is-active': current === 2 }">
            <svg class="hc-svg" viewBox="0 0 720 540" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="hcThemeGlowA" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stop-color="#C6F432" stop-opacity=".0" />
                  <stop offset="1" stop-color="#C6F432" stop-opacity=".22" />
                </linearGradient>
                <radialGradient id="hcThemeHalo" cx="50%" cy="40%" r="55%">
                  <stop offset="0" stop-color="#C6F432" stop-opacity=".18" />
                  <stop offset="1" stop-color="#05070A" stop-opacity="0" />
                </radialGradient>
              </defs>

              <!-- soft halo behind phones -->
              <ellipse cx="360" cy="240" rx="280" ry="170" fill="url(#hcThemeHalo)" />

              <!-- ground reflection plane -->
              <ellipse cx="360" cy="470" rx="260" ry="14" fill="rgba(198,244,50,0.10)" />

              <!-- back-left ghost phone -->
              <g transform="translate(150,140) rotate(-8)" opacity=".34" class="hc-theme-ghost">
                <rect x="0" y="0" width="120" height="240" rx="20" fill="#0A1014" stroke="rgba(198,244,50,0.30)" stroke-width="1.2" />
                <rect x="8" y="10" width="104" height="220" rx="14" fill="#05070A" />
                <rect x="14" y="20" width="92" height="56" rx="6" fill="rgba(159,212,26,0.55)" />
                <rect x="14" y="84" width="44" height="44" rx="5" fill="rgba(198,244,50,0.30)" />
                <rect x="62" y="84" width="44" height="44" rx="5" fill="rgba(198,244,50,0.18)" />
                <rect x="14" y="136" width="92" height="10" rx="3" fill="rgba(255,255,255,0.10)" />
                <rect x="14" y="152" width="60" height="6" rx="2" fill="rgba(255,255,255,0.06)" />
                <rect x="14" y="206" width="92" height="20" rx="10" fill="#9FD41A" />
              </g>

              <!-- back-right ghost phone -->
              <g transform="translate(450,140) rotate(8)" opacity=".34" class="hc-theme-ghost hc-theme-ghost--alt">
                <rect x="0" y="0" width="120" height="240" rx="20" fill="#0A1014" stroke="rgba(255,179,150,0.40)" stroke-width="1.2" />
                <rect x="8" y="10" width="104" height="220" rx="14" fill="#FFF6EE" />
                <rect x="14" y="20" width="92" height="56" rx="6" fill="#F2A488" />
                <rect x="14" y="84" width="44" height="44" rx="5" fill="#FAD3B8" />
                <rect x="62" y="84" width="44" height="44" rx="5" fill="#E07C5B" />
                <rect x="14" y="136" width="92" height="10" rx="3" fill="rgba(40,28,22,0.32)" />
                <rect x="14" y="152" width="60" height="6" rx="2" fill="rgba(40,28,22,0.20)" />
                <rect x="14" y="206" width="92" height="20" rx="10" fill="#28181C" />
              </g>

              <!-- foreground phone frame -->
              <g transform="translate(290,90)">
                <!-- chassis -->
                <rect x="-4" y="-4" width="148" height="312" rx="26" fill="#06090C" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
                <rect x="0" y="0" width="140" height="304" rx="22" fill="#0A1014" stroke="#C6F432" stroke-width="1.4" filter="url(#hcGlow)" />
                <rect x="8" y="10" width="124" height="284" rx="16" fill="#05070A" />
                <!-- notch -->
                <rect x="54" y="14" width="32" height="6" rx="3" fill="#0A1014" stroke="rgba(255,255,255,0.06)" />

                <!-- screen content, cross-fades between three palettes -->
                <g class="hc-theme hc-theme--a">
                  <rect x="14" y="28" width="112" height="66" rx="8" fill="#9FD41A" />
                  <rect x="22" y="42" width="50" height="10" rx="3" fill="#062A2A" />
                  <rect x="22" y="58" width="34" height="6" rx="2" fill="rgba(6,42,42,0.55)" />
                  <rect x="14" y="102" width="52" height="62" rx="7" fill="#C6F432" />
                  <rect x="74" y="102" width="52" height="62" rx="7" fill="rgba(198,244,50,0.22)" />
                  <rect x="14" y="172" width="112" height="8" rx="2" fill="rgba(255,255,255,0.12)" />
                  <rect x="14" y="186" width="78" height="6" rx="2" fill="rgba(255,255,255,0.06)" />
                  <rect x="14" y="202" width="68" height="6" rx="2" fill="rgba(255,255,255,0.06)" />
                  <rect x="14" y="248" width="112" height="32" rx="16" fill="#C6F432" />
                  <text x="70" y="268" text-anchor="middle" style="fill:#05070A;font-family:'Geist',sans-serif;font-size:10px;font-weight:600;letter-spacing:0.18em">ADD TO CART</text>
                </g>

                <g class="hc-theme hc-theme--b">
                  <rect x="14" y="28" width="112" height="66" rx="8" fill="#F2A488" />
                  <rect x="22" y="42" width="50" height="10" rx="3" fill="#28181C" />
                  <rect x="22" y="58" width="34" height="6" rx="2" fill="rgba(40,24,28,0.55)" />
                  <rect x="14" y="102" width="52" height="62" rx="7" fill="#FAD3B8" />
                  <rect x="74" y="102" width="52" height="62" rx="7" fill="#E07C5B" />
                  <rect x="14" y="172" width="112" height="8" rx="2" fill="rgba(40,24,28,0.32)" />
                  <rect x="14" y="186" width="78" height="6" rx="2" fill="rgba(40,24,28,0.22)" />
                  <rect x="14" y="202" width="68" height="6" rx="2" fill="rgba(40,24,28,0.22)" />
                  <rect x="14" y="248" width="112" height="32" rx="16" fill="#28181C" />
                  <text x="70" y="268" text-anchor="middle" style="fill:#FFF6EE;font-family:'Geist',sans-serif;font-size:10px;font-weight:600;letter-spacing:0.18em">ADD TO CART</text>
                </g>

                <g class="hc-theme hc-theme--c">
                  <rect x="14" y="28" width="112" height="66" rx="8" fill="#1E4B57" />
                  <rect x="22" y="42" width="50" height="10" rx="3" fill="#E7DCC4" />
                  <rect x="22" y="58" width="34" height="6" rx="2" fill="rgba(231,220,196,0.65)" />
                  <rect x="14" y="102" width="52" height="62" rx="7" fill="#E7DCC4" />
                  <rect x="74" y="102" width="52" height="62" rx="7" fill="#2A6573" />
                  <rect x="14" y="172" width="112" height="8" rx="2" fill="rgba(231,220,196,0.32)" />
                  <rect x="14" y="186" width="78" height="6" rx="2" fill="rgba(231,220,196,0.20)" />
                  <rect x="14" y="202" width="68" height="6" rx="2" fill="rgba(231,220,196,0.20)" />
                  <rect x="14" y="248" width="112" height="32" rx="16" fill="#E7DCC4" />
                  <text x="70" y="268" text-anchor="middle" style="fill:#1E4B57;font-family:'Geist',sans-serif;font-size:10px;font-weight:600;letter-spacing:0.18em">ADD TO CART</text>
                </g>
              </g>

              <!-- palette dots above phone (cycle highlight) -->
              <g transform="translate(360,72)">
                <text x="0" y="-12" text-anchor="middle" class="hc-lbl" style="font-size:9px">PALETTE</text>
                <g transform="translate(-26,0)">
                  <circle r="6" fill="#C6F432" />
                  <circle r="11" fill="none" stroke="#C6F432" stroke-width="1.2" class="hc-palette-ring hc-palette-ring--a" />
                </g>
                <g transform="translate(0,0)">
                  <circle r="6" fill="#F2A488" />
                  <circle r="11" fill="none" stroke="#F2A488" stroke-width="1.2" class="hc-palette-ring hc-palette-ring--b" />
                </g>
                <g transform="translate(26,0)">
                  <circle r="6" fill="#1E4B57" stroke="rgba(231,220,196,0.5)" stroke-width="1" />
                  <circle r="11" fill="none" stroke="#1E4B57" stroke-width="1.2" class="hc-palette-ring hc-palette-ring--c" />
                </g>
              </g>

              <!-- annotation: theme name (cycles) -->
              <g transform="translate(360,420)">
                <text text-anchor="middle" class="hc-lbl" style="font-size:9px;fill:rgba(255,255,255,0.45)">CURRENT THEME</text>
                <g class="hc-theme-label hc-theme-label--a">
                  <text x="0" y="20" text-anchor="middle" style="fill:#E7ECEE;font-family:'Geist',sans-serif;font-size:14px;font-weight:500;letter-spacing:-0.01em">Arena · Lime</text>
                </g>
                <g class="hc-theme-label hc-theme-label--b">
                  <text x="0" y="20" text-anchor="middle" style="fill:#E7ECEE;font-family:'Geist',sans-serif;font-size:14px;font-weight:500;letter-spacing:-0.01em">Cozy · Terracotta</text>
                </g>
                <g class="hc-theme-label hc-theme-label--c">
                  <text x="0" y="20" text-anchor="middle" style="fill:#E7ECEE;font-family:'Geist',sans-serif;font-size:14px;font-weight:500;letter-spacing:-0.01em">Chrono · Sand</text>
                </g>
              </g>

              <!-- floating type specimens -->
              <g transform="translate(110,310)" opacity=".6">
                <text class="hc-lbl" style="font-size:8px">FONT</text>
                <text x="0" y="20" style="fill:#E7ECEE;font-family:'Geist',sans-serif;font-size:30px;font-weight:500;letter-spacing:-0.04em">Aa</text>
              </g>
              <g transform="translate(580,310)" opacity=".6">
                <text class="hc-lbl" style="font-size:8px;text-anchor:end">RADIUS</text>
                <rect x="-30" y="6" width="30" height="20" rx="10" fill="none" stroke="#C6F432" stroke-width="1.2" />
              </g>

              <!-- ambient particles drifting up -->
              <g filter="url(#hcGlow)" opacity=".7">
                <circle r="1.6" fill="#C6F432"><animateMotion dur="6s" repeatCount="indefinite" path="M180,420 Q220,300 200,140" /></circle>
                <circle r="1.4" fill="#C6F432"><animateMotion dur="7.2s" begin="-2s" repeatCount="indefinite" path="M540,430 Q500,300 520,160" /></circle>
                <circle r="1.2" fill="#9FD41A"><animateMotion dur="5.4s" begin="-3.5s" repeatCount="indefinite" path="M260,440 Q280,320 240,170" /></circle>
                <circle r="1.4" fill="#9FD41A"><animateMotion dur="6.8s" begin="-1.2s" repeatCount="indefinite" path="M470,450 Q450,320 480,160" /></circle>
              </g>
            </svg>

            <div class="hc-fcard d1" style="left:3%;top:6%;width:180px">
              <h4>Theme builder</h4>
              <div class="big neon">live</div>
              <div class="row" style="margin-top:6px"><span>Preview</span><span class="pill">on</span></div>
            </div>
            <div class="hc-fcard d2" style="right:3%;bottom:9%;width:200px">
              <h4>Customization</h4>
              <div class="row" style="margin-top:4px"><span>Palette</span><span class="mono neon">3 / 3</span></div>
              <div class="row"><span>Typography</span><span class="mono neon">2 fonts</span></div>
              <div class="row"><span>Layout</span><span class="mono neon">modular</span></div>
            </div>
          </div>

          <!-- Scene 4: Conversion & analytics -->
          <div class="hc-scene" :class="{ 'is-active': current === 3 }">
            <svg class="hc-svg" viewBox="0 0 720 540" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="hcFunnelFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stop-color="#C6F432" stop-opacity=".14" />
                  <stop offset="1" stop-color="#C6F432" stop-opacity=".55" />
                </linearGradient>
                <linearGradient id="hcFunnelStroke" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stop-color="#C6F432" stop-opacity=".55" />
                  <stop offset="1" stop-color="#C6F432" />
                </linearGradient>
              </defs>

              <!-- funnel silhouette -->
              <path d="M180,90 L540,90 L450,230 L450,380 L270,380 L270,230 Z"
                fill="url(#hcFunnelFill)" stroke="url(#hcFunnelStroke)" stroke-width="1.6"
                class="anim-draw" style="--len:1700" filter="url(#hcGlow)" />

              <!-- horizontal level dividers -->
              <line x1="218" y1="148" x2="502" y2="148" stroke="rgba(198,244,50,0.30)" stroke-width="1" stroke-dasharray="3 5" />
              <line x1="248" y1="195" x2="472" y2="195" stroke="rgba(198,244,50,0.30)" stroke-width="1" stroke-dasharray="3 5" />
              <line x1="270" y1="240" x2="450" y2="240" stroke="rgba(198,244,50,0.30)" stroke-width="1" stroke-dasharray="3 5" />

              <!-- level labels (no monetary values) -->
              <text x="195" y="122" class="hc-lbl">VISITORS</text>
              <text x="500" y="122" text-anchor="end" class="hc-dz">100%</text>

              <text x="225" y="180" class="hc-lbl">ADD TO CART</text>
              <text x="475" y="180" text-anchor="end" class="hc-dz">29%</text>

              <text x="262" y="226" class="hc-lbl">CHECKOUT</text>
              <text x="448" y="226" text-anchor="end" class="hc-dz">20%</text>

              <text x="282" y="282" class="hc-lbl" style="fill:#C6F432">CONFIRMED</text>
              <text x="448" y="282" text-anchor="end" style="fill:#C6F432;font-family:'Geist',sans-serif;font-size:14px;font-weight:600">15.5%</text>

              <!-- flowing particles down through the funnel -->
              <g filter="url(#hcGlow)">
                <circle r="3" fill="#C6F432"><animateMotion dur="3.6s" repeatCount="indefinite" path="M210,110 Q360,180 360,380" /></circle>
                <circle r="2.5" fill="#C6F432"><animateMotion dur="4.2s" begin="-0.6s" repeatCount="indefinite" path="M280,110 Q360,200 360,380" /></circle>
                <circle r="3" fill="#9FD41A"><animateMotion dur="3.2s" begin="-1.2s" repeatCount="indefinite" path="M350,110 Q360,220 360,380" /></circle>
                <circle r="2" fill="#C6F432"><animateMotion dur="3.8s" begin="-1.8s" repeatCount="indefinite" path="M420,110 Q360,240 360,380" /></circle>
                <circle r="2.5" fill="#9FD41A"><animateMotion dur="4.6s" begin="-2.2s" repeatCount="indefinite" path="M490,110 Q360,260 360,380" /></circle>
              </g>

              <!-- conversion ring at base -->
              <g transform="translate(360,440)">
                <circle r="36" fill="none" stroke="rgba(198,244,50,0.18)" stroke-width="6" />
                <circle r="36" fill="none" stroke="#C6F432" stroke-width="6" stroke-linecap="round"
                  stroke-dasharray="226.2" stroke-dashoffset="50" transform="rotate(-90)"
                  class="anim-draw" style="--len:226.2" filter="url(#hcGlow)" />
                <text x="0" y="2" text-anchor="middle" style="fill:#E7ECEE;font-family:'Geist',sans-serif;font-size:18px;font-weight:600">15.5%</text>
                <text x="0" y="18" text-anchor="middle" class="hc-lbl" style="font-size:8px">CONVERSION</text>
              </g>

              <!-- live orders sparkline (left) -->
              <g transform="translate(50,150)">
                <text class="hc-lbl" style="font-size:9px">ORDERS · LIVE</text>
                <path d="M0,170 L18,160 L36,165 L54,140 L72,150 L90,118 L108,128 L126,96 L144,80"
                  stroke="rgba(198,244,50,0.30)" stroke-width="1.2" fill="none" />
                <path d="M0,170 L18,160 L36,165 L54,140 L72,150 L90,118 L108,128 L126,96 L144,80"
                  stroke="#C6F432" stroke-width="1.6" fill="none" filter="url(#hcGlow)"
                  class="anim-draw" style="--len:300" />
                <circle cx="144" cy="80" r="3.5" fill="#C6F432" filter="url(#hcGlow)" class="anim-blink" />
              </g>

              <!-- pixel listener tag (right) -->
              <g transform="translate(560,150)">
                <rect x="0" y="0" width="120" height="60" rx="10" fill="rgba(255,255,255,0.025)" stroke="rgba(198,244,50,0.30)" />
                <text x="60" y="22" text-anchor="middle" class="hc-lbl" style="font-size:8px">META PIXEL</text>
                <g transform="translate(60,40)">
                  <circle r="5" fill="#C6F432" filter="url(#hcGlow)" />
                  <circle r="10" fill="none" stroke="#C6F432" stroke-width="1.1" class="anim-ping" />
                </g>
                <text x="60" y="76" text-anchor="middle" class="hc-dz" style="font-size:9px">events fired</text>
              </g>

              <!-- ambient drift particles -->
              <g filter="url(#hcGlow)" opacity=".55">
                <circle r="1.4" fill="#C6F432"><animateMotion dur="9s" repeatCount="indefinite" path="M100,460 Q200,300 80,120" /></circle>
                <circle r="1.2" fill="#9FD41A"><animateMotion dur="11s" begin="-3s" repeatCount="indefinite" path="M620,440 Q580,300 660,120" /></circle>
              </g>
            </svg>

            <div class="hc-fcard d1" style="right:3%;top:6%;width:200px">
              <h4>Conversion · 7d</h4>
              <div class="big neon">15.5%</div>
              <div class="row"><span>Trailing 30d</span><span class="pill">▲ 1.8</span></div>
            </div>
            <div class="hc-fcard d2" style="right:3%;bottom:12%;width:220px">
              <h4>Live order dashboard</h4>
              <div class="row" style="margin-top:4px"><span>Visitors · now</span><span class="mono neon">412</span></div>
              <div class="row"><span>Carts active</span><span class="mono neon">38</span></div>
              <div class="row"><span>Checkouts in flight</span><span class="mono neon">7</span></div>
            </div>
          </div>

          <!-- Scene 5: POS -->
          <div class="hc-scene" :class="{ 'is-active': current === 4 }">
            <svg class="hc-svg" viewBox="0 0 720 540" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="hcPosScreen" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stop-color="#062A2A" stop-opacity=".8" />
                  <stop offset="1" stop-color="#05070A" stop-opacity="0" />
                </linearGradient>
                <linearGradient id="hcPosBody" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stop-color="#0A1014" />
                  <stop offset="1" stop-color="#05070A" />
                </linearGradient>
              </defs>
              <ellipse cx="360" cy="490" rx="280" ry="26" fill="rgba(198,244,50,0.16)" />
              <line x1="40" y1="450" x2="680" y2="450" stroke="rgba(198,244,50,0.25)" />
              <line x1="40" y1="454" x2="680" y2="454" stroke="rgba(198,244,50,0.08)" />
              <g transform="translate(210,80)">
                <path d="M70,340 L210,340 L240,380 L40,380 Z" fill="#0A1014" stroke="#9FD41A" stroke-width="1.4" />
                <rect x="120" y="300" width="40" height="50" rx="4" fill="#0A1014" stroke="#9FD41A" stroke-width="1.4" />
                <rect x="0" y="0" width="280" height="320" rx="18" fill="url(#hcPosBody)" stroke="#C6F432" stroke-width="1.6" filter="url(#hcGlow)" />
                <rect x="14" y="14" width="252" height="292" rx="10" fill="#05070A" stroke="rgba(198,244,50,0.30)" />
                <rect x="14" y="14" width="252" height="292" rx="10" fill="url(#hcPosScreen)" opacity=".7" />
                <text x="28" y="38" class="hc-lbl" style="fill:#C6F432;font-size:9px">REGISTER · 02</text>
                <text x="240" y="38" text-anchor="end" class="hc-mono" style="fill:#C6F432;font-size:9px">14:32</text>
                <line x1="22" y1="48" x2="258" y2="48" stroke="rgba(198,244,50,0.25)" />
                <g>
                  <rect x="24" y="60" width="70" height="54" rx="6" fill="#9FD41A" class="anim-drop" style="animation-delay:.1s" />
                  <rect x="100" y="60" width="70" height="54" rx="6" fill="#C6F432" class="anim-drop" style="animation-delay:.2s" />
                  <rect x="176" y="60" width="80" height="54" rx="6" fill="rgba(198,244,50,0.55)" class="anim-drop" style="animation-delay:.3s" />
                  <rect x="24" y="120" width="80" height="54" rx="6" fill="rgba(198,244,50,0.45)" class="anim-drop" style="animation-delay:.4s" />
                  <rect x="110" y="120" width="70" height="54" rx="6" fill="#9FD41A" class="anim-drop" style="animation-delay:.5s" />
                  <rect x="186" y="120" width="70" height="54" rx="6" fill="#C6F432" class="anim-drop" style="animation-delay:.6s" filter="url(#hcGlow)" />
                </g>
                <g transform="translate(24,190)">
                  <text class="hc-lbl" style="fill:#C6F432;font-size:9px">CART · 3 ITEMS</text>
                  <g transform="translate(0,12)" class="anim-drop" style="animation-delay:.7s">
                    <rect x="0" y="0" width="232" height="22" rx="4" fill="rgba(198,244,50,0.07)" />
                    <text x="8" y="14" class="hc-dz" style="font-size:10px">Item · A</text>
                    <rect x="200" y="6" width="22" height="10" rx="2" fill="rgba(198,244,50,0.35)" />
                  </g>
                  <g transform="translate(0,38)" class="anim-drop" style="animation-delay:.85s">
                    <rect x="0" y="0" width="232" height="22" rx="4" fill="rgba(198,244,50,0.07)" />
                    <text x="8" y="14" class="hc-dz" style="font-size:10px">Item · B</text>
                    <rect x="200" y="6" width="22" height="10" rx="2" fill="rgba(198,244,50,0.35)" />
                  </g>
                  <g transform="translate(0,64)" class="anim-drop" style="animation-delay:1s">
                    <rect x="0" y="0" width="232" height="22" rx="4" fill="rgba(198,244,50,0.07)" />
                    <text x="8" y="14" class="hc-dz" style="font-size:10px">Item · C</text>
                    <rect x="200" y="6" width="22" height="10" rx="2" fill="rgba(198,244,50,0.35)" />
                  </g>
                </g>
                <line x1="22" y1="274" x2="258" y2="274" stroke="rgba(198,244,50,0.25)" />
                <text x="28" y="292" class="hc-lbl" style="font-size:10px">CHECKOUT</text>
                <rect x="200" y="284" width="56" height="14" rx="2" fill="rgba(198,244,50,0.18)" />
                <rect x="22" y="300" width="236" height="12" rx="6" fill="#C6F432" class="anim-blink" filter="url(#hcGlow)" />
                <text x="140" y="309" text-anchor="middle" style="fill:#05070A;font-family:'Geist',sans-serif;font-size:8px;font-weight:600;letter-spacing:0.18em">TAP TO CHARGE</text>
              </g>
              <g transform="translate(540,290)">
                <rect x="0" y="0" width="90" height="140" rx="12" fill="url(#hcPosBody)" stroke="#C6F432" stroke-width="1.4" />
                <rect x="10" y="14" width="70" height="46" rx="6" fill="#05070A" stroke="rgba(198,244,50,0.30)" />
                <text x="45" y="32" text-anchor="middle" class="hc-dz" style="fill:#C6F432;font-size:9px;font-weight:600">CHARGE</text>
                <text x="45" y="46" text-anchor="middle" class="hc-lbl" style="font-size:7px">TAP CARD</text>
                <g fill="rgba(198,244,50,0.35)">
                  <circle cx="22" cy="80" r="4" /><circle cx="45" cy="80" r="4" /><circle cx="68" cy="80" r="4" />
                  <circle cx="22" cy="98" r="4" /><circle cx="45" cy="98" r="4" /><circle cx="68" cy="98" r="4" />
                  <circle cx="22" cy="116" r="4" /><circle cx="45" cy="116" r="4" /><circle cx="68" cy="116" r="4" />
                </g>
                <g fill="none" stroke="#C6F432" stroke-width="1.6" stroke-linecap="round">
                  <path d="M-20,60 a16,18 0 0 0 0,20" class="anim-blink" />
                  <path d="M-32,52 a26,28 0 0 0 0,36" class="anim-blink" style="animation-delay:.3s" />
                  <path d="M-44,44 a36,38 0 0 0 0,52" class="anim-blink" style="animation-delay:.6s" />
                </g>
              </g>
              <g transform="translate(60,240)">
                <rect x="0" y="0" width="120" height="60" rx="8" fill="url(#hcPosBody)" stroke="#9FD41A" stroke-width="1.4" />
                <rect x="8" y="56" width="104" height="6" fill="#0A1014" stroke="#9FD41A" />
                <g class="anim-drop" style="animation-delay:1.1s">
                  <rect x="14" y="62" width="92" height="120" rx="2" fill="#E7ECEE" />
                  <text x="60" y="78" text-anchor="middle" style="fill:#05070A;font-family:'Geist',sans-serif;font-size:8px;font-weight:600">SWEKLY · STORE 02</text>
                  <line x1="22" y1="84" x2="98" y2="84" stroke="#05070A" />
                  <rect x="22" y="92" width="46" height="4" rx="1" fill="rgba(0,0,0,0.55)" />
                  <rect x="84" y="92" width="14" height="4" rx="1" fill="rgba(0,0,0,0.55)" />
                  <rect x="22" y="102" width="40" height="4" rx="1" fill="rgba(0,0,0,0.45)" />
                  <rect x="86" y="102" width="12" height="4" rx="1" fill="rgba(0,0,0,0.45)" />
                  <rect x="22" y="112" width="38" height="4" rx="1" fill="rgba(0,0,0,0.45)" />
                  <rect x="88" y="112" width="10" height="4" rx="1" fill="rgba(0,0,0,0.45)" />
                  <line x1="22" y1="124" x2="98" y2="124" stroke="#05070A" />
                  <text x="60" y="142" text-anchor="middle" style="fill:#05070A;font-family:'Geist',sans-serif;font-size:8px;font-weight:700">RECEIPT</text>
                  <text x="60" y="158" text-anchor="middle" style="fill:#0F8E48;font-family:'Geist',sans-serif;font-size:8px;font-weight:700">THANK YOU</text>
                  <path d="M22,170 L98,170" stroke="#05070A" stroke-dasharray="2 2" />
                </g>
              </g>
              <g stroke="#C6F432" stroke-width="1.2" stroke-dasharray="4 6" fill="none" filter="url(#hcGlow)">
                <path d="M490,160 Q560,90 600,42" class="anim-flow" />
                <path d="M500,200 Q580,140 640,52" class="anim-flow" />
                <path d="M510,250 Q590,180 660,72" class="anim-flow" />
              </g>
              <!-- Platforms tower: iOS · Android · Windows · macOS -->
              <g transform="translate(550,30)">
                <rect x="0" y="0" width="124" height="174" rx="14" fill="url(#hcPosBody)" stroke="#C6F432" stroke-width="1.6" filter="url(#hcGlow)" />
                <rect x="0" y="0" width="124" height="22" rx="14" fill="rgba(198,244,50,0.10)" />
                <rect x="0" y="14" width="124" height="8" fill="rgba(198,244,50,0.10)" />
                <text x="62" y="14" text-anchor="middle" class="hc-lbl" style="fill:#C6F432;font-size:8px;letter-spacing:.20em">PLATFORMS · 4</text>
                <line x1="0" y1="22" x2="124" y2="22" stroke="rgba(198,244,50,0.30)" />

                <!-- iOS row -->
                <g transform="translate(10,30)" class="anim-drop" style="animation-delay:.5s">
                  <rect x="0" y="0" width="104" height="24" rx="6" fill="rgba(198,244,50,0.06)" stroke="rgba(198,244,50,0.36)" />
                  <g transform="translate(7,5)" stroke="#C6F432" stroke-width="1" fill="none">
                    <rect x="0" y="0" width="10" height="14" rx="2" />
                    <line x1="3" y1="2" x2="7" y2="2" stroke-width="0.8" />
                    <circle cx="5" cy="11.5" r="0.6" fill="#C6F432" stroke="none" />
                  </g>
                  <text x="24" y="16" class="hc-dz" style="fill:#E7ECEE;font-size:10px;font-weight:500">iOS</text>
                  <circle cx="94" cy="12" r="2.6" fill="#C6F432" filter="url(#hcGlow)" class="anim-blink" />
                </g>

                <!-- Android row -->
                <g transform="translate(10,60)" class="anim-drop" style="animation-delay:.65s">
                  <rect x="0" y="0" width="104" height="24" rx="6" fill="rgba(198,244,50,0.06)" stroke="rgba(198,244,50,0.36)" />
                  <g transform="translate(6,4)">
                    <path d="M0,6 Q5,1 10,6 L10,12 L0,12 Z" fill="#9FD41A" />
                    <circle cx="3" cy="7.5" r="0.6" fill="#05070A" />
                    <circle cx="7" cy="7.5" r="0.6" fill="#05070A" />
                    <line x1="1.5" y1="2.5" x2="3" y2="5" stroke="#9FD41A" stroke-width="0.8" />
                    <line x1="8.5" y1="2.5" x2="7" y2="5" stroke="#9FD41A" stroke-width="0.8" />
                  </g>
                  <text x="24" y="16" class="hc-dz" style="fill:#E7ECEE;font-size:10px;font-weight:500">Android</text>
                  <circle cx="94" cy="12" r="2.6" fill="#C6F432" filter="url(#hcGlow)" class="anim-blink" style="animation-delay:.2s" />
                </g>

                <!-- Windows row -->
                <g transform="translate(10,90)" class="anim-drop" style="animation-delay:.8s">
                  <rect x="0" y="0" width="104" height="24" rx="6" fill="rgba(198,244,50,0.06)" stroke="rgba(198,244,50,0.36)" />
                  <g transform="translate(7,6)" fill="#C6F432">
                    <rect x="0" y="0" width="4.5" height="4.5" />
                    <rect x="5.5" y="0" width="4.5" height="4.5" />
                    <rect x="0" y="5.5" width="4.5" height="4.5" />
                    <rect x="5.5" y="5.5" width="4.5" height="4.5" />
                  </g>
                  <text x="24" y="16" class="hc-dz" style="fill:#E7ECEE;font-size:10px;font-weight:500">Windows</text>
                  <circle cx="94" cy="12" r="2.6" fill="#C6F432" filter="url(#hcGlow)" class="anim-blink" style="animation-delay:.4s" />
                </g>

                <!-- macOS row -->
                <g transform="translate(10,120)" class="anim-drop" style="animation-delay:.95s">
                  <rect x="0" y="0" width="104" height="24" rx="6" fill="rgba(198,244,50,0.06)" stroke="rgba(198,244,50,0.36)" />
                  <g transform="translate(5,5)">
                    <rect x="0" y="0" width="14" height="10" rx="1" fill="none" stroke="#9FD41A" stroke-width="1" />
                    <rect x="-2" y="10" width="18" height="2" rx="1" fill="#9FD41A" />
                  </g>
                  <text x="24" y="16" class="hc-dz" style="fill:#E7ECEE;font-size:10px;font-weight:500">macOS</text>
                  <circle cx="94" cy="12" r="2.6" fill="#C6F432" filter="url(#hcGlow)" class="anim-blink" style="animation-delay:.6s" />
                </g>

                <!-- Footer sync indicator -->
                <line x1="10" y1="152" x2="114" y2="152" stroke="rgba(198,244,50,0.25)" />
                <circle cx="30" cy="164" r="2.4" fill="#C6F432" filter="url(#hcGlow)" class="anim-blink" />
                <text x="68" y="167" text-anchor="middle" class="hc-dz" style="fill:#C6F432;font-size:7px;letter-spacing:.22em">SYNC · LIVE</text>
              </g>
              <g fill="#C6F432" filter="url(#hcGlow)">
                <circle r="3"><animateMotion dur="2.4s" repeatCount="indefinite" path="M360,180 Q380,280 380,440" /></circle>
                <circle r="2.5"><animateMotion dur="2.8s" begin="-0.6s" repeatCount="indefinite" path="M390,190 Q400,290 400,440" /></circle>
                <circle r="2"><animateMotion dur="2.2s" begin="-1.2s" repeatCount="indefinite" path="M340,180 Q360,290 360,440" /></circle>
              </g>
              <!-- ambient register-to-platform data threads (one per OS) -->
              <g filter="url(#hcGlow)" opacity=".7">
                <circle r="1.7" fill="#C6F432"><animateMotion dur="3.6s" repeatCount="indefinite" path="M468,170 Q540,120 604,72" /></circle>
                <circle r="1.5" fill="#9FD41A"><animateMotion dur="4.2s" begin="-1.1s" repeatCount="indefinite" path="M474,210 Q540,160 604,102" /></circle>
                <circle r="1.7" fill="#C6F432"><animateMotion dur="3.8s" begin="-2.2s" repeatCount="indefinite" path="M474,240 Q540,190 604,132" /></circle>
                <circle r="1.5" fill="#9FD41A"><animateMotion dur="4.4s" begin="-3s" repeatCount="indefinite" path="M468,272 Q540,220 604,162" /></circle>
              </g>
            </svg>
            <div class="hc-fcard d1" style="left:3%;top:6%;width:200px">
              <h4>Register · iPad 02</h4>
              <div class="big neon">Tap to pay</div>
              <div class="row" style="margin-top:8px"><span>NFC · contactless</span><span class="pill">approved</span></div>
            </div>
            <div class="hc-fcard d2" style="right:3%;bottom:9%;width:220px">
              <h4>4 platforms · synced</h4>
              <div class="row" style="margin-top:4px"><span>iOS · Android</span><span class="pill">live</span></div>
              <div class="row"><span>Windows · macOS</span><span class="pill">live</span></div>
              <div class="row"><span>Stock & loyalty</span><span class="mono neon">+24 pts</span></div>
            </div>
          </div>

          <!-- Controls -->
          <div class="hc-controls">
            <button class="hc-arrow" aria-label="Previous" @click="prev">
              <Icon name="lucide:chevron-left" class="h-4 w-4" />
            </button>
            <div class="hc-dots">
              <button
                v-for="(_, i) in slides"
                :key="i"
                class="hc-dotnav"
                :class="{ 'is-active': i === current }"
                :aria-label="`Slide ${i + 1}`"
                @click="go(i)"
              />
            </div>
            <button class="hc-arrow" aria-label="Next" @click="next">
              <Icon name="lucide:chevron-right" class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<style scoped>
.hero-carousel {
  position: relative;
  isolation: isolate;
  padding: 56px 0 80px;
  overflow: hidden;
}
.hc-wrap { position: relative; z-index: 1; }

.hc-stage-grid {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 32px;
  align-items: center;
  min-height: 620px;
}
@media (max-width: 980px) {
  .hc-stage-grid { grid-template-columns: 1fr; gap: 32px; }
}

/* Copy */
.hc-copy { position: relative; min-height: 480px; }
@media (max-width: 980px) { .hc-copy { min-height: 420px; } }

.hc-slide {
  position: absolute; inset: 0;
  opacity: 0; transform: translateY(14px);
  pointer-events: none;
  transition: opacity .6s cubic-bezier(.2,.8,.2,1), transform .7s cubic-bezier(.2,.8,.2,1);
}
.hc-slide.is-active { opacity: 1; transform: translateY(0); pointer-events: auto; }

.hc-eyebrow {
  display: inline-flex; align-items: center; gap: .6rem;
  padding: .4rem .85rem; border-radius: 999px;
  border: 1px solid rgba(198,244,50,0.10);
  background: rgba(198,244,50,0.03);
  color: var(--m-text-dim, #8A959C);
  font-family: 'Geist Mono', monospace; font-size: .68rem;
  text-transform: uppercase; letter-spacing: .18em;
  backdrop-filter: blur(8px);
}
.hc-dot {
  position: relative;
  width: 6px; height: 6px; border-radius: 999px;
  background: var(--m-accent, #C6F432);
  box-shadow: 0 0 12px rgba(198,244,50,0.45);
  animation: hc-pulse 2.4s ease-in-out infinite;
}
@keyframes hc-pulse { 0%,100% { opacity: .85 } 50% { opacity: .35 } }

.hc-headline {
  font-weight: 500; letter-spacing: -0.035em; line-height: .98;
  font-size: clamp(40px, 5.6vw, 76px);
  margin: 24px 0 18px;
  color: var(--m-text, #E7ECEE);
}
.hc-headline em {
  font-style: normal; color: var(--m-accent, #C6F432); position: relative;
  padding-bottom: .18em; display: inline-block;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 12' preserveAspectRatio='none'><path d='M3 7 Q 100 1 197 7' stroke='%23C6F432' stroke-width='3' fill='none' stroke-linecap='round'/></svg>");
  background-repeat: no-repeat; background-position: 0 100%; background-size: 0 .18em;
  transition: background-size .9s cubic-bezier(.2,.8,.2,1);
}
.hc-slide.is-active .hc-headline em {
  background-size: 100% .18em;
  transition-delay: .82s;
}

.hc-actions { margin-top: 28px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.hc-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: .85rem 1.4rem; border-radius: 999px;
  font-weight: 500; font-size: .92rem; letter-spacing: -0.005em;
  transition: transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .3s, background .2s, border-color .2s;
  white-space: nowrap;
}
.hc-btn-primary {
  background: var(--m-accent, #C6F432); color: #05070A;
  box-shadow: 0 0 0 1px rgba(198,244,50,0.6), 0 14px 40px -12px rgba(198,244,50,0.55);
}
.hc-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(198,244,50,0.8), 0 18px 50px -10px rgba(198,244,50,0.7); }
.hc-btn-ghost {
  background: transparent; color: var(--m-text, #E7ECEE);
  border: 1px solid rgba(255,255,255,0.12);
}
.hc-btn-ghost:hover { border-color: var(--m-accent, #C6F432); color: var(--m-accent, #C6F432); transform: translateY(-1px); }

.hc-meta-row { display: flex; gap: 22px; margin-top: 30px; flex-wrap: wrap; }
.hc-meta { display: flex; align-items: center; gap: 10px; color: var(--m-text-dim, #8A959C); font-size: 13px; }
.hc-tick {
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(198,244,50,0.14); color: var(--m-accent, #C6F432);
  display: grid; place-items: center; font-size: 11px; font-weight: 600;
}

/* Stage */
.hc-stage {
  position: relative; aspect-ratio: 5 / 4.4;
  width: 100%; max-width: 740px; margin-left: auto;
}
:dir(rtl) .hc-stage { margin-left: 0; margin-right: auto; }

/* Scenes */
.hc-scene { position: absolute; inset: 0 0 60px; opacity: 0; transition: opacity .55s ease; pointer-events: none; }
.hc-scene.is-active { opacity: 1; pointer-events: auto; }
.hc-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.hc-svg :deep(.hc-lbl) {
  fill: var(--m-accent, #C6F432); font-weight: 500;
  letter-spacing: 0.14em; text-transform: uppercase;
  font-family: 'Geist Mono', monospace; font-size: 10px;
}
.hc-svg :deep(.hc-dz) {
  fill: #E7ECEE; font-family: 'Geist', sans-serif; font-weight: 500; font-size: 13px;
}
.hc-svg :deep(.hc-mono) { font-family: 'Geist Mono', monospace; font-variant-numeric: tabular-nums; }

/* SVG animations (kept identical to source) */
@keyframes hc-drawPath { to { stroke-dashoffset: 0 } }
@keyframes hc-dashFlow { to { stroke-dashoffset: -60 } }
@keyframes hc-lift { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
@keyframes hc-spin { to { transform: rotate(360deg) } }
@keyframes hc-ping { 0% { transform: scale(.6); opacity: 1 } 100% { transform: scale(2.6); opacity: 0 } }
@keyframes hc-fillBar { 0% { transform: scaleY(0) } 100% { transform: scaleY(1) } }
@keyframes hc-drop { 0% { transform: translateY(-26px); opacity: 0 } 30% { opacity: 1 } 100% { transform: translateY(0); opacity: 1 } }
@keyframes hc-rideRoute { to { offset-distance: 100% } }
@keyframes hc-blink { 0%,100% { opacity: 1 } 50% { opacity: .3 } }
@keyframes hc-glow { 0%,100% { filter: drop-shadow(0 0 6px rgba(198,244,50,0.45)) } 50% { filter: drop-shadow(0 0 18px rgba(198,244,50,0.85)) } }

.hc-scene.is-active :deep(.anim-draw) { stroke-dasharray: var(--len, 600); stroke-dashoffset: var(--len, 600); animation: hc-drawPath 1.6s cubic-bezier(.2,.8,.2,1) forwards; }
.hc-scene.is-active :deep(.anim-flow) { stroke-dasharray: 6 8; animation: hc-dashFlow 2s linear infinite; }
.hc-scene.is-active :deep(.anim-lift) { animation: hc-lift 2.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.hc-scene.is-active :deep(.anim-spin) { animation: hc-spin 14s linear infinite; transform-box: fill-box; transform-origin: center; }
.hc-scene.is-active :deep(.anim-ping) { animation: hc-ping 1.8s ease-out infinite; transform-box: fill-box; transform-origin: center; }
.hc-scene.is-active :deep(.anim-bar) { animation: hc-fillBar 1.1s cubic-bezier(.2,.8,.2,1) forwards; transform-box: fill-box; transform-origin: bottom; }
.hc-scene.is-active :deep(.anim-drop) { animation: hc-drop 1s cubic-bezier(.2,.8,.2,1) backwards; }
.hc-scene.is-active :deep(.anim-blink) { animation: hc-blink 1.4s ease-in-out infinite; }
.hc-scene.is-active :deep(.anim-glow) { animation: hc-glow 2.8s ease-in-out infinite; }
.hc-scene.is-active :deep(.anim-ride) { animation: hc-rideRoute 7s linear infinite; offset-path: path(var(--route)); offset-rotate: auto; }

/* Themes scene — palette cycle (4.5s loop, 3 stops) */
@keyframes hc-theme-cycle {
  0%, 26%      { opacity: 1 }
  33%, 92%     { opacity: 0 }
  100%         { opacity: 1 }
}
@keyframes hc-theme-cycle-b {
  0%, 26%      { opacity: 0 }
  33%, 59%     { opacity: 1 }
  66%, 100%    { opacity: 0 }
}
@keyframes hc-theme-cycle-c {
  0%, 59%      { opacity: 0 }
  66%, 92%     { opacity: 1 }
  100%         { opacity: 0 }
}
.hc-scene.is-active :deep(.hc-theme) { transform-origin: center; }
.hc-scene.is-active :deep(.hc-theme--a),
.hc-scene.is-active :deep(.hc-theme-label--a),
.hc-scene.is-active :deep(.hc-palette-ring--a) {
  animation: hc-theme-cycle 4.5s cubic-bezier(.4,0,.2,1) infinite;
}
.hc-scene.is-active :deep(.hc-theme--b),
.hc-scene.is-active :deep(.hc-theme-label--b),
.hc-scene.is-active :deep(.hc-palette-ring--b) {
  animation: hc-theme-cycle-b 4.5s cubic-bezier(.4,0,.2,1) infinite;
}
.hc-scene.is-active :deep(.hc-theme--c),
.hc-scene.is-active :deep(.hc-theme-label--c),
.hc-scene.is-active :deep(.hc-palette-ring--c) {
  animation: hc-theme-cycle-c 4.5s cubic-bezier(.4,0,.2,1) infinite;
}
/* Hide labels and rings by default so only active one shows */
.hc-svg :deep(.hc-theme),
.hc-svg :deep(.hc-theme-label),
.hc-svg :deep(.hc-palette-ring) { opacity: 0; }
.hc-svg :deep(.hc-theme--a) { opacity: 1; }
.hc-svg :deep(.hc-theme-label--a) { opacity: 1; }
.hc-svg :deep(.hc-palette-ring--a) { opacity: 1; }

/* Gentle ghost phone drift */
@keyframes hc-ghost-drift { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
.hc-scene.is-active :deep(.hc-theme-ghost) {
  animation: hc-ghost-drift 5.5s ease-in-out infinite;
  transform-box: fill-box; transform-origin: center;
}
.hc-scene.is-active :deep(.hc-theme-ghost--alt) {
  animation-delay: -2.5s;
}

/* Warehouse — sweeping laser scanline */
@keyframes hc-scan-sweep {
  0%   { transform: translateX(80px); opacity: 0 }
  10%  { opacity: 1 }
  90%  { opacity: 1 }
  100% { transform: translateX(640px); opacity: 0 }
}
.hc-scene.is-active :deep(.hc-scan-laser) {
  animation: hc-scan-sweep 4.5s ease-in-out infinite;
  transform-box: fill-box;
}

/* Floating cards — compact, legible glass panels */
.hc-fcard {
  position: absolute; z-index: 7;
  /* Hard clamp on width regardless of inline styles, so the SVG scene breathes */
  width: clamp(132px, 22%, 172px) !important;
  background:
    linear-gradient(180deg, rgba(10,14,18,0.86), rgba(6,9,12,0.78));
  border: 1px solid rgba(198,244,50,0.16);
  border-radius: 12px; padding: 10px 12px;
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.04) inset,
    0 18px 48px rgba(0,0,0,0.55),
    0 0 0 1px rgba(0,0,0,0.4);
  opacity: 0; transform: translateY(10px);
  transition: opacity .65s cubic-bezier(.2,.8,.2,1), transform .75s cubic-bezier(.2,.8,.2,1);
  color: var(--m-text, #E7ECEE);
}
.hc-fcard::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px;
  background: linear-gradient(135deg, rgba(198,244,50,0.45), transparent 55%, rgba(198,244,50,0.10));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none;
}
/* Tiny accent corner tick — gives the panel an editorial signature */
.hc-fcard::after {
  content: ''; position: absolute; top: 8px; left: 8px;
  width: 5px; height: 5px; border-radius: 999px;
  background: var(--m-accent, #C6F432);
  box-shadow: 0 0 8px rgba(198,244,50,0.7);
  opacity: .9;
}
.hc-scene.is-active .hc-fcard { opacity: 1; transform: translateY(0); }
.hc-scene.is-active .hc-fcard.d1 { transition-delay: .15s; }
.hc-scene.is-active .hc-fcard.d2 { transition-delay: .3s; }
.hc-fcard h4 {
  font-family: 'Geist Mono', monospace;
  font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase;
  color: rgba(231,236,238,0.55); font-weight: 500;
  margin: 0 0 6px; padding-left: 12px;
}
.hc-fcard .big {
  font-size: 18px; font-weight: 500; letter-spacing: -0.02em;
  color: #F2F6F8; line-height: 1.15;
}
.hc-fcard .neon { color: var(--m-accent, #C6F432); }
.hc-fcard .mono { font-family: 'Geist Mono', monospace; font-variant-numeric: tabular-nums; }
.hc-fcard .row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; font-size: 11px; color: rgba(231,236,238,0.78);
  line-height: 1.35;
}
.hc-fcard .row + .row { margin-top: 4px; }
.hc-fcard .row .mono { color: #F2F6F8; }
.hc-fcard .row .mono.neon { color: var(--m-accent, #C6F432); }
.hc-fcard .pill {
  font-family: 'Geist Mono', monospace;
  font-size: 8px; padding: 2px 6px; border-radius: 999px;
  background: rgba(198,244,50,0.14); color: var(--m-accent, #C6F432);
  border: 1px solid rgba(198,244,50,0.40);
  font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;
}

/* Mobile: stack cards out of the way of the scene */
@media (max-width: 640px) {
  .hc-fcard { width: clamp(118px, 38%, 150px) !important; padding: 8px 10px; }
  .hc-fcard .big { font-size: 15px; }
  .hc-fcard h4 { font-size: 8px; margin-bottom: 4px; }
  .hc-fcard .row { font-size: 10px; }
}

/* Controls */
.hc-controls {
  position: absolute; left: 0; right: 0; bottom: 14px; z-index: 8;
  display: flex; align-items: center; justify-content: center; gap: 18px;
}
.hc-arrow {
  width: 42px; height: 42px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.10); color: var(--m-text, #E7ECEE);
  display: grid; place-items: center; transition: all .25s;
  background: rgba(255,255,255,0.02);
  cursor: pointer;
}
.hc-arrow:hover {
  border-color: var(--m-accent, #C6F432);
  color: var(--m-accent, #C6F432);
  background: rgba(198,244,50,0.08);
  transform: translateY(-1px);
}
.hc-dots { display: flex; align-items: center; gap: 10px; }
.hc-dotnav {
  position: relative; width: 9px; height: 9px; border-radius: 999px;
  background: rgba(255,255,255,0.16); transition: all .35s;
  cursor: pointer; border: 0; padding: 0;
}
.hc-dotnav.is-active {
  width: 38px; border-radius: 6px; background: var(--m-accent, #C6F432);
  box-shadow: 0 0 14px rgba(198,244,50,0.45);
}

/* ─────────────────────────────────────────────────────────
   Cinematic motion choreography
   ───────────────────────────────────────────────────────── */

/* Per-slide stagger: eyebrow → headline → CTAs → meta ticks */
@keyframes hc-rise {
  0%   { opacity: 0; transform: translateY(18px); filter: blur(4px); }
  55%  { opacity: 1; filter: blur(0); }
  100% { opacity: 1; transform: translateY(0); filter: blur(0); }
}
.hc-slide.is-active .hc-eyebrow,
.hc-slide.is-active .hc-headline,
.hc-slide.is-active .hc-actions,
.hc-slide.is-active .hc-meta-row .hc-meta {
  animation: hc-rise 780ms cubic-bezier(.16,1,.3,1) both;
}
.hc-slide.is-active .hc-eyebrow  { animation-delay: 60ms; }
.hc-slide.is-active .hc-headline { animation-delay: 160ms; }
.hc-slide.is-active .hc-actions  { animation-delay: 300ms; }
.hc-slide.is-active .hc-meta-row .hc-meta:nth-child(1) { animation-delay: 380ms; }
.hc-slide.is-active .hc-meta-row .hc-meta:nth-child(2) { animation-delay: 450ms; }
.hc-slide.is-active .hc-meta-row .hc-meta:nth-child(3) { animation-delay: 520ms; }

/* Eyebrow halo ping over the pulse dot */
.hc-dot::after {
  content: ''; position: absolute; left: 50%; top: 50%;
  width: 6px; height: 6px; border-radius: 999px;
  transform: translate(-50%,-50%);
  border: 1px solid rgba(198,244,50,0.55);
  animation: hc-dot-halo 2.4s cubic-bezier(.2,.8,.2,1) infinite;
  pointer-events: none;
}
@keyframes hc-dot-halo {
  0%   { opacity: .9; transform: translate(-50%,-50%) scale(1); }
  80%, 100% { opacity: 0; transform: translate(-50%,-50%) scale(3.6); }
}

/* Primary CTA — slow accent breath + arrow nudge on hover */
.hc-btn-primary { animation: hc-cta-breathe 4.4s ease-in-out infinite; }
@keyframes hc-cta-breathe {
  0%, 100% { box-shadow: 0 0 0 1px rgba(198,244,50,0.6),  0 14px 40px -12px rgba(198,244,50,0.55); }
  50%      { box-shadow: 0 0 0 1px rgba(198,244,50,0.85), 0 22px 60px -10px rgba(198,244,50,0.85); }
}
.hc-btn-primary .h-4 { transition: transform .35s cubic-bezier(.2,.8,.2,1); }
.hc-btn-primary:hover .h-4 { transform: translateX(4px); }

/* Scene entrance — cinematic wipe + scale + defocus */
@keyframes hc-scene-in {
  0%   { opacity: 0; transform: scale(.97); filter: blur(8px); clip-path: inset(0 100% 0 0 round 6px); }
  55%  { opacity: 1; filter: blur(0); }
  100% { opacity: 1; transform: scale(1);  filter: blur(0); clip-path: inset(0 round 6px); }
}
.hc-scene.is-active { animation: hc-scene-in 900ms cubic-bezier(.16,1,.3,1) both; }

/* Floating cards — refined reveal + idle drift (two periods to avoid sync) */
@keyframes hc-fcard-in {
  0%   { opacity: 0; transform: translateY(14px) scale(.94); filter: blur(6px); }
  100% { opacity: 1; transform: translateY(0)    scale(1);   filter: blur(0); }
}
@keyframes hc-fcard-drift-a {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-5px); }
}
@keyframes hc-fcard-drift-b {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
}
.hc-scene.is-active .hc-fcard {
  animation: hc-fcard-in 780ms cubic-bezier(.16,1,.3,1) both;
}
.hc-scene.is-active .hc-fcard.d1 {
  animation: hc-fcard-in 780ms 280ms cubic-bezier(.16,1,.3,1) both,
             hc-fcard-drift-a 6.5s ease-in-out 1.2s infinite;
}
.hc-scene.is-active .hc-fcard.d2 {
  animation: hc-fcard-in 780ms 420ms cubic-bezier(.16,1,.3,1) both,
             hc-fcard-drift-b 7.8s ease-in-out 1.8s infinite;
}

/* Active dot — 3s progress fill matched to autoplay timer */
.hc-dotnav.is-active {
  position: relative; overflow: hidden;
  background: rgba(198,244,50,0.22);
}
.hc-dotnav.is-active::after {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0;
  width: 100%; border-radius: inherit;
  background: var(--m-accent, #C6F432);
  transform-origin: left center;
  animation: hc-dot-progress 5s linear forwards;
}
.hero-carousel.is-hovered .hc-dotnav.is-active::after {
  animation-duration: 15s;
  box-shadow: 0 0 14px rgba(198,244,50,0.45);
}
@keyframes hc-dot-progress {
  0%   { transform: scaleX(0); }
  100% { transform: scaleX(1); }
}

/* Respect user preference */
@media (prefers-reduced-motion: reduce) {
  .hc-scene.is-active,
  .hc-slide.is-active .hc-eyebrow,
  .hc-slide.is-active .hc-headline,
  .hc-slide.is-active .hc-actions,
  .hc-slide.is-active .hc-meta-row .hc-meta,
  .hc-scene.is-active .hc-fcard,
  .hc-scene.is-active .hc-fcard.d1,
  .hc-scene.is-active .hc-fcard.d2,
  .hc-btn-primary,
  .hc-dot::after,
  .hc-dotnav.is-active::after {
    animation: none !important;
  }
  .hc-headline em { transition: none !important; background-size: 100% .18em !important; }
}

</style>
