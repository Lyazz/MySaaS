<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import ProductCard from '~/components/storefront/templates/playful/ProductCard.vue'
import { isDefaultStorefrontHomeConfig, type StorefrontHomeConfig } from '~/shared/storefront/homepage'

const props = defineProps<{
  tenantName: string
  featuredProducts: any[]
  bestSellerProducts?: any[]
  homeConfig?: StorefrontHomeConfig
  pending: boolean
}>()

const cartStore = useCartStore()

const storefrontContent = useStorefrontContent()
const homeDefaults = useStorefrontHomeDefaults()
const isCustomHomeConfig = computed(() => Boolean(props.homeConfig) && !isDefaultStorefrontHomeConfig(props.homeConfig))
const heroSlides = computed(() => {
    const slides = isCustomHomeConfig.value ? props.homeConfig?.carousel : undefined
    return Array.isArray(slides) && slides.length > 0 ? slides : homeDefaults.value.carousel
})

const sections = computed(() => (isCustomHomeConfig.value ? props.homeConfig?.sections : undefined) || homeDefaults.value.sections)
const bestSellersDisplayed = computed(() => props.bestSellerProducts || [])

const slideTo = (href?: string) => (href && href.startsWith('/') ? href : '/products')

const currentSlide = ref(0)
const nextSlide = () => { currentSlide.value = (currentSlide.value + 1) % heroSlides.value.length }
const prevSlide = () => { currentSlide.value = (currentSlide.value - 1 + heroSlides.value.length) % heroSlides.value.length }

// Auto-advance slider
let slideInterval: any
const pauseSlideAutoplay = () => {
    clearInterval(slideInterval)
}
const resumeSlideAutoplay = () => {
    clearInterval(slideInterval)
    slideInterval = setInterval(nextSlide, 6000)
}


// Auto-scroll for Featured Products
const { 
  scrollContainer: featuredScrollContainer, 
  infiniteList: featuredInfiniteList, 
  isHovering: isHoveringFeatured 
} = useAutoScroll(computed(() => props.featuredProducts || []))

// Auto-scroll for Best Sellers
const { 
  scrollContainer: bestSellersScrollContainer, 
  infiniteList: bestSellersInfiniteList, 
  isHovering: isHoveringBestSellers 
} = useAutoScroll(bestSellersDisplayed)

onMounted(() => {
    slideInterval = setInterval(nextSlide, 6000)
})

onUnmounted(() => {
    clearInterval(slideInterval)
})

// Fetch Categories
const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: categoriesData } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders()
})

// Map categories to view model with visual properties
const categories = computed(() => {
    if (!categoriesData.value) return []
    
    return categoriesData.value.map((cat, index) => {
        // Simple visual pattern based on index
        const colors = ['bg-purple-100', 'bg-pink-100', 'bg-amber-100', 'bg-cyan-100']
        const colorClass = colors[index % colors.length]
        
        return {
            ...cat,
            itemCount: cat._count?.products || 0,
            className: `${colorClass}`
        }
    })
})

// Check if we have any displayed products
const displayedProducts = computed(() => {
    if (props.featuredProducts && props.featuredProducts.length > 0) {
        return props.featuredProducts
    }
    return [] 
})
</script>

<template>
  <div class="bg-white min-h-screen pb-24 font-sans">
    <!-- Hero Slider -->
    <div class="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden group"
      @touchstart.passive="pauseSlideAutoplay"
      @touchend.passive="resumeSlideAutoplay"
    >
      <!-- Slides -->
      <div 
        v-for="(slide, index) in heroSlides" 
        :key="index"
        class="absolute inset-0 transition-opacity duration-1000 ease-in-out"
        :class="index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'"
      >
        <img
          :src="slide.imageUrl"
          class="w-full h-full object-cover"
          :alt="slide.title"
        >
        <!-- Asymmetrical Blob Overlay -->
        <div class="absolute inset-0 flex items-center justify-start pointer-events-none">
          <svg class="absolute w-[120%] h-[120%] -translate-x-1/2 text-[#9333ea] fill-current opacity-90" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path d="M42.7,-73.4C55.9,-67.2,67.6,-57.4,76.5,-45.3C85.4,-33.2,91.6,-18.8,91.9,-4.3C92.2,10.2,86.6,24.8,77.9,37.3C69.2,49.8,57.4,60.2,43.9,67.1C30.4,74,15.2,77.3,0.3,76.8C-14.6,76.3,-29.2,72,-42.6,65.1C-56,58.2,-68.2,48.7,-76.3,36.5C-84.4,24.3,-88.4,9.4,-86.7,-4.8C-85,-19,-77.6,-32.5,-67.8,-43C-58,-53.5,-45.8,-61,-33.2,-67.4C-20.6,-73.8,-7.6,-79.1,5.1,-87.8C17.9,-96.5,30.5,-108.6,42.7,-73.4Z" transform="translate(100 100) scale(1.1)" />
          </svg>
          <div class="max-w-7xl mx-auto px-6 w-full relative z-10 pointer-events-auto">
            <div
              class="max-w-xl text-white transform transition-all duration-1000 delay-300 ml-4 md:ml-12 lg:ml-20 drop-shadow-lg" 
              :class="index === currentSlide ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'"
            >
              <span class="inline-block px-4 py-2 bg-[#fdf4ff] text-[#9333ea] rounded-[2rem] text-sm md:text-base font-black mb-6 tracking-wider border-4 border-purple-200 shadow-sm rotate-[-3deg]">{{ storefrontContent.home.welcomeTo(tenantName) }}</span>
              <h2 class="text-5xl md:text-6xl lg:text-[5.5rem] font-black mb-6 leading-[1.1] tracking-tight font-display text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                {{ slide.title }}
              </h2>
              <p class="text-lg md:text-xl lg:text-2xl mb-8 text-purple-50 max-w-md leading-relaxed font-bold">
                {{ slide.subtitle }}
              </p>
              <NuxtLink
                :to="slideTo(slide.buttonHref)"
                class="group inline-flex items-center gap-3 px-8 py-4 md:px-10 md:py-5 bg-[#fbbf24] text-amber-900 font-black rounded-full hover:bg-amber-300 transition-all transform hover:-translate-y-2 shadow-[0_8px_0_0_#d97706] active:translate-y-2 active:shadow-none text-base md:text-lg border-4 border-amber-100"
              >
                {{ slide.buttonText || storefrontContent.home.cta.shopNow }}
                <Icon name="lucide:arrow-right" class="w-6 h-6 transition-transform group-hover:translate-x-1 stroke-[4]" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Arrows -->
      <div class="hidden md:flex absolute bottom-8 right-8 z-20 gap-4">
        <button
          class="w-12 h-12 rounded-full border-2 border-white/40 flex items-center justify-center text-white hover:bg-white hover:text-brand-600 transition-all bg-black/20 hover:scale-110 active:scale-95"
          @click="prevSlide"
        >
          <Icon name="lucide:chevron-left" class="w-6 h-6 stroke-[3]" />
        </button>
        <button
          class="w-12 h-12 rounded-full border-2 border-white/40 flex items-center justify-center text-white hover:bg-white hover:text-brand-600 transition-all bg-black/20 hover:scale-110 active:scale-95"
          @click="nextSlide"
        >
          <Icon name="lucide:chevron-right" class="w-6 h-6 stroke-[3]" />
        </button>
      </div>

      <!-- Dots -->
      <div class="absolute bottom-6 md:bottom-8 left-6 md:left-8 z-20 flex space-x-2">
        <button 
          v-for="(slide, index) in heroSlides" 
          :key="index" 
          class="h-1 rounded-full transition-all duration-300"
          :class="index === currentSlide ? 'bg-white w-8' : 'bg-white/40 w-4 hover:bg-white/60'"
          @click="currentSlide = index"
        />
      </div>
    </div>

    <!-- Categories Section (Horizontal Scroll) -->
    <section v-if="sections.browseByCategory.enabled" class="py-10 md:py-16 bg-[#faf5ff]">
      <div class="mb-8 md:mb-10 px-6 max-w-7xl mx-auto flex items-end justify-between">
        <div class="max-w-2xl">
          <p class="text-sm font-black text-brand-500 tracking-widest uppercase mb-2 font-display">
            {{ sections.browseByCategory.eyebrow }}
          </p>
          <h2 class="text-3xl md:text-4xl lg:text-5xl font-black text-[#4c1d95] tracking-tight font-display drop-shadow-sm">
            {{ sections.browseByCategory.title }}
          </h2>
        </div>
         
        <!-- Scroll Arrows -->
        <div class="hidden md:flex gap-3">
          <button
            class="w-12 h-12 rounded-full bg-white border-2 border-brand-200 flex items-center justify-center text-brand-500 hover:bg-brand-50 hover:border-brand-300 hover:scale-110 active:scale-95 transition-all shadow-sm"
            onclick="document.getElementById('cat-scroll').scrollBy({left: -350, behavior: 'smooth'})"
          >
            <Icon name="lucide:chevron-left" class="w-6 h-6 stroke-[3]" />
          </button>
          <button
            class="w-12 h-12 rounded-full bg-white border-2 border-brand-200 flex items-center justify-center text-brand-500 hover:bg-brand-50 hover:border-brand-300 hover:scale-110 active:scale-95 transition-all shadow-sm"
            onclick="document.getElementById('cat-scroll').scrollBy({left: 350, behavior: 'smooth'})"
          >
            <Icon name="lucide:chevron-right" class="w-6 h-6 stroke-[3]" />
          </button>
        </div>
      </div>

      <div class="relative w-full">
        <div
          id="cat-scroll"
          class="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-8 px-4 md:px-6 max-w-7xl mx-auto scrollbar-hide"
        >
          <NuxtLink 
            v-for="(cat, idx) in categories" 
            :key="cat.slug" 
            :to="`/c/${cat.slug}`"
            class="snap-start flex-shrink-0 flex items-center justify-center p-6 md:p-8 hover:scale-[1.05] transition-transform duration-300 relative group"
            :class="[
              cat.className,
              idx % 2 === 0 ? 'w-48 h-48 md:w-64 md:h-64 rounded-full mt-8 md:mt-12' : 'w-56 h-72 md:w-72 md:h-80 rounded-[3rem] -mt-4 md:-mt-8'
            ]"
          >
            <!-- Background Image -->
            <div class="absolute inset-2 md:inset-4 rounded-inherit overflow-hidden bg-white shadow-sm group-hover:shadow-md transition-shadow">
              <img
                v-if="cat.imageUrl"
                :src="cat.imageUrl"
                :alt="cat.title"
                class="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-110"
              >
              <div
                v-else
                class="w-full h-full bg-slate-50 flex items-center justify-center"
              >
                 <Icon name="lucide:image" class="w-12 h-12 text-slate-200" />
              </div>
            </div>

            <!-- Floating Label -->
            <div class="absolute -bottom-4 md:-bottom-6 transform translate-y-0 group-hover:-translate-y-2 transition-transform duration-300 bg-white px-6 py-3 md:px-8 md:py-4 rounded-[2rem] shadow-lg border-4 border-purple-100 z-10 flex flex-col items-center min-w-[120px]">
              <h3 class="text-lg md:text-xl font-black text-[#4c1d95] mb-0.5 whitespace-nowrap font-display drop-shadow-[0_2px_2px_rgba(0,0,0,0.05)]">
                {{ cat.title }}
              </h3>
	              <span class="text-purple-500 font-bold text-xs md:text-sm bg-purple-50 px-2 py-0.5 rounded-full whitespace-nowrap">
	                {{ storefrontContent.common.productsCount(cat.itemCount) }}
	              </span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section v-if="sections.newArrivals.enabled" class="py-12 md:py-16 bg-white rounded-t-[3rem] -mt-8 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] border-t-[8px] border-brand-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-8 md:mb-12 text-center">
          <p class="text-sm font-black text-brand-500 tracking-widest uppercase mb-1 font-display">
            {{ sections.newArrivals.eyebrow }}
          </p>
          <h2 class="text-3xl md:text-5xl font-black text-[#4c1d95] font-display">
            {{ sections.newArrivals.title }}
          </h2>
        </div>

        <!-- Skeleton Loading - Horizontal -->
        <div
          v-if="pending"
          class="flex gap-6 overflow-x-scroll pb-8 scrollbar-hide"
        >
          <div
            v-for="i in 4"
            :key="i"
            class="flex-shrink-0 w-64 md:w-72 animate-pulse bg-white p-4 rounded-3xl border-2 border-slate-100"
          >
            <div class="bg-slate-100 rounded-2xl h-64 md:h-80 mb-4" />
            <div class="h-4 bg-slate-100 rounded-full w-3/4 mb-3" />
            <div class="h-4 bg-slate-100 rounded-full w-1/3" />
          </div>
        </div>

        <!-- Horizontal Scrolling Container -->
        <div
          v-else
          ref="featuredScrollContainer"
          class="flex gap-6 overflow-x-scroll pb-8 scrollbar-hide pt-8"
          style="scroll-behavior: auto;"
          @mouseenter="isHoveringFeatured = true"
          @mouseleave="isHoveringFeatured = false"
        >
          <div
            v-for="(product, index) in featuredInfiniteList"
            :key="`${product.id}-${index}`"
            class="flex-shrink-0 w-64 md:w-72 transition-all duration-300 transform"
            :class="index % 2 === 0 ? 'mt-0' : 'mt-8'"
          >
            <ProductCard
              :product="product"
            />
          </div>
        </div>
            
        <div class="mt-12 text-center">
          <NuxtLink
            to="/products"
            class="inline-flex px-8 py-4 rounded-full bg-brand-50 border-4 border-brand-200 text-brand-600 font-black hover:bg-brand-500 hover:border-brand-500 hover:text-white transition-all items-center gap-3 hover:-translate-y-1 shadow-[0_6px_0_0_#e9d5ff] hover:shadow-[0_6px_0_0_#7e22ce] active:translate-y-2 active:shadow-none text-lg"
          >
            Voir tous les produits <Icon name="lucide:arrow-right" class="w-5 h-5 stroke-[3]" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Best Sellers -->
    <section v-if="sections.bestSellers.enabled" class="py-12 md:py-20 bg-[#faf5ff] border-t-8 border-dashed border-brand-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between mb-8 md:mb-12">
          <div>
            <p class="text-sm font-black text-brand-500 tracking-widest uppercase mb-1 font-display">
              {{ sections.bestSellers.eyebrow }}
            </p>
            <h2 class="text-3xl md:text-5xl font-black text-[#4c1d95] font-display">
              {{ sections.bestSellers.title }}
            </h2>
          </div>
          <NuxtLink
            to="/products"
            class="hidden md:inline-flex px-6 py-3 rounded-full bg-white border-2 border-brand-100 text-brand-600 font-bold hover:bg-brand-50 hover:border-brand-300 transition-all items-center gap-2 hover:-translate-y-1 active:translate-y-0 shadow-sm group"
          >
            Tout voir
            <Icon name="lucide:arrow-right" class="w-4 h-4 stroke-[3] group-hover:translate-x-1 transition-transform" />
          </NuxtLink>
        </div>

        <div v-if="bestSellersDisplayed.length === 0" class="text-sm text-slate-600">
          No best sellers yet.
        </div>

        <div v-else 
          ref="bestSellersScrollContainer"
          class="flex gap-6 overflow-x-scroll pb-8 scrollbar-hide pt-8"
          style="scroll-behavior: auto;"
          @mouseenter="isHoveringBestSellers = true"
          @mouseleave="isHoveringBestSellers = false"
        >
          <div
            v-for="(product, index) in bestSellersInfiniteList"
            :key="`${product.id}-${index}`"
            class="flex-shrink-0 w-64 md:w-72 transition-all duration-300 transform"
            :class="index % 2 === 1 ? 'mt-0' : 'mt-8'"
          >
            <ProductCard
             :product="product"
            />
           </div>
        </div>

        <div class="mt-10 text-center sm:hidden">
          <NuxtLink
            to="/products"
            class="inline-flex px-8 py-4 rounded-full bg-brand-50 border-4 border-brand-200 text-brand-600 font-black hover:bg-brand-500 hover:border-brand-500 hover:text-white transition-all items-center gap-3 hover:-translate-y-1 shadow-[0_6px_0_0_#e9d5ff] hover:shadow-[0_6px_0_0_#7e22ce] active:translate-y-2 active:shadow-none text-lg w-full justify-center"
          >
            Tout voir <Icon name="lucide:arrow-right" class="w-5 h-5 stroke-[3]" />
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
