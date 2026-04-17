<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import StoreThemeProvider from './ThemeProvider.vue'
import { CONTACT_INFO_DEF_BY_KIND, buildContactInfoHref, type ContactInfoKind } from '~/shared/contact-infos'

const cartStore = useCartStore()
const favorites = useFavorites()
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Maison')
const storeSettings = useState<any>('storeSettings')
const storefrontContent = useStorefrontContent()
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
const { currencyCode } = useCurrency()

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: tenantCategories } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders(),
})

const mobileMenuOpen = ref(false)
const scrolled = ref(false)
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const searchLoading = ref(false)
const isSearchDropdownOpen = ref(false)
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
    if (q.length < 3) { searchResults.value = []; isSearchDropdownOpen.value = false; return }
    searchLoading.value = true
    isSearchDropdownOpen.value = true
    try {
        const url = useTenantApiUrl(`/api/products/search?q=${encodeURIComponent(q)}&limit=6`)
        const data = await $fetch<any[]>(url, { headers: useTenantApiHeaders() || {} })
        searchResults.value = Array.isArray(data) ? data : []
    } catch { searchResults.value = [] }
    finally { searchLoading.value = false }
})
</script>

<template>
  <StoreThemeProvider>
    <div class="shell">
      <StorefrontSharedAnnouncementBar v-if="!hideNavigation && !hideAnnouncementBar" />

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
                  :to="`/c/${cat.slug}`"
                  class="shell-nav__dropdown-item"
                >{{ cat.title }}</NuxtLink>
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
                :placeholder="storefrontContent.search?.placeholder || 'Rechercher un produit...'"
                class="shell-search-bar__input"
                autofocus
                @blur="setTimeout(() => { isSearchDropdownOpen = false }, 200)"
                @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null"
              >
              <button class="shell-search-bar__close" @click="searchOpen = false; searchQuery = ''">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="0.85"/>
                </svg>
              </button>
            </div>
            <!-- Results -->
            <div v-show="isSearchDropdownOpen" class="shell-search-results">
              <div v-if="searchLoading" class="shell-search-results__state">Recherche…</div>
              <div v-else-if="searchResults.length === 0" class="shell-search-results__state">Aucun résultat.</div>
              <NuxtLink
                v-for="product in searchResults"
                :key="product.id"
                :to="'/p/' + product.slug"
                class="shell-search-results__item"
                @click="searchOpen = false; searchQuery = ''"
              >
                <div class="shell-search-results__img">
                  <img v-if="product.images?.length" :src="product.images[0]" :alt="product.title">
                  <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" stroke="currentColor" stroke-width="0.5"/></svg>
                </div>
                <div class="shell-search-results__info">
                  <span class="shell-search-results__name">{{ product.title }}</span>
                  <span class="shell-search-results__price">{{ product.price }} {{ currencyCode }}</span>
                </div>
              </NuxtLink>
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
              <span class="at-label" style="margin-bottom:12px;display:block">Collections</span>
              <NuxtLink
                v-for="cat in tenantCategories"
                :key="cat.id"
                :to="'/c/' + cat.slug"
                class="shell-drawer__cat-link"
                @click="mobileMenuOpen = false"
              >{{ cat.title }}</NuxtLink>
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
              <p class="shell-footer__tagline">Art de vivre, décoration intérieure & accessoires maison soigneusement sélectionnés.</p>
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
                  <NuxtLink :to="`/c/${cat.slug}`" class="shell-footer__link">{{ cat.title }}</NuxtLink>
                </li>
              </ul>
            </div>

            <!-- Service -->
            <div>
              <span class="at-label" style="display:block;margin-bottom:16px">{{ storefrontContent.footer.contact }}</span>
              <ul class="shell-footer__links">
                <li><NuxtLink to="/contact" class="shell-footer__link">{{ storefrontContent.footer.contactUs }}</NuxtLink></li>
                <li><NuxtLink to="/about" class="shell-footer__link">{{ storefrontContent.footer.aboutUs }}</NuxtLink></li>
              </ul>
            </div>

            <!-- Legal -->
            <div>
              <span class="at-label" style="display:block;margin-bottom:16px">{{ storefrontContent.footer.termsPrivacy }}</span>
              <ul class="shell-footer__links">
                <li><a href="#" class="shell-footer__link">{{ storefrontContent.footer.termsOfService }}</a></li>
                <li><a href="#" class="shell-footer__link">{{ storefrontContent.footer.privacyPolicy }}</a></li>
                <li><a href="#" class="shell-footer__link">{{ storefrontContent.footer.returnPolicy }}</a></li>
              </ul>
            </div>
          </div>

          <div class="shell-footer__bottom">
            <span>{{ storefrontContent.footer.copyright(tenantName) }}</span>
            <span>Atelier · Algérie</span>
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
  background: rgba(14,13,12,0.96);
  backdrop-filter: blur(12px);
  border-color: var(--at-border);
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
  filter: brightness(0) invert(1);
}
.shell-logo__text {
  font-family: var(--at-f-display);
  font-size: 1.5rem;
  font-weight: 400;
  letter-spacing: 0.08em;
  color: var(--at-cream);
  text-decoration: none;
}

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
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 300;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--at-sub);
  text-decoration: none;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  gap: 5px;
}
.shell-nav__link:hover,
.shell-nav__link.is-active { color: var(--at-gold); }

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
  background: var(--at-surface);
  border: 1px solid var(--at-border);
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
  padding: 10px 16px;
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 300;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--at-sub);
  text-decoration: none;
  border-bottom: 1px solid var(--at-border);
  transition: color 0.15s, background 0.15s;
}
.shell-nav__dropdown-item:last-child { border-bottom: none; }
.shell-nav__dropdown-item:hover { color: var(--at-gold); background: var(--at-surface-2); }

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
  color: var(--at-sub);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
  text-decoration: none;
}
.shell-icon-btn:hover { color: var(--at-gold); }

.shell-icon-btn__badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 14px;
  height: 14px;
  background: var(--at-gold);
  color: var(--at-bg);
  font-family: var(--at-f-mono);
  font-size: 8px;
  font-weight: 400;
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
  height: 1px;
  background: var(--at-sub);
  transition: background 0.2s;
}
.shell-hamburger:hover span { background: var(--at-gold); }
@media (min-width: 1024px) { .shell-hamburger { display: none; } }

/* ── Search bar ─────────────────────────────────────────────────── */
.shell-search-bar {
  border-top: 1px solid var(--at-border);
  background: var(--at-surface);
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
.shell-search-bar__input::placeholder { color: var(--at-muted); }
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
.shell-search-results__item:hover { opacity: 0.75; }
.shell-search-results__item:last-child { border-bottom: none; }
.shell-search-results__img {
  width: 40px;
  height: 40px;
  background: var(--at-surface-2);
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
  color: var(--at-text);
}
.shell-search-results__price {
  font-family: var(--at-f-mono);
  font-size: 10px;
  color: var(--at-gold);
}

/* ── Mobile drawer ──────────────────────────────────────────────── */
.shell-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  z-index: 60;
}
.shell-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: min(320px, 85vw);
  background: var(--at-surface);
  border-right: 1px solid var(--at-border);
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
  padding: 14px 24px;
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 300;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--at-sub);
  text-decoration: none;
  transition: color 0.2s;
  border-bottom: 1px solid var(--at-border);
}
.shell-drawer__link:last-child { border-bottom: none; }
.shell-drawer__link:hover { color: var(--at-gold); }
.shell-drawer__cats { padding: 20px 24px; }
.shell-drawer__cat-link {
  display: block;
  padding: 10px 0;
  font-family: var(--at-f-display);
  font-size: 1.1rem;
  color: var(--at-text);
  text-decoration: none;
  border-bottom: 1px solid var(--at-border);
  transition: color 0.2s;
}
.shell-drawer__cat-link:last-child { border-bottom: none; }
.shell-drawer__cat-link:hover { color: var(--at-gold); }

/* ── Footer ─────────────────────────────────────────────────────── */
.shell-footer {
  border-top: 1px solid var(--at-border);
  background: var(--at-surface);
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
  color: var(--at-muted);
  margin-bottom: 20px;
  max-width: 260px;
}
.shell-footer__contacts { list-style: none; padding: 0; margin: 0 0 16px; display: flex; flex-direction: column; gap: 10px; }
.shell-footer__contact-item { display: flex; align-items: flex-start; gap: 10px; }
.shell-footer__contact-icon { width: 12px; height: 12px; color: var(--at-gold); flex-shrink: 0; margin-top: 2px; }
.shell-footer__contact-link {
  font-family: var(--at-f-mono);
  font-size: 11px;
  font-weight: 300;
  color: var(--at-muted);
  text-decoration: none;
  transition: color 0.2s;
}
.shell-footer__contact-link:hover { color: var(--at-text); }
.shell-footer__socials { display: flex; gap: 8px; margin-top: 16px; }
.shell-footer__social-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--at-border-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--at-muted);
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s;
}
.shell-footer__social-btn:hover { border-color: var(--at-gold); color: var(--at-gold); }
.shell-footer__links { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.shell-footer__link {
  font-family: var(--at-f-mono);
  font-size: 11px;
  font-weight: 300;
  color: var(--at-muted);
  text-decoration: none;
  transition: color 0.2s;
}
.shell-footer__link:hover { color: var(--at-text); }
.shell-footer__bottom {
  border-top: 1px solid var(--at-border);
  padding-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 300;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--at-muted);
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
