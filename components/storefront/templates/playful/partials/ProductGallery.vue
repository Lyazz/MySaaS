<script setup lang="ts">
const props = defineProps<{
    images: string[]
    title?: string
}>()
const { onPointerMove, onPointerLeave, zoomStyle } = useImageHoverZoom()

const activeImageIndex = ref(0)
const autoplayTimer = ref<ReturnType<typeof setInterval> | null>(null)
const touchStartX = ref(0)
const touchEndX = ref(0)

const currentImage = computed(() => {
    if (props.images && props.images.length > 0) return props.images[activeImageIndex.value]
    return '/blank.svg?v=2'
})

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
    if (props.images && props.images.length > 1) autoplayTimer.value = setInterval(nextImage, 5000)
}

const stopAutoplay = () => {
    if (autoplayTimer.value) { clearInterval(autoplayTimer.value); autoplayTimer.value = null }
}

const resetAutoplay = () => { stopAutoplay(); startAutoplay() }

const handleTouchStart = (e: TouchEvent) => { touchStartX.value = e.changedTouches[0].screenX; stopAutoplay() }
const handleTouchEnd = (e: TouchEvent) => { touchEndX.value = e.changedTouches[0].screenX; handleSwipe(); startAutoplay() }

const handleSwipe = () => {
    const threshold = 50
    if (touchEndX.value < touchStartX.value - threshold) nextImage()
    else if (touchEndX.value > touchStartX.value + threshold) prevImage()
}

onMounted(() => startAutoplay())
onUnmounted(() => stopAutoplay())
watch(() => props.images, () => { activeImageIndex.value = 0; resetAutoplay() })
</script>

<template>
  <div class="mb-8 lg:mb-0 lg:sticky lg:top-8 animate-fade-in-left">
    <!-- Main image — polaroid style -->
    <div
      class="relative bg-white rounded-3xl border-3 border-violet-100 shadow-[0_6px_0_0_#ddd6fe] overflow-hidden group cursor-zoom-in mb-5 aspect-[4/5]"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
      @mousemove="onPointerMove"
      @mouseenter="stopAutoplay"
      @mouseleave="startAutoplay(); onPointerLeave()"
    >
      <!-- Images -->
      <transition-group name="fade" tag="div" class="w-full h-full relative">
        <img
          v-for="(img, idx) in images"
          v-show="activeImageIndex === idx"
          :key="img || idx"
          :src="img"
          :alt="title"
          class="absolute inset-0 w-full h-full object-contain object-center transition-transform duration-700"
          :style="zoomStyle"
        >
      </transition-group>

      <!-- Mobile dots -->
      <div v-if="images?.length > 1" class="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-10 md:hidden">
        <button
          v-for="(_, idx) in images"
          :key="'dot-'+idx"
          class="w-2.5 h-2.5 rounded-full transition-all border-2 border-white/60"
          :class="activeImageIndex === idx ? 'bg-violet-700 scale-110 shadow-sm' : 'bg-black/20'"
          @click="setActiveImage(idx)"
        />
      </div>

      <!-- Desktop arrows -->
      <button
        v-if="images?.length > 1"
        class="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white rounded-full items-center justify-center text-violet-700 border-3 border-violet-100 shadow-[0_3px_0_0_#ddd6fe] opacity-0 group-hover:opacity-100 hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all z-10"
        @click.stop="prevImage"
      >
        <Icon name="lucide:arrow-left" class="w-5 h-5 stroke-[2.5]" />
      </button>
      <button
        v-if="images?.length > 1"
        class="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white rounded-full items-center justify-center text-violet-700 border-3 border-violet-100 shadow-[0_3px_0_0_#ddd6fe] opacity-0 group-hover:opacity-100 hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all z-10"
        @click.stop="nextImage"
      >
        <Icon name="lucide:arrow-right" class="w-5 h-5 stroke-[2.5]" />
      </button>
    </div>

    <!-- Thumbnails -->
    <div v-if="images?.length > 1" class="flex flex-wrap gap-3 justify-center">
      <button
        v-for="(img, idx) in images"
        :key="idx"
        class="w-16 h-16 rounded-2xl overflow-hidden border-3 transition-all duration-200 relative flex-shrink-0"
        :class="[
          activeImageIndex === idx
            ? 'border-violet-700 shadow-[0_3px_0_0_#4c1d95] -translate-y-1'
            : 'border-violet-100 hover:border-violet-300 hover:-translate-y-0.5',
        ]"
        @click="setActiveImage(idx)"
      >
        <img :src="img" class="w-full h-full object-cover" alt="Thumbnail">
      </button>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in-left {
  animation: fadeInLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
  opacity: 0;
}
@keyframes fadeInLeft {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
