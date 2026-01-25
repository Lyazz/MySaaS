<template>
  <div class="space-y-4">
    <div class="flex items-center gap-4">
      <label class="block text-sm font-medium text-gray-700">Product Images</label>
      <div v-if="uploading" class="text-sm text-blue-600">Uploading...</div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div v-for="(url, index) in modelValue" :key="index" class="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
        <img :src="url" class="w-full h-full object-cover" />
        <button 
          @click="removeImage(index)"
          type="button"
          class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <label class="relative cursor-pointer aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 flex flex-col items-center justify-center transition-colors">
        <div class="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span class="mt-2 block text-xs text-gray-500">Add Image</span>
        </div>
        <input type="file" class="hidden" accept="image/*" multiple @change="handleFileSelect" :disabled="uploading" />
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const uploading = ref(false)

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  uploading.value = true
  const newUrls = [...props.modelValue]

  try {
    for (const file of Array.from(input.files)) {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${useCookie('auth_token').value}` // Pass auth token
        },
        body: formData
      })

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()
      newUrls.push(data.url)
    }
    
    emit('update:modelValue', newUrls)
  } catch (error) {
    console.error('Upload error:', error)
    alert('Failed to upload image')
  } finally {
    uploading.value = false
    input.value = '' // Reset input
  }
}

const removeImage = (index: number) => {
  const newUrls = [...props.modelValue]
  newUrls.splice(index, 1)
  emit('update:modelValue', newUrls)
}
</script>
