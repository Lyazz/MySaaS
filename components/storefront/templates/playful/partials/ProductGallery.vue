<script setup lang="ts">
const props = defineProps<{
    images: string[]
    title?: string
}>()

const activeImageIndex = ref(0)
const autoplayTimer = ref<ReturnType<typeof setInterval> | null>(null)
const touchStartX = ref(0)
const touchEndX = ref(0)

const currentImage = computed(() => {
    if (props.images && props.images.length > 0) {
        return props.images[activeImageIndex.value]
    }
    return 'https://placehold.co/600x400'
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
    <div class="bg-transparent p-0 mb-8 lg:mb-0 lg:sticky lg:top-8 animate-fade-in-left relative">
        <!-- Decorative Background Blob -->
        <div class="absolute -top-10 -left-10 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply opacity-50 blur-2xl z-0"></div>
        <div class="absolute -bottom-10 -right-10 w-64 h-64 bg-yellow-200 rounded-full mix-blend-multiply opacity-50 blur-2xl z-0"></div>

        <!-- Main Image Carousel Area (Polaroid Style) -->
        <div 
            class="aspect-square md:aspect-[4/3] bg-white p-3 md:p-6 pb-12 md:pb-20 rounded-sm shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] relative group cursor-zoom-in mb-8 md:mb-12 transform -rotate-2 hover:rotate-1 transition-transform duration-500 z-10 border-b-[12px] md:border-b-[20px] border-white"
            @touchstart="handleTouchStart"
            @touchend="handleTouchEnd"
            @mouseenter="stopAutoplay"
            @mouseleave="startAutoplay"
        >
            <!-- Tape Detail -->
            <div class="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-8 bg-white/50 backdrop-blur-sm border border-white/20 transform -rotate-1 shadow-sm z-20"></div>

            <!-- Fading images -->
            <transition-group name="fade" tag="div" class="w-full h-full relative overflow-hidden ring-1 ring-slate-100">
                <img 
                    v-for="(img, idx) in images"
                    v-show="activeImageIndex === idx"
                    :key="img || idx"
                    :src="img" 
                    :alt="title" 
                    class="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out md:group-hover:scale-105"
                >
            </transition-group>

            <!-- Handwritten Title below image -->
            <div class="absolute bottom-3 md:bottom-6 left-0 right-0 text-center font-display text-slate-800 text-lg md:text-2xl transform rotate-1 opacity-80">
                {{ title || 'Awesome Product!' }}
            </div>

            <!-- Badges -->
            <div class="absolute top-6 left-6 z-10">
                <span class="bg-[#fbbf24] text-amber-900 border-2 border-amber-300 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1 transform -rotate-6">
                    <Icon name="lucide:star" class="w-3 h-3 text-amber-900 fill-amber-900" />
                    {{ $t('storefront.product.bestsellerBadge') }}
                </span>
            </div>

            <!-- Mobile Navigation Dots (Simplified) -->
            <div v-if="images?.length > 1" class="absolute bottom-20 left-0 right-0 flex justify-center gap-2 z-10 md:hidden">
                <button
                    v-for="(_, idx) in images"
                    :key="'dot-'+idx"
                    class="w-3 h-3 rounded-full transition-all duration-300 border-2 border-white/50"
                    :class="activeImageIndex === idx ? 'bg-[#9333EA] scale-110 shadow-md border-white' : 'bg-black/20'"
                    @click="setActiveImage(idx)"
                ></button>
            </div>

            <!-- Desktop Arrow Navigation (Bouncy) -->
            <button 
                v-if="images?.length > 1" 
                @click.stop="prevImage" 
                class="hidden md:flex absolute -left-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white rounded-full items-center justify-center text-brand-600 border-4 border-purple-100 shadow-[0_6px_0_0_#e9d5ff] opacity-0 group-hover:opacity-100 transition-all hover:-translate-y-1.5 active:translate-y-0.5 active:shadow-none z-10"
            >
                <Icon name="lucide:arrow-left" class="w-6 h-6 stroke-[3]" />
            </button>
            <button 
                v-if="images?.length > 1" 
                @click.stop="nextImage" 
                class="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white rounded-full items-center justify-center text-brand-600 border-4 border-purple-100 shadow-[0_6px_0_0_#e9d5ff] opacity-0 group-hover:opacity-100 transition-all hover:-translate-y-1.5 active:translate-y-0.5 active:shadow-none z-10"
            >
                <Icon name="lucide:arrow-right" class="w-6 h-6 stroke-[3]" />
            </button>
        </div>

        <!-- All Thumbnails (Scattered) -->
        <div class="flex flex-wrap gap-4 md:gap-6 justify-center z-10 relative">
            <button 
                v-for="(img, idx) in images" 
                :key="idx"
                class="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 transition-all duration-300 relative group shadow-sm hover:z-20"
                :class="[
                  activeImageIndex === idx ? 'border-brand-500 scale-110 shadow-lg z-20' : 'border-white hover:border-brand-200 hover:scale-110',
                  idx % 2 === 0 ? 'transform rotate-6 -translate-y-2' : 'transform -rotate-6'
                ]"
                @click="setActiveImage(idx)"
            >
                <div class="absolute inset-0 bg-brand-900/0 group-hover:bg-brand-900/10 transition-colors duration-300 mix-blend-multiply" />
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
