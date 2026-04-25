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
  <div class="min-h-screen pt-24 pb-12 md:pt-32">
    <div class="cinematic-container !max-w-[80rem]">
      <div class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <!-- ─── Left: Brand panel ─── -->
        <aside class="cinematic-card relative overflow-hidden p-7 md:p-10" @mouseenter="stopTimer" @mouseleave="startTimer">
          <div class="absolute inset-0 cinematic-grid-bg opacity-50" />
          <div class="relative">
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

            <div class="mt-8 grid gap-4 md:grid-cols-[1.08fr_0.92fr]">
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

        <!-- ─── Right: Form ─── -->
        <section class="mx-auto flex w-full max-w-xl items-center">
          <div class="w-full cinematic-card p-7 md:p-9">
            <div class="mb-7">
              <span class="cinematic-eyebrow">Swekly</span>
              <h2 class="cinematic-headline mt-3 !text-3xl md:!text-4xl">
                {{ t('auth.login.form.title') }}
              </h2>
              <p class="cinematic-subhead mt-3">{{ t('auth.login.form.subtitle') }}</p>
            </div>

            <form class="space-y-5" @submit.prevent="handleLogin">
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
                  <a href="#" class="text-xs font-medium text-lime-neon hover:underline">{{ t('auth.login.form.password.forgot') }}</a>
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

              <button type="submit" :disabled="loading" class="cinematic-button cinematic-button--primary w-full">
                <Icon v-if="loading" name="lucide:loader-2" class="h-4 w-4 animate-spin" />
                {{ loading ? t('auth.login.form.submit.signingIn') : t('auth.login.form.submit.signIn') }}
                <Icon v-if="!loading" name="lucide:arrow-right" class="h-4 w-4" />
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
</style>
