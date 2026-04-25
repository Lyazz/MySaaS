<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { homeTemplates, storeShellTemplates } from '~/components/storefront/templates/registry'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: false, // Use a completely blank layout to maximize space for the preview
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const templateKey = computed(() => (route.query.template as string) || 'classic')
const previewMode = ref<'desktop' | 'mobile'>('desktop')

// Define the templates metadata (we can duplicate this briefly or import if it was a separate file, but for simplicity we keep it here to run the preview)
const templatesMeta = [
  { key: 'classic', label: 'Classic Elegance' },
  { key: 'modern', label: 'Modern Edge' },
  { key: 'street', label: 'Streetwear' },
  { key: 'cozy', label: 'Cozy Basics' },
  { key: 'food', label: 'Fresh Food' },
  { key: 'cyber', label: 'Cyber Tech' },
  { key: 'stationnery', label: 'Stationery' },
  { key: 'wellness', label: 'Wellness Space' },
  { key: 'chrono', label: 'Chrono Luxe' },
]

const activeTemplateDef = computed(() => {
  return templatesMeta.find((tpl) => tpl.key === templateKey.value) || templatesMeta[0]
})

// Create a computed iframe URL that points to the isolated preview route
const iframeUrl = computed(() => {
  // Try to use localhost for dev, or the actual domain
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/admin/preview-iframe?template=${activeTemplateDef.value.key}`
})

const goBack = () => {
    window.close()
    // Fallback if window was not opened by a script
    if (!window.closed) {
        router.push('/admin/settings/appearance')
    }
}

// Calculate scale for mobile preview to fit screen
const previewContainer = ref<HTMLElement | null>(null)
const mobileScale = ref(1)

const updateScale = () => {
  if (previewMode.value !== 'mobile' || !previewContainer.value) return
  const containerHeight = previewContainer.value.clientHeight
  const targetHeight = 812 + 64 // 812 phone + padding
  if (containerHeight < targetHeight) {
    mobileScale.value = containerHeight / targetHeight
  } else {
    mobileScale.value = 1
  }
}

onMounted(() => {
  window.addEventListener('resize', updateScale)
  // small delay to ensure DOM is ready
  setTimeout(updateScale, 100)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScale)
})

watch(previewMode, () => {
  nextTick(updateScale)
})

const capturePreviewClicks = (e: MouseEvent) => {
  // Prevent any links clicked inside the preview simulator from actually navigating
  const target = e.target as HTMLElement
  const link = target.closest('a')
  if (link) {
     e.preventDefault()
  }
}
</script>

<template>
  <div class="h-screen w-screen bg-slate-900 flex flex-col overflow-hidden font-sans">
    
    <!-- Top Control Bar -->
    <div class="h-16 bg-slate-800 border-b border-slate-700/50 px-6 flex items-center justify-between shadow-sm z-50 shrink-0">
       <div class="flex items-center gap-4">
         <button 
            @click="goBack" 
            class="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
         >
            <Icon name="lucide:arrow-left" class="w-4 h-4" />
            Retour
         </button>
         <div class="h-6 w-px bg-slate-700 mx-2"></div>
         <div class="flex flex-col">
           <span class="text-white font-semibold text-sm">Simulateur de Template</span>
           <span class="text-slate-400 text-xs">Aperçu en direct : <span class="text-brand-400 font-medium">{{ activeTemplateDef.label }}</span></span>
         </div>
       </div>

       <!-- Device Toggles -->
       <div class="flex bg-slate-950/50 p-1 rounded-lg border border-slate-700/50">
         <button 
           @click.prevent="previewMode = 'desktop'"
           class="px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200"
           :class="previewMode === 'desktop' ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600' : 'text-slate-400 hover:text-slate-200'"
         >
           <Icon name="lucide:monitor" class="w-4 h-4" />
           Desktop
         </button>
         <button 
           @click.prevent="previewMode = 'mobile'"
           class="px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200"
           :class="previewMode === 'mobile' ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600' : 'text-slate-400 hover:text-slate-200'"
         >
           <Icon name="lucide:smartphone" class="w-4 h-4" />
           Mobile
         </button>
       </div>

       <div class="flex items-center gap-3">
          <button @click="goBack" class="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-black text-sm font-medium rounded-lg shadow-sm transition-colors">
            Sélectionner ce template
          </button>
       </div>
    </div>

    <!-- Preview Container -->
    <div ref="previewContainer" class="flex-1 flex justify-center items-center overflow-hidden p-4 md:p-8 relative">
       <!-- Dynamic Viewport (Device Frame) -->
       <div 
          class="relative bg-white shadow-[0_0_50px_rgba(0,0,0,0.3)] transition-all duration-500 flex flex-col overflow-hidden ring-1 ring-slate-800"
          :class="[
            previewMode === 'desktop' 
              ? 'w-full max-w-[1440px] h-full rounded-xl' 
              : 'w-[375px] h-[812px] rounded-[3rem] ring-8 ring-slate-950 shadow-2xl shrink-0 origin-center'
          ]"
          :style="previewMode === 'mobile' ? { transform: `scale(${mobileScale})` } : {}"
       >
         <!-- Mobile Notch -->
         <div v-if="previewMode === 'mobile'" class="absolute top-0 inset-x-0 h-6 flex justify-center z-[100] pointer-events-none">
            <div class="w-32 h-6 bg-slate-950 rounded-b-2xl"></div>
         </div>

         <!-- Internal Iframe Area for perfect responsive media queries -->
         <div class="w-full h-full bg-white rounded-inherit relative">
            <iframe 
              :key="previewMode"
              :src="iframeUrl"
              class="w-full h-full border-0 absolute inset-0"
              style="border-radius: inherit;"
              sandbox="allow-scripts allow-same-origin"
            ></iframe>
         </div>
       </div>
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles to ensure the scrollbars inside the simulator look decent */
.rounded-inherit {
  border-radius: inherit;
}
</style>
