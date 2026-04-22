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

const features = [
  {
    icon: 'lucide:trending-up',
    titleKey: 'auth.login.hero.carousel.revenue.title',
    descKey: 'auth.login.hero.carousel.revenue.description'
  },
  {
    icon: 'lucide:package',
    titleKey: 'auth.login.hero.carousel.orders.title',
    descKey: 'auth.login.hero.carousel.orders.description'
  },
  {
    icon: 'lucide:truck',
    titleKey: 'auth.login.hero.carousel.shipping.title',
    descKey: 'auth.login.hero.carousel.shipping.description'
  },
  {
    icon: 'lucide:bar-chart-3',
    titleKey: 'auth.login.hero.carousel.analytics.title',
    descKey: 'auth.login.hero.carousel.analytics.description'
  }
]

const activeIndex = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function next() {
  activeIndex.value = (activeIndex.value + 1) % features.length
}

function startTimer() {
  stopTimer()
  timer = setInterval(next, 4000)
}

function stopTimer() {
  if (timer) clearInterval(timer)
}

onMounted(startTimer)
onUnmounted(stopTimer)
</script>

<template>
  <div class="min-h-screen pt-28 pb-12 md:pt-32">
    <div class="marketing-container max-w-[90rem]">
      <div class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <aside class="marketing-panel overflow-hidden px-6 py-6 md:px-8 md:py-8" @mouseenter="stopTimer" @mouseleave="startTimer">
          <div class="flex items-center justify-between">
            <div>
              <p class="marketing-label">{{ t('auth.login.hero.panel.badge') }}</p>
              <h1 class="mt-4 font-display text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                {{ t('auth.login.hero.title') }}
              </h1>
            </div>
            <div class="hidden h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 md:flex">
              <Icon :name="features[activeIndex].icon" class="h-6 w-6 text-[#8fa7ff]" />
            </div>
          </div>

          <p class="mt-5 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
            {{ t('auth.login.hero.tagline') }}
          </p>

          <div class="mt-8 grid gap-4 md:grid-cols-[1.08fr_0.92fr]">
            <div class="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(53,89,255,0.2),rgba(255,255,255,0.03))] p-5">
              <p class="marketing-label">{{ t('auth.login.hero.panel.focusArea') }}</p>
              <Transition name="fade" mode="out-in">
                <div :key="activeIndex" class="mt-4">
                  <h2 class="font-display text-2xl font-semibold tracking-[-0.04em] text-white">
                    {{ t(features[activeIndex].titleKey) }}
                  </h2>
                  <p class="mt-3 text-sm leading-7 text-slate-300">
                    {{ t(features[activeIndex].descKey) }}
                  </p>
                </div>
              </Transition>

              <div class="mt-6 flex gap-2">
                <button
                  v-for="(feature, index) in features"
                  :key="feature.titleKey"
                  type="button"
                  class="h-2.5 rounded-full transition-all"
                  :class="index === activeIndex ? 'w-8 bg-[#3559ff]' : 'w-2.5 bg-white/20'"
                  @click="activeIndex = index"
                />
              </div>
            </div>

            <div class="space-y-4">
              <div class="rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-5">
                <p class="marketing-label">{{ t('auth.login.hero.side.label') }}</p>
                <div class="mt-4 space-y-3 text-sm text-slate-200">
                  <div class="auth-rail">
                    <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
                    {{ t('auth.login.hero.side.orders') }}
                  </div>
                  <div class="auth-rail">
                    <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
                    {{ t('auth.login.hero.side.workspace') }}
                  </div>
                  <div class="auth-rail">
                    <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
                    {{ t('auth.login.hero.side.performance') }}
                  </div>
                </div>
              </div>

              <div class="rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-5">
                <p class="marketing-label">{{ t('auth.login.hero.copyright', { year }) }}</p>
                <div class="mt-4 flex items-end gap-2">
                  <div class="auth-bar h-12" />
                  <div class="auth-bar h-20" />
                  <div class="auth-bar h-16" />
                  <div class="auth-bar h-24" />
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section class="mx-auto flex w-full max-w-xl items-center">
          <div class="w-full rounded-[2rem] border border-white/12 bg-[rgba(248,251,255,0.96)] p-6 text-slate-900 shadow-[0_28px_80px_-34px_rgba(0,0,0,0.8)] md:p-8">
            <div class="mb-8">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Swekly
              </p>
              <h2 class="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] text-slate-950">
                {{ t('auth.login.form.title') }}
              </h2>
              <p class="mt-3 text-base text-slate-600">
                {{ t('auth.login.form.subtitle') }}
              </p>
            </div>

            <form class="space-y-5" @submit.prevent="handleLogin">
              <div>
                <label for="email-address" class="mb-2 block text-sm font-medium text-slate-700">{{ t('auth.login.form.email.label') }}</label>
                <input
                  id="email-address"
                  v-model="email"
                  data-testid="login-email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                  class="auth-input"
                  :placeholder="t('auth.login.form.email.placeholder')"
                >
              </div>

              <div>
                <div class="mb-2 flex items-center justify-between">
                  <label for="password" class="block text-sm font-medium text-slate-700">{{ t('auth.login.form.password.label') }}</label>
                  <a href="#" class="text-sm font-medium text-[#3559ff] hover:underline">{{ t('auth.login.form.password.forgot') }}</a>
                </div>
                <input
                  id="password"
                  v-model="password"
                  data-testid="login-password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  required
                  class="auth-input"
                  placeholder="••••••••"
                >
              </div>

              <div v-if="errorMessage" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {{ errorMessage }}
              </div>

              <button type="submit" :disabled="loading" class="marketing-button marketing-button--primary w-full justify-center">
                <Icon v-if="loading" name="lucide:loader-2" class="h-4 w-4 animate-spin" />
                {{ loading ? t('auth.login.form.submit.signingIn') : t('auth.login.form.submit.signIn') }}
              </button>

              <div class="text-center text-sm text-slate-600">
                {{ t('auth.login.form.noAccount') }}
                <NuxtLink to="/register" class="font-semibold text-[#3559ff] hover:underline">
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
.auth-rail {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  border-radius: 0.95rem;
  background: rgba(255, 255, 255, 0.04);
  padding: 0.85rem 0.9rem;
}

.auth-bar {
  flex: 1 1 0%;
  min-width: 0;
  border-radius: 999px 999px 0.8rem 0.8rem;
  background: linear-gradient(180deg, rgba(22, 213, 179, 0.9), rgba(53, 89, 255, 0.82));
}

.auth-input {
  width: 100%;
  border-radius: 1rem;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: white;
  padding: 0.95rem 1rem;
  color: #0f172a;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.auth-input:focus {
  border-color: rgba(53, 89, 255, 0.55);
  box-shadow: 0 0 0 4px rgba(53, 89, 255, 0.12);
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
