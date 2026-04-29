<template>
  <div class="space-y-5">
    <div>
      <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
        {{ t('admin.pages.onboarding.firstProduct.title') }}
      </h3>
      <p class="text-sm mt-1" style="color: var(--text-secondary)">
        {{ t('admin.pages.onboarding.firstProduct.subtitle') }}
      </p>
    </div>

    <!-- Product name -->
    <div>
      <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.firstProduct.nameLabel') }}</label>
      <input
        :value="modelValue.product.name"
        type="text"
        class="ui-input w-full px-3 py-2"
        :placeholder="t('admin.pages.onboarding.firstProduct.namePlaceholder')"
        @input="updateProduct('name', ($event.target as HTMLInputElement).value)"
      >
    </div>

    <!-- Price -->
    <div>
      <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.firstProduct.priceLabel') }}</label>
      <input
        :value="modelValue.product.price ?? ''"
        type="number"
        min="0"
        class="ui-input w-full px-3 py-2"
        placeholder="0"
        @input="updateProduct('price', Number(($event.target as HTMLInputElement).value) || null)"
      >
    </div>

    <!-- Image upload -->
    <div>
      <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.firstProduct.imageLabel') }}</label>
      <div class="flex items-center gap-4">
        <div
          v-if="modelValue.product.imageUrl"
          class="w-16 h-16 rounded-lg overflow-hidden border shrink-0"
          style="border-color: var(--surface-border)"
        >
          <img :src="modelValue.product.imageUrl" alt="product" class="w-full h-full object-cover">
        </div>
        <div v-else class="w-16 h-16 rounded-lg flex items-center justify-center shrink-0" style="background: var(--surface-3); border: 1px dashed var(--surface-border)">
          <Icon name="lucide:image" class="w-6 h-6" style="color: var(--text-muted)" />
        </div>
        <div>
          <label class="ui-btn ui-btn--secondary px-3 py-1.5 text-sm cursor-pointer inline-flex items-center gap-2">
            <Icon name="lucide:upload" class="w-3.5 h-3.5" />
            {{ modelValue.product.imageUrl ? t('admin.pages.onboarding.firstProduct.imageChange') : t('admin.pages.onboarding.firstProduct.imageUpload') }}
            <input type="file" accept="image/*" class="sr-only" @change="onImageChange">
          </label>
        </div>
        <div v-if="uploading" class="text-sm" style="color: var(--text-secondary)">
          <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 [border-color:var(--brand)]" />
        </div>
      </div>
      <p v-if="uploadError" class="mt-1 text-sm text-red-500">{{ uploadError }}</p>
    </div>

    <!-- Error from parent product creation -->
    <p v-if="productError" class="text-sm text-red-500">{{ productError }}</p>

    <!-- Skip link -->
    <div class="pt-1">
      <button type="button" class="text-sm underline" style="color: var(--text-muted)" @click="emit('skip')">
        {{ t('admin.pages.onboarding.firstProduct.skipLink') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useUploadWithProgress } from '~/composables/useUploadWithProgress'

interface OnboardingForm {
  name: string; logoUrl: string | null; description: string
  templateKey: string; primaryColor: string; language: string
  product: { name: string; price: number | null; imageUrl: string | null }
}

const props = defineProps<{
  modelValue: OnboardingForm
  productError?: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: OnboardingForm]
  'skip': []
}>()

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const { uploadWithProgress } = useUploadWithProgress()

const uploading = ref(false)
const uploadError = ref('')

function updateProduct(field: 'name' | 'price' | 'imageUrl', value: any) {
  emit('update:modelValue', {
    ...props.modelValue,
    product: { ...props.modelValue.product, [field]: value }
  })
}

async function onImageChange(event: Event) {
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
    updateProduct('imageUrl', result.url)
  } catch (e: any) {
    uploadError.value = e.message || 'Upload failed'
  } finally {
    uploading.value = false
  }
}
</script>
