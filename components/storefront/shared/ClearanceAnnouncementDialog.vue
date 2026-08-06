<script setup lang="ts">
const dialog = useClearanceAnnouncementDialog()
const storeSettings = useState<any>('storeSettings')
const { t } = useI18n({ useScope: 'global' })

const multiple = computed(() => {
  const raw = Number(storeSettings.value?.clearanceMultiple)
  return Number.isFinite(raw) && raw > 0 ? raw : 6
})
const divisor = computed(() => {
  const raw = Number(storeSettings.value?.clearanceDivisor)
  return Number.isFinite(raw) && raw > 0 ? raw : 3
})
const freeCount = computed(() => Math.max(1, Math.floor(multiple.value / divisor.value)))

const bodyText = computed(() =>
  t('storefront.clearance.dialogBody', {
    multiple: multiple.value,
    free: freeCount.value,
    multiple2: multiple.value * 2,
    free2: freeCount.value * 2,
    multiple4: multiple.value * 4,
    free4: freeCount.value * 4
  })
)

onMounted(() => {
  dialog.maybeShow()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="cl-backdrop">
      <div
        v-if="dialog.isVisible.value"
        class="cl-backdrop fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-5"
        @click.self="dialog.dismiss()"
      >
        <Transition name="cl-panel" appear>
          <div
            v-if="dialog.isVisible.value"
            class="cl-panel relative w-full sm:max-w-[25rem] overflow-hidden rounded-t-[32px] sm:rounded-[32px]"
          >
            <!-- Ambient light -->
            <span class="cl-aurora cl-aurora--a" aria-hidden="true" />
            <span class="cl-aurora cl-aurora--b" aria-hidden="true" />
            <span class="cl-glass-edge" aria-hidden="true" />
            <span class="cl-pane-sheen" aria-hidden="true" />

            <Icon name="lucide:sparkle" class="cl-mote cl-mote--1 absolute w-3.5 h-3.5" aria-hidden="true" />
            <Icon name="lucide:sparkle" class="cl-mote cl-mote--2 absolute w-2.5 h-2.5" aria-hidden="true" />
            <Icon name="lucide:sparkle" class="cl-mote cl-mote--3 absolute w-3 h-3" aria-hidden="true" />

            <!-- Sheet grabber (mobile) -->
            <span class="cl-grabber sm:hidden" aria-hidden="true" />

            <button
              type="button"
              class="cl-close absolute top-4 end-4 rtl:right-auto rtl:left-4 z-30 flex items-center justify-center w-8 h-8 rounded-full text-stone-400"
              :aria-label="t('storefront.clearance.dialogDismissAria')"
              @click="dialog.dismiss()"
            >
              <Icon name="lucide:x" class="w-4 h-4" />
            </button>

            <div class="relative z-10 px-7 pt-10 pb-8 sm:px-9 sm:pt-11 text-center">
              <!-- Emblem -->
              <div class="cl-emblem-wrap relative inline-flex items-center justify-center">
                <span class="cl-halo" aria-hidden="true" />
                <span class="cl-arc" aria-hidden="true" />
                <span class="cl-emblem relative flex items-center justify-center w-[4.5rem] h-[4.5rem] rounded-full">
                  <Icon name="lucide:gift" class="cl-emblem-icon w-8 h-8" />
                </span>
              </div>

              <!-- Badge -->
              <div class="cl-rise cl-rise--1 mt-6">
                <span class="cl-badge inline-flex items-center gap-2 ps-2.5 pe-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]">
                  <span class="cl-dot relative w-1.5 h-1.5 rounded-full" />
                  {{ t('storefront.clearance.badge') }}
                </span>
              </div>

              <h2 class="cl-rise cl-rise--2 mt-4 text-[1.6rem] sm:text-[1.75rem] font-extrabold text-stone-900 leading-[1.15] tracking-tight">
                {{ t('storefront.clearance.dialogTitle') }}
              </h2>

              <!-- Coupon -->
              <div class="cl-rise cl-rise--3 mt-6">
                <div class="cl-coupon-wrap">
                <div class="cl-coupon grid grid-cols-[1fr_auto_1fr] items-center gap-1 px-3 py-5">
                  <div class="flex flex-col items-center gap-1.5">
                    <span class="text-[2.35rem] font-black text-stone-800 leading-none tabular-nums">{{ multiple }}</span>
                    <span class="text-[9.5px] uppercase tracking-[0.16em] text-stone-400 font-bold">{{ t('storefront.clearance.dialogBuyLabel', 'achetés') }}</span>
                  </div>

                  <span class="cl-perf self-stretch" aria-hidden="true" />

                  <div class="cl-gift flex flex-col items-center gap-1.5">
                    <span class="cl-gift-number relative text-[2.35rem] font-black leading-none tabular-nums">{{ freeCount }}</span>
                    <span class="relative text-[9.5px] uppercase tracking-[0.16em] text-amber-600/90 font-bold">{{ t('storefront.clearance.dialogFreeLabel', 'offerts') }}</span>
                  </div>
                </div>
                </div>
              </div>

              <p class="cl-rise cl-rise--4 mt-5 text-[0.82rem] text-stone-500 leading-relaxed max-w-[19rem] mx-auto">
                {{ bodyText }}
              </p>

              <button
                type="button"
                class="cl-cta cl-rise cl-rise--5 relative w-full overflow-hidden mt-7 px-6 py-3.5 rounded-2xl text-white text-[0.8rem] font-extrabold uppercase tracking-[0.1em]"
                @click="dialog.dismiss()"
              >
                <span class="relative z-10">{{ t('storefront.clearance.dialogCta') }}</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ==================================================================
   Backdrop — warm bloom instead of flat grey
================================================================== */
.cl-backdrop {
  background:
    radial-gradient(85% 65% at 50% 45%, rgba(124, 74, 24, 0.38) 0%, transparent 72%),
    rgba(28, 25, 23, 0.62);
  backdrop-filter: blur(12px) saturate(120%);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
}

.cl-backdrop-enter-active { animation: cl-veil 0.7s cubic-bezier(0.22, 1, 0.36, 1); }
.cl-backdrop-leave-active { animation: cl-veil 0.4s cubic-bezier(0.4, 0, 1, 1) reverse; }

@keyframes cl-veil {
  from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
  to   { opacity: 1; backdrop-filter: blur(12px) saturate(120%); -webkit-backdrop-filter: blur(12px) saturate(120%); }
}

/* ==================================================================
   Panel — one continuous warm ivory surface, no header/body split
================================================================== */
.cl-panel {
  background:
    linear-gradient(180deg, #fff6e9 0%, #fffcf7 30%, #ffffff 62%);
  box-shadow:
    0 40px 80px -32px rgba(69, 26, 3, 0.45),
    0 2px 10px -4px rgba(69, 26, 3, 0.18);
}

.cl-glass-edge {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 20;
  box-shadow:
    inset 0 0 0 1px rgba(180, 83, 9, 0.09),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.cl-panel-enter-active { animation: cl-surface 0.95s cubic-bezier(0.19, 1, 0.22, 1) both; }
.cl-panel-leave-active { animation: cl-sink 0.36s cubic-bezier(0.4, 0, 0.6, 1) both; }

@keyframes cl-surface {
  0%   { opacity: 0; transform: translate3d(0, 48px, 0) scale(0.97); filter: blur(16px); }
  55%  { opacity: 1; filter: blur(0); }
  100% { opacity: 1; transform: none; filter: blur(0); }
}
@keyframes cl-sink {
  to { opacity: 0; transform: translate3d(0, 20px, 0) scale(0.985); filter: blur(6px); }
}

@media (min-width: 640px) {
  @keyframes cl-surface {
    0%   { opacity: 0; transform: translate3d(0, 24px, 0) scale(0.94); filter: blur(18px); }
    55%  { opacity: 1; filter: blur(0); }
    100% { opacity: 1; transform: none; filter: blur(0); }
  }
}

/* A single pane of light glides across, once, on arrival */
.cl-pane-sheen {
  position: absolute;
  inset: -40% -12%;
  z-index: 25;
  pointer-events: none;
  background: linear-gradient(104deg, transparent 38%, rgba(255, 255, 255, 0.75) 50%, transparent 62%);
  filter: blur(10px);
  opacity: 0;
  animation: cl-pane 1.7s cubic-bezier(0.33, 0, 0.2, 1) 0.34s 1 both;
}
@keyframes cl-pane {
  0%   { opacity: 0; transform: translate3d(-75%, 0, 0); }
  22%  { opacity: 1; }
  74%  { opacity: 1; }
  100% { opacity: 0; transform: translate3d(75%, 0, 0); }
}

/* ==================================================================
   Ambient aurora — soft drifting orbs behind the top of the card
================================================================== */
.cl-aurora {
  position: absolute;
  border-radius: 9999px;
  pointer-events: none;
  filter: blur(42px);
}
.cl-aurora--a {
  top: -22%;
  left: -14%;
  width: 68%;
  height: 46%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.55) 0%, rgba(251, 191, 36, 0) 70%);
  animation: cl-drift-a 23s ease-in-out infinite alternate;
}
.cl-aurora--b {
  top: -14%;
  right: -18%;
  width: 62%;
  height: 42%;
  background: radial-gradient(circle, rgba(251, 146, 120, 0.3) 0%, rgba(251, 146, 120, 0) 70%);
  animation: cl-drift-b 29s ease-in-out infinite alternate;
}

@keyframes cl-drift-a {
  0%   { transform: translate3d(0, 0, 0) scale(1); opacity: 0.75; }
  50%  { transform: translate3d(14%, 8%, 0) scale(1.18); opacity: 1; }
  100% { transform: translate3d(-6%, 12%, 0) scale(1.06); opacity: 0.8; }
}
@keyframes cl-drift-b {
  0%   { transform: translate3d(0, 0, 0) scale(1.08); opacity: 0.6; }
  50%  { transform: translate3d(-16%, 10%, 0) scale(1.24); opacity: 0.95; }
  100% { transform: translate3d(5%, -6%, 0) scale(1.02); opacity: 0.65; }
}

/* Gold motes — three unsynchronised drifts */
.cl-mote {
  color: rgba(217, 119, 6, 0.5);
  z-index: 5;
  pointer-events: none;
}
.cl-mote--1 { top: 9%;  left: 13%;  animation: cl-mote-1 14s ease-in-out infinite; }
.cl-mote--2 { top: 16%; right: 15%; animation: cl-mote-2 18s ease-in-out infinite; }
.cl-mote--3 { top: 27%; left: 24%;  animation: cl-mote-3 21s ease-in-out infinite; }

@keyframes cl-mote-1 {
  0%   { transform: none; opacity: 0.15; }
  25%  { opacity: 0.8; }
  50%  { transform: translate3d(12px, -18px, 0) rotate(30deg) scale(1.2); opacity: 0.35; }
  76%  { opacity: 0.7; }
  100% { transform: rotate(64deg) scale(0.85); opacity: 0.15; }
}
@keyframes cl-mote-2 {
  0%   { transform: none; opacity: 0.6; }
  32%  { transform: translate3d(-9px, 14px, 0) rotate(-26deg) scale(0.7); opacity: 0.15; }
  66%  { transform: translate3d(5px, 22px, 0) rotate(-44deg) scale(1.22); opacity: 0.75; }
  100% { transform: rotate(-76deg); opacity: 0.6; }
}
@keyframes cl-mote-3 {
  0%   { transform: scale(1.05); opacity: 0.3; }
  38%  { transform: translate3d(18px, -10px, 0) rotate(36deg) scale(0.78); opacity: 0.7; }
  72%  { transform: translate3d(-7px, -22px, 0) rotate(14deg) scale(1.18); opacity: 0.2; }
  100% { transform: rotate(50deg) scale(1.05); opacity: 0.3; }
}

/* ==================================================================
   Sheet grabber
================================================================== */
.cl-grabber {
  position: absolute;
  top: 10px;
  left: 50%;
  z-index: 30;
  width: 38px;
  height: 4px;
  border-radius: 9999px;
  background: rgba(120, 83, 44, 0.18);
  transform: translateX(-50%);
}

/* ==================================================================
   Close
================================================================== */
.cl-close {
  background: rgba(255, 255, 255, 0.7);
  box-shadow: inset 0 0 0 1px rgba(120, 83, 44, 0.12);
  backdrop-filter: blur(6px);
  transition: color 0.3s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.3s ease;
  animation: cl-rise 0.7s ease-out 0.6s both;
}
.cl-close:hover {
  color: #a16207;
  background: #fff;
  transform: rotate(90deg);
}

/* ==================================================================
   Emblem — gold ring, breathing halo, a light travelling the rim
================================================================== */
.cl-emblem-wrap {
  animation: cl-bloom 1.15s cubic-bezier(0.19, 1, 0.22, 1) 0.3s both;
}

.cl-emblem {
  background: linear-gradient(160deg, #ffffff 0%, #fff4e0 100%);
  box-shadow:
    inset 0 0 0 1px rgba(217, 119, 6, 0.16),
    inset 0 1px 2px rgba(255, 255, 255, 0.9),
    0 14px 30px -16px rgba(180, 83, 9, 0.55);
  color: #d97706;
}

.cl-halo {
  position: absolute;
  inset: -18%;
  border-radius: 9999px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.42) 0%, rgba(251, 191, 36, 0) 68%);
  animation: cl-breathe 7s cubic-bezier(0.45, 0, 0.35, 1) infinite;
}

.cl-arc {
  position: absolute;
  inset: -5px;
  border-radius: 9999px;
  overflow: hidden;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(245, 158, 11, 0.85) 30deg,
    rgba(251, 191, 36, 0.2) 70deg,
    transparent 116deg
  );
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
  animation: cl-orbit 10s linear infinite;
}

.cl-emblem-icon {
  transform-origin: 50% 62%;
  animation: cl-sway 8s cubic-bezier(0.45, 0, 0.35, 1) infinite;
}

@keyframes cl-bloom {
  from { opacity: 0; transform: scale(0.68); filter: blur(12px); }
  to   { opacity: 1; transform: scale(1); filter: blur(0); }
}
@keyframes cl-breathe {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50%      { opacity: 0.95; transform: scale(1.22); }
}
@keyframes cl-orbit { to { transform: rotate(360deg); } }
@keyframes cl-sway {
  0%, 100% { transform: rotate(-5deg) translateY(0); }
  50%      { transform: rotate(5deg) translateY(-2px); }
}

/* ==================================================================
   Badge
================================================================== */
.cl-badge {
  color: #b45309;
  background: rgba(255, 251, 235, 0.9);
  box-shadow: inset 0 0 0 1px rgba(217, 119, 6, 0.2);
}
.cl-dot {
  background: #f59e0b;
  animation: cl-beacon 3.8s cubic-bezier(0.45, 0, 0.35, 1) infinite;
}
.cl-dot::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 9999px;
  background: rgba(245, 158, 11, 0.5);
  animation: cl-ripple 3.8s cubic-bezier(0.16, 0.8, 0.3, 1) infinite;
}

@keyframes cl-beacon {
  0%, 100% { opacity: 0.5; transform: scale(0.88); }
  40%      { opacity: 1; transform: scale(1); }
}
@keyframes cl-ripple {
  0%   { opacity: 0.55; transform: scale(0.6); }
  60%  { opacity: 0; transform: scale(2.5); }
  100% { opacity: 0; transform: scale(2.5); }
}

/* ==================================================================
   Coupon — a real ticket: punched edges + perforation line
================================================================== */
/* Shadow lives on the wrapper so it follows the punched silhouette */
.cl-coupon-wrap {
  filter: drop-shadow(0 1px 0 rgba(217, 119, 6, 0.16)) drop-shadow(0 14px 18px rgba(120, 53, 15, 0.12));
}

.cl-coupon {
  position: relative;
  border-radius: 20px;
  background: linear-gradient(165deg, #fffdf8 0%, #fff1da 100%);
  -webkit-mask-image:
    radial-gradient(circle 11px at 0% 50%, transparent 97%, #000 100%),
    radial-gradient(circle 11px at 100% 50%, transparent 97%, #000 100%);
  -webkit-mask-composite: source-in;
  -webkit-mask-repeat: no-repeat;
  mask-image:
    radial-gradient(circle 11px at 0% 50%, transparent 97%, #000 100%),
    radial-gradient(circle 11px at 100% 50%, transparent 97%, #000 100%);
  mask-composite: intersect;
  mask-repeat: no-repeat;
}

.cl-perf {
  width: 1px;
  background-image: linear-gradient(rgba(217, 119, 6, 0.42) 0 5px, transparent 5px 11px);
  background-size: 1px 11px;
  background-repeat: repeat-y;
  margin: 2px 6px;
}

.cl-gift-number {
  background: linear-gradient(150deg, #f59e0b 0%, #d97706 55%, #ea580c 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.cl-gift {
  position: relative;
  border-radius: 16px;
  padding: 6px 4px;
}
.cl-gift::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(60% 70% at 50% 50%, rgba(251, 191, 36, 0.3) 0%, rgba(251, 191, 36, 0) 72%);
  animation: cl-gift-glow 7s cubic-bezier(0.45, 0, 0.35, 1) infinite;
}
@keyframes cl-gift-glow {
  0%, 100% { opacity: 0.15; transform: scale(0.85); }
  50%      { opacity: 1; transform: scale(1.15); }
}

/* ==================================================================
   Staggered reveal — content resolves out of a soft blur
================================================================== */
.cl-rise {
  opacity: 0;
  animation: cl-rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.cl-rise--1 { animation-delay: 0.5s; }
.cl-rise--2 { animation-delay: 0.6s; }
.cl-rise--3 { animation-delay: 0.72s; }
.cl-rise--4 { animation-delay: 0.84s; }
.cl-rise--5 { animation-delay: 0.94s; }

@keyframes cl-rise {
  from { opacity: 0; transform: translate3d(0, 14px, 0); filter: blur(9px); }
  to   { opacity: 1; transform: none; filter: blur(0); }
}

/* ==================================================================
   CTA
================================================================== */
.cl-cta {
  background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
  box-shadow: 0 12px 30px -14px rgba(234, 88, 12, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.28);
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.45s ease;
  animation:
    cl-rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.94s forwards,
    cl-aura 6s cubic-bezier(0.45, 0, 0.35, 1) 1.9s infinite;
}
.cl-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 36px -14px rgba(234, 88, 12, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.28);
}
.cl-cta:active { transform: translateY(0) scale(0.985); }
.cl-cta::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(112deg, transparent 34%, rgba(255, 255, 255, 0.4) 48%, transparent 62%);
  transform: translateX(-135%);
  animation: cl-cta-sheen 6.5s cubic-bezier(0.4, 0, 0.3, 1) 2.6s infinite;
}

@keyframes cl-aura {
  0%, 100% { box-shadow: 0 12px 30px -14px rgba(234, 88, 12, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.28); }
  50%      { box-shadow: 0 18px 42px -14px rgba(234, 88, 12, 1), inset 0 1px 0 rgba(255, 255, 255, 0.28); }
}
@keyframes cl-cta-sheen {
  0%, 74% { transform: translateX(-135%); }
  100%    { transform: translateX(135%); }
}

/* ================================================================== */
@media (prefers-reduced-motion: reduce) {
  .cl-backdrop-enter-active,
  .cl-backdrop-leave-active,
  .cl-panel-enter-active,
  .cl-panel-leave-active,
  .cl-pane-sheen,
  .cl-aurora,
  .cl-mote,
  .cl-close,
  .cl-emblem-wrap,
  .cl-halo,
  .cl-arc,
  .cl-emblem-icon,
  .cl-dot,
  .cl-dot::after,
  .cl-gift::before,
  .cl-rise,
  .cl-cta,
  .cl-cta::after {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
  }
  .cl-pane-sheen { opacity: 0 !important; }
  .cl-mote { opacity: 0.4 !important; }
  .cl-gift::before { opacity: 0.45 !important; }
}
</style>
