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
const resumeSlideAutoplay = () => {
  clearInterval(slideInterval)
  slideInterval = setInterval(nextSlide, 7000)
}

onMounted(() => { slideInterval = setInterval(nextSlide, 7000) })
onUnmounted(() => { clearInterval(slideInterval) })

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: categoriesData } = await useFetch<any[]>(categoriesUrl, {
  headers: useTenantApiHeaders()
})

const categories = computed(() => {
  if (!categoriesData.value) return []
  return categoriesData.value.map((cat) => ({ ...cat, itemCount: cat._count?.products || 0 }))
})

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

const heroVisible = ref(false)
onMounted(() => { setTimeout(() => { heroVisible.value = true }, 80) })
</script>

<template>
  <div class="atelier-root">
    <!-- Pistachio typography from Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <!-- ─── HERO ─────────────────────────────────────────────── -->
    <section
      class="atelier-hero"
      @touchstart.passive="pauseSlideAutoplay"
      @touchend.passive="resumeSlideAutoplay"
    >
      <!-- Slide images -->
      <div
        v-for="(slide, index) in heroSlides"
        :key="index"
        class="atelier-hero__slide"
        :class="{ 'is-active': index === currentSlide }"
      >
        <img :src="slide.imageUrl" :alt="slide.title" class="atelier-hero__img">
        <div class="atelier-hero__veil" />
      </div>

      <!-- Vertical rule + content -->
      <div class="atelier-hero__body" :class="{ 'is-visible': heroVisible }">
        <div class="atelier-hero__rule" />
        <div class="atelier-hero__text">
          <span class="atelier-label" style="--delay:0ms">
            {{ storefrontContent.home.welcomeTo(tenantName) }}
          </span>
          <h1 class="atelier-hero__title" style="--delay:120ms">
            {{ heroSlides[currentSlide]?.title }}
          </h1>
          <p class="atelier-hero__sub" style="--delay:240ms">
            {{ heroSlides[currentSlide]?.subtitle }}
          </p>
          <NuxtLink
            :to="slideTo(heroSlides[currentSlide]?.buttonHref)"
            class="atelier-cta"
            style="--delay:360ms"
          >
            <span>{{ heroSlides[currentSlide]?.buttonText || storefrontContent.home.cta.shopNow }}</span>
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
              <path d="M1 5h16M12 1l5 4-5 4" stroke="currentColor" stroke-width="1"/>
            </svg>
          </NuxtLink>
        </div>
      </div>

      <!-- Slide counter + nav -->
      <div v-if="hasMultipleSlides" class="atelier-hero__nav">
        <button class="atelier-hero__arrow" @click="prevSlide" aria-label="Précédent">
          <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
            <path d="M15 5H1M6 1L1 5l5 4" stroke="currentColor" stroke-width="1"/>
          </svg>
        </button>
        <span class="atelier-hero__count">
          {{ String(currentSlide + 1).padStart(2, '0') }} / {{ String(heroSlides.length).padStart(2, '0') }}
        </span>
        <button class="atelier-hero__arrow" @click="nextSlide" aria-label="Suivant">
          <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
            <path d="M1 5h14M10 1l5 4-5 4" stroke="currentColor" stroke-width="1"/>
          </svg>
        </button>
      </div>

      <!-- Progress bar -->
      <div v-if="hasMultipleSlides" class="atelier-hero__progress">
        <div
          v-for="(_, i) in heroSlides"
          :key="i"
          class="atelier-hero__progress-bar"
          :class="{ 'is-active': i === currentSlide }"
        />
      </div>
    </section>

    <!-- ─── ATELIER STRIP ─────────────────────────────────────── -->
    <div class="atelier-strip">
      <div class="atelier-strip__item">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" stroke="currentColor" stroke-width="0.75"/><path d="M4 7h6M7 4v6" stroke="currentColor" stroke-width="0.75"/></svg>
        <span>Livraison partout en Algérie</span>
      </div>
      <div class="atelier-strip__sep" />
      <div class="atelier-strip__item">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="0.75"/><path d="M5 7l2 2 3-3" stroke="currentColor" stroke-width="0.75"/></svg>
        <span>Sélection rigoureuse</span>
      </div>
      <div class="atelier-strip__sep" />
      <div class="atelier-strip__item">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7c0-2.76 2.24-5 5-5s5 2.24 5 5-2.24 5-5 5" stroke="currentColor" stroke-width="0.75"/><path d="M5 10l-3 2V9" stroke="currentColor" stroke-width="0.75"/></svg>
        <span>Retours facilités</span>
      </div>
    </div>

    <!-- ─── CATEGORIES ─────────────────────────────────────────── -->
    <section v-if="sections.browseByCategory.enabled && categories.length > 0" class="atelier-cats">
      <header class="atelier-section-head">
        <div class="atelier-section-head__left">
          <span class="atelier-label">{{ sections.browseByCategory.eyebrow }}</span>
          <h2 class="atelier-section-title">{{ sections.browseByCategory.title }}</h2>
        </div>
        <NuxtLink to="/products" class="atelier-ghost-link">
          Tout explorer
          <svg width="16" height="8" viewBox="0 0 16 8" fill="none"><path d="M1 4h14M10 1l5 3-5 3" stroke="currentColor" stroke-width="0.85"/></svg>
        </NuxtLink>
      </header>

      <!-- Numbered editorial grid -->
      <div class="atelier-cats__grid">
        <NuxtLink
          v-for="(cat, idx) in categories.slice(0, 5)"
          :key="cat.slug"
          :to="`/category/${cat.slug}`"
          class="atelier-cats__item"
          :class="`atelier-cats__item--${idx}`"
        >
          <div class="atelier-cats__img-wrap">
            <img
              v-if="cat.imageUrl"
              :src="cat.imageUrl"
              :alt="categoryDisplayTitle(cat)"
              class="atelier-cats__img"
            >
            <div v-else class="atelier-cats__img-placeholder" />
            <div class="atelier-cats__overlay" />
          </div>
          <div class="atelier-cats__meta">
            <span class="atelier-cats__num">{{ String(idx + 1).padStart(2, '0') }}</span>
            <div class="atelier-cats__info">
              <h3 class="atelier-cats__name">{{ categoryDisplayTitle(cat) }}</h3>
              <span class="atelier-cats__count">{{ storefrontContent.common.productsCount(cat.itemCount) }}</span>
            </div>
            <svg class="atelier-cats__arrow" width="18" height="10" viewBox="0 0 18 10" fill="none">
              <path d="M1 5h16M12 1l5 4-5 4" stroke="currentColor" stroke-width="0.85"/>
            </svg>
          </div>
        </NuxtLink>
      </div>

      <div v-if="categories.length > 5" class="atelier-cats__overflow">
        <NuxtLink
          v-for="cat in categories.slice(5)"
          :key="cat.slug"
          :to="`/category/${cat.slug}`"
          class="atelier-tag"
        >{{ categoryDisplayTitle(cat) }}</NuxtLink>
      </div>
    </section>

    <!-- ─── HORIZONTAL RULE ───────────────────────────────────── -->
    <div class="atelier-divider" />

    <!-- ─── NEW ARRIVALS ──────────────────────────────────────── -->
    <section v-if="sections.newArrivals.enabled" class="atelier-products">
      <header class="atelier-section-head">
        <div class="atelier-section-head__left">
          <span class="atelier-label">{{ sections.newArrivals.eyebrow }}</span>
          <h2 class="atelier-section-title">{{ sections.newArrivals.title }}</h2>
        </div>
        <NuxtLink to="/products" class="atelier-ghost-link atelier-ghost-link--desktop">
          Tout voir
          <svg width="16" height="8" viewBox="0 0 16 8" fill="none"><path d="M1 4h14M10 1l5 3-5 3" stroke="currentColor" stroke-width="0.85"/></svg>
        </NuxtLink>
      </header>

      <div v-if="pending" class="atelier-products__skeleton">
        <div v-for="i in 4" :key="i" class="atelier-products__skel-card" />
      </div>

      <div
        v-else
        ref="featuredScrollContainer"
        class="atelier-products__rail"
        @mouseenter="isHoveringFeatured = true"
        @mouseleave="isHoveringFeatured = false"
      >
        <div
          v-for="(product, index) in featuredInfiniteList"
          :key="`${product.id}-${index}`"
          class="atelier-products__card"
        >
          <ProductCard :product="product" />
        </div>
      </div>

      <div class="atelier-products__mobile-link">
        <NuxtLink to="/products" class="atelier-ghost-link">
          Voir tous les produits
          <svg width="16" height="8" viewBox="0 0 16 8" fill="none"><path d="M1 4h14M10 1l5 3-5 3" stroke="currentColor" stroke-width="0.85"/></svg>
        </NuxtLink>
      </div>
    </section>

    <!-- ─── MANIFESTO BAND ────────────────────────────────────── -->
    <section class="atelier-manifesto">
      <div class="atelier-manifesto__inner">
        <div class="atelier-manifesto__eyebrow">
          <span class="atelier-label atelier-label--light">Notre Univers</span>
          <div class="atelier-manifesto__line" />
        </div>
        <blockquote class="atelier-manifesto__quote">
          L'art de décorer<br><em>votre espace</em>
        </blockquote>
        <p class="atelier-manifesto__body">
          Des pièces pensées pour embellir chaque coin de votre maison.<br class="hidden md:block">
          Du salon à la chambre, de la cuisine au bureau.
        </p>
        <NuxtLink to="/products" class="atelier-cta atelier-cta--light">
          <span>Découvrir la boutique</span>
          <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
            <path d="M1 5h16M12 1l5 4-5 4" stroke="currentColor" stroke-width="1"/>
          </svg>
        </NuxtLink>
      </div>
    </section>

    <!-- ─── BEST SELLERS ──────────────────────────────────────── -->
    <section v-if="sections.bestSellers.enabled && bestSellersDisplayed.length > 0" class="atelier-products atelier-products--sellers">
      <header class="atelier-section-head">
        <div class="atelier-section-head__left">
          <span class="atelier-label">{{ sections.bestSellers.eyebrow }}</span>
          <h2 class="atelier-section-title">{{ sections.bestSellers.title }}</h2>
        </div>
        <NuxtLink to="/products" class="atelier-ghost-link atelier-ghost-link--desktop">
          Tout voir
          <svg width="16" height="8" viewBox="0 0 16 8" fill="none"><path d="M1 4h14M10 1l5 3-5 3" stroke="currentColor" stroke-width="0.85"/></svg>
        </NuxtLink>
      </header>

      <div
        ref="bestSellersScrollContainer"
        class="atelier-products__rail"
        @mouseenter="isHoveringBestSellers = true"
        @mouseleave="isHoveringBestSellers = false"
      >
        <div
          v-for="(product, index) in bestSellersInfiniteList"
          :key="`${product.id}-${index}`"
          class="atelier-products__card"
        >
          <ProductCard :product="product" />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ── Tokens ────────────────────────────────────────────────────── */
.atelier-root {
  --c-bg:       #FBF3E6;
  --c-surface:  #FFF9EA;
  --c-surface-2:#F7E4BD;
  --c-border:   #E4C58F;
  --c-muted:    #8F7655;
  --c-text:     #1D2419;
  --c-sub:      #3F5E43;
  --c-gold:     #B38335;
  --c-cream:    #0B4A25;

  --f-display: 'Fraunces', 'Noto Sans Arabic', Georgia, serif;
  --f-mono:    'Noto Sans Arabic', ui-sans-serif, system-ui, sans-serif;

  background: var(--c-bg);
  color: var(--c-text);
  font-family: var(--f-mono);
  min-height: 100vh;
  overflow-x: hidden;
}

/* ── Typography helpers ───────────────────────────────────────── */
.atelier-label {
  display: block;
  font-family: var(--f-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--c-gold);
  margin-bottom: 10px;
  opacity: 0;
  transform: translateY(6px);
  animation: fadeUp 0.6s ease forwards;
  animation-delay: var(--delay, 0ms);
}
.atelier-label--light { color: var(--c-gold); }

.atelier-section-title {
  font-family: var(--f-display);
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.05;
  color: var(--c-text);
}

.atelier-ghost-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--f-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--c-sub);
  text-decoration: none;
  transition: color 0.25s;
}
.atelier-ghost-link:hover { color: var(--c-gold); }
.atelier-ghost-link svg { transition: transform 0.25s; }
.atelier-ghost-link:hover svg { transform: translateX(4px); }

.atelier-ghost-link--desktop { display: none; }
@media (min-width: 640px) { .atelier-ghost-link--desktop { display: inline-flex; } }

.atelier-cta {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 14px 28px;
  border: 1px solid rgba(11,74,37,0.24);
  font-family: var(--f-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--c-text);
  text-decoration: none;
  position: relative;
  overflow: hidden;
  transition: color 0.3s, border-color 0.3s;
  opacity: 0;
  transform: translateY(6px);
  animation: fadeUp 0.6s ease forwards;
  animation-delay: var(--delay, 0ms);
}
.atelier-cta::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--c-gold);
  transform: translateX(-101%);
  transition: transform 0.4s cubic-bezier(0.76, 0, 0.24, 1);
  z-index: 0;
}
.atelier-cta:hover::before { transform: translateX(0); }
.atelier-cta:hover { border-color: var(--c-gold); }
.atelier-cta span, .atelier-cta svg { position: relative; z-index: 1; }

.atelier-cta--light {
  border-color: rgba(11,74,37,0.34);
  color: var(--c-cream);
  opacity: 1;
  transform: none;
  animation: none;
}
.atelier-cta--light::before { background: var(--c-gold); }

/* ── Animations ───────────────────────────────────────────────── */
@keyframes fadeUp {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes progressFill {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

/* ── Hero ──────────────────────────────────────────────────────── */
.atelier-hero {
  position: relative;
  width: 100%;
  height: 100svh;
  min-height: 560px;
  max-height: 920px;
  overflow: hidden;
  background: var(--c-bg);
  border-bottom-right-radius: clamp(56px, 10vw, 150px);
}

.atelier-hero__slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
}
.atelier-hero__slide.is-active { opacity: 1; z-index: 1; }

.atelier-hero__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  filter: brightness(0.94) saturate(0.92);
  transition: transform 8s ease;
}
.atelier-hero__slide.is-active .atelier-hero__img {
  transform: scale(1.04);
}

.atelier-hero__veil {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 16% 42%, rgba(251,243,230,0.06) 0 20%, rgba(210,164,100,0.78) 21% 100%),
    linear-gradient(to right, rgba(215,174,112,0.94) 0%, rgba(225,190,135,0.52) 62%),
    linear-gradient(to top, rgba(251,243,230,0.68) 0%, transparent 52%);
}

.atelier-hero__body {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  padding: 0 clamp(24px, 6vw, 96px);
}

.atelier-hero__rule {
  width: 1px;
  height: 0;
  background: var(--c-gold);
  margin-right: clamp(20px, 3vw, 48px);
  flex-shrink: 0;
  transition: height 1s cubic-bezier(0.76, 0, 0.24, 1) 0.2s;
}
.atelier-hero__body.is-visible .atelier-hero__rule {
  height: clamp(120px, 20vh, 220px);
}

.atelier-hero__text {
  max-width: 560px;
}

.atelier-hero__title {
  font-family: var(--f-display);
  font-size: clamp(3rem, 7vw, 7rem);
  font-weight: 700;
  line-height: 0.97;
  letter-spacing: 0;
  color: var(--c-cream);
  margin-bottom: 20px;
  opacity: 0;
  transform: translateY(12px);
  animation: fadeUp 0.8s ease forwards;
  animation-delay: calc(var(--delay, 0ms) + 120ms);
}
.atelier-hero__body.is-visible .atelier-hero__title { }

.atelier-hero__sub {
  font-family: var(--f-mono);
  font-size: clamp(11px, 1.4vw, 14px);
  font-weight: 300;
  line-height: 1.7;
  color: rgba(29,36,25,0.72);
  margin-bottom: 36px;
  max-width: 340px;
  opacity: 0;
  transform: translateY(8px);
  animation: fadeUp 0.7s ease forwards;
  animation-delay: 280ms;
}

/* ── Hero nav ──────────────────────────────────────────────────── */
.atelier-hero__nav {
  position: absolute;
  bottom: 36px;
  right: clamp(24px, 5vw, 72px);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 18px;
}

.atelier-hero__count {
  font-family: var(--f-mono);
  font-size: 10px;
  font-weight: 300;
  letter-spacing: 0;
  color: var(--c-sub);
}

.atelier-hero__arrow {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--c-border);
  color: var(--c-sub);
  background: transparent;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.atelier-hero__arrow:hover {
  border-color: var(--c-gold);
  color: var(--c-gold);
}

.atelier-hero__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  height: 1px;
}

.atelier-hero__progress-bar {
  flex: 1;
  background: var(--c-border);
  position: relative;
  overflow: hidden;
}
.atelier-hero__progress-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--c-gold);
  transform: scaleX(0);
  transform-origin: left;
}
.atelier-hero__progress-bar.is-active::after {
  animation: progressFill 7s linear forwards;
}

/* ── Strip ─────────────────────────────────────────────────────── */
.atelier-strip {
  background: var(--c-surface);
  border-top: 1px solid var(--c-border);
  border-bottom: 1px solid var(--c-border);
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 14px 24px;
}

.atelier-strip__item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--f-mono);
  font-size: 9px;
  font-weight: 300;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--c-sub);
}
.atelier-strip__item svg { color: var(--c-gold); flex-shrink: 0; }

.atelier-strip__sep {
  width: 1px;
  height: 16px;
  background: var(--c-border);
  display: none;
}
@media (min-width: 640px) { .atelier-strip__sep { display: block; } }

/* ── Section header ─────────────────────────────────────────────── */
.atelier-section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 32px;
}
.atelier-section-head__left { display: flex; flex-direction: column; }

/* ── Categories ─────────────────────────────────────────────────── */
.atelier-cats {
  padding: clamp(48px, 7vw, 96px) clamp(24px, 6vw, 80px);
  max-width: 1400px;
  margin: 0 auto;
}

.atelier-cats__grid {
  display: flex;
  flex-direction: column;
  gap: 18px;
  background: transparent;
}
@media (min-width: 768px) {
  .atelier-cats__grid {
    display: grid;
    grid-template-columns: 1.6fr 1fr 1fr;
    grid-template-rows: auto auto;
  }
  .atelier-cats__item--0 {
    grid-row: span 2;
  }
}

.atelier-cats__item {
  display: block;
  text-decoration: none;
  position: relative;
  background: var(--c-surface);
  overflow: hidden;
  border: 1px solid rgba(228,197,143,0.48);
  border-radius: 26px 26px 32px 0;
  box-shadow: 0 18px 48px rgba(69, 47, 20, 0.08);
}

.atelier-cats__img-wrap {
  position: relative;
  width: 100%;
  height: 220px;
}
@media (min-width: 768px) {
  .atelier-cats__item--0 .atelier-cats__img-wrap { height: 480px; }
  .atelier-cats__item:not(.atelier-cats__item--0) .atelier-cats__img-wrap { height: 238px; }
}

.atelier-cats__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.96) saturate(0.9);
  transition: filter 0.5s ease, transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.atelier-cats__item:hover .atelier-cats__img {
  filter: brightness(1) saturate(0.98);
  transform: scale(1.04);
}

.atelier-cats__img-placeholder {
  width: 100%;
  height: 100%;
  background: var(--c-surface);
}

.atelier-cats__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(251,243,230,0.78) 0%, transparent 58%);
  pointer-events: none;
}

.atelier-cats__meta {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-top: 1px solid var(--c-border);
  background: var(--c-surface);
  transition: background 0.25s;
}
.atelier-cats__item:hover .atelier-cats__meta { background: var(--c-surface-2); }

.atelier-cats__num {
  font-family: var(--f-mono);
  font-size: 9px;
  font-weight: 300;
  letter-spacing: 0;
  color: var(--c-gold);
  flex-shrink: 0;
}

.atelier-cats__info { flex: 1; }

.atelier-cats__name {
  font-family: var(--f-display);
  font-size: 1.15rem;
  font-weight: 400;
  color: var(--c-text);
  line-height: 1.2;
  margin: 0 0 2px;
}

.atelier-cats__count {
  font-family: var(--f-mono);
  font-size: 9px;
  letter-spacing: 0;
  color: var(--c-muted);
  text-transform: uppercase;
}

.atelier-cats__arrow {
  color: var(--c-muted);
  flex-shrink: 0;
  transition: color 0.25s, transform 0.25s;
}
.atelier-cats__item:hover .atelier-cats__arrow {
  color: var(--c-gold);
  transform: translateX(4px);
}

.atelier-cats__overflow {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 20px;
}

.atelier-tag {
  display: inline-block;
  padding: 7px 14px;
  border: 1px solid var(--c-border);
  font-family: var(--f-mono);
  font-size: 9px;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--c-sub);
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s;
}
.atelier-tag:hover { border-color: var(--c-gold); color: var(--c-gold); }

/* ── Divider ─────────────────────────────────────────────────────── */
.atelier-divider {
  height: 1px;
  background: var(--c-border);
  margin: 0 clamp(24px, 6vw, 80px);
}

/* ── Products rail ───────────────────────────────────────────────── */
.atelier-products {
  padding: clamp(40px, 6vw, 80px) clamp(24px, 6vw, 80px);
  max-width: 1400px;
  margin: 0 auto;
}
.atelier-products--sellers { margin-top: 0; }

.atelier-products__rail {
  display: flex;
  gap: 16px;
  overflow-x: scroll;
  padding-bottom: 4px;
  scrollbar-width: none;
  scroll-behavior: auto;
}
.atelier-products__rail::-webkit-scrollbar { display: none; }

.atelier-products__card {
  flex-shrink: 0;
  width: calc((100% - 16px) / 2);
}
@media (min-width: 640px) {
  .atelier-products__card { width: clamp(200px, 22vw, 260px); }
}

.atelier-products__skeleton {
  display: flex;
  gap: 16px;
}
.atelier-products__skel-card {
  flex-shrink: 0;
  width: calc((100% - 16px) / 2);
  height: 340px;
  background: var(--c-surface);
  animation: pulse 1.4s ease-in-out infinite;
}
@media (min-width: 640px) {
  .atelier-products__skel-card { width: 240px; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

.atelier-products__mobile-link {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}
@media (min-width: 640px) { .atelier-products__mobile-link { display: none; } }

/* ── Manifesto ───────────────────────────────────────────────────── */
.atelier-manifesto {
  background: var(--c-surface);
  border-top: 1px solid var(--c-border);
  border-bottom: 1px solid var(--c-border);
  padding: clamp(60px, 10vw, 120px) clamp(24px, 6vw, 80px);
  position: relative;
  overflow: hidden;
}
.atelier-manifesto::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 400px;
  height: 400px;
  border: 1px solid var(--c-border);
  border-radius: 50%;
  opacity: 0.35;
}
.atelier-manifesto::after {
  content: '';
  position: absolute;
  bottom: -80px;
  right: 40px;
  width: 240px;
  height: 240px;
  border: 1px solid var(--c-border);
  border-radius: 50%;
  opacity: 0.2;
}

.atelier-manifesto__inner {
  max-width: 700px;
  position: relative;
  z-index: 1;
}

.atelier-manifesto__eyebrow {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
}
.atelier-manifesto__line {
  height: 1px;
  width: 48px;
  background: var(--c-gold);
}
.atelier-manifesto__eyebrow .atelier-label {
  opacity: 1;
  transform: none;
  animation: none;
  margin: 0;
}

.atelier-manifesto__quote {
  font-family: var(--f-display);
  font-size: clamp(2.8rem, 6vw, 5.5rem);
  font-weight: 300;
  line-height: 1.02;
  letter-spacing: 0;
  color: var(--c-cream);
  margin: 0 0 28px;
}
.atelier-manifesto__quote em {
  font-style: italic;
  color: var(--c-gold);
}

.atelier-manifesto__body {
  font-family: var(--f-mono);
  font-size: 12px;
  font-weight: 300;
  line-height: 1.9;
  color: var(--c-sub);
  margin-bottom: 40px;
}
</style>
