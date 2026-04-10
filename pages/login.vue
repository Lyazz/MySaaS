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
  } catch (e) {
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
  emerald: { bg: 'bg-emerald-500/20', icon: 'text-emerald-400', dot: 'bg-emerald-400' },
  teal:    { bg: 'bg-teal-500/20',    icon: 'text-teal-400',    dot: 'bg-teal-400'    },
  violet:  { bg: 'bg-violet-500/20',  icon: 'text-violet-400',  dot: 'bg-violet-400'  },
  sky:     { bg: 'bg-sky-500/20',     icon: 'text-sky-400',     dot: 'bg-sky-400'     },
  amber:   { bg: 'bg-amber-500/20',   icon: 'text-amber-400',   dot: 'bg-amber-400'   },
}
</script>

<template>
  <div class="min-h-screen flex bg-white font-sans">
    
    <!-- LEFT SIDE: Marketing / Visual (Hidden on mobile) -->
    <div class="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 text-white">
      <!-- Animated Background -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-[10%] left-[10%] w-[50%] h-[50%] bg-teal-600/20 rounded-full blur-[100px] animate-blob" />
        <div class="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] bg-violet-600/20 rounded-full blur-[100px] animate-blob animation-delay-2000" />
        <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      <!-- Brand / Headline -->
      <div class="relative z-10">
        <div class="flex items-center gap-2 mb-8">
          <div class="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
            <Icon name="lucide:zap" class="w-4 h-4 text-white" />
          </div>
          <span class="font-bold text-white text-lg tracking-tight">Swekly</span>
        </div>
        <h2 class="text-4xl font-bold tracking-tight leading-tight mb-3">
          {{ t('auth.login.hero.title') }}
        </h2>
        <p class="text-slate-400 text-base leading-relaxed">
          {{ t('auth.login.hero.tagline') }}
        </p>
      </div>

      <!-- Feature Carousel -->
      <div
        class="relative z-10 flex-1 flex flex-col justify-center"
        @mouseenter="stopTimer"
        @mouseleave="startTimer"
      >
        <!-- Slide -->
        <Transition name="slide-fade" mode="out-in">
          <div
            :key="activeIndex"
            class="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10"
          >
            <div class="flex items-start gap-5">
              <div
                class="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                :class="colorMap[features[activeIndex].color].bg"
              >
                <Icon
                  :name="features[activeIndex].icon"
                  class="w-7 h-7"
                  :class="colorMap[features[activeIndex].color].icon"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-white text-lg mb-2 leading-snug">
                  {{ t(features[activeIndex].titleKey) }}
                </h4>
                <p class="text-sm text-slate-400 leading-relaxed">
                  {{ t(features[activeIndex].descKey) }}
                </p>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Dot indicators + arrows -->
        <div class="flex items-center justify-between mt-6">
          <div class="flex items-center gap-2">
            <button
              v-for="(f, i) in features"
              :key="i"
              class="carousel-dot"
              :class="[
                i === activeIndex
                  ? `w-6 h-2 ${colorMap[f.color].dot} opacity-100`
                  : 'w-2 h-2 bg-slate-600 hover:bg-slate-400 opacity-60'
              ]"
              @click="() => { stopTimer(); goTo(i); startTimer() }"
            />
          </div>
          <div class="flex items-center gap-2">
            <button
              class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              @click="() => { stopTimer(); goTo((activeIndex - 1 + features.length) % features.length); startTimer() }"
            >
              <Icon name="lucide:chevron-left" class="w-4 h-4 text-slate-300" />
            </button>
            <button
              class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              @click="() => { stopTimer(); next(); startTimer() }"
            >
              <Icon name="lucide:chevron-right" class="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="relative z-10 text-xs text-slate-500 mt-6">
        {{ t('auth.login.hero.copyright', { year }) }}
      </div>
    </div>

    <!-- RIGHT SIDE: Form -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative">
      <div class="max-w-md w-full space-y-8">
        
        <div class="text-center lg:text-left">
          <h2 class="text-3xl font-bold text-slate-900 tracking-tight">{{ t('auth.login.form.title') }}</h2>
          <p class="mt-2 text-slate-500">{{ t('auth.login.form.subtitle') }}</p>
        </div>

        <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
          
          <!-- OAuth Buttons -->
          <div class="grid grid-cols-3 gap-3">
             <button type="button" class="flex items-center justify-center py-2.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors bg-white">
                <Icon name="logos:google-icon" class="h-5 w-5" />
             </button>
             <button type="button" class="flex items-center justify-center py-2.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors bg-white">
                <Icon name="logos:apple" class="h-5 w-5" />
             </button>
             <button type="button" class="flex items-center justify-center py-2.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors bg-white">
                <Icon name="logos:facebook" class="h-5 w-5" />
             </button>
          </div>

          <div class="relative">
            <div class="absolute inset-0 flex items-center" aria-hidden="true">
              <div class="w-full border-t border-slate-200"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-slate-500">{{ t('auth.login.form.orContinueWith') }}</span>
            </div>
          </div>

          <div class="space-y-5">
            <!-- Email -->
            <div>
              <label for="email-address" class="block text-sm font-medium text-slate-700 mb-1">{{ t('auth.login.form.email.label') }}</label>
              <input 
                id="email-address" 
                v-model="email" 
                name="email" 
                type="email" 
                autocomplete="email" 
                required 
                class="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-all" 
                :placeholder="t('auth.login.form.email.placeholder')"
              >
            </div>

            <!-- Password -->
            <div>
              <div class="flex items-center justify-between mb-1">
                 <label for="password" class="block text-sm font-medium text-slate-700">{{ t('auth.login.form.password.label') }}</label>
                 <a href="#" class="text-sm font-medium text-teal-600 hover:text-teal-500">{{ t('auth.login.form.password.forgot') }}</a>
              </div>
              <input 
                id="password" 
                v-model="password" 
                name="password" 
                type="password" 
                autocomplete="current-password" 
                required 
                class="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-all" 
                placeholder="••••••••"
              >
            </div>
          </div>

          <div v-if="errorMessage" class="rounded-lg bg-red-50 p-4 border border-red-100 flex items-center gap-3">
            <Icon name="lucide:alert-circle" class="w-5 h-5 text-red-500 flex-shrink-0" />
            <span class="text-sm text-red-700 font-medium">{{ errorMessage }}</span>
          </div>

          <div>
            <button 
              type="submit" 
              :disabled="loading"
              class="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-teal-500/30 hover:-translate-y-0.5"
            >
              <span v-if="loading" class="flex items-center gap-2">
                <Icon name="lucide:loader-2" class="animate-spin h-5 w-5 text-white" />
                {{ t('auth.login.form.submit.signingIn') }}
              </span>
              <span v-else>{{ t('auth.login.form.submit.signIn') }}</span>
            </button>
          </div>
          
          <div class="text-center text-sm text-slate-500">
            {{ t('auth.login.form.noAccount') }}
            <NuxtLink to="/register" class="font-medium text-teal-600 hover:text-teal-500 hover:underline">{{ t('auth.login.form.startFree') }}</NuxtLink>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

/* Carousel dot */
.carousel-dot {
  border-radius: 9999px;
  transition: width 0.3s ease, opacity 0.3s ease;
  flex-shrink: 0;
}

/* Carousel slide transition */
.slide-fade-enter-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.slide-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}


</style>

