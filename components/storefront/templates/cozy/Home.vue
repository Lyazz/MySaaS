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

/*
 * Running section numerals — only the sections the merchant left enabled are
 * counted, so the contents page never skips a number.
 */
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

/* The cover cross-fades between the merchant's slides — no arrows, no dots. */
const currentSlide = ref(0)
const hasMultipleSlides = computed(() => heroSlides.value.length > 1)
const activeSlide = computed(() => heroSlides.value[currentSlide.value] || heroSlides.value[0])
const nextSlide = () => { currentSlide.value = (currentSlide.value + 1) % heroSlides.value.length }

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

/* The selection is a staggered grid: every third cell opens a row wide. */
const featuredDisplayed = computed(() => (props.featuredProducts || []).slice(0, 9))
const isWideCell = (index: number) => index % 3 === 0

const rankedBestSellers = computed(() => bestSellersDisplayed.value.slice(0, 5))
</script>

<template>
  <div class="ed-theme">
    <!-- ══ La une ══════════════════════════════════════════════════════════ -->
    <section
      class="relative min-h-[78vh] md:min-h-[86vh] flex items-end overflow-hidden border-b border-[#DAD2C4]"
      @touchstart.passive="pauseSlideAutoplay"
      @touchend.passive="resumeSlideAutoplay"
    >
      <img
        v-for="(slide, index) in heroSlides"
        :key="index"
        :src="slide.imageUrl"
        :alt="slide.title"
        class="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1100ms] ease-in-out"
        :class="index === currentSlide ? 'opacity-100' : 'opacity-0'"
      >
      <!-- Scrim: the type sits on the photograph, so the plate has to be read -->
      <div class="absolute inset-0 bg-gradient-to-t from-[#1E1912]/85 via-[#1E1912]/35 to-[#1E1912]/10" />

      <div class="relative w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 pb-14 md:pb-20">
        <div class="max-w-3xl">
          <p class="ed-kicker !text-[#E8E0D2]/80 mb-6">{{ storefrontContent.home.welcomeTo(tenantName) }}</p>
          <Transition name="cover" mode="out-in">
            <h1
              :key="currentSlide"
              class="ed-display !text-[#F4EFE6] text-[13vw] sm:text-6xl lg:text-[clamp(3rem,6vw,5.75rem)]"
            >{{ activeSlide?.title }}</h1>
          </Transition>
          <Transition name="cover" mode="out-in">
            <p
              :key="'sub-' + currentSlide"
              class="mt-6 text-[17px] md:text-[19px] leading-relaxed text-[#E8E0D2]/85 max-w-xl"
            >{{ activeSlide?.subtitle }}</p>
          </Transition>

          <div class="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <NuxtLink
              :to="slideTo(activeSlide?.buttonHref)"
              class="ed-btn-solid !bg-[#F4EFE6] !text-[#262019] !border-[#F4EFE6] hover:!bg-[#B8532E] hover:!text-[#F4EFE6] hover:!border-[#B8532E]"
            >
              {{ activeSlide?.buttonText || storefrontContent.home.cta.shopNow }}
              <Icon name="lucide:arrow-right" class="w-4 h-4 rtl:rotate-180" />
            </NuxtLink>
            <NuxtLink
              to="/products"
              class="ed-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E8E0D2]/75 hover:text-[#F4EFE6] underline underline-offset-4 decoration-[#E8E0D2]/35 transition-colors"
            >{{ storefrontContent.shop.allProducts }}</NuxtLink>
          </div>
        </div>

        <!-- Folio: which plate of the cover we're on -->
        <div v-if="hasMultipleSlides" class="absolute bottom-14 md:bottom-20 end-4 sm:end-6 lg:end-10 flex items-center gap-3">
          <button
            v-for="(slide, index) in heroSlides"
            :key="index"
            class="ed-ui text-[11px] tabular-nums transition-colors"
            :class="index === currentSlide ? 'text-[#F4EFE6]' : 'text-[#E8E0D2]/40 hover:text-[#E8E0D2]/80'"
            @click="currentSlide = index"
          >{{ String(index + 1).padStart(2, '0') }}</button>
        </div>
      </div>
    </section>

    <!-- ══ Sommaire ════════════════════════════════════════════════════════ -->
    <section v-if="sections.browseByCategory.enabled" class="border-b border-[#DAD2C4]">
      <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-14 md:py-20">
        <div class="flex items-baseline gap-4 mb-10 md:mb-12">
          <span class="ed-num text-lg">{{ sectionNo('browseByCategory') }}</span>
          <h2 class="ed-display text-3xl md:text-[2.6rem] text-[#262019]">{{ sections.browseByCategory.title }}</h2>
          <span class="ed-rule flex-1 hidden sm:block" />
          <span class="ed-ui text-[11px] uppercase tracking-[0.16em] text-[#8A7E6E] hidden sm:block">{{ sections.browseByCategory.eyebrow }}</span>
        </div>

        <div class="border-t border-[#262019]">
          <NuxtLink
            v-for="(cat, index) in categories"
            :key="cat.slug"
            :to="`/category/${cat.slug}`"
            class="group flex items-center gap-4 md:gap-6 py-4 md:py-5 border-b border-[#DAD2C4] hover:bg-[#FBF8F2] transition-colors -mx-3 px-3"
          >
            <span class="ed-ui text-[11px] tabular-nums text-[#8A7E6E] w-6 shrink-0">{{ String(index + 1).padStart(2, '0') }}</span>

            <span class="w-12 h-14 md:w-14 md:h-16 shrink-0 overflow-hidden border border-[#DAD2C4] bg-[#FBF8F2]">
              <img
                v-if="cat.imageUrl"
                :src="cat.imageUrl"
                :alt="categoryDisplayTitle(cat)"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              >
              <CategoryPlaceholder v-else :title="categoryDisplayTitle(cat)" class="w-full h-full" />
            </span>

            <span class="ed-display text-xl md:text-[1.75rem] text-[#262019] group-hover:text-[#97401F] transition-colors">
              {{ categoryDisplayTitle(cat) }}
            </span>

            <span class="ed-leader hidden sm:block" />

            <span class="ed-ui text-[12px] md:text-[13px] text-[#8A7E6E] tabular-nums ms-auto sm:ms-0 shrink-0">
              {{ storefrontContent.common.productsCount(cat.itemCount) }}
            </span>
            <Icon
              name="lucide:arrow-right"
              class="w-4 h-4 text-[#C4B8A4] group-hover:text-[#B8532E] transition-colors shrink-0 rtl:rotate-180"
            />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ══ La sélection ════════════════════════════════════════════════════ -->
    <section v-if="sections.newArrivals.enabled" class="border-b border-[#DAD2C4]">
      <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-14 md:py-20">
        <div class="flex items-baseline gap-4 mb-10 md:mb-12">
          <span class="ed-num text-lg">{{ sectionNo('newArrivals') }}</span>
          <h2 class="ed-display text-3xl md:text-[2.6rem] text-[#262019]">{{ sections.newArrivals.title }}</h2>
          <span class="ed-rule flex-1 hidden sm:block" />
          <NuxtLink
            to="/products"
            class="ed-link ed-ui text-[11px] font-semibold uppercase tracking-[0.16em] hidden sm:inline-flex items-center gap-2 group shrink-0"
          >
            {{ storefrontContent.shop.allProducts }}
            <span class="inline-block transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180">→</span>
          </NuxtLink>
        </div>

        <!-- Skeleton -->
        <div v-if="pending" class="grid grid-cols-2 md:grid-cols-12 gap-x-5 gap-y-10 md:gap-x-8">
          <div
            v-for="i in 6"
            :key="i"
            class="animate-pulse"
            :class="isWideCell(i - 1) ? 'col-span-2 md:col-span-6' : 'col-span-1 md:col-span-3'"
          >
            <div class="bg-[#EFE8DA] border border-[#DAD2C4]" :class="isWideCell(i - 1) ? 'aspect-[16/11]' : 'aspect-[4/5]'" />
            <div class="h-3.5 bg-[#EFE8DA] w-3/4 mt-3 mb-2" />
            <div class="h-3.5 bg-[#EFE8DA] w-1/3" />
          </div>
        </div>

        <div v-else-if="featuredDisplayed.length === 0" class="border border-dashed border-[#C4B8A4] py-14 text-center ed-ui text-sm text-[#8A7E6E]">
          {{ storefrontContent.shop.results.noResults }}
        </div>

        <!-- Staggered plate: one wide cell opens each row -->
        <div v-else class="grid grid-cols-2 md:grid-cols-12 gap-x-5 gap-y-10 md:gap-x-8 md:gap-y-14 items-start">
          <div
            v-for="(product, index) in featuredDisplayed"
            :key="product.id"
            :class="isWideCell(index) ? 'col-span-2 md:col-span-6' : 'col-span-1 md:col-span-3'"
          >
            <ProductCard :product="product" :view-mode="isWideCell(index) ? 'feature' : 'grid'" />
          </div>
        </div>

        <div class="mt-10 sm:hidden">
          <NuxtLink to="/products" class="ed-btn-line w-full">{{ storefrontContent.shop.allProducts }}</NuxtLink>
        </div>
      </div>
    </section>

    <!-- ══ Le palmarès ═════════════════════════════════════════════════════ -->
    <section v-if="sections.bestSellers.enabled">
      <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-14 md:py-20">
        <div class="flex items-baseline gap-4 mb-10 md:mb-12">
          <span class="ed-num text-lg">{{ sectionNo('bestSellers') }}</span>
          <h2 class="ed-display text-3xl md:text-[2.6rem] text-[#262019]">{{ sections.bestSellers.title }}</h2>
          <span class="ed-rule flex-1 hidden sm:block" />
          <span class="ed-ui text-[11px] uppercase tracking-[0.16em] text-[#8A7E6E] hidden sm:block">{{ sections.bestSellers.eyebrow }}</span>
        </div>

        <div v-if="rankedBestSellers.length === 0" class="border border-dashed border-[#C4B8A4] py-14 text-center ed-ui text-sm text-[#8A7E6E]">
          {{ storefrontContent.shop.results.noResults }}
        </div>

        <div v-else class="border-t border-[#262019] max-w-4xl">
          <div
            v-for="(product, index) in rankedBestSellers"
            :key="product.id"
            class="py-6 md:py-7 border-b border-[#DAD2C4]"
          >
            <ProductCard :product="product" view-mode="list" :rank="index + 1" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cover-enter-active, .cover-leave-active { transition: opacity 0.45s ease, transform 0.45s ease; }
.cover-enter-from { opacity: 0; transform: translateY(12px); }
.cover-leave-to { opacity: 0; transform: translateY(-12px); }

@media (prefers-reduced-motion: reduce) {
  .cover-enter-active, .cover-leave-active { transition: none; }
}
</style>
