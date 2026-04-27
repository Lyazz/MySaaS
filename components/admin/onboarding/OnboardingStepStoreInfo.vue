<template>
  <div class="space-y-5">
    <div>
      <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
        {{ t('admin.pages.onboarding.storeInfo.title') }}
      </h3>
    </div>

    <!-- Store name -->
    <div>
      <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.storeInfo.nameLabel') }}</label>
      <input
        :value="modelValue.name"
        type="text"
        class="ui-input w-full px-3 py-2"
        :placeholder="t('admin.pages.onboarding.storeInfo.namePlaceholder')"
        @input="emit('update:modelValue', { ...modelValue, name: ($event.target as HTMLInputElement).value })"
      >
    </div>

    <!-- Logo upload -->
    <div>
      <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.storeInfo.logoLabel') }}</label>
      <div class="flex items-center gap-4">
        <div
          v-if="modelValue.logoUrl"
          class="w-16 h-16 rounded-lg overflow-hidden border shrink-0"
          style="border-color: var(--surface-border)"
        >
          <img :src="modelValue.logoUrl" alt="logo" class="w-full h-full object-contain">
        </div>
        <div v-else class="w-16 h-16 rounded-lg flex items-center justify-center shrink-0" style="background: var(--surface-3); border: 1px dashed var(--surface-border)">
          <Icon name="lucide:image" class="w-6 h-6" style="color: var(--text-muted)" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="ui-btn ui-btn--secondary px-3 py-1.5 text-sm cursor-pointer inline-flex items-center gap-2">
            <Icon name="lucide:upload" class="w-3.5 h-3.5" />
            {{ modelValue.logoUrl ? t('admin.pages.onboarding.storeInfo.logoChange') : t('admin.pages.onboarding.storeInfo.logoUpload') }}
            <input type="file" accept="image/*" class="sr-only" @change="onLogoChange">
          </label>
          <p class="text-xs" style="color: var(--text-muted)">{{ t('admin.pages.onboarding.storeInfo.logoHint') }}</p>
        </div>
        <div v-if="uploading" class="text-sm" style="color: var(--text-secondary)">
          <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 [border-color:var(--brand)]" />
        </div>
      </div>
      <p v-if="uploadError" class="mt-1 text-sm text-red-500">{{ uploadError }}</p>
    </div>

    <!-- Description -->
    <div>
      <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.storeInfo.descriptionLabel') }}</label>
      <textarea
        :value="modelValue.description"
        rows="3"
        class="ui-input w-full px-3 py-2"
        :placeholder="t('admin.pages.onboarding.storeInfo.descriptionPlaceholder')"
        @input="emit('update:modelValue', { ...modelValue, description: ($event.target as HTMLTextAreaElement).value })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useUploadWithProgress } from '~/composables/useUploadWithProgress'

interface OnboardingForm {
  name: string
  logoUrl: string | null
  description: string
  templateKey: string
  primaryColor: string
  language: string
  product: { name: string; price: number | null; imageUrl: string | null }
}

const props = defineProps<{ modelValue: OnboardingForm }>()
const emit = defineEmits<{ 'update:modelValue': [value: OnboardingForm] }>()

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const { uploadWithProgress } = useUploadWithProgress()

const uploading = ref(false)
const uploadError = ref('')

async function onLogoChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  uploadError.value = ''
  try {
    const result = await uploadWithProgress<{ url: string }>({
      url: '/api/upload',
      file,
      token: authStore.token
    })
    emit('update:modelValue', { ...props.modelValue, logoUrl: result.url })
  } catch (e: any) {
    uploadError.value = e.message || 'Upload failed'
  } finally {
    uploading.value = false
  }
}
</script>
