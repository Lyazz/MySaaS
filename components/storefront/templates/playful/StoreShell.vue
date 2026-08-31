<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import StoreThemeProvider from './ThemeProvider.vue'
import { CONTACT_INFO_DEF_BY_KIND, buildContactInfoHref, type ContactInfoKind } from '~/shared/contact-infos'
import { buildActiveProductPricing } from '~/shared/pricing/product-pricing'

defineProps<{
    hideNavigation?: boolean
    mobileHeaderHidden?: boolean
    hideAnnouncementBar?: boolean
}>()

const cartStore = useCartStore()
const favorites = useFavorites()
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')
const storeSettings = useState<any>('storeSettings')
const storefrontContent = useStorefrontContent()
const legalLinks = useStoreLegalLinks()
const { format: formatCurrency } = useCurrency()

/* ── Contact rails ─────────────────────────────────────────────────── */

type ContactInfoRow = { id: string; kind: ContactInfoKind; label?: string | null; value: string; position?: number; isActive?: boolean }
const contactInfos = useState<ContactInfoRow[]>('contactInfos', () => [])
const activeContactInfos = computed(() => (contactInfos.value || []).filter((i) => i && (i.isActive ?? true) !== false))
const primaryContactInfos = computed(() =>
    activeContactInfos.value.filter((i) => CONTACT_INFO_DEF_BY_KIND[i.kind].category !== 'social')
)
const socialContactInfos = computed(() =>
    activeContactInfos.value.filter((i) => CONTACT_INFO_DEF_BY_KIND[i.kind].category === 'social')
)
const socialContactInfosWithHref = computed(() =>
    socialContactInfos.value
        .map((i) => ({ ...i, href: hrefFor(i) }))
        .filter((i): i is ContactInfoRow & { href: string } => Boolean(i.href))
)
const kindDef = (kind: ContactInfoKind) => CONTACT_INFO_DEF_BY_KIND[kind]
const hrefFor = (info: ContactInfoRow) => buildContactInfoHref(info.kind, info.value)
const isExternalHref = (href: string) => /^https?:\/\//i.test(href)

/* ── Category tree (the nav rail needs parents + their children) ───── */

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: tenantCategories } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders(),
})

const rootCategories = computed(() => {
    const all = tenantCategories.value || []
    const roots = all.filter((c) => !c.parentId)
    /* A flat catalogue (no parents declared) still deserves a full nav bar. */
    if (roots.length === 0) return all
    return roots
})

const childrenOf = (parentId: string) => (tenantCategories.value || []).filter((c) => c.parentId === parentId)

/* ── Nav bar horizontal scroll (babyshop-style chevrons) ───────────── */

const navScroller = ref<HTMLElement | null>(null)
const navCanScrollStart = ref(false)
const navCanScrollEnd = ref(false)

const syncNavArrows = () => {
    const el = navScroller.value
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    /* `scrollLeft` goes negative in RTL, so compare on magnitude. */
    const pos = Math.abs(el.scrollLeft)
    navCanScrollStart.value = pos > 4
    navCanScrollEnd.value = max - pos > 4
}

const scrollNav = (direction: 1 | -1) => {
    const el = navScroller.value
    if (!el) return
    el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.7), behavior: 'smooth' })
}

onMounted(() => {
    syncNavArrows()
    window.addEventListener('resize', syncNavArrows)
})
onUnmounted(() => window.removeEventListener('resize', syncNavArrows))
watch(tenantCategories, () => nextTick(syncNavArrows))

/* ── Mobile drawer ─────────────────────────────────────────────────── */

const mobileMenuOpen = ref(false)
const mobileCategoriesDropdownOpen = ref(false)
watch(mobileMenuOpen, (open) => {
    if (!open) mobileCategoriesDropdownOpen.value = false
})

/* ── Search ────────────────────────────────────────────────────────── */

const searchQuery = ref('')
const searchResults = ref<any[]>([])
const searchLoading = ref(false)
const isSearchDropdownOpen = ref(false)
const searchSuggestionLimit = 5
const visibleSearchResultCount = ref(searchSuggestionLimit)
const visibleSearchResults = computed(() => searchResults.value.slice(0, visibleSearchResultCount.value))
const hasMoreSearchResults = computed(() => searchResults.value.length > visibleSearchResultCount.value)
const showMoreSearchResults = () => { visibleSearchResultCount.value += searchSuggestionLimit }

const applySearchResultPricing = (products: any[]) => (Array.isArray(products) ? products : []).map((product: any) => {
    const pricing = buildActiveProductPricing(product)
    return {
        ...product,
        effectivePrice: pricing.effectivePrice,
        promotionDiscountPercent: pricing.promotionDiscountPercent
    }
})

let searchTimeout: any

watch(searchQuery, (newVal) => {
    if (newVal.length >= 3) {
        searchLoading.value = true
        isSearchDropdownOpen.value = true
        visibleSearchResultCount.value = searchSuggestionLimit
        clearTimeout(searchTimeout)
        searchTimeout = setTimeout(async () => {
            try {
                const url = useTenantApiUrl('/api/products')
                const data = await $fetch(url, { headers: useTenantApiHeaders(), query: { q: newVal } })
                searchResults.value = applySearchResultPricing(data || [])
            } catch (e) { console.error('Search error:', e) }
            finally { searchLoading.value = false }
        }, 500)
    } else {
        searchResults.value = []
        visibleSearchResultCount.value = searchSuggestionLimit
        isSearchDropdownOpen.value = false
    }
})

const openSearchDropdown = () => {
    if (searchQuery.value.length >= 3) isSearchDropdownOpen.value = true
}
/*
 * Blur fires before the suggestion's click lands, so the close is deferred.
 * It lives in the script because Vue templates cannot reach `setTimeout`.
 */
const closeSearchDropdownSoon = () => {
    setTimeout(() => { isSearchDropdownOpen.value = false }, 200)
}
</script>

<template>
  <StoreThemeProvider>
    <div class="min-h-screen flex flex-col">
      <StorefrontSharedAnnouncementBar
        v-if="!hideNavigation && !hideAnnouncementBar"
        background-color="bg-[#ED5A96]"
        text-color="text-white"
      />
      <StorefrontSharedClearanceBanner v-if="!hideNavigation && !hideAnnouncementBar" />
      <StorefrontSharedClearanceAnnouncementDialog />

      <!-- ══ Main bar — logo · search · actions ═════════════════════════ -->
      <header
        v-if="!hideNavigation"
        :class="['bg-[var(--kw-surface)] sticky top-0 z-50 border-b border-[var(--kw-line-soft)]', { 'hidden md:block': mobileHeaderHidden }]"
      >
        <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div class="h-[4.5rem] flex items-center gap-4 lg:gap-8">
            <!-- Logo -->
            <NuxtLink
              to="/"
              class="flex-shrink-0 flex items-center gap-2.5 group"
            >
              <template v-if="storeSettings?.logoUrl">
                <img
                  :src="storeSettings.logoUrl"
                  :alt="tenantName"
                  class="h-10 max-w-[150px] object-contain"
                >
              </template>
              <template v-else>
                <span
                  class="h-11 w-11 kw-blob kw-blob-hover flex items-center justify-center text-white shrink-0"
                  style="background: linear-gradient(140deg, var(--kw-pink), var(--kw-lilac))"
                >
                  <Icon
                    name="lucide:candy"
                    class="w-5 h-5"
                  />
                </span>
              </template>
              <span class="kw-display text-[1.35rem] group-hover:text-[var(--kw-pink-deep)] transition-colors truncate max-w-[7.5rem] sm:max-w-none">{{ tenantName }}</span>
            </NuxtLink>

            <!-- Search — the widest thing on the bar, babyshop-style -->
            <div class="flex-1 min-w-0 hidden md:block">
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  :placeholder="storefrontContent.search?.placeholder || 'Search products...'"
                  class="kw-field h-12 pe-12 bg-[var(--kw-cream-2)] border-transparent"
                  @focus="openSearchDropdown"
                  @blur="closeSearchDropdownSoon"
                >
                <span class="absolute inset-y-0 end-1.5 flex items-center">
                  <span
                    class="w-9 h-9 rounded-full flex items-center justify-center text-white"
                    style="background: var(--kw-brand)"
                  >
                    <Icon
                      name="lucide:search"
                      class="w-4 h-4"
                    />
                  </span>
                </span>

                <!-- Suggestions -->
                <div
                  v-show="isSearchDropdownOpen"
                  class="kw-card absolute top-[calc(100%+10px)] inset-x-0 z-50 overflow-hidden p-1.5"
                >
                  <div
                    v-if="searchLoading"
                    class="px-4 py-3 text-sm font-semibold text-[var(--kw-ink-soft)]"
                  >
                    {{ storefrontContent.search?.searching || 'Searching…' }}
                  </div>
                  <div
                    v-else-if="searchResults.length === 0"
                    class="px-4 py-3 text-sm font-semibold text-[var(--kw-ink-soft)]"
                  >
                    {{ storefrontContent.search?.noResults || 'No products found.' }}
                  </div>
                  <div
                    v-else
                    class="flex flex-col"
                  >
                    <NuxtLink
                      v-for="product in visibleSearchResults"
                      :key="product.id"
                      :to="'/product/' + product.slug"
                      class="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[var(--kw-pink-soft)] transition-colors"
                      @click="isSearchDropdownOpen = false"
                    >
                      <img
                        :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'"
                        class="w-11 h-11 object-cover kw-blob border border-[var(--kw-line)]"
                        :alt="product.title"
                      >
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-bold truncate">
                          {{ product.title }}
                        </div>
                        <div class="text-xs kw-num text-[var(--kw-pink-deep)] mt-0.5">
                          {{ formatCurrency(product.effectivePrice ?? product.price) }}
                          <span
                            v-if="product.promotionDiscountPercent"
                            class="ms-1 kw-badge kw-badge-sale"
                          >-{{ product.promotionDiscountPercent }}%</span>
                        </div>
                      </div>
                    </NuxtLink>
                    <button
                      v-if="hasMoreSearchResults"
                      type="button"
                      class="w-full px-4 py-3 text-start text-sm font-extrabold text-[var(--kw-pink-deep)] hover:bg-[var(--kw-pink-soft)] rounded-2xl transition-colors"
                      @mousedown.prevent
                      @click="showMoreSearchResults"
                    >
                      {{ storefrontContent.search?.seeMore || 'See more' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 ms-auto md:ms-0 flex-shrink-0">
              <LocaleSwitcher class="hidden sm:inline-flex" />

              <button
                class="kw-icon-btn relative"
                :title="storefrontContent.header.wishlistTitle"
                :aria-label="storefrontContent.header.wishlistTitle"
                @click="navigateTo('/wishlist')"
              >
                <Icon
                  name="lucide:heart"
                  class="w-5 h-5"
                />
                <ClientOnly>
                  <span
                    v-if="favorites.count.value > 0"
                    class="kw-pop absolute -top-1 -end-1 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-[var(--kw-pink-deep)] text-white text-[10px] font-extrabold flex items-center justify-center"
                  >{{ favorites.count.value }}</span>
                </ClientOnly>
              </button>

              <NuxtLink
                v-if="storeSettings?.cartEnabled !== false"
                to="/cart"
                class="kw-btn kw-btn-sm relative h-[2.6rem]"
              >
                <Icon
                  name="lucide:shopping-bag"
                  class="w-4 h-4"
                />
                <span class="hidden lg:inline">{{ storefrontContent.cart.title }}</span>
                <ClientOnly>
                  <span
                    v-if="cartStore.itemCount > 0"
                    class="kw-pop min-w-[1.3rem] h-[1.3rem] px-1 rounded-full bg-white/95 text-[var(--kw-ink)] text-[11px] font-extrabold flex items-center justify-center"
                  >{{ cartStore.itemCount }}</span>
                </ClientOnly>
              </NuxtLink>

              <button
                class="kw-icon-btn md:!hidden"
                :aria-label="$t('storefront.nav.menu')"
                @click="mobileMenuOpen = true"
              >
                <Icon
                  name="lucide:menu"
                  class="w-5 h-5"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- ══ Category rail ════════════════════════════════════════════ -->
        <div class="hidden md:block border-t border-[var(--kw-line-soft)] relative">
          <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
            <button
              v-show="navCanScrollStart"
              type="button"
              class="absolute start-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[var(--kw-surface)] border border-[var(--kw-line)] flex items-center justify-center text-[var(--kw-ink-soft)] hover:text-[var(--kw-pink-deep)] shadow-sm"
              :aria-label="$t('storefront.nav.previous')"
              @click="scrollNav(-1)"
            >
              <Icon
                name="lucide:chevron-left"
                class="w-4 h-4 rtl:rotate-180"
              />
            </button>

            <nav
              ref="navScroller"
              class="flex items-stretch gap-1 overflow-x-auto kw-hide-scroll h-12"
              @scroll="syncNavArrows"
            >
              <NuxtLink
                to="/products"
                class="flex items-center px-3.5 text-sm font-extrabold whitespace-nowrap transition-colors border-b-[3px]"
                :class="$route.path === '/products'
                  ? 'text-[var(--kw-pink-deep)] border-[var(--kw-pink)]'
                  : 'text-[var(--kw-ink)] border-transparent hover:text-[var(--kw-pink-deep)]'"
              >
                {{ storefrontContent.nav.shop }}
              </NuxtLink>

              <div
                v-for="cat in rootCategories"
                :key="cat.id"
                class="group relative flex items-stretch"
              >
                <NuxtLink
                  :to="`/category/${cat.slug}`"
                  class="flex items-center gap-1 px-3.5 text-sm font-extrabold whitespace-nowrap text-[var(--kw-ink)] hover:text-[var(--kw-pink-deep)] transition-colors border-b-[3px] border-transparent group-hover:border-[var(--kw-pink)]"
                >
                  {{ cat.title }}
                  <Icon
                    v-if="childrenOf(cat.id).length"
                    name="lucide:chevron-down"
                    class="w-3.5 h-3.5 opacity-60"
                  />
                </NuxtLink>

                <div
                  v-if="childrenOf(cat.id).length"
                  class="kw-card absolute top-full start-0 mt-1 w-60 p-2 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 z-50"
                >
                  <NuxtLink
                    v-for="child in childrenOf(cat.id)"
                    :key="child.id"
                    :to="`/category/${child.slug}`"
                    class="flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl text-sm font-bold text-[var(--kw-ink)] hover:bg-[var(--kw-pink-soft)] hover:text-[var(--kw-pink-deep)] transition-colors"
                  >
                    {{ child.title }}
                    <span
                      v-if="child._count?.products"
                      class="text-[11px] font-extrabold text-[var(--kw-ink-faint)]"
                    >{{ child._count.products }}</span>
                  </NuxtLink>
                </div>
              </div>

              <NuxtLink
                to="/contact"
                class="flex items-center px-3.5 text-sm font-extrabold whitespace-nowrap transition-colors border-b-[3px]"
                :class="$route.path === '/contact'
                  ? 'text-[var(--kw-pink-deep)] border-[var(--kw-pink)]'
                  : 'text-[var(--kw-ink)] border-transparent hover:text-[var(--kw-pink-deep)]'"
              >
                {{ storefrontContent.nav.contact }}
              </NuxtLink>
            </nav>

            <button
              v-show="navCanScrollEnd"
              type="button"
              class="absolute end-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[var(--kw-surface)] border border-[var(--kw-line)] flex items-center justify-center text-[var(--kw-ink-soft)] hover:text-[var(--kw-pink-deep)] shadow-sm"
              :aria-label="$t('storefront.nav.next')"
              @click="scrollNav(1)"
            >
              <Icon
                name="lucide:chevron-right"
                class="w-4 h-4 rtl:rotate-180"
              />
            </button>
          </div>
        </div>
      </header>

      <!-- ══ Mobile drawer ══════════════════════════════════════════════ -->
      <Teleport to="body">
        <Transition name="kw-fade">
          <div
            v-if="mobileMenuOpen"
            class="fixed inset-0 bg-[#4A2E4D]/45 z-[60]"
            @click="mobileMenuOpen = false"
          />
        </Transition>
        <Transition name="kw-slide">
          <div
            v-if="mobileMenuOpen"
            class="kw-theme fixed top-0 start-0 bottom-0 w-[86%] max-w-xs bg-[var(--kw-cream)] z-[61] shadow-2xl flex flex-col overflow-y-auto"
          >
            <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--kw-line)]">
              <span class="kw-display text-lg">{{ tenantName }}</span>
              <button
                class="kw-icon-btn w-9 h-9"
                :aria-label="$t('storefront.nav.closeMenu')"
                @click="mobileMenuOpen = false"
              >
                <Icon
                  name="lucide:x"
                  class="w-5 h-5"
                />
              </button>
            </div>

            <div class="px-4 py-4">
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  :placeholder="storefrontContent.search?.placeholder || 'Search...'"
                  class="kw-field pe-11"
                  @focus="openSearchDropdown"
                  @blur="closeSearchDropdownSoon"
                >
                <Icon
                  name="lucide:search"
                  class="w-4 h-4 text-[var(--kw-ink-faint)] absolute end-4 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <div
                  v-show="isSearchDropdownOpen"
                  class="kw-card absolute top-[calc(100%+8px)] inset-x-0 z-50 p-1.5"
                >
                  <div
                    v-if="searchLoading"
                    class="px-4 py-3 text-sm font-semibold text-[var(--kw-ink-soft)]"
                  >
                    {{ storefrontContent.search?.searching || 'Searching…' }}
                  </div>
                  <div
                    v-else-if="searchResults.length === 0"
                    class="px-4 py-3 text-sm font-semibold text-[var(--kw-ink-soft)]"
                  >
                    {{ storefrontContent.search?.noResults || 'No products found.' }}
                  </div>
                  <NuxtLink
                    v-for="product in visibleSearchResults"
                    v-else
                    :key="product.id"
                    :to="'/product/' + product.slug"
                    class="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[var(--kw-pink-soft)] transition-colors"
                    @click="isSearchDropdownOpen = false; mobileMenuOpen = false"
                  >
                    <img
                      :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'"
                      class="w-10 h-10 object-cover kw-blob"
                      :alt="product.title"
                    >
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-bold truncate">
                        {{ product.title }}
                      </div>
                      <div class="text-xs kw-num text-[var(--kw-pink-deep)]">
                        {{ formatCurrency(product.effectivePrice ?? product.price) }}
                      </div>
                    </div>
                  </NuxtLink>
                </div>
              </div>
            </div>

            <nav class="flex flex-col px-4 gap-1">
              <NuxtLink
                to="/"
                class="py-3 px-3 rounded-2xl text-sm font-extrabold hover:bg-[var(--kw-pink-soft)] transition-colors"
                @click="mobileMenuOpen = false"
              >
                {{ storefrontContent.nav.home }}
              </NuxtLink>
              <NuxtLink
                to="/products"
                class="py-3 px-3 rounded-2xl text-sm font-extrabold hover:bg-[var(--kw-pink-soft)] transition-colors"
                @click="mobileMenuOpen = false"
              >
                {{ storefrontContent.nav.shop }}
              </NuxtLink>
              <NuxtLink
                to="/contact"
                class="py-3 px-3 rounded-2xl text-sm font-extrabold hover:bg-[var(--kw-pink-soft)] transition-colors"
                @click="mobileMenuOpen = false"
              >
                {{ storefrontContent.nav.contact }}
              </NuxtLink>
            </nav>

            <div
              v-if="tenantCategories && tenantCategories.length"
              class="px-4 py-3"
            >
              <button
                type="button"
                class="w-full flex items-center justify-between text-start py-2"
                @click="mobileCategoriesDropdownOpen = !mobileCategoriesDropdownOpen"
              >
                <span class="kw-kicker">{{ storefrontContent.nav.categories || 'Categories' }}</span>
                <Icon
                  name="lucide:chevron-down"
                  class="w-4 h-4 text-[var(--kw-ink-faint)] transition-transform"
                  :class="mobileCategoriesDropdownOpen ? 'rotate-180' : ''"
                />
              </button>
              <div
                v-show="mobileCategoriesDropdownOpen"
                class="flex flex-col gap-1 pt-1"
              >
                <NuxtLink
                  v-for="cat in tenantCategories"
                  :key="cat.id"
                  :to="'/category/' + cat.slug"
                  class="py-2 px-3 rounded-2xl text-sm font-bold text-[var(--kw-ink-soft)] hover:bg-[var(--kw-pink-soft)] hover:text-[var(--kw-pink-deep)] transition-colors"
                  :class="cat.parentId ? 'ms-3' : ''"
                  @click="mobileMenuOpen = false"
                >
                  {{ cat.title }}
                </NuxtLink>
              </div>
            </div>

            <div class="mt-auto px-4 py-4 border-t border-[var(--kw-line)]">
              <div class="flex items-center justify-between gap-3 mb-3">
                <LocaleSwitcher />
              </div>
              <NuxtLink
                v-if="storeSettings?.cartEnabled !== false"
                to="/cart"
                class="kw-btn w-full"
                @click="mobileMenuOpen = false"
              >
                <Icon
                  name="lucide:shopping-bag"
                  class="w-5 h-5"
                />
                {{ storefrontContent.cart.title }}
                <span
                  v-if="cartStore.itemCount > 0"
                  class="min-w-[1.3rem] h-[1.3rem] px-1 rounded-full bg-white/95 text-[var(--kw-ink)] text-[11px] font-extrabold flex items-center justify-center"
                >{{ cartStore.itemCount }}</span>
              </NuxtLink>
            </div>
          </div>
        </Transition>
      </Teleport>

      <main class="flex-grow">
        <slot />
      </main>

      <!-- ══ Pre-footer candy band (babyshop's newsletter slot) ═════════ -->
      <section
        v-if="!hideNavigation"
        class="kw-sprinkles kw-scallop relative overflow-hidden"
        style="background: linear-gradient(135deg, var(--kw-lilac-soft), var(--kw-pink-soft) 55%, var(--kw-lemon-soft));
               --kw-scallop-fill: #3B2440"
      >
        <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 relative">
          <div class="max-w-2xl">
            <p class="kw-kicker mb-3">
              {{ storefrontContent.footer.contact }}
            </p>
            <h2 class="kw-display text-3xl md:text-[2.6rem] mb-4">
              {{ storefrontContent.home.welcomeTo(tenantName) }}
            </h2>
            <p class="kw-lede mb-8">
              {{ storefrontContent.cart.empty.subtitle }}
            </p>
            <div class="flex flex-wrap items-center gap-3">
              <NuxtLink
                to="/products"
                class="kw-btn kw-btn-lg"
              >
                {{ storefrontContent.cart.empty.cta }}
                <Icon
                  name="lucide:arrow-right"
                  class="w-4 h-4 rtl:rotate-180"
                />
              </NuxtLink>
              <a
                v-for="info in socialContactInfosWithHref"
                :key="info.id"
                :href="info.href"
                class="kw-icon-btn"
                :title="info.label || kindDef(info.kind).iconName"
                :target="isExternalHref(info.href) ? '_blank' : undefined"
                :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
              >
                <Icon
                  :name="kindDef(info.kind).iconName"
                  class="w-4 h-4"
                />
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- ══ Footer ═════════════════════════════════════════════════════ -->
      <footer class="bg-[#3B2440] text-[#E9D9EE] pt-16 pb-9">
        <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div class="md:col-span-2">
              <h3 class="kw-display text-2xl !text-white mb-5">
                {{ tenantName }}
              </h3>
              <ul
                v-if="primaryContactInfos.length"
                class="space-y-3 text-sm"
              >
                <li
                  v-for="info in primaryContactInfos"
                  :key="info.id"
                  class="flex items-start gap-3"
                >
                  <span class="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon
                      :name="kindDef(info.kind).iconName"
                      class="w-3.5 h-3.5 text-[var(--kw-lemon)]"
                    />
                  </span>
                  <a
                    v-if="hrefFor(info)"
                    :href="hrefFor(info)!"
                    class="font-semibold hover:text-white transition-colors pt-1"
                    :target="isExternalHref(hrefFor(info)!) ? '_blank' : undefined"
                    :rel="isExternalHref(hrefFor(info)!) ? 'noopener noreferrer' : undefined"
                  >{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</a>
                  <span
                    v-else
                    class="font-semibold pt-1"
                  >{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                </li>
              </ul>
            </div>

            <div v-if="legalLinks.contact.enabled">
              <h4 class="kw-kicker !text-[var(--kw-sky)] mb-5">
                {{ storefrontContent.footer.contact }}
              </h4>
              <ul class="space-y-3 text-sm">
                <li>
                  <NuxtLink
                    :to="legalLinks.contact.path"
                    class="font-semibold hover:text-white transition-colors"
                  >
                    {{ storefrontContent.footer.contactUs }}
                  </NuxtLink>
                </li>
              </ul>
            </div>

            <div v-if="legalLinks.terms.enabled || legalLinks.privacy.enabled || legalLinks.returns.enabled">
              <h4 class="kw-kicker !text-[var(--kw-mint)] mb-5">
                {{ storefrontContent.footer.termsPrivacy }}
              </h4>
              <ul class="space-y-3 text-sm">
                <li v-if="legalLinks.terms.enabled">
                  <NuxtLink
                    :to="legalLinks.terms.path"
                    class="font-semibold hover:text-white transition-colors"
                  >
                    {{ storefrontContent.footer.termsOfService }}
                  </NuxtLink>
                </li>
                <li v-if="legalLinks.privacy.enabled">
                  <NuxtLink
                    :to="legalLinks.privacy.path"
                    class="font-semibold hover:text-white transition-colors"
                  >
                    {{ storefrontContent.footer.privacyPolicy }}
                  </NuxtLink>
                </li>
                <li v-if="legalLinks.returns.enabled">
                  <NuxtLink
                    :to="legalLinks.returns.path"
                    class="font-semibold hover:text-white transition-colors"
                  >
                    {{ storefrontContent.footer.returnPolicy }}
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </div>

          <div class="pt-7 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm font-semibold text-[#B79EC0]">
            <span>{{ storefrontContent.footer.copyright(tenantName) }}</span>
            <StorefrontSharedPoweredBy />
          </div>
        </div>
      </footer>
    </div>
  </StoreThemeProvider>
</template>

<style scoped>
.kw-fade-enter-active, .kw-fade-leave-active { transition: opacity .25s ease; }
.kw-fade-enter-from, .kw-fade-leave-to { opacity: 0; }
.kw-slide-enter-active, .kw-slide-leave-active { transition: transform .32s cubic-bezier(.34, 1.4, .64, 1); }
.kw-slide-enter-from, .kw-slide-leave-to { transform: translateX(-100%); }
</style>
