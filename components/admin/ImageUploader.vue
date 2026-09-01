<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-secondary">
          {{ label }}
        </p>
        <p v-if="hint" class="mt-0.5 text-xs text-tertiary">
          {{ hint }}
        </p>
      </div>
      <div v-if="uploading" class="flex items-center gap-1.5 text-xs font-medium [color:var(--brand)]">
        <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin" />
        {{ t('admin.common.uploading') }} {{ uploadProgress }}%
      </div>
    </div>

    <div class="group relative overflow-hidden rounded-xl transition-colors ui-dropzone border-2">
      <div v-if="modelValue" class="relative transition-opacity group-hover:opacity-90">
        <img
 :src="modelValue"
 alt="Preview"
 class="max-h-[300px] w-full object-contain surface-3"
 
>

        <div class="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <button
 type="button"
 class="rounded-lg p-2 transition-colors surface-2 text-secondary"
 
 :title="t('admin.common.remove')"
 @mouseenter="(e: MouseEvent) => ((e.currentTarget as HTMLElement).style.color = '#f87171')"
 @mouseleave="(e: MouseEvent) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)')"
 @click="removeImage"
>
            <Icon name="lucide:trash-2" class="h-5 w-5" />
          </button>
        </div>
      </div>

      <label
        v-else
        class="flex cursor-pointer flex-col items-center justify-center p-8 transition-colors"
        @mouseenter="(e: MouseEvent) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)')"
        @mouseleave="(e: MouseEvent) => ((e.currentTarget as HTMLElement).style.background = '')"
      >
        <div class="mb-3 rounded-full p-3 surface-3">
          <Icon name="lucide:image-plus" class="h-6 w-6 [color:var(--brand)]" />
        </div>
        <span class="text-sm font-medium text-secondary">
          {{ t('admin.components.imageUploader.clickToUpload') }}
        </span>
        <span class="mt-1 text-xs text-tertiary">
          {{ t('admin.components.imageUploader.dragDrop') }}
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

const uploading = ref(false)
const uploadProgress = ref(0)
const selectedFile = ref<File | null>(null)
const cropperOpen = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const { uploadWithProgress } = useUploadWithProgress()

const policy = computed(() =>
  resolveImageUploadPolicy({
    mode: props.mode,
    cropPresets: props.cropPresets,
    defaultPreset: props.defaultPreset,
    maxFileSizeMb: props.maxFileSizeMb
  })
)
const acceptMimes = computed(() => policy.value.allowedMimeTypes.join(','))

const clearFileInput = () => {
  if (fileInput.value) fileInput.value.value = ''
}

const getAuthToken = () => authStore.token || useCookie('auth_token').value

const fileTooLarge = (file: File): boolean => {
  if (!policy.value.maxFileSizeMb) return false
  return file.size > bytesFromMb(policy.value.maxFileSizeMb)
}

const showTooLargeError = () => {
  const maxSize = policy.value.maxFileSizeMb
  if (!maxSize) {
    alert(t('admin.components.imageUploader.errors.uploadFailed'))
    return
  }
  alert(
    t('admin.components.imageUploader.errors.tooLarge', {
      max: formatMaxFileSizeLabel(maxSize)
    })
  )
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!isAllowedImageMimeType(file.type, policy.value.allowedMimeTypes)) {
    alert(t('admin.components.imageUploader.errors.invalidType'))
    clearFileInput()
    return
  }

  if (fileTooLarge(file)) {
    showTooLargeError()
    clearFileInput()
    return
  }

  selectedFile.value = file
  cropperOpen.value = true
}

const closeCropper = () => {
  cropperOpen.value = false
  selectedFile.value = null
  clearFileInput()
}

const uploadFile = async (file: File) => {
  uploading.value = true
  uploadProgress.value = 0
  try {
    const token = getAuthToken()
    const data = await uploadWithProgress<{ url: string; error?: string }>({
      url: '/api/upload',
      file,
      token,
      fallbackErrorMessage: t('admin.components.imageUploader.errors.uploadFailed'),
      onProgress: (percent) => {
        uploadProgress.value = percent
      }
    })

    emit('update:modelValue', data.url)
  } catch (error) {
    console.error('Upload error:', error)
    alert(error instanceof Error ? error.message : t('admin.components.imageUploader.errors.uploadFailed'))
  } finally {
    uploading.value = false
    uploadProgress.value = 0
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
  alert(message || t('admin.components.imageUploader.errors.cropFailed'))
}

const removeImage = () => {
  emit('update:modelValue', null)
}
</script>
