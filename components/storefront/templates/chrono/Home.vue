<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import ProductCard from '~/components/storefront/templates/chrono/ProductCard.vue'
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

let slideInterval: any
const pauseSlideAutoplay = () => {
    clearInterval(slideInterval)
}
const resumeSlideAutoplay = () => {
    clearInterval(slideInterval)
    slideInterval = setInterval(nextSlide, 6000)
}


const { 
  scrollContainer: featuredScrollContainer, 
  infiniteList: featuredInfiniteList, 
  isHovering: isHoveringFeatured 
} = useAutoScroll(computed(() => props.featuredProducts || []))

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

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: categoriesData } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders()
})

const categories = computed(() => {
    if (!categoriesData.value) return []
    return categoriesData.value.map((cat) => ({
        ...cat,
        itemCount: cat._count?.products || 0,
    }))
})

const displayedProducts = computed(() => {
    if (props.featuredProducts && props.featuredProducts.length > 0) {
        return props.featuredProducts
    }
    return [] 
})
</script>

<template>
  <div class="min-h-screen pb-24" style="background-color: #0E1117; font-family: 'Cormorant Garamond', serif;">
    <!-- Hero Slider -->
    <div class="relative w-full h-[450px] md:h-[560px] lg:h-[720px] overflow-hidden"
      @touchstart.passive="pauseSlideAutoplay"
      @touchend.passive="resumeSlideAutoplay"
    >
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
        <!-- Elegant gradient overlay — deep navy tint, not pitch black -->
        <div class="absolute inset-0 flex items-center" style="background: linear-gradient(to right, rgba(8,11,18,0.92) 0%, rgba(8,11,18,0.65) 55%, rgba(8,11,18,0.2) 100%);">
          <div class="max-w-7xl mx-auto px-6 w-full">
            <div
              class="max-w-2xl transform transition-all duration-1000 delay-300" 
              :class="index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'"
            >
              <!-- Eyebrow with a fine copper line -->
              <div class="flex items-center gap-4 mb-7">
                <div class="w-10 h-px" style="background-color: #A67C52;"></div>
                <span class="text-xs font-medium tracking-[0.35em] uppercase" style="color: #A67C52;">{{ storefrontContent.home.welcomeTo(tenantName) }}</span>
              </div>
              <h2 class="text-4xl md:text-5xl lg:text-6xl font-light mb-5 leading-tight tracking-wide" style="color: #E8E0D5;">
                {{ slide.title }}
              </h2>
              <p class="text-base md:text-lg mb-8 leading-relaxed line-clamp-2 md:line-clamp-none" style="color: #7A7060;">
                {{ slide.subtitle }}
              </p>
              <NuxtLink
                :to="slideTo(slide.buttonHref)"
                class="group inline-flex items-center gap-4 px-10 py-4 text-sm font-medium tracking-[0.2em] uppercase transition-all duration-300"
                style="background-color: #A67C52; color: #fff; border-radius: 1px;"
              >
                {{ slide.buttonText || storefrontContent.home.cta.shopNow }}
                <Icon name="lucide:arrow-right" class="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Slide controls -->
      <div v-if="hasMultipleSlides" class="hidden md:flex absolute bottom-8 end-8 z-20 gap-3">
        <button
          class="w-11 h-11 border flex items-center justify-center transition-all duration-200"
          style="border-color: rgba(212,197,169,0.25); color: #D4C5A9; border-radius: 1px;"
          @click="prevSlide"
        >
          <Icon name="lucide:chevron-left" class="w-4 h-4" />
        </button>
        <button
          class="w-11 h-11 border flex items-center justify-center transition-all duration-200"
          style="border-color: rgba(212,197,169,0.25); color: #D4C5A9; border-radius: 1px;"
          @click="nextSlide"
        >
          <Icon name="lucide:chevron-right" class="w-4 h-4" />
        </button>
      </div>

      <!-- Progress dots -->
      <div v-if="hasMultipleSlides" class="absolute bottom-7 start-7 z-20 flex gap-2">
        <button 
          v-for="(slide, index) in heroSlides" 
          :key="index" 
          class="h-px transition-all duration-400"
          :style="index === currentSlide ? 'background-color:#A67C52;width:36px;' : 'background-color:rgba(212,197,169,0.25);width:16px;'"
          @click="currentSlide = index"
        />
      </div>
    </div>

    <!-- Brand value strip -->
    <div class="py-4 border-y" style="background-color: #1A1F2E; border-color: rgba(212,197,169,0.08);">
      <div class="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 md:gap-16">
        <div class="flex items-center gap-3 text-xs tracking-[0.2em] uppercase" style="color: #7A7060;">
          <Icon name="lucide:shield-check" class="w-4 h-4" style="color: #A67C52;" />
          <span>Authenticity Guaranteed</span>
        </div>
        <div class="flex items-center gap-3 text-xs tracking-[0.2em] uppercase" style="color: #7A7060;">
          <Icon name="lucide:truck" class="w-4 h-4" style="color: #A67C52;" />
          <span>Free Worldwide Shipping</span>
        </div>
        <div class="flex items-center gap-3 text-xs tracking-[0.2em] uppercase" style="color: #7A7060;">
          <Icon name="lucide:refresh-cw" class="w-4 h-4" style="color: #A67C52;" />
          <span>30-Day Returns</span>
        </div>
        <div class="flex items-center gap-3 text-xs tracking-[0.2em] uppercase" style="color: #7A7060;">
          <Icon name="lucide:award" class="w-4 h-4" style="color: #A67C52;" />
          <span>2-Year Warranty</span>
        </div>
      </div>
    </div>

    <!-- Categories Section -->
    <section v-if="sections.browseByCategory.enabled" class="py-16 md:py-24" style="background-color: #0B0E16;">
      <div class="mb-10 md:mb-14 px-6 max-w-7xl mx-auto flex items-end justify-between">
        <div>
          <div class="flex items-center gap-4 mb-4">
            <div class="w-8 h-px" style="background-color: #A67C52;"></div>
            <p class="text-xs font-medium tracking-[0.35em] uppercase" style="color: #A67C52;">
              {{ sections.browseByCategory.eyebrow }}
            </p>
          </div>
          <h2 class="text-2xl md:text-3xl font-light tracking-wide" style="color: #E8E0D5;">
            {{ sections.browseByCategory.title }}
          </h2>
        </div>
         
        <div class="hidden md:flex gap-3">
          <button
            class="w-10 h-10 border flex items-center justify-center transition-colors"
            style="border-color: rgba(212,197,169,0.15); color: #7A7060; border-radius: 1px;"
            onclick="document.getElementById('cat-scroll').scrollBy({left: -350, behavior: 'smooth'})"
          >
            <Icon name="lucide:chevron-left" class="w-4 h-4" />
          </button>
          <button
            class="w-10 h-10 border flex items-center justify-center transition-colors"
            style="border-color: rgba(212,197,169,0.15); color: #7A7060; border-radius: 1px;"
            onclick="document.getElementById('cat-scroll').scrollBy({left: 350, behavior: 'smooth'})"
          >
            <Icon name="lucide:chevron-right" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="relative w-full">
        <div
          id="cat-scroll"
          class="flex gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory pb-8 px-4 md:px-6 max-w-7xl mx-auto scrollbar-hide"
        >
          <NuxtLink 
            v-for="(cat) in categories" 
            :key="cat.slug" 
            :to="`/category/${cat.slug}`"
            class="snap-start flex-shrink-0 w-52 h-72 md:w-72 md:h-96 flex flex-col justify-end items-start relative overflow-hidden group border"
            style="border-radius: 2px; border-color: rgba(212,197,169,0.08);"
          >
            <!-- Background Image -->
            <div class="absolute inset-0">
              <img
                v-if="cat.imageUrl"
                :src="cat.imageUrl"
                :alt="categoryDisplayTitle(cat)"
                class="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                style="opacity: 0.55;"
              >
              <div
                v-else
                class="w-full h-full"
                style="background: linear-gradient(135deg, #1A1F2E 0%, #0B0E16 100%);"
              />
              <div class="absolute inset-0" style="background: linear-gradient(to top, rgba(8,11,18,0.9) 0%, rgba(8,11,18,0.3) 60%, transparent 100%);" />
            </div>

            <div class="z-10 relative p-6 transform transition-transform duration-300 group-hover:-translate-y-2">
              <h3 class="text-xl md:text-2xl font-light mb-1 transition-colors tracking-wide" style="color: #E8E0D5;">
                {{ categoryDisplayTitle(cat) }}
              </h3>
              <p class="text-sm flex items-center gap-3" style="color: #7A7060;">
                {{ storefrontContent.common.productsCount(cat.itemCount) }}
                <span class="h-px w-0 group-hover:w-8 transition-all duration-300" style="background-color: #A67C52;" />
              </p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section v-if="sections.newArrivals.enabled" class="py-16 md:py-24" style="background-color: #0E1117;">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-end justify-between mb-10 md:mb-14">
          <div>
            <div class="flex items-center gap-4 mb-4">
              <div class="w-8 h-px" style="background-color: #A67C52;"></div>
              <p class="text-xs font-medium tracking-[0.35em] uppercase" style="color: #A67C52;">
                {{ sections.newArrivals.eyebrow }}
              </p>
            </div>
            <h2 class="text-2xl md:text-3xl font-light tracking-wide" style="color: #E8E0D5;">
              {{ sections.newArrivals.title }}
            </h2>
          </div>
          <NuxtLink
            to="/products"
            class="hidden md:inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase transition-colors"
            style="color: #7A7060;"
          >
            View all
            <Icon name="lucide:arrow-right" class="w-3.5 h-3.5" />
          </NuxtLink>
        </div>

        <!-- Skeleton Loading -->
        <div v-if="pending" class="flex gap-6 overflow-x-scroll pb-8 scrollbar-hide">
          <div v-for="i in 4" :key="i" class="flex-shrink-0 w-[calc(50%-0.75rem)] sm:w-64 md:w-72 animate-pulse">
            <div class="h-80 mb-4 rounded-sm" style="background-color: #1A1F2E;" />
            <div class="h-3 w-3/4 mb-2 rounded-sm" style="background-color: #1A1F2E;" />
            <div class="h-3 w-1/3 rounded-sm" style="background-color: #1A1F2E;" />
          </div>
        </div>

        <!-- Horizontal Scroll -->
        <div
          v-else
          ref="featuredScrollContainer"
          class="flex gap-5 overflow-x-scroll pb-8 scrollbar-hide"
          style="scroll-behavior: auto;"
          @mouseenter="isHoveringFeatured = true"
          @mouseleave="isHoveringFeatured = false"
        >
          <div
            v-for="(product, index) in featuredInfiniteList"
            :key="`${product.id}-${index}`"
            class="flex-shrink-0 w-[calc(50%-0.625rem)] sm:w-[272px]"
          >
            <ProductCard :product="product" />
          </div>
        </div>
          
        <div class="mt-10 text-center">
          <NuxtLink
            to="/products"
            class="inline-flex items-center gap-3 px-10 py-3.5 border text-sm font-medium tracking-[0.2em] uppercase transition-all duration-200"
            style="border-color: rgba(166,124,82,0.35); color: #A67C52; border-radius: 1px;"
          >
            Explore Collection
            <Icon name="lucide:arrow-right" class="w-4 h-4" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Best Sellers -->
    <section v-if="sections.bestSellers.enabled" class="py-16 md:py-24" style="background-color: #0B0E16;">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-end justify-between mb-10 md:mb-14">
          <div>
            <div class="flex items-center gap-4 mb-4">
              <div class="w-8 h-px" style="background-color: #A67C52;"></div>
              <p class="text-xs font-medium tracking-[0.35em] uppercase" style="color: #A67C52;">
                {{ sections.bestSellers.eyebrow }}
              </p>
            </div>
            <h2 class="text-2xl md:text-3xl font-light tracking-wide" style="color: #E8E0D5;">
              {{ sections.bestSellers.title }}
            </h2>
          </div>
          <NuxtLink
            to="/products"
            class="hidden sm:inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase transition-colors"
            style="color: #7A7060;"
          >
            View all
            <Icon name="lucide:arrow-right" class="w-3.5 h-3.5" />
          </NuxtLink>
        </div>

        <div v-if="bestSellersDisplayed.length === 0" class="text-sm" style="color: #4A4540;">
          No best sellers yet.
        </div>

        <div v-else 
          ref="bestSellersScrollContainer"
          class="flex gap-5 overflow-x-scroll pb-8 scrollbar-hide"
          style="scroll-behavior: auto;"
          @mouseenter="isHoveringBestSellers = true"
          @mouseleave="isHoveringBestSellers = false"
        >
          <div
            v-for="(product, index) in bestSellersInfiniteList"
            :key="`${product.id}-${index}`"
            class="flex-shrink-0 w-[calc(50%-0.625rem)] sm:w-[272px]"
          >
            <ProductCard :product="product" />
           </div>
        </div>

        <div class="mt-10 text-center sm:hidden">
          <NuxtLink
            to="/products"
            class="inline-flex items-center gap-3 px-10 py-3.5 border text-sm font-medium tracking-[0.2em] uppercase"
            style="border-color: rgba(166,124,82,0.35); color: #A67C52; border-radius: 1px;"
          >
            View all &rarr;
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
