<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-semibold text-primary">{{ t('admin.pages.onboarding.storeInfo.title') }}</h2>
      <p class="mt-1 text-sm text-secondary">{{ t('admin.pages.onboarding.storeInfo.subtitle') }}</p>
    </div>

    <UiField :label="t('admin.pages.onboarding.storeInfo.nameLabel')" :error="nameError">
      <template #default="{ fieldId }">
        <input
          :id="fieldId"
          :value="modelValue.name"
          type="text"
          autofocus
          maxlength="60"
          class="ui-input w-full px-3 py-2"
          :placeholder="t('admin.pages.onboarding.storeInfo.namePlaceholder')"
          @input="patch({ name: ($event.target as HTMLInputElement).value })"
        >
      </template>
    </UiField>

    <UiField
      :label="t('admin.pages.onboarding.storeInfo.logoLabel')"
      :hint="t('admin.pages.onboarding.storeInfo.logoHint')"
      :error="uploadError"
    >
      <div class="flex items-center gap-4">
        <div class="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-line surface-3">
          <img v-if="modelValue.logoUrl" :src="modelValue.logoUrl" alt="" class="h-full w-full object-contain">
          <div v-else class="flex h-full w-full items-center justify-center">
            <Icon name="lucide:image" class="h-6 w-6 text-muted" />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <label class="ui-btn ui-btn--secondary inline-flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm">
            <Icon v-if="!uploading" name="lucide:upload" class="h-3.5 w-3.5" />
            <span v-else class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-transparent [border-bottom-color:currentColor]" />
            {{ modelValue.logoUrl ? t('admin.pages.onboarding.storeInfo.logoChange') : t('admin.pages.onboarding.storeInfo.logoUpload') }}
            <input type="file" accept="image/*" class="sr-only" :disabled="uploading" @change="onLogoChange">
          </label>

          <button
            v-if="modelValue.logoUrl"
            type="button"
            class="text-mini text-muted underline"
            @click="patch({ logoUrl: null })"
          >
            {{ t('admin.pages.onboarding.storeInfo.logoRemove') }}
          </button>
        </div>
      </div>
    </UiField>

    <UiField
      :label="t('admin.pages.onboarding.storeInfo.descriptionLabel')"
      :hint="t('admin.pages.onboarding.storeInfo.descriptionHint')"
    >
      <template #default="{ fieldId }">
        <textarea
          :id="fieldId"
          :value="modelValue.description"
          rows="3"
          maxlength="300"
          class="ui-input w-full px-3 py-2"
          :placeholder="t('admin.pages.onboarding.storeInfo.descriptionPlaceholder')"
          @input="patch({ description: ($event.target as HTMLTextAreaElement).value })"
        />
      </template>
    </UiField>

    <UiField
      :label="t('admin.pages.onboarding.language.label')"
      :hint="t('admin.pages.onboarding.language.rtlHint')"
    >
      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in LANGUAGES"
          :key="option.key"
          type="button"
          class="rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors"
          :class="modelValue.language === option.key
            ? 'border-line-strong text-primary surface-2'
            : 'border-line text-secondary hover:text-primary'"
          :aria-pressed="modelValue.language === option.key"
          @click="selectLanguage(option.key)"
        >
          {{ t(`i18n.locales.${option.key}`) }}
          <span class="text-micro uppercase text-muted">{{ option.key }}</span>
        </button>
      </div>
    </UiField>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useUploadWithProgress } from '~/composables/useUploadWithProgress'
import type { OnboardingDraft } from './types'

const props = defineProps<{ modelValue: OnboardingDraft }>()
const emit = defineEmits<{ 'update:modelValue': [value: OnboardingDraft] }>()

const { t, setLocale } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const { uploadWithProgress } = useUploadWithProgress()

const LANGUAGES = [{ key: 'fr' }, { key: 'ar' }, { key: 'en' }] as const

const uploading = ref(false)
const uploadError = ref('')

const nameError = computed(() =>
  props.modelValue.name.trim().length === 0 ? t('admin.pages.onboarding.errors.nameRequired') : ''
)

function patch(fields: Partial<OnboardingDraft>) {
  emit('update:modelValue', { ...props.modelValue, ...fields })
}

async function selectLanguage(language: string) {
  patch({ language })
  // Switching the admin's own locale too: a merchant who picks Arabic for their
  // storefront is almost never reading the rest of the wizard in French.
  try { await setLocale(language as any) } catch { /* locale is cosmetic here */ }
}

async function onLogoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  uploadError.value = ''
  try {
    const result = await uploadWithProgress<{ url: string }>({
      url: '/api/upload',
      file,
      token: authStore.token
    })
    patch({ logoUrl: result.url })
  } catch (e: any) {
    uploadError.value = e?.message || t('admin.pages.onboarding.errors.uploadFailed')
  } finally {
    uploading.value = false
    input.value = ''
  }
}
</script>
