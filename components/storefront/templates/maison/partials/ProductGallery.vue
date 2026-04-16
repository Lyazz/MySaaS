<script setup lang="ts">
const props = defineProps<{
  images: string[]
  title: string
}>()

const selectedImage = ref(0)

const handleImageClick = (index: number) => {
  selectedImage.value = index
}

watch(() => props.images, () => {
  selectedImage.value = 0
}, { deep: true })
</script>

<template>
  <div class="space-y-4">
    <!-- Main Image -->
    <div class="relative w-full aspect-[4/5] bg-[#F5F0EA] overflow-hidden">
      <img
        v-if="images && images.length > 0"
        :src="images[selectedImage]"
        :alt="title"
        class="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
      >
      <div v-else class="w-full h-full flex items-center justify-center text-[#D4C4B4]">
        <Icon name="lucide:image" class="w-16 h-16" />
      </div>

      <!-- Counter -->
      <div
        v-if="images && images.length > 1"
        class="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm px-3 py-1 text-xs tracking-wider text-[#7A6558]"
      >
        {{ selectedImage + 1 }} / {{ images.length }}
      </div>
    </div>

    <!-- Thumbnails -->
    <div v-if="images && images.length > 1" class="flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="(image, index) in images"
        :key="index"
        class="relative w-16 h-16 flex-shrink-0 overflow-hidden transition-all border"
        :class="selectedImage === index ? 'border-[#C17B4E]' : 'border-transparent opacity-60 hover:opacity-90'"
        @click="handleImageClick(index)"
      >
        <img :src="image" :alt="`${title} - ${index + 1}`" class="w-full h-full object-cover">
      </button>
    </div>
  </div>
</template>
