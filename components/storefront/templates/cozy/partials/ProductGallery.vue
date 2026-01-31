<script setup lang="ts">
const props = defineProps<{
  images: string[]
  title: string
}>()

const selectedImage = ref(0)

const handleImageClick = (index: number) => {
  selectedImage.value = index
}

// Reset selected index if images change
watch(() => props.images, () => {
  selectedImage.value = 0
}, { deep: true })
</script>

<template>
  <div class="space-y-4">
    <!-- Main Image -->
    <div class="relative w-full aspect-square bg-slate-50 rounded-[2rem] overflow-hidden shadow-soft">
      <img
        v-if="images && images.length > 0"
        :src="images[selectedImage]"
        :alt="title"
        class="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
        <Icon name="lucide:image" class="w-16 h-16" />
      </div>
      
      <!-- Image Counter -->
      <div 
        v-if="images && images.length > 1"
        class="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-slate-600 font-medium"
      >
        {{ selectedImage + 1 }} / {{ images.length }}
      </div>
    </div>

    <!-- Thumbnails -->
    <div v-if="images && images.length > 1" class="flex gap-3 overflow-x-auto pb-2">
      <button
        v-for="(image, index) in images"
        :key="index"
        @click="handleImageClick(index)"
        class="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden transition-all hover:opacity-90"
        :class="selectedImage === index ? 'ring-2 ring-brand-400 ring-offset-2 shadow-lg' : 'opacity-70'"
      >
        <img
          :src="image"
          :alt="`${title} - Image ${index + 1}`"
          class="w-full h-full object-cover"
        />
      </button>
    </div>
  </div>
</template>
