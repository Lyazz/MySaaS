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

watch(() => form.value.name, (newName) => {
  if (!successData.value) {
    form.value.slug = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
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
  <div class="min-h-screen pt-28 pb-12 md:pt-32">
    <div class="marketing-container max-w-[90rem]">
      <div class="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <aside class="marketing-panel overflow-hidden px-6 py-6 md:px-8 md:py-8">
          <p class="marketing-label">{{ t('auth.register.hero.panel.badge') }}</p>
          <h1 class="mt-4 font-display text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
            {{ t('auth.register.hero.launchYour') }}
            <span class="text-[#8fa7ff]">{{ t('auth.register.hero.empire') }}</span>
            {{ t('auth.register.hero.today') }}
          </h1>
          <p class="mt-5 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
            {{ t('auth.register.hero.subtitle') }}
          </p>

          <div class="mt-8 flex flex-wrap gap-2">
            <span
              v-for="item in launchHighlights"
              :key="item.labelKey"
              class="marketing-pill"
            >
              <Icon :name="item.icon" class="h-3.5 w-3.5 text-[#16d5b3]" />
              {{ t(item.labelKey) }}
            </span>
          </div>

          <div class="mt-8 grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
            <div class="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(53,89,255,0.2),rgba(255,255,255,0.03))] p-5">
              <div class="flex items-center justify-between">
                <p class="marketing-label">{{ t('auth.register.hero.panel.title') }}</p>
                <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-300">
                  {{ t('auth.register.hero.panel.ready') }}
                </span>
              </div>

              <div class="mt-5 grid grid-cols-3 gap-3">
                <div
                  v-for="metric in snapshotMetrics"
                  :key="metric.labelKey"
                  class="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4 text-center"
                >
                  <p class="font-display text-2xl font-semibold tracking-[-0.04em] text-white">
                    {{ metric.value }}
                  </p>
                  <p class="mt-2 text-[0.68rem] uppercase tracking-[0.22em] text-slate-400">
                    {{ t(metric.labelKey) }}
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-5">
                <p class="marketing-label">{{ t('auth.register.hero.copyright', { year }) }}</p>
                <div class="mt-4 space-y-3 text-sm text-slate-200">
                  <div class="register-rail">
                    <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
                    {{ t('auth.register.hero.panel.tasks.cod') }}
                  </div>
                  <div class="register-rail">
                    <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
                    {{ t('auth.register.hero.panel.tasks.performance') }}
                  </div>
                  <div class="register-rail">
                    <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
                    {{ t('auth.register.hero.panel.tasks.analytics') }}
                  </div>
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
                {{ t('auth.register.form.title') }}
              </h2>
              <p class="mt-3 text-base text-slate-600">
                {{ t('auth.register.form.subtitle') }}
              </p>
            </div>

            <div v-if="successData" data-testid="register-success" class="rounded-[1.7rem] border border-emerald-200 bg-emerald-50 p-6">
              <div class="flex items-start gap-4">
                <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <Icon name="lucide:check-circle" class="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 class="font-display text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    {{ t('auth.register.success.title') }}
                  </h3>
                  <p class="mt-3 text-sm leading-7 text-slate-700">
                    {{ t('auth.register.success.message', { name: successData.tenant.name }) }}
                  </p>
                  <a :href="successData.tenant.url" class="marketing-button marketing-button--primary mt-5">
                    {{ t('auth.register.success.cta') }}
                  </a>
                </div>
              </div>
            </div>

            <form v-else class="space-y-5" @submit.prevent="register">
              <div>
                <label for="company-name" class="mb-2 block text-sm font-medium text-slate-700">{{ t('auth.register.form.companyName.label') }}</label>
                <input
                  id="company-name"
                  v-model="form.name"
                  data-testid="register-company"
                  name="name"
                  type="text"
                  required
                  class="auth-input"
                  :placeholder="t('auth.register.form.companyName.placeholder')"
                >
              </div>

              <div>
                <label for="slug" class="mb-2 block text-sm font-medium text-slate-700">{{ t('auth.register.form.slug.label') }}</label>
                <div class="flex rounded-2xl border border-slate-200 focus-within:border-[#3559ff] focus-within:shadow-[0_0_0_4px_rgba(53,89,255,0.12)]">
                  <input
                    id="slug"
                    v-model="form.slug"
                    data-testid="register-slug"
                    name="slug"
                    type="text"
                    required
                    class="auth-input auth-input--slug"
                    :placeholder="t('auth.register.form.slug.placeholder')"
                  >
                  <span class="inline-flex items-center rounded-r-2xl bg-slate-100 px-4 text-sm font-medium text-slate-500">
                    {{ subdomainSuffix }}
                  </span>
                </div>
                <p v-if="form.slug" class="mt-2 text-sm font-medium text-[#3559ff]">
                  {{ slugPreview }}
                </p>
              </div>

              <div>
                <label for="email-address" class="mb-2 block text-sm font-medium text-slate-700">{{ t('auth.register.form.email.label') }}</label>
                <input
                  id="email-address"
                  v-model="form.email"
                  data-testid="register-email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                  class="auth-input"
                  :placeholder="t('auth.register.form.email.placeholder')"
                >
              </div>

              <div>
                <label for="password" class="mb-2 block text-sm font-medium text-slate-700">{{ t('auth.register.form.password.label') }}</label>
                <input
                  id="password"
                  v-model="form.password"
                  data-testid="register-password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  required
                  class="auth-input"
                  placeholder="••••••••"
                >
              </div>

              <div v-if="error" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {{ error }}
              </div>

              <button type="submit" :disabled="loading" class="marketing-button marketing-button--primary w-full justify-center">
                <Icon v-if="loading" name="lucide:loader-2" class="h-4 w-4 animate-spin" />
                {{ loading ? t('auth.register.form.submit.creating') : t('auth.register.form.submit.register') }}
              </button>

              <div class="text-center text-sm text-slate-600">
                {{ t('auth.register.form.haveAccount') }}
                <NuxtLink to="/login" class="font-semibold text-[#3559ff] hover:underline">
                  {{ t('auth.register.form.logIn') }}
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
.register-rail {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  border-radius: 0.95rem;
  background: rgba(255, 255, 255, 0.04);
  padding: 0.85rem 0.9rem;
}

.auth-input {
  width: 100%;
  border-radius: 1rem;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: white;
  padding: 0.95rem 1rem;
  color: #0f172a;
  outline: none;
}

.auth-input:focus {
  border-color: rgba(53, 89, 255, 0.55);
}

.auth-input--slug {
  border: 0;
  box-shadow: none;
}

.auth-input--slug:focus {
  border: 0;
  box-shadow: none;
}
</style>
