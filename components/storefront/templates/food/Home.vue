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
    
    // Simple visual pattern for "Fresh Market" feel
    return categoriesData.value.map((cat, index) => {
        const colors = ['bg-orange-50', 'bg-lime-50', 'bg-amber-50', 'bg-rose-50']
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
  <div class="bg-[#f8faf9] min-h-screen pb-24 font-sans selection:bg-brand-100 selection:text-brand-900">
    <!-- Hero Section (Bistro Style) -->
    <div class="relative w-full overflow-hidden"
      @touchstart.passive="pauseSlideAutoplay"
      @touchend.passive="resumeSlideAutoplay"
    >
      <!-- Organic Background Blob -->
      <div class="absolute top-0 right-0 w-[80%] h-[120%] bg-brand-50/50 rounded-bl-[10rem] -z-10 transform translate-x-20 -translate-y-20 pointer-events-none" />

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 md:pt-20 md:pb-32">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <!-- Text Content -->
            <div class="relative z-10 order-2 lg:order-1">
                <h1 class="text-5xl md:text-7xl lg:text-8xl font-bold text-stone-900 leading-[0.9] mb-8">
                    {{ heroSlides[currentSlide].title }}
                </h1>
                <p class="text-lg md:text-xl text-stone-600 mb-10 max-w-lg leading-relaxed">
                    {{ heroSlides[currentSlide].subtitle }}
                </p>
                
                <div class="flex items-center gap-4">
                    <NuxtLink
                        :to="slideTo(heroSlides[currentSlide].buttonHref)"
                        class="px-8 py-4 bg-stone-900 text-white rounded-full font-bold text-lg hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-200 transition-all transform hover:-translate-y-1"
                    >
                        {{ heroSlides[currentSlide].buttonText || storefrontContent.home.cta.shopNow }}
                    </NuxtLink>
                    
                    <!-- Navigation Dots (Inline) -->
                    <div class="flex space-x-2 ml-4">
                        <button 
                        v-for="(slide, index) in heroSlides" 
                        :key="index" 
                        class="h-3 w-3 rounded-full transition-all duration-300"
                        :class="index === currentSlide ? 'bg-stone-900 scale-125' : 'bg-stone-300 hover:bg-stone-400'"
                        @click="currentSlide = index"
                        />
                    </div>
                </div>
            </div>

            <!-- Image Composition -->
            <div class="relative order-1 lg:order-2 h-[400px] md:h-[600px] flex items-center justify-center">
                <div class="relative w-full h-full">
                     <!-- Current Slide Image -->
                     <Transition
                        enter-active-class="transition duration-700 ease-out"
                        enter-from-class="opacity-0 translate-x-10 rotate-3"
                        enter-to-class="opacity-100 translate-x-0 rotate-0"
                        leave-active-class="transition duration-500 ease-in absolute inset-0"
                        leave-from-class="opacity-100 translate-x-0"
                        leave-to-class="opacity-0 -translate-x-10 -rotate-3"
                     >
                        <div :key="currentSlide" class="w-full h-full">
                           <!-- Organic Image Shape -->
                           <div class="w-full h-full rounded-[3rem] rounded-tr-[8rem] overflow-hidden shadow-2xl relative rotate-2 hover:rotate-0 transition-transform duration-500">
                                <img
                                :src="heroSlides[currentSlide].imageUrl"
                                class="w-full h-full object-cover scale-110"
                                :alt="heroSlides[currentSlide].title"
                                >
                           </div>
                           
                           <!-- Decorative Floating Elements - REMOVED -->
                        </div>
                     </Transition>
                </div>
            </div>
        </div>
      </div>
    </div>

    <!-- Categories Section (Recipe Cards) -->
    <section v-if="sections.browseByCategory.enabled" class="py-16 bg-white relative overflow-hidden">
       <!-- Wavy Separator -->
       <div class="absolute top-0 left-0 w-full h-12 bg-[#f8faf9] rounded-b-[50%] transform scale-x-150" />

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8">
        <div class="flex items-end justify-between mb-12">
            <div>
                 <p class="text-brand-600 font-bold tracking-widest uppercase text-sm mb-2 font-sans">{{ sections.browseByCategory.eyebrow }}</p>
                 <h2 class="text-4xl md:text-5xl font-bold text-stone-900">
                    {{ sections.browseByCategory.title }}
                </h2>
            </div>
             <!-- Scroll Arrows -->
            <div class="hidden md:flex gap-3">
            <button
                class="w-12 h-12 rounded-full border-2 border-stone-100 flex items-center justify-center text-stone-400 hover:border-stone-900 hover:text-stone-900 transition-all font-bold"
                onclick="document.getElementById('cat-scroll').scrollBy({left: -350, behavior: 'smooth'})"
            >
                &larr;
            </button>
            <button
                class="w-12 h-12 rounded-full border-2 border-stone-100 flex items-center justify-center text-stone-400 hover:border-stone-900 hover:text-stone-900 transition-all font-bold"
                onclick="document.getElementById('cat-scroll').scrollBy({left: 350, behavior: 'smooth'})"
            >
                &rarr;
            </button>
            </div>
        </div>

        <div class="relative w-full">
            <div
            id="cat-scroll"
            class="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-12 px-2 scrollbar-hide"
            >
            <NuxtLink 
                v-for="(cat, idx) in categories" 
                :key="cat.slug" 
                :to="`/c/${cat.slug}`"
                class="snap-start flex-shrink-0 w-64 h-80 relative group"
            >
                <!-- Recipe Card Shape -->
                <div class="absolute inset-0 bg-[#fefce8] rounded-tl-[3rem] rounded-br-[3rem] rounded-tr-lg rounded-bl-lg shadow-md border border-stone-100 transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-2 group-hover:rotate-1 overflow-hidden">
                    <div class="h-1/2 overflow-hidden relative">
                         <img
                            v-if="cat.imageUrl"
                            :src="cat.imageUrl"
                            :alt="cat.title"
                            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                        >
                        <div v-else class="w-full h-full bg-stone-200" />
                        
                        <!-- Tape Decoration -->
                        <div class="absolute top-2 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-white/30 rotate-2 backdrop-blur-sm" />
                    </div>
                    
                    <div class="p-6 text-center">
                        <h3 class="text-2xl font-bold text-stone-900 mb-2 group-hover:text-brand-700 transition-colors">{{ cat.title }}</h3>
                        <div class="w-12 h-0.5 bg-brand-200 mx-auto mb-4" />
                        <span class="inline-block px-3 py-1 bg-white border border-stone-200 rounded-full text-xs font-bold text-stone-500 group-hover:border-brand-200 group-hover:text-brand-600 transition-colors">
                            {{ storefrontContent.common.productsCount(cat.itemCount) }}
                        </span>
                    </div>
                </div>
            </NuxtLink>
            </div>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section v-if="sections.newArrivals.enabled" class="py-16 md:py-24 bg-[#f8faf9]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between mb-8 md:mb-10">
          <div>
          <p class="text-sm font-bold text-brand-600 tracking-widest uppercase mb-1">
            {{ sections.newArrivals.eyebrow }}
          </p>
            <h2 class="text-4xl md:text-5xl font-bold text-stone-900">
              {{ sections.newArrivals.title }}
            </h2>
          </div>
          <NuxtLink
            to="/products"
            class="hidden sm:flex px-6 py-2.5 rounded-full bg-white shadow-sm border border-stone-100 text-stone-900 font-bold hover:shadow-md transition-all items-center gap-2 group"
          >
            View all
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
            <div class="bg-stone-200 rounded-[2.5rem] h-80 mb-4" />
            <div class="h-4 bg-stone-200 rounded-full w-3/4 mb-3" />
            <div class="h-4 bg-stone-200 rounded-full w-1/3" />
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
            
        <div class="mt-12 text-center sm:hidden">
          <NuxtLink
            to="/products"
            class="inline-flex px-8 py-3 rounded-full bg-stone-900 text-white font-bold transition-all items-center gap-2"
          >
            View all products &rarr;
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Best Sellers (with different background) -->
    <section v-if="sections.bestSellers.enabled" class="py-16 md:py-24 bg-white relative">
       <!-- Decoration -->
       <div class="absolute right-0 top-1/4 w-64 h-64 bg-yellow-50 rounded-full blur-3xl opacity-50 -z-0 pointer-events-none" />

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="flex items-center justify-between mb-8 md:mb-10">
          <div>
            <p class="text-sm font-bold text-orange-600 tracking-widest uppercase mb-1">
              {{ sections.bestSellers.eyebrow }}
            </p>
            <h2 class="text-4xl md:text-5xl font-bold text-stone-900">
              {{ sections.bestSellers.title }}
            </h2>
          </div>
        </div>

        <div v-if="bestSellersDisplayed.length === 0" class="text-center py-12 text-stone-500 italic text-lg">
          No items found.
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
      </div>
    </section>
  </div>
</template>
