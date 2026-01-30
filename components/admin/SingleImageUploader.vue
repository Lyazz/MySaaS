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
        Uploading...
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="relative aspect-video bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden flex items-center justify-center">
        <template v-if="modelValue">
          <img
            :src="modelValue"
            alt="Category image"
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
            <span class="mt-2 text-xs text-gray-500">Upload image</span>
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

      <div class="space-y-2 text-sm text-gray-600">
        <p class="font-medium text-gray-800">
          Guidelines
        </p>
        <ul class="list-disc list-inside space-y-1">
          <li>Use a 4:3 or 16:9 image for best results</li>
          <li>PNG only, max size 5MB</li>
          <li>Visible on storefront category tiles</li>
          <li>Uploads save automatically; no need to paste a URL</li>
        </ul>
      </div>
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

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const [file] = input.files
  if (file.type !== 'image/png') {
    alert('Please upload a PNG image for the category.')
    input.value = ''
    return
  }
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
      throw new Error('Upload failed')
    }

    const data = await response.json()
    emit('update:modelValue', data.url)
  } catch (error) {
    console.error('Upload error:', error)
    alert('Failed to upload image')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

const removeImage = () => {
  emit('update:modelValue', null)
}
</script>
