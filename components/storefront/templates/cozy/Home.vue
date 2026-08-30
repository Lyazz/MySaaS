<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import ProductCard from './ProductCard.vue'
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
  if (!category) return ''
  return category.parentId ? '— ' + category.title : category.title
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

// Running section numerals — only enabled sections are counted.
const sectionOrder = computed(() => {
  const list: string[] = []
  if (sections.value.browseByCategory?.enabled) list.push('browseByCategory')
  if (sections.value.newArrivals?.enabled) list.push('newArrivals')
  if (sections.value.bestSellers?.enabled) list.push('bestSellers')
  return list
})
const sectionNo = (key: string) => {
  const i = sectionOrder.value.indexOf(key)
  return i === -1 ? '' : String(i + 1).padStart(2, '0')
}

const currentSlide = ref(0)
const hasMultipleSlides = computed(() => heroSlides.value.length > 1)
const nextSlide = () => { currentSlide.value = (currentSlide.value + 1) % heroSlides.value.length }
const prevSlide = () => { currentSlide.value = (currentSlide.value - 1 + heroSlides.value.length) % heroSlides.value.length }

let slideInterval: any
const pauseSlideAutoplay = () => { clearInterval(slideInterval) }
const resumeSlideAutoplay = () => { clearInterval(slideInterval); slideInterval = setInterval(nextSlide, 6000) }

onMounted(() => {
  cartStore.loadFromLocalStorage()
  slideInterval = setInterval(nextSlide, 6000)
})
onUnmounted(() => { clearInterval(slideInterval) })

// Categories
const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: categoriesData } = await useFetch<any[]>(categoriesUrl, {
  headers: useTenantApiHeaders()
})
const categories = computed(() => {
  if (!categoriesData.value) return []
  return categoriesData.value.map((cat) => ({ ...cat, itemCount: cat._count?.products || 0 }))
})

// Auto-scroll rails
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

const activeSlide = computed(() => heroSlides.value[currentSlide.value] || heroSlides.value[0])
</script>

<template>
  <div class="ed-theme pb-4">
    <!-- ── Cover ─────────────────────────────────────────────────────────── -->
    <section
      class="border-b border-[#DAD2C4]"
      @touchstart.passive="pauseSlideAutoplay"
      @touchend.passive="resumeSlideAutoplay"
    >
      <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10">
        <div class="grid lg:grid-cols-12 gap-8 lg:gap-12 py-10 md:py-16 lg:py-20 items-center">
          <!-- Headline column -->
          <div class="lg:col-span-6 xl:col-span-5">
            <p class="ed-kicker mb-6">{{ storefrontContent.home.welcomeTo(tenantName) }}</p>
            <Transition name="cover-text" mode="out-in">
              <h1 :key="currentSlide" class="ed-display text-[10vw] sm:text-6xl lg:text-[clamp(2.75rem,4.4vw,4.5rem)] text-[#262019]">
                {{ activeSlide?.title }}
              </h1>
            </Transition>
            <Transition name="cover-text" mode="out-in">
              <p :key="'sub-' + currentSlide" class="mt-6 text-[17px] leading-relaxed text-[#4A4038] max-w-md">
                {{ activeSlide?.subtitle }}
              </p>
            </Transition>
            <div class="mt-9 flex flex-wrap items-center gap-5">
              <NuxtLink :to="slideTo(activeSlide?.buttonHref)" class="ed-btn-solid">
                {{ activeSlide?.buttonText || storefrontContent.home.cta.shopNow }}
                <Icon name="lucide:arrow-right" class="w-4 h-4 rtl:rotate-180" />
              </NuxtLink>
              <NuxtLink to="/products" class="ed-link ed-ui text-[11px] font-semibold uppercase tracking-[0.16em]">
                {{ storefrontContent.shop.allProducts }}
              </NuxtLink>
            </div>

            <!-- Slide ticks -->
            <div v-if="hasMultipleSlides" class="mt-12 flex items-center gap-4">
              <button
                v-for="(slide, index) in heroSlides"
                :key="index"
                class="ed-ui text-xs tabular-nums transition-colors"
                :class="index === currentSlide ? 'text-[#B8532E]' : 'text-[#8A7E6E] hover:text-[#262019]'"
                @click="currentSlide = index"
              >
                <span class="inline-block w-6 h-px align-middle me-2" :class="index === currentSlide ? 'bg-[#B8532E]' : 'bg-[#C4B8A4]'" />
                {{ String(index + 1).padStart(2, '0') }}
              </button>
            </div>
          </div>

          <!-- Image column -->
          <div class="lg:col-span-6 xl:col-span-7">
            <div class="relative bg-[#FBF8F2] border border-[#DAD2C4] p-2">
              <div class="relative aspect-[4/3] md:aspect-[16/11] overflow-hidden">
                <img
                  v-for="(slide, index) in heroSlides"
                  :key="index"
                  :src="slide.imageUrl"
                  :alt="slide.title"
                  class="absolute inset-0 w-full h-full object-cover transition-opacity duration-[900ms] ease-in-out"
                  :class="index === currentSlide ? 'opacity-100' : 'opacity-0'"
                >
              </div>
              <div v-if="hasMultipleSlides" class="absolute bottom-3 end-3 flex gap-1.5">
                <button
                  class="w-9 h-9 bg-[#F4EFE6]/90 border border-[#C4B8A4] flex items-center justify-center text-[#262019] hover:bg-[#262019] hover:text-[#F4EFE6] transition-colors"
                  @click="prevSlide"
                >
                  <Icon name="lucide:arrow-left" class="w-4 h-4 rtl:rotate-180" />
                </button>
                <button
                  class="w-9 h-9 bg-[#F4EFE6]/90 border border-[#C4B8A4] flex items-center justify-center text-[#262019] hover:bg-[#262019] hover:text-[#F4EFE6] transition-colors"
                  @click="nextSlide"
                >
                  <Icon name="lucide:arrow-right" class="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Departments ───────────────────────────────────────────────────── -->
    <section v-if="sections.browseByCategory.enabled" class="border-b border-[#DAD2C4]">
      <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-14 md:py-20">
        <div class="flex items-end justify-between gap-6 mb-10">
          <div>
            <p class="ed-ui text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B8532E] mb-3">
              <span class="ed-num me-2">{{ sectionNo('browseByCategory') }}</span>{{ sections.browseByCategory.eyebrow }}
            </p>
            <h2 class="ed-display text-3xl md:text-[2.6rem] text-[#262019]">{{ sections.browseByCategory.title }}</h2>
          </div>
          <div class="hidden md:flex gap-2">
            <button
              class="w-10 h-10 border border-[#C4B8A4] flex items-center justify-center text-[#4A4038] hover:bg-[#262019] hover:text-[#F4EFE6] hover:border-[#262019] transition-colors"
              onclick="document.getElementById('cat-scroll').scrollBy({left: -360, behavior: 'smooth'})"
            >
              <Icon name="lucide:arrow-left" class="w-4 h-4 rtl:rotate-180" />
            </button>
            <button
              class="w-10 h-10 border border-[#C4B8A4] flex items-center justify-center text-[#4A4038] hover:bg-[#262019] hover:text-[#F4EFE6] hover:border-[#262019] transition-colors"
              onclick="document.getElementById('cat-scroll').scrollBy({left: 360, behavior: 'smooth'})"
            >
              <Icon name="lucide:arrow-right" class="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>

        <div id="cat-scroll" class="flex gap-5 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-3 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <NuxtLink
            v-for="cat in categories"
            :key="cat.slug"
            :to="`/category/${cat.slug}`"
            class="snap-start flex-shrink-0 w-[248px] md:w-[300px] group"
          >
            <div class="relative aspect-[4/5] bg-[#FBF8F2] border border-[#DAD2C4] overflow-hidden">
              <img
                v-if="cat.imageUrl"
                :src="cat.imageUrl"
                :alt="categoryDisplayTitle(cat)"
                class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              >
              <CategoryPlaceholder v-else :title="categoryDisplayTitle(cat)" class="w-full h-full" />
              <span class="absolute top-3 start-3 ed-ui text-[10px] font-semibold uppercase tracking-[0.16em] bg-[#F4EFE6] text-[#262019] px-2.5 py-1 border border-[#C4B8A4]">
                {{ storefrontContent.common.productsCount(cat.itemCount) }}
              </span>
            </div>
            <div class="flex items-baseline justify-between gap-3 pt-3 border-t border-[#262019] mt-3">
              <h3 class="ed-display text-xl text-[#262019] group-hover:text-[#97401F] transition-colors">{{ categoryDisplayTitle(cat) }}</h3>
              <Icon name="lucide:arrow-up-right" class="w-4 h-4 text-[#8A7E6E] group-hover:text-[#B8532E] transition-colors shrink-0" />
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ── New arrivals ──────────────────────────────────────────────────── -->
    <section v-if="sections.newArrivals.enabled" class="border-b border-[#DAD2C4]">
      <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-14 md:py-20">
        <div class="flex items-end justify-between gap-6 mb-10">
          <div>
            <p class="ed-ui text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B8532E] mb-3">
              <span class="ed-num me-2">{{ sectionNo('newArrivals') }}</span>{{ sections.newArrivals.eyebrow }}
            </p>
            <h2 class="ed-display text-3xl md:text-[2.6rem] text-[#262019]">{{ sections.newArrivals.title }}</h2>
          </div>
          <NuxtLink to="/products" class="hidden sm:inline-flex ed-link ed-ui text-[11px] font-semibold uppercase tracking-[0.16em] items-center gap-2 group">
            {{ storefrontContent.shop.allProducts }}
            <span class="inline-block transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1">→</span>
          </NuxtLink>
        </div>

        <div v-if="pending" class="flex gap-5 overflow-hidden">
          <div v-for="i in 5" :key="i" class="flex-shrink-0 w-[calc(50%-0.625rem)] sm:w-60 md:w-64 animate-pulse">
            <div class="bg-[#EFE8DA] border border-[#DAD2C4] aspect-[4/5] mb-3" />
            <div class="h-3.5 bg-[#EFE8DA] w-3/4 mb-2" />
            <div class="h-3.5 bg-[#EFE8DA] w-1/3" />
          </div>
        </div>
        <div
          v-else
          ref="featuredScrollContainer"
          class="flex gap-5 md:gap-6 overflow-x-scroll pb-3 scrollbar-hide"
          style="scroll-behavior: auto;"
          @mouseenter="isHoveringFeatured = true"
          @mouseleave="isHoveringFeatured = false"
        >
          <div
            v-for="(product, index) in featuredInfiniteList"
            :key="`${product.id}-${index}`"
            class="flex-shrink-0 w-[calc(50%-0.625rem)] sm:w-60 md:w-64"
          >
            <ProductCard :product="product" />
          </div>
        </div>

        <div class="mt-8 sm:hidden">
          <NuxtLink to="/products" class="ed-btn-line w-full">{{ storefrontContent.shop.allProducts }}</NuxtLink>
        </div>
      </div>
    </section>

    <!-- ── Best sellers ──────────────────────────────────────────────────── -->
    <section v-if="sections.bestSellers.enabled">
      <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-14 md:py-20">
        <div class="flex items-end justify-between gap-6 mb-10">
          <div>
            <p class="ed-ui text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B8532E] mb-3">
              <span class="ed-num me-2">{{ sectionNo('bestSellers') }}</span>{{ sections.bestSellers.eyebrow }}
            </p>
            <h2 class="ed-display text-3xl md:text-[2.6rem] text-[#262019]">{{ sections.bestSellers.title }}</h2>
          </div>
          <NuxtLink to="/products" class="hidden sm:inline-flex ed-link ed-ui text-[11px] font-semibold uppercase tracking-[0.16em] items-center gap-2 group">
            {{ storefrontContent.shop.allProducts }}
            <span class="inline-block transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1">→</span>
          </NuxtLink>
        </div>

        <div v-if="bestSellersDisplayed.length === 0" class="ed-ui text-sm text-[#8A7E6E] border border-dashed border-[#C4B8A4] px-5 py-8 text-center">
          {{ storefrontContent.shop.results.noResults }}
        </div>
        <div
          v-else
          ref="bestSellersScrollContainer"
          class="flex gap-5 md:gap-6 overflow-x-scroll pb-3 scrollbar-hide"
          style="scroll-behavior: auto;"
          @mouseenter="isHoveringBestSellers = true"
          @mouseleave="isHoveringBestSellers = false"
        >
          <div
            v-for="(product, index) in bestSellersInfiniteList"
            :key="`${product.id}-${index}`"
            class="flex-shrink-0 w-[calc(50%-0.625rem)] sm:w-60 md:w-64"
          >
            <ProductCard :product="product" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cover-text-enter-active, .cover-text-leave-active { transition: opacity 0.4s ease, transform 0.4s ease; }
.cover-text-enter-from { opacity: 0; transform: translateY(10px); }
.cover-text-leave-to { opacity: 0; transform: translateY(-10px); }

@media (prefers-reduced-motion: reduce) {
  .cover-text-enter-active, .cover-text-leave-active { transition: none; }
}
</style>
