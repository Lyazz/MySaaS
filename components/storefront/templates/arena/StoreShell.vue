<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import StoreThemeProvider from './ThemeProvider.vue'
import { CONTACT_INFO_DEF_BY_KIND, buildContactInfoHref, type ContactInfoKind } from '~/shared/contact-infos'
import { buildActiveProductPricing } from '~/shared/pricing/product-pricing'

const cartStore = useCartStore()
const favorites = useFavorites()
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')
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
const { format: formatCurrency } = useCurrency()

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: tenantCategories } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders(),
})

const mobileMenuOpen = ref(false)
const mobileCategoriesDropdownOpen = ref(false)
const searchOverlayOpen = ref(false)
watch(mobileMenuOpen, (open) => {
    if (!open) mobileCategoriesDropdownOpen.value = false
})

const searchQuery = ref('')
const searchResults = ref<any[]>([])
const searchLoading = ref(false)
const isSearchDropdownOpen = ref(false)
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
                const data = await $fetch(url, {
                    headers: useTenantApiHeaders(),
                    query: { q: newVal }
                })
                searchResults.value = applySearchResultPricing(data || [])
            } catch (e) {
                console.error('Search error:', e)
            } finally {
                searchLoading.value = false
            }
        }, 500)
    } else {
        searchResults.value = []
        visibleSearchResultCount.value = searchSuggestionLimit
        isSearchDropdownOpen.value = false
    }
})

const props = defineProps<{
    hideNavigation?: boolean
    mobileHeaderHidden?: boolean
    hideAnnouncementBar?: boolean
}>()
</script>

<template>
  <StoreThemeProvider>
    <div class="min-h-screen flex flex-col bg-[#06080c] text-slate-300">
      <StorefrontSharedAnnouncementBar
        v-if="!hideNavigation && !hideAnnouncementBar"
        background-color="bg-brand-500"
        text-color="text-[#02060a]"
      />
      <StorefrontSharedClearanceBanner v-if="!hideNavigation && !hideAnnouncementBar" />
      <StorefrontSharedClearanceAnnouncementDialog />

      <!-- Header: Logitech G dark bar with cyan accents -->
      <header
        v-if="!hideNavigation"
        :class="['sticky top-0 z-50 bg-[#06080c]/95 backdrop-blur border-b border-white/[0.08]', { 'hidden md:block': mobileHeaderHidden }]"
      >
        <!-- Cyan top hairline (Logitech G signature) -->
        <div class="h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-70" />

        <div class="max-w-[1400px] mx-auto px-5 lg:px-10">
          <div class="h-16 md:h-[68px] flex items-center gap-8">
            <NuxtLink to="/" class="flex items-center gap-2.5 group flex-shrink-0">
              <template v-if="storeSettings?.logoUrl">
                <img :src="storeSettings.logoUrl" :alt="tenantName" class="h-9 max-w-[140px] object-contain">
              </template>
              <template v-else>
                <!-- Logitech G "G" mark inspired hex emblem -->
                <span class="relative inline-flex items-center justify-center w-9 h-9">
                  <span class="absolute inset-0 bg-brand-500 [clip-path:polygon(25%_0,75%_0,100%_50%,75%_100%,25%_100%,0_50%)]" />
                  <Icon name="lucide:zap" class="relative w-4 h-4 text-[#02060a]" />
                </span>
              </template>
              <span class="text-[15px] font-black uppercase tracking-[0.2em] text-white group-hover:text-brand-500 transition-colors">{{ tenantName }}</span>
            </NuxtLink>

            <nav class="hidden lg:flex items-center gap-7 flex-1">
              <NuxtLink
                to="/"
                class="text-[12px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-white relative py-1 transition-colors after:absolute after:start-0 after:end-0 after:bottom-0 after:h-[2px] after:bg-brand-500 after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform"
                active-class="text-white"
              >
                {{ storefrontContent.nav.home }}
              </NuxtLink>
              <NuxtLink
                to="/products"
                class="text-[12px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-white relative py-1 transition-colors after:absolute after:start-0 after:end-0 after:bottom-0 after:h-[2px] after:bg-brand-500 after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform"
                active-class="text-white"
              >
                {{ storefrontContent.nav.shop }}
              </NuxtLink>

              <div class="relative group">
                <button class="flex items-center gap-1 text-[12px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-white py-1 transition-colors">
                  {{ (storefrontContent.nav as any).categories || 'Categories' }}
                  <Icon name="lucide:chevron-down" class="w-3.5 h-3.5 mt-0.5 transition-transform group-hover:rotate-180" />
                </button>
                <div class="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all absolute start-1/2 -translate-x-1/2 top-full pt-3 z-50">
                  <div class="bg-[#0b0f14] border border-white/10 shadow-2xl min-w-[280px] py-3 relative">
                    <div class="absolute -top-px start-0 end-0 h-px bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
                    <NuxtLink
                      v-for="cat in tenantCategories"
                      :key="cat.id"
                      :to="`/category/${cat.slug}`"
                      class="block px-5 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-brand-500 border-s-2 border-transparent hover:border-brand-500 transition-all"
                    >
                      {{ categoryDisplayTitle(cat) }}
                    </NuxtLink>
                  </div>
                </div>
              </div>

              <NuxtLink
                to="/contact"
                class="text-[12px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-white relative py-1 transition-colors after:absolute after:start-0 after:end-0 after:bottom-0 after:h-[2px] after:bg-brand-500 after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform"
                active-class="text-white"
              >
                {{ storefrontContent.nav.contact }}
              </NuxtLink>
            </nav>

            <div class="ms-auto flex items-center gap-1">
              <button
                class="hidden lg:inline-flex h-10 w-10 items-center justify-center text-slate-400 hover:text-brand-500 transition-colors"
                @click="searchOverlayOpen = true"
                :title="storefrontContent.search?.placeholder || 'Search'"
              >
                <Icon name="lucide:search" class="w-[18px] h-[18px]" />
              </button>

              <LocaleSwitcher class="hidden lg:inline-flex" />

              <button
                class="relative h-10 w-10 flex items-center justify-center text-slate-400 hover:text-brand-500 transition-colors"
                :title="storefrontContent.header.wishlistTitle"
                @click="navigateTo('/wishlist')"
              >
                <Icon name="lucide:heart" class="w-[18px] h-[18px]" />
                <ClientOnly>
                  <span
                    v-if="favorites.count.value > 0"
                    class="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-brand-500 text-[9px] font-black text-[#02060a]"
                  >{{ favorites.count.value }}</span>
                </ClientOnly>
              </button>

              <NuxtLink
                v-if="storeSettings?.cartEnabled !== false"
                to="/cart"
                class="relative ml-2 h-10 px-4 flex items-center gap-2 bg-brand-500 text-[#02060a] font-black uppercase tracking-[0.16em] text-[11px] hover:bg-white transition-colors [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)]"
              >
                <Icon name="lucide:shopping-cart" class="w-4 h-4" />
                <span v-if="cartStore.itemCount > 0">{{ cartStore.itemCount }}</span>
              </NuxtLink>

              <button class="lg:hidden h-10 w-10 flex items-center justify-center text-white" @click="mobileMenuOpen = true">
                <Icon name="lucide:menu" class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Search overlay: Logitech G dark fullscreen -->
      <Teleport to="body">
        <Transition name="search">
          <div v-if="searchOverlayOpen" class="fixed inset-0 z-[70] bg-[#06080c]/98 backdrop-blur flex flex-col">
            <div class="h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
            <div class="border-b border-white/[0.08]">
              <div class="max-w-3xl mx-auto px-5 py-7 flex items-center gap-4">
                <Icon name="lucide:search" class="w-5 h-5 text-brand-500" />
                <input
                  v-model="searchQuery"
                  type="text"
                  autofocus
                  :placeholder="storefrontContent.search?.placeholder || 'Search products...'"
                  class="flex-1 bg-transparent text-2xl font-black uppercase tracking-[0.04em] text-white outline-none placeholder:text-slate-600"
                  @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null"
                >
                <button class="h-8 w-8 flex items-center justify-center text-slate-500 hover:text-brand-500" @click="searchOverlayOpen = false; searchQuery = ''">
                  <Icon name="lucide:x" class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto">
              <div class="max-w-3xl mx-auto px-5 py-6">
                <div v-if="searchLoading" class="text-sm text-slate-500 py-4">Searching...</div>
                <div v-else-if="searchResults.length === 0" class="text-sm text-slate-500 py-4">No products found.</div>
                <div v-else>
                  <NuxtLink
                    v-for="product in visibleSearchResults"
                    :key="product.id"
                    :to="'/product/' + product.slug"
                    class="flex items-center gap-4 py-3 border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors px-2 -mx-2 group"
                    @click="searchOverlayOpen = false; searchQuery = ''"
                  >
                    <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-14 h-14 object-cover bg-[#0b0f14]" />
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-black uppercase text-white truncate group-hover:text-brand-500 transition-colors">{{ product.title }}</div>
                      <div class="text-xs text-slate-500 mt-0.5 font-mono">{{ formatCurrency(product.effectivePrice ?? product.price) }}<span v-if="product.promotionDiscountPercent" class="ms-2 text-brand-500 font-bold">-{{ product.promotionDiscountPercent }}%</span></div>
                    </div>
                    <Icon name="lucide:arrow-up-right" class="w-4 h-4 text-slate-600 group-hover:text-brand-500 transition-colors" />
                  </NuxtLink>
                  <button
                    v-if="hasMoreSearchResults"
                    type="button"
                    class="mt-4 text-[10px] font-black uppercase tracking-[0.28em] text-brand-500 hover:text-white"
                    @click="showMoreSearchResults"
                  >
                    See more
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Mobile drawer -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="mobileMenuOpen" class="fixed inset-0 bg-black/70 z-[60]" @click="mobileMenuOpen = false" />
        </Transition>
        <Transition name="slide">
          <div v-if="mobileMenuOpen" class="fixed top-0 right-0 bottom-0 w-[88%] max-w-sm bg-[#06080c] z-[61] shadow-2xl flex flex-col overflow-y-auto border-l border-brand-500/20">
            <div class="h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
            <div class="flex items-center justify-between px-6 py-5 border-b border-white/[0.08]">
              <span class="text-[12px] font-black uppercase tracking-[0.28em] text-white">{{ tenantName }}</span>
              <button @click="mobileMenuOpen = false" class="h-8 w-8 flex items-center justify-center text-slate-400">
                <Icon name="lucide:x" class="w-5 h-5" />
              </button>
            </div>

            <div class="px-6 py-4 border-b border-white/[0.08]">
              <div class="relative">
                <input
                  type="text"
                  v-model="searchQuery"
                  :placeholder="storefrontContent.search?.placeholder || 'Search...'"
                  class="w-full border-0 border-b border-white/15 bg-transparent py-2 pe-8 text-sm text-white outline-none focus:border-brand-500 placeholder:text-slate-600 uppercase tracking-wider"
                  @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null"
                >
                <Icon name="lucide:search" class="w-4 h-4 text-slate-500 absolute end-0 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <nav class="flex flex-col px-6 py-4">
              <NuxtLink to="/" class="py-3.5 text-sm font-black uppercase tracking-[0.18em] text-white border-b border-white/[0.06] flex items-center justify-between hover:text-brand-500 transition-colors" @click="mobileMenuOpen = false">
                {{ storefrontContent.nav.home }}
                <Icon name="lucide:chevron-right" class="w-4 h-4 text-slate-500" />
              </NuxtLink>
              <NuxtLink to="/products" class="py-3.5 text-sm font-black uppercase tracking-[0.18em] text-white border-b border-white/[0.06] flex items-center justify-between hover:text-brand-500 transition-colors" @click="mobileMenuOpen = false">
                {{ storefrontContent.nav.shop }}
                <Icon name="lucide:chevron-right" class="w-4 h-4 text-slate-500" />
              </NuxtLink>
              <NuxtLink to="/contact" class="py-3.5 text-sm font-black uppercase tracking-[0.18em] text-white border-b border-white/[0.06] flex items-center justify-between hover:text-brand-500 transition-colors" @click="mobileMenuOpen = false">
                {{ storefrontContent.nav.contact }}
                <Icon name="lucide:chevron-right" class="w-4 h-4 text-slate-500" />
              </NuxtLink>
            </nav>

            <div v-if="tenantCategories && tenantCategories.length" class="px-6 pb-6">
              <button
                type="button"
                class="w-full flex items-center justify-between py-3 border-b border-white/[0.06]"
                @click="mobileCategoriesDropdownOpen = !mobileCategoriesDropdownOpen"
              >
                <h4 class="text-[10px] font-black uppercase tracking-[0.32em] text-brand-500">{{ (storefrontContent.nav as any).categories || 'Categories' }}</h4>
                <Icon name="lucide:chevron-down" class="w-4 h-4 text-slate-400 transition-transform" :class="mobileCategoriesDropdownOpen ? 'rotate-180' : ''" />
              </button>
              <div v-show="mobileCategoriesDropdownOpen" class="flex flex-col">
                <NuxtLink
                  v-for="cat in tenantCategories"
                  :key="cat.id"
                  :to="'/category/' + cat.slug"
                  class="py-3 text-sm text-slate-300 hover:text-brand-500 border-b border-white/[0.04] transition-colors"
                  @click="mobileMenuOpen = false"
                >
                  {{ categoryDisplayTitle(cat) }}
                </NuxtLink>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <main class="flex-grow">
        <slot />
      </main>

      <!-- Footer: Logitech G dark with cyan accents -->
      <footer class="relative bg-black text-slate-500 mt-20 border-t border-white/[0.08]">
        <div class="h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
        <div class="max-w-[1400px] mx-auto px-5 lg:px-10 pt-16 pb-10">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-white/[0.06]">
            <div class="col-span-2">
              <div class="flex items-center gap-2.5 mb-5">
                <span class="relative inline-flex items-center justify-center w-9 h-9">
                  <span class="absolute inset-0 bg-brand-500 [clip-path:polygon(25%_0,75%_0,100%_50%,75%_100%,25%_100%,0_50%)]" />
                  <Icon name="lucide:zap" class="relative w-4 h-4 text-[#02060a]" />
                </span>
                <h3 class="text-white text-sm font-black uppercase tracking-[0.2em]">{{ tenantName }}</h3>
              </div>
              <ul v-if="primaryContactInfos.length" class="space-y-3 text-sm">
                <li v-for="info in primaryContactInfos" :key="info.id" class="flex items-start gap-3">
                  <Icon :name="kindDef(info.kind).iconName" class="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
                  <a
                    v-if="hrefFor(info)"
                    :href="hrefFor(info)!"
                    class="hover:text-white transition-colors"
                    :target="isExternalHref(hrefFor(info)!) ? '_blank' : undefined"
                    :rel="isExternalHref(hrefFor(info)!) ? 'noopener noreferrer' : undefined"
                  >
                    <span>{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                  </a>
                  <span v-else>{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                </li>
              </ul>
              <div v-if="socialContactInfosWithHref.length" class="flex gap-2 mt-6">
                <a
                  v-for="info in socialContactInfosWithHref"
                  :key="info.id"
                  :href="info.href"
                  class="h-9 w-9 flex items-center justify-center border border-white/10 hover:border-brand-500 hover:bg-brand-500 hover:text-[#02060a] text-slate-400 transition-colors"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="kindDef(info.kind).iconName" class="w-4 h-4" />
                </a>
              </div>
            </div>

            <div>
              <h4 class="text-[10px] font-black uppercase tracking-[0.32em] text-brand-500 mb-5">{{ storefrontContent.footer.contact }}</h4>
              <ul class="space-y-3 text-sm">
                <li v-if="legalLinks.contact.enabled">
                  <NuxtLink :to="legalLinks.contact.path" class="hover:text-white transition-colors">{{ storefrontContent.footer.contactUs }}</NuxtLink>
                </li>
              </ul>
            </div>

            <div>
              <h4 class="text-[10px] font-black uppercase tracking-[0.32em] text-brand-500 mb-5">{{ storefrontContent.footer.termsPrivacy }}</h4>
              <ul class="space-y-3 text-sm">
                <li v-if="legalLinks.terms.enabled">
                  <NuxtLink :to="legalLinks.terms.path" class="hover:text-white transition-colors">{{ storefrontContent.footer.termsOfService }}</NuxtLink>
                </li>
                <li v-if="legalLinks.privacy.enabled">
                  <NuxtLink :to="legalLinks.privacy.path" class="hover:text-white transition-colors">{{ storefrontContent.footer.privacyPolicy }}</NuxtLink>
                </li>
                <li v-if="legalLinks.returns.enabled">
                  <NuxtLink :to="legalLinks.returns.path" class="hover:text-white transition-colors">{{ storefrontContent.footer.returnPolicy }}</NuxtLink>
                </li>
              </ul>
            </div>
          </div>

          <div class="pt-8 text-center text-xs text-slate-600">
            <span>{{ storefrontContent.footer.copyright(tenantName) }}</span>
            <div class="mt-2"><StorefrontSharedPoweredBy /></div>
          </div>
        </div>
      </footer>
    </div>
  </StoreThemeProvider>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: transform 0.3s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }
.search-enter-active, .search-leave-active { transition: opacity 0.2s ease; }
.search-enter-from, .search-leave-to { opacity: 0; }
</style>
