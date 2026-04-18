<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import ProductCard from '~/components/storefront/templates/activewear/ProductCard.vue'
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

const categoryDisplayTitle = (category: any): string => {
    if (!category) return ""
    return category.parentId ? ("-> " + category.title) : category.title
}

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
const hasMultipleSlides = computed(() => heroSlides.value.length > 1)
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
        // High-energy styling classes
        const colors = ['border-brand-500', 'border-white', 'border-zinc-700', 'border-brand-500']
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
  <div class="bg-[#0a0a0a] min-h-screen pb-24 font-activewear text-slate-300">
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
        <!-- Gradient Overlay -->
        <div class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent flex items-center">
          <div class="max-w-7xl mx-auto px-6 w-full">
            <div
              class="max-w-2xl text-white transform transition-all duration-1000 delay-300" 
              :class="index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'"
            >
              <div class="inline-block px-4 py-1.5 bg-brand-500 text-black skew-x-[-15deg] font-black uppercase text-xs md:text-sm mb-6 tracking-widest leading-none">
                 <span class="block skew-x-[15deg]">{{ storefrontContent.home.welcomeTo(tenantName) }}</span>
              </div>
              <h2 class="text-6xl md:text-7xl lg:text-8xl font-black mb-4 md:mb-6 leading-none tracking-tighter uppercase italic text-white drop-shadow-lg">
                {{ slide.title }}
              </h2>
              <p class="text-lg md:text-xl lg:text-2xl mb-8 md:mb-10 text-slate-300 max-w-xl leading-snug line-clamp-2 md:line-clamp-none font-medium">
                {{ slide.subtitle }}
              </p>
              <NuxtLink
                :to="slideTo(slide.buttonHref)"
                class="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-brand-500 text-black font-black skew-x-[-15deg] uppercase tracking-widest hover:bg-white transition-all transform hover:-translate-y-1 hover:shadow-[8px_8px_0px_rgba(255,255,255,0.2)] text-base md:text-lg border-2 border-transparent"
              >
                <span class="block skew-x-[15deg]">{{ slide.buttonText || storefrontContent.home.cta.shopNow }}</span>
                <Icon name="lucide:zap" class="w-5 h-5 skew-x-[15deg] transition-transform group-hover:scale-110" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Arrows -->
      <div v-if="hasMultipleSlides" class="hidden md:flex absolute bottom-8 right-8 z-20 gap-4">
        <button
          class="w-12 h-12 skew-x-[-15deg] border-2 border-white/30 flex items-center justify-center text-white hover:bg-brand-500 hover:text-black hover:border-brand-500 transition-all backdrop-blur-sm"
          @click="prevSlide"
        >
          <Icon name="lucide:chevron-left" class="w-6 h-6 skew-x-[15deg]" />
        </button>
        <button
          class="w-12 h-12 skew-x-[-15deg] border-2 border-white/30 flex items-center justify-center text-white hover:bg-brand-500 hover:text-black hover:border-brand-500 transition-all backdrop-blur-sm"
          @click="nextSlide"
        >
          <Icon name="lucide:chevron-right" class="w-6 h-6 skew-x-[15deg]" />
        </button>
      </div>

      <!-- Dots -->
      <div v-if="hasMultipleSlides" class="absolute bottom-6 md:bottom-8 left-6 md:left-8 z-20 flex space-x-3">
        <button 
          v-for="(slide, index) in heroSlides" 
          :key="index" 
          class="h-2 skew-x-[-15deg] transition-all duration-300"
          :class="index === currentSlide ? 'bg-brand-500 w-12' : 'bg-white/30 w-6 hover:bg-white/60'"
          @click="currentSlide = index"
        />
      </div>
    </div>

    <!-- Categories Section (Horizontal Scroll) -->
    <section v-if="sections.browseByCategory.enabled" class="py-10 md:py-16 bg-[#111]">
      <div class="mb-8 md:mb-10 px-6 max-w-7xl mx-auto flex items-end justify-between">
        <div class="max-w-2xl">
          <p class="text-lg font-black text-brand-500 tracking-widest uppercase mb-2 italic skew-x-[-10deg]">
             <span class="block skew-x-[10deg]">{{ sections.browseByCategory.eyebrow }}</span>
          </p>
          <h2 class="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter uppercase italic drop-shadow-md">
            {{ sections.browseByCategory.title }}
          </h2>
        </div>
         
        <!-- Scroll Arrows -->
        <div class="hidden md:flex gap-4">
          <button
            class="w-12 h-12 skew-x-[-15deg] bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-white hover:border-brand-500 hover:text-brand-500 transition-all shadow-[4px_4px_0px_rgba(255,255,255,0.1)] hover:shadow-[4px_4px_0px_theme(colors.brand.500)]"
            onclick="document.getElementById('cat-scroll').scrollBy({left: -350, behavior: 'smooth'})"
          >
            <Icon name="lucide:chevron-left" class="w-6 h-6 skew-x-[15deg]" />
          </button>
          <button
            class="w-12 h-12 skew-x-[-15deg] bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-white hover:border-brand-500 hover:text-brand-500 transition-all shadow-[4px_4px_0px_rgba(255,255,255,0.1)] hover:shadow-[4px_4px_0px_theme(colors.brand.500)]"
            onclick="document.getElementById('cat-scroll').scrollBy({left: 350, behavior: 'smooth'})"
          >
            <Icon name="lucide:chevron-right" class="w-6 h-6 skew-x-[15deg]" />
          </button>
        </div>
      </div>

      <div class="relative w-full">
        <div
          id="cat-scroll"
          class="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-8 px-4 md:px-6 max-w-7xl mx-auto scrollbar-hide"
        >
          <NuxtLink 
            v-for="(cat) in categories" 
            :key="cat.slug" 
            :to="`/c/${cat.slug}`"
            class="snap-start flex-shrink-0 w-48 h-64 md:w-64 md:h-80 lg:w-80 lg:h-96 border-4 p-6 md:p-8 flex flex-col justify-end items-start hover:shadow-[8px_8px_0_theme(colors.brand.500)] transition-all duration-300 relative overflow-hidden group hover:-translate-y-2 hover:-translate-x-2 bg-zinc-900 skew-x-[-8deg] ml-4"
            :class="cat.className"
          >
            <!-- Background Image -->
            <div class="absolute inset-0 skew-x-[8deg] scale-[1.2] origin-center">
              <img
                v-if="cat.imageUrl"
                :src="cat.imageUrl"
                :alt="categoryDisplayTitle(cat)"
                class="w-full h-full object-cover opacity-50 transition-transform duration-700 group-hover:scale-105 mix-blend-luminosity group-hover:mix-blend-normal group-hover:opacity-80"
              >
              <div
                v-else
                class="w-full h-full bg-gradient-to-br from-zinc-800 to-[#050505]"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            </div>

            <div class="z-10 relative skew-x-[8deg] bg-black/80 border border-zinc-700 backdrop-blur-md px-5 py-3 w-[calc(100%+20px)] -ml-2">
              <h3 class="text-2xl md:text-3xl font-black text-white uppercase italic tracking-wider mb-1 group-hover:text-brand-500 transition-colors">
                {{ categoryDisplayTitle(cat) }}
              </h3>
              <p class="text-slate-400 font-bold text-sm md:text-base flex items-center gap-2 uppercase tracking-widest">
                {{ storefrontContent.common.productsCount(cat.itemCount) }}
              </p>
            </div>
                
            <!-- Action Icon -->
            <div class="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 skew-x-[8deg] bg-brand-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
              <Icon name="lucide:arrow-right" class="w-5 h-5 text-black font-bold -skew-x-[8deg]" />
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section v-if="sections.newArrivals.enabled" class="py-12 md:py-16 bg-[#0a0a0a]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-8 md:mb-10">
          <p class="text-lg font-black text-brand-500 tracking-widest uppercase mb-1 italic skew-x-[-10deg]">
            <span class="block skew-x-[10deg]">{{ sections.newArrivals.eyebrow }}</span>
          </p>
          <h2 class="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter uppercase italic drop-shadow-md">
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
            class="flex-shrink-0 w-[calc(50%-0.75rem)] sm:w-64 md:w-72 animate-pulse skew-x-[-5deg] ml-3"
          >
            <div class="bg-zinc-800 border-2 border-zinc-700 h-64 md:h-80 mb-4" />
            <div class="h-6 bg-zinc-800 w-3/4 mb-3" />
            <div class="h-6 bg-zinc-800 w-1/3" />
          </div>
        </div>

        <!-- Horizontal Scrolling Container -->
        <div
          v-else
          ref="featuredScrollContainer"
          class="flex gap-6 overflow-x-scroll pb-8 scrollbar-hide"
          style="scroll-behavior: auto;"
          @mouseenter="isHoveringFeatured = true"
          @mouseleave="isHoveringFeatured = false"
        >
          <div
            v-for="(product, index) in featuredInfiniteList"
            :key="`${product.id}-${index}`"
            class="flex-shrink-0 w-[calc(50%-0.75rem)] sm:w-64 md:w-72"
          >
            <ProductCard
              :product="product"
            />
          </div>
        </div>
            
        <div class="mt-10 text-center">
          <NuxtLink
            to="/products"
            class="inline-flex px-8 py-3 bg-brand-500 text-black font-black skew-x-[-15deg] uppercase tracking-widest hover:bg-white transition-all transform hover:-translate-y-1 shadow-[4px_4px_0_theme(colors.zinc.700)] hover:shadow-[8px_8px_0_#fff] items-center gap-3 group"
          >
            <span class="block skew-x-[15deg]">View all products</span>
            <Icon name="lucide:zap" class="w-5 h-5 skew-x-[15deg] transition-transform group-hover:scale-110" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Best Sellers -->
    <section v-if="sections.bestSellers.enabled" class="py-12 md:py-16 bg-[#111]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between mb-8 md:mb-10">
          <div>
            <p class="text-lg font-black text-brand-500 tracking-widest uppercase mb-1 italic skew-x-[-10deg]">
              <span class="block skew-x-[10deg]">{{ sections.bestSellers.eyebrow }}</span>
            </p>
            <h2 class="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter uppercase italic drop-shadow-md">
              {{ sections.bestSellers.title }}
            </h2>
          </div>
          <NuxtLink
            to="/products"
            class="hidden sm:flex px-8 py-3 bg-brand-500 text-black font-black skew-x-[-15deg] uppercase tracking-widest hover:bg-white transition-all transform hover:-translate-y-1 shadow-[4px_4px_0_theme(colors.zinc.700)] hover:shadow-[8px_8px_0_#fff] items-center gap-2 group"
          >
            <span class="block skew-x-[15deg]">View all products</span>
            <Icon name="lucide:zap" class="w-5 h-5 skew-x-[15deg] transition-transform group-hover:scale-110" />
          </NuxtLink>
        </div>

        <div v-if="bestSellersDisplayed.length === 0" class="text-sm text-slate-500 font-bold uppercase tracking-widest">
          No best sellers yet.
        </div>

        <div v-else 
          ref="bestSellersScrollContainer"
          class="flex gap-6 overflow-x-scroll pb-8 scrollbar-hide"
          style="scroll-behavior: auto;"
          @mouseenter="isHoveringBestSellers = true"
          @mouseleave="isHoveringBestSellers = false"
        >
          <div
            v-for="(product, index) in bestSellersInfiniteList"
            :key="`${product.id}-${index}`"
            class="flex-shrink-0 w-[calc(50%-0.75rem)] sm:w-64 md:w-72"
          >
            <ProductCard
             :product="product"
            />
           </div>
        </div>

        <div class="mt-10 text-center sm:hidden">
          <NuxtLink
            to="/products"
            class="inline-flex px-8 py-3 bg-brand-500 text-black font-black skew-x-[-15deg] uppercase tracking-widest hover:bg-white transition-all transform hover:-translate-y-1 shadow-[4px_4px_0_theme(colors.zinc.700)] hover:shadow-[8px_8px_0_#fff] items-center gap-2 group"
          >
            <span class="block skew-x-[15deg]">View all products</span>
            <Icon name="lucide:zap" class="w-5 h-5 skew-x-[15deg] transition-transform group-hover:scale-110" />
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
