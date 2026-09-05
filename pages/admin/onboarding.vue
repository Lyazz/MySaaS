<template>
  <div class="flex h-screen flex-col bg-admin">
    <!-- Header -->
    <header class="flex shrink-0 items-center justify-between gap-4 border-b border-line px-4 py-3 surface-1 sm:px-6">
      <div class="flex min-w-0 items-center gap-3">
        <SaaSLogo class="h-6 w-auto shrink-0" />
        <span class="hidden truncate text-sm text-tertiary sm:block">{{ t('admin.pages.onboarding.title') }}</span>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-mini font-medium text-tertiary hover:text-primary bg-hover"
          :disabled="saving"
          @click="finishLater"
        >
          {{ t('admin.pages.onboarding.finishLater') }}
        </button>
        <button
          type="button"
          class="rounded-lg px-2.5 py-1.5 text-mini font-medium text-tertiary hover:text-primary bg-hover xl:hidden"
          :aria-pressed="showPreviewOnMobile"
          @click="showPreviewOnMobile = !showPreviewOnMobile"
        >
          <Icon name="lucide:eye" class="h-4 w-4" />
        </button>
      </div>
    </header>

    <div v-if="loading" class="flex flex-1 items-center justify-center">
      <div class="flex items-center gap-3 text-secondary">
        <div class="h-5 w-5 animate-spin rounded-full border-2 border-transparent [border-bottom-color:var(--brand)]" />
        <span class="text-sm">{{ t('admin.pages.onboarding.loadingSettings') }}</span>
      </div>
    </div>

    <div v-else class="flex min-h-0 flex-1">
      <!-- Step rail -->
      <aside class="hidden w-60 shrink-0 overflow-y-auto border-e border-line p-4 surface-1 lg:block">
        <AdminOnboardingRail
          :steps="railSteps"
          :current="step"
          :furthest="furthest"
          @go="goTo"
        />
      </aside>

      <!-- Question panel -->
      <main
        class="flex min-w-0 flex-1 flex-col"
        :class="showPreviewOnMobile ? 'hidden xl:flex' : 'flex'"
      >
        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div class="mx-auto w-full max-w-xl">
            <!-- Compact progress for viewports without the rail -->
            <div class="mb-6 lg:hidden">
              <div class="mb-2 flex items-center justify-between">
                <p class="text-mini font-medium text-secondary">
                  {{ t('admin.pages.onboarding.progress.stepOf', { current: step + 1, total: STEP_KEYS.length }) }}
                </p>
                <p class="text-mini text-tertiary">{{ railSteps[step].label }}</p>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full surface-3">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :style="{ width: `${((step + 1) / STEP_KEYS.length) * 100}%`, background: 'var(--brand)' }"
                />
              </div>
            </div>

            <Transition name="onboarding-step" mode="out-in">
              <div :key="step">
                <AdminOnboardingStepIdentity v-if="step === 0" v-model="draft" />
                <AdminOnboardingStepTemplate v-else-if="step === 1" v-model="draft" />
                <AdminOnboardingStepBrandColor v-else-if="step === 2" v-model="draft" />
                <AdminOnboardingStepFirstProduct v-else-if="step === 3" v-model="draft" />
                <AdminOnboardingStepDelivery v-else-if="step === 4" v-model="draft" />
                <AdminOnboardingStepPublish
                  v-else
                  :draft="draft"
                  :slug="slug"
                  :published="published"
                  :missing="missingToPublish"
                  @fix="goToStepKey"
                />
              </div>
            </Transition>

            <p v-if="error" class="ui-error mt-4">{{ error }}</p>
          </div>
        </div>

        <!-- Navigation -->
        <div class="shrink-0 border-t border-line px-4 py-3 surface-1 sm:px-8">
          <div class="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
            <UiButton variant="secondary" size="sm" :disabled="step === 0 || saving" @click="back">
              {{ t('admin.common.back') }}
            </UiButton>

            <UiButton
              v-if="step < STEP_KEYS.length - 1"
              size="sm"
              :loading="saving"
              :disabled="!canAdvance"
              @click="next"
            >
              {{ t('admin.common.next') }}
            </UiButton>

            <UiButton
              v-else-if="!published"
              size="sm"
              :loading="saving"
              :disabled="missingToPublish.length > 0"
              @click="publish"
            >
              {{ t('admin.pages.onboarding.publish.cta') }}
            </UiButton>

            <UiButton v-else size="sm" @click="goToDashboard">
              {{ t('admin.pages.onboarding.done.ctaDashboard') }}
            </UiButton>
          </div>
        </div>
      </main>

      <!-- Live preview -->
      <aside
        class="min-w-0 shrink-0 border-s border-line p-4 surface-1 xl:flex xl:w-[46%] xl:max-w-3xl"
        :class="showPreviewOnMobile ? 'flex flex-1 border-s-0' : 'hidden'"
      >
        <AdminOnboardingPreview class="w-full" :draft="previewDraft" :slug="slug" />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import SaaSLogo from '~/components/branding/SaaSLogo.vue'
import type { OnboardingDraft } from '~/components/admin/onboarding/types'

definePageMeta({
  middleware: 'auth',
  // No admin chrome: the wizard is the whole screen, and the sidebar it would
  // otherwise sit inside links to pages the store cannot use yet.
  layout: false,
  titleKey: 'admin.pages.onboarding.metaTitle'
})

const STEP_KEYS = ['storeInfo', 'template', 'brandColor', 'firstProduct', 'delivery', 'publish'] as const
type StepKey = (typeof STEP_KEYS)[number]

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const route = useRoute()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const step = ref(0)
const furthest = ref(0)
const published = ref(false)
const slug = ref('')
const showPreviewOnMobile = ref(false)
const serverMissing = ref<string[]>([])

const draft = reactive<OnboardingDraft>({
  name: authStore.user?.tenant?.name ?? '',
  logoUrl: null,
  description: '',
  language: 'fr',
  templateKey: 'modern',
  primaryColor: '#0D9488',
  deliveryProviders: [],
  storePickupEnabled: false,
  product: { name: '', price: null, imageUrl: null, createdId: null }
})

const railSteps = computed(() =>
  STEP_KEYS.map((key) => ({ key, label: t(`admin.pages.onboarding.steps.${key}`) }))
)

// A plain object so the preview's deep watcher sees every keystroke; passing the
// reactive draft straight through would also work, but this keeps the frame's
// contract explicit and drops fields it has no use for.
const previewDraft = computed(() => ({
  name: draft.name,
  logoUrl: draft.logoUrl,
  description: draft.description,
  templateKey: draft.templateKey,
  primaryColor: draft.primaryColor,
  product: { name: draft.product.name, price: draft.product.price, imageUrl: draft.product.imageUrl }
}))

// A product typed into step 3 counts: commitStep() creates it before publish runs.
const hasProduct = computed(() => Boolean(draft.product.createdId) || draft.product.name.trim().length > 0)
const hasDelivery = computed(() => draft.deliveryProviders.length > 0 || draft.storePickupEnabled)

/**
 * Mirrors the server's publish requirements so the button reacts as the merchant
 * types. The server still has the last word -- if it refuses, its answer is
 * merged in here until the merchant changes something.
 */
const missingToPublish = computed(() => {
  const missing: string[] = []
  if (!hasProduct.value) missing.push('product')
  if (!hasDelivery.value) missing.push('delivery')
  for (const item of serverMissing.value) {
    if (!missing.includes(item)) missing.push(item)
  }
  return missing
})

// Any edit invalidates a stale refusal -- except during the save that produced
// it, which would otherwise wipe the server's answer before it is shown.
watch(draft, () => { if (!saving.value) serverMissing.value = [] }, { deep: true })

const canAdvance = computed(() => {
  if (step.value === 0) return draft.name.trim().length > 0
  if (step.value === 2) return /^#[0-9a-fA-F]{6}$/.test(draft.primaryColor)
  return true
})

async function loadSettings() {
  loading.value = true
  error.value = ''
  try {
    const [settings, checklist] = await Promise.all([
      $fetch<any>('/api/admin/store-settings', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }),
      $fetch<any>('/api/admin/store-settings/onboarding-checklist', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }).catch(() => null)
    ])

    draft.name = settings.name || draft.name
    draft.logoUrl = settings.logoUrl ?? null
    draft.description = settings.description ?? ''
    draft.language = settings.language || draft.language
    draft.templateKey = settings.templateKey || draft.templateKey
    draft.primaryColor = settings.primaryColor || draft.primaryColor
    draft.deliveryProviders = Array.isArray(settings.allowedDeliveryProviders)
      ? [...settings.allowedDeliveryProviders]
      : []
    draft.storePickupEnabled = settings.storePickupEnabled === true

    slug.value = settings.slug || ''
    published.value = settings.isPublished === true
    // A tenant that already has products satisfies the requirement without
    // retyping one into the wizard.
    if (checklist?.hasProducts) draft.product.createdId = 'existing'

    const resumeAt = Number(settings.onboardingStep) || 0
    step.value = Math.min(Math.max(resumeAt, 0), STEP_KEYS.length - 1)
    furthest.value = step.value

    // The draft banner on the storefront links straight at the publish step.
    if (route.query.step === 'publish') goTo(STEP_KEYS.length - 1)

    useState<any>('storeSettings').value = settings
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('admin.pages.onboarding.errors.loadFailed')
  } finally {
    loading.value = false
  }
}

async function saveSettings(extra: Record<string, unknown> = {}) {
  const updated = await $fetch<any>('/api/admin/store-settings', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authStore.token}` },
    body: {
      name: draft.name.trim(),
      logoUrl: draft.logoUrl,
      description: draft.description,
      language: draft.language,
      templateKey: draft.templateKey,
      primaryColor: draft.primaryColor,
      allowedDeliveryProviders: draft.deliveryProviders,
      storePickupEnabled: draft.storePickupEnabled,
      onboardingStep: step.value,
      ...extra
    }
  })
  useState<any>('storeSettings').value = updated
  return updated
}

/**
 * Creates the product the merchant typed in step 3, once. Re-entering the step
 * and moving forward again must not leave two products behind, so the created id
 * is remembered on the draft.
 */
async function createFirstProductIfNeeded() {
  const { name, price, imageUrl, createdId } = draft.product
  if (createdId || !name.trim()) return

  const slugified = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  const created = await $fetch<any>('/api/admin/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authStore.token}` },
    body: {
      title: name.trim(),
      slug: `${slugified || 'produit'}-${Math.random().toString(36).slice(2, 8)}`,
      price: Number(price) || 0,
      stock: 0,
      isActive: true,
      images: imageUrl ? [imageUrl] : []
    }
  })

  draft.product.createdId = created?.id ?? 'created'
  serverMissing.value = serverMissing.value.filter((m) => m !== 'product')
}

async function commitStep() {
  if (step.value === 3) await createFirstProductIfNeeded()
  await saveSettings()
}

async function next() {
  if (!canAdvance.value) return
  saving.value = true
  error.value = ''
  try {
    await commitStep()
    step.value = Math.min(step.value + 1, STEP_KEYS.length - 1)
    furthest.value = Math.max(furthest.value, step.value)
    await saveSettings()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('admin.pages.onboarding.errors.saveFailed')
  } finally {
    saving.value = false
  }
}

function back() {
  step.value = Math.max(step.value - 1, 0)
}

function goTo(index: number) {
  if (index > furthest.value) return
  step.value = index
}

function goToStepKey(key: string) {
  const index = STEP_KEYS.indexOf(key === 'product' ? 'firstProduct' : (key as StepKey))
  if (index >= 0) {
    furthest.value = Math.max(furthest.value, index)
    step.value = index
  }
}

async function publish() {
  saving.value = true
  error.value = ''
  try {
    await commitStep()
    await $fetch('/api/admin/store-settings/publish', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    published.value = true
    await saveSettings({ isCompleted: true })
    if (import.meta.client) localStorage.removeItem('tour_seen_sidebar')
  } catch (e: any) {
    // The server owns the requirements; if it refuses, show what it is missing
    // rather than the local guess.
    if (e?.data?.missing) serverMissing.value = e.data.missing
    error.value = e?.data?.statusMessage || t('admin.pages.onboarding.errors.publishFailed')
  } finally {
    saving.value = false
  }
}

async function finishLater() {
  saving.value = true
  try {
    await saveSettings({ onboardingExited: true })
  } catch {
    // Leaving must not be blocked by a failed save; the merchant keeps whatever
    // was already persisted and the redirect will simply bring them back.
  } finally {
    saving.value = false
    await navigateTo('/admin')
  }
}

async function goToDashboard() {
  await navigateTo('/admin')
}

onMounted(loadSettings)
</script>

<style scoped>
.onboarding-step-enter-active,
.onboarding-step-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.onboarding-step-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.onboarding-step-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (prefers-reduced-motion: reduce) {
  .onboarding-step-enter-active,
  .onboarding-step-leave-active {
    transition: none;
  }
}
</style>
