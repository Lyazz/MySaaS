<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <label class="block text-sm font-medium text-gray-700">{{ t('admin.imageUploader.title') }}</label>
      <div
        v-if="uploading"
        class="text-sm text-blue-600"
      >
        {{ t('admin.common.uploading') }}
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        v-for="(image, index) in images"
        :key="image.id || `${image.url}-${index}`"
        draggable="true"
        class="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-all cursor-move"
        :class="[
          image.isMain ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-200 hover:border-gray-300',
          dragging === index ? 'opacity-50' : ''
        ]"
        @dragstart="handleDragStart($event, index)"
        @dragover.prevent="handleDragOver($event)"
        @drop="handleDrop($event, index)"
        @dragend="handleDragEnd"
      >
        <img
          :src="image.url"
          :alt="image.alt || t('admin.imageUploader.imageAlt')"
          class="w-full h-full object-cover"
        >

        <div
          v-if="image.isMain"
          class="absolute top-2 left-2"
        >
          <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-teal-600 text-white shadow-sm">
            <Icon name="lucide:star" class="w-3 h-3 mr-1" />
            {{ t('admin.imageUploader.mainBadge') }}
          </span>
        </div>

        <div class="absolute bottom-2 left-2">
          <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/60 text-white text-xs font-semibold">
            {{ index + 1 }}
          </span>
        </div>

        <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            v-if="!image.isMain"
            type="button"
            :title="t('admin.imageUploader.actions.setAsMain')"
            class="bg-teal-600 hover:bg-teal-700 text-white rounded-full p-1.5 shadow-sm"
            @click.stop="setAsMain(index)"
          >
            <Icon name="lucide:star" class="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            :title="t('admin.imageUploader.actions.remove')"
            class="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-sm"
            @click.stop="removeImage(index)"
          >
            <Icon name="lucide:trash" class="w-3.5 h-3.5" />
          </button>
        </div>

        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
          <div class="bg-black/40 rounded-lg px-3 py-2">
            <Icon name="lucide:grip-vertical" class="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      <label class="relative cursor-pointer aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-teal-500 flex flex-col items-center justify-center transition-colors">
        <div class="text-center">
          <Icon name="lucide:plus" class="mx-auto h-8 w-8 text-gray-400" />
          <span class="mt-2 block text-xs text-gray-500 font-medium">{{ t('admin.imageUploader.actions.addImage') }}</span>
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
      <strong>{{ t('admin.imageUploader.tip.title') }}</strong> {{ t('admin.imageUploader.tip.body') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'

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

const images = ref<ProductImage[]>([...props.modelValue])
const uploading = ref(false)
const dragging = ref<number | null>(null)

watch(
  () => props.modelValue,
  (newVal) => {
    images.value = [...newVal]
  },
  { deep: true }
)

const getAuthToken = () => authStore.token || useCookie('auth_token').value

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  uploading.value = true
  try {
    for (const file of Array.from(input.files)) {
      if (!file.type.startsWith('image/')) continue

      const formData = new FormData()
      formData.append('file', file)

      const token = getAuthToken()
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData
      })

      if (!response.ok) throw new Error(t('admin.imageUploader.errors.uploadFailed'))
      const data = await response.json()

      const newImage: ProductImage = {
        id: null,
        url: data.url,
        alt: '',
        position: images.value.length,
        isMain: images.value.length === 0
      }
      images.value.push(newImage)
    }

    emit('update:modelValue', images.value)
  } catch (error) {
    console.error('Upload error:', error)
    alert(t('admin.imageUploader.errors.uploadFailed'))
  } finally {
    uploading.value = false
    input.value = ''
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

