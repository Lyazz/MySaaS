<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { ref, onMounted, onUnmounted } from 'vue'
import SaaSLogo from '~/components/branding/SaaSLogo.vue'

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
  title: 'Login — Swekly'
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

const features = [
  { icon: 'lucide:trending-up', titleKey: 'auth.login.hero.carousel.revenue.title', descKey: 'auth.login.hero.carousel.revenue.description' },
  { icon: 'lucide:package', titleKey: 'auth.login.hero.carousel.orders.title', descKey: 'auth.login.hero.carousel.orders.description' },
  { icon: 'lucide:truck', titleKey: 'auth.login.hero.carousel.shipping.title', descKey: 'auth.login.hero.carousel.shipping.description' },
  { icon: 'lucide:bar-chart-3', titleKey: 'auth.login.hero.carousel.analytics.title', descKey: 'auth.login.hero.carousel.analytics.description' }
]

const activeIndex = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
const next = () => { activeIndex.value = (activeIndex.value + 1) % features.length }
const startTimer = () => { stopTimer(); timer = setInterval(next, 4000) }
const stopTimer = () => { if (timer) clearInterval(timer) }
onMounted(startTimer)
onUnmounted(stopTimer)
</script>

<template>
  <div class="min-h-screen pt-20 pb-12 md:pt-28">
    <div class="cinematic-container !max-w-[80rem]">
      <!--
        Mobile: form comes first (lg:hidden shows form panel first in DOM order)
        Desktop: left=brand panel, right=form
      -->
      <div class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">

        <!-- ─── Left: Brand panel (hidden on mobile, shown on desktop) ─── -->
        <aside class="cinematic-card relative overflow-hidden p-7 md:p-10 hidden lg:flex lg:flex-col" @mouseenter="stopTimer" @mouseleave="startTimer">
          <div class="absolute inset-0 cinematic-grid-bg opacity-50" />
          <div class="relative flex flex-col h-full">
            <div class="flex items-center justify-between">
              <div>
                <span class="cinematic-pill">
                  <span class="cinematic-pill__dot" />
                  {{ t('auth.login.hero.panel.badge') }}
                </span>
                <h1 class="cinematic-headline mt-5 !text-4xl md:!text-5xl">
                  {{ t('auth.login.hero.title') }}
                </h1>
              </div>
              <div class="hidden h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] md:flex">
                <Icon :name="features[activeIndex].icon" class="h-6 w-6 text-lime-neon" />
              </div>
            </div>

            <p class="cinematic-subhead mt-5">{{ t('auth.login.hero.tagline') }}</p>

            <div class="mt-8 grid gap-4 md:grid-cols-[1.08fr_0.92fr] flex-1">
              <div class="cinematic-glass rounded-2xl p-5">
                <div class="cinematic-eyebrow">{{ t('auth.login.hero.panel.focusArea') }}</div>
                <Transition name="fade" mode="out-in">
                  <div :key="activeIndex" class="mt-4">
                    <h2 class="text-2xl font-medium tracking-tight text-white">
                      {{ t(features[activeIndex].titleKey) }}
                    </h2>
                    <p class="mt-3 text-sm leading-relaxed text-[color:var(--m-text-dim)]">
                      {{ t(features[activeIndex].descKey) }}
                    </p>
                  </div>
                </Transition>
                <div class="mt-6 flex gap-2">
                  <button
                    v-for="(feature, index) in features"
                    :key="feature.titleKey"
                    type="button"
                    class="h-1.5 rounded-full transition-all"
                    :class="index === activeIndex ? 'w-8 bg-lime-neon shadow-[0_0_8px_rgba(198,244,50,0.6)]' : 'w-1.5 bg-white/15'"
                    @click="activeIndex = index"
                  />
                </div>
              </div>

              <div class="space-y-4">
                <div class="cinematic-glass rounded-2xl p-5">
                  <div class="cinematic-eyebrow">{{ t('auth.login.hero.side.label') }}</div>
                  <div class="mt-4 space-y-2.5 text-sm text-white/85">
                    <div class="flex items-center gap-2.5">
                      <Icon name="lucide:check" class="h-3.5 w-3.5 flex-none text-lime-neon" />
                      {{ t('auth.login.hero.side.orders') }}
                    </div>
                    <div class="flex items-center gap-2.5">
                      <Icon name="lucide:check" class="h-3.5 w-3.5 flex-none text-lime-neon" />
                      {{ t('auth.login.hero.side.workspace') }}
                    </div>
                    <div class="flex items-center gap-2.5">
                      <Icon name="lucide:check" class="h-3.5 w-3.5 flex-none text-lime-neon" />
                      {{ t('auth.login.hero.side.performance') }}
                    </div>
                  </div>
                </div>

                <div class="cinematic-glass rounded-2xl p-5">
                  <div class="cinematic-eyebrow">{{ t('auth.login.hero.copyright', { year }) }}</div>
                  <div class="mt-4 flex items-end gap-1.5">
                    <div class="auth-bar h-10" />
                    <div class="auth-bar h-16" />
                    <div class="auth-bar h-12" />
                    <div class="auth-bar h-20" />
                    <div class="auth-bar h-14" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- ─── Right: Form (shown first on mobile) ─── -->
        <section class="mx-auto flex w-full max-w-xl items-start lg:items-center">
          <div class="w-full cinematic-card p-7 md:p-9">
            <!-- Header -->
            <div class="mb-7">
              <div class="flex items-center gap-2.5 mb-4">
                <SaaSLogo size="sm" class="shrink-0" />
              </div>
              <h2 class="cinematic-headline mt-1 !text-3xl md:!text-4xl">
                {{ t('auth.login.form.title') }}
              </h2>
              <p class="cinematic-subhead mt-3">{{ t('auth.login.form.subtitle') }}</p>
            </div>

            <!-- Social auth placeholders -->
            <div class="mb-6 space-y-3">
              <div class="grid grid-cols-3 gap-2.5">
                <!-- Google -->
                <button
                  type="button"
                  disabled
                  class="social-btn group"
                  title="Google (coming soon)"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span class="text-xs font-medium text-white/70 group-hover:text-white transition-colors">Google</span>
                </button>

                <!-- Facebook -->
                <button
                  type="button"
                  disabled
                  class="social-btn group"
                  title="Facebook (coming soon)"
                >
                  <svg class="h-4 w-4 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span class="text-xs font-medium text-white/70 group-hover:text-white transition-colors">Facebook</span>
                </button>

                <!-- Apple -->
                <button
                  type="button"
                  disabled
                  class="social-btn group"
                  title="Apple (coming soon)"
                >
                  <svg class="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.701z"/>
                  </svg>
                  <span class="text-xs font-medium text-white/70 group-hover:text-white transition-colors">Apple</span>
                </button>
              </div>

              <div class="flex items-center gap-3">
                <div class="flex-1 h-px bg-white/[0.07]" />
                <span class="text-[11px] font-mono uppercase tracking-[0.15em] text-[color:var(--m-text-dim)]">
                  {{ t('auth.login.social.divider') }}
                </span>
                <div class="flex-1 h-px bg-white/[0.07]" />
              </div>
            </div>

            <form class="space-y-4" @submit.prevent="handleLogin">
              <div>
                <label for="email-address" class="cinematic-eyebrow mb-2 block">{{ t('auth.login.form.email.label') }}</label>
                <input
                  id="email-address"
                  v-model="email"
                  data-testid="login-email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                  class="cinematic-input"
                  :placeholder="t('auth.login.form.email.placeholder')"
                >
              </div>

              <div>
                <div class="mb-2 flex items-center justify-between">
                  <label for="password" class="cinematic-eyebrow">{{ t('auth.login.form.password.label') }}</label>
                  <NuxtLink to="/forgot-password" class="text-[11px] font-mono uppercase tracking-[0.12em] text-lime-neon hover:text-lime-neon/80 transition-colors">{{ t('auth.login.form.password.forgot') }}</NuxtLink>
                </div>
                <input
                  id="password"
                  v-model="password"
                  data-testid="login-password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  required
                  class="cinematic-input"
                  placeholder="••••••••"
                >
              </div>

              <div v-if="errorMessage" class="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
                {{ errorMessage }}
              </div>

              <button
                type="submit"
                :disabled="loading"
                class="login-submit-btn w-full"
              >
                <span class="relative z-10 flex items-center justify-center gap-2">
                  <Icon v-if="loading" name="lucide:loader-2" class="h-4 w-4 animate-spin" />
                  <span>{{ loading ? t('auth.login.form.submit.signingIn') : t('auth.login.form.submit.signIn') }}</span>
                  <Icon v-if="!loading" name="lucide:arrow-right" class="h-4 w-4" />
                </span>
              </button>

              <div class="text-center text-sm text-[color:var(--m-text-dim)]">
                {{ t('auth.login.form.noAccount') }}
                <NuxtLink to="/register" class="font-medium text-lime-neon hover:underline">
                  {{ t('auth.login.form.startFree') }}
                </NuxtLink>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-bar {
  flex: 1 1 0%;
  min-width: 0;
  border-radius: 4px 4px 2px 2px;
  background: linear-gradient(180deg, rgba(198, 244, 50, 0.65), rgba(198, 244, 50, 0.15));
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.025);
  cursor: not-allowed;
  opacity: 0.7;
  transition: all 0.2s ease;
}

.social-btn:hover {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  opacity: 0.9;
}

.login-submit-btn {
  position: relative;
  overflow: hidden;
  padding: 13px 20px;
  border-radius: 13px;
  border: 1px solid rgba(198, 244, 50, 0.5);
  background: #C6F432;
  color: #05070A;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 0 24px rgba(198, 244, 50, 0.25), inset 0 1px 0 rgba(255,255,255,0.2);
}

.login-submit-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.login-submit-btn:hover::before {
  opacity: 1;
}

.login-submit-btn:hover {
  background: #d4fc4a;
  box-shadow: 0 0 36px rgba(198, 244, 50, 0.4), inset 0 1px 0 rgba(255,255,255,0.2);
  transform: translateY(-1px);
}

.login-submit-btn:active {
  transform: translateY(0);
}

.login-submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}
</style>
