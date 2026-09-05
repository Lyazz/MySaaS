<script setup lang="ts">
const props = defineProps<{
    images: string[]
    title?: string
}>()

const { onPointerMove, onPointerLeave, zoomStyle } = useImageHoverZoom()
const { t } = useI18n({ useScope: 'global' })

const activeImageIndex = ref(0)
const autoplayTimer = ref<ReturnType<typeof setInterval> | null>(null)
const touchStartX = ref(0)
const touchEndX = ref(0)

const setActiveImage = (index: number) => {
    activeImageIndex.value = index
    resetAutoplay()
}

const nextImage = () => {
    if (!props.images || props.images.length === 0) return
    activeImageIndex.value = (activeImageIndex.value + 1) % props.images.length
}

const prevImage = () => {
    if (!props.images || props.images.length === 0) return
    activeImageIndex.value = (activeImageIndex.value - 1 + props.images.length) % props.images.length
}

const startAutoplay = () => {
    if (props.images && props.images.length > 1) {
        autoplayTimer.value = setInterval(nextImage, 5000)
    }
}

const stopAutoplay = () => {
    if (autoplayTimer.value) {
        clearInterval(autoplayTimer.value)
        autoplayTimer.value = null
    }
}

const resetAutoplay = () => {
    stopAutoplay()
    startAutoplay()
}

// Swipe gestures for mobile
const handleTouchStart = (e: TouchEvent) => {
    touchStartX.value = e.changedTouches[0].screenX
    stopAutoplay()
}

const handleTouchEnd = (e: TouchEvent) => {
    touchEndX.value = e.changedTouches[0].screenX
    handleSwipe()
    startAutoplay()
}

const handleSwipe = () => {
    const swipeThreshold = 50
    if (touchEndX.value < touchStartX.value - swipeThreshold) {
        nextImage() // Swiped left -> Next
    } else if (touchEndX.value > touchStartX.value + swipeThreshold) {
        prevImage() // Swiped right -> Previous
    }
}

onMounted(() => {
    startAutoplay()
})

onUnmounted(() => {
    stopAutoplay()
})

// Reset image index when images change
watch(() => props.images, () => {
    activeImageIndex.value = 0
    resetAutoplay()
})
</script>

<template>
  <div class="mb-8 lg:mb-0">
    <!-- The plate -->
    <div
      class="emb-plate aspect-square w-full"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <div
        class="emb-plate-inner group cursor-zoom-in bg-[#F2ECE1]"
        @mousemove="onPointerMove"
        @mouseenter="stopAutoplay"
        @mouseleave="startAutoplay(); onPointerLeave()"
      >
        <transition-group name="fade" tag="div" class="w-full h-full relative">
          <img
            v-for="(img, idx) in images"
            v-show="activeImageIndex === idx"
            :key="img || idx"
            :src="img"
            :alt="title"
            class="absolute inset-0 w-full h-full object-contain object-center transition-transform duration-700 ease-out"
            :style="zoomStyle"
          >
        </transition-group>

        <!-- Mobile dots, drawn as tiles -->
        <div v-if="images?.length > 1" class="absolute bottom-4 start-0 end-0 flex justify-center gap-2 z-10 md:hidden">
          <button
            v-for="(_, idx) in images"
            :key="'dot-' + idx"
            type="button"
            class="h-2 w-2 border transition-colors"
            :class="activeImageIndex === idx ? 'bg-[#DFA254] border-[#DFA254]' : 'bg-[#FDFAF4]/70 border-[#FDFAF4]/70'"
            @click="setActiveImage(idx)"
          >
            <span class="sr-only">{{ idx + 1 }}</span>
          </button>
        </div>

        <!-- Desktop arrows -->
        <button
          v-if="images?.length > 1"
          type="button"
          class="hidden md:flex absolute start-0 top-1/2 -translate-y-1/2 w-11 h-11 bg-[#FDFAF4] items-center justify-center text-[#16211E] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-600 hover:text-[#FDFAF4] z-10"
          :aria-label="t('storefront.templates.embellir.controls.previous')"
          @click.stop="prevImage"
        >
          <Icon name="lucide:chevron-left" class="w-5 h-5 rtl:rotate-180" />
        </button>
        <button
          v-if="images?.length > 1"
          type="button"
          class="hidden md:flex absolute end-0 top-1/2 -translate-y-1/2 w-11 h-11 bg-[#FDFAF4] items-center justify-center text-[#16211E] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-600 hover:text-[#FDFAF4] z-10"
          :aria-label="t('storefront.templates.embellir.controls.next')"
          @click.stop="nextImage"
        >
          <Icon name="lucide:chevron-right" class="w-5 h-5 rtl:rotate-180" />
        </button>
      </div>
    </div>

    <!-- Thumbnails: the rest of the tile set -->
    <div v-if="images?.length > 1" class="mt-3 grid grid-cols-5 gap-px bg-[#CBBDAB] border border-[#CBBDAB]">
      <button
        v-for="(img, idx) in images"
        :key="idx"
        type="button"
        class="aspect-square overflow-hidden bg-[#FDFAF4] relative transition-opacity"
        :class="activeImageIndex === idx ? '' : 'opacity-65 hover:opacity-100'"
        @click="setActiveImage(idx)"
      >
        <span class="sr-only">{{ idx + 1 }}</span>
        <img :src="img" class="w-full h-full object-cover" :alt="title">
        <span
          v-if="activeImageIndex === idx"
          class="absolute inset-0 border-2 border-brand-600 pointer-events-none"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active { transition: none; }
}
</style>
