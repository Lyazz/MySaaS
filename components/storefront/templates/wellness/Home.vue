<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import ProductCard from '~/components/storefront/templates/wellness/ProductCard.vue'
import { isDefaultStorefrontHomeConfig, type StorefrontHomeConfig } from '~/shared/storefront/homepage'

const props = defineProps<{
  tenantName: string
  featuredProducts: any[]
  bestSellerProducts?: any[]
  homeConfig?: StorefrontHomeConfig
  pending: boolean
}>()

const cartStore = useCartStore()

const { t } = useI18n({ useScope: 'global' })
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
const displayedProducts = computed(() => {
    if (props.featuredProducts && props.featuredProducts.length > 0) {
        return props.featuredProducts
    }
    return [] 
})
</script>

<template>
  <div class="bg-stone-50 min-h-screen pb-24 font-wellness text-stone-700">
    <!-- Hero Slider (Editorial Style) -->
    <div class="relative w-full h-[600px] md:h-[700px] overflow-hidden group"
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
        <div class="absolute inset-0 bg-black/20" /> 
        
        <!-- Gradient Overlay -->
        <div class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-stone-900/80 via-stone-900/40 to-transparent" />
        
        <!-- Content (Editorial Overlay) -->
        <div class="absolute inset-0 flex items-end justify-start p-8 md:p-16">
             <div 
               class="max-w-xl w-full text-left transform transition-all duration-1000 delay-300"
               :class="index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'"
             >
                <div class="inline-flex items-center gap-2 mb-6">
                    <span class="inline-block w-8 h-[2px] bg-brand-400"></span>
                    <span class="text-brand-300 text-sm font-bold uppercase tracking-widest">{{ storefrontContent.home.welcomeTo(tenantName) }}</span>
                </div>
                
                <h2 class="font-wellness text-5xl md:text-6xl lg:text-7xl text-white mb-6 leading-none drop-shadow-md">
                  {{ slide.title }}
                </h2>
                
                <p class="text-stone-100/90 text-lg md:text-xl font-light leading-relaxed mb-10 max-w-lg drop-shadow-sm">
                  {{ slide.subtitle }}
                </p>

                <NuxtLink
                  :to="slideTo(slide.buttonHref)"
                  class="group inline-flex items-center gap-3 px-8 py-4 bg-white text-stone-900 font-medium rounded-full hover:bg-brand-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  {{ slide.buttonText || storefrontContent.home.cta.shopNow }}
                  <Icon name="lucide:arrow-right" class="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </NuxtLink>
             </div>
        </div>
      </div>

      <!-- Navigation Sprinkles -->
      <div v-if="hasMultipleSlides" class="absolute bottom-10 right-10 z-20 flex space-x-3">
        <button 
          v-for="(slide, index) in heroSlides" 
          :key="index" 
          class="h-2 rounded-full transition-all duration-300 backdrop-blur-md"
          :class="index === currentSlide ? 'bg-white w-12' : 'bg-white/30 w-3 hover:bg-white/60'"
          @click="currentSlide = index"
        />
      </div>
    </div>

    <!-- Categories Section (Organic Cards) -->
    <section v-if="sections.browseByCategory.enabled" class="py-20 bg-stone-100">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-12">
            <h2 class="font-wellness text-3xl md:text-4xl text-stone-900 mb-3">{{ sections.browseByCategory.title }}</h2>
            <p class="text-stone-500 font-light">{{ sections.browseByCategory.eyebrow }}</p>
        </div>
         
        <div class="relative w-full">
           <!-- Scroll Controls -->
           <div class="flex justify-end gap-2 mb-4 md:hidden">
              <!-- Mobile arrows if needed, usually hiding scrollbar is enough -->
           </div>

           <div
             class="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-8 px-4 md:justify-center scrollbar-hide"
           >
             <NuxtLink 
               v-for="(cat) in categories" 
               :key="cat.slug" 
               :to="`/c/${cat.slug}`"
               class="snap-center flex-shrink-0 w-64 h-80 rounded-[4rem] relative overflow-hidden group hover:shadow-2xl transition-all duration-500"
             >
                <img
                  v-if="cat.imageUrl"
                  :src="cat.imageUrl"
                  :alt="categoryDisplayTitle(cat)"
                  class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                >
                <div v-else class="w-full h-full bg-stone-200" />
                
                <!-- Overlay -->
                <div class="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />

                <!-- Label -->
                <div class="absolute inset-x-0 bottom-0 p-6 text-center">
                    <div class="bg-white/95 backdrop-blur px-6 py-4 rounded-3xl shadow-lg">
                        <h3 class="font-wellness text-xl text-stone-900">{{ categoryDisplayTitle(cat) }}</h3>
                        <p class="text-xs text-stone-500 mt-1 uppercase tracking-wider">{{ storefrontContent.common.productsCount(cat.itemCount) }}</p>
                    </div>
                </div>
             </NuxtLink>
           </div>
        </div>
      </div>
    </section>

    <!-- Featured Products (Clean Grid/Slide) -->
    <section v-if="sections.newArrivals.enabled" class="py-24 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
          <div class="max-w-xl">
             <span class="text-brand-700 text-sm font-bold uppercase tracking-widest mb-2 block">{{ t('storefront.templates.wellness.home.curatedSelection') }}</span>
             <h2 class="font-wellness text-3xl md:text-4xl text-stone-900 leading-tight">
               {{ sections.newArrivals.title }}
             </h2>
          </div>
          
          <NuxtLink
            to="/products"
            class="hidden md:inline-flex items-center gap-2 text-stone-500 hover:text-brand-700 transition-colors border-b border-transparent hover:border-brand-700 pb-0.5"
          >
            {{ t('storefront.templates.wellness.home.shopCollection') }} <Icon name="lucide:arrow-right" class="w-4 h-4" />
          </NuxtLink>
        </div>

        <!-- Horizontal Scrolling Container -->
        <div
          ref="featuredScrollContainer"
          class="flex gap-8 overflow-x-auto pb-12 scrollbar-hide"
          @mouseenter="isHoveringFeatured = true"
          @mouseleave="isHoveringFeatured = false"
        >
          <div
            v-for="(product, index) in featuredInfiniteList"
            :key="`${product.id}-${index}`"
            class="flex-shrink-0 w-[calc(50%-1rem)] sm:w-72 md:w-80"
          >
            <ProductCard :product="product" />
          </div>
        </div>
            
        <div class="mt-8 text-center md:hidden">
          <NuxtLink
            to="/products"
            class="btn-outline"
          >
            View all products
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Best Sellers (Darker Warm Background) -->
    <section v-if="sections.bestSellers.enabled" class="py-24 bg-[#EBEBE8]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
           <span class="w-12 h-1 bg-brand-700 block mx-auto mb-6 rounded-full" />
           <h2 class="font-wellness text-3xl md:text-5xl text-stone-900 mb-6">
              {{ sections.bestSellers.title }}
            </h2>
            <p class="text-stone-600 max-w-2xl mx-auto text-lg font-light leading-relaxed">
               {{ sections.bestSellers.eyebrow || 'Our most loved remedies and rituals, chosen by you.' }}
            </p>
        </div>

        <div v-if="bestSellersDisplayed.length === 0" class="text-center text-stone-500 py-12">
          Coming soon.
        </div>

        <div v-else 
          ref="bestSellersScrollContainer"
          class="flex gap-8 overflow-x-auto pb-12 scrollbar-hide"
          @mouseenter="isHoveringBestSellers = true"
          @mouseleave="isHoveringBestSellers = false"
        >
          <div
            v-for="(product, index) in bestSellersInfiniteList"
            :key="`${product.id}-${index}`"
            class="flex-shrink-0 w-[calc(50%-1rem)] sm:w-72 md:w-80"
          >
            <ProductCard :product="product" />
           </div>
        </div>
      </div>
    </section>
  </div>
</template>
