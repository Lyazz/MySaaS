<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import ProductCard from '~/components/storefront/templates/arena/ProductCard.vue'
import { isDefaultStorefrontHomeConfig, type StorefrontHomeConfig } from '~/shared/storefront/homepage'
import CategoryPlaceholder from '~/components/storefront/CategoryPlaceholder.vue'

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
  <div class="bg-[#06080c] text-slate-300 min-h-screen">
    <!-- HERO: Logitech G style fullscreen with cyan accents and angular HUD -->
    <section
      class="relative overflow-hidden bg-black"
      @touchstart.passive="pauseSlideAutoplay"
      @touchend.passive="resumeSlideAutoplay"
    >
      <!-- Slides -->
      <div
        v-for="(slide, index) in heroSlides"
        :key="index"
        class="absolute inset-0 transition-opacity duration-1000"
        :class="index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'"
      >
        <img :src="slide.imageUrl" :alt="slide.title" class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,8,12,0.94)_0%,rgba(6,8,12,0.78)_42%,rgba(6,8,12,0.32)_100%)]" />
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_25%,rgba(0,184,252,0.22),transparent_45%)]" />
      </div>

      <!-- Diagonal cyan stripes (Logitech G HUD vibe) -->
      <div class="pointer-events-none absolute inset-y-0 end-0 w-1/3 z-20 hidden lg:block">
        <div class="absolute top-12 end-10 h-px w-40 bg-brand-500" />
        <div class="absolute top-16 end-10 h-px w-24 bg-brand-500/60" />
        <div class="absolute bottom-12 end-10 h-px w-32 bg-brand-500" />
        <div class="absolute bottom-16 end-10 h-px w-20 bg-brand-500/60" />
      </div>

      <div class="relative z-20 max-w-[1400px] mx-auto px-5 lg:px-10 min-h-[640px] lg:min-h-[760px] flex items-center py-20">
        <div class="max-w-3xl">
          <p class="flex items-center gap-3 mb-7">
            <span class="w-10 h-px bg-brand-500" />
            <span class="text-[10px] font-black uppercase tracking-[0.36em] text-brand-500">{{ storefrontContent.home.welcomeTo(tenantName) }}</span>
          </p>
          <h1 class="text-[2.75rem] sm:text-6xl lg:text-[6rem] font-black uppercase leading-[0.88] tracking-[-0.04em] text-white">
            {{ heroSlides[currentSlide]?.title }}
          </h1>
          <p class="mt-7 max-w-xl text-base lg:text-lg text-slate-300 leading-relaxed">
            {{ heroSlides[currentSlide]?.subtitle }}
          </p>
          <div class="mt-10 flex flex-wrap gap-3">
            <NuxtLink
              :to="slideTo(heroSlides[currentSlide]?.buttonHref)"
              class="group inline-flex items-center gap-2 bg-brand-500 text-[#02060a] font-black uppercase tracking-[0.18em] text-xs px-8 py-4 hover:bg-white transition-colors [clip-path:polygon(6%_0,100%_0,94%_100%,0_100%)]"
            >
              {{ heroSlides[currentSlide]?.buttonText || storefrontContent.home.cta.shopNow }}
              <Icon name="lucide:arrow-right" class="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Slide thumbnails / arrows -->
      <div v-if="hasMultipleSlides" class="relative z-20 max-w-[1400px] mx-auto px-5 lg:px-10 pb-8">
        <div class="flex items-center justify-between gap-6">
          <div class="flex gap-1.5">
            <button
              v-for="(slide, index) in heroSlides"
              :key="`dot-${index}`"
              type="button"
              class="h-[3px] transition-all"
              :class="index === currentSlide ? 'w-16 bg-brand-500' : 'w-8 bg-white/15 hover:bg-white/30'"
              @click="currentSlide = index"
            />
          </div>
          <div class="hidden md:flex gap-2">
            <button class="h-10 w-10 flex items-center justify-center border border-white/15 text-white hover:border-brand-500 hover:text-brand-500 transition-colors" @click="prevSlide">
              <Icon name="lucide:chevron-left" class="w-4 h-4" />
            </button>
            <button class="h-10 w-10 flex items-center justify-center border border-white/15 text-white hover:border-brand-500 hover:text-brand-500 transition-colors" @click="nextSlide">
              <Icon name="lucide:chevron-right" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- CATEGORIES: Logitech G dark grid with cyan-glow corners -->
    <section v-if="sections.browseByCategory.enabled" class="relative bg-[#06080c] py-20 lg:py-28">
      <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-40" />
      <div class="max-w-[1400px] mx-auto px-5 lg:px-10">
        <div class="flex items-end justify-between gap-6 mb-12">
          <div>
            <p class="flex items-center gap-3 mb-4">
              <span class="w-8 h-px bg-brand-500" />
              <span class="text-[10px] font-black uppercase tracking-[0.36em] text-brand-500">{{ sections.browseByCategory.eyebrow }}</span>
            </p>
            <h2 class="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-[-0.03em] text-white leading-[0.95]">
              {{ sections.browseByCategory.title }}
            </h2>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NuxtLink
            v-for="cat in categories"
            :key="cat.slug"
            :to="`/category/${cat.slug}`"
            class="group relative aspect-[4/5] overflow-hidden border border-white/[0.08] bg-[#0b0f14] hover:border-brand-500/50 transition-colors"
          >
            <div class="absolute inset-0">
              <img v-if="cat.imageUrl" :src="cat.imageUrl" :alt="categoryDisplayTitle(cat)" class="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700" />
              <CategoryPlaceholder v-else :title="categoryDisplayTitle(cat)" class="w-full h-full" />
              <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>

            <!-- Cyan corner brackets (HUD style) -->
            <span class="absolute top-3 start-3 w-4 h-4 border-t-2 border-s-2 border-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span class="absolute top-3 end-3 w-4 h-4 border-t-2 border-e-2 border-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span class="absolute bottom-3 start-3 w-4 h-4 border-b-2 border-s-2 border-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span class="absolute bottom-3 end-3 w-4 h-4 border-b-2 border-e-2 border-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div class="absolute inset-x-0 bottom-0 p-6 z-10">
              <h3 class="text-2xl font-black uppercase tracking-[-0.02em] text-white leading-tight">{{ categoryDisplayTitle(cat) }}</h3>
              <div class="mt-3 flex items-center gap-3 text-xs">
                <span class="font-bold uppercase tracking-[0.22em] text-slate-400">{{ storefrontContent.common.productsCount(cat.itemCount) }}</span>
                <span class="h-px w-8 bg-brand-500 group-hover:w-16 transition-all" />
                <Icon name="lucide:arrow-right" class="w-4 h-4 text-brand-500 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- FEATURED PRODUCTS: dark scroll rail -->
    <section v-if="sections.newArrivals.enabled" class="relative bg-black py-20 lg:py-28 border-y border-white/[0.06]">
      <div class="max-w-[1400px] mx-auto px-5 lg:px-10">
        <div class="flex items-end justify-between gap-6 mb-12">
          <div>
            <p class="flex items-center gap-3 mb-4">
              <span class="w-8 h-px bg-brand-500" />
              <span class="text-[10px] font-black uppercase tracking-[0.36em] text-brand-500">{{ sections.newArrivals.eyebrow }}</span>
            </p>
            <h2 class="text-3xl md:text-5xl font-black uppercase tracking-[-0.03em] text-white leading-[0.95]">
              {{ sections.newArrivals.title }}
            </h2>
          </div>
        </div>

        <div v-if="pending" class="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div v-for="i in 4" :key="i" class="animate-pulse">
            <div class="aspect-square bg-[#0b0f14] mb-4" />
            <div class="h-3 w-2/3 bg-[#0b0f14]" />
            <div class="mt-2 h-3 w-1/3 bg-[#0b0f14]" />
          </div>
        </div>

        <div
          v-else
          ref="featuredScrollContainer"
          class="flex gap-5 overflow-x-auto pb-4 scrollbar-hide"
          style="scroll-behavior: auto;"
          @mouseenter="isHoveringFeatured = true"
          @mouseleave="isHoveringFeatured = false"
        >
          <div
            v-for="(product, index) in featuredInfiniteList"
            :key="`${product.id}-${index}`"
            class="flex-shrink-0 w-[78vw] max-w-[320px] md:w-[300px]"
          >
            <ProductCard :product="product" />
          </div>
        </div>

        <div class="mt-10 flex justify-center md:hidden">
          <NuxtLink to="/products" class="inline-flex border border-white/15 px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-300 hover:border-brand-500 hover:text-brand-500 transition-colors">
            View all products →
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- BEST SELLERS: tighter grid -->
    <section v-if="sections.bestSellers.enabled" class="relative bg-[#06080c] py-20 lg:py-28">
      <div class="max-w-[1400px] mx-auto px-5 lg:px-10">
        <div class="flex items-end justify-between gap-6 mb-12">
          <div>
            <p class="flex items-center gap-3 mb-4">
              <span class="w-8 h-px bg-brand-500" />
              <span class="text-[10px] font-black uppercase tracking-[0.36em] text-brand-500">{{ sections.bestSellers.eyebrow }}</span>
            </p>
            <h2 class="text-3xl md:text-5xl font-black uppercase tracking-[-0.03em] text-white leading-[0.95]">
              {{ sections.bestSellers.title }}
            </h2>
          </div>
          <NuxtLink to="/products" class="hidden md:inline-flex border border-white/15 px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-300 hover:border-brand-500 hover:text-brand-500 transition-colors">
            View all products
          </NuxtLink>
        </div>

        <div v-if="bestSellersDisplayed.length === 0" class="text-sm text-slate-500">{{ storefrontContent.shop.results.noResults }}</div>

        <div
          v-else
          ref="bestSellersScrollContainer"
          class="grid gap-5 grid-cols-2 lg:grid-cols-4"
          @mouseenter="isHoveringBestSellers = true"
          @mouseleave="isHoveringBestSellers = false"
        >
          <ProductCard
            v-for="(product, index) in bestSellersInfiniteList.slice(0, 4)"
            :key="`${product.id}-${index}`"
            :product="product"
          />
        </div>
      </div>
    </section>
  </div>
</template>
