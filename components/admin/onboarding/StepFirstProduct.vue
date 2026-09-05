<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-semibold text-primary">{{ t('admin.pages.onboarding.firstProduct.title') }}</h2>
      <p class="mt-1 text-sm text-secondary">{{ t('admin.pages.onboarding.firstProduct.subtitle') }}</p>
    </div>

    <div
      v-if="modelValue.product.createdId"
      class="flex items-start gap-2.5 rounded-xl border border-line p-3 surface-2"
    >
      <Icon name="lucide:check-circle-2" class="mt-0.5 h-4 w-4 shrink-0 text-success" />
      <p class="text-mini text-secondary">{{ t('admin.pages.onboarding.firstProduct.created') }}</p>
    </div>

    <UiField :label="t('admin.pages.onboarding.firstProduct.nameLabel')">
      <template #default="{ fieldId }">
        <input
          :id="fieldId"
          :value="modelValue.product.name"
          type="text"
          maxlength="120"
          class="ui-input w-full px-3 py-2"
          :placeholder="t('admin.pages.onboarding.firstProduct.namePlaceholder')"
          @input="patchProduct({ name: ($event.target as HTMLInputElement).value })"
        >
      </template>
    </UiField>

    <UiField :label="t('admin.pages.onboarding.firstProduct.priceLabel')">
      <template #default="{ fieldId }">
        <input
          :id="fieldId"
          :value="modelValue.product.price ?? ''"
          type="number"
          min="0"
          step="1"
          inputmode="numeric"
          class="ui-input w-full px-3 py-2 font-mono-nums"
          placeholder="0"
          @input="onPriceInput(($event.target as HTMLInputElement).value)"
        >
      </template>
    </UiField>

    <UiField :label="t('admin.pages.onboarding.firstProduct.imageLabel')" :error="uploadError">
      <div class="flex items-center gap-4">
        <div class="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-line surface-3">
          <img
            v-if="modelValue.product.imageUrl"
            :src="modelValue.product.imageUrl"
            alt=""
            class="h-full w-full object-cover"
          >
          <div v-else class="flex h-full w-full items-center justify-center">
            <Icon name="lucide:image" class="h-6 w-6 text-muted" />
          </div>
        </div>

        <label class="ui-btn ui-btn--secondary inline-flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm">
          <Icon v-if="!uploading" name="lucide:upload" class="h-3.5 w-3.5" />
          <span v-else class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-transparent [border-bottom-color:currentColor]" />
          {{ modelValue.product.imageUrl
            ? t('admin.pages.onboarding.firstProduct.imageChange')
            : t('admin.pages.onboarding.firstProduct.imageUpload') }}
          <input type="file" accept="image/*" class="sr-only" :disabled="uploading" @change="onImageChange">
        </label>
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

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const { uploadWithProgress } = useUploadWithProgress()

const uploading = ref(false)
const uploadError = ref('')

function patchProduct(fields: Partial<OnboardingDraft['product']>) {
  emit('update:modelValue', {
    ...props.modelValue,
    product: { ...props.modelValue.product, ...fields }
  })
}

function onPriceInput(raw: string) {
  const parsed = Number(raw)
  patchProduct({ price: raw === '' || !Number.isFinite(parsed) ? null : parsed })
}

async function onImageChange(event: Event) {
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
    patchProduct({ imageUrl: result.url })
  } catch (e: any) {
    uploadError.value = e?.message || t('admin.pages.onboarding.errors.uploadFailed')
  } finally {
    uploading.value = false
    input.value = ''
  }
}
</script>
