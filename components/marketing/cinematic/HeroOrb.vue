<template>
  <div class="hero-3d" aria-hidden="true">
    <!-- Ambient halo -->
    <div class="hero-3d__halo" />

    <!-- Stage -->
    <div class="hero-3d__stage">
      <!-- Floating product chip — top left -->
      <div class="hero-3d__chip hero-3d__chip--tl">
        <div class="hero-3d__chip-thumb">
          <Icon name="lucide:shirt" class="h-4 w-4 text-lime-neon" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--m-text-faint)]">SKU 4012</div>
          <div class="cinematic-mono-num text-xs text-white">2 450 DA</div>
        </div>
        <span class="ml-auto h-1.5 w-1.5 rounded-full bg-lime-neon shadow-[0_0_8px_rgba(198,244,50,0.8)]" />
      </div>

      <!-- Order notification — top right -->
      <div class="hero-3d__chip hero-3d__chip--tr">
        <Icon name="lucide:bell" class="h-3.5 w-3.5 text-lime-neon" />
        <div class="min-w-0">
          <div class="text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--m-text-faint)]">NEW ORDER</div>
          <div class="text-xs text-white">+ Yasmine, Algiers</div>
        </div>
      </div>

      <!-- Center 3D parcel -->
      <div class="hero-3d__parcel">
        <div class="hero-3d__parcel-face hero-3d__parcel-face--top">
          <div class="hero-3d__parcel-tape" />
        </div>
        <div class="hero-3d__parcel-face hero-3d__parcel-face--front">
          <div class="hero-3d__parcel-label">
            <div class="text-[9px] font-mono uppercase tracking-[0.22em] text-[color:var(--m-text-faint)]">SWEKLY · DZ</div>
            <div class="mt-1 flex items-center gap-1.5">
              <Icon name="lucide:hexagon" class="h-3 w-3 text-lime-neon" />
              <span class="text-xs font-medium text-white">#10 247</span>
            </div>
            <div class="mt-2 flex gap-0.5">
              <span v-for="n in 8" :key="n" class="h-3 w-0.5 bg-white/70" :class="n % 3 === 0 ? 'h-3.5 w-[3px]' : ''" />
            </div>
          </div>
          <div class="hero-3d__parcel-tape hero-3d__parcel-tape--front" />
        </div>
        <div class="hero-3d__parcel-face hero-3d__parcel-face--side" />

        <!-- Bag handle -->
        <svg class="hero-3d__bag-arc" viewBox="0 0 100 60" fill="none">
          <path d="M 18 56 Q 50 -8 82 56" stroke="rgba(198,244,50,0.45)" stroke-width="1.2" stroke-dasharray="2 4" />
        </svg>
      </div>

      <!-- Cart bubble — bottom left -->
      <div class="hero-3d__chip hero-3d__chip--bl">
        <Icon name="lucide:shopping-cart" class="h-3.5 w-3.5 text-lime-neon" />
        <div class="cinematic-mono-num text-xs text-white">3 items</div>
        <div class="ml-auto rounded-full border border-lime-neon/40 bg-lime-neon/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-lime-neon">live</div>
      </div>

      <!-- Delivery — bottom right -->
      <div class="hero-3d__chip hero-3d__chip--br">
        <Icon name="lucide:truck" class="h-3.5 w-3.5 text-lime-neon" />
        <div class="min-w-0">
          <div class="text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--m-text-faint)]">SHIPPED</div>
          <div class="text-xs text-white">Maystro · 18 min</div>
        </div>
      </div>

      <!-- Orbit lines -->
      <svg class="hero-3d__orbit" viewBox="0 0 400 400" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="orbit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#C6F432" stop-opacity="0.45" />
            <stop offset="100%" stop-color="#C6F432" stop-opacity="0" />
          </linearGradient>
        </defs>
        <ellipse cx="200" cy="200" rx="160" ry="58" stroke="url(#orbit-grad)" stroke-width="0.7" />
        <ellipse cx="200" cy="200" rx="180" ry="70" stroke="rgba(198,244,50,0.12)" stroke-width="0.5" stroke-dasharray="3 6" />
      </svg>
    </div>
  </div>
</template>

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
  background: radial-gradient(circle at 50% 55%, rgba(198, 244, 50, 0.28), transparent 60%);
  filter: blur(28px);
  animation: pulse-glow 5s ease-in-out infinite;
}

.hero-3d__stage {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  animation: hero-stage-float 8s ease-in-out infinite;
}

@keyframes hero-stage-float {
  0%, 100% { transform: translateY(0) rotateX(8deg); }
  50% { transform: translateY(-10px) rotateX(8deg); }
}

.hero-3d__orbit {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  animation: ray-rotate 40s linear infinite;
}

/* Chips */
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

.hero-3d__chip-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 1.6rem;
  width: 1.6rem;
  border-radius: 0.5rem;
  background: rgba(198, 244, 50, 0.08);
  border: 1px solid rgba(198, 244, 50, 0.2);
}

.hero-3d__chip--tl { top: 6%;  left: -4%;  animation-delay: -1s; }
.hero-3d__chip--tr { top: 12%; right: -8%; animation-delay: -3s; }
.hero-3d__chip--bl { bottom: 14%; left: -8%; animation-delay: -2s; }
.hero-3d__chip--br { bottom: 6%; right: -2%; animation-delay: -4s; }

@keyframes chip-bob {
  0%, 100% { transform: translate3d(0, 0, 30px); }
  50%      { transform: translate3d(0, -6px, 30px); }
}

/* 3D parcel */
.hero-3d__parcel {
  position: absolute;
  top: 50%;
  left: 50%;
  width: clamp(140px, 18vw, 200px);
  height: clamp(140px, 18vw, 200px);
  transform: translate(-50%, -50%) rotateX(20deg) rotateY(-25deg);
  transform-style: preserve-3d;
}

.hero-3d__parcel-face {
  position: absolute;
  inset: 0;
  border-radius: 0.6rem;
  background: linear-gradient(160deg, #1a2429, #0a1014);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.hero-3d__parcel-face--top {
  transform: rotateX(90deg) translateZ(calc(clamp(140px, 18vw, 200px) / 2));
  background: linear-gradient(160deg, #2a3439, #14181c);
}

.hero-3d__parcel-face--front {
  transform: translateZ(calc(clamp(140px, 18vw, 200px) / 2));
  display: flex;
  align-items: flex-end;
  padding: 0.9rem;
}

.hero-3d__parcel-face--side {
  transform: rotateY(90deg) translateZ(calc(clamp(140px, 18vw, 200px) / 2));
  background: linear-gradient(160deg, #0e161a, #06090c);
}

.hero-3d__parcel-tape {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 18%;
  transform: translateX(-50%);
  background:
    linear-gradient(90deg, transparent, rgba(198, 244, 50, 0.12), transparent),
    linear-gradient(180deg, rgba(198, 244, 50, 0.4), rgba(198, 244, 50, 0.08));
  border-left: 1px dashed rgba(198, 244, 50, 0.3);
  border-right: 1px dashed rgba(198, 244, 50, 0.3);
}

.hero-3d__parcel-tape--front {
  width: 14%;
  background: linear-gradient(180deg, rgba(198, 244, 50, 0.18), transparent);
}

.hero-3d__parcel-label {
  position: relative;
  z-index: 1;
  width: 100%;
  border-radius: 0.4rem;
  background: rgba(255, 255, 255, 0.92);
  padding: 0.55rem 0.7rem;
  color: #0a1014;
}

.hero-3d__parcel-label .text-white {
  color: #0a1014 !important;
}

.hero-3d__parcel-label .text-\[color\:var\(--m-text-faint\)\] {
  color: rgba(10, 16, 20, 0.55) !important;
}

.hero-3d__parcel-label .bg-white\/70 {
  background: #0a1014 !important;
}

.hero-3d__bag-arc {
  position: absolute;
  inset: -40% 0 auto 0;
  width: 100%;
  height: 60%;
  z-index: -1;
}

@media (prefers-reduced-motion: reduce) {
  .hero-3d__halo,
  .hero-3d__stage,
  .hero-3d__chip,
  .hero-3d__orbit {
    animation: none !important;
  }
}
</style>
