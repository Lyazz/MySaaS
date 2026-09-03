<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import StoreThemeProvider from './ThemeProvider.vue'
import { CONTACT_INFO_DEF_BY_KIND, buildContactInfoHref, type ContactInfoKind } from '~/shared/contact-infos'
import { buildActiveProductPricing } from '~/shared/pricing/product-pricing'

const cartStore = useCartStore()
const favorites = useFavorites()
const tenant = useState<any>('tenant')
// "Pistachio" was the design reference, not a tenant: never show it to a shopper.
const { t } = useI18n({ useScope: 'global' })
const tenantName = computed(() => tenant.value?.name || t('storefront.common.storeFallback'))
const storeSettings = useState<any>('storeSettings')
const storefrontContent = useStorefrontContent()
const legalLinks = useStoreLegalLinks()

const categoryDisplayTitle = (category: any): string => {
    if (!category) return ""
    return category.parentId ? ("-> " + category.title) : category.title
}

type ContactInfoRow = { id: string; kind: ContactInfoKind; label?: string | null; value: string; position?: number; isActive?: boolean }
const contactInfos = useState<ContactInfoRow[]>('contactInfos', () => [])
const activeContactInfos = computed(() => (contactInfos.value || []).filter((i) => i && (i.isActive ?? true) !== false))
const primaryContactInfos = computed(() =>
    activeContactInfos.value.filter((i) => CONTACT_INFO_DEF_BY_KIND[i.kind].category !== 'social')
)
const socialContactInfosWithHref = computed(() =>
    activeContactInfos.value
        .filter((i) => CONTACT_INFO_DEF_BY_KIND[i.kind].category === 'social')
        .map((i) => ({ ...i, href: buildContactInfoHref(i.kind, i.value) }))
        .filter((i): i is ContactInfoRow & { href: string } => Boolean(i.href))
)
const kindDef = (kind: ContactInfoKind) => CONTACT_INFO_DEF_BY_KIND[kind]
const hrefFor = (info: ContactInfoRow) => buildContactInfoHref(info.kind, info.value)
const isExternalHref = (href: string) => /^https?:\/\//i.test(href)
const { format: formatCurrency } = useCurrency()

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: tenantCategories } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders(),
})

const mobileMenuOpen = ref(false)
const mobileCategoriesDropdownOpen = ref(false)
watch(mobileMenuOpen, (open) => {
    if (!open) mobileCategoriesDropdownOpen.value = false
})
const scrolled = ref(false)
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const searchLoading = ref(false)
const isSearchDropdownOpen = ref(false)
const openSearchDropdown = () => {
    if (searchQuery.value.length >= 3) isSearchDropdownOpen.value = true
}
/*
 * Blur fires before the suggestion click lands, so the close is deferred.
 * It lives in the script because Vue templates cannot reach `setTimeout`.
 */
const closeSearchDropdownSoon = () => {
    setTimeout(() => { isSearchDropdownOpen.value = false }, 200)
}
const searchSuggestionLimit = 5
const visibleSearchResultCount = ref(searchSuggestionLimit)
const visibleSearchResults = computed(() => searchResults.value.slice(0, visibleSearchResultCount.value))
const hasMoreSearchResults = computed(() => searchResults.value.length > visibleSearchResultCount.value)
const showMoreSearchResults = () => {
    visibleSearchResultCount.value += searchSuggestionLimit
}
const applySearchResultPricing = (products: any[]) => (Array.isArray(products) ? products : []).map((product: any) => {
    const pricing = buildActiveProductPricing(product)
    return {
        ...product,
        effectivePrice: pricing.effectivePrice,
        promotionDiscountPercent: pricing.promotionDiscountPercent
    }
})
const searchOpen = ref(false)

const props = defineProps<{
    hideNavigation?: boolean
    mobileHeaderHidden?: boolean
    hideAnnouncementBar?: boolean
}>()

const currentYear = new Date().getFullYear()

onMounted(() => {
    const handleScroll = () => { scrolled.value = window.scrollY > 40 }
    window.addEventListener('scroll', handleScroll, { passive: true })
    onUnmounted(() => window.removeEventListener('scroll', handleScroll))
})

watch(searchQuery, async (q) => {
    if (q.length < 3) {
        searchResults.value = []
        visibleSearchResultCount.value = searchSuggestionLimit
        isSearchDropdownOpen.value = false
        return
    }
    searchLoading.value = true
    isSearchDropdownOpen.value = true
    visibleSearchResultCount.value = searchSuggestionLimit
    try {
        const url = useTenantApiUrl(`/api/products/search?q=${encodeURIComponent(q)}&limit=24`)
        const data = await $fetch<any[]>(url, { headers: useTenantApiHeaders() || {} })
        searchResults.value = applySearchResultPricing(Array.isArray(data) ? data : [])
    } catch {
        searchResults.value = []
    }
    finally { searchLoading.value = false }
})
</script>

<template>
  <StoreThemeProvider>
    <div class="shell">
      <StorefrontSharedAnnouncementBar v-if="!hideNavigation && !hideAnnouncementBar" />
      <StorefrontSharedClearanceBanner v-if="!hideNavigation && !hideAnnouncementBar" />
      <StorefrontSharedClearanceAnnouncementDialog />

      <!-- ── Header ───────────────────────────────────────────── -->
      <header
        v-if="!hideNavigation"
        class="shell-header"
        :class="[scrolled && 'is-scrolled', mobileHeaderHidden && 'mobile-hidden']"
      >
        <div class="shell-header__inner">
          <!-- Logo -->
          <NuxtLink to="/" class="shell-logo">
            <img v-if="storeSettings?.logoUrl" :src="storeSettings.logoUrl" :alt="tenantName" class="shell-logo__img">
            <span v-else class="shell-logo__text">{{ tenantName }}</span>
          </NuxtLink>

          <!-- Desktop nav -->
          <nav class="shell-nav">
            <NuxtLink to="/" class="shell-nav__link" active-class="is-active">
              {{ storefrontContent.nav.home }}
            </NuxtLink>
            <NuxtLink to="/products" class="shell-nav__link" active-class="is-active">
              {{ storefrontContent.nav.shop }}
            </NuxtLink>

            <div class="shell-nav__dropdown-wrap">
              <button class="shell-nav__link shell-nav__dropdown-trigger">
                {{ storefrontContent.nav.categories || 'Collections' }}
                <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
                  <path d="M1 1l3 3 3-3" stroke="currentColor" stroke-width="0.85"/>
                </svg>
              </button>
              <div class="shell-nav__dropdown">
                <NuxtLink
                  v-for="cat in tenantCategories"
                  :key="cat.id"
                  :to="`/category/${cat.slug}`"
                  class="shell-nav__dropdown-item"
                >{{ categoryDisplayTitle(cat) }}</NuxtLink>
              </div>
            </div>

            <NuxtLink to="/contact" class="shell-nav__link" active-class="is-active">
              {{ storefrontContent.nav.contact }}
            </NuxtLink>
          </nav>

          <!-- Actions -->
          <div class="shell-actions">
            <LocaleSwitcher class="shell-actions__locale" />

            <!-- Search -->
            <button class="shell-icon-btn" @click="searchOpen = !searchOpen">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="0.85"/>
                <path d="M11 11l3 3" stroke="currentColor" stroke-width="0.85"/>
              </svg>
            </button>

            <!-- Wishlist -->
            <button class="shell-icon-btn" :title="storefrontContent.header.wishlistTitle" @click="navigateTo('/wishlist')">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 13.5S1.5 9.5 1.5 5.5a3 3 0 015.5-1.7A3 3 0 0114.5 5.5C14.5 9.5 8 13.5 8 13.5z" stroke="currentColor" stroke-width="0.85"/>
              </svg>
              <ClientOnly>
                <span v-if="favorites.count.value > 0" class="shell-icon-btn__badge">{{ favorites.count.value }}</span>
              </ClientOnly>
            </button>

            <!-- Cart -->
            <NuxtLink v-if="storeSettings?.cartEnabled !== false" to="/cart" class="shell-icon-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 2h1.5l2 8h7l1.5-5H4.5" stroke="currentColor" stroke-width="0.85"/>
                <circle cx="7" cy="13" r="1" fill="currentColor"/>
                <circle cx="12" cy="13" r="1" fill="currentColor"/>
              </svg>
              <ClientOnly>
                <span v-if="cartStore.itemCount > 0" class="shell-icon-btn__badge">{{ cartStore.itemCount }}</span>
              </ClientOnly>
            </NuxtLink>

            <!-- Hamburger -->
            <button class="shell-hamburger" @click="mobileMenuOpen = true">
              <span /><span /><span />
            </button>
          </div>
        </div>

        <!-- Search bar slide-down -->
        <Transition name="search-bar">
          <div v-if="searchOpen" class="shell-search-bar">
            <div class="shell-search-bar__inner">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="shell-search-bar__icon">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="0.85"/>
                <path d="M11 11l3 3" stroke="currentColor" stroke-width="0.85"/>
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                :placeholder="storefrontContent.search.placeholder"
                class="shell-search-bar__input"
                autofocus
                @blur="closeSearchDropdownSoon"
                @focus="openSearchDropdown"
              >
              <button class="shell-search-bar__close" @click="searchOpen = false; searchQuery = ''">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="0.85"/>
                </svg>
              </button>
            </div>
            <!-- Results -->
            <div v-show="isSearchDropdownOpen" class="shell-search-results pointer-events-auto">
              <div v-if="searchLoading" class="shell-search-results__state">Recherche…</div>
              <div v-else-if="searchResults.length === 0" class="shell-search-results__state">Aucun résultat.</div>
              <NuxtLink
                v-for="product in visibleSearchResults"
                :key="product.id"
                :to="'/product/' + product.slug"
                class="shell-search-results__item"
                @click="searchOpen = false; searchQuery = ''"
              >
                <div class="shell-search-results__img">
                  <img :src="product.images?.[0] || '/blank.svg?v=2'" :alt="product.title">
                </div>
                <div class="shell-search-results__info">
                  <span class="shell-search-results__name">{{ product.title }}</span>
                  <span class="shell-search-results__price">{{ formatCurrency(product.effectivePrice ?? product.price) }}<span v-if="product.promotionDiscountPercent" class="shell-search-results__discount">-{{ product.promotionDiscountPercent }}%</span></span>
                </div>
              </NuxtLink>
              <button
                v-if="hasMoreSearchResults"
                type="button"
                class="w-full px-4 py-3 text-start text-sm font-semibold text-current hover:opacity-80 transition-opacity"
                @mousedown.prevent
                @click="showMoreSearchResults"
              >
                {{ storefrontContent.search.seeMore }}
              </button>
            </div>
          </div>
        </Transition>
      </header>

      <!-- ── Mobile Drawer ────────────────────────────────────── -->
      <Teleport to="body">
        <Transition name="overlay">
          <div v-if="mobileMenuOpen" class="shell-overlay" @click="mobileMenuOpen = false" />
        </Transition>
        <Transition name="drawer">
          <div v-if="mobileMenuOpen" class="shell-drawer">
            <div class="shell-drawer__head">
              <span class="shell-logo__text">{{ tenantName }}</span>
              <button class="shell-drawer__close" @click="mobileMenuOpen = false">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="0.85"/>
                </svg>
              </button>
            </div>

            <nav class="shell-drawer__nav">
              <NuxtLink to="/" class="shell-drawer__link" @click="mobileMenuOpen = false">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="shell-drawer__link" @click="mobileMenuOpen = false">{{ storefrontContent.nav.shop }}</NuxtLink>
              <NuxtLink to="/contact" class="shell-drawer__link" @click="mobileMenuOpen = false">{{ storefrontContent.nav.contact }}</NuxtLink>
            </nav>

            <div v-if="tenantCategories?.length" class="shell-drawer__cats">
  <button
    type="button"
    class="w-full flex items-center justify-between text-start"
    @click="mobileCategoriesDropdownOpen = !mobileCategoriesDropdownOpen"
  >
    <h4 class="shell-drawer__cats-title">
      {{ storefrontContent.nav.categories || 'Collections' }}
    </h4>
    <Icon
      name="lucide:chevron-down"
      class="shell-drawer__cats-icon"
      :class="mobileCategoriesDropdownOpen ? 'rotate-180' : ''"
    />
  </button>
  <div v-show="mobileCategoriesDropdownOpen" class="flex flex-col gap-1">
    <NuxtLink
      v-for="cat in tenantCategories"
      :key="cat.id"
      :to="'/category/' + cat.slug"
      class="shell-drawer__cat-link"
      @click="mobileMenuOpen = false"
    >
      {{ categoryDisplayTitle(cat) }}
    </NuxtLink>
  </div>
</div>
          </div>
        </Transition>
      </Teleport>

      <!-- ── Main ─────────────────────────────────────────────── -->
      <main class="shell-main"><slot /></main>

      <!-- ── Footer ───────────────────────────────────────────── -->
      <footer class="shell-footer">
        <div class="shell-footer__inner">
          <div class="shell-footer__grid">
            <!-- Brand -->
            <div class="shell-footer__brand">
              <span class="shell-logo__text" style="font-size:1.6rem;margin-bottom:16px;display:block">{{ tenantName }}</span>
              <p v-if="storeSettings?.description" class="shell-footer__tagline">{{ storeSettings.description }}</p>
              <ul v-if="primaryContactInfos.length" class="shell-footer__contacts">
                <li v-for="info in primaryContactInfos" :key="info.id" class="shell-footer__contact-item">
                  <Icon :name="kindDef(info.kind).iconName" class="shell-footer__contact-icon" />
                  <a
                    v-if="hrefFor(info)"
                    :href="hrefFor(info)!"
                    class="shell-footer__contact-link"
                    :target="isExternalHref(hrefFor(info)!) ? '_blank' : undefined"
                    :rel="isExternalHref(hrefFor(info)!) ? 'noopener noreferrer' : undefined"
                  >{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</a>
                  <span v-else class="shell-footer__contact-link">{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                </li>
              </ul>
              <div v-if="socialContactInfosWithHref.length" class="shell-footer__socials">
                <a
                  v-for="info in socialContactInfosWithHref"
                  :key="info.id"
                  :href="info.href"
                  class="shell-footer__social-btn"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="kindDef(info.kind).iconName" style="width:14px;height:14px" />
                </a>
              </div>
            </div>

            <!-- Collections -->
            <div>
              <span class="at-label" style="display:block;margin-bottom:16px">Collections</span>
              <ul class="shell-footer__links">
                <li v-for="cat in (tenantCategories || []).slice(0, 5)" :key="cat.id">
                  <NuxtLink :to="`/category/${cat.slug}`" class="shell-footer__link">{{ categoryDisplayTitle(cat) }}</NuxtLink>
                </li>
              </ul>
            </div>

            <!-- Service -->
            <div v-if="legalLinks.contact.enabled">
              <span class="at-label" style="display:block;margin-bottom:16px">{{ storefrontContent.footer.contact }}</span>
              <ul class="shell-footer__links">
                <li><NuxtLink v-if="legalLinks.contact.enabled" :to="legalLinks.contact.path" class="shell-footer__link">{{ storefrontContent.footer.contactUs }}</NuxtLink></li>
              </ul>
            </div>

            <!-- Legal -->
            <div v-if="legalLinks.terms.enabled || legalLinks.privacy.enabled || legalLinks.returns.enabled">
              <span class="at-label" style="display:block;margin-bottom:16px">{{ storefrontContent.footer.termsPrivacy }}</span>
              <ul class="shell-footer__links">
                <li><NuxtLink v-if="legalLinks.terms.enabled" :to="legalLinks.terms.path" class="shell-footer__link">{{ storefrontContent.footer.termsOfService }}</NuxtLink></li>
                <li><NuxtLink v-if="legalLinks.privacy.enabled" :to="legalLinks.privacy.path" class="shell-footer__link">{{ storefrontContent.footer.privacyPolicy }}</NuxtLink></li>
                <li><NuxtLink v-if="legalLinks.returns.enabled" :to="legalLinks.returns.path" class="shell-footer__link">{{ storefrontContent.footer.returnPolicy }}</NuxtLink></li>
              </ul>
            </div>
          </div>

          <div class="shell-footer__bottom">
            <span>{{ storefrontContent.footer.copyright(tenantName) }}</span>
            <span>Atelier · Algérie</span>
            <StorefrontSharedPoweredBy />
          </div>
        </div>
      </footer>
    </div>
  </StoreThemeProvider>
</template>

<style scoped>
/* ── Shell wrapper ──────────────────────────────────────────────── */
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.shell-main { flex: 1; }

/* ── Header ─────────────────────────────────────────────────────── */
.shell-header {
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid transparent;
  transition: background 0.4s, border-color 0.4s;
}
.shell-header.is-scrolled {
  background: rgba(250,242,227,0.88);
  backdrop-filter: blur(16px) saturate(1.2);
  border-color: var(--at-border);
  box-shadow: var(--at-shadow-xs);
}
.shell-header.mobile-hidden { display: none; }
@media (min-width: 1024px) { .shell-header.mobile-hidden { display: block; } }

.shell-header__inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 clamp(20px, 5vw, 64px);
  height: 64px;
  display: flex;
  align-items: center;
  gap: 32px;
}

/* ── Logo ───────────────────────────────────────────────────────── */
.shell-logo {
  flex-shrink: 0;
  text-decoration: none;
}
.shell-logo__img {
  height: 32px;
  max-width: 120px;
  object-fit: contain;
  filter: none;
}
.shell-logo__text {
  font-family: var(--at-f-display);
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--at-cream);
  text-decoration: none;
  transition: color 0.25s;
}
.shell-logo:hover .shell-logo__text { color: var(--at-gold-700); }

/* ── Desktop nav ────────────────────────────────────────────────── */
.shell-nav {
  display: none;
  align-items: center;
  gap: 28px;
  flex: 1;
  justify-content: center;
}
@media (min-width: 1024px) { .shell-nav { display: flex; } }

.shell-nav__link {
  position: relative;
  font-family: var(--at-f-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--at-sub);
  text-decoration: none;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  gap: 5px;
  padding-bottom: 3px;
}
.shell-nav__link::after {
  content: '';
  position: absolute;
  left: 50%;
  right: 50%;
  bottom: 0;
  height: 1px;
  background: var(--at-grad-gold);
  transition: left 0.28s cubic-bezier(0.76,0,0.24,1), right 0.28s cubic-bezier(0.76,0,0.24,1);
}
.shell-nav__link:hover,
.shell-nav__link.is-active { color: var(--at-gold-700); }
.shell-nav__link:hover::after,
.shell-nav__link.is-active::after { left: 0; right: 0; }

.shell-nav__dropdown-wrap {
  position: relative;
}
.shell-nav__dropdown-trigger { cursor: pointer; background: none; border: none; padding: 0; }
.shell-nav__dropdown {
  position: absolute;
  top: calc(100% + 16px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 180px;
  background: var(--at-grad-paper);
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-md);
  box-shadow: var(--at-shadow-md);
  overflow: hidden;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.2s, visibility 0.2s;
  z-index: 100;
}
.shell-nav__dropdown-wrap:hover .shell-nav__dropdown {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
.shell-nav__dropdown-item {
  display: block;
  padding: 11px 18px;
  font-family: var(--at-f-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--at-sub);
  text-decoration: none;
  border-bottom: 1px solid var(--at-border);
  transition: color 0.15s, background 0.15s;
}
.shell-nav__dropdown-item:last-child { border-bottom: none; }
.shell-nav__dropdown-item:hover { color: var(--at-gold-700); background: var(--at-surface-2); }

/* ── Actions ────────────────────────────────────────────────────── */
.shell-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.shell-actions__locale { display: none; }
@media (min-width: 1024px) { .shell-actions__locale { display: inline-flex; } }

.shell-icon-btn {
  position: relative;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--at-r-pill);
  color: var(--at-sub);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  text-decoration: none;
}
.shell-icon-btn:hover { color: var(--at-gold-700); background: var(--at-gold-dim); }

.shell-icon-btn__badge {
  position: absolute;
  top: 3px;
  right: 3px;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: var(--at-r-pill);
  background: var(--at-grad-green);
  color: #FFFBF0;
  font-family: var(--at-f-mono);
  font-size: 8px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  box-shadow: var(--at-shadow-xs);
  display: flex;
  align-items: center;
  justify-content: center;
}

.shell-hamburger {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
}
.shell-hamburger span {
  display: block;
  width: 20px;
  height: 1.5px;
  border-radius: 2px;
  background: var(--at-sub);
  transition: background 0.2s, width 0.2s;
}
.shell-hamburger:hover span { background: var(--at-gold); }
.shell-hamburger:hover span:nth-child(2) { width: 14px; }
@media (min-width: 1024px) { .shell-hamburger { display: none; } }

/* ── Search bar ─────────────────────────────────────────────────── */
.shell-search-bar {
  border-top: 1px solid var(--at-border);
  background: var(--at-grad-paper);
  box-shadow: var(--at-shadow-sm);
}
.shell-search-bar__inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 clamp(20px, 5vw, 64px);
  height: 52px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.shell-search-bar__icon { color: var(--at-muted); flex-shrink: 0; }
.shell-search-bar__input {
  flex: 1;
  background: none;
  border: none;
  font-family: var(--at-f-mono);
  font-size: 12px;
  font-weight: 300;
  color: var(--at-text);
  outline: none;
}
.shell-search-bar__input::placeholder { color: var(--at-faint); }
.shell-search-bar__close {
  background: none;
  border: none;
  color: var(--at-muted);
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
}
.shell-search-bar__close:hover { color: var(--at-gold); }

.shell-search-results {
  border-top: 1px solid var(--at-border);
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 clamp(20px, 5vw, 64px);
  max-height: 320px;
  overflow-y: auto;
}
.shell-search-results__state {
  padding: 16px 0;
  font-family: var(--at-f-mono);
  font-size: 11px;
  color: var(--at-sub);
}
.shell-search-results__item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid var(--at-border);
  text-decoration: none;
  transition: opacity 0.2s;
}
.shell-search-results__name { transition: color 0.2s; }
.shell-search-results__item:hover .shell-search-results__name { color: var(--at-gold-700); }
.shell-search-results__item:last-child { border-bottom: none; }
.shell-search-results__img {
  width: 44px;
  height: 44px;
  border-radius: var(--at-r-sm);
  border: 1px solid var(--at-border);
  background: var(--at-grad-shell);
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--at-muted);
}
.shell-search-results__img img { width: 100%; height: 100%; object-fit: cover; }
.shell-search-results__info { display: flex; flex-direction: column; gap: 3px; }
.shell-search-results__name {
  font-family: var(--at-f-mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--at-text);
}
.shell-search-results__price {
  font-family: var(--at-f-mono);
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--at-cream);
}
.shell-search-results__discount {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: var(--at-r-pill);
  background: var(--at-skin-dim);
  font-size: 9px;
  font-weight: 600;
  color: var(--at-skin);
}

/* ── Mobile drawer ──────────────────────────────────────────────── */
.shell-overlay {
  position: fixed;
  inset: 0;
  background: rgba(28,35,24,0.44);
  backdrop-filter: blur(3px);
  z-index: 60;
}
.shell-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: min(320px, 85vw);
  background: var(--at-grad-paper);
  border-right: 1px solid var(--at-border);
  box-shadow: var(--at-shadow-lg);
  z-index: 61;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.shell-drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--at-border);
  background: var(--at-grad-shell);
}
.shell-drawer__close {
  background: none;
  border: none;
  color: var(--at-sub);
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
}
.shell-drawer__close:hover { color: var(--at-gold); }
.shell-drawer__nav { display: flex; flex-direction: column; padding: 8px 0; border-bottom: 1px solid var(--at-border); }
.shell-drawer__link {
  padding: 15px 24px;
  font-family: var(--at-f-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--at-sub);
  text-decoration: none;
  transition: color 0.2s;
  border-bottom: 1px solid var(--at-border);
}
.shell-drawer__link:last-child { border-bottom: none; }
.shell-drawer__link:hover { color: var(--at-gold-700); background: var(--at-gold-dim); }
.shell-drawer__cats { padding: 20px 24px; }
.shell-drawer__cats-title {
  margin: 0 0 8px;
  font-family: var(--at-f-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--at-sub);
}
.shell-drawer__cats-icon {
  width: 16px;
  height: 16px;
  color: var(--at-sub);
  transition: transform 0.2s, color 0.2s;
}
.shell-drawer__cat-link {
  display: block;
  padding: 10px 0;
  font-family: var(--at-f-mono);
  font-size: 13px;
  font-weight: 400;
  color: var(--at-sub);
  text-decoration: none;
  border-bottom: 1px solid var(--at-border);
  transition: color 0.2s;
}
.shell-drawer__cat-link:last-child { border-bottom: none; }
.shell-drawer__cat-link:hover { color: var(--at-gold); }

/* ── Footer ─────────────────────────────────────────────────────── */
.shell-footer {
  position: relative;
  border-top: 1px solid var(--at-gold-700);
  background: var(--at-green-900);
  background-image:
    radial-gradient(900px 420px at 8% 0%, color-mix(in srgb, var(--at-green) 55%, transparent), transparent 62%),
    radial-gradient(700px 360px at 100% 100%, rgba(179,131,53,0.16), transparent 64%),
    var(--at-grain);
  background-repeat: no-repeat, no-repeat, repeat;
  margin-top: auto;
}
.shell-footer__inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: clamp(48px, 7vw, 80px) clamp(20px, 5vw, 64px);
}
.shell-footer__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
  margin-bottom: 48px;
}
@media (min-width: 768px) {
  .shell-footer__grid { grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 48px; }
}
.shell-footer__tagline {
  font-family: var(--at-f-mono);
  font-size: 11px;
  font-weight: 300;
  line-height: 1.8;
  color: rgba(255,251,240,0.62);
  margin-bottom: 20px;
  max-width: 260px;
}
.shell-footer__contacts { list-style: none; padding: 0; margin: 0 0 16px; display: flex; flex-direction: column; gap: 10px; }
.shell-footer__contact-item { display: flex; align-items: flex-start; gap: 10px; }
.shell-footer__contact-icon { width: 12px; height: 12px; color: var(--at-gold-300); flex-shrink: 0; margin-top: 2px; }
.shell-footer__contact-link {
  font-family: var(--at-f-mono);
  font-size: 11px;
  font-weight: 300;
  color: rgba(255,251,240,0.7);
  text-decoration: none;
  transition: color 0.2s;
}
.shell-footer__contact-link:hover { color: var(--at-gold-300); }
.shell-footer__socials { display: flex; gap: 8px; margin-top: 16px; }
.shell-footer__social-btn {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255,251,240,0.18);
  border-radius: var(--at-r-pill);
  background: rgba(255,251,240,0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,251,240,0.66);
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s, background 0.2s, transform 0.2s;
}
.shell-footer__social-btn:hover {
  border-color: var(--at-gold);
  background: rgba(179,131,53,0.18);
  color: var(--at-gold-300);
  transform: translateY(-2px);
}
.shell-footer__links { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.shell-footer__link {
  font-family: var(--at-f-mono);
  font-size: 11px;
  font-weight: 300;
  color: rgba(255,251,240,0.7);
  text-decoration: none;
  transition: color 0.2s;
}
.shell-footer__link:hover { color: var(--at-gold-300); }
.shell-footer__bottom {
  border-top: 1px solid rgba(255,251,240,0.14);
  padding-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255,251,240,0.5);
}
@media (min-width: 640px) {
  .shell-footer__bottom { flex-direction: row; justify-content: space-between; }
}

/* ── Transitions ─────────────────────────────────────────────────── */
.search-bar-enter-active, .search-bar-leave-active { transition: opacity 0.2s, transform 0.2s; }
.search-bar-enter-from, .search-bar-leave-to { opacity: 0; transform: translateY(-6px); }

.overlay-enter-active, .overlay-leave-active { transition: opacity 0.25s; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }

.drawer-enter-active, .drawer-leave-active { transition: transform 0.3s cubic-bezier(0.76, 0, 0.24, 1); }
.drawer-enter-from, .drawer-leave-to { transform: translateX(-100%); }
</style>
