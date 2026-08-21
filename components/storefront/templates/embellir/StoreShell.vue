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
const { t } = useI18n({ useScope: 'global' })

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

/*
 * The mobile drawer is teleported to <body>, outside the ThemeProvider that
 * carries the brand custom properties, so it has to carry them itself or
 * every brand-* class inside it resolves to nothing.
 */
const brandColor = useStorefrontTemplateBrandColor('embellir')
const drawerStyle = computed(() => ({
    '--brand': brandColor.value.color,
    '--brand-rgb': brandColor.value.rgb
} as Record<string, string>))

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: tenantCategories } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders()
})

// Mobile menu
const mobileMenuOpen = ref(false)
const mobileCategoriesDropdownOpen = ref(false)
watch(mobileMenuOpen, (open) => {
    if (!open) mobileCategoriesDropdownOpen.value = false
})

// Search Logic
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

defineProps<{
    hideNavigation?: boolean
    mobileHeaderHidden?: boolean
    hideAnnouncementBar?: boolean
}>()

// The search field lives behind an icon so the tiled header keeps two zones.
const isSearchOpen = ref(false)
watch(isSearchOpen, (open) => {
    if (!open) isSearchDropdownOpen.value = false
})
</script>

<template>
  <StoreThemeProvider>
    <div class="min-h-screen flex flex-col text-[#16211E] bg-[#F2ECE1]">
      <!-- Top Announcement Bar -->
      <StorefrontSharedAnnouncementBar
        v-if="!hideNavigation && !hideAnnouncementBar"
        background-color="bg-[#062622]"
        text-color="text-[#F2ECE1]"
      />
      <StorefrontSharedClearanceBanner v-if="!hideNavigation && !hideAnnouncementBar" />
      <StorefrontSharedClearanceAnnouncementDialog />

      <!-- Header: the glazed tile wall the whole storefront hangs on -->
      <header
        v-if="!hideNavigation"
        :class="['bg-brand-600 text-[#F2ECE1] sticky top-0 z-50 shadow-[0_1px_0_rgba(223,162,84,0.35)]', { 'hidden md:block': mobileHeaderHidden }]"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="h-16 md:h-[76px] flex items-center justify-between gap-4">
            <!-- Logo -->
            <NuxtLink
              to="/"
              class="flex-shrink-0 flex items-center gap-3 group"
            >
              <template v-if="storeSettings?.logoUrl">
                <img
                  :src="storeSettings.logoUrl"
                  :alt="tenantName"
                  class="h-10 max-w-[140px] object-contain"
                >
              </template>
              <template v-else>
                <span class="h-9 w-9 border border-[#DFA254]/50 flex items-center justify-center text-[#DFA254] shrink-0">
                  <span class="emb-star w-4 h-4" />
                </span>
              </template>
              <span class="emb-display text-[22px] md:text-[26px] leading-none text-[#FDFAF4] group-hover:text-[#DFA254] transition-colors">{{ tenantName }}</span>
            </NuxtLink>

            <!-- Navigation & Actions -->
            <div class="flex items-center gap-5">
              <!-- Desktop Menu -->
              <nav class="hidden lg:flex items-center gap-8">
                <NuxtLink
                  to="/"
                  class="emb-label text-[#F2ECE1]/70 hover:text-[#DFA254] transition-colors"
                  active-class="!text-[#DFA254]"
                >{{ storefrontContent.nav.home }}</NuxtLink>
                <NuxtLink
                  to="/products"
                  class="emb-label text-[#F2ECE1]/70 hover:text-[#DFA254] transition-colors"
                  active-class="!text-[#DFA254]"
                >{{ storefrontContent.nav.shop }}</NuxtLink>

                <!-- Categories Dropdown -->
                <div class="relative group flex items-center h-full">
                  <button class="emb-label text-[#F2ECE1]/70 hover:text-[#DFA254] transition-colors flex items-center gap-1.5 cursor-pointer">
                    {{ storefrontContent.nav.categories }}
                    <Icon name="lucide:chevron-down" class="w-3.5 h-3.5" />
                  </button>
                  <div class="absolute top-full start-0 mt-4 w-56 bg-[#FDFAF4] border border-[#CBBDAB] shadow-[0_18px_40px_-24px_rgba(6,38,34,0.6)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 rounded-[2px]">
                    <NuxtLink
                      v-for="cat in tenantCategories"
                      :key="cat.id"
                      :to="`/category/${cat.slug}`"
                      class="block px-4 py-3 text-sm text-[#16211E] hover:bg-[#F2ECE1] hover:text-brand-700 transition-colors border-b border-[#CBBDAB]/45 last:border-0"
                    >
                      {{ categoryDisplayTitle(cat) }}
                    </NuxtLink>
                  </div>
                </div>

                <NuxtLink
                  to="/contact"
                  class="emb-label text-[#F2ECE1]/70 hover:text-[#DFA254] transition-colors"
                  active-class="!text-[#DFA254]"
                >{{ storefrontContent.nav.contact }}</NuxtLink>
              </nav>

              <span class="h-7 w-px bg-[#DFA254]/30 hidden lg:block" />

              <!-- Icons -->
              <div class="flex items-center gap-1.5">
                <LocaleSwitcher class="hidden lg:inline-flex me-2" />
                <button
                  class="relative h-10 w-10 hidden lg:flex items-center justify-center text-[#F2ECE1]/75 hover:text-[#DFA254] transition-colors"
                  :class="{ 'text-[#DFA254]': isSearchOpen }"
                  :title="storefrontContent.search.placeholder"
                  @click="isSearchOpen = !isSearchOpen"
                >
                  <Icon :name="isSearchOpen ? 'lucide:x' : 'lucide:search'" class="w-[18px] h-[18px]" />
                </button>
                <button
                  class="relative h-10 w-10 flex items-center justify-center text-[#F2ECE1]/75 hover:text-[#DFA254] transition-colors"
                  :title="storefrontContent.header.wishlistTitle"
                  @click="navigateTo('/wishlist')"
                >
                  <Icon name="lucide:heart" class="w-[18px] h-[18px]" />
                  <ClientOnly>
                    <span
                      v-if="favorites.count.value > 0"
                      class="flex h-4 min-w-4 px-1 items-center justify-center bg-[#DFA254] text-[10px] font-bold text-[#062622] absolute top-1 end-1"
                    >{{ favorites.count.value }}</span>
                  </ClientOnly>
                </button>
                <!-- Cart -->
                <NuxtLink
                  v-if="storeSettings?.cartEnabled !== false"
                  to="/cart"
                  class="ms-1 h-10 flex items-center justify-center gap-2 px-4 bg-[#DFA254] text-[#062622] hover:bg-[#FDFAF4] transition-colors rounded-[2px]"
                  :title="storefrontContent.cart.label"
                >
                  <Icon name="lucide:shopping-bag" class="w-[18px] h-[18px]" />
                  <span
                    v-if="cartStore.itemCount > 0"
                    class="text-xs font-bold tabular-nums"
                  >{{ cartStore.itemCount }}</span>
                </NuxtLink>
                <!-- Hamburger (Mobile) -->
                <button class="lg:hidden p-2 ms-1 text-[#F2ECE1]" @click="mobileMenuOpen = true">
                  <Icon name="lucide:menu" class="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Search reveal, same state and results as the drawer field -->
        <Transition name="search-reveal">
          <div v-if="isSearchOpen" class="hidden lg:block border-t border-[#DFA254]/25 bg-[#062622]">
            <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  :placeholder="storefrontContent.search.placeholder"
                  class="w-full h-12 bg-transparent border-0 border-b border-[#DFA254]/45 text-[#FDFAF4] text-base placeholder:text-[#F2ECE1]/40 focus:ring-0 focus:border-[#DFA254] block ps-0 pe-10 transition-colors"
                  @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null"
                  @blur="setTimeout(() => isSearchDropdownOpen = false, 200)"
                >
                <Icon name="lucide:search" class="w-4 h-4 text-[#DFA254] absolute end-1 top-1/2 -translate-y-1/2 pointer-events-none" />

                <!-- Search Dropdown -->
                <div
                  v-show="isSearchDropdownOpen"
                  class="absolute top-full start-0 end-0 mt-2 bg-[#FDFAF4] border border-[#CBBDAB] shadow-[0_18px_40px_-24px_rgba(6,38,34,0.6)] z-50 text-start pointer-events-auto rounded-[2px]"
                >
                  <div v-if="searchLoading" class="px-4 py-3 text-sm text-[#5A6763]">{{ storefrontContent.actions.search }}…</div>
                  <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-[#5A6763]">{{ storefrontContent.shop.results.noResults }}</div>
                  <div v-else class="flex flex-col">
                    <NuxtLink
                      v-for="product in visibleSearchResults"
                      :key="product.id"
                      :to="'/product/' + product.slug"
                      class="flex items-center gap-3 px-4 py-3 hover:bg-[#F2ECE1] transition-colors border-b border-[#CBBDAB]/45 last:border-0"
                      @click="isSearchDropdownOpen = false; isSearchOpen = false"
                    >
                      <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-11 h-11 object-cover border border-[#CBBDAB]" :alt="product.title">
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-[#16211E] truncate">{{ product.title }}</div>
                        <div class="text-xs text-brand-700 font-bold mt-0.5">{{ formatCurrency(product.effectivePrice ?? product.price) }}<span v-if="product.promotionDiscountPercent" class="ms-1.5 text-[10px] text-[#B4593F]">-{{ product.promotionDiscountPercent }}%</span></div>
                      </div>
                    </NuxtLink>
                    <button
                      v-if="hasMoreSearchResults"
                      type="button"
                      class="w-full px-4 py-3 text-start emb-label text-brand-700 hover:bg-[#F2ECE1] transition-colors"
                      @mousedown.prevent
                      @click="showMoreSearchResults"
                    >
                      {{ t('storefront.templates.embellir.search.showMore') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </header>

      <!-- Mobile Drawer -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="mobileMenuOpen" class="fixed inset-0 bg-[#062622]/60 z-[60]" @click="mobileMenuOpen = false" />
        </Transition>
        <Transition name="slide">
          <div v-if="mobileMenuOpen" :style="drawerStyle" class="embellir-theme fixed top-0 start-0 bottom-0 w-[86%] max-w-xs bg-[#F2ECE1] z-[61] shadow-2xl flex flex-col overflow-y-auto">
            <!-- Drawer header -->
            <div class="flex items-center justify-between px-5 py-4 bg-brand-600 text-[#FDFAF4]">
              <span class="emb-display text-xl">{{ tenantName }}</span>
              <button class="p-1 text-[#F2ECE1]/70 hover:text-[#DFA254]" @click="mobileMenuOpen = false">
                <Icon name="lucide:x" class="w-5 h-5" />
              </button>
            </div>

            <!-- Search -->
            <div class="px-5 py-4">
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  :placeholder="storefrontContent.search.placeholder"
                  class="w-full bg-transparent border-0 border-b border-[#CBBDAB] py-2.5 ps-0 pe-9 text-sm placeholder:text-[#8E9793] text-[#16211E] outline-none focus:ring-0 focus:border-brand-600"
                  @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null"
                  @blur="setTimeout(() => isSearchDropdownOpen = false, 200)"
                >
                <Icon name="lucide:search" class="w-4 h-4 text-[#8E9793] absolute end-0 top-1/2 -translate-y-1/2 pointer-events-none" />

                <div
                  v-show="isSearchDropdownOpen"
                  class="absolute top-full start-0 end-0 mt-1 bg-[#FDFAF4] border border-[#CBBDAB] shadow-lg z-50 pointer-events-auto rounded-[2px]"
                >
                  <div v-if="searchLoading" class="px-4 py-3 text-sm text-[#5A6763]">{{ storefrontContent.actions.search }}…</div>
                  <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-[#5A6763]">{{ storefrontContent.shop.results.noResults }}</div>
                  <div v-else class="flex flex-col">
                    <NuxtLink
                      v-for="product in visibleSearchResults"
                      :key="product.id"
                      :to="'/product/' + product.slug"
                      class="flex items-center gap-3 px-4 py-3 hover:bg-[#F2ECE1] transition-colors border-b border-[#CBBDAB]/45 last:border-0"
                      @click="isSearchDropdownOpen = false; mobileMenuOpen = false"
                    >
                      <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-11 h-11 object-cover border border-[#CBBDAB]" :alt="product.title">
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-[#16211E] truncate">{{ product.title }}</div>
                        <div class="text-xs text-brand-700 font-bold mt-0.5">{{ formatCurrency(product.effectivePrice ?? product.price) }}<span v-if="product.promotionDiscountPercent" class="ms-1.5 text-[10px] text-[#B4593F]">-{{ product.promotionDiscountPercent }}%</span></div>
                      </div>
                    </NuxtLink>
                    <button
                      v-if="hasMoreSearchResults"
                      type="button"
                      class="w-full px-4 py-3 text-start emb-label text-brand-700 hover:bg-[#F2ECE1] transition-colors"
                      @mousedown.prevent
                      @click="showMoreSearchResults"
                    >
                      {{ t('storefront.templates.embellir.search.showMore') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Nav links -->
            <nav class="flex flex-col px-5">
              <NuxtLink to="/" class="py-3.5 emb-label text-[#16211E] hover:text-brand-700 border-b border-[#CBBDAB]/60" @click="mobileMenuOpen = false">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="py-3.5 emb-label text-[#16211E] hover:text-brand-700 border-b border-[#CBBDAB]/60" @click="mobileMenuOpen = false">{{ storefrontContent.nav.shop }}</NuxtLink>
              <NuxtLink to="/contact" class="py-3.5 emb-label text-[#16211E] hover:text-brand-700 border-b border-[#CBBDAB]/60" @click="mobileMenuOpen = false">{{ storefrontContent.nav.contact }}</NuxtLink>
            </nav>

            <!-- Categories -->
            <div v-if="tenantCategories && tenantCategories.length" class="px-5 py-4">
              <button
                type="button"
                class="w-full flex items-center justify-between text-start py-2"
                @click="mobileCategoriesDropdownOpen = !mobileCategoriesDropdownOpen"
              >
                <span class="emb-label text-[#8E9793]">{{ storefrontContent.nav.categories }}</span>
                <Icon
                  name="lucide:chevron-down"
                  class="w-4 h-4 text-[#8E9793] transition-transform"
                  :class="mobileCategoriesDropdownOpen ? 'rotate-180' : ''"
                />
              </button>
              <div v-show="mobileCategoriesDropdownOpen" class="flex flex-col">
                <NuxtLink
                  v-for="cat in tenantCategories"
                  :key="cat.id"
                  :to="'/category/' + cat.slug"
                  class="py-2.5 text-sm text-[#5A6763] hover:text-brand-700 transition-colors"
                  @click="mobileMenuOpen = false"
                >
                  {{ categoryDisplayTitle(cat) }}
                </NuxtLink>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Main Content -->
      <main class="flex-grow">
        <slot />
      </main>

      <!-- Footer: the darkest tile in the wall -->
      <footer class="bg-[#062622] text-[#F2ECE1] relative">
        <div class="emb-zellige opacity-[0.07] absolute inset-0 pointer-events-none" />
        <div class="h-px bg-gradient-to-r from-transparent via-[#DFA254]/60 to-transparent" />
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <!-- Brand Column -->
            <div>
              <h3 class="emb-display text-2xl text-[#FDFAF4] mb-6">
                {{ tenantName }}
              </h3>
              <ul v-if="primaryContactInfos.length" class="space-y-4 text-sm">
                <li v-for="info in primaryContactInfos" :key="info.id" class="flex items-start gap-3">
                  <Icon :name="kindDef(info.kind).iconName" class="w-4 h-4 text-[#DFA254] mt-0.5 shrink-0" />
                  <a
                    v-if="hrefFor(info)"
                    :href="hrefFor(info)!"
                    class="text-[#F2ECE1]/75 hover:text-[#DFA254] transition-colors"
                    :target="isExternalHref(hrefFor(info)!) ? '_blank' : undefined"
                    :rel="isExternalHref(hrefFor(info)!) ? 'noopener noreferrer' : undefined"
                  >
                    <span>{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                  </a>
                  <span v-else class="text-[#F2ECE1]/75">{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                </li>
              </ul>
              <div v-if="socialContactInfosWithHref.length" class="flex gap-2.5 mt-7">
                <a
                  v-for="info in socialContactInfosWithHref"
                  :key="info.id"
                  :href="info.href"
                  class="h-10 w-10 border border-[#DFA254]/35 flex items-center justify-center text-[#F2ECE1]/80 hover:bg-[#DFA254] hover:border-[#DFA254] hover:text-[#062622] transition-colors"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="kindDef(info.kind).iconName" class="w-[18px] h-[18px]" />
                </a>
              </div>
            </div>

            <!-- Links Column -->
            <div>
              <h4 class="emb-label text-[#DFA254] mb-6">
                {{ storefrontContent.footer.contact }}
              </h4>
              <ul class="space-y-3 text-sm text-[#F2ECE1]/70">
                <li v-if="legalLinks.contact.enabled">
                  <NuxtLink :to="legalLinks.contact.path" class="hover:text-[#DFA254] transition-colors">{{ storefrontContent.footer.contactUs }}</NuxtLink>
                </li>
              </ul>
            </div>

            <div>
              <h4 class="emb-label text-[#DFA254] mb-6">
                {{ storefrontContent.footer.termsPrivacy }}
              </h4>
              <ul class="space-y-3 text-sm text-[#F2ECE1]/70">
                <li v-if="legalLinks.terms.enabled">
                  <NuxtLink :to="legalLinks.terms.path" class="hover:text-[#DFA254] transition-colors">{{ storefrontContent.footer.termsOfService }}</NuxtLink>
                </li>
                <li v-if="legalLinks.privacy.enabled">
                  <NuxtLink :to="legalLinks.privacy.path" class="hover:text-[#DFA254] transition-colors">{{ storefrontContent.footer.privacyPolicy }}</NuxtLink>
                </li>
                <li v-if="legalLinks.returns.enabled">
                  <NuxtLink :to="legalLinks.returns.path" class="hover:text-[#DFA254] transition-colors">{{ storefrontContent.footer.returnPolicy }}</NuxtLink>
                </li>
              </ul>
            </div>
          </div>

          <div class="pt-8 border-t border-[#DFA254]/20 flex flex-col items-center gap-3 text-xs text-[#F2ECE1]/45">
            <span class="emb-star w-3 h-3 text-[#DFA254]/60" />
            <span>{{ storefrontContent.footer.copyright(tenantName) }}</span>
            <StorefrontSharedPoweredBy />
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
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }
.search-reveal-enter-active, .search-reveal-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.search-reveal-enter-from, .search-reveal-leave-to { opacity: 0; transform: translateY(-6px); }

@media (prefers-reduced-motion: reduce) {
  .fade-enter-active, .fade-leave-active,
  .slide-enter-active, .slide-leave-active,
  .search-reveal-enter-active, .search-reveal-leave-active { transition: none; }
}
</style>
