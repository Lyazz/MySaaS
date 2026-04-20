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
const pauseSlideAutoplay = () => { clearInterval(slideInterval) }
const resumeSlideAutoplay = () => { clearInterval(slideInterval); slideInterval = setInterval(nextSlide, 6000) }

const { scrollContainer: featuredScrollContainer, infiniteList: featuredInfiniteList, isHovering: isHoveringFeatured } = useAutoScroll(computed(() => props.featuredProducts || []))
const { scrollContainer: bestSellersScrollContainer, infiniteList: bestSellersInfiniteList, isHovering: isHoveringBestSellers } = useAutoScroll(bestSellersDisplayed)

onMounted(() => { slideInterval = setInterval(nextSlide, 6000) })
onUnmounted(() => { clearInterval(slideInterval) })

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: categoriesData } = await useFetch<any[]>(categoriesUrl, { headers: useTenantApiHeaders() })

const catBgColors = ['bg-amber-100', 'bg-violet-100', 'bg-pink-100', 'bg-emerald-100', 'bg-sky-100', 'bg-orange-100']
const catBorderColors = ['border-amber-300', 'border-violet-300', 'border-pink-300', 'border-emerald-300', 'border-sky-300', 'border-orange-300']

const categories = computed(() => {
    if (!categoriesData.value) return []
    return categoriesData.value.map((cat, index) => ({
        ...cat,
        itemCount: cat._count?.products || 0,
        bgClass: catBgColors[index % catBgColors.length],
        borderClass: catBorderColors[index % catBorderColors.length],
    }))
})
</script>

<template>
  <div class="bg-[#fffbf0] min-h-screen pb-24" style="font-family: 'DM Sans', sans-serif">

    <!-- Hero: Diagonal Split -->
    <div
      class="relative w-full h-[480px] md:h-[560px] lg:h-[640px] overflow-hidden"
      @touchstart.passive="pauseSlideAutoplay"
      @touchend.passive="resumeSlideAutoplay"
    >
      <div
        v-for="(slide, index) in heroSlides"
        :key="index"
        class="absolute inset-0 transition-opacity duration-1000 ease-in-out"
        :class="index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'"
      >
        <!-- Right: full image -->
        <img :src="slide.imageUrl" class="absolute inset-0 w-full h-full object-cover" :alt="slide.title">

        <!-- Left diagonal panel -->
        <div class="absolute inset-0" style="clip-path: polygon(0 0, 60% 0, 45% 100%, 0 100%)">
          <div class="w-full h-full bg-violet-700" />
        </div>
        <!-- Soft edge blend -->
        <div class="absolute inset-0 bg-gradient-to-r from-violet-700/80 via-violet-700/20 to-transparent" style="clip-path: polygon(0 0, 70% 0, 55% 100%, 0 100%)" />

        <!-- Text content -->
        <div class="absolute inset-0 flex items-center">
          <div class="max-w-7xl mx-auto px-6 md:px-12 w-full">
            <div
              class="max-w-sm md:max-w-lg text-white transform transition-all duration-1000 delay-300"
              :class="index === currentSlide ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0'"
            >
              <!-- Badge -->
              <span class="inline-block px-4 py-1.5 bg-amber-400 text-amber-900 rounded-full text-xs font-black mb-5 border-2 border-amber-300 shadow-[0_3px_0_0_#d97706] -rotate-1">
                {{ storefrontContent.home.welcomeTo(tenantName) }}
              </span>
              <h2 class="text-4xl md:text-5xl lg:text-6xl font-black mb-5 leading-tight tracking-tight drop-shadow-sm" style="font-family: 'Fredoka', sans-serif">
                {{ slide.title }}
              </h2>
              <p class="text-base md:text-lg mb-8 text-violet-100 max-w-md leading-relaxed font-medium line-clamp-2">
                {{ slide.subtitle }}
              </p>
              <NuxtLink
                :to="slideTo(slide.buttonHref)"
                class="group inline-flex items-center gap-3 px-8 py-4 bg-amber-400 text-amber-900 font-black rounded-full border-2 border-amber-300 shadow-[0_5px_0_0_#d97706] hover:-translate-y-1 hover:bg-amber-300 active:translate-y-1 active:shadow-none transition-all text-base"
              >
                {{ slide.buttonText || storefrontContent.home.cta.shopNow }}
                <Icon name="lucide:arrow-right" class="w-5 h-5 group-hover:translate-x-1 transition-transform stroke-[3]" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Arrows -->
      <div v-if="hasMultipleSlides" class="hidden md:flex absolute bottom-8 right-8 z-20 gap-3">
        <button
          class="w-11 h-11 rounded-full bg-white/90 border-2 border-violet-200 flex items-center justify-center text-violet-700 hover:-translate-y-0.5 shadow-[0_3px_0_0_#ddd6fe] active:translate-y-0.5 active:shadow-none transition-all"
          @click="prevSlide"
        ><Icon name="lucide:chevron-left" class="w-5 h-5 stroke-[2.5]" /></button>
        <button
          class="w-11 h-11 rounded-full bg-white/90 border-2 border-violet-200 flex items-center justify-center text-violet-700 hover:-translate-y-0.5 shadow-[0_3px_0_0_#ddd6fe] active:translate-y-0.5 active:shadow-none transition-all"
          @click="nextSlide"
        ><Icon name="lucide:chevron-right" class="w-5 h-5 stroke-[2.5]" /></button>
      </div>

      <!-- Dots -->
      <div v-if="hasMultipleSlides" class="absolute bottom-8 left-8 z-20 flex gap-2">
        <button
          v-for="(_, index) in heroSlides"
          :key="index"
          class="h-2 rounded-full transition-all duration-300"
          :class="index === currentSlide ? 'bg-amber-400 w-8 shadow-sm' : 'bg-white/50 w-3 hover:bg-white/80'"
          @click="currentSlide = index"
        />
      </div>
    </div>

    <!-- Categories -->
    <section v-if="sections.browseByCategory.enabled" class="py-12 md:py-16 bg-[#fffbf0]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-10 flex items-end justify-between">
          <div>
            <p class="text-xs font-black text-violet-500 tracking-widest uppercase mb-2" style="font-family: 'Fredoka', sans-serif">
              {{ sections.browseByCategory.eyebrow }}
            </p>
            <h2 class="text-3xl md:text-4xl font-black text-stone-900" style="font-family: 'Fredoka', sans-serif">
              {{ sections.browseByCategory.title }}
            </h2>
          </div>
          <div class="hidden md:flex gap-2">
            <button
              class="w-10 h-10 rounded-full bg-white border-2 border-violet-200 flex items-center justify-center text-violet-600 hover:-translate-y-0.5 shadow-[0_3px_0_0_#ddd6fe] active:translate-y-0.5 active:shadow-none transition-all"
              onclick="document.getElementById('cat-scroll-p').scrollBy({left: -340, behavior: 'smooth'})"
            ><Icon name="lucide:chevron-left" class="w-4 h-4 stroke-[2.5]" /></button>
            <button
              class="w-10 h-10 rounded-full bg-white border-2 border-violet-200 flex items-center justify-center text-violet-600 hover:-translate-y-0.5 shadow-[0_3px_0_0_#ddd6fe] active:translate-y-0.5 active:shadow-none transition-all"
              onclick="document.getElementById('cat-scroll-p').scrollBy({left: 340, behavior: 'smooth'})"
            ><Icon name="lucide:chevron-right" class="w-4 h-4 stroke-[2.5]" /></button>
          </div>
        </div>

        <div id="cat-scroll-p" class="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-6 scrollbar-hide">
          <NuxtLink
            v-for="(cat) in categories"
            :key="cat.slug"
            :to="`/c/${cat.slug}`"
            class="snap-start flex-shrink-0 w-44 md:w-56 group"
          >
            <div
              class="relative rounded-3xl overflow-hidden border-3 hover:-translate-y-2 transition-all duration-300"
              :class="[cat.bgClass, cat.borderClass]"
              style="aspect-ratio: 3/4; box-shadow: 0 5px 0 0 rgba(0,0,0,0.1)"
            >
              <!-- Image -->
              <img
                v-if="cat.imageUrl"
                :src="cat.imageUrl"
                :alt="categoryDisplayTitle(cat)"
                class="w-full h-full object-cover opacity-80 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
              >
              <div v-else class="w-full h-full flex items-center justify-center">
                <Icon name="lucide:image" class="w-12 h-12 text-stone-300" />
              </div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

              <!-- Floating sticker label at top (not bottom — avoids overflow clipping) -->
              <div class="absolute top-3 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full border-2 border-violet-200 shadow-[0_3px_0_0_rgba(0,0,0,0.1)] whitespace-nowrap z-10">
                <p class="text-xs font-black text-stone-800" style="font-family: 'Fredoka', sans-serif">{{ categoryDisplayTitle(cat) }}</p>
              </div>

              <!-- Count badge at bottom -->
              <div class="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full z-10">
                <span class="text-[10px] font-black text-violet-600">{{ storefrontContent.common.productsCount(cat.itemCount) }}</span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section v-if="sections.newArrivals.enabled" class="py-12 md:py-16 bg-white border-t-4 border-dashed border-violet-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-10 text-center">
          <p class="text-xs font-black text-violet-500 tracking-widest uppercase mb-2" style="font-family: 'Fredoka', sans-serif">
            {{ sections.newArrivals.eyebrow }}
          </p>
          <h2 class="text-3xl md:text-4xl font-black text-stone-900" style="font-family: 'Fredoka', sans-serif">
            {{ sections.newArrivals.title }}
          </h2>
        </div>

        <!-- Skeleton -->
        <div v-if="pending" class="flex gap-6 overflow-x-hidden pb-4">
          <div v-for="i in 4" :key="i" class="flex-shrink-0 w-[calc(50%-0.75rem)] sm:w-60 md:w-64 animate-pulse">
            <div class="bg-violet-50 rounded-3xl h-72 mb-3 border-2 border-violet-100" />
            <div class="h-3 bg-violet-50 rounded-full w-3/4 mb-2" />
            <div class="h-3 bg-violet-50 rounded-full w-1/3" />
          </div>
        </div>

        <!-- Scroll container with stagger tilt -->
        <div
          v-else
          ref="featuredScrollContainer"
          class="flex gap-5 overflow-x-scroll pb-6 scrollbar-hide pt-4"
          style="scroll-behavior: auto;"
          @mouseenter="isHoveringFeatured = true"
          @mouseleave="isHoveringFeatured = false"
        >
          <div
            v-for="(product, index) in featuredInfiniteList"
            :key="`${product.id}-${index}`"
            class="flex-shrink-0 w-[calc(50%-0.625rem)] sm:w-56 md:w-64 transition-transform duration-300"
            :style="{ marginTop: index % 2 === 0 ? '0px' : '24px', transform: `rotate(${index % 2 === 0 ? '0.8deg' : '-0.8deg'})` }"
          >
            <ProductCard :product="product" />
          </div>
        </div>

        <div class="mt-10 text-center">
          <NuxtLink
            to="/products"
            class="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-violet-600 text-white font-black border-2 border-violet-500 shadow-[0_5px_0_0_#4c1d95] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all"
          >
            {{ storefrontContent.home.cta.viewAll || 'View all products' }}
            <Icon name="lucide:arrow-right" class="w-4 h-4 stroke-[3]" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Best Sellers -->
    <section v-if="sections.bestSellers.enabled" class="py-12 md:py-16 bg-[#fffbf0] border-t-4 border-dashed border-violet-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-end justify-between mb-10">
          <div>
            <p class="text-xs font-black text-violet-500 tracking-widest uppercase mb-2" style="font-family: 'Fredoka', sans-serif">
              {{ sections.bestSellers.eyebrow }}
            </p>
            <h2 class="text-3xl md:text-4xl font-black text-stone-900" style="font-family: 'Fredoka', sans-serif">
              {{ sections.bestSellers.title }}
            </h2>
          </div>
          <NuxtLink
            to="/products"
            class="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border-2 border-violet-200 text-violet-700 font-black text-sm shadow-[0_3px_0_0_#ddd6fe] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          >
            {{ storefrontContent.home.cta.viewAll || 'View all' }}
            <Icon name="lucide:arrow-right" class="w-4 h-4 stroke-[3]" />
          </NuxtLink>
        </div>

        <div v-if="bestSellersDisplayed.length === 0" class="text-sm text-stone-500 font-medium py-8 text-center">
          No best sellers yet.
        </div>

        <div
          v-else
          ref="bestSellersScrollContainer"
          class="flex gap-5 overflow-x-scroll pb-6 scrollbar-hide pt-4"
          style="scroll-behavior: auto;"
          @mouseenter="isHoveringBestSellers = true"
          @mouseleave="isHoveringBestSellers = false"
        >
          <div
            v-for="(product, index) in bestSellersInfiniteList"
            :key="`${product.id}-${index}`"
            class="flex-shrink-0 w-[calc(50%-0.625rem)] sm:w-56 md:w-64 transition-transform duration-300"
            :style="{ marginTop: index % 2 === 1 ? '0px' : '24px', transform: `rotate(${index % 2 === 1 ? '0.8deg' : '-0.8deg'})` }"
          >
            <ProductCard :product="product" />
          </div>
        </div>

        <div class="mt-8 text-center sm:hidden">
          <NuxtLink
            to="/products"
            class="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-violet-600 text-white font-black border-2 border-violet-500 shadow-[0_5px_0_0_#4c1d95] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all w-full justify-center"
          >
            {{ storefrontContent.home.cta.viewAll || 'View all' }}
            <Icon name="lucide:arrow-right" class="w-4 h-4 stroke-[3]" />
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
