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
  <div class="gallery">
    <!-- Main image -->
    <div
      class="gallery__main"
      @mousemove="onPointerMove"
      @mouseleave="onPointerLeave"
    >
      <Transition name="gallery-fade" mode="out-in">
        <img
          v-if="images && images.length > 0"
          :key="selectedImage"
          :src="images[selectedImage]"
          :alt="title"
          class="gallery__main-img"
          :style="zoomStyle"
        >
        <div v-else class="gallery__main-empty">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="2" y="2" width="28" height="28" stroke="currentColor" stroke-width="0.5"/>
            <path d="M8 24l6-8 4 5 3-3 5 6" stroke="currentColor" stroke-width="0.5"/>
            <circle cx="11" cy="11" r="3" stroke="currentColor" stroke-width="0.5"/>
          </svg>
        </div>
      </Transition>

      <!-- Counter -->
      <div v-if="images && images.length > 1" class="gallery__counter">
        {{ String(selectedImage + 1).padStart(2,'0') }} / {{ String(images.length).padStart(2,'0') }}
      </div>
    </div>

    <!-- Thumbnails -->
    <div v-if="images && images.length > 1" class="gallery__thumbs">
      <button
        v-for="(image, index) in images"
        :key="index"
        class="gallery__thumb"
        :class="{ 'is-active': selectedImage === index }"
        @click="handleImageClick(index)"
      >
        <img :src="image" :alt="`${title} — ${index + 1}`" class="gallery__thumb-img">
      </button>
    </div>
  </div>
</template>

<style scoped>
.gallery { display: flex; flex-direction: column; gap: 8px; }

.gallery__main {
  position: relative;
  aspect-ratio: 4/5;
  background: var(--at-surface-2);
  overflow: hidden;
  cursor: zoom-in;
}
.gallery__main-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.5s ease;
}
.gallery__main-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--at-muted);
}

.gallery__counter {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(255,249,234,0.9);
  backdrop-filter: blur(4px);
  padding: 5px 10px;
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 300;
  letter-spacing: 0;
  color: var(--at-sub);
}

.gallery__thumbs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.gallery__thumb {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid transparent;
  cursor: pointer;
  transition: border-color 0.2s, opacity 0.2s;
  opacity: 0.5;
  background: none;
  padding: 0;
}
.gallery__thumb.is-active { border-color: var(--at-gold); opacity: 1; }
.gallery__thumb:hover { opacity: 0.85; }
.gallery__thumb-img { width: 100%; height: 100%; object-fit: cover; }

.gallery-fade-enter-active, .gallery-fade-leave-active { transition: opacity 0.25s; }
.gallery-fade-enter-from, .gallery-fade-leave-to { opacity: 0; }
</style>
