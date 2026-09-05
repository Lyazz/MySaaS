<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import ProductCard from '~/components/storefront/templates/nour/ProductCard.vue'
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
        // Simple visual pattern based on index, kept warm/ivory tinted
        const colors = ['bg-[#F3E7D8]', 'bg-[#F6EAD6]', 'bg-[#F1E2CE]', 'bg-brand-50']
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
  <div class="bg-[#FAF3EA] min-h-screen pb-24">
    <!-- Editorial Hero: 2-column composition (text / arched image), sides swap responsively -->
    <section
      class="relative w-full min-h-[560px] md:min-h-[620px] lg:min-h-[680px] overflow-hidden bg-[#FFFDF9] border-b border-[#C9A24B]/25"
      @touchstart.passive="pauseSlideAutoplay"
      @touchend.passive="resumeSlideAutoplay"
    >
      <!-- Slides -->
      <div
        v-for="(slide, index) in heroSlides"
        :key="index"
        class="absolute inset-0 transition-opacity duration-1000 ease-in-out"
        :class="index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'"
      >
        <div class="max-w-7xl mx-auto h-full px-6 sm:px-8 lg:px-10 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center py-14 lg:py-0">
          <!-- Text Column -->
          <div
            class="order-2 transform transition-all duration-1000 delay-300"
            :class="[index % 2 === 0 ? 'lg:order-1' : 'lg:order-2', index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0']"
          >
            <span class="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 rounded-full text-xs md:text-sm font-medium mb-5 tracking-wide border border-[#C9A24B]/40 text-brand-800">
              <Icon name="lucide:sparkle" class="w-3.5 h-3.5 text-[#C9A24B]" />
              {{ storefrontContent.home.welcomeTo(tenantName) }}
            </span>
            <h2 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight tracking-tight text-[#2E1E20]">
              {{ slide.title }}
            </h2>
            <p class="text-base md:text-lg lg:text-xl mb-6 md:mb-8 text-[#5C4A44] max-w-lg leading-relaxed line-clamp-2 md:line-clamp-none">
              {{ slide.subtitle }}
            </p>
            <NuxtLink
              :to="slideTo(slide.buttonHref)"
              class="group inline-flex items-center gap-2 px-7 py-3.5 md:px-9 md:py-4 bg-[#2E1E20] text-white font-bold rounded-full hover:bg-brand-700 transition-all shadow-lg text-sm md:text-base"
            >
              {{ slide.buttonText || storefrontContent.home.cta.shopNow }}
              <Icon name="lucide:arrow-right" class="w-5 h-5 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180" />
            </NuxtLink>
          </div>

          <!-- Image Column (arched/organic frame) -->
          <div
            class="order-1 relative"
            :class="index % 2 === 0 ? 'lg:order-2' : 'lg:order-1'"
          >
            <div class="absolute -inset-4 md:-inset-6 rounded-tl-[120px] rounded-tr-3xl rounded-br-[120px] rounded-bl-3xl bg-[#C9A24B]/15 -z-10" />
            <div class="relative aspect-[4/5] lg:aspect-[3/4] rounded-tl-[120px] rounded-tr-3xl rounded-br-[120px] rounded-bl-3xl overflow-hidden border border-[#C9A24B]/35 shadow-xl">
              <img
                :src="slide.imageUrl"
                class="w-full h-full object-cover"
                :alt="slide.title"
              >
              <div class="absolute inset-0 bg-gradient-to-t from-[#2E1E20]/25 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </div>

      <!-- Arrows -->
      <div v-if="hasMultipleSlides" class="hidden md:flex absolute bottom-8 end-8 lg:end-10 z-20 gap-4">
        <button
          class="w-12 h-12 rounded-full border border-[#C9A24B]/50 bg-[#FFFDF9]/80 backdrop-blur-sm flex items-center justify-center text-[#2E1E20] hover:bg-[#2E1E20] hover:text-white hover:border-[#2E1E20] transition-all"
          @click="prevSlide"
        >
          <Icon name="lucide:chevron-left" class="w-5 h-5" />
        </button>
        <button
          class="w-12 h-12 rounded-full border border-[#C9A24B]/50 bg-[#FFFDF9]/80 backdrop-blur-sm flex items-center justify-center text-[#2E1E20] hover:bg-[#2E1E20] hover:text-white hover:border-[#2E1E20] transition-all"
          @click="nextSlide"
        >
          <Icon name="lucide:chevron-right" class="w-5 h-5" />
        </button>
      </div>

      <!-- Dots -->
      <div v-if="hasMultipleSlides" class="absolute bottom-6 md:bottom-8 start-6 md:start-10 z-20 flex space-x-2 rtl:space-x-reverse">
        <button
          v-for="(slide, index) in heroSlides"
          :key="index"
          class="h-1 rounded-full transition-all duration-300"
          :class="index === currentSlide ? 'bg-[#C9A24B] w-8' : 'bg-[#2E1E20]/20 w-4 hover:bg-[#2E1E20]/40'"
          @click="currentSlide = index"
        />
      </div>
    </section>

    <!-- Categories Section (Static Curated Grid) -->
    <section v-if="sections.browseByCategory.enabled" class="py-12 md:py-20 bg-[#FAF3EA]">
      <div class="mb-8 md:mb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div class="max-w-2xl">
          <p class="text-xs font-bold text-brand-700 tracking-[0.25em] uppercase mb-3">
            {{ sections.browseByCategory.eyebrow }}
          </p>
          <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold text-[#2E1E20] tracking-tight">
            {{ sections.browseByCategory.title }}
          </h2>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <NuxtLink
          v-for="(cat) in categories"
          :key="cat.slug"
          :to="`/category/${cat.slug}`"
          class="h-56 sm:h-64 md:h-72 rounded-tl-[36px] rounded-tr-lg rounded-br-[36px] rounded-bl-lg p-5 md:p-6 flex flex-col justify-end items-start hover:shadow-xl transition-all duration-300 relative overflow-hidden group border border-[#C9A24B]/30"
          :class="cat.className"
        >
          <!-- Background Image -->
          <div class="absolute inset-0">
            <img
              v-if="cat.imageUrl"
              :src="cat.imageUrl"
              :alt="categoryDisplayTitle(cat)"
              class="w-full h-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
            >
            <CategoryPlaceholder v-else :title="categoryDisplayTitle(cat)" font-family="'Marcellus', serif" class="w-full h-full" />
            <div class="absolute inset-0 bg-gradient-to-t from-[#2E1E20]/50 via-[#2E1E20]/10 to-transparent" />
          </div>

          <!-- Background Decoration (Circle) -->
          <div class="absolute -top-10 -end-10 w-32 h-32 md:w-40 md:h-40 rounded-full bg-[#C9A24B]/25 blur-2xl group-hover:scale-150 transition-transform duration-700" />

          <div class="z-10 relative transform transition-transform duration-300 group-hover:-translate-y-1 bg-[#FFFDF9]/90 backdrop-blur-sm px-3.5 py-2.5 md:px-4 md:py-3 rounded-tl-xl rounded-br-xl shadow-sm border border-[#C9A24B]/25">
            <h3 class="text-lg md:text-2xl font-bold text-[#2E1E20] mb-1 group-hover:text-brand-700 transition-colors">
              {{ categoryDisplayTitle(cat) }}
            </h3>
              <p class="text-[#6B5850] font-medium text-xs md:text-base flex items-center gap-2">
                {{ storefrontContent.common.productsCount(cat.itemCount) }}
                <span class="w-8 h-px bg-[#C9A24B]/60 group-hover:w-16 group-hover:bg-brand-600 transition-all hidden md:block" />
              </p>
          </div>

          <!-- Action Icon -->
          <div class="absolute top-4 end-4 md:top-6 md:end-6 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/85 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <Icon name="lucide:arrow-right" class="w-4 h-4 md:w-5 md:h-5 text-[#2E1E20] rtl:rotate-180" />
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- Featured Products (Static Curated Grid) -->
    <section v-if="sections.newArrivals.enabled" class="py-12 md:py-20 bg-[#FFFDF9] border-y border-[#C9A24B]/20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-8 md:mb-10">
          <p class="text-xs font-bold text-brand-700 tracking-[0.25em] uppercase mb-2">
            {{ sections.newArrivals.eyebrow }}
          </p>
          <h2 class="text-2xl md:text-3xl font-bold text-[#2E1E20]">
            {{ sections.newArrivals.title }}
          </h2>
        </div>

        <!-- Skeleton Loading -->
        <div
          v-if="pending"
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          <div
            v-for="i in 4"
            :key="i"
            class="animate-pulse"
          >
            <div class="bg-[#F3E7D8] rounded-tl-[36px] rounded-tr-lg rounded-br-[36px] rounded-bl-lg aspect-[3/4] mb-4" />
            <div class="h-4 bg-[#F3E7D8] rounded-full w-3/4 mb-3" />
            <div class="h-4 bg-[#F3E7D8] rounded-full w-1/3" />
          </div>
        </div>

        <!-- Curated Grid -->
        <div
          v-else
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          <ProductCard
            v-for="product in featuredProducts"
            :key="product.id"
            :product="product"
          />
        </div>

        <div class="mt-10 text-center">
          <NuxtLink
            to="/products"
            class="inline-flex px-7 py-2.5 rounded-full border border-[#C9A24B]/50 text-[#2E1E20] font-medium hover:border-brand-600 hover:text-brand-700 transition-all items-center gap-2"
          >
            View all products &rarr;
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Best Sellers (Static Curated Grid) -->
    <section v-if="sections.bestSellers.enabled" class="py-12 md:py-20 bg-[#FAF3EA]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between mb-8 md:mb-10">
          <div>
            <p class="text-xs font-bold text-brand-700 tracking-[0.25em] uppercase mb-2">
              {{ sections.bestSellers.eyebrow }}
            </p>
            <h2 class="text-2xl md:text-3xl font-bold text-[#2E1E20]">
              {{ sections.bestSellers.title }}
            </h2>
          </div>
          <NuxtLink
            to="/products"
            class="hidden sm:flex px-6 py-2.5 rounded-full border border-[#C9A24B]/50 text-[#2E1E20] font-medium hover:border-brand-600 hover:text-brand-700 transition-all items-center gap-2 group"
          >
            View all products
            <span class="inline-block transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180">&rarr;</span>
          </NuxtLink>
        </div>

        <div v-if="bestSellersDisplayed.length === 0" class="text-sm text-[#6B5850]">
          No best sellers yet.
        </div>

        <div
          v-else
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          <ProductCard
            v-for="product in bestSellersDisplayed"
            :key="product.id"
            :product="product"
          />
        </div>

        <div class="mt-10 text-center sm:hidden">
          <NuxtLink
            to="/products"
            class="inline-flex px-6 py-2.5 rounded-full border border-[#C9A24B]/50 text-[#2E1E20] font-medium hover:border-brand-600 hover:text-brand-700 transition-all items-center gap-2"
          >
            View all products &rarr;
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
