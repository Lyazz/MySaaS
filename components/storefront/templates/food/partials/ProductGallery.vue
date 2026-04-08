<script setup lang="ts">
const props = defineProps<{
    images: string[]
    title?: string
}>()

const activeImageIndex = ref(0)

const currentImage = computed(() => {
    if (props.images && props.images.length > 0) {
        return props.images[activeImageIndex.value]
    }
    return '/blank.svg'
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
    <div class="bg-white rounded-3xl p-6 shadow-soft border border-stone-100 mb-8 lg:mb-0 lg:sticky lg:top-8 animate-fade-in-left">
        <!-- Main Image -->
        <div class="aspect-[4/5] rounded-2xl overflow-hidden bg-stone-50 relative group cursor-zoom-in mb-4 border border-stone-100">
        <img 
            :src="currentImage" 
            :alt="title" 
            class="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        >
        <div class="absolute top-4 left-4">
            <span class="bg-white/90 backdrop-blur-md text-stone-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ring-1 ring-stone-900/5">
            New Arrival
            </span>
        </div>
        </div>

        <!-- Thumbnails -->
        <div class="grid grid-cols-5 gap-3">
        <button 
            v-for="(img, idx) in images" 
            :key="idx"
            class="aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 relative group"
            :class="activeImageIndex === idx ? 'border-brand-500 ring-2 ring-brand-500/20 ring-offset-1' : 'border-transparent ring-1 ring-stone-200 hover:ring-brand-500/50'"
            @click="setActiveImage(idx)"
        >
            <div class="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/5 transition-colors duration-300" />
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
