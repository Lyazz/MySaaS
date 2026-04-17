<script setup lang="ts">
const props = defineProps<{
    images: string[]
    title?: string
}>()

const activeIndex = ref(0)

const activeImage = computed(() => props.images[activeIndex.value] || props.images[0] || '/blank.svg?v=2')

const nextImage = () => {
    activeIndex.value = (activeIndex.value + 1) % props.images.length
}

const prevImage = () => {
    activeIndex.value = (activeIndex.value - 1 + props.images.length) % props.images.length
}
</script>

<template>
  <div class="product-gallery">
    <!-- Main Image -->
    <div class="relative aspect-[4/5] overflow-hidden rounded-xl bg-purple-900/30 group">
      <img
        :src="activeImage"
        :alt="title || 'Product image'"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      >
      
      <!-- Navigation Arrows -->
      <div v-if="images.length > 1" class="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          class="w-12 h-12 rounded-full bg-[#1a0a2e]/90 border border-pink-500/30 shadow-lg flex items-center justify-center hover:bg-pink-500/20 hover:border-pink-500/50 transition-all backdrop-blur-sm"
          @click="prevImage"
        >
          <Icon name="lucide:chevron-left" class="w-6 h-6 text-white" />
        </button>
        <button
          type="button"
          class="w-12 h-12 rounded-full bg-[#1a0a2e]/90 border border-pink-500/30 shadow-lg flex items-center justify-center hover:bg-pink-500/20 hover:border-pink-500/50 transition-all backdrop-blur-sm"
          @click="nextImage"
        >
          <Icon name="lucide:chevron-right" class="w-6 h-6 text-white" />
        </button>
      </div>

      <!-- Image Counter -->
      <div v-if="images.length > 1" class="absolute bottom-4 right-4 px-3 py-1.5 bg-[#1a0a2e]/90 border border-pink-500/30 rounded-full backdrop-blur-sm">
        <span class="text-sm font-semibold text-white">{{ activeIndex + 1 }} / {{ images.length }}</span>
      </div>
    </div>

    <!-- Thumbnails -->
    <div v-if="images.length > 1" class="mt-4 grid grid-cols-5 gap-3">
      <button
        v-for="(img, idx) in images.slice(0, 5)"
        :key="idx"
        type="button"
        class="aspect-square rounded-lg overflow-hidden border-2 transition-all"
        :class="activeIndex === idx 
          ? 'border-pink-500 ring-2 ring-pink-500/30' 
          : 'border-purple-500/30 hover:border-pink-500/50 opacity-70 hover:opacity-100'"
        @click="activeIndex = idx"
      >
        <img
          :src="img"
          :alt="`${title || 'Product'} thumbnail ${idx + 1}`"
          class="w-full h-full object-cover"
        >
      </button>
    </div>
  </div>
</template>
