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
    if (props.images && props.images.length > 0) {
        return props.images[activeImageIndex.value]
    }
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
    <div class="bg-[#0b0f14] md:rounded-3xl p-0 md:p-6 md:shadow-soft md:border border-white/[0.06] mb-8 lg:mb-0 lg:sticky lg:top-8 animate-fade-in-left">
        <!-- Main Image Carousel Area -->
        <div 
            class="aspect-[4/5] rounded-none md:rounded-2xl overflow-hidden bg-[#06080c] relative group cursor-zoom-in mb-4 md:border border-white/[0.06]"
            @touchstart="handleTouchStart"
            @touchend="handleTouchEnd"
            @mousemove="onPointerMove"
            @mouseenter="stopAutoplay"
            @mouseleave="startAutoplay(); onPointerLeave()"
        >
            <!-- Fading images -->
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

            <!-- Badges -->
            <div class="absolute top-4 start-4 z-10">
                <span class="bg-[#0b0f14]/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ring-1 ring-slate-900/5 flex items-center gap-1">
                    <Icon name="lucide:star" class="w-3 h-3 text-amber-500 fill-amber-500" />
                    {{ $t('storefront.product.bestsellerBadge') }}
                </span>
            </div>

            <!-- Mobile Navigation Dots -->
            <div v-if="images?.length > 1" class="absolute bottom-4 start-0 end-0 flex justify-center gap-2 z-10 md:hidden">
                <button
                    v-for="(_, idx) in images"
                    :key="'dot-'+idx"
                    class="w-2 h-2 rounded-full transition-all duration-300"
                    :class="activeImageIndex === idx ? 'w-6 bg-[#0b0f14] shadow-md' : 'bg-[#0b0f14]/50'"
                    @click="setActiveImage(idx)"
                ></button>
            </div>

            <!-- Desktop Arrow Navigation -->
            <button 
                v-if="images?.length > 1" 
                @click.stop="prevImage" 
                class="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#0b0f14]/80 backdrop-blur-sm rounded-full items-center justify-center text-slate-200 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#0b0f14] z-10 hover:scale-105"
            >
                <Icon name="lucide:chevron-left" class="w-6 h-6" />
            </button>
            <button 
                v-if="images?.length > 1" 
                @click.stop="nextImage" 
                class="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#0b0f14]/80 backdrop-blur-sm rounded-full items-center justify-center text-slate-200 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#0b0f14] z-10 hover:scale-105"
            >
                <Icon name="lucide:chevron-right" class="w-6 h-6" />
            </button>
        </div>

        <!-- All Thumbnails -->
        <div class="grid grid-cols-5 gap-2 md:gap-3">
            <button 
                v-for="(img, idx) in images" 
                :key="idx"
                class="aspect-square rounded-lg md:rounded-xl overflow-hidden border-2 transition-all duration-300 relative group"
                :class="activeImageIndex === idx ? 'border-brand-500 ring-2 ring-brand-500/20 ring-offset-1' : 'border-transparent ring-1 ring-slate-200 hover:ring-brand-500/50'"
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

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
