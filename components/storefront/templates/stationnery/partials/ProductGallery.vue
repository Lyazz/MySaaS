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
    <div class="bg-white rounded-sm p-6 shadow-sm border border-stone-200 mb-8 lg:mb-0 lg:sticky lg:top-8 animate-fade-in-left">
        <!-- Main Image -->
        <div
          class="aspect-[4/5] rounded-sm overflow-hidden bg-[#fdfbf7] relative group cursor-zoom-in mb-4 border border-stone-200"
          @mousemove="onPointerMove"
          @mouseleave="onPointerLeave"
        >
        <img 
            :src="currentImage" 
            :alt="title" 
            class="w-full h-full object-contain object-center transition-transform duration-700 ease-out"
            :style="zoomStyle"
        >
        <div class="absolute top-4 start-4">
            <span class="bg-white/90 backdrop-blur-md text-stone-900 text-xs font-stationery italic px-3 py-1.5 border border-stone-200">
            New Arrival
            </span>
        </div>
        </div>

        <!-- Thumbnails -->
        <div class="grid grid-cols-5 gap-3">
        <button 
            v-for="(img, idx) in images" 
            :key="idx"
            class="aspect-square rounded-sm overflow-hidden border transition-all duration-300 relative group"
            :class="activeImageIndex === idx ? 'border-brand-600 ring-1 ring-brand-600/20' : 'border-stone-200 hover:border-brand-400'"
            @click="setActiveImage(idx)"
        >
            <div class="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors duration-300" />
            <img
            :src="img"
            class="w-full h-full object-cover"
            alt="Thumbnail"
            >
        </button>
        </div>
    </div>
</template>

<style scoped>
.animate-fade-in-left {
    animation: fadeInLeft 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
    opacity: 0;
}
@keyframes fadeInLeft {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
}
</style>
