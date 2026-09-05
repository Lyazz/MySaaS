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
  <div class="lg:sticky lg:top-[9.5rem]">
    <!-- Candy frame: the photo sits on a pastel ground, never on bare white -->
    <div
      class="relative rounded-[var(--kw-r-xl)] overflow-hidden group cursor-zoom-in mb-5 aspect-[4/5]"
      style="background: linear-gradient(150deg, var(--kw-pink-soft), var(--kw-lilac-soft))"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
      @mousemove="onPointerMove"
      @mouseenter="stopAutoplay"
      @mouseleave="startAutoplay(); onPointerLeave()"
    >
      <transition-group
        name="kw-gallery"
        tag="div"
        class="w-full h-full relative"
      >
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

      <div
        v-if="images?.length > 1"
        class="absolute bottom-4 start-0 end-0 flex justify-center gap-2 z-10 md:hidden"
      >
        <button
          v-for="(_, idx) in images"
          :key="'dot-' + idx"
          class="h-2.5 rounded-full transition-all duration-300"
          :class="activeImageIndex === idx ? 'w-6 bg-[var(--kw-pink-deep)]' : 'w-2.5 bg-white/70'"
          @click="setActiveImage(idx)"
        />
      </div>

      <button
        v-if="images?.length > 1"
        class="!hidden md:!flex kw-icon-btn absolute start-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        @click.stop="prevImage"
      >
        <Icon
          name="lucide:chevron-left"
          class="w-5 h-5 rtl:rotate-180"
        />
      </button>
      <button
        v-if="images?.length > 1"
        class="!hidden md:!flex kw-icon-btn absolute end-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        @click.stop="nextImage"
      >
        <Icon
          name="lucide:chevron-right"
          class="w-5 h-5 rtl:rotate-180"
        />
      </button>
    </div>

    <!-- Thumbnails as pebbles -->
    <div
      v-if="images?.length > 1"
      class="flex flex-wrap gap-3 justify-center"
    >
      <button
        v-for="(img, idx) in images"
        :key="idx"
        class="w-16 h-16 kw-blob kw-blob-hover overflow-hidden transition-transform duration-300 flex-shrink-0"
        :style="{
          background: 'var(--kw-pink-soft)',
          boxShadow: activeImageIndex === idx ? '0 0 0 3px var(--kw-pink-deep)' : '0 0 0 2px var(--kw-line)'
        }"
        :class="activeImageIndex === idx ? '-translate-y-1' : 'hover:-translate-y-0.5'"
        @click="setActiveImage(idx)"
      >
        <img
          :src="img"
          class="w-full h-full object-cover"
          :alt="title"
        >
      </button>
    </div>
  </div>
</template>

<style scoped>
.kw-gallery-enter-active, .kw-gallery-leave-active { transition: opacity .4s ease; }
.kw-gallery-enter-from, .kw-gallery-leave-to { opacity: 0; }
</style>
