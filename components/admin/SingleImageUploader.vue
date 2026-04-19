<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-[13px] font-medium" style="color: var(--text-secondary)">
          {{ label }}
        </p>
        <p v-if="hint" class="mt-0.5 text-xs" style="color: var(--text-tertiary)">
          {{ hint }}
        </p>
      </div>
      <div v-if="uploading" class="text-xs font-medium [color:var(--brand)]">
        {{ t('admin.common.uploading') }}
      </div>
    </div>

    <div
      class="relative overflow-hidden rounded-xl"
      :class="policy.requireSquare ? 'aspect-square max-w-[22rem]' : 'h-56 w-full'"
      style="background: var(--surface-2); border: 2px dashed var(--surface-border)"
    >
      <template v-if="modelValue">
        <img
          :src="modelValue"
          :alt="t('admin.components.singleImageUploader.previewAlt')"
          class="h-full w-full object-contain p-2"
        >
        <button
          type="button"
          class="absolute right-2 top-2 rounded-full p-1.5"
          style="background: var(--surface-3); border: 1px solid var(--surface-border)"
          @click="removeImage"
        >
          <Icon name="lucide:x" class="h-4 w-4" style="color: var(--text-secondary)" />
        </button>
      </template>

      <template v-else>
        <label class="flex h-full w-full cursor-pointer flex-col items-center justify-center">
          <Icon name="lucide:upload" class="h-10 w-10" style="color: var(--text-muted)" />
          <span class="mt-2 text-xs" style="color: var(--text-tertiary)">
            {{ t('admin.components.singleImageUploader.uploadCta') }}
          </span>
          <input
            ref="fileInput"
            type="file"
            class="hidden"
            :accept="acceptMimes"
            :disabled="uploading"
            @change="handleFileSelect"
          >
        </label>
      </template>
    </div>

    <ImageCropperModal
      :open="cropperOpen"
      :file="selectedFile"
      :crop-presets="policy.cropPresets"
      :default-preset="policy.defaultPreset"
      @cancel="closeCropper"
      @error="showCropperError"
      @confirm="handleCroppedFile"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import ImageCropperModal from '~/components/admin/ImageCropperModal.vue'
import {
  bytesFromMb,
  formatMaxFileSizeLabel,
  isAllowedImageMimeType,
  resolveImageUploadPolicy,
  type CropRatioPreset,
  type ImageUploaderMode
} from '~/shared/image-upload/policies'

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    label?: string
    hint?: string
    mode?: ImageUploaderMode
    cropPresets?: CropRatioPreset[]
    defaultPreset?: CropRatioPreset
    maxFileSizeMb?: number
  }>(),
  {
    mode: 'generic',
    cropPresets: undefined,
    defaultPreset: undefined,
    maxFileSizeMb: undefined
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()

const policy = computed(() =>
  resolveImageUploadPolicy({
    mode: props.mode,
    cropPresets: props.cropPresets,
    defaultPreset: props.defaultPreset,
    maxFileSizeMb: props.maxFileSizeMb
  })
)

const acceptMimes = computed(() => policy.value.allowedMimeTypes.join(','))

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const cropperOpen = ref(false)
const uploading = ref(false)

const getAuthToken = () => authStore.token || useCookie('auth_token').value

const clearFileInput = () => {
  if (fileInput.value) fileInput.value.value = ''
}

const fileTooLarge = (file: File): boolean => {
  if (!policy.value.maxFileSizeMb) return false
  return file.size > bytesFromMb(policy.value.maxFileSizeMb)
}

const showInvalidTypeError = () => {
  alert(t('admin.components.singleImageUploader.errors.invalidType'))
}

const showTooLargeError = () => {
  const maxSize = policy.value.maxFileSizeMb
  if (!maxSize) {
    alert(t('admin.components.singleImageUploader.errors.uploadFailed'))
    return
  }
  alert(
    t('admin.components.singleImageUploader.errors.tooLarge', {
      max: formatMaxFileSizeLabel(maxSize)
    })
  )
}

const openCropper = (file: File) => {
  selectedFile.value = file
  cropperOpen.value = true
}

const closeCropper = () => {
  cropperOpen.value = false
  selectedFile.value = null
  clearFileInput()
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!isAllowedImageMimeType(file.type, policy.value.allowedMimeTypes)) {
    showInvalidTypeError()
    clearFileInput()
    return
  }

  if (fileTooLarge(file)) {
    showTooLargeError()
    clearFileInput()
    return
  }

  openCropper(file)
}

const uploadFile = async (file: File) => {
  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)

    const token = getAuthToken()
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload?.error || t('admin.components.singleImageUploader.errors.uploadFailed'))
    }

    emit('update:modelValue', payload.url)
  } catch (error) {
    console.error('Upload error:', error)
    alert(error instanceof Error ? error.message : t('admin.components.singleImageUploader.errors.uploadFailed'))
  } finally {
    uploading.value = false
    closeCropper()
  }
}

const handleCroppedFile = async (file: File) => {
  if (fileTooLarge(file)) {
    showTooLargeError()
    closeCropper()
    return
  }

  await uploadFile(file)
}

const showCropperError = (message: string) => {
  alert(message || t('admin.components.singleImageUploader.errors.cropFailed'))
}

const removeImage = () => {
  emit('update:modelValue', null)
}
</script>
