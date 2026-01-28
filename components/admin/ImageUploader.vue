<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <label class="block text-sm font-medium text-gray-700">Product Images</label>
      <div
        v-if="uploading"
        class="text-sm text-blue-600"
      >
        Uploading...
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <!-- Image Cards -->
      <div
        v-for="(image, index) in images"
        :key="image.id || index"
        draggable="true"
        class="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-all cursor-move"
        :class="[
          image.isMain ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300',
          dragging === index ? 'opacity-50' : ''
        ]"
        @dragstart="handleDragStart($event, index)"
        @dragover.prevent="handleDragOver($event, index)"
        @drop="handleDrop($event, index)"
        @dragend="handleDragEnd"
      >
        <!-- Image -->
        <img
          :src="image.url"
          :alt="image.alt || 'Product image'"
          class="w-full h-full object-cover"
        >
        
        <!-- Main Image Badge -->
        <div
          v-if="image.isMain"
          class="absolute top-2 left-2"
        >
          <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-600 text-white shadow-sm">
            <svg
              class="w-3 h-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Main
          </span>
        </div>

        <!-- Position Number -->
        <div class="absolute bottom-2 left-2">
          <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-black bg-opacity-60 text-white text-xs font-semibold">
            {{ index + 1 }}
          </span>
        </div>

        <!-- Action Buttons -->
        <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <!-- Set as Main Button -->
          <button
            v-if="!image.isMain"
            type="button"
            title="Set as main image"
            class="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-1.5 shadow-sm"
            @click.stop="setAsMain(index)"
          >
            <svg
              class="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
          
          <!-- Delete Button -->
          <button
            type="button"
            title="Remove image"
            class="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-sm"
            @click.stop="removeImage(index)"
          >
            <svg
              class="w-3.5 h-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>

        <!-- Drag Handle Indicator -->
        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
          <div class="bg-black bg-opacity-40 rounded-lg px-3 py-2">
            <svg
              class="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 8h16M4 16h16"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- Add Image Button -->
      <label class="relative cursor-pointer aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-indigo-500 flex flex-col items-center justify-center transition-colors">
        <div class="text-center">
          <svg
            class="mx-auto h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span class="mt-2 block text-xs text-gray-500 font-medium">Add Image</span>
        </div>
        <input 
          type="file" 
          class="hidden" 
          accept="image/*" 
          multiple 
          :disabled="uploading" 
          @change="handleFileSelect" 
        >
      </label>
    </div>

    <p class="text-xs text-gray-500">
      <strong>Tip:</strong> Drag and drop to reorder images. Click the star icon to set an image as the main product image.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

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

const images = ref<ProductImage[]>([...props.modelValue])
const uploading = ref(false)
const dragging = ref<number | null>(null)

// Watch for external changes to modelValue
watch(() => props.modelValue, (newVal) => {
  images.value = [...newVal]
}, { deep: true })

// Upload handler
const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  uploading.value = true

  try {
    for (const file of Array.from(input.files)) {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${useCookie('auth_token').value}`
        },
        body: formData
      })

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()
      
      // Add new image with auto-incremented position
      const newImage: ProductImage = {
        id: null,
        url: data.url,
        alt: '',
        position: images.value.length,
        isMain: images.value.length === 0 // First image is main by default
      }
      
      images.value.push(newImage)
    }

    emit('update:modelValue', images.value)
  } catch (error) {
    console.error('Upload error:', error)
    alert('Failed to upload image')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

// Remove image
const removeImage = (index: number) => {
  const removedImage = images.value[index]
  images.value.splice(index, 1)
  
  // If removed image was main, set first image as main
  if (removedImage.isMain && images.value.length > 0) {
    images.value[0].isMain = true
  }
  
  // Update positions
  images.value.forEach((img, idx) => {
    img.position = idx
  })
  
  emit('update:modelValue', images.value)
}

// Set image as main and move to first position
const setAsMain = (index: number) => {
  // Remove the image from current position
  const selectedImage = images.value[index]
  images.value.splice(index, 1)
  
  // Mark it as main and unset others
  selectedImage.isMain = true
  images.value.forEach(img => {
    img.isMain = false
  })
  
  // Insert at beginning
  images.value.unshift(selectedImage)
  
  // Update all positions
  images.value.forEach((img, idx) => {
    img.position = idx
  })
  
  emit('update:modelValue', images.value)
}

// Drag and drop handlers
const handleDragStart = (event: DragEvent, index: number) => {
  dragging.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

const handleDragOver = (event: DragEvent, index: number) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDrop = (event: DragEvent, dropIndex: number) => {
  event.preventDefault()
  
  if (dragging.value === null || dragging.value === dropIndex) return
  
  const draggedImage = images.value[dragging.value]
  images.value.splice(dragging.value, 1)
  images.value.splice(dropIndex, 0, draggedImage)
  
  // Update positions
  images.value.forEach((img, idx) => {
    img.position = idx
  })
  
  emit('update:modelValue', images.value)
}

const handleDragEnd = () => {
  dragging.value = null
}
</script>
