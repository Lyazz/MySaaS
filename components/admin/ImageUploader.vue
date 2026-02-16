<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-slate-700">
          {{ label }}
        </p>
        <p
          v-if="hint"
          class="text-xs text-slate-500"
        >
          {{ hint }}
        </p>
      </div>
      <div
        v-if="uploading"
        class="text-xs text-teal-600 font-medium flex items-center gap-1.5"
      >
        <Icon name="lucide:loader-2" class="w-3 h-3 animate-spin" />
        {{ t('admin.common.uploading') }}
      </div>
    </div>

    <div class="group relative bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl overflow-hidden hover:border-slate-400 transition-colors">
      <!-- Preview -->
      <div v-if="modelValue" class="relative group-hover:opacity-90 transition-opacity">
        <img
          :src="modelValue"
          alt="Preview"
          class="w-full h-auto max-h-[300px] object-contain bg-slate-100"
        >
        
        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            type="button"
            class="p-2 bg-white text-slate-700 rounded-lg hover:text-red-600 transition-colors shadow-lg"
            @click="removeImage"
            :title="t('admin.common.remove')"
          >
            <Icon name="lucide:trash-2" class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Upload Placeholder -->
      <label
        v-else
        class="flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-slate-100/50 transition-colors"
      >
        <div class="p-3 bg-white rounded-full shadow-sm mb-3">
           <Icon name="lucide:image-plus" class="w-6 h-6 text-teal-600" />
        </div>
        <span class="text-sm font-medium text-slate-700">{{ t('admin.components.imageUploader.clickToUpload') }}</span>
        <span class="mt-1 text-xs text-slate-500">{{ t('admin.components.imageUploader.dragDrop') }}</span>
        <input
          type="file"
          class="hidden"
          accept="image/*"
          :disabled="uploading"
          @change="handleFileSelect"
        >
      </label>
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
const authStore = useAuthStore()

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const [file] = input.files
  
  // Basic validation
  if (!file.type.startsWith('image/')) {
    alert(t('admin.components.imageUploader.errors.imageOnly'))
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
        Authorization: `Bearer ${authStore.token}`
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error(t('admin.components.imageUploader.errors.uploadFailed'))
    }

    const data = await response.json()
    emit('update:modelValue', data.url)
  } catch (error) {
    console.error('Upload error:', error)
    alert(t('admin.components.imageUploader.errors.uploadFailed'))
  } finally {
    uploading.value = false
    input.value = ''
  }
}

const removeImage = () => {
  emit('update:modelValue', null)
}
</script>
