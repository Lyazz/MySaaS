<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import ProductCard from '~/components/storefront/templates/stationnery/ProductCard.vue'
import { DEFAULT_STOREFRONT_HOME_CONFIG, type StorefrontHomeConfig } from '~/shared/storefront/homepage'

const props = defineProps<{
  tenantName: string
  featuredProducts: any[]
  bestSellerProducts?: any[]
  homeConfig?: StorefrontHomeConfig
  pending: boolean
}>()

const cartStore = useCartStore()

const defaultHeroSlides = DEFAULT_STOREFRONT_HOME_CONFIG.carousel
const heroSlides = computed(() => {
    const slides = props.homeConfig?.carousel
    return Array.isArray(slides) && slides.length > 0 ? slides : defaultHeroSlides
})

const sections = computed(() => props.homeConfig?.sections || DEFAULT_STOREFRONT_HOME_CONFIG.sections)
const bestSellersDisplayed = computed(() => props.bestSellerProducts || [])

const slideTo = (href?: string) => (href && href.startsWith('/') ? href : '/products')

const currentSlide = ref(0)
const nextSlide = () => { currentSlide.value = (currentSlide.value + 1) % heroSlides.value.length }
const prevSlide = () => { currentSlide.value = (currentSlide.value - 1 + heroSlides.value.length) % heroSlides.value.length }

// Auto-advance slider
let slideInterval: any
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
    
    return categoriesData.value.map((cat) => {
        return {
            ...cat,
            itemCount: cat._count?.products || 0
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
  <div class="bg-[#fdfbf7] min-h-screen pb-24 font-stationery">
    <!-- Hero Slider -->
    <div class="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden group">
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
              <span class="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-sm text-xs md:text-sm font-medium mb-4 tracking-wide border border-white/10 uppercase">Welcome to {{ tenantName }}</span>
              <h2 class="text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight tracking-tight">
                {{ slide.title }}
              </h2>
              <p class="text-base md:text-lg lg:text-xl mb-6 md:mb-8 text-slate-100 max-w-lg leading-relaxed line-clamp-2 md:line-clamp-none">
                {{ slide.subtitle }}
              </p>
              <NuxtLink
                :to="slideTo(slide.buttonHref)"
                class="group inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-white text-slate-900 font-bold rounded-sm hover:bg-[#fdfbf7] transition-all transform hover:scale-105 shadow-sm text-sm md:text-base border border-stone-200"
              >
                {{ slide.buttonText || 'Shop Now' }}
                <Icon name="lucide:arrow-right" class="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Arrows -->
      <div class="hidden md:flex absolute bottom-8 right-8 z-20 gap-4">
        <button
          class="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-slate-900 transition-all backdrop-blur-sm"
          @click="prevSlide"
        >
          <Icon name="lucide:chevron-left" class="w-5 h-5" />
        </button>
        <button
          class="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-slate-900 transition-all backdrop-blur-sm"
          @click="nextSlide"
        >
          <Icon name="lucide:chevron-right" class="w-5 h-5" />
        </button>
      </div>

      <!-- Dots -->
      <div class="absolute bottom-6 md:bottom-8 left-6 md:left-8 z-20 flex space-x-2">
        <button 
          v-for="(slide, index) in heroSlides" 
          :key="index" 
          class="h-1 rounded-sm transition-all duration-300"
          :class="index === currentSlide ? 'bg-white w-8' : 'bg-white/40 w-4 hover:bg-white/60'"
          @click="currentSlide = index"
        />
      </div>
    </div>

    <!-- Categories Section (Horizontal Scroll) -->
    <section v-if="sections.browseByCategory.enabled" class="py-10 md:py-16 bg-[#fdfbf7]">
      <div class="mb-8 md:mb-10 px-6 max-w-7xl mx-auto flex items-end justify-between">
        <div class="max-w-2xl">
          <p class="text-sm font-bold text-brand-600 tracking-widest uppercase mb-2">
            {{ sections.browseByCategory.eyebrow }}
          </p>
          <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
            {{ sections.browseByCategory.title }}
          </h2>
        </div>
         
        <!-- Scroll Arrows -->
        <div class="hidden md:flex gap-3">
          <button
            class="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:border-brand-600 hover:text-brand-600 transition-colors"
            onclick="document.getElementById('cat-scroll').scrollBy({left: -350, behavior: 'smooth'})"
          >
            <Icon name="lucide:chevron-left" class="w-5 h-5" />
          </button>
          <button
            class="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:border-brand-600 hover:text-brand-600 transition-colors"
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
            v-for="(cat, idx) in categories" 
            :key="cat.slug" 
            :to="`/c/${cat.slug}`"
            class="snap-start flex-shrink-0 w-48 h-64 md:w-64 md:h-80 lg:w-80 lg:h-96 p-6 md:p-8 flex flex-col justify-end items-start hover:shadow-md transition-all duration-300 relative overflow-hidden group border border-stone-200 bg-white"
          >
            <!-- Background Image -->
            <div class="absolute inset-0">
              <img
                v-if="cat.imageUrl"
                :src="cat.imageUrl"
                :alt="cat.title"
                class="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
              >
              <div
                v-else
                class="w-full h-full bg-stone-50"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-stone-900/20 to-transparent" />
            </div>

            <div class="z-10 relative transform transition-transform duration-300 px-4 py-3 bg-white border border-stone-200 shadow-sm w-full">
              <h3 class="text-xl md:text-2xl font-bold font-stationery text-stone-900 mb-1 group-hover:text-stone-600 transition-colors">
                {{ cat.title }}
              </h3>
              <p class="text-stone-500 font-medium text-sm md:text-base flex items-center gap-2">
                {{ cat.itemCount }} Products
              </p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section v-if="sections.newArrivals.enabled" class="py-12 md:py-16 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between mb-8 md:mb-10">
          <div>
          <p class="text-sm font-bold text-brand-600 tracking-widest uppercase mb-1">
            {{ sections.newArrivals.eyebrow }}
          </p>
            <h2 class="text-2xl md:text-3xl font-bold text-slate-900">
              {{ sections.newArrivals.title }}
            </h2>
          </div>
          <NuxtLink
            to="/products"
            class="hidden sm:flex px-6 py-2.5 rounded-sm border border-stone-300 text-slate-700 font-medium hover:border-brand-600 hover:text-brand-600 transition-all items-center gap-2 group"
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
            class="flex-shrink-0 w-64 md:w-72 animate-pulse"
          >
            <div class="bg-slate-100 rounded-2xl h-64 md:h-80 mb-4" />
            <div class="h-4 bg-slate-100 rounded-full w-3/4 mb-3" />
            <div class="h-4 bg-slate-100 rounded-full w-1/3" />
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
             class="flex-shrink-0 w-64 md:w-72"
          >
           <ProductCard
             :product="product"
            class="h-full"
           />
          </div>
        </div>
            
        <div class="mt-10 text-center sm:hidden">
          <NuxtLink
            to="/products"
            class="inline-flex px-6 py-2.5 rounded-sm border border-stone-300 text-slate-700 font-medium hover:border-brand-600 hover:text-brand-600 transition-all items-center gap-2"
          >
            View all products &rarr;
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Best Sellers -->
    <section v-if="sections.bestSellers.enabled" class="py-12 md:py-16 bg-[#fdfbf7] border-t border-stone-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between mb-8 md:mb-10">
          <div>
            <p class="text-sm font-bold text-brand-600 tracking-widest uppercase mb-1">
              {{ sections.bestSellers.eyebrow }}
            </p>
            <h2 class="text-2xl md:text-3xl font-bold text-slate-900">
              {{ sections.bestSellers.title }}
            </h2>
          </div>
          <NuxtLink
            to="/products"
            class="hidden sm:flex px-6 py-2.5 rounded-sm border border-stone-300 text-slate-700 font-medium hover:border-brand-600 hover:text-brand-600 transition-all items-center gap-2 group"
          >
            View all products
            <span class="inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
          </NuxtLink>
        </div>

        <div v-if="bestSellersDisplayed.length === 0" class="text-sm text-slate-600">
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
            class="flex-shrink-0 w-64 md:w-72"
          >
            <ProductCard
             :product="product"
            class="h-full"
            />
           </div>
        </div>

        <div class="mt-10 text-center sm:hidden">
          <NuxtLink
            to="/products"
            class="inline-flex px-6 py-2.5 rounded-sm border border-stone-300 text-slate-700 font-medium hover:border-brand-600 hover:text-brand-600 transition-all items-center gap-2"
          >
            View all products &rarr;
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
