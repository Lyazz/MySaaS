<template>
  <div class="h-[calc(100vh-4rem)] selection:[background:var(--brand)] selection:text-white overflow-hidden relative rounded-xl flex" style="background: var(--surface-2); border: 1px solid var(--surface-border)">

    <!-- LEFT SIDEBAR: CONFIGURATION (35%) -->
    <div class="w-[400px] flex-shrink-0 flex flex-col h-full z-20" style="border-right: 1px solid var(--surface-border); background: var(--surface-1)">
        <!-- Header -->
        <header class="p-5 sticky top-0 z-10" style="border-bottom: 1px solid var(--surface-border); background: var(--surface-1)">
            <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r [--tw-gradient-from:var(--brand)] to-emerald-500">
                Landing Page Architect
            </h1>
            <p class="text-xs mt-0.5" style="color: var(--text-muted)">Autonomous Design Engine</p>
        </header>

        <!-- Scrollable Form Area -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">

            <!-- SECTION 1: Product -->
            <section>
                <div class="flex items-center justify-between mb-3">
                    <label class="text-sm font-bold uppercase tracking-wider flex items-center" style="color: var(--text-primary)">
                        <Icon name="lucide:package" class="w-4 h-4 mr-2 [color:var(--brand)]" />
                        Product
                    </label>
                    <span v-if="selectedProduct" class="text-xs font-bold [color:var(--brand)] [background:rgba(var(--brand-rgb)/0.08)] px-2 py-0.5 rounded-md">
                        Selected
                    </span>
                </div>

                <!-- Product Search -->
                <div class="relative mb-3">
                    <div class="relative flex items-center rounded-lg overflow-hidden border focus-within:[border-color:var(--brand)] focus-within:ring-1 focus-within:[--tw-ring-color:var(--brand)]/20 transition-all" style="background: var(--surface-2); border-color: var(--surface-border)">
                        <Icon name="lucide:search" class="w-4 h-4 ml-3" style="color: var(--text-muted)" />
                        <input
                            v-model="searchQuery"
                            type="text"
                            placeholder="Find product..."
                            class="w-full bg-transparent border-none text-sm px-3 py-2.5 focus:ring-0 outline-none"
                            style="color: var(--text-primary)"
                        >
                    </div>
                </div>

                <!-- Compact Product List -->
                <div v-if="!selectedProduct" class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    <div v-if="loading" class="py-4 text-center text-sm" style="color: var(--text-muted)">Loading products...</div>
                    <div
                        v-else
                        v-for="product in filteredProducts"
                        :key="product.id"
                        @click="selectProduct(product)"
                        class="flex items-center p-2 rounded-lg border cursor-pointer transition-all gap-3 group hover:[border-color:rgba(var(--brand-rgb)/0.4)]"
                        style="border-color: var(--surface-border); background: var(--surface-2)"
                    >
                        <div class="w-10 h-10 rounded-md overflow-hidden shrink-0" style="background: var(--surface-3)">
                            <img :src="getProductMainImage(product) || '/blank.svg?v=2'" class="w-full h-full object-cover">
                        </div>
                        <div class="min-w-0">
                            <h4 class="text-sm font-bold truncate" style="color: var(--text-secondary)">{{ product.title }}</h4>
                            <p class="text-xs truncate" style="color: var(--text-muted)">{{ formatCurrency(product.effectivePrice ?? product.price) }}</p>
                        </div>
                    </div>
                </div>

                <!-- Selected Product Card -->
                <div v-else class="relative rounded-lg p-3 flex items-start gap-3" style="background: rgba(var(--brand-rgb)/0.06); border: 1px solid rgba(var(--brand-rgb)/0.25)">
                    <div class="w-16 h-16 rounded-md overflow-hidden shrink-0" style="background: var(--surface-3); border: 1px solid var(--surface-border)">
                        <img :src="getProductMainImage(selectedProduct) || '/blank.svg?v=2'" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-bold truncate" style="color: var(--text-primary)">{{ selectedProduct.title }}</h4>
                        <p class="text-xs line-clamp-2 mt-0.5" style="color: var(--text-secondary)">{{ selectedProduct.description }}</p>
                        <button @click="selectedProduct = null" class="text-xs text-red-400 hover:text-red-300 font-medium mt-2 flex items-center">
                            <Icon name="lucide:x" class="w-3 h-3 mr-1" />
                            Change Product
                        </button>
                    </div>
                </div>
            </section>

            <div class="h-px" style="background: var(--surface-border)"></div>

            <!-- SECTION 2: Design -->
            <section>
                <label class="text-sm font-bold uppercase tracking-wider mb-3 flex items-center" style="color: var(--text-primary)">
                    <Icon name="lucide:palette" class="w-4 h-4 mr-2 [color:var(--brand)]" />
                    Style
                </label>
                <div class="grid grid-cols-2 gap-2">
                    <button
                        v-for="style in styles"
                        :key="style.id"
                        @click="config.style = style.id"
                        class="relative p-3 rounded-lg border text-left transition-all"
                        :class="config.style === style.id ? '[border-color:var(--brand)] ring-1 [--tw-ring-color:rgba(var(--brand-rgb)/0.2)]' : ''"
                        :style="config.style === style.id ? 'background: rgba(var(--brand-rgb)/0.08)' : 'background: var(--surface-2); border-color: var(--surface-border)'"
                    >
                        <div class="flex items-center gap-2 mb-1">
                            <Icon :name="style.icon" class="w-4 h-4" :class="config.style === style.id ? '[color:var(--brand)]' : ''" :style="config.style !== style.id ? 'color: var(--text-muted)' : ''" />
                            <span class="text-xs font-bold" :class="config.style === style.id ? '[color:var(--brand)]' : ''" :style="config.style !== style.id ? 'color: var(--text-secondary)' : ''">{{ style.name }}</span>
                        </div>
                    </button>
                </div>
            </section>

            <div class="h-px" style="background: var(--surface-border)"></div>

            <!-- SECTION 3: Content -->
            <section>
                <label class="text-sm font-bold uppercase tracking-wider mb-3 flex items-center" style="color: var(--text-primary)">
                    <Icon name="lucide:wand-2" class="w-4 h-4 mr-2 [color:var(--brand)]" />
                    Content
                </label>

                <!-- Prompt -->
                <div class="mb-4">
                    <label class="ui-label block mb-1.5">AI Prompt</label>
                    <textarea
                        v-model="config.prompt"
                        rows="3"
                        class="ui-input w-full p-3 text-sm resize-none"
                        placeholder="e.g. Minimalist layout with earth tones..."
                    ></textarea>
                </div>

                <!-- Language -->
                <div>
                    <label class="ui-label block mb-1.5">Language</label>
                    <div class="flex gap-2">
                        <button
                            v-for="lang in languages"
                            :key="lang.code"
                            @click="config.language = lang.code"
                            class="flex-1 py-1.5 px-2 rounded border text-xs font-bold transition-all"
                            :class="config.language === lang.code ? '[border-color:var(--brand)] [color:rgba(var(--brand-rgb)/0.85)]' : ''"
                            :style="config.language === lang.code ? 'background: rgba(var(--brand-rgb)/0.08)' : 'background: var(--surface-2); border-color: var(--surface-border); color: var(--text-tertiary)'"
                        >
                            {{ lang.name }}
                        </button>
                    </div>
                </div>
            </section>

            <div class="h-px" style="background: var(--surface-border)"></div>

            <!-- SECTION 4: Assets -->
            <section>
                <label class="text-sm font-bold uppercase tracking-wider mb-3 flex items-center" style="color: var(--text-primary)">
                    <Icon name="lucide:image" class="w-4 h-4 mr-2 [color:var(--brand)]" />
                    Asset
                </label>

                <!-- Toggle Source -->
                <div class="p-1 rounded-lg flex mb-4" style="background: var(--surface-3); border: 1px solid var(--surface-border)">
                    <button
                        @click="imageSource = 'product'"
                        class="flex-1 py-1.5 rounded-md text-xs font-bold transition-all"
                        :class="imageSource === 'product' ? '[color:var(--brand)]' : ''"
                        :style="imageSource === 'product' ? 'background: var(--surface-1); border: 1px solid var(--surface-border)' : 'color: var(--text-muted)'"
                    >
                        Product
                    </button>
                    <button
                        @click="imageSource = 'custom'"
                        class="flex-1 py-1.5 rounded-md text-xs font-bold transition-all"
                        :class="imageSource === 'custom' ? '[color:var(--brand)]' : ''"
                        :style="imageSource === 'custom' ? 'background: var(--surface-1); border: 1px solid var(--surface-border)' : 'color: var(--text-muted)'"
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
                        :class="selectedValidationImage === img ? '[border-color:var(--brand)] ring-2 [--tw-ring-color:rgba(var(--brand-rgb)/0.2)]' : ''"
                        :style="selectedValidationImage !== img ? 'border-color: var(--surface-border)' : ''"
                    >
                        <img :src="img" class="w-full h-full object-cover" />
                        <div v-if="selectedValidationImage === img" class="absolute inset-0 flex items-center justify-center" style="background: rgba(var(--brand-rgb)/0.2)">
                            <div class="rounded-full p-1 shadow-sm [background:var(--brand)]">
                                <Icon name="lucide:check" class="w-3 h-3 text-white" />
                            </div>
                        </div>
                    </div>
                    <div v-if="!selectedProduct" class="col-span-3 text-center py-4 text-xs italic rounded-lg border border-dashed" style="color: var(--text-muted); background: var(--surface-2); border-color: var(--surface-border)">
                        Select a product to view images
                    </div>
                </div>

                <div v-else class="w-full">
                    <ImageUploader v-model="customImage" mode="generic" label="Upload Image" class="h-32" />
                </div>
            </section>

        </div>

        <!-- Footer Actions -->
        <div class="p-5" style="border-top: 1px solid var(--surface-border); background: var(--surface-2)">
            <button
                @click="startGeneration"
                :disabled="!canProceed || isGenerating"
                class="w-full py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center group"
                style="background: var(--surface-3); border: 1px solid var(--surface-border); color: var(--text-primary)"
            >
                <div v-if="isGenerating" class="flex items-center">
                    <Icon name="lucide:loader-2" class="w-4 h-4 mr-2 animate-spin" style="color: var(--text-muted)" />
                    <span>Processing...</span>
                </div>
                <div v-else class="flex items-center">
                    <Icon name="lucide:sparkles" class="w-4 h-4 mr-2 [color:rgba(var(--brand-rgb)/0.85)] group-hover:animate-pulse" />
                    <span>Generate Page</span>
                </div>
            </button>
        </div>
    </div>

    <!-- RIGHT PREVIEW AREA (65%) -->
    <div class="flex-1 relative flex flex-col h-full overflow-hidden" style="background: var(--admin-content-bg)">

        <!-- Background Pattern -->
        <div class="absolute inset-0 z-0 opacity-[0.03]" style="background-image: radial-gradient(#64748b 1px, transparent 1px); background-size: 24px 24px;"></div>

        <!-- Toolbar -->
        <div class="h-16 flex items-center justify-between px-6 z-10 shrink-0" style="border-bottom: 1px solid var(--surface-border); background: var(--surface-1)">
            <div class="text-sm font-bold" style="color: var(--text-muted)">
                Preview
            </div>

            <div class="flex items-center space-x-3">
                <button v-if="hasGenerated" @click="downloadImage" class="text-xs font-bold flex items-center px-3 py-1.5 rounded-lg transition-all" style="color: var(--text-secondary); background: var(--surface-2); border: 1px solid var(--surface-border)">
                    <Icon name="lucide:download" class="w-3.5 h-3.5 mr-1.5" />
                    Download
                </button>
                <button v-if="hasGenerated" class="px-4 py-1.5 [background:var(--brand)] hover:opacity-90 text-black text-xs font-bold rounded-lg transition-all flex items-center">
                    Publish
                    <Icon name="lucide:arrow-right" class="w-3.5 h-3.5 ml-1.5" />
                </button>
            </div>
        </div>

        <!-- Viewport -->
        <div class="flex-1 overflow-auto p-8 flex items-center justify-center relative">

            <!-- Generation Overlay -->
            <div v-if="isGenerating" class="absolute inset-0 z-50 flex flex-col items-center justify-center" style="background: rgba(0,0,0,0.5); backdrop-filter: blur(4px)">
                <div class="relative w-32 h-32 mb-8">
                    <div class="absolute inset-0 border-4 rounded-full" style="border-color: var(--surface-border)"></div>
                    <div class="absolute inset-0 border-4 [border-color:var(--brand)] rounded-full border-t-transparent animate-spin"></div>
                    <Icon name="lucide:wand-2" class="absolute inset-0 m-auto w-10 h-10 [color:var(--brand)] animate-pulse" />
                </div>
                <h2 class="text-2xl font-bold mb-2" style="color: var(--text-primary)">Designing your page...</h2>
                <p class="font-mono text-sm" style="color: var(--text-secondary)">{{ currentPhase }}</p>
                <div class="w-64 h-1.5 rounded-full mt-6 overflow-hidden" style="background: var(--surface-3)">
                    <div class="h-full [background:var(--brand)] transition-all duration-300" :style="{ width: progress + '%' }"></div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="!hasGenerated && !isGenerating" class="text-center max-w-sm">
                <div class="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style="background: var(--surface-3); color: var(--text-muted)">
                    <Icon name="lucide:layout-template" class="w-10 h-10" />
                </div>
                <h3 class="font-bold text-lg mb-2" style="color: var(--text-primary)">Ready to Design</h3>
                <p class="text-sm" style="color: var(--text-secondary)">Configure your preferences in the sidebar and click "Generate Page" to see the magic happen.</p>
            </div>

            <!-- PREVIEW -->
            <template v-if="hasGenerated && !isGenerating">
                <div class="relative h-[85vh] w-auto aspect-[9/19] shadow-2xl overflow-hidden group mx-auto animate-fade-in shrink-0 rounded-lg" style="border: 1px solid var(--surface-border); background: var(--surface-1)">
                    <div class="flex-1 relative overflow-y-auto custom-scrollbar h-full">
                        <img src="/vertical-placeholder.png" class="w-full h-auto object-cover min-h-full">

                        <!-- Overlay Content -->
                        <div class="absolute inset-x-0 bottom-0 top-auto bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent p-6 z-20 pointer-events-none pb-20 pt-32">
                            <div class="inline-block px-3 py-1 [background:var(--brand)] text-white text-[10px] font-bold rounded mb-3">NEW ARRIVAL</div>
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
import { buildProductPricing } from '~/shared/pricing/product-pricing'

definePageMeta({
  layout: 'admin',
  title: 'Create Landing Page',
  middleware: 'auth'
})

const { format: formatCurrency } = useCurrency()
const authStore = useAuthStore()

const searchQuery = ref('')
const selectedProduct = ref<any>(null)
const hasGenerated = ref(false)

const config = ref({
    prompt: '',
    style: 'modern',
    language: 'en'
})
const imageSource = ref<'product' | 'custom'>('product')
const customImage = ref<string | null>(null)
const selectedValidationImage = ref<string | null>(null)

const isGenerating = ref(false)
const progress = ref(0)
const currentPhase = ref('Initializing...')

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

const { data: productsData, pending: loading } = useFetch('/api/admin/products', {
  headers: { Authorization: `Bearer ${authStore.token}` },
  transform: (data: any) => data || []
})

const filteredProducts = computed(() => {
  if (!productsData.value) return []
  let filtered = productsData.value
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter((p: any) =>
      p.title.toLowerCase().includes(query) || (p.slug && p.slug.toLowerCase().includes(query))
    )
  }
  return filtered.map((product: any) => ({
    ...product,
    effectivePrice: buildProductPricing(product).effectivePrice
  }))
})

const canProceed = computed(() => !!selectedProduct.value)

const getProductMainImage = (product: any): string | undefined => {
  if (product.productImages && product.productImages.length > 0) {
    const mainImage = product.productImages.find((img: any) => img.isMain)
    return mainImage ? mainImage.url : product.productImages[0].url
  }
  if (product.images && product.images.length > 0) return product.images[0]
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
    let duration = 3000
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
