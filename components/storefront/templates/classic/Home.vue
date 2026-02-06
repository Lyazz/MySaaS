<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import ProductCard from './ProductCard.vue'
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
        const colors = ['bg-orange-50', 'bg-blue-50', 'bg-green-50', 'bg-brand-50']
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
  <div class="bg-white min-h-screen pb-24 font-serif">
    <!-- Hero Slider -->
    <div class="relative w-full h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden group">
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
        <div class="absolute inset-0 bg-black/20 flex items-center justify-center text-center">
          <div class="max-w-4xl mx-auto px-6 w-full">
            <div
              class="transform transition-all duration-1000 delay-300" 
              :class="index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'"
            >
              <span class="inline-block px-4 py-1 bg-white text-slate-900 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                {{ tenantName }}
              </span>
              <h2 class="text-5xl md:text-6xl lg:text-8xl font-serif text-white mb-6 leading-tight tracking-tight">
                {{ slide.title }}
              </h2>
              <p class="text-lg md:text-xl lg:text-2xl mb-10 text-white/90 max-w-2xl mx-auto font-light leading-relaxed">
                {{ slide.subtitle }}
              </p>
              <NuxtLink
                :to="slideTo(slide.buttonHref)"
                class="inline-block px-10 py-4 bg-white text-slate-900 text-sm font-bold uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-colors duration-300 min-w-[200px]"
              >
                {{ slide.buttonText || storefrontContent.home.cta.shopNow }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Points (Classic Style) -->
      <div class="absolute bottom-10 left-0 right-0 z-20 flex justify-center space-x-4">
        <button 
          v-for="(slide, index) in heroSlides" 
          :key="index" 
          class="w-3 h-3 border border-white transition-all duration-300 rounded-full"
          :class="index === currentSlide ? 'bg-white scale-125' : 'bg-transparent hover:bg-white/50'"
          @click="currentSlide = index"
        />
      </div>
      
      <!-- Arrows (Minimal) -->
      <button 
        class="absolute left-8 top-1/2 -translate-y-1/2 z-20 text-white/50 hover:text-white transition-colors hidden md:block"
        @click="prevSlide"
      >
         <Icon name="lucide:arrow-left" class="w-8 h-8 font-light" />
      </button>
      <button 
        class="absolute right-8 top-1/2 -translate-y-1/2 z-20 text-white/50 hover:text-white transition-colors hidden md:block"
        @click="nextSlide"
      >
         <Icon name="lucide:arrow-right" class="w-8 h-8 font-light" />
      </button>
    </div>

    <!-- Categories Section (Grid) -->
    <section v-if="sections.browseByCategory.enabled" class="py-16 md:py-24 bg-white">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-16">
          <span class="text-slate-500 uppercase tracking-widest text-xs font-bold mb-3 block">{{ sections.browseByCategory.eyebrow }}</span>
          <h2 class="text-3xl md:text-4xl font-serif text-slate-900">
            {{ sections.browseByCategory.title }}
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <NuxtLink 
            v-for="(cat, idx) in categories" 
            :key="cat.slug" 
            :to="`/c/${cat.slug}`"
            class="group relative aspect-[3/4] md:aspect-[4/5] overflow-hidden bg-gray-100 block"
          >
            <!-- Background Image -->
            <img
              v-if="cat.imageUrl"
              :src="cat.imageUrl"
              :alt="cat.title"
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
            >
            <div v-else class="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                <span class="text-4xl font-serif text-slate-200">{{ cat.title[0] }}</span>
            </div>
            
            <!-- Overlay Content -->
            <div class="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-500" />
            
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
               <div class="bg-white px-8 py-4 bg-opacity-90 backdrop-blur-sm group-hover:bg-opacity-100 transition-all duration-300">
                  <h3 class="text-xl md:text-2xl font-serif text-slate-900 mb-1">
                    {{ cat.title }}
                  </h3>
                  <p class="text-xs text-slate-500 uppercase tracking-wider font-medium group-hover:text-brand-600 transition-colors">
                    {{ storefrontContent.common.productsCount(cat.itemCount) }}
                  </p>
               </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section v-if="sections.newArrivals.enabled" class="py-16 md:py-24 bg-[#fcfcfc] border-t border-slate-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <span class="text-slate-500 uppercase tracking-widest text-xs font-bold mb-3 block">{{ sections.newArrivals.eyebrow }}</span>
          <h2 class="text-3xl md:text-4xl font-serif text-slate-900">
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
            class="flex-shrink-0 w-64 md:w-72 animate-pulse"
          >
            <div class="bg-slate-200 h-[350px] mb-4 w-full" />
            <div class="h-4 bg-slate-200 w-3/4 mx-auto mb-3" />
            <div class="h-4 bg-slate-200 w-1/4 mx-auto" />
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
           />
          </div>
        </div>
            
        <div class="mt-16 text-center">
          <NuxtLink
            to="/products"
            class="inline-block border-b border-slate-900 pb-1 text-slate-900 text-sm font-bold uppercase tracking-widest hover:text-brand-600 hover:border-brand-600 transition-colors"
          >
            View all products
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Best Sellers -->
    <section v-if="sections.bestSellers.enabled" class="py-16 md:py-24 bg-white border-t border-slate-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <span class="text-slate-500 uppercase tracking-widest text-xs font-bold mb-3 block">{{ sections.bestSellers.eyebrow }}</span>
          <h2 class="text-3xl md:text-4xl font-serif text-slate-900">
            {{ sections.bestSellers.title }}
          </h2>
        </div>

        <div v-if="bestSellersDisplayed.length === 0" class="text-center text-sm text-slate-600">
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
            />
           </div>
        </div>

        <div class="mt-16 text-center">
          <NuxtLink
            to="/products"
            class="inline-block border-b border-slate-900 pb-1 text-slate-900 text-sm font-bold uppercase tracking-widest hover:text-brand-600 hover:border-brand-600 transition-colors"
          >
            View all products
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
