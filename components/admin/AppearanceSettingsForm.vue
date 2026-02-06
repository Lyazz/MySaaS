<template>
  <div class="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8 min-h-[calc(100vh-120px)] items-start">
    
    <!-- Left Column: Settings Form -->
    <div class="lg:col-span-7 xl:col-span-8 space-y-6">
      
      <!-- Store Identity -->
      <section class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-slate-900 mb-1">Store Identity</h3>
          <p class="text-sm text-slate-500 mb-6">Basic information about your store.</p>
          
          <div class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Store Name</label>
              <input
                v-model="form.name"
                type="text"
                required
                class="block w-full rounded-lg border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm transition-shadow"
                placeholder="My Awesome Store"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">URL Slug</label>
              <div class="flex rounded-lg shadow-sm">
                <input
                  v-model="form.slug"
                  type="text"
                  required
                  pattern="^[a-z0-9-]+$"
                  class="flex-1 block w-full rounded-none rounded-l-lg border-slate-300 focus:border-teal-500 focus:ring-teal-500 sm:text-sm text-right"
                  placeholder="my-store"
                  @input="handleSlugInput"
                >
                <span class="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 text-slate-500 sm:text-sm">
                  .{{ baseDomain }}
                </span>
              </div>
              <p class="mt-1.5 text-xs text-slate-500">
                Only lowercase letters, numbers, and hyphens.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Brand Assets -->
      <section class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-slate-900 mb-1">Brand Assets</h3>
          <p class="text-sm text-slate-500 mb-6">Visual elements that define your brand.</p>

          <div class="grid md:grid-cols-2 gap-8">
            <!-- Logo Upload -->
            <div>
               <label class="block text-sm font-medium text-slate-700 mb-3">Brand Logo</label>
               <SingleImageUploader
                 v-model="form.logoUrl"
                 label="Upload Logo"
                 hint="Square (1:1), PNG recommended."
                 class="w-full"
               />
            </div>

            <!-- Color Picker -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-3">Primary Color</label>
              <div class="space-y-4">
                 <div class="flex items-center gap-4">
                    <div class="relative overflow-hidden rounded-xl border border-slate-200 shadow-sm w-16 h-16 shrink-0 group cursor-pointer">
                      <input
                        v-model="form.primaryColor"
                        type="color"
                        class="absolute top-0 left-0 w-full h-full p-0 border-0 opacity-0 cursor-pointer z-10"
                      >
                      <div class="w-full h-full" :style="{ backgroundColor: form.primaryColor }"></div>
                      <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                         <Icon name="lucide:pipette" class="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div class="flex-1">
                      <input
                        v-model="form.primaryColor"
                        type="text"
                        pattern="^#+([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"
                        class="block w-full rounded-lg border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm font-mono uppercase"
                        placeholder="#0F766E"
                      >
                      <p class="mt-1.5 text-xs text-slate-500">
                        Used for buttons, links, and highlights.
                      </p>
                    </div>
                 </div>
                 
                 <!-- Preset Colors -->
                 <div class="flex flex-wrap gap-2">
                    <button 
                       v-for="color in presetColors" 
                       :key="color"
                       type="button"
                       class="w-6 h-6 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 transition-transform hover:scale-110"
                       :style="{ backgroundColor: color }"
                       @click="form.primaryColor = color"
                    ></button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Announcement Bar -->
       <section class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-lg font-semibold text-slate-900 mb-1">Announcement Bar</h3>
              <p class="text-sm text-slate-500">Top banner for promotions.</p>
            </div>
            <div class="flex items-center">
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="form.announcementScrolling" class="sr-only peer">
                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                <span class="ml-3 text-sm font-medium text-slate-700">Marquee Mode</span>
              </label>
            </div>
          </div>

          <div>
             <label class="block text-sm font-medium text-slate-700 mb-1.5">Message Text</label>
              <input
                v-model="form.announcementText"
                type="text"
                class="block w-full rounded-lg border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                placeholder="Free shipping on all orders over $50! ✨"
              >
          </div>
        </div>
      </section>

      <!-- Template Selection -->
      <section class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6">
           <h3 class="text-lg font-semibold text-slate-900 mb-1">Store Template</h3>
           <p class="text-sm text-slate-500 mb-6">Choose the layout that best fits your brand.</p>

           <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                v-for="t in templates"
                :key="t.key"
                class="group relative rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col h-full bg-white overflow-hidden"
                :class="form.templateKey === t.key ? 'border-teal-600 ring-1 ring-teal-600' : 'border-slate-200 hover:border-teal-300 shadow-sm hover:shadow-md'"
                @click="form.templateKey = t.key"
              >
                 <!-- Template Screenshot -->
                 <div class="aspect-[16/10] w-full bg-slate-100 border-b border-slate-100 relative overflow-hidden">
                    <img 
                      :src="`/templates/${t.key}.png`" 
                      class="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                      onerror="this.style.display='none'"
                    >
                    <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                 </div>

                 <div class="p-4 flex flex-col flex-1">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                           <div class="p-1.5 rounded-md bg-slate-50 border border-slate-100 text-slate-500">
                              <Icon :name="t.icon" class="w-4 h-4" />
                           </div>
                           <span class="font-bold text-slate-900" :class="t.fontClass">{{ t.label }}</span>
                        </div>
                        <div class="w-3 h-3 rounded-full border border-slate-200" :style="{ backgroundColor: t.color }"></div>
                    </div>
                    
                    <p class="text-xs text-slate-500 leading-relaxed mb-1">{{ t.description }}</p>
                 </div>
                 
                 <div v-if="form.templateKey === t.key" class="absolute top-3 right-3 text-teal-600 bg-white rounded-full shadow-sm z-10">
                    <Icon name="lucide:check-circle-2" class="w-6 h-6" />
                 </div>
              </div>
           </div>
        </div>
      </section>

    </div>

    <!-- Right Column: Live Preview (Sticky) -->
    <div class="hidden lg:block lg:col-span-5 xl:col-span-4 relative">
       <div class="sticky top-24 space-y-4">
          <div class="flex items-center justify-between">
             <h3 class="text-sm font-semibold text-slate-500 uppercase tracking-wider">Live Preview</h3>
             <span class="text-xs px-2 py-1 bg-teal-100 text-teal-700 rounded font-medium">Mobile View</span>
          </div>

          <!-- Phone/Browser Mockup Window -->
          <div class="bg-white border-8 border-slate-900 rounded-[2rem] shadow-2xl overflow-hidden aspect-[9/18] relative ring-1 ring-slate-900/5 mx-auto w-full" :style="{ maxWidth: 'calc((100vh - 12rem) * 9 / 18)' }">
             
             <!-- Mockup Status Bar -->
             <div class="absolute top-0 left-0 right-0 h-6 bg-slate-900 z-20 flex items-center justify-between px-6">
                <div class="text-[10px] text-white font-medium">9:41</div>
                <div class="flex gap-1.5 opacity-90">
                   <div class="w-3 h-3 text-white"><Icon name="lucide:signal" class="w-full h-full" /></div>
                   <div class="w-3 h-3 text-white"><Icon name="lucide:wifi" class="w-full h-full" /></div>
                   <div class="w-3 h-3 text-white"><Icon name="lucide:battery-medium" class="w-full h-full" /></div>
                </div>
             </div>

             <!-- Mockup Scrollable Content -->
             <div class="absolute top-6 inset-x-0 bottom-0 bg-white overflow-hidden rounded-b-[2rem]">
                <iframe
                  v-if="previewUrl"
                  :src="previewUrl"
                  class="w-full h-full border-none"
                  title="Store Preview" 
                />
                <div v-else class="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
                  <Icon name="lucide:loader" class="w-6 h-6 animate-spin mb-2" />
                  <p class="text-xs">Loading preview...</p>
                </div>
             </div>

             <!-- Mockup Home Indicator -->
             <div class="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-slate-900 rounded-full z-30 opacity-20"></div>
          </div>



          <p class="text-xs text-center text-slate-400">
             Showing live preview of saved changes.
             <a v-if="previewUrl" :href="previewUrl" target="_blank" class="text-teal-600 hover:underline">Open in new tab</a>
          </p>
       </div>
    </div>
    
  <!-- Floating Save Bar (Mobile & Desktop) -->
  <div class="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 z-40 lg:sticky lg:bottom-6 lg:bg-transparent lg:border-none lg:p-0 lg:col-span-12 lg:flex lg:justify-end pointer-events-none">
     <div class="pointer-events-auto max-w-7xl mx-auto flex items-center justify-between gap-4 lg:bg-white lg:px-4 lg:py-2 lg:rounded-2xl lg:shadow-xl lg:border lg:border-slate-100">
        
        <div class="flex items-center gap-3">
           <div 
              v-if="message.text" 
              class="px-3 py-1.5 rounded-full text-sm font-medium animate-fadeIn"
              :class="message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
           >
              {{ message.text }}
           </div>
        </div>

        <div class="flex items-center gap-3">
           <button
             type="button"
             class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
             :disabled="loading || saving"
             @click="reset"
           >
             Discard
           </button>
           
           <button
             @click="save"
             class="px-6 py-2 rounded-lg text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition-all hover:shadow-teal-500/30 active:scale-95 flex items-center gap-2"
             :class="saving ? 'bg-teal-500 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'"
             :disabled="loading || saving"
           >
             <Icon v-if="saving" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
             {{ saving ? 'Saving...' : 'Save Changes' }}
           </button>
        </div>
     </div>
  </div>

  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import SingleImageUploader from './SingleImageUploader.vue'

// -- Types & Stores --
const authStore = useAuthStore()

// -- State --
const loading = ref(false)
const saving = ref(false)
const message = reactive({ type: '', text: '' })

// Default colors
const presetColors = [
  '#0F766E', // Teal (Default)
  '#0f172a', // Slate
  '#4F46E5', // Indigo
  '#F43F5E', // Rose
  '#EA580C', // Orange
  '#FACC15', // Yellow
  '#8A9A5B', // Moss Green
  '#7C3AED', // Violet
]

const form = reactive({
  name: '',
  slug: '',
  logoUrl: null as string | null,
  primaryColor: '#0F766E',
  templateKey: 'classic',
  announcementText: '',
  announcementScrolling: false
})

const baseDomain = ref('')

// -- Computed --
const previewUrl = computed(() => {
  if (!form.slug || !baseDomain.value) return null
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:'
  return `${protocol}//${form.slug}.${baseDomain.value}`
})

const getSelectedTemplateFont = computed(() => {
  const t = templates.find(t => t.key === form.templateKey)
  return t ? t.fontClass : 'font-sans'
})

// -- Lifecycle --
onMounted(() => {
  if (typeof window !== 'undefined') {
    const host = window.location.host
    if (host.includes('localhost')) {
      baseDomain.value = 'localhost:3000'
    } else {
      const parts = host.split('.')
      if (parts.length > 2) {
         baseDomain.value = parts.slice(1).join('.')
      } else {
         baseDomain.value = host
      }
    }
  }
  fetchSettings()
})

// -- Templates Data --
const templates = [
  { 
    key: 'classic', 
    label: 'Classic Shop', 
    description: 'Timeless elegance with serif typography.',
    icon: 'lucide:layout-grid',
    fontClass: 'font-serif',
    color: '#0f172a'
  },
  { 
    key: 'modern', 
    label: 'Modern Minimal', 
    description: 'Clean aesthetic with bold accents.',
    icon: 'lucide:layout-template',
    fontClass: 'font-sans',
    color: '#0d9488'
  },
  { 
    key: 'street', 
    label: 'Street Urban', 
    description: 'Energetic, high-contrast style.',
    icon: 'lucide:zap',
    fontClass: 'font-street',
    color: '#FACC15'
  },
  { 
    key: 'cozy', 
    label: 'Cozy Warm', 
    description: 'Soft greens and rounded nuances.',
    icon: 'lucide:coffee',
    fontClass: 'font-cozy',
    color: '#A4C3B2'
  },
  { 
    key: 'cyber', 
    label: 'Cyber Future', 
    description: 'Dark mode with neon accents.',
    icon: 'lucide:cpu',
    fontClass: 'font-cyber',
    color: '#F43F5E'
  },
  { 
    key: 'stationnery', 
    label: 'Stationery', 
    description: 'Refined structure for professionals.',
    icon: 'lucide:pen-tool',
    fontClass: 'font-stationery',
    color: '#334155'
  },
  { 
    key: 'food', 
    label: 'Food Market', 
    description: 'Vibrant and appetizing.',
    icon: 'lucide:utensils',
    fontClass: 'font-food',
    color: '#EA580C'
  },
  { 
    key: 'wellness', 
    label: 'Wellness', 
    description: 'Organic, calm, and natural.',
    icon: 'lucide:flower-2',
    fontClass: 'font-wellness',
    color: '#8A9A5B'
  }
]

// -- Methods --
const handleSlugInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  form.slug = target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
}

const showMessage = (type: 'success' | 'error', text: string) => {
   message.type = type
   message.text = text
   setTimeout(() => { message.text = '' }, 4000)
}

const updateForm = (data: any) => {
  if (!data) return
  form.name = data.name || ''
  form.slug = data.slug || ''
  form.logoUrl = data.logoUrl || null
  form.primaryColor = data.primaryColor || '#0F766E'
  form.templateKey = data.templateKey || 'classic'
  form.announcementText = data.announcementText || ''
  form.announcementScrolling = data.announcementScrolling || false
}

const fetchSettings = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/admin/store-settings', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    updateForm(data)
  } catch (e) {
    console.error('Failed to load settings', e)
    showMessage('error', 'Failed to load settings.')
  } finally {
    loading.value = false
  }
}

const save = async () => {
  saving.value = true
  message.text = ''
  try {
    const updated = await $fetch('/api/admin/store-settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        name: form.name,
        slug: form.slug,
        primaryColor: form.primaryColor,
        templateKey: form.templateKey,
        logoUrl: form.logoUrl,
        announcementText: form.announcementText,
        announcementScrolling: form.announcementScrolling
      }
    })
    
    // Update global state if used elsewhere
    useState<any>('storeSettings').value = updated
    
    // Update local form
    updateForm(updated)
    
    showMessage('success', 'Store settings updated!')
  } catch (e: any) {
    console.error('Failed to save settings', e)
    showMessage('error', e.data?.statusMessage || 'Failed to save changes.')
  } finally {
    saving.value = false
  }
}

const reset = () => {
  if (confirm('Discard unsaved changes?')) {
    fetchSettings()
  }
}
</script>

<style scoped>
/* No scrollbar utility */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.animate-marquee {
  display: flex;
  animation: marquee 15s linear infinite;
  min-width: 200%; /* Ensure content is wide enough */
}

.animate-fadeIn {
   animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
   from { opacity: 0; transform: translateY(5px); }
   to { opacity: 1; transform: translateY(0); }
}
</style>
