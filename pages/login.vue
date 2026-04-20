<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { ref, onMounted, onUnmounted } from 'vue'

const authStore = useAuthStore()
const route = useRoute()
const { t } = useI18n({ useScope: 'global' })
const year = new Date().getFullYear()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

definePageMeta({
  middleware: 'saas-only',
  layout: 'marketing',
  title: 'Login - Swekly'
})

async function handleLogin() {
  loading.value = true
  errorMessage.value = ''
  
  try {
    const success = await authStore.login(email.value, password.value)
    if (success) {
      const nextPath = typeof route.query.next === 'string' ? route.query.next : '/admin'
      const safeNext = nextPath.startsWith('/') ? nextPath : '/admin'
      await navigateTo(safeNext)
    } else {
      errorMessage.value = t('auth.login.errors.invalidCredentials')
    }
  } catch {
    errorMessage.value = t('auth.login.errors.generic')
  } finally {
    loading.value = false
  }
}

// ── Carousel ──────────────────────────────────────────────────────────────────
const features = [
  {
    icon: 'lucide:trending-up',
    color: 'emerald',
    titleKey: 'auth.login.hero.carousel.revenue.title',
    descKey:  'auth.login.hero.carousel.revenue.description',
  },
  {
    icon: 'lucide:package',
    color: 'teal',
    titleKey: 'auth.login.hero.carousel.orders.title',
    descKey:  'auth.login.hero.carousel.orders.description',
  },
  {
    icon: 'lucide:layers',
    color: 'violet',
    titleKey: 'auth.login.hero.carousel.catalog.title',
    descKey:  'auth.login.hero.carousel.catalog.description',
  },
  {
    icon: 'lucide:truck',
    color: 'sky',
    titleKey: 'auth.login.hero.carousel.shipping.title',
    descKey:  'auth.login.hero.carousel.shipping.description',
  },
  {
    icon: 'lucide:bar-chart-2',
    color: 'amber',
    titleKey: 'auth.login.hero.carousel.analytics.title',
    descKey:  'auth.login.hero.carousel.analytics.description',
  },
]

const activeIndex = ref(0)
const isTransitioning = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

function goTo(index: number) {
  if (isTransitioning.value || index === activeIndex.value) return
  isTransitioning.value = true
  setTimeout(() => {
    activeIndex.value = index
    isTransitioning.value = false
  }, 300)
}

function next() {
  goTo((activeIndex.value + 1) % features.length)
}

function startTimer() {
  timer = setInterval(next, 4000)
}

function stopTimer() {
  if (timer) clearInterval(timer)
}

onMounted(startTimer)
onUnmounted(stopTimer)

const colorMap: Record<string, { bg: string; icon: string; dot: string }> = {
  emerald: { bg: 'bg-emerald-500/15', icon: 'text-emerald-700', dot: 'bg-emerald-600' },
  teal: { bg: 'bg-teal-500/15', icon: 'text-teal-700', dot: 'bg-teal-600' },
  violet: { bg: 'bg-orange-500/15', icon: 'text-orange-700', dot: 'bg-orange-600' },
  sky: { bg: 'bg-amber-500/15', icon: 'text-amber-700', dot: 'bg-amber-600' },
  amber: { bg: 'bg-orange-500/15', icon: 'text-orange-700', dot: 'bg-orange-600' }
}
</script>

<template>
  <div class="login-page min-h-screen flex font-sans">
    <aside class="auth-side hidden lg:flex lg:w-1/2 relative overflow-hidden p-10 xl:p-12 text-[#0D1F1A]">
      <div class="auth-side__grid" />
      <div class="auth-side__noise" />
      <div class="auth-side__orb auth-side__orb--mint animate-blob" />
      <div class="auth-side__orb auth-side__orb--orange animate-blob animation-delay-2000" />

      <div class="relative z-10 flex h-full w-full flex-col">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#0D1F1A]/25 bg-[#FF7A45]">
              <Icon name="lucide:zap" class="h-4 w-4 text-white" />
            </div>
            <span class="text-lg font-extrabold tracking-tight">Swekly</span>
          </div>
          <span class="rounded-full border border-[#0D1F1A]/18 bg-[#FFF8E7]/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0D1F1A]/65">
            {{ t('auth.login.hero.panel.badge') }}
          </span>
        </div>

        <div class="mt-10 max-w-xl">
          <h2 class="auth-side__title">
            {{ t('auth.login.hero.title') }}
          </h2>
          <p class="mt-4 text-base leading-relaxed text-[#0D1F1A]/65">
            {{ t('auth.login.hero.tagline') }}
          </p>
        </div>

        <div class="mt-8 grid grid-cols-3 gap-3">
          <div
            v-for="(feat, idx) in features.slice(0, 3)"
            :key="`metric-${idx}`"
            class="rounded-xl border border-[#0D1F1A]/15 bg-[#FFF8E7]/80 px-3 py-3 shadow-[0_8px_20px_-16px_rgba(13,31,26,0.45)]"
          >
            <div class="mb-2 h-1.5 w-8 rounded-full" :class="colorMap[feat.color].dot" />
            <p class="text-[11px] font-semibold leading-tight text-[#0D1F1A]/70">
              {{ t(feat.titleKey) }}
            </p>
          </div>
        </div>

        <div class="mt-8 flex-1" @mouseenter="stopTimer" @mouseleave="startTimer">
          <Transition name="panel-swap" mode="out-in">
            <article :key="activeIndex" class="auth-side__spotlight">
              <div class="flex items-start gap-4">
                <div class="auth-side__spotlight-icon" :class="colorMap[features[activeIndex].color].bg">
                  <Icon :name="features[activeIndex].icon" class="h-7 w-7" :class="colorMap[features[activeIndex].color].icon" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#0D1F1A]/45">
                    {{ t('auth.login.hero.panel.focusArea') }}
                  </p>
                  <h4 class="text-2xl font-black leading-tight text-[#0D1F1A]">
                    {{ t(features[activeIndex].titleKey) }}
                  </h4>
                  <p class="mt-3 text-sm leading-relaxed text-[#0D1F1A]/63">
                    {{ t(features[activeIndex].descKey) }}
                  </p>
                </div>
              </div>
            </article>
          </Transition>

          <div class="mt-5 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button
                v-for="(f, i) in features"
                :key="i"
                class="auth-side__dot"
                :class="i === activeIndex ? `w-7 ${colorMap[f.color].dot}` : 'w-2.5 bg-[#0D1F1A]/25 hover:bg-[#0D1F1A]/45'"
                @click="() => { stopTimer(); goTo(i); startTimer() }"
              />
            </div>
            <div class="flex items-center gap-2">
              <button class="auth-side__nav-btn" @click="() => { stopTimer(); goTo((activeIndex - 1 + features.length) % features.length); startTimer() }">
                <Icon name="lucide:chevron-left" class="h-4 w-4 text-[#0D1F1A]/85" />
              </button>
              <button class="auth-side__nav-btn" @click="() => { stopTimer(); next(); startTimer() }">
                <Icon name="lucide:chevron-right" class="h-4 w-4 text-[#0D1F1A]/85" />
              </button>
            </div>
          </div>
        </div>

        <div class="mt-6 text-xs text-[#0D1F1A]/55">
          {{ t('auth.login.hero.copyright', { year }) }}
        </div>
      </div>
    </aside>

    <section class="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10">
      <div class="w-full max-w-md rounded-3xl border-2 border-[#0D1F1A] bg-[#FFFDF4] p-7 sm:p-8 shadow-[7px_7px_0_#0D1F1A]">
        <div class="mb-8 text-center lg:text-left">
          <h2 class="text-3xl font-black tracking-tight text-[#0D1F1A]">
            {{ t('auth.login.form.title') }}
          </h2>
          <p class="mt-2 text-[#0D1F1A]/65">
            {{ t('auth.login.form.subtitle') }}
          </p>
        </div>

        <form class="space-y-6" @submit.prevent="handleLogin">
          <div class="grid grid-cols-3 gap-3">
            <button type="button" class="auth-provider-btn">
              <Icon name="logos:google-icon" class="h-5 w-5" />
            </button>
            <button type="button" class="auth-provider-btn">
              <Icon name="logos:apple" class="h-5 w-5" />
            </button>
            <button type="button" class="auth-provider-btn">
              <Icon name="logos:facebook" class="h-5 w-5" />
            </button>
          </div>

          <div class="relative">
            <div class="absolute inset-0 flex items-center" aria-hidden="true">
              <div class="w-full border-t border-[#0D1F1A]/15" />
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="bg-[#FFFDF4] px-2 text-[#0D1F1A]/55">{{ t('auth.login.form.orContinueWith') }}</span>
            </div>
          </div>

          <div class="space-y-5">
            <div>
              <label for="email-address" class="mb-1 block text-sm font-semibold text-[#0D1F1A]">{{ t('auth.login.form.email.label') }}</label>
              <input id="email-address" v-model="email" name="email" type="email" autocomplete="email" required class="auth-input" :placeholder="t('auth.login.form.email.placeholder')">
            </div>

            <div>
              <div class="mb-1 flex items-center justify-between">
                <label for="password" class="block text-sm font-semibold text-[#0D1F1A]">{{ t('auth.login.form.password.label') }}</label>
                <a href="#" class="text-sm font-semibold text-[#FF7A45] hover:underline">{{ t('auth.login.form.password.forgot') }}</a>
              </div>
              <input id="password" v-model="password" name="password" type="password" autocomplete="current-password" required class="auth-input" placeholder="••••••••">
            </div>
          </div>

          <div v-if="errorMessage" class="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <Icon name="lucide:alert-circle" class="h-5 w-5 flex-shrink-0 text-red-500" />
            <span class="text-sm font-medium text-red-700">{{ errorMessage }}</span>
          </div>

          <button type="submit" :disabled="loading" class="auth-submit-btn">
            <span v-if="loading" class="flex items-center gap-2">
              <Icon name="lucide:loader-2" class="h-5 w-5 animate-spin text-white" />
              {{ t('auth.login.form.submit.signingIn') }}
            </span>
            <span v-else>{{ t('auth.login.form.submit.signIn') }}</span>
          </button>

          <div class="text-center text-sm text-[#0D1F1A]/65">
            {{ t('auth.login.form.noAccount') }}
            <NuxtLink to="/register" class="font-semibold text-[#FF7A45] hover:underline">
              {{ t('auth.login.form.startFree') }}
            </NuxtLink>
          </div>
        </form>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  background: #FFF8E7;
}

.auth-side {
  background: linear-gradient(165deg, #FDEDCF 0%, #F4E1C7 52%, #EEDFC9 100%);
}

.auth-side__grid {
  position: absolute;
  inset: 0;
  opacity: 0.4;
  background-image:
    linear-gradient(rgba(13, 31, 26, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(13, 31, 26, 0.08) 1px, transparent 1px);
  background-size: 38px 38px;
  mask-image: radial-gradient(circle at 35% 30%, black 30%, transparent 85%);
}

.auth-side__noise {
  position: absolute;
  inset: 0;
  opacity: 0.26;
  background-image: radial-gradient(rgba(13, 31, 26, 0.12) 0.8px, transparent 0.8px);
  background-size: 7px 7px;
  mix-blend-mode: multiply;
}

.auth-side__orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(90px);
}

.auth-side__orb--mint {
  top: 8%;
  left: 9%;
  width: 48%;
  height: 46%;
  background: rgba(31, 157, 142, 0.2);
}

.auth-side__orb--orange {
  right: 8%;
  bottom: 9%;
  width: 46%;
  height: 44%;
  background: rgba(255, 122, 69, 0.18);
}

.auth-side__title {
  font-size: clamp(2.2rem, 4.2vw, 3.25rem);
  line-height: 1.02;
  letter-spacing: -0.03em;
  font-weight: 900;
}

.auth-side__spotlight {
  border: 1px solid rgba(13, 31, 26, 0.14);
  background: linear-gradient(140deg, rgba(255, 248, 231, 0.92), rgba(255, 248, 231, 0.76));
  border-radius: 1.25rem;
  padding: 1.35rem;
  box-shadow: 0 18px 40px -28px rgba(13, 31, 26, 0.55);
}

.auth-side__spotlight-icon {
  height: 3.5rem;
  width: 3.5rem;
  flex-shrink: 0;
  border-radius: 0.95rem;
  border: 1px solid rgba(13, 31, 26, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-side__dot {
  height: 0.45rem;
  border-radius: 999px;
  transition: width 0.25s ease, opacity 0.25s ease, background 0.25s ease;
}

.auth-side__nav-btn {
  height: 2rem;
  width: 2rem;
  border-radius: 999px;
  border: 1px solid rgba(13, 31, 26, 0.18);
  background: rgba(255, 248, 231, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, transform 0.2s ease;
}

.auth-side__nav-btn:hover {
  transform: translateY(-1px);
  background: rgba(255, 248, 231, 0.95);
}

.animate-blob {
  animation: blob 10s infinite alternate;
}
.animation-delay-2000 {
  animation-delay: 2s;
}

@keyframes blob {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(20px, -20px) scale(1.1); }
  100% { transform: translate(-20px, 20px) scale(0.9); }
}

.panel-swap-enter-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}
.panel-swap-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.panel-swap-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.panel-swap-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.auth-provider-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(13, 31, 26, 0.2);
  border-radius: 0.8rem;
  background: #FFF8E7;
  padding: 0.62rem 1rem;
  transition: background 0.2s ease, transform 0.2s ease;
}

.auth-provider-btn:hover {
  background: #F5EDD3;
  transform: translateY(-1px);
}

.auth-input {
  width: 100%;
  border: 2px solid rgba(13, 31, 26, 0.22);
  border-radius: 0.8rem;
  background: #FFF8E7;
  color: #0D1F1A;
  padding: 0.75rem 1rem;
  outline: none;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.auth-input::placeholder {
  color: rgba(13, 31, 26, 0.45);
}

.auth-input:focus {
  border-color: #FF7A45;
  box-shadow: 0 0 0 4px rgba(255, 122, 69, 0.15);
}

.auth-submit-btn {
  width: 100%;
  display: flex;
  justify-content: center;
  border: 2px solid #0D1F1A;
  border-radius: 0.8rem;
  background: #FF7A45;
  color: #fff;
  padding: 0.85rem 1rem;
  font-size: 0.9rem;
  font-weight: 800;
  transition: transform 0.2s ease, opacity 0.2s ease;
  box-shadow: 4px 4px 0 #0D1F1A;
}

.auth-submit-btn:hover:not(:disabled) {
  transform: translate(-1px, -1px);
}

.auth-submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

</style>
