<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRequestOrigin } from '~/composables/host'
import { usePlatformBaseDomain } from '~/composables/platformBaseDomain'

const { t } = useI18n({ useScope: 'global' })
const year = new Date().getFullYear()

definePageMeta({
  middleware: 'saas-only',
  layout: 'marketing',
  title: 'Register - Swekly'
})

const form = ref({
  name: '',
  slug: '',
  email: '',
  password: ''
})

const loading = ref(false)
const error = ref('')
const successData = ref<any>(null)
const platformBaseDomain = usePlatformBaseDomain()
const launchHighlights = [
  { icon: 'lucide:package', labelKey: 'auth.register.hero.panel.pills.orders' },
  { icon: 'lucide:truck', labelKey: 'auth.register.hero.panel.pills.shipping' },
  { icon: 'lucide:bar-chart-2', labelKey: 'auth.register.hero.panel.pills.analytics' }
]
const snapshotMetrics = [
  { value: '24h', labelKey: 'auth.register.hero.panel.metrics.goLive' },
  { value: '99.9%', labelKey: 'auth.register.hero.panel.metrics.uptime' },
  { value: 'DZD', labelKey: 'auth.register.hero.panel.metrics.localCod' }
]

const subdomainSuffix = computed(() => {
  const { host } = useRequestOrigin()
  const firstHost = host.split(',')[0]?.trim() || ''
  const hostParts = firstHost.split(':')
  const hasPort = hostParts.length > 1 && /^\d+$/.test(hostParts[hostParts.length - 1] || '')
  const hostname = hasPort ? hostParts.slice(0, -1).join(':').toLowerCase() : firstHost.toLowerCase()
  const port = hasPort ? hostParts[hostParts.length - 1] : ''

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return `.localhost${port ? `:${port}` : ''}`
  }

  return `.${platformBaseDomain}`
})

const slugPreview = computed(() => {
  if (!form.value.slug) return ''
  return `${form.value.slug}${subdomainSuffix.value}`
})

// Auto-generate slug from name
watch(() => form.value.name, (newName) => {
  if (!successData.value) { // Stop updating if already success
    form.value.slug = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '') // Trim hyphens
  }
})

async function register() {
  loading.value = true
  error.value = ''
  successData.value = null

  try {
    const data = await $fetch('/api/register', {
      method: 'POST',
      body: form.value
    })
    successData.value = data
  } catch (e: any) {
    error.value = e.data?.statusMessage || t('auth.register.errors.generic')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-page min-h-screen flex font-sans">
    <aside class="onboard-side hidden lg:flex lg:w-1/2 relative overflow-hidden p-10 xl:p-12 text-[#0D1F1A]">
      <div class="onboard-side__mesh" />
      <div class="onboard-side__grain" />
      <div class="onboard-side__orb onboard-side__orb--mint animate-blob" />
      <div class="onboard-side__orb onboard-side__orb--orange animate-blob animation-delay-2000" />

      <div class="relative z-10 flex h-full w-full flex-col">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#0D1F1A]/25 bg-[#FF7A45]">
              <Icon name="lucide:store" class="h-4 w-4 text-white" />
            </div>
            <span class="text-lg font-extrabold tracking-tight">Swekly</span>
          </div>
          <span class="rounded-full border border-[#0D1F1A]/18 bg-[#FFF8E7]/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0D1F1A]/65">
            {{ t('auth.register.hero.panel.badge') }}
          </span>
        </div>

        <div class="mt-10 max-w-xl">
          <h2 class="onboard-side__title">
            {{ t('auth.register.hero.launchYour') }}<br>
            <span class="text-[#FF7A45]">{{ t('auth.register.hero.empire') }}</span> {{ t('auth.register.hero.today') }}
          </h2>
          <p class="mt-5 text-base leading-relaxed text-[#0D1F1A]/65">
            {{ t('auth.register.hero.subtitle') }}
          </p>
        </div>

        <div class="mt-8 flex flex-wrap gap-2.5">
          <div
            v-for="item in launchHighlights"
            :key="item.labelKey"
            class="onboard-side__pill"
          >
            <Icon :name="item.icon" class="h-4 w-4 text-[#FF7A45]" />
            <span>{{ t(item.labelKey) }}</span>
          </div>
        </div>

        <div class="onboard-side__board mt-8">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-[#0D1F1A]/45">
              {{ t('auth.register.hero.panel.title') }}
            </p>
            <span class="rounded-full border border-[#0D1F1A]/16 bg-white/45 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#0D1F1A]/62">
              {{ t('auth.register.hero.panel.ready') }}
            </span>
          </div>

          <div class="mt-4 grid grid-cols-3 gap-3">
            <div
              v-for="metric in snapshotMetrics"
              :key="metric.labelKey"
              class="onboard-side__metric"
            >
              <p class="text-lg font-black leading-none tracking-tight text-[#0D1F1A]">
                {{ metric.value }}
              </p>
              <p class="mt-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-[#0D1F1A]/58">
                {{ t(metric.labelKey) }}
              </p>
            </div>
          </div>

          <div class="mt-5 space-y-2.5">
            <div class="onboard-side__task">
              <Icon name="lucide:check-circle-2" class="h-4 w-4 text-[#1F9D8E]" />
              <span>{{ t('auth.register.hero.panel.tasks.cod') }}</span>
            </div>
            <div class="onboard-side__task">
              <Icon name="lucide:check-circle-2" class="h-4 w-4 text-[#1F9D8E]" />
              <span>{{ t('auth.register.hero.panel.tasks.performance') }}</span>
            </div>
            <div class="onboard-side__task">
              <Icon name="lucide:check-circle-2" class="h-4 w-4 text-[#1F9D8E]" />
              <span>{{ t('auth.register.hero.panel.tasks.analytics') }}</span>
            </div>
          </div>

        </div>

        <div class="mt-6 text-xs text-[#0D1F1A]/55">
          {{ t('auth.register.hero.copyright', { year }) }}
        </div>
      </div>
    </aside>

    <section class="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10">
      <div class="w-full max-w-md rounded-3xl border-2 border-[#0D1F1A] bg-[#FFFDF4] p-7 sm:p-8 shadow-[7px_7px_0_#0D1F1A]">
        <div class="mb-8 text-center lg:text-left">
          <h2 class="text-3xl font-black tracking-tight text-[#0D1F1A]">
            {{ t('auth.register.form.title') }}
          </h2>
          <p class="mt-2 text-[#0D1F1A]/65">
            {{ t('auth.register.form.subtitle') }}
          </p>
        </div>

        <div v-if="successData" class="animate-fadeIn rounded-2xl border-2 border-[#0D1F1A] bg-[#F5EDD3] p-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <Icon name="lucide:check-circle" class="h-6 w-6 text-[#1F9D8E]" />
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-bold text-[#0D1F1A]">{{ t('auth.register.success.title') }}</h3>
              <div class="mt-2 text-[#0D1F1A]/75">
                <p>{{ t('auth.register.success.message', { name: successData.tenant.name }) }}</p>
                <div class="mt-4">
                  <a :href="successData.tenant.url" class="inline-flex items-center justify-center rounded-lg border-2 border-[#0D1F1A] bg-[#FF7A45] px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0_#0D1F1A] transition-transform hover:-translate-y-0.5">
                    {{ t('auth.register.success.cta') }} &rarr;
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form v-else class="space-y-6" @submit.prevent="register">
          <div class="space-y-5">
            <div>
              <label for="company-name" class="mb-1 block text-sm font-semibold text-[#0D1F1A]">{{ t('auth.register.form.companyName.label') }}</label>
              <input id="company-name" v-model="form.name" name="name" type="text" required class="auth-input" :placeholder="t('auth.register.form.companyName.placeholder')">
            </div>

            <div>
              <label for="slug" class="mb-1 block text-sm font-semibold text-[#0D1F1A]">{{ t('auth.register.form.slug.label') }}</label>
              <div class="flex rounded-xl">
                <input id="slug" v-model="form.slug" name="slug" type="text" required class="auth-input auth-input--slug" :placeholder="t('auth.register.form.slug.placeholder')">
                <span class="inline-flex items-center rounded-r-xl border-y-2 border-r-2 border-[#0D1F1A]/22 bg-[#F5EDD3] px-4 text-sm font-medium text-[#0D1F1A]/65">
                  {{ subdomainSuffix }}
                </span>
              </div>
              <p v-if="form.slug" class="mt-1 text-xs font-semibold text-[#FF7A45]">
                Your store will be at: {{ slugPreview }}
              </p>
            </div>

            <div>
              <label for="email-address" class="mb-1 block text-sm font-semibold text-[#0D1F1A]">{{ t('auth.register.form.email.label') }}</label>
              <input id="email-address" v-model="form.email" name="email" type="email" autocomplete="email" required class="auth-input" :placeholder="t('auth.register.form.email.placeholder')">
            </div>

            <div>
              <label for="password" class="mb-1 block text-sm font-semibold text-[#0D1F1A]">{{ t('auth.register.form.password.label') }}</label>
              <input id="password" v-model="form.password" name="password" type="password" autocomplete="current-password" required class="auth-input" placeholder="••••••••">
            </div>
          </div>

          <div v-if="error" class="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <Icon name="lucide:alert-circle" class="h-5 w-5 flex-shrink-0 text-red-500" />
            <span class="text-sm font-medium text-red-700">{{ error }}</span>
          </div>

          <button type="submit" :disabled="loading" class="auth-submit-btn">
            <span v-if="loading" class="flex items-center gap-2">
              <Icon name="lucide:loader-2" class="h-5 w-5 animate-spin text-white" />
              {{ t('auth.register.form.submit.creating') }}
            </span>
            <span v-else>{{ t('auth.register.form.submit.register') }}</span>
          </button>

          <div class="text-center text-sm text-[#0D1F1A]/65">
            {{ t('auth.register.form.haveAccount') }}
            <NuxtLink to="/login" class="font-semibold text-[#FF7A45] hover:underline">
              {{ t('auth.register.form.logIn') }}
            </NuxtLink>
          </div>
        </form>
      </div>
    </section>
  </div>
</template>

<style scoped>
.register-page {
  background: #FFF8E7;
}

.onboard-side {
  background: linear-gradient(158deg, #FDF1DA 0%, #F1E6D1 50%, #E8DCC8 100%);
}

.onboard-side__mesh {
  position: absolute;
  inset: 0;
  opacity: 0.42;
  background-image: radial-gradient(circle at 1px 1px, rgba(13, 31, 26, 0.12) 1px, transparent 0);
  background-size: 28px 28px;
  mask-image: radial-gradient(circle at 30% 25%, black 30%, transparent 85%);
}

.onboard-side__grain {
  position: absolute;
  inset: 0;
  opacity: 0.23;
  background-image: radial-gradient(rgba(13, 31, 26, 0.16) 0.7px, transparent 0.7px);
  background-size: 8px 8px;
  mix-blend-mode: multiply;
}

.onboard-side__orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(95px);
}

.onboard-side__orb--mint {
  top: 7%;
  left: 6%;
  width: 44%;
  height: 42%;
  background: rgba(31, 157, 142, 0.18);
}

.onboard-side__orb--orange {
  right: 7%;
  bottom: 8%;
  width: 44%;
  height: 42%;
  background: rgba(255, 122, 69, 0.16);
}

.onboard-side__title {
  font-size: clamp(2.2rem, 4.5vw, 3.5rem);
  line-height: 0.98;
  letter-spacing: -0.03em;
  font-weight: 900;
}

.onboard-side__pill {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid rgba(13, 31, 26, 0.12);
  border-radius: 999px;
  background: rgba(255, 248, 231, 0.84);
  padding: 0.38rem 0.72rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(13, 31, 26, 0.72);
}

.onboard-side__board {
  border-radius: 1rem;
  border: 1px solid rgba(13, 31, 26, 0.15);
  background: rgba(255, 248, 231, 0.84);
  padding: 1rem;
  box-shadow: 0 16px 35px -26px rgba(13, 31, 26, 0.48);
}

.onboard-side__metric {
  border: 1px solid rgba(13, 31, 26, 0.15);
  border-radius: 0.75rem;
  background: rgba(255, 253, 244, 0.9);
  padding: 0.62rem 0.58rem;
}

.onboard-side__task {
  display: flex;
  align-items: center;
  gap: 0.52rem;
  border-radius: 0.7rem;
  border: 1px solid rgba(13, 31, 26, 0.12);
  background: rgba(255, 253, 244, 0.86);
  padding: 0.5rem 0.62rem;
  font-size: 0.79rem;
  font-weight: 600;
  color: rgba(13, 31, 26, 0.75);
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

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.4s ease-out forwards;
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

.auth-input--slug {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
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
