<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <label class="ui-label">{{ t('admin.imageUploader.title') }}</label>
      <div v-if="uploading" class="text-sm text-blue-600">
        {{ t('admin.common.uploading') }} {{ uploadProgress }}%
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div
        v-for="(image, index) in images"
        :key="image.id || `${image.url}-${index}`"
        draggable="true"
        class="relative group aspect-square cursor-move overflow-hidden rounded-lg border-2 transition-all"
        :class="dragging === index ? 'opacity-50' : ''"
        :style="image.isMain ? 'border-color: var(--brand); background: var(--surface-3)' : 'border-color: var(--surface-border); background: var(--surface-3)'"
        @dragstart="handleDragStart($event, index)"
        @dragover.prevent="handleDragOver($event)"
        @drop="handleDrop($event, index)"
        @dragend="handleDragEnd"
      >
        <img
          :src="image.url"
          :alt="image.alt || t('admin.imageUploader.imageAlt')"
          class="h-full w-full object-contain"
        >

        <div v-if="image.isMain" class="absolute start-2 top-2">
          <span class="inline-flex items-center rounded-md [background:var(--brand)] px-2 py-1 text-xs font-medium text-white shadow-sm">
            <Icon name="lucide:star" class="me-1 h-3 w-3" />
            {{ t('admin.imageUploader.mainBadge') }}
          </span>
        </div>

        <div class="absolute bottom-2 start-2">
          <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-semibold text-white">
            {{ index + 1 }}
          </span>
        </div>

        <div class="absolute end-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            v-if="!image.isMain"
            type="button"
            :title="t('admin.imageUploader.actions.setAsMain')"
            class="rounded-full [background:var(--brand)] p-1.5 text-white shadow-sm hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)]"
            @click.stop="setAsMain(index)"
          >
            <Icon name="lucide:star" class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            :title="t('admin.imageUploader.actions.remove')"
            class="rounded-full bg-red-500 p-1.5 text-white shadow-sm hover:bg-red-600"
            @click.stop="removeImage(index)"
          >
            <Icon name="lucide:trash" class="h-3.5 w-3.5" />
          </button>
        </div>

        <div class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div class="rounded-lg bg-black/40 px-3 py-2">
            <Icon name="lucide:grip-vertical" class="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      <label
        class="relative aspect-square cursor-pointer rounded-lg border-2 border-dashed transition-colors"
        style="background: var(--surface-2); border-color: var(--surface-border)"
      >
        <div class="flex h-full flex-col items-center justify-center text-center">
          <Icon name="lucide:plus" class="mx-auto h-8 w-8" style="color: var(--text-muted)" />
          <span class="mt-2 block text-xs font-medium" style="color: var(--text-tertiary)">
            {{ t('admin.imageUploader.actions.addImage') }}
          </span>
        </div>
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          :accept="acceptMimes"
          multiple
          :disabled="uploading"
          @change="handleFileSelect"
        >
      </label>
    </div>

    <p class="text-xs" style="color: var(--text-tertiary)">
      <strong>{{ t('admin.imageUploader.tip.title') }}</strong> {{ t('admin.imageUploader.tip.body') }}
    </p>

    <ImageCropperModal
      :open="cropperOpen"
      :file="cropperFile"
      :crop-presets="policy.cropPresets"
      :default-preset="policy.defaultPreset"
      @cancel="handleCropperCancel"
      @error="handleCropperError"
      @confirm="handleCropperConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import ImageCropperModal from '~/components/admin/ImageCropperModal.vue'
import {
  bytesFromMb,
  formatMaxFileSizeLabel,
  isAllowedImageMimeType,
  resolveImageUploadPolicy
} from '~/shared/image-upload/policies'

interface ProductImage {
  id?: string | null
  url: string
  alt?: string
  position: number
  isMain: boolean
}

const props = defineProps<{
  modelValue: ProductImage[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ProductImage[]): void
}>()

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()

const policy = computed(() => resolveImageUploadPolicy({ mode: 'product' }))
const acceptMimes = computed(() => policy.value.allowedMimeTypes.join(','))

const images = ref<ProductImage[]>([...props.modelValue])
const uploading = ref(false)
const uploadProgress = ref(0)
const dragging = ref<number | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const { uploadWithProgress } = useUploadWithProgress()

const cropperOpen = ref(false)
const cropperFile = ref<File | null>(null)
let cropperResolver: ((file: File | null) => void) | null = null

watch(
  () => props.modelValue,
  (newVal) => {
    images.value = [...newVal]
  },
  { deep: true }
)

const getAuthToken = () => authStore.token || useCookie('auth_token').value

const clearFileInput = () => {
  if (fileInput.value) fileInput.value.value = ''
}

const isFileTooLarge = (file: File) => {
  const max = policy.value.maxFileSizeMb
  if (!max) return false
  return file.size > bytesFromMb(max)
}

const showTooLargeError = () => {
  const max = policy.value.maxFileSizeMb
  if (!max) {
    alert(t('admin.imageUploader.errors.uploadFailed'))
    return
  }

  alert(
    t('admin.imageUploader.errors.tooLarge', {
      max: formatMaxFileSizeLabel(max)
    })
  )
}

const openCropperForFile = (file: File): Promise<File | null> =>
  new Promise((resolve) => {
    cropperResolver = resolve
    cropperFile.value = file
    cropperOpen.value = true
  })

const finishCropper = (file: File | null) => {
  cropperOpen.value = false
  cropperFile.value = null
  if (cropperResolver) {
    cropperResolver(file)
    cropperResolver = null
  }
}

const handleCropperConfirm = (file: File) => {
  finishCropper(file)
}

const handleCropperCancel = () => {
  finishCropper(null)
}

const handleCropperError = (message: string) => {
  alert(message || t('admin.imageUploader.errors.cropFailed'))
  finishCropper(null)
}

const uploadImage = async (file: File): Promise<string> => {
  uploadProgress.value = 0
  const token = getAuthToken()
  const payload = await uploadWithProgress<{ url: string; error?: string }>({
    url: '/api/upload',
    file,
    token,
    fallbackErrorMessage: t('admin.imageUploader.errors.uploadFailed'),
    onProgress: (percent) => {
      uploadProgress.value = percent
    }
  })

  return payload.url
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  uploading.value = true
  uploadProgress.value = 0

  try {
    for (const file of Array.from(input.files)) {
      if (!isAllowedImageMimeType(file.type, policy.value.allowedMimeTypes)) {
        alert(t('admin.imageUploader.errors.invalidType'))
        continue
      }

      if (isFileTooLarge(file)) {
        showTooLargeError()
        continue
      }

      const cropped = await openCropperForFile(file)
      if (!cropped) continue

      if (isFileTooLarge(cropped)) {
        showTooLargeError()
        continue
      }

      const imageUrl = await uploadImage(cropped)

      const newImage: ProductImage = {
        id: null,
        url: imageUrl,
        alt: '',
        position: images.value.length,
        isMain: images.value.length === 0
      }

      images.value.push(newImage)
      emit('update:modelValue', images.value)
    }
  } catch (error) {
    console.error('Upload error:', error)
    alert(error instanceof Error ? error.message : t('admin.imageUploader.errors.uploadFailed'))
  } finally {
    uploading.value = false
    uploadProgress.value = 0
    clearFileInput()
    if (cropperOpen.value) {
      finishCropper(null)
    }
  }
}

const removeImage = (index: number) => {
  const removed = images.value[index]
  images.value.splice(index, 1)

  if (removed?.isMain && images.value.length > 0) {
    images.value[0].isMain = true
  }

  images.value.forEach((img, idx) => {
    img.position = idx
  })

  emit('update:modelValue', images.value)
}

const setAsMain = (index: number) => {
  const selected = images.value[index]
  if (!selected) return

  images.value.splice(index, 1)
  images.value.forEach((img) => {
    img.isMain = false
  })
  selected.isMain = true
  images.value.unshift(selected)

  images.value.forEach((img, idx) => {
    img.position = idx
  })

  emit('update:modelValue', images.value)
}

const handleDragStart = (event: DragEvent, index: number) => {
  dragging.value = index
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

const handleDrop = (event: DragEvent, dropIndex: number) => {
  event.preventDefault()
  if (dragging.value === null || dragging.value === dropIndex) return

  const dragged = images.value[dragging.value]
  images.value.splice(dragging.value, 1)
  images.value.splice(dropIndex, 0, dragged)

  images.value.forEach((img, idx) => {
    img.position = idx
  })

  emit('update:modelValue', images.value)
}

const handleDragEnd = () => {
  dragging.value = null
}
</script>
