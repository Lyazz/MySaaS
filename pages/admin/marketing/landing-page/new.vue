<template>
  <div class="h-[calc(100vh-4rem)] bg-slate-100 text-slate-900 font-sans selection:bg-teal-500 selection:text-white overflow-hidden relative rounded-xl shadow-sm border border-slate-200 flex">
    
    <!-- LEFT SIDEBAR: CONFIGURATION (35%) -->
    <div class="w-[400px] flex-shrink-0 border-r border-slate-200 bg-white flex flex-col h-full z-20">
        <!-- Header -->
        <header class="p-5 border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
            <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-600">
                Landing Page Architect
            </h1>
            <p class="text-slate-400 text-xs mt-0.5">Autonomous Design Engine</p>
        </header>

        <!-- Scrollable Form Area -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
            
            <!-- SECTION 1: Product -->
            <section>
                <div class="flex items-center justify-between mb-3">
                    <label class="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
                        <Icon name="lucide:package" class="w-4 h-4 mr-2 text-teal-500" />
                        Product
                    </label>
                    <span v-if="selectedProduct" class="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">
                        Selected
                    </span>
                </div>

                <!-- Product Search & List -->
                <div class="relative group mb-3">
                     <div class="relative flex items-center bg-slate-50 rounded-lg overflow-hidden border border-slate-200 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500/20 transition-all">
                        <Icon name="lucide:search" class="w-4 h-4 text-slate-400 ml-3" />
                        <input 
                            v-model="searchQuery" 
                            type="text" 
                            placeholder="Find product..." 
                            class="w-full bg-transparent border-none text-slate-900 text-sm placeholder-slate-400 px-3 py-2.5 focus:ring-0 outline-none"
                        >
                    </div>
                </div>

                <!-- Compact Product List -->
                <div v-if="!selectedProduct" class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                     <div v-if="loading" class="py-4 text-center text-slate-400 text-sm">Loading products...</div>
                     <div 
                        v-else
                        v-for="product in filteredProducts" 
                        :key="product.id"
                        @click="selectProduct(product)"
                        class="flex items-center p-2 rounded-lg border border-slate-100 hover:border-teal-500/30 hover:bg-teal-50/30 cursor-pointer transition-all gap-3 group"
                    >
                        <div class="w-10 h-10 rounded-md bg-slate-100 overflow-hidden shrink-0">
                             <img :src="getProductMainImage(product) || '/blank.svg'" class="w-full h-full object-cover">
                        </div>
                        <div class="min-w-0">
                            <h4 class="text-sm font-bold text-slate-700 group-hover:text-slate-900 truncate">{{ product.title }}</h4>
                            <p class="text-xs text-slate-400 truncate">{{ formatCurrency(product.price) }}</p>
                        </div>
                    </div>
                </div>

                <!-- Selected Product Card -->
                <div v-else class="relative bg-teal-50/50 border border-teal-200 rounded-lg p-3 flex items-start gap-3 group">
                     <div class="w-16 h-16 rounded-md bg-white border border-slate-200 overflow-hidden shrink-0 shadow-sm">
                         <img :src="getProductMainImage(selectedProduct) || '/blank.svg'" class="w-full h-full object-cover">
                     </div>
                     <div class="flex-1 min-w-0">
                         <h4 class="text-sm font-bold text-slate-900 truncate">{{ selectedProduct.title }}</h4>
                         <p class="text-xs text-slate-500 line-clamp-2 mt-0.5">{{ selectedProduct.description }}</p>
                         <button @click="selectedProduct = null" class="text-xs text-red-500 hover:text-red-700 font-medium mt-2 flex items-center">
                            <Icon name="lucide:x" class="w-3 h-3 mr-1" />
                            Change Product
                         </button>
                     </div>
                </div>
            </section>

            <div class="h-px bg-slate-100"></div>

            <!-- SECTION 2: Design -->
            <section>
                <label class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center">
                    <Icon name="lucide:palette" class="w-4 h-4 mr-2 text-teal-500" />
                    Style
                </label>
                <div class="grid grid-cols-2 gap-2">
                    <button 
                        v-for="style in styles" 
                        :key="style.id"
                        @click="config.style = style.id"
                        class="relative p-3 rounded-lg border text-left transition-all hover:shadow-sm"
                        :class="config.style === style.id ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500/20' : 'border-slate-200 bg-white hover:border-teal-300'"
                    >
                        <div class="flex items-center gap-2 mb-1">
                            <Icon :name="style.icon" class="w-4 h-4" :class="config.style === style.id ? 'text-teal-600' : 'text-slate-400'" />
                            <span class="text-xs font-bold" :class="config.style === style.id ? 'text-teal-900' : 'text-slate-700'">{{ style.name }}</span>
                        </div>
                    </button>
                </div>
            </section>

            <div class="h-px bg-slate-100"></div>

            <!-- SECTION 3: Content -->
            <section>
                 <label class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center">
                    <Icon name="lucide:wand-2" class="w-4 h-4 mr-2 text-teal-500" />
                    Content
                </label>
                
                <!-- Prompt -->
                <div class="mb-4">
                    <label class="text-xs font-semibold text-slate-500 mb-1.5 block">AI Prompt</label>
                    <textarea 
                        v-model="config.prompt"
                        rows="3"
                        class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all resize-none placeholder-slate-400"
                        placeholder="e.g. Minimalist layout with earth tones..."
                    ></textarea>
                </div>

                <!-- Language -->
                <div>
                    <label class="text-xs font-semibold text-slate-500 mb-1.5 block">Language</label>
                    <div class="flex gap-2">
                         <button 
                            v-for="lang in languages" 
                            :key="lang.code"
                            @click="config.language = lang.code"
                            class="flex-1 py-1.5 px-2 rounded border text-xs font-bold transition-all"
                            :class="config.language === lang.code ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'"
                        >
                            {{ lang.name }}
                        </button>
                    </div>
                </div>
            </section>

             <div class="h-px bg-slate-100"></div>

             <!-- SECTION 4: Assets -->
            <section>
                 <label class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center">
                    <Icon name="lucide:image" class="w-4 h-4 mr-2 text-teal-500" />
                    Asset
                </label>

                <!-- Toggle Source -->
               <div class="bg-slate-100 p-1 rounded-lg flex mb-4 border border-slate-200">
                    <button 
                        @click="imageSource = 'product'"
                        class="flex-1 py-1.5 rounded-md text-xs font-bold transition-all"
                        :class="imageSource === 'product' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'"
                    >
                        Product
                    </button>
                    <button 
                            @click="imageSource = 'custom'"
                        class="flex-1 py-1.5 rounded-md text-xs font-bold transition-all"
                        :class="imageSource === 'custom' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'"
                    >
                        Custom Upload
                    </button>
                </div>

                <!-- Gallery -->
                <div v-if="imageSource === 'product'" class="grid grid-cols-3 gap-2">
                    <div 
                        v-for="(img, idx) in getAllProductImages(selectedProduct)" 
                        :key="idx"
                        @click="selectedValidationImage = img"
                        class="aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all relative"
                        :class="selectedValidationImage === img ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-slate-100 hover:border-slate-300'"
                    >
                        <img :src="img" class="w-full h-full object-cover" />
                        <div v-if="selectedValidationImage === img" class="absolute inset-0 bg-teal-500/20 flex items-center justify-center">
                             <div class="bg-teal-500 rounded-full p-1 shadow-sm">
                                <Icon name="lucide:check" class="w-3 h-3 text-white" />
                             </div>
                        </div>
                    </div>
                    <div v-if="!selectedProduct" class="col-span-3 text-center py-4 text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        Select a product to view images
                    </div>
                </div>

                 <div v-else class="w-full">
                    <ImageUploader v-model="customImage" label="Upload Image" class="h-32" />
                 </div>
            </section>

        </div>

        <!-- Footer Actions -->
        <div class="p-5 border-t border-slate-100 bg-slate-50/50">
            <button 
                @click="startGeneration"
                :disabled="!canProceed || isGenerating"
                class="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center group"
            >
                <div v-if="isGenerating" class="flex items-center">
                    <Icon name="lucide:loader-2" class="w-4 h-4 mr-2 animate-spin text-slate-400" />
                    <span>Processing...</span>
                </div>
                <div v-else class="flex items-center">
                    <Icon name="lucide:sparkles" class="w-4 h-4 mr-2 text-teal-400 group-hover:animate-pulse" />
                    <span>Generate Page</span>
                </div>
            </button>
        </div>
    </div>

    <!-- RIGHT PREVIEW AREA (65%) -->
    <div class="flex-1 bg-slate-100/50 relative flex flex-col h-full overflow-hidden">
        
        <!-- Background Pattern -->
        <div class="absolute inset-0 z-0 opacity-[0.03]" style="background-image: radial-gradient(#64748b 1px, transparent 1px); background-size: 24px 24px;"></div>

        <!-- Toolbar -->
        <div class="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white/50 backdrop-blur-sm z-10 shrink-0">
             <div class="text-sm font-bold text-slate-500">
                Preview
             </div>

             <div class="flex items-center space-x-3">
                 <button v-if="hasGenerated" @click="downloadImage" class="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all">
                    <Icon name="lucide:download" class="w-3.5 h-3.5 mr-1.5" />
                    Download
                 </button>
                 <button v-if="hasGenerated" class="px-4 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-teal-700 transition-all flex items-center">
                     Publish
                     <Icon name="lucide:arrow-right" class="w-3.5 h-3.5 ml-1.5" />
                 </button>
             </div>
        </div>

        <!-- Viewport -->
        <div class="flex-1 overflow-auto p-8 flex items-center justify-center relative">
            
            <!-- Generation Overlay -->
            <div v-if="isGenerating" class="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                 <div class="relative w-32 h-32 mb-8">
                     <div class="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                     <div class="absolute inset-0 border-4 border-teal-500 rounded-full border-t-transparent animate-spin"></div>
                     <Icon name="lucide:wand-2" class="absolute inset-0 m-auto w-10 h-10 text-teal-500 animate-pulse" />
                 </div>
                 <h2 class="text-2xl font-bold text-slate-900 mb-2">Designing your page...</h2>
                 <p class="text-slate-500 font-mono text-sm">{{ currentPhase }}</p>
                 <div class="w-64 h-1.5 bg-slate-100 rounded-full mt-6 overflow-hidden">
                     <div class="h-full bg-teal-500 transition-all duration-300" :style="{ width: progress + '%' }"></div>
                 </div>
            </div>

            <!-- Empty State -->
            <div v-if="!hasGenerated && !isGenerating" class="text-center max-w-sm">
                <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                    <Icon name="lucide:layout-template" class="w-10 h-10" />
                </div>
                <h3 class="text-slate-900 font-bold text-lg mb-2">Ready to Design</h3>
                <p class="text-slate-500 text-sm">Configure your preferences in the sidebar and click "Generate Page" to see the magic happen.</p>
            </div>

            <!-- PREVIEW -->
            <template v-if="hasGenerated && !isGenerating">
                <!-- Raw Preview Container -->
                <div class="relative h-[85vh] w-auto aspect-[9/19] shadow-2xl overflow-hidden group mx-auto animate-fade-in shrink-0 rounded-lg border border-slate-200 bg-white">
                    <div class="flex-1 relative overflow-y-auto custom-scrollbar h-full">
                        <img src="/vertical-placeholder.png" class="w-full h-auto object-cover min-h-full">
                        
                        <!-- Overlay Content -->
                        <div class="absolute inset-x-0 bottom-0 top-auto bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent p-6 z-20 pointer-events-none pb-20 pt-32">
                            <div class="inline-block px-3 py-1 bg-teal-500 text-white text-[10px] font-bold rounded mb-3">NEW ARRIVAL</div>
                            <h1 class="text-2xl font-bold text-white mb-2 leading-tight">{{ selectedProduct?.title }}</h1>
                            <p class="text-xs text-slate-300 mb-6 line-clamp-3">{{ config.prompt || selectedProduct?.description }}</p>
                            <button class="w-full py-3 bg-white text-slate-900 font-bold rounded text-sm shadow-lg pointer-events-auto">
                                Shop Now
                            </button>
                        </div>
                    </div>
                </div>
            </template>

        </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import ImageUploader from '~/components/admin/ImageUploader.vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'admin',
  title: 'Create Landing Page'
})

const { format: formatCurrency } = useCurrency()
const authStore = useAuthStore()

// State
const searchQuery = ref('')
const selectedProduct = ref<any>(null)
const hasGenerated = ref(false)

// Config
const config = ref({
    prompt: '',
    style: 'modern',
    language: 'en'
})
const imageSource = ref<'product' | 'custom'>('product')
const customImage = ref<string | null>(null)
const selectedValidationImage = ref<string | null>(null)

// Generation State
const isGenerating = ref(false)
const progress = ref(0)
const currentPhase = ref('Initializing...')

// Static Data (Same as before)
const styles = [
    { id: 'modern', name: 'Modern', desc: 'Clean lines.', icon: 'lucide:layout' },
    { id: 'luxury', name: 'Luxury', desc: 'Dark tones.', icon: 'lucide:gem' },
    { id: 'vibrant', name: 'Vibrant', desc: 'High saturation.', icon: 'lucide:zap' },
    { id: 'organic', name: 'Organic', desc: 'Earth tones.', icon: 'lucide:leaf' },
]

const languages = [
    { code: 'en', name: 'EN' },
    { code: 'fr', name: 'FR' },
    { code: 'es', name: 'ES' },
    { code: 'ar', name: 'AR' },
]

// Data Fetching
const { data: productsData, pending: loading } = useFetch('/api/admin/products', {
  headers: { Authorization: `Bearer ${authStore.token}` },
  transform: (data: any) => data || []
})

// Computed
const filteredProducts = computed(() => {
  if (!productsData.value) return []
  let filtered = productsData.value
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter((p: any) => 
      p.title.toLowerCase().includes(query) || (p.slug && p.slug.toLowerCase().includes(query))
    )
  }
  return filtered
})

const canProceed = computed(() => {
   return !!selectedProduct.value
})

const finalSelectedImage = computed((): string | undefined => {
  if (imageSource.value === 'custom') return customImage.value || undefined
  return selectedValidationImage.value || undefined
})

// Methods
const getProductMainImage = (product: any): string | undefined => {
  if (product.productImages && product.productImages.length > 0) {
    const mainImage = product.productImages.find((img: any) => img.isMain)
    return mainImage ? mainImage.url : product.productImages[0].url
  }
  if (product.images && product.images.length > 0) {
    return product.images[0]
  }
  return undefined
}

const getAllProductImages = (product: any): string[] => {
  if (!product) return []
  const images = new Set<string>()
  if (product.productImages) product.productImages.forEach((img: any) => images.add(img.url))
  if (product.images) product.images.forEach((img: string) => images.add(img))
  return Array.from(images)
}

const selectProduct = (p: any) => {
  selectedProduct.value = p
  const mainImg = getProductMainImage(p)
  selectedValidationImage.value = mainImg || null
}

const startGeneration = () => {
    isGenerating.value = true
    hasGenerated.value = false
    progress.value = 0
    let duration = 3000 // Fast preview
    let start = Date.now()
    
    const interval = setInterval(() => {
        let elapsed = Date.now() - start
        let pct = Math.min(100, (elapsed / duration) * 100)
        progress.value = Math.floor(pct)
        
        if (pct < 30) currentPhase.value = "Analyzing..."
        else if (pct < 60) currentPhase.value = "Designing..."
        else if (pct < 90) currentPhase.value = "Assembling..."

        if (pct >= 100) {
            clearInterval(interval)
            setTimeout(() => {
                isGenerating.value = false
                hasGenerated.value = true
            }, 500)
        }
    }, 50)
}

const downloadImage = () => {
    const link = document.createElement('a')
    link.href = '/vertical-placeholder.png'
    link.download = 'landing-page-generated.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

function useCurrency() {
  return {
    format: (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
  }
}
</script>

<style scoped>
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
}
</style>
