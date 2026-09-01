<template>
  <div class="max-w-4xl mx-auto">
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-primary">
        {{ t('admin.pages.onboarding.title') }}
      </h2>
      <p class="mt-1 text-secondary">
        {{ t('admin.pages.onboarding.subtitle') }}
      </p>
    </div>

    <div v-if="loading" class="rounded-xl p-8 surface-1 border border-line">
      <div class="flex items-center gap-3 text-secondary">
        <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 [border-color:var(--brand)]" />
        <span>{{ t('admin.pages.onboarding.loadingSettings') }}</span>
      </div>
    </div>

    <div v-else class="space-y-6">
      <!-- Progress bar -->
      <div class="rounded-xl p-6 surface-1 border border-line">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm font-medium text-secondary">
            {{ t('admin.pages.onboarding.progress.stepOf', { current: step + 1, total: STEPS.length }) }}
          </p>
          <p class="text-sm text-tertiary">{{ STEPS[step].label }}</p>
        </div>
        <div class="h-2 rounded-full overflow-hidden surface-3">
          <div class="h-2 [background:var(--brand)] transition-all" :style="{ width: `${progressPercent}%` }" />
        </div>
      </div>

      <!-- Step content -->
      <div class="rounded-xl p-6 surface-1 border border-line">
        <AdminOnboardingStepStoreInfo v-if="step === 0" v-model="form" />
        <AdminOnboardingStepTemplate v-else-if="step === 1" v-model="form" />
        <AdminOnboardingStepBrandColor v-else-if="step === 2" v-model="form" />
        <AdminOnboardingStepLanguage v-else-if="step === 3" v-model="form" />
        <AdminOnboardingStepDone v-else v-model="form" />

        <div v-if="error" class="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {{ error }}
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex items-center justify-between">
        <button
          type="button"
          class="ui-btn ui-btn--secondary px-4 py-2 disabled:opacity-50"
          :disabled="step === 0 || saving"
          @click="step--"
        >
          {{ t('admin.common.back') }}
        </button>

        <div class="flex items-center gap-3">
          <button
            v-if="step < STEPS.length - 1"
            type="button"
            class="px-4 py-2 rounded-lg [background:var(--brand)] hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] text-brand-contrast font-medium disabled:opacity-50"
            :disabled="saving"
            @click="nextStep"
          >
            {{ saving ? t('admin.common.saving') : t('admin.common.next') }}
          </button>
          <button
            v-else
            type="button"
            class="px-4 py-2 rounded-lg [background:var(--brand)] hover:opacity-90 font-medium disabled:opacity-50 text-brand-contrast"
            :disabled="saving"
            @click="finish"
          >
            {{ saving ? t('admin.common.saving') : t('admin.pages.onboarding.saveFinish') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.onboarding.metaTitle'
})

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })

const STEPS = computed(() => [
  { key: 'storeInfo',  label: t('admin.pages.onboarding.steps.storeInfo') },
  { key: 'template',   label: t('admin.pages.onboarding.steps.template') },
  { key: 'brandColor', label: t('admin.pages.onboarding.steps.brandColor') },
  { key: 'language',   label: t('admin.pages.onboarding.steps.language') },
  { key: 'done',       label: t('admin.pages.onboarding.steps.done') },
])

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const step = ref(0)
const progressPercent = computed(() => Math.round(((step.value + 1) / STEPS.value.length) * 100))

const form = reactive({
  name: authStore.user?.tenant?.name ?? '',
  logoUrl: null as string | null,
  description: '',
  templateKey: 'modern',
  primaryColor: '#C6F432',
  language: 'fr',
})

async function loadSettings() {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<any>('/api/admin/store-settings', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    form.name = data.name || form.name
    form.logoUrl = data.logoUrl ?? null
    form.templateKey = data.templateKey || form.templateKey
    form.primaryColor = data.primaryColor || form.primaryColor
    form.language = data.language || form.language
    useState<any>('storeSettings').value = data
  } catch (e: any) {
    error.value = e.data?.statusMessage || t('admin.pages.onboarding.errors.loadFailed')
  } finally {
    loading.value = false
  }
}

async function save(extra?: Record<string, unknown>) {
  saving.value = true
  error.value = ''
  try {
    const updated = await $fetch<any>('/api/admin/store-settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        name: form.name,
        logoUrl: form.logoUrl,
        templateKey: form.templateKey,
        primaryColor: form.primaryColor,
        language: form.language,
        ...extra
      }
    })
    useState<any>('storeSettings').value = updated
    return true
  } catch (e: any) {
    error.value = e.data?.statusMessage || t('admin.pages.onboarding.errors.saveFailed')
    return false
  } finally {
    saving.value = false
  }
}

async function nextStep() {
  const ok = await save()
  if (ok) step.value++
}

async function finish() {
  const ok = await save({ isCompleted: true })
  if (ok) {
    // Reset sidebar tour so it fires on first visit to /admin after onboarding
    if (import.meta.client) {
      localStorage.removeItem('tour_seen_sidebar')
    }
    await navigateTo('/admin')
  }
}

onMounted(() => loadSettings())
</script>
