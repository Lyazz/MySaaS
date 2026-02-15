<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-gray-700">
          {{ label }}
        </p>
        <p
          v-if="hint"
          class="text-xs text-gray-500"
        >
          {{ hint }}
        </p>
      </div>
      <div
        v-if="uploading"
        class="text-xs text-teal-600 font-medium"
      >
        {{ t('admin.common.uploading') }}
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="relative aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden flex items-center justify-center">
        <template v-if="modelValue">
          <img
            :src="modelValue"
            :alt="t('admin.components.singleImageUploader.previewAlt')"
            class="w-full h-full object-cover"
          >
          <button
            type="button"
            class="absolute top-2 right-2 bg-white/90 border border-gray-200 rounded-full p-1.5 shadow-sm hover:bg-white"
            @click="removeImage"
          >
            <Icon name="lucide:x" class="w-4 h-4 text-gray-600" />
          </button>
        </template>
        <template v-else>
          <label class="flex flex-col items-center justify-center w-full h-full cursor-pointer">
            <Icon name="lucide:upload" class="w-10 h-10 text-gray-400" />
            <span class="mt-2 text-xs text-gray-500">{{ t('admin.components.singleImageUploader.uploadCta') }}</span>
            <input
              type="file"
              class="hidden"
              accept="image/png"
              :disabled="uploading"
              @change="handleFileSelect"
            >
          </label>
        </template>
      </div>

      <!-- Guidelines removed as per request -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: string | null
  label?: string
  hint?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const uploading = ref(false)
const { t } = useI18n({ useScope: 'global' })

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const [file] = input.files
  if (file.type !== 'image/png') {
    alert(t('admin.components.singleImageUploader.errors.pngOnly'))
    input.value = ''
    return
  }

  // Check dimensions
  const img = new Image()
  const objectUrl = URL.createObjectURL(file)
  
  img.onload = async () => {
    URL.revokeObjectURL(objectUrl)
    if (img.width !== img.height) {
      alert(t('admin.components.singleImageUploader.errors.squareOnly', { w: img.width, h: img.height }))
      input.value = ''
      return
    }

    // Proceed with upload
    uploading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${useCookie('auth_token').value}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(t('admin.components.singleImageUploader.errors.uploadFailed'))
      }

      const data = await response.json()
      emit('update:modelValue', data.url)
    } catch (error) {
      console.error('Upload error:', error)
      alert(t('admin.components.singleImageUploader.errors.uploadFailed'))
    } finally {
      uploading.value = false
      input.value = ''
    }
  }

  img.onerror = () => {
    URL.revokeObjectURL(objectUrl)
    alert(t('admin.components.singleImageUploader.errors.readDimensionsFailed'))
    input.value = ''
  }
  
  img.src = objectUrl
}

const removeImage = () => {
  emit('update:modelValue', null)
}
</script>
