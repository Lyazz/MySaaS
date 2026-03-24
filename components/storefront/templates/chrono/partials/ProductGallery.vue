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
    if (props.images && props.images.length > 0) return props.images[activeImageIndex.value]
    return 'https://placehold.co/600x600/131720/D4C5A9?text=Chrono'
})

const setActiveImage = (index: number) => { activeImageIndex.value = index; resetAutoplay() }
const nextImage = () => { if (!props.images?.length) return; activeImageIndex.value = (activeImageIndex.value + 1) % props.images.length }
const prevImage = () => { if (!props.images?.length) return; activeImageIndex.value = (activeImageIndex.value - 1 + props.images.length) % props.images.length }
const startAutoplay = () => { if (props.images?.length > 1) autoplayTimer.value = setInterval(nextImage, 5000) }
const stopAutoplay = () => { if (autoplayTimer.value) { clearInterval(autoplayTimer.value); autoplayTimer.value = null } }
const resetAutoplay = () => { stopAutoplay(); startAutoplay() }

const handleTouchStart = (e: TouchEvent) => { touchStartX.value = e.changedTouches[0].screenX; stopAutoplay() }
const handleTouchEnd = (e: TouchEvent) => { touchEndX.value = e.changedTouches[0].screenX; handleSwipe(); startAutoplay() }
const handleSwipe = () => {
    const swipeThreshold = 50
    if (touchEndX.value < touchStartX.value - swipeThreshold) nextImage()
    else if (touchEndX.value > touchStartX.value + swipeThreshold) prevImage()
}

onMounted(() => startAutoplay())
onUnmounted(() => stopAutoplay())
watch(() => props.images, () => { activeImageIndex.value = 0; resetAutoplay() })
</script>

<template>
    <div class="mb-8 lg:mb-0 lg:sticky lg:top-8" style="animation: fadeInLeft 0.6s ease forwards;">
        <!-- Main Image -->
        <div 
            class="aspect-square overflow-hidden relative group cursor-zoom-in mb-4 border"
            style="background-color: #131720; border-color: rgba(212,197,169,0.1); border-radius: 2px;"
            @touchstart="handleTouchStart"
            @touchend="handleTouchEnd"
            @mouseenter="stopAutoplay"
            @mouseleave="startAutoplay"
        >
            <transition-group name="fade" tag="div" class="w-full h-full relative">
                <img 
                    v-for="(img, idx) in images"
                    v-show="activeImageIndex === idx"
                    :key="img || idx"
                    :src="img" 
                    :alt="title" 
                    class="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                >
            </transition-group>

            <!-- Bestseller badge -->
            <div class="absolute top-4 left-4 z-10">
                <span class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium tracking-wider uppercase" style="background-color:rgba(14,17,23,0.85); border:1px solid rgba(166,124,82,0.3); color:#A67C52; border-radius:1px;">
                    <Icon name="lucide:star" class="w-3 h-3" style="color:#A67C52;" />
                    {{ $t('storefront.product.bestsellerBadge') }}
                </span>
            </div>

            <!-- Mobile dots -->
            <div v-if="images?.length > 1" class="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10 md:hidden">
                <button
                    v-for="(_, idx) in images"
                    :key="'dot-'+idx"
                    class="h-px transition-all duration-300"
                    :style="activeImageIndex === idx ? 'background-color:#A67C52;width:28px;' : 'background-color:rgba(212,197,169,0.3);width:12px;'"
                    @click="setActiveImage(idx)"
                />
            </div>

            <!-- Desktop arrows -->
            <button 
                v-if="images?.length > 1" 
                class="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                style="background-color:rgba(14,17,23,0.85); border:1px solid rgba(212,197,169,0.2); border-radius:1px; color:#D4C5A9;"
                @click.stop="prevImage" 
            >
                <Icon name="lucide:chevron-left" class="w-5 h-5" />
            </button>
            <button 
                v-if="images?.length > 1" 
                class="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                style="background-color:rgba(14,17,23,0.85); border:1px solid rgba(212,197,169,0.2); border-radius:1px; color:#D4C5A9;"
                @click.stop="nextImage" 
            >
                <Icon name="lucide:chevron-right" class="w-5 h-5" />
            </button>
        </div>

        <!-- Thumbnails -->
        <div class="grid grid-cols-5 gap-2">
            <button 
                v-for="(img, idx) in images" 
                :key="idx"
                class="aspect-square overflow-hidden transition-all duration-300 border-2"
                :style="activeImageIndex === idx 
                    ? 'border-color:#A67C52;border-radius:1px;' 
                    : 'border-color:rgba(212,197,169,0.08);border-radius:1px;'"
                @click="setActiveImage(idx)"
            >
                <img :src="img" class="w-full h-full object-cover" alt="Thumbnail">
            </button>
        </div>
    </div>
</template>

<style scoped>
@keyframes fadeInLeft {
    from { opacity: 0; transform: translateX(-16px); }
    to { opacity: 1; transform: translateX(0); }
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
