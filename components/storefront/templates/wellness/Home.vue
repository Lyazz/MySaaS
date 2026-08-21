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

const categories = computed(() =>
    (categoriesData.value || []).map((cat) => ({
        ...cat,
        itemCount: cat._count?.products || 0
    }))
)
</script>

<template>
  <div class="bg-wl-paper min-h-screen font-wellness text-wl-ink">
    <!-- Hero: a paper label applied over the tenant's image -->
    <div class="relative w-full h-[560px] md:h-[680px] overflow-hidden bg-wl-card"
      @touchstart.passive="pauseSlideAutoplay"
      @touchend.passive="resumeSlideAutoplay"
    >
      <!-- Slides -->
      <div
        v-for="(slide, index) in heroSlides"
        :key="index"
        class="absolute inset-0 transition-opacity duration-700 ease-in-out"
        :class="index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'"
      >
        <img
          :src="slide.imageUrl"
          class="w-full h-full object-cover"
          :alt="slide.title"
        >
        <!-- Content sits on its own stock, so contrast never depends on the photo -->
        <div class="absolute inset-0 flex items-end justify-start p-4 sm:p-8 md:p-14">
             <div
               class="max-w-md w-full wl-plate wl-plate-lg p-7 sm:p-9 text-start transition-all duration-700 delay-150"
               :class="index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'"
             >
                <span class="wl-eyebrow wl-label mb-5">{{ storefrontContent.home.welcomeTo(tenantName) }}</span>

                <h2 class="wl-display text-[2.25rem] sm:text-5xl text-wl-ink mb-5 leading-[0.98]">
                  {{ slide.title }}
                </h2>

                <p class="text-wl-muted text-base leading-relaxed mb-8">
                  {{ slide.subtitle }}
                </p>

                <NuxtLink
                  :to="slideTo(slide.buttonHref)"
                  class="wl-cta group/cta inline-flex items-center gap-3 px-8 py-4 wl-label"
                >
                  {{ slide.buttonText || storefrontContent.home.cta.shopNow }}
                  <Icon name="lucide:arrow-right" class="w-4 h-4 transition-transform group-hover/cta:translate-x-1" />
                </NuxtLink>
             </div>
        </div>
      </div>

      <!-- Slide index, on its own chip so it stays legible over any photo -->
      <div v-if="hasMultipleSlides" class="absolute bottom-6 end-4 sm:end-8 md:end-14 z-20 flex items-center gap-2.5 rtl:flex-row-reverse wl-plate px-3 py-2.5">
        <button
          v-for="(slide, index) in heroSlides"
          :key="index"
          class="h-0.5 transition-all duration-300"
          :class="index === currentSlide ? 'bg-wl-olive w-8' : 'bg-wl-ruleStrong w-4 hover:bg-wl-oliveSoft'"
          :aria-label="slide.title"
          :aria-current="index === currentSlide"
          @click="currentSlide = index"
        />
      </div>
    </div>

    <!-- Categories: specimen jars, each with its plate -->
    <section v-if="sections.browseByCategory.enabled" class="py-20 md:py-24 bg-wl-paper">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="wl-ruled wl-ruled--start mb-10">
            <h2 class="wl-display text-3xl md:text-[2.5rem] text-wl-ink leading-none flex-shrink-0">{{ sections.browseByCategory.title }}</h2>
            <p class="wl-label text-wl-muted flex-shrink-0">{{ sections.browseByCategory.eyebrow }}</p>
        </div>

        <div
          class="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 wl-scrollbar-hide"
        >
          <NuxtLink
            v-for="(cat) in categories"
            :key="cat.slug"
            :to="`/category/${cat.slug}`"
            class="snap-start flex-shrink-0 w-56 sm:w-64 group"
          >
            <div class="wl-specimen relative w-full h-72 overflow-hidden border border-wl-rule bg-wl-card">
              <img
                v-if="cat.imageUrl"
                :src="cat.imageUrl"
                :alt="categoryDisplayTitle(cat)"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              >
              <div v-else class="w-full h-full bg-wl-card" />
              <div class="absolute inset-0 bg-wl-zellige/10 group-hover:bg-wl-zellige/0 transition-colors duration-500" />
            </div>

            <!-- Plate -->
            <div class="flex items-baseline justify-between gap-3 border-t border-wl-rule pt-2.5 mt-3">
              <h3 class="wl-display-sm text-base text-wl-ink truncate">
                <span class="wl-underline">{{ categoryDisplayTitle(cat) }}</span>
              </h3>
              <p class="wl-label wl-num text-wl-oliveDeep flex-shrink-0">{{ storefrontContent.common.productsCount(cat.itemCount) }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Featured -->
    <section v-if="sections.newArrivals.enabled" class="py-20 md:py-24 wl-ground-linen border-t border-wl-rule">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-10">
          <span class="wl-eyebrow wl-label mb-3 max-w-full">{{ t('storefront.templates.wellness.home.curatedSelection') }}</span>
          <div class="wl-ruled wl-ruled--start wl-ruled--olive">
            <h2 class="wl-display text-3xl md:text-[2.5rem] text-wl-ink leading-none flex-shrink-0">
              {{ sections.newArrivals.title }}
            </h2>
            <NuxtLink
              to="/products"
              class="hidden md:inline-flex items-center gap-2 wl-label text-wl-oliveDeep flex-shrink-0 group/all"
            >
              <span class="wl-underline">{{ t('storefront.templates.wellness.home.shopCollection') }}</span>
              <Icon name="lucide:arrow-right" class="w-3.5 h-3.5 transition-transform group-hover/all:translate-x-1" />
            </NuxtLink>
          </div>
        </div>

        <!-- Horizontal Scrolling Container -->
        <div
          ref="featuredScrollContainer"
          class="flex gap-6 overflow-x-auto pb-4 wl-scrollbar-hide"
          @mouseenter="isHoveringFeatured = true"
          @mouseleave="isHoveringFeatured = false"
        >
          <div
            v-for="(product, index) in featuredInfiniteList"
            :key="`${product.id}-${index}`"
            class="flex-shrink-0 w-[calc(60%-0.75rem)] sm:w-64 md:w-72"
          >
            <ProductCard :product="product" />
          </div>
        </div>

        <div class="mt-10 md:hidden">
          <NuxtLink
            to="/products"
            class="wl-cta-ghost w-full inline-flex items-center justify-center px-8 py-4 wl-label"
          >
            View all products
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Best Sellers -->
    <section v-if="sections.bestSellers.enabled" class="py-20 md:py-24 wl-ground-tint border-t border-wl-rule">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-10">
          <div class="wl-ruled wl-ruled--start wl-ruled--olive mb-4">
            <h2 class="wl-display text-3xl md:text-[2.5rem] text-wl-ink leading-none flex-shrink-0">
              {{ sections.bestSellers.title }}
            </h2>
          </div>
          <p class="text-wl-muted max-w-xl leading-relaxed">
             {{ sections.bestSellers.eyebrow || 'Our most loved remedies and rituals, chosen by you.' }}
          </p>
        </div>

        <div v-if="bestSellersDisplayed.length === 0" class="wl-plate py-16 text-center wl-label text-wl-muted">
          Coming soon.
        </div>

        <div v-else
          ref="bestSellersScrollContainer"
          class="flex gap-6 overflow-x-auto pb-4 wl-scrollbar-hide"
          @mouseenter="isHoveringBestSellers = true"
          @mouseleave="isHoveringBestSellers = false"
        >
          <div
            v-for="(product, index) in bestSellersInfiniteList"
            :key="`${product.id}-${index}`"
            class="flex-shrink-0 w-[calc(60%-0.75rem)] sm:w-64 md:w-72"
          >
            <ProductCard :product="product" />
           </div>
        </div>
      </div>
    </section>
  </div>
</template>
