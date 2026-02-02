<script setup lang="ts">
const props = withDefaults(defineProps<{
  text?: string
  scrolling?: boolean
  dismissible?: boolean
  backgroundColor?: string
  textColor?: string
}>(), {
  scrolling: undefined,
  dismissible: true
})

const { text: globalText, isScrolling: globalScrolling, isVisible, dismiss } = useAnnouncement()

// Use props if provided, otherwise fallback to global state
const displayText = computed(() => props.text ?? globalText.value)
const isScrollingActive = computed(() => props.scrolling ?? globalScrolling.value)

// Component local visibility can be controlled by parent or global dismissal
// If standard dismissal is used, we use the global state
</script>

<template>
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-full"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-full"
  >
    <div 
      v-if="isVisible" 
      class="relative overflow-hidden z-40"
      :class="[
        backgroundColor || 'bg-brand-100/50',
        textColor || 'text-brand-800'
      ]"
    >
      <div class="relative max-w-7xl mx-auto flex items-center h-10 px-4">
        
        <!-- Marquee / Content Container -->
        <div class="flex-1 overflow-hidden relative h-full flex items-center justify-center mx-8">
          
          <!-- Scrolling Content -->
          <div 
            v-if="isScrollingActive" 
            class="marquee-wrapper"
          >
             <!-- Group 1 -->
             <div class="marquee-group">
               <span 
                 v-for="i in 4" :key="`g1-${i}`" 
                 class="inline-block px-8 font-medium text-sm"
               >
                 {{ displayText }}
               </span>
             </div>
             <!-- Group 2 (Clone for seamless loop) -->
             <div class="marquee-group" aria-hidden="true">
               <span 
                 v-for="i in 4" :key="`g2-${i}`" 
                 class="inline-block px-8 font-medium text-sm"
               >
                 {{ displayText }}
               </span>
             </div>
          </div>
          
          <!-- Static Content -->
          <div v-else class="text-sm font-medium text-center truncate w-full">
            <span>{{ displayText }}</span>
          </div>

        </div>

        <!-- Close Button (Absolute Right) -->
        <button 
          v-if="dismissible !== false"
          @click="dismiss" 
          class="absolute right-4 p-1 rounded-full hover:bg-black/10 transition-colors z-50 cursor-pointer"
          :class="textColor || 'text-brand-600 hover:text-brand-800'"
          aria-label="Dismiss announcement"
        >
          <Icon name="lucide:x" class="w-4 h-4" />
        </button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.marquee-wrapper {
  display: flex;
  overflow: hidden;
  position: absolute;
  top: 0; 
  left: 0;
  width: 100%;
  height: 100%;
  align-items: center;
  user-select: none;
  gap: 0;
}

.marquee-group {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  min-width: 100%;
  animation: scroll 40s linear infinite;
}

@keyframes scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-100%);
  }
}

/* Pause animation on hover */
.marquee-wrapper:hover .marquee-group {
  animation-play-state: paused;
}
</style>
