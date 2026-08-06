<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import ProductCard from '~/components/storefront/templates/cyber/ProductCard.vue'
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
        const colors = ['bg-pink-900/30', 'bg-purple-900/30', 'bg-cyan-900/30', 'bg-orange-900/30']
        const colorClass = colors[index % colors.length]
        
        return {
            ...cat,
            itemCount: cat._count?.products || 0,
            className: `${colorClass}`
        }
    })
})

// Check if we have any displayed products
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
</script>

<template>
  <div class="min-h-screen pb-24 font-sans relative">
    <!-- Synthwave Background -->
    <div class="fixed inset-0 z-0 pointer-events-none">
      <div class="absolute inset-0 bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0515]"></div>
      <div class="absolute bottom-0 left-0 right-0 h-[30%] bg-[linear-gradient(rgba(255,45,149,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,45,149,0.1)_1px,transparent_1px)] bg-[size:30px_30px] [perspective:500px] [transform:rotateX(60deg)] origin-bottom opacity-40"></div>
    </div>

    <!-- Hero Slider -->
    <div class="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden group z-10"
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
        <div class="absolute inset-0 bg-gradient-to-r from-[#1a0a2e]/90 via-[#1a0a2e]/60 to-transparent flex items-center">
          <div class="max-w-7xl mx-auto px-6 w-full">
            <div
              class="max-w-2xl text-white transform transition-all duration-1000 delay-300" 
              :class="index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'"
            >
              <span class="inline-block px-3 py-1 bg-pink-500/20 backdrop-blur-sm rounded-full text-xs md:text-sm font-medium mb-4 tracking-wide border border-pink-500/30 text-pink-300">{{ storefrontContent.home.welcomeTo(tenantName) }}</span>
              <h2 class="text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-orange-400 to-cyan-400">
                {{ slide.title }}
              </h2>
              <p class="text-base md:text-lg lg:text-xl mb-6 md:mb-8 text-purple-200/80 max-w-lg leading-relaxed line-clamp-2 md:line-clamp-none">
                {{ slide.subtitle }}
              </p>
              <NuxtLink
                :to="slideTo(slide.buttonHref)"
                class="group inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold rounded-full hover:from-pink-600 hover:to-orange-600 transition-all transform hover:scale-105 shadow-lg shadow-pink-500/30 text-sm md:text-base"
              >
                  {{ slide.buttonText || storefrontContent.home.cta.shopNow }}
                  <Icon name="lucide:arrow-right" class="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Arrows -->
      <div v-if="hasMultipleSlides" class="hidden md:flex absolute bottom-8 end-8 z-20 gap-4">
        <button
          class="w-12 h-12 rounded-full border border-pink-500/30 flex items-center justify-center text-white hover:bg-pink-500/20 hover:border-pink-500 transition-all backdrop-blur-sm"
          @click="prevSlide"
        >
          <Icon name="lucide:chevron-left" class="w-5 h-5" />
        </button>
        <button
          class="w-12 h-12 rounded-full border border-pink-500/30 flex items-center justify-center text-white hover:bg-pink-500/20 hover:border-pink-500 transition-all backdrop-blur-sm"
          @click="nextSlide"
        >
          <Icon name="lucide:chevron-right" class="w-5 h-5" />
        </button>
      </div>

      <!-- Dots -->
      <div v-if="hasMultipleSlides" class="absolute bottom-6 md:bottom-8 start-6 md:start-8 z-20 flex space-x-2 rtl:space-x-reverse">
        <button 
          v-for="(slide, index) in heroSlides" 
          :key="index" 
          class="h-1 rounded-full transition-all duration-300"
          :class="index === currentSlide ? 'bg-pink-500 w-8' : 'bg-purple-500/40 w-4 hover:bg-purple-500/60'"
          @click="currentSlide = index"
        />
      </div>
    </div>

    <!-- Categories Section (Horizontal Scroll) -->
    <section v-if="sections.browseByCategory.enabled" class="py-10 md:py-16 relative z-10">
      <div class="mb-8 md:mb-10 px-6 max-w-7xl mx-auto flex items-end justify-between">
        <div class="max-w-2xl">
          <p class="text-sm font-bold text-pink-400 tracking-widest uppercase mb-2">
            {{ sections.browseByCategory.eyebrow }}
          </p>
          <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 tracking-tight">
            {{ sections.browseByCategory.title }}
          </h2>
        </div>
         
        <!-- Scroll Arrows -->
        <div class="hidden md:flex gap-3">
          <button
            class="w-10 h-10 rounded-full bg-[#1a0a2e] border border-purple-500/30 flex items-center justify-center text-purple-300 hover:border-pink-500 hover:text-pink-400 transition-colors"
            onclick="document.getElementById('cat-scroll').scrollBy({left: -350, behavior: 'smooth'})"
          >
            <Icon name="lucide:chevron-left" class="w-5 h-5" />
          </button>
          <button
            class="w-10 h-10 rounded-full bg-[#1a0a2e] border border-purple-500/30 flex items-center justify-center text-purple-300 hover:border-pink-500 hover:text-pink-400 transition-colors"
            onclick="document.getElementById('cat-scroll').scrollBy({left: 350, behavior: 'smooth'})"
          >
            <Icon name="lucide:chevron-right" class="w-5 h-5" />
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
            :to="`/category/${cat.slug}`"
            class="snap-start flex-shrink-0 w-48 h-64 md:w-64 md:h-80 lg:w-80 lg:h-96 rounded-3xl p-6 md:p-8 flex flex-col justify-end items-start hover:shadow-xl transition-all duration-300 relative overflow-hidden group border border-purple-500/30"
            :class="cat.className"
          >
            <!-- Background Image -->
            <div class="absolute inset-0">
              <img
                v-if="cat.imageUrl"
                :src="cat.imageUrl"
                :alt="categoryDisplayTitle(cat)"
                class="w-full h-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-105"
              >
              <div
                v-else
                class="w-full h-full bg-gradient-to-br from-purple-900/40 via-pink-900/20 to-transparent"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-[#1a0a2e]/80 via-[#1a0a2e]/40 to-transparent" />
            </div>

            <!-- Background Decoration (Circle) -->
            <div class="absolute -top-10 -end-10 w-32 h-32 md:w-40 md:h-40 rounded-full bg-pink-500/20 blur-2xl group-hover:scale-150 transition-transform duration-700" />

            <div class="z-10 relative transform transition-transform duration-300 group-hover:-translate-y-2 bg-[#1a0a2e]/85 backdrop-blur-sm px-4 py-3 rounded-2xl border border-purple-500/30">
              <h3 class="text-xl md:text-2xl font-bold text-white mb-1 group-hover:text-pink-400 transition-colors">
                {{ categoryDisplayTitle(cat) }}
              </h3>
              <p class="text-purple-300/70 font-medium text-sm md:text-base flex items-center gap-2">
                  {{ storefrontContent.common.productsCount(cat.itemCount) }}
                  <span class="w-8 h-px bg-purple-500/50 group-hover:w-16 group-hover:bg-pink-500 transition-all hidden md:block" />
                </p>
            </div>
                
            <!-- Action Icon -->
            <div class="absolute top-4 end-4 md:top-6 md:end-6 w-8 h-8 md:w-10 md:h-10 rounded-full bg-pink-500/20 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 border border-pink-500/30">
              <Icon name="lucide:arrow-right" class="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section v-if="sections.newArrivals.enabled" class="py-12 md:py-16 relative z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between mb-8 md:mb-10">
          <div>
          <p class="text-sm font-bold text-pink-400 tracking-widest uppercase mb-1">
            {{ sections.newArrivals.eyebrow }}
          </p>
            <h2 class="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">
              {{ sections.newArrivals.title }}
            </h2>
          </div>
          <NuxtLink
            to="/products"
            class="hidden sm:flex px-6 py-2.5 rounded-full border border-purple-500/30 text-purple-200 font-medium hover:border-pink-500 hover:text-pink-400 transition-all items-center gap-2 group"
          >
            View all products
            <span class="inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
          </NuxtLink>
        </div>

        <!-- Skeleton Loading - Horizontal -->
        <div
          v-if="pending"
          class="flex gap-6 overflow-x-scroll pb-8 scrollbar-hide"
        >
          <div
            v-for="i in 4"
            :key="i"
            class="flex-shrink-0 w-[calc(50%-0.75rem)] sm:w-64 md:w-72 animate-pulse"
          >
            <div class="bg-purple-900/30 rounded-2xl h-64 md:h-80 mb-4" />
            <div class="h-4 bg-purple-900/30 rounded-full w-3/4 mb-3" />
            <div class="h-4 bg-purple-900/30 rounded-full w-1/3" />
          </div>
        </div>

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
            
        <div class="mt-10 text-center sm:hidden">
          <NuxtLink
            to="/products"
            class="inline-flex px-6 py-2.5 rounded-full border border-purple-500/30 text-purple-200 font-medium hover:border-pink-500 hover:text-pink-400 transition-all items-center gap-2"
          >
            View all products &rarr;
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Best Sellers -->
    <section v-if="sections.bestSellers.enabled" class="py-12 md:py-16 relative z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between mb-8 md:mb-10">
          <div>
            <p class="text-sm font-bold text-pink-400 tracking-widest uppercase mb-1">
              {{ sections.bestSellers.eyebrow }}
            </p>
            <h2 class="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">
              {{ sections.bestSellers.title }}
            </h2>
          </div>
          <NuxtLink
            to="/products"
            class="hidden sm:flex px-6 py-2.5 rounded-full border border-purple-500/30 text-purple-200 font-medium hover:border-pink-500 hover:text-pink-400 transition-all items-center gap-2 group"
          >
            View all products
            <span class="inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
          </NuxtLink>
        </div>

        <div v-if="bestSellersDisplayed.length === 0" class="text-sm text-purple-200/80">
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
            class="inline-flex px-6 py-2.5 rounded-full border border-purple-500/30 text-purple-200 font-medium hover:border-pink-500 hover:text-pink-400 transition-all items-center gap-2"
          >
            View all products &rarr;
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
