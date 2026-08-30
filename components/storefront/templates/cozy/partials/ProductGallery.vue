<script setup lang="ts">
const props = defineProps<{
  images: string[]
  title: string
}>()
const { onPointerMove, onPointerLeave, zoomStyle } = useImageHoverZoom()

const selectedImage = ref(0)
const handleImageClick = (index: number) => { selectedImage.value = index }

watch(() => props.images, () => { selectedImage.value = 0 }, { deep: true })
</script>

<template>
  <div class="flex flex-col-reverse md:flex-row gap-4">
    <!-- Thumbnails -->
    <div
      v-if="images && images.length > 1"
      class="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible scrollbar-hide"
    >
      <button
        v-for="(image, index) in images"
        :key="index"
        class="relative w-16 h-16 md:w-[74px] md:h-[74px] flex-shrink-0 overflow-hidden border transition-colors"
        :class="selectedImage === index ? 'border-[#B8532E]' : 'border-[#DAD2C4] hover:border-[#8A7E6E]'"
        @click="handleImageClick(index)"
      >
        <img :src="image" :alt="`${title} — ${index + 1}`" class="w-full h-full object-cover">
      </button>
    </div>

    <!-- Main -->
    <div class="flex-1">
      <div
        class="relative w-full aspect-[4/5] bg-[#FBF8F2] border border-[#DAD2C4] overflow-hidden cursor-zoom-in"
        @mousemove="onPointerMove"
        @mouseleave="onPointerLeave"
      >
        <img
          v-if="images && images.length > 0"
          :src="images[selectedImage]"
          :alt="title"
          class="w-full h-full object-contain transition-transform duration-500"
          :style="zoomStyle"
        >
        <div v-else class="w-full h-full flex items-center justify-center text-[#C4B8A4]">
          <Icon name="lucide:image" class="w-14 h-14" />
        </div>

        <div
          v-if="images && images.length > 1"
          class="absolute bottom-3 end-3 ed-ui text-[11px] tabular-nums bg-[#F4EFE6]/90 border border-[#C4B8A4] text-[#4A4038] px-2.5 py-1"
        >
          {{ String(selectedImage + 1).padStart(2, '0') }} / {{ String(images.length).padStart(2, '0') }}
        </div>
      </div>
    </div>
  </div>
</template>
