<script setup lang="ts">
import ProductCard from './ProductCard.vue'
import { isDefaultStorefrontHomeConfig, type StorefrontHomeConfig } from '~/shared/storefront/homepage'

const props = defineProps<{
  tenantName: string
  featuredProducts: any[]
  bestSellerProducts?: any[]
  homeConfig?: StorefrontHomeConfig
  pending: boolean
}>()

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

let slideInterval: any
onMounted(() => { slideInterval = setInterval(nextSlide, 7000) })
onUnmounted(() => { clearInterval(slideInterval) })

// Fetch Categories
const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: categoriesData } = await useFetch<any[]>(categoriesUrl, {
  headers: useTenantApiHeaders()
})

const categories = computed(() => {
  if (!categoriesData.value) return []
  return categoriesData.value.map((cat, index) => ({ ...cat, itemCount: cat._count?.products || 0 }))
})

// Auto-scroll for products
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
</script>

<template>
  <div class="min-h-screen pb-24">
    <!-- Hero Slider — Editorial Full Width -->
    <div class="relative w-full h-[520px] md:h-[680px] lg:h-[85vh] overflow-hidden">
      <div
        v-for="(slide, index) in heroSlides"
        :key="index"
        class="absolute inset-0 transition-opacity duration-1000"
        :class="index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'"
      >
        <img
          :src="slide.imageUrl"
          class="w-full h-full object-cover"
          :alt="slide.title"
        >
        <!-- Warm dark overlay -->
        <div class="absolute inset-0 bg-gradient-to-r from-[#1A120A]/75 via-[#1A120A]/40 to-transparent" />

        <!-- Hero text -->
        <div class="absolute inset-0 flex items-center">
          <div class="max-w-7xl mx-auto px-8 md:px-16 w-full">
            <div
              class="max-w-xl transform transition-all duration-1000 delay-200"
              :class="index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'"
            >
              <p class="text-[10px] tracking-[0.3em] uppercase text-[#C17B4E]/90 font-medium mb-5">
                {{ storefrontContent.home.welcomeTo(tenantName) }}
              </p>
              <h1 class="font-maison-serif text-5xl md:text-6xl lg:text-8xl font-semibold text-white mb-6 leading-[1.1] tracking-tight">
                {{ slide.title }}
              </h1>
              <p class="text-base md:text-lg text-white/75 mb-10 leading-relaxed max-w-md line-clamp-2 md:line-clamp-none">
                {{ slide.subtitle }}
              </p>
              <NuxtLink
                :to="slideTo(slide.buttonHref)"
                class="inline-flex items-center gap-3 px-8 py-3.5 border border-white/60 text-white text-xs tracking-[0.2em] uppercase font-medium hover:bg-white hover:text-[#2C2420] transition-all duration-300"
              >
                {{ slide.buttonText || storefrontContent.home.cta.shopNow }}
                <Icon name="lucide:arrow-right" class="w-4 h-4" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Slide controls -->
      <div class="absolute bottom-8 right-8 md:right-16 z-20 flex items-center gap-6">
        <!-- Dots -->
        <div class="flex gap-2">
          <button
            v-for="(_, index) in heroSlides"
            :key="index"
            class="h-px transition-all duration-300"
            :class="index === currentSlide ? 'bg-white w-12' : 'bg-white/35 w-6 hover:bg-white/60'"
            @click="currentSlide = index"
          />
        </div>
        <!-- Arrows -->
        <div class="hidden md:flex gap-3">
          <button
            class="w-10 h-10 border border-white/30 flex items-center justify-center text-white hover:bg-white hover:text-[#2C2420] transition-all"
            @click="prevSlide"
          >
            <Icon name="lucide:chevron-left" class="w-4 h-4" />
          </button>
          <button
            class="w-10 h-10 border border-white/30 flex items-center justify-center text-white hover:bg-white hover:text-[#2C2420] transition-all"
            @click="nextSlide"
          >
            <Icon name="lucide:chevron-right" class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Editorial strip -->
    <div class="bg-[#2C2420] py-5">
      <div class="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 md:gap-16">
        <div class="flex items-center gap-3 text-[#D4C4B4]">
          <Icon name="lucide:package" class="w-4 h-4 text-[#C17B4E]" />
          <span class="text-xs tracking-[0.15em] uppercase">Livraison partout en Algérie</span>
        </div>
        <div class="hidden md:block h-4 w-px bg-[#3D342F]" />
        <div class="flex items-center gap-3 text-[#D4C4B4]">
          <Icon name="lucide:shield-check" class="w-4 h-4 text-[#C17B4E]" />
          <span class="text-xs tracking-[0.15em] uppercase">Produits sélectionnés avec soin</span>
        </div>
        <div class="hidden md:block h-4 w-px bg-[#3D342F]" />
        <div class="flex items-center gap-3 text-[#D4C4B4]">
          <Icon name="lucide:refresh-cw" class="w-4 h-4 text-[#C17B4E]" />
          <span class="text-xs tracking-[0.15em] uppercase">Retours facilités</span>
        </div>
      </div>
    </div>

    <!-- Categories Section — Asymmetric editorial grid -->
    <section v-if="sections.browseByCategory.enabled && categories.length > 0" class="py-16 md:py-24 max-w-7xl mx-auto px-6">
      <div class="mb-10">
        <p class="text-[10px] tracking-[0.3em] uppercase text-[#C17B4E] font-medium mb-3">
          {{ sections.browseByCategory.eyebrow }}
        </p>
        <h2 class="font-maison-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-[#2C2420]">
          {{ sections.browseByCategory.title }}
        </h2>
      </div>

      <!-- Asymmetric grid: first item tall on left, rest stacked on right -->
      <div v-if="categories.length >= 3" class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        <!-- Large featured category -->
        <NuxtLink
          :to="`/c/${categories[0].slug}`"
          class="md:col-span-2 md:row-span-2 relative overflow-hidden group h-72 md:h-auto md:min-h-[520px]"
        >
          <img
            v-if="categories[0].imageUrl"
            :src="categories[0].imageUrl"
            :alt="categories[0].title"
            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          >
          <div v-else class="w-full h-full bg-[#E8D8C8]" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#1A120A]/60 via-transparent to-transparent" />
          <div class="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <p class="text-[9px] tracking-[0.25em] uppercase text-white/60 mb-2">{{ storefrontContent.common.productsCount(categories[0].itemCount) }}</p>
            <h3 class="font-maison-serif text-2xl md:text-3xl font-semibold text-white">{{ categories[0].title }}</h3>
            <div class="mt-3 flex items-center gap-2 text-white/70 text-xs tracking-wider uppercase group-hover:text-white transition-colors">
              Découvrir <Icon name="lucide:arrow-right" class="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </NuxtLink>

        <!-- Smaller categories -->
        <NuxtLink
          v-for="(cat, idx) in categories.slice(1, 3)"
          :key="cat.slug"
          :to="`/c/${cat.slug}`"
          class="relative overflow-hidden group h-56 md:h-auto"
        >
          <img
            v-if="cat.imageUrl"
            :src="cat.imageUrl"
            :alt="cat.title"
            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          >
          <div v-else class="w-full h-full" :class="idx === 0 ? 'bg-[#DDD0C0]' : 'bg-[#F0E8DC]'" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#1A120A]/55 via-transparent to-transparent" />
          <div class="absolute bottom-0 left-0 right-0 p-5 md:p-6">
            <p class="text-[9px] tracking-[0.25em] uppercase text-white/60 mb-1.5">{{ storefrontContent.common.productsCount(cat.itemCount) }}</p>
            <h3 class="font-maison-serif text-xl md:text-2xl font-semibold text-white">{{ cat.title }}</h3>
          </div>
        </NuxtLink>
      </div>

      <!-- Fallback simple grid -->
      <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <NuxtLink
          v-for="cat in categories"
          :key="cat.slug"
          :to="`/c/${cat.slug}`"
          class="relative overflow-hidden group h-48"
        >
          <img v-if="cat.imageUrl" :src="cat.imageUrl" :alt="cat.title" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
          <div v-else class="w-full h-full bg-[#E8D8C8]" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#1A120A]/55 to-transparent" />
          <div class="absolute bottom-0 left-0 p-4">
            <h3 class="font-maison-serif text-xl font-semibold text-white">{{ cat.title }}</h3>
          </div>
        </NuxtLink>
      </div>

      <!-- More categories -->
      <div v-if="categories.length > 3" class="mt-6 flex gap-3 flex-wrap">
        <NuxtLink
          v-for="cat in categories.slice(3)"
          :key="cat.slug"
          :to="`/c/${cat.slug}`"
          class="px-5 py-2 border border-[#D4C4B4] text-[#7A6558] text-xs tracking-[0.15em] uppercase hover:border-[#C17B4E] hover:text-[#C17B4E] transition-all"
        >
          {{ cat.title }}
        </NuxtLink>
      </div>
    </section>

    <!-- Divider editorial -->
    <div class="max-w-7xl mx-auto px-6 mb-16">
      <div class="h-px bg-[#E8E0D4]" />
    </div>

    <!-- Featured Products — horizontal auto-scroll -->
    <section v-if="sections.newArrivals.enabled" class="py-4 md:py-8 mb-16">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex items-end justify-between mb-10">
          <div>
            <p class="text-[10px] tracking-[0.3em] uppercase text-[#C17B4E] font-medium mb-3">
              {{ sections.newArrivals.eyebrow }}
            </p>
            <h2 class="font-maison-serif text-3xl md:text-4xl font-semibold text-[#2C2420]">
              {{ sections.newArrivals.title }}
            </h2>
          </div>
          <NuxtLink
            to="/products"
            class="hidden sm:flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-[#7A6558] hover:text-[#C17B4E] transition-colors"
          >
            Tout voir <Icon name="lucide:arrow-right" class="w-3 h-3" />
          </NuxtLink>
        </div>

        <!-- Skeleton -->
        <div v-if="pending" class="flex gap-5 overflow-x-hidden pb-4">
          <div v-for="i in 4" :key="i" class="flex-shrink-0 w-60 animate-pulse">
            <div class="bg-[#E8E0D4] rounded aspect-[3/4] mb-4" />
            <div class="h-3 bg-[#E8E0D4] rounded w-3/4 mb-2" />
            <div class="h-3 bg-[#E8E0D4] rounded w-1/3" />
          </div>
        </div>

        <div
          v-else
          ref="featuredScrollContainer"
          class="flex gap-5 overflow-x-scroll pb-4 scrollbar-hide"
          style="scroll-behavior: auto;"
          @mouseenter="isHoveringFeatured = true"
          @mouseleave="isHoveringFeatured = false"
        >
          <div
            v-for="(product, index) in featuredInfiniteList"
            :key="`${product.id}-${index}`"
            class="flex-shrink-0 w-56 md:w-64"
          >
            <ProductCard :product="product" />
          </div>
        </div>

        <div class="mt-8 text-center sm:hidden">
          <NuxtLink to="/products" class="inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-[#7A6558] hover:text-[#C17B4E] border-b border-current pb-0.5">
            Tout voir <Icon name="lucide:arrow-right" class="w-3 h-3" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Editorial Banner — Ambiance section -->
    <section class="py-20 md:py-28 bg-[#F0EBE3] my-8">
      <div class="max-w-7xl mx-auto px-6 text-center">
        <p class="text-[10px] tracking-[0.35em] uppercase text-[#C17B4E] font-medium mb-5">Notre Univers</p>
        <h2 class="font-maison-serif text-4xl md:text-5xl lg:text-6xl font-semibold text-[#2C2420] max-w-2xl mx-auto leading-tight mb-6">
          L'art de décorer votre espace
        </h2>
        <p class="text-base text-[#7A6558] max-w-xl mx-auto leading-relaxed mb-10">
          Des pièces pensées pour embellir chaque coin de votre maison. Du salon à la chambre, de la cuisine au bureau.
        </p>
        <NuxtLink
          to="/products"
          class="inline-flex items-center gap-3 px-8 py-3.5 bg-[#2C2420] text-white text-xs tracking-[0.2em] uppercase hover:bg-[#C17B4E] transition-all duration-300"
        >
          Découvrir la boutique <Icon name="lucide:arrow-right" class="w-4 h-4" />
        </NuxtLink>
      </div>
    </section>

    <!-- Best Sellers -->
    <section v-if="sections.bestSellers.enabled && bestSellersDisplayed.length > 0" class="py-4 md:py-8 mt-8">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex items-end justify-between mb-10">
          <div>
            <p class="text-[10px] tracking-[0.3em] uppercase text-[#C17B4E] font-medium mb-3">
              {{ sections.bestSellers.eyebrow }}
            </p>
            <h2 class="font-maison-serif text-3xl md:text-4xl font-semibold text-[#2C2420]">
              {{ sections.bestSellers.title }}
            </h2>
          </div>
          <NuxtLink
            to="/products"
            class="hidden sm:flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-[#7A6558] hover:text-[#C17B4E] transition-colors"
          >
            Tout voir <Icon name="lucide:arrow-right" class="w-3 h-3" />
          </NuxtLink>
        </div>

        <div
          ref="bestSellersScrollContainer"
          class="flex gap-5 overflow-x-scroll pb-4 scrollbar-hide"
          style="scroll-behavior: auto;"
          @mouseenter="isHoveringBestSellers = true"
          @mouseleave="isHoveringBestSellers = false"
        >
          <div
            v-for="(product, index) in bestSellersInfiniteList"
            :key="`${product.id}-${index}`"
            class="flex-shrink-0 w-56 md:w-64"
          >
            <ProductCard :product="product" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
