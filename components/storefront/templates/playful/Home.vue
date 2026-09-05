<script setup lang="ts">
import ProductCard from './ProductCard.vue'
import CategoryPlaceholder from '~/components/storefront/CategoryPlaceholder.vue'
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
const slides = computed(() => {
  const configured = isCustomHomeConfig.value ? props.homeConfig?.carousel : undefined
  return Array.isArray(configured) && configured.length > 0 ? configured : homeDefaults.value.carousel
})
const sections = computed(() => (isCustomHomeConfig.value ? props.homeConfig?.sections : undefined) || homeDefaults.value.sections)

/*
 * The cover carousel takes the first three slides. Anything the merchant adds
 * beyond that is dealt out two-up between the product rows, so a long slide
 * list becomes merchandising banners instead of an endless rotation nobody
 * waits through.
 */
const HERO_SLIDE_LIMIT = 3
const heroSlides = computed(() => slides.value.slice(0, HERO_SLIDE_LIMIT))
const bannerPairA = computed(() => slides.value.slice(HERO_SLIDE_LIMIT, HERO_SLIDE_LIMIT + 2))
const bannerPairB = computed(() => slides.value.slice(HERO_SLIDE_LIMIT + 2, HERO_SLIDE_LIMIT + 4))

const slideTo = (href?: string) => (href && href.startsWith('/') ? href : '/products')

/* ── Cover carousel ────────────────────────────────────────────────── */

const currentSlide = ref(0)
const hasMultipleSlides = computed(() => heroSlides.value.length > 1)
const activeSlide = computed(() => heroSlides.value[currentSlide.value] || heroSlides.value[0])

/*
 * Only slides that have actually been shown get an <img>. All three sit inside
 * the viewport, so `loading="lazy"` would not defer them — mounting on demand
 * is what keeps the first load fetching one cover instead of three.
 */
const mountedSlides = ref(new Set<number>([0]))
/* Filtered here rather than with `v-if` on the `v-for`: Vue evaluates `v-if`
 * first, so `index` would not exist yet. */
const mountedHeroSlides = computed(() =>
  heroSlides.value
    .map((slide, index) => ({ slide, index }))
    .filter(({ index }) => mountedSlides.value.has(index))
)

const goToSlide = (index: number) => {
  const total = heroSlides.value.length
  if (total === 0) return
  const next = (index + total) % total
  if (!mountedSlides.value.has(next)) {
    mountedSlides.value = new Set(mountedSlides.value).add(next)
  }
  currentSlide.value = next
}
const nextSlide = () => goToSlide(currentSlide.value + 1)
const prevSlide = () => goToSlide(currentSlide.value - 1)

let slideTimer: ReturnType<typeof setInterval> | null = null
const stopAutoplay = () => {
  if (slideTimer) { clearInterval(slideTimer); slideTimer = null }
}
const startAutoplay = () => {
  stopAutoplay()
  if (!hasMultipleSlides.value) return
  /* Readers who asked for less motion get a static cover, not a slideshow. */
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  slideTimer = setInterval(nextSlide, 6000)
}

/* The rest of the covers come in once the page has settled, so first paint
 * spends its bandwidth on the one slide the visitor can actually see — and
 * they are in the DOM before any cross-fade needs them. */
const mountAllSlides = () => {
  mountedSlides.value = new Set(heroSlides.value.map((_, index) => index))
}

onMounted(() => {
  startAutoplay()
  if (document.readyState === 'complete') setTimeout(mountAllSlides, 200)
  else window.addEventListener('load', () => setTimeout(mountAllSlides, 200), { once: true })
})
onUnmounted(stopAutoplay)

/* ── Categories ────────────────────────────────────────────────────── */

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: categoriesData } = await useFetch<any[]>(categoriesUrl, { headers: useTenantApiHeaders() })

const categories = computed(() => (categoriesData.value || []).map((cat) => ({
  ...cat,
  itemCount: cat._count?.products || 0
})))

const rootCategories = computed(() => {
  const roots = categories.value.filter((c) => !c.parentId)
  return roots.length > 0 ? roots : categories.value
})

const childrenOf = (parentId: string) => categories.value.filter((c) => c.parentId === parentId)

/*
 * Babyshop's brand rows have no equivalent here (there is no brand entity),
 * so their job — a dense row of round shortcuts — is handed to sub-category
 * tiles. Two rows at most: past that the page turns into a directory.
 */
const subCategoryRows = computed(() =>
  categories.value
    .filter((c) => !c.parentId && childrenOf(c.id).length > 0)
    .slice(0, 2)
    .map((parent) => ({ parent, children: childrenOf(parent.id).slice(0, 10) }))
)

const tileTints = [
  { bg: 'var(--kw-pink-soft)', ring: 'var(--kw-pink)' },
  { bg: 'var(--kw-sky-soft)', ring: 'var(--kw-sky)' },
  { bg: 'var(--kw-lemon-soft)', ring: 'var(--kw-lemon)' },
  { bg: 'var(--kw-mint-soft)', ring: 'var(--kw-mint)' },
  { bg: 'var(--kw-lilac-soft)', ring: 'var(--kw-lilac)' }
]
const tintAt = (index: number) => tileTints[index % tileTints.length]

/* ── Product rails ─────────────────────────────────────────────────── */

const newArrivalsRail = ref<HTMLElement | null>(null)
const bestSellersRail = ref<HTMLElement | null>(null)

const scrollRail = (rail: HTMLElement | null, direction: 1 | -1) => {
  if (!rail) return
  rail.scrollBy({ left: direction * Math.round(rail.clientWidth * 0.85), behavior: 'smooth' })
}

const newArrivals = computed(() => (props.featuredProducts || []).slice(0, sections.value.newArrivals?.limit || 12))
const bestSellers = computed(() => (props.bestSellerProducts || []).slice(0, sections.value.bestSellers?.limit || 12))

const reassurance = computed(() => [
  { icon: 'lucide:truck', label: 'storefront.product.features.delivery', tint: 'var(--kw-sky-soft)' },
  { icon: 'lucide:banknote', label: 'storefront.product.features.securePayment', tint: 'var(--kw-mint-soft)' },
  { icon: 'lucide:headset', label: 'storefront.product.features.support', tint: 'var(--kw-lemon-soft)' }
])
</script>

<template>
  <div class="bg-[var(--kw-cream)]">
    <!-- ══ Cover ══════════════════════════════════════════════════════ -->
    <section
      v-if="heroSlides.length"
      class="kw-scallop relative min-h-[62vh] md:min-h-[78vh] flex items-end overflow-hidden"
      style="background: linear-gradient(140deg, var(--kw-lilac-deep) 0%, var(--kw-pink-deep) 55%, var(--kw-peach) 100%)"
      @mouseenter="stopAutoplay"
      @mouseleave="startAutoplay"
      @touchstart.passive="stopAutoplay"
      @touchend.passive="startAutoplay"
    >
      <img
        v-for="{ slide, index } in mountedHeroSlides"
        :key="'cover-' + index"
        :src="slide.imageUrl"
        :alt="slide.title"
        :fetchpriority="index === 0 ? 'high' : 'auto'"
        class="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
        :class="index === currentSlide ? 'opacity-100' : 'opacity-0'"
      >
      <!--
        The scrim is inline so it paints with the first frame — which is exactly
        why the section carries a candy gradient underneath. Without it the very
        first paint was a near-opaque plum block sitting on nothing, and the page
        appeared to open dark until the cover photo decoded.
      -->
      <div
        class="absolute inset-0"
        style="background: linear-gradient(to top, rgba(74,46,77,.78) 0%, rgba(74,46,77,.3) 45%, rgba(74,46,77,0) 100%)"
      />

      <!-- Floating candy dots: the only always-on motion, and it is decorative -->
      <span
        class="hidden md:block kw-float absolute top-[18%] end-[12%] w-16 h-16 kw-blob opacity-70"
        style="background: var(--kw-lemon); animation-delay: .4s"
      />
      <span
        class="hidden md:block kw-float absolute top-[34%] end-[22%] w-9 h-9 kw-blob-2 opacity-60"
        style="background: var(--kw-sky); animation-delay: 1.6s"
      />
      <span
        class="hidden md:block kw-float absolute top-[12%] end-[27%] w-6 h-6 rounded-full opacity-70"
        style="background: var(--kw-mint); animation-delay: 2.4s"
      />

      <div class="relative w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 md:pb-24">
        <div class="flex items-end justify-between gap-8">
          <div class="max-w-2xl kw-rise">
            <p class="kw-kicker !text-[var(--kw-lemon)] mb-4">
              {{ storefrontContent.home.welcomeTo(tenantName) }}
            </p>
            <Transition
              name="kw-cover"
              mode="out-in"
            >
              <h1
                :key="'t-' + currentSlide"
                class="kw-display !text-white text-[2.6rem] sm:text-6xl lg:text-[clamp(3rem,5.6vw,5rem)] mb-5"
              >
                {{ activeSlide?.title }}
              </h1>
            </Transition>
            <Transition
              name="kw-cover"
              mode="out-in"
            >
              <p
                v-if="activeSlide?.subtitle"
                :key="'s-' + currentSlide"
                class="text-white/85 text-base md:text-lg font-semibold max-w-lg mb-9"
              >
                {{ activeSlide.subtitle }}
              </p>
            </Transition>
            <NuxtLink
              :to="slideTo(activeSlide?.buttonHref)"
              class="kw-btn kw-btn-lg"
            >
              {{ activeSlide?.buttonText || storefrontContent.home.cta.shopNow }}
              <Icon
                name="lucide:arrow-right"
                class="w-4 h-4 rtl:rotate-180"
              />
            </NuxtLink>
          </div>

          <!-- Cover controls: gum-drop dots, arrows only where there is room -->
          <div
            v-if="hasMultipleSlides"
            class="hidden md:flex flex-col items-end gap-4 pb-2 flex-shrink-0"
          >
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="w-10 h-10 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                :aria-label="$t('storefront.nav.previous')"
                @click="prevSlide"
              >
                <Icon
                  name="lucide:chevron-left"
                  class="w-4 h-4 rtl:rotate-180"
                />
              </button>
              <button
                type="button"
                class="w-10 h-10 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                :aria-label="$t('storefront.nav.next')"
                @click="nextSlide"
              >
                <Icon
                  name="lucide:chevron-right"
                  class="w-4 h-4 rtl:rotate-180"
                />
              </button>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-for="(slide, index) in heroSlides"
                :key="'dot-' + index"
                type="button"
                class="h-2.5 rounded-full transition-all duration-300"
                :class="index === currentSlide ? 'w-7 bg-[var(--kw-lemon)]' : 'w-2.5 bg-white/45 hover:bg-white/70'"
                :aria-label="slide.title"
                @click="goToSlide(index)"
              />
            </div>
          </div>
        </div>

        <!-- Mobile keeps the dots only — arrows are a thumb-hostile target here -->
        <div
          v-if="hasMultipleSlides"
          class="flex md:hidden items-center gap-2 mt-8"
        >
          <button
            v-for="(slide, index) in heroSlides"
            :key="'mdot-' + index"
            type="button"
            class="h-2.5 rounded-full transition-all duration-300"
            :class="index === currentSlide ? 'w-7 bg-[var(--kw-lemon)]' : 'w-2.5 bg-white/45'"
            :aria-label="slide.title"
            @click="goToSlide(index)"
          />
        </div>
      </div>
    </section>

    <!-- ══ Two-up campaign banners (slides 4–5) ═══════════════════════ -->
    <section
      v-if="bannerPairA.length"
      class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-20"
    >
      <div
        class="grid gap-5"
        :class="bannerPairA.length > 1 ? 'md:grid-cols-2' : ''"
      >
        <NuxtLink
          v-for="(slide, index) in bannerPairA"
          :key="'a-' + index"
          :to="slideTo(slide.buttonHref)"
          class="group relative overflow-hidden rounded-[var(--kw-r-xl)] min-h-[300px] md:min-h-[380px] flex items-end"
        >
          <img
            :src="slide.imageUrl"
            :alt="slide.title"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] group-hover:scale-105"
          >
          <div
            class="absolute inset-0"
            style="background: linear-gradient(to top, rgba(74,46,77,.78), rgba(74,46,77,.12) 65%)"
          />
          <div class="relative p-7 md:p-9">
            <h3 class="kw-title !text-white text-2xl md:text-3xl mb-2">
              {{ slide.title }}
            </h3>
            <p
              v-if="slide.subtitle"
              class="text-white/80 text-sm font-semibold mb-5 max-w-sm line-clamp-2"
            >
              {{ slide.subtitle }}
            </p>
            <span class="kw-btn kw-btn-sm kw-btn-ghost">
              {{ slide.buttonText || storefrontContent.home.cta.shopNow }}
              <Icon
                name="lucide:arrow-right"
                class="w-3.5 h-3.5 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
              />
            </span>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- ══ Category shortcuts — blob tiles ════════════════════════════ -->
    <section
      v-if="sections.browseByCategory.enabled && rootCategories.length"
      class="py-14 md:py-20"
    >
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-10 md:mb-12">
          <p class="kw-kicker mb-3">
            {{ sections.browseByCategory.eyebrow }}
          </p>
          <h2 class="kw-display text-3xl md:text-[2.6rem]">
            {{ sections.browseByCategory.title }}
          </h2>
        </div>

        <div class="flex flex-wrap justify-center gap-x-6 gap-y-9 md:gap-x-10 md:gap-y-12 pt-3 pb-4">
          <NuxtLink
            v-for="(cat, index) in rootCategories"
            :key="cat.id"
            :to="`/category/${cat.slug}`"
            class="group w-32 sm:w-40 text-center"
          >
            <div
              class="kw-blob kw-blob-hover w-32 h-32 sm:w-40 sm:h-40 overflow-hidden mb-4 group-hover:-translate-y-1.5"
              :style="{ background: tintAt(index).bg, boxShadow: `0 0 0 3px ${tintAt(index).ring}` }"
            >
              <img
                v-if="cat.imageUrl"
                :src="cat.imageUrl"
                :alt="cat.title"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              >
              <CategoryPlaceholder
                v-else
                :title="cat.title"
                class="w-full h-full"
              />
            </div>
            <h3 class="kw-title text-sm sm:text-base group-hover:text-[var(--kw-pink-deep)] transition-colors leading-tight">
              {{ cat.title }}
            </h3>
            <p class="text-xs font-bold text-[var(--kw-ink-faint)] mt-1">
              {{ storefrontContent.common.productsCount(cat.itemCount) }}
            </p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ══ New arrivals rail ══════════════════════════════════════════ -->
    <section
      v-if="sections.newArrivals.enabled"
      class="kw-band-pink py-14 md:py-20 rounded-[var(--kw-r-xl)] mx-3 sm:mx-5"
    >
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-end justify-between gap-6 mb-9">
          <div>
            <p class="kw-kicker mb-3">
              {{ sections.newArrivals.eyebrow }}
            </p>
            <h2 class="kw-display text-3xl md:text-[2.6rem]">
              {{ sections.newArrivals.title }}
            </h2>
          </div>
          <div class="hidden md:flex items-center gap-2">
            <button
              type="button"
              class="kw-icon-btn"
              @click="scrollRail(newArrivalsRail, -1)"
            >
              <Icon
                name="lucide:chevron-left"
                class="w-4 h-4 rtl:rotate-180"
              />
            </button>
            <button
              type="button"
              class="kw-icon-btn"
              @click="scrollRail(newArrivalsRail, 1)"
            >
              <Icon
                name="lucide:chevron-right"
                class="w-4 h-4 rtl:rotate-180"
              />
            </button>
          </div>
        </div>

        <div
          v-if="pending"
          class="flex gap-5 overflow-hidden"
        >
          <div
            v-for="i in 5"
            :key="i"
            class="flex-shrink-0 w-[46%] sm:w-56 lg:w-64 animate-pulse"
          >
            <div class="bg-white/70 rounded-[var(--kw-r-lg)] aspect-[4/5] mb-4" />
            <div class="h-3 bg-white/70 rounded-full w-3/4 mb-2" />
            <div class="h-3 bg-white/70 rounded-full w-1/3" />
          </div>
        </div>

        <div
          v-else-if="newArrivals.length === 0"
          class="kw-card p-10 text-center"
        >
          <p class="kw-lede">
            {{ storefrontContent.shop.results.noResults }}
          </p>
        </div>

        <div
          v-else
          ref="newArrivalsRail"
          class="flex gap-5 overflow-x-auto kw-hide-scroll snap-x snap-mandatory pt-3 pb-4"
        >
          <div
            v-for="product in newArrivals"
            :key="product.id"
            class="snap-start flex-shrink-0 w-[46%] sm:w-56 lg:w-64"
          >
            <ProductCard :product="product" />
          </div>
        </div>

        <div class="mt-10 text-center">
          <NuxtLink
            to="/products"
            class="kw-btn kw-btn-ghost"
          >
            {{ storefrontContent.shop.allProducts }}
            <Icon
              name="lucide:arrow-right"
              class="w-4 h-4 rtl:rotate-180"
            />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ══ Two-up campaign banners (slides 6–7) ═══════════════════════ -->
    <section
      v-if="bannerPairB.length"
      class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-20"
    >
      <div
        class="grid gap-5"
        :class="bannerPairB.length > 1 ? 'md:grid-cols-2' : ''"
      >
        <NuxtLink
          v-for="(slide, index) in bannerPairB"
          :key="'b-' + index"
          :to="slideTo(slide.buttonHref)"
          class="group relative overflow-hidden rounded-[var(--kw-r-xl)] min-h-[300px] md:min-h-[380px] flex items-end"
        >
          <img
            :src="slide.imageUrl"
            :alt="slide.title"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] group-hover:scale-105"
          >
          <div
            class="absolute inset-0"
            style="background: linear-gradient(to top, rgba(74,46,77,.78), rgba(74,46,77,.12) 65%)"
          />
          <div class="relative p-7 md:p-9">
            <h3 class="kw-title !text-white text-2xl md:text-3xl mb-2">
              {{ slide.title }}
            </h3>
            <p
              v-if="slide.subtitle"
              class="text-white/80 text-sm font-semibold mb-5 max-w-sm line-clamp-2"
            >
              {{ slide.subtitle }}
            </p>
            <span class="kw-btn kw-btn-sm kw-btn-ghost">
              {{ slide.buttonText || storefrontContent.home.cta.shopNow }}
              <Icon
                name="lucide:arrow-right"
                class="w-3.5 h-3.5 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
              />
            </span>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- ══ Sub-category shortcut rows ═════════════════════════════════ -->
    <section
      v-for="(row, rowIndex) in subCategoryRows"
      :key="row.parent.id"
      class="py-12 md:py-16"
      :class="rowIndex % 2 === 1 ? 'kw-band-sky' : ''"
    >
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between gap-6 mb-8">
          <h2 class="kw-title text-2xl md:text-3xl">
            {{ row.parent.title }}
          </h2>
          <NuxtLink
            :to="`/category/${row.parent.slug}`"
            class="kw-chip"
          >
            {{ storefrontContent.product.viewFullDetails }}
            <Icon
              name="lucide:arrow-right"
              class="w-3.5 h-3.5 rtl:rotate-180"
            />
          </NuxtLink>
        </div>

        <div class="flex gap-4 md:gap-6 overflow-x-auto kw-hide-scroll pt-3 pb-5 snap-x">
          <NuxtLink
            v-for="(child, index) in row.children"
            :key="child.id"
            :to="`/category/${child.slug}`"
            class="group snap-start flex-shrink-0 w-24 sm:w-28 text-center"
          >
            <div
              class="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden mb-3 transition-transform duration-300 group-hover:-translate-y-1.5"
              :style="{ background: tintAt(index + rowIndex).bg, boxShadow: `0 0 0 3px ${tintAt(index + rowIndex).ring}` }"
            >
              <img
                v-if="child.imageUrl"
                :src="child.imageUrl"
                :alt="child.title"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              >
              <CategoryPlaceholder
                v-else
                :title="child.title"
                class="w-full h-full"
              />
            </div>
            <p class="text-xs sm:text-sm font-extrabold leading-tight group-hover:text-[var(--kw-pink-deep)] transition-colors">
              {{ child.title }}
            </p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ══ Best sellers rail ══════════════════════════════════════════ -->
    <section
      v-if="sections.bestSellers.enabled"
      class="py-14 md:py-20"
    >
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-end justify-between gap-6 mb-9">
          <div>
            <p class="kw-kicker mb-3">
              {{ sections.bestSellers.eyebrow }}
            </p>
            <h2 class="kw-display text-3xl md:text-[2.6rem]">
              {{ sections.bestSellers.title }}
            </h2>
          </div>
          <div class="hidden md:flex items-center gap-2">
            <button
              type="button"
              class="kw-icon-btn"
              @click="scrollRail(bestSellersRail, -1)"
            >
              <Icon
                name="lucide:chevron-left"
                class="w-4 h-4 rtl:rotate-180"
              />
            </button>
            <button
              type="button"
              class="kw-icon-btn"
              @click="scrollRail(bestSellersRail, 1)"
            >
              <Icon
                name="lucide:chevron-right"
                class="w-4 h-4 rtl:rotate-180"
              />
            </button>
          </div>
        </div>

        <div
          v-if="bestSellers.length === 0"
          class="kw-card p-10 text-center"
        >
          <p class="kw-lede">
            {{ storefrontContent.shop.results.noResults }}
          </p>
        </div>

        <div
          v-else
          ref="bestSellersRail"
          class="flex gap-5 overflow-x-auto kw-hide-scroll snap-x snap-mandatory pt-3 pb-4"
        >
          <div
            v-for="product in bestSellers"
            :key="product.id"
            class="snap-start flex-shrink-0 w-[46%] sm:w-56 lg:w-64"
          >
            <ProductCard :product="product" />
          </div>
        </div>
      </div>
    </section>

    <!-- ══ Reassurance strip ══════════════════════════════════════════ -->
    <section class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 md:pb-24">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          v-for="item in reassurance"
          :key="item.icon"
          class="kw-card-flat flex items-center gap-4 p-5"
        >
          <span
            class="w-12 h-12 kw-blob flex items-center justify-center flex-shrink-0"
            :style="{ background: item.tint }"
          >
            <Icon
              :name="item.icon"
              class="w-5 h-5 text-[var(--kw-ink)]"
            />
          </span>
          <span class="kw-title text-sm leading-snug">{{ $t(item.label) }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* The cover cross-fades its art; the type swaps with a short lift. */
.kw-cover-enter-active,
.kw-cover-leave-active { transition: opacity .35s ease, transform .35s cubic-bezier(.34, 1.4, .64, 1); }
.kw-cover-enter-from { opacity: 0; transform: translateY(12px); }
.kw-cover-leave-to { opacity: 0; transform: translateY(-8px); }

@media (prefers-reduced-motion: reduce) {
  .kw-cover-enter-active,
  .kw-cover-leave-active { transition: none; }
}
</style>
