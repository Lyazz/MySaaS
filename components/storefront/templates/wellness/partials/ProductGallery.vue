<script setup lang="ts">
const props = defineProps<{
    images: string[]
    title?: string
}>()
const { onPointerMove, onPointerLeave, zoomStyle } = useImageHoverZoom()

const activeImageIndex = ref(0)

const currentImage = computed(() => {
    if (props.images && props.images.length > 0) {
        return props.images[activeImageIndex.value]
    }
    return '/blank.svg?v=2'
})

const setActiveImage = (index: number) => {
    activeImageIndex.value = index
}

// Reset image index when images change
watch(() => props.images, () => {
    activeImageIndex.value = 0
})
</script>

<template>
    <div class="mb-8 lg:mb-0 lg:sticky lg:top-28">
        <!-- Specimen plate -->
        <div
          class="aspect-[4/5] overflow-hidden bg-wl-card relative group cursor-zoom-in border border-wl-rule"
          @mousemove="onPointerMove"
          @mouseleave="onPointerLeave"
        >
        <img
            :src="currentImage"
            :alt="title"
            class="w-full h-full object-contain object-center transition-transform duration-700 ease-out"
            :style="zoomStyle"
        >
        <div class="absolute top-3 start-3">
            <span class="wl-label bg-wl-card border border-wl-rule text-wl-muted px-2 py-1">
            New Arrival
            </span>
        </div>
        </div>

        <!-- Thumbnail rail -->
        <div v-if="images && images.length > 1" class="flex gap-2 mt-2">
        <button
            v-for="(img, idx) in images"
            :key="idx"
            class="w-16 h-16 overflow-hidden border transition-colors duration-200 relative flex-shrink-0"
            :class="activeImageIndex === idx ? 'border-wl-ink' : 'border-wl-rule hover:border-wl-ruleStrong'"
            @click="setActiveImage(idx)"
        >
            <img
            :src="img"
            class="w-full h-full object-cover"
            alt=""
            >
        </button>
        </div>
    </div>
</template>
