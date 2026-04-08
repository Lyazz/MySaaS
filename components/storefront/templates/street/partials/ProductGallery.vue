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
  <div class="flex flex-col gap-4">
    <!-- Main Image -->
    <div class="relative w-full aspect-[4/5] border-4 border-black bg-gray-100 overflow-hidden shadow-[8px_8px_0px_0px_#000]">
      <img
        v-if="images && images.length > 0"
        :src="images[selectedImage]"
        :alt="title"
        class="w-full h-full object-cover grayscale contrast-125 hover:grayscale-0 transition-all duration-300"
      />
      <div v-else class="w-full h-full flex items-center justify-center bg-gray-200 font-street text-2xl uppercase">
        No Image
      </div>
      
      <!-- View Indicator -->
      <div class="absolute top-4 left-4 bg-brand px-2 py-1 border-2 border-black font-street text-sm uppercase">
        VIEW_0{{ selectedImage + 1 }}
      </div>
    </div>

    <!-- Thumbnails -->
    <div v-if="images && images.length > 1" class="grid grid-cols-4 gap-4">
      <button
        v-for="(image, index) in images"
        :key="index"
        @click="handleImageClick(index)"
        class="relative aspect-square border-2 border-black overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#000]"
        :class="selectedImage === index ? 'ring-2 ring-brand ring-offset-2 ring-offset-black' : 'opacity-80 hover:opacity-100'"
      >
        <img
          :src="image"
          :alt="`${title} - Image ${index + 1}`"
          class="w-full h-full object-cover grayscale hover:grayscale-0"
        />
      </button>
    </div>
  </div>
</template>
