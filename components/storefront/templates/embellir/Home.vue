<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/embellir/ProductCard.vue'
import { isDefaultStorefrontHomeConfig, type StorefrontHomeConfig } from '~/shared/storefront/homepage'

const props = defineProps<{
  tenantName: string
  featuredProducts: any[]
  bestSellerProducts?: any[]
  homeConfig?: StorefrontHomeConfig
  pending: boolean
}>()

const storefrontContent = useStorefrontContent()
const { t } = useI18n({ useScope: 'global' })

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
const activeSlide = computed(() => heroSlides.value[currentSlide.value] ?? heroSlides.value[0])
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

const categories = computed(() => {
    if (!categoriesData.value) return []

    return categoriesData.value.map((cat) => ({
        ...cat,
        itemCount: cat._count?.products || 0
    }))
})
</script>

<template>
  <div class="bg-[#F2ECE1]">
    <!-- Hero: the glazed tile wall, with the slide set into it like a plate -->
    <section
      class="relative w-full bg-brand-600 text-[#F2ECE1] overflow-hidden"
      @touchstart.passive="pauseSlideAutoplay"
      @touchend.passive="resumeSlideAutoplay"
    >
      <div class="emb-zellige opacity-[0.11] absolute inset-0 pointer-events-none" />

      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div :key="currentSlide" class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center py-14 md:py-20 lg:py-24 lg:min-h-[600px]">
          <!-- Text Column -->
          <div class="lg:col-span-6 order-2 lg:order-1">
            <p class="emb-label text-[#DFA254] emb-rise" style="animation-delay: 0.05s">
              {{ storefrontContent.home.welcomeTo(tenantName) }}
            </p>
            <span class="block h-px w-20 bg-[#DFA254] my-6 emb-draw" style="animation-delay: 0.15s" />
            <h1
              class="emb-display text-[38px] leading-[1.05] sm:text-5xl lg:text-[62px] text-[#FDFAF4] emb-rise"
              style="animation-delay: 0.2s"
            >
              {{ activeSlide.title }}
            </h1>
            <p
              v-if="activeSlide.subtitle"
              class="mt-6 text-base md:text-lg text-[#F2ECE1]/70 max-w-md leading-relaxed emb-rise"
              style="animation-delay: 0.3s"
            >
              {{ activeSlide.subtitle }}
            </p>
            <NuxtLink
              :to="slideTo(activeSlide.buttonHref)"
              class="group/cta mt-9 inline-flex items-center gap-3 h-12 px-7 bg-[#DFA254] text-[#062622] emb-label hover:bg-[#FDFAF4] transition-colors emb-rise rounded-[2px]"
              style="animation-delay: 0.4s"
            >
              {{ activeSlide.buttonText || storefrontContent.home.cta.shopNow }}
              <Icon name="lucide:arrow-right" class="w-4 h-4 transition-transform group-hover/cta:translate-x-1 rtl:group-hover/cta:-translate-x-1 rtl:rotate-180" />
            </NuxtLink>
          </div>

          <!-- Image Column: a single tile, set square -->
          <div class="lg:col-span-6 order-1 lg:order-2">
            <div class="emb-plate-dark aspect-square lg:aspect-[5/4] w-full">
              <div class="emb-plate-inner emb-glaze-sweep bg-[#062622]">
                <img
                  :src="activeSlide.imageUrl"
                  :alt="activeSlide.title"
                  class="w-full h-full object-cover"
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Slide controls: tiles being set, not dots -->
      <div v-if="hasMultipleSlides" class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button
            v-for="(slide, index) in heroSlides"
            :key="'tile-' + index"
            type="button"
            class="h-2.5 w-2.5 border transition-colors"
            :class="index === currentSlide ? 'bg-[#DFA254] border-[#DFA254]' : 'border-[#DFA254]/45 hover:border-[#DFA254]'"
            :aria-label="slide.title"
            :aria-current="index === currentSlide"
            @click="currentSlide = index"
          />
        </div>
        <div class="hidden md:flex items-center gap-2">
          <button
            type="button"
            class="w-11 h-11 border border-[#DFA254]/40 flex items-center justify-center text-[#F2ECE1] hover:bg-[#DFA254] hover:text-[#062622] hover:border-[#DFA254] transition-colors"
            :aria-label="t('storefront.templates.embellir.controls.previous')"
            @click="prevSlide"
          >
            <Icon name="lucide:chevron-left" class="w-5 h-5 rtl:rotate-180" />
          </button>
          <button
            type="button"
            class="w-11 h-11 border border-[#DFA254]/40 flex items-center justify-center text-[#F2ECE1] hover:bg-[#DFA254] hover:text-[#062622] hover:border-[#DFA254] transition-colors"
            :aria-label="t('storefront.templates.embellir.controls.next')"
            @click="nextSlide"
          >
            <Icon name="lucide:chevron-right" class="w-5 h-5 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </section>

    <!-- Categories: a tiled wall, one grout line wide -->
    <section v-if="sections.browseByCategory.enabled && categories.length" class="py-16 md:py-24">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-end justify-between gap-6 mb-10">
          <div>
            <p class="emb-label text-brand-700 mb-3">{{ sections.browseByCategory.eyebrow }}</p>
            <h2 class="emb-display text-3xl md:text-[40px] leading-tight text-[#16211E]">
              {{ sections.browseByCategory.title }}
            </h2>
          </div>
          <span class="hidden sm:flex h-11 w-11 shrink-0 bg-brand-600 text-[#FDFAF4] items-center justify-center text-sm font-bold tabular-nums">
            {{ categories.length }}
          </span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#CBBDAB] border border-[#CBBDAB]">
          <NuxtLink
            v-for="cat in categories"
            :key="cat.slug"
            :to="`/category/${cat.slug}`"
            class="group relative aspect-[4/5] sm:aspect-square bg-[#F2ECE1] overflow-hidden"
          >
            <div class="absolute inset-0 emb-glaze-sweep">
              <img
                v-if="cat.imageUrl"
                :src="cat.imageUrl"
                :alt="categoryDisplayTitle(cat)"
                class="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
              >
              <div v-else class="emb-zellige w-full h-full bg-brand-600 opacity-90" />
            </div>

            <!-- A glazed cartouche, not a scrim: merchant photography varies, and
                 the title has to stay legible on a white bottle as on a dark one. -->
            <div class="absolute inset-x-0 bottom-0 bg-[#062622]/90 group-hover:bg-brand-600 transition-colors px-4 py-3 md:px-5 md:py-4">
              <h3 class="emb-display text-base md:text-xl text-[#FDFAF4] leading-tight line-clamp-2 min-h-[2.5em]">
                {{ categoryDisplayTitle(cat) }}
              </h3>
              <p class="mt-1.5 emb-label text-[#DFA254] flex items-center gap-2">
                <span class="emb-star w-2.5 h-2.5 shrink-0" />
                <span class="truncate">{{ storefrontContent.common.productsCount(cat.itemCount) }}</span>
              </p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Divider -->
    <div v-if="sections.browseByCategory.enabled && categories.length" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-4 text-[#CBBDAB]">
        <span class="h-px flex-1 bg-current" />
        <span class="emb-star w-3.5 h-3.5 text-[#DFA254]" />
        <span class="h-px flex-1 bg-current" />
      </div>
    </div>

    <!-- New arrivals -->
    <section v-if="sections.newArrivals.enabled" class="py-16 md:py-24">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-end justify-between gap-6 mb-10">
          <div>
            <p class="emb-label text-brand-700 mb-3">{{ sections.newArrivals.eyebrow }}</p>
            <h2 class="emb-display text-3xl md:text-[40px] leading-tight text-[#16211E]">
              {{ sections.newArrivals.title }}
            </h2>
          </div>
          <NuxtLink
            to="/products"
            class="group/all hidden sm:inline-flex items-center gap-2.5 emb-label text-[#16211E] border-b border-[#CBBDAB] hover:border-brand-600 hover:text-brand-700 pb-1.5 transition-colors"
          >
            {{ storefrontContent.shop.allProducts }}
            <Icon name="lucide:arrow-right" class="w-4 h-4 transition-transform group-hover/all:translate-x-1 rtl:group-hover/all:-translate-x-1 rtl:rotate-180" />
          </NuxtLink>
        </div>

        <!-- Skeleton -->
        <div v-if="pending" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-7">
          <div v-for="i in 4" :key="i" class="animate-pulse">
            <div class="bg-[#E4DACB] aspect-square mb-4" />
            <div class="h-3.5 bg-[#E4DACB] w-3/4 mb-2.5" />
            <div class="h-3.5 bg-[#E4DACB] w-1/3" />
          </div>
        </div>

        <div v-else-if="featuredProducts.length === 0" class="border border-[#CBBDAB] bg-[#FDFAF4] p-12 text-center">
          <span class="emb-star w-8 h-8 text-[#CBBDAB] mx-auto mb-4" />
          <p class="text-sm text-[#5A6763]">{{ storefrontContent.shop.results.noResults }}</p>
        </div>

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-7">
          <ProductCard
            v-for="product in featuredProducts"
            :key="product.id"
            :product="product"
          />
        </div>

        <div class="mt-10 sm:hidden">
          <NuxtLink
            to="/products"
            class="w-full h-12 inline-flex items-center justify-center gap-2 border border-[#16211E] emb-label text-[#16211E] hover:bg-brand-600 hover:border-brand-600 hover:text-[#FDFAF4] transition-colors"
          >
            {{ storefrontContent.shop.allProducts }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Best sellers: set on the dark tile so it reads as a separate room -->
    <section v-if="sections.bestSellers.enabled" class="relative bg-brand-600 text-[#F2ECE1] py-16 md:py-24 overflow-hidden">
      <div class="emb-zellige opacity-[0.08] absolute inset-0 pointer-events-none" />
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-end justify-between gap-6 mb-10">
          <div>
            <p class="emb-label text-[#DFA254] mb-3">{{ sections.bestSellers.eyebrow }}</p>
            <h2 class="emb-display text-3xl md:text-[40px] leading-tight text-[#FDFAF4]">
              {{ sections.bestSellers.title }}
            </h2>
          </div>
          <NuxtLink
            to="/products"
            class="group/all hidden sm:inline-flex items-center gap-2.5 emb-label text-[#F2ECE1] border-b border-[#DFA254]/40 hover:border-[#DFA254] hover:text-[#DFA254] pb-1.5 transition-colors"
          >
            {{ storefrontContent.shop.allProducts }}
            <Icon name="lucide:arrow-right" class="w-4 h-4 transition-transform group-hover/all:translate-x-1 rtl:group-hover/all:-translate-x-1 rtl:rotate-180" />
          </NuxtLink>
        </div>

        <div v-if="bestSellersDisplayed.length === 0" class="border border-[#DFA254]/25 p-12 text-center">
          <span class="emb-star w-8 h-8 text-[#DFA254]/40 mx-auto mb-4" />
          <p class="text-sm text-[#F2ECE1]/60">{{ storefrontContent.shop.results.noResults }}</p>
        </div>

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-7">
          <ProductCard
            v-for="product in bestSellersDisplayed"
            :key="product.id"
            :product="product"
            tone="dark"
          />
        </div>

        <div class="mt-10 sm:hidden">
          <NuxtLink
            to="/products"
            class="w-full h-12 inline-flex items-center justify-center gap-2 border border-[#DFA254] emb-label text-[#DFA254] hover:bg-[#DFA254] hover:text-[#062622] transition-colors"
          >
            {{ storefrontContent.shop.allProducts }}
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
