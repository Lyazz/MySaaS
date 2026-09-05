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
const { format: formatCurrency } = useCurrency()

const categoryDisplayTitle = (category: any): string => {
  if (!category) return ''
  return category.parentId ? '— ' + category.title : category.title
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

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: tenantCategories } = await useFetch<any[]>(categoriesUrl, {
  headers: useTenantApiHeaders()
})

/*
 * The mobile drawer is teleported to <body>, outside the ThemeProvider that
 * carries the brand custom properties, so it re-declares them itself.
 */
const brandColor = useStorefrontTemplateBrandColor('cozy')
const drawerStyle = computed(() => ({
  '--brand': brandColor.value.color,
  '--brand-rgb': brandColor.value.rgb
} as Record<string, string>))

// Mobile menu
const mobileMenuOpen = ref(false)
const mobileCategoriesDropdownOpen = ref(false)
watch(mobileMenuOpen, (open) => {
  if (!open) mobileCategoriesDropdownOpen.value = false
})

// Search
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
const isSearchOpen = ref(false)
watch(isSearchOpen, (open) => {
  if (!open) isSearchDropdownOpen.value = false
})

const applySearchResultPricing = (products: any[]) => (Array.isArray(products) ? products : []).map((product: any) => {
  const pricing = buildActiveProductPricing(product)
  return { ...product, effectivePrice: pricing.effectivePrice, promotionDiscountPercent: pricing.promotionDiscountPercent }
})

let searchTimeout: any
watch(searchQuery, (newVal) => {
  if (newVal.length >= 3) {
    searchLoading.value = true
    isSearchDropdownOpen.value = true
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(async () => {
      try {
        const url = useTenantApiUrl('/api/products')
        const data = await $fetch(url, { headers: useTenantApiHeaders(), query: { q: newVal } })
        searchResults.value = applySearchResultPricing(data || [])
      } catch (e) {
        console.error('Search error:', e)
      } finally {
        searchLoading.value = false
      }
    }, 500)
  } else {
    searchResults.value = []
    isSearchDropdownOpen.value = false
  }
})

defineProps<{
  hideNavigation?: boolean
  mobileHeaderHidden?: boolean
  hideAnnouncementBar?: boolean
}>()

const currentYear = new Date().getFullYear()
</script>

<template>
  <StoreThemeProvider>
    <div class="ed-theme min-h-screen flex flex-col">
      <!-- Announcements -->
      <StorefrontSharedAnnouncementBar
        v-if="!hideNavigation && !hideAnnouncementBar"
        background-color="bg-[#1E1912]"
        text-color="text-[#E8E0D2]"
      />
      <StorefrontSharedClearanceBanner v-if="!hideNavigation && !hideAnnouncementBar" />
      <StorefrontSharedClearanceAnnouncementDialog />

      <!-- Masthead -->
      <header
        v-if="!hideNavigation"
        :class="['bg-[#F4EFE6] sticky top-0 z-50 border-b border-[#DAD2C4]', { 'hidden md:block': mobileHeaderHidden }]"
      >
        <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10">
          <div class="h-16 md:h-[74px] flex items-center justify-between gap-6">
            <!-- Wordmark -->
            <NuxtLink to="/" class="flex-shrink-0 flex items-center gap-3 group">
              <template v-if="storeSettings?.logoUrl">
                <img :src="storeSettings.logoUrl" :alt="tenantName" class="h-9 max-w-[150px] object-contain">
              </template>
              <span
                class="ed-display text-[22px] md:text-[26px] leading-none text-[#262019] group-hover:text-[#97401F] transition-colors"
              >{{ tenantName }}</span>
            </NuxtLink>

            <!-- Desktop nav -->
            <nav class="hidden lg:flex items-center gap-9">
              <NuxtLink
                to="/"
                class="ed-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A7E6E] hover:text-[#262019] transition-colors relative py-1"
                active-class="!text-[#262019] ed-nav-active"
              >{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink
                to="/products"
                class="ed-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A7E6E] hover:text-[#262019] transition-colors relative py-1"
                active-class="!text-[#262019] ed-nav-active"
              >{{ storefrontContent.nav.shop }}</NuxtLink>

              <!-- Categories -->
              <div class="relative group flex items-center">
                <button
                  class="ed-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A7E6E] hover:text-[#262019] transition-colors flex items-center gap-1.5 cursor-pointer py-1"
                >
                  {{ storefrontContent.nav.categories || 'Categories' }}
                  <Icon name="lucide:chevron-down" class="w-3.5 h-3.5" />
                </button>
                <div
                  class="absolute top-full start-0 mt-3 w-56 bg-[#FBF8F2] border border-[#C4B8A4] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50"
                >
                  <NuxtLink
                    v-for="cat in tenantCategories"
                    :key="cat.id"
                    :to="`/category/${cat.slug}`"
                    class="block px-4 py-3 ed-ui text-[13px] text-[#4A4038] hover:bg-[#F4EFE6] hover:text-[#97401F] transition-colors border-b border-[#DAD2C4] last:border-0"
                  >
                    {{ categoryDisplayTitle(cat) }}
                  </NuxtLink>
                </div>
              </div>

              <NuxtLink
                to="/contact"
                class="ed-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A7E6E] hover:text-[#262019] transition-colors relative py-1"
                active-class="!text-[#262019] ed-nav-active"
              >{{ storefrontContent.nav.contact }}</NuxtLink>
            </nav>

            <!-- Actions -->
            <div class="flex items-center gap-1">
              <LocaleSwitcher class="hidden lg:inline-flex me-2" />
              <button
                class="h-10 w-10 hidden lg:flex items-center justify-center text-[#8A7E6E] hover:text-[#262019] transition-colors"
                :class="{ '!text-[#97401F]': isSearchOpen }"
                :title="storefrontContent.search.placeholder"
                @click="isSearchOpen = !isSearchOpen"
              >
                <Icon :name="isSearchOpen ? 'lucide:x' : 'lucide:search'" class="w-[18px] h-[18px]" />
              </button>
              <button
                class="relative h-10 w-10 flex items-center justify-center text-[#8A7E6E] hover:text-[#262019] transition-colors"
                :title="storefrontContent.header.wishlistTitle"
                @click="navigateTo('/wishlist')"
              >
                <Icon name="lucide:heart" class="w-[18px] h-[18px]" />
                <span
                  v-if="favorites.count.value > 0"
                  class="flex h-4 min-w-4 px-1 items-center justify-center bg-[#B8532E] text-[10px] font-bold text-[#F4EFE6] absolute top-1 end-0.5 ed-ui"
                >{{ favorites.count.value }}</span>
              </button>
              <NuxtLink
                v-if="storeSettings?.cartEnabled !== false"
                to="/cart"
                class="ms-2 h-10 flex items-center justify-center gap-2 px-4 bg-[#262019] text-[#F4EFE6] hover:bg-[#97401F] transition-colors"
                :title="storefrontContent.cart?.label || 'Cart'"
              >
                <Icon name="lucide:shopping-bag" class="w-[17px] h-[17px]" />
                <span v-if="cartStore.itemCount > 0" class="ed-ui text-xs font-bold tabular-nums">{{ cartStore.itemCount }}</span>
              </NuxtLink>
              <button class="lg:hidden p-2 ms-1 text-[#262019]" @click="mobileMenuOpen = true">
                <Icon name="lucide:menu" class="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        <!-- Desktop search reveal -->
        <Transition name="search-reveal">
          <div v-if="isSearchOpen" class="hidden lg:block border-t border-[#DAD2C4] bg-[#FBF8F2]">
            <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-10 py-6">
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  :placeholder="storefrontContent.search.placeholder"
                  class="w-full h-11 bg-transparent border-0 border-b border-[#C4B8A4] text-[#262019] ed-ui text-base placeholder:text-[#8A7E6E] focus:ring-0 focus:border-[#B8532E] block ps-0 pe-9 transition-colors"
                  @focus="openSearchDropdown"
                  @blur="closeSearchDropdownSoon"
                >
                <Icon name="lucide:search" class="w-4 h-4 text-[#B8532E] absolute end-1 top-1/2 -translate-y-1/2 pointer-events-none" />

                <div
                  v-show="isSearchDropdownOpen"
                  class="absolute top-full start-0 end-0 mt-2 bg-[#FBF8F2] border border-[#C4B8A4] z-50 text-start pointer-events-auto shadow-[0_20px_44px_-28px_rgba(38,32,25,0.5)]"
                >
                  <div v-if="searchLoading" class="px-4 py-3 ed-ui text-sm text-[#8A7E6E]">{{ storefrontContent.actions.search }}…</div>
                  <div v-else-if="searchResults.length === 0" class="px-4 py-3 ed-ui text-sm text-[#8A7E6E]">{{ storefrontContent.shop.results.noResults }}</div>
                  <div v-else class="flex flex-col">
                    <NuxtLink
                      v-for="product in searchResults"
                      :key="product.id"
                      :to="'/product/' + product.slug"
                      class="flex items-center gap-3 px-4 py-3 hover:bg-[#F4EFE6] transition-colors border-b border-[#DAD2C4] last:border-0"
                      @click="isSearchDropdownOpen = false; isSearchOpen = false"
                    >
                      <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-11 h-11 object-cover border border-[#DAD2C4]" :alt="product.title">
                      <div class="flex-1 min-w-0">
                        <div class="ed-display text-[15px] text-[#262019] truncate">{{ product.title }}</div>
                        <div class="ed-ui text-xs text-[#97401F] font-semibold mt-0.5">
                          {{ formatCurrency(product.effectivePrice ?? product.price) }}
                          <span v-if="product.promotionDiscountPercent" class="ms-1.5 text-[10px] text-[#B8532E]">−{{ product.promotionDiscountPercent }}%</span>
                        </div>
                      </div>
                    </NuxtLink>
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
          <div v-if="mobileMenuOpen" class="fixed inset-0 bg-[#1E1912]/55 z-[60]" @click="mobileMenuOpen = false" />
        </Transition>
        <Transition name="slide">
          <div
            v-if="mobileMenuOpen"
            :style="drawerStyle"
            class="ed-theme fixed top-0 start-0 bottom-0 w-[86%] max-w-xs bg-[#F4EFE6] z-[61] shadow-2xl flex flex-col overflow-y-auto"
          >
            <div class="flex items-center justify-between px-5 py-4 border-b border-[#DAD2C4]">
              <span class="ed-display text-xl text-[#262019]">{{ tenantName }}</span>
              <button class="p-1 text-[#8A7E6E] hover:text-[#262019]" @click="mobileMenuOpen = false">
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
                  class="w-full bg-transparent border-0 border-b border-[#C4B8A4] py-2.5 ps-0 pe-9 ed-ui text-sm placeholder:text-[#8A7E6E] text-[#262019] outline-none focus:ring-0 focus:border-[#B8532E]"
                  @focus="openSearchDropdown"
                  @blur="closeSearchDropdownSoon"
                >
                <Icon name="lucide:search" class="w-4 h-4 text-[#8A7E6E] absolute end-0 top-1/2 -translate-y-1/2 pointer-events-none" />

                <div
                  v-show="isSearchDropdownOpen"
                  class="absolute top-full start-0 end-0 mt-1 bg-[#FBF8F2] border border-[#C4B8A4] z-50 pointer-events-auto shadow-lg"
                >
                  <div v-if="searchLoading" class="px-4 py-3 ed-ui text-sm text-[#8A7E6E]">{{ storefrontContent.actions.search }}…</div>
                  <div v-else-if="searchResults.length === 0" class="px-4 py-3 ed-ui text-sm text-[#8A7E6E]">{{ storefrontContent.shop.results.noResults }}</div>
                  <div v-else class="flex flex-col">
                    <NuxtLink
                      v-for="product in searchResults"
                      :key="product.id"
                      :to="'/product/' + product.slug"
                      class="flex items-center gap-3 px-4 py-3 hover:bg-[#F4EFE6] transition-colors border-b border-[#DAD2C4] last:border-0"
                      @click="isSearchDropdownOpen = false; mobileMenuOpen = false"
                    >
                      <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-10 h-10 object-cover border border-[#DAD2C4]" :alt="product.title">
                      <div class="flex-1 min-w-0">
                        <div class="ed-display text-sm text-[#262019] truncate">{{ product.title }}</div>
                        <div class="ed-ui text-xs text-[#97401F] font-semibold mt-0.5">{{ formatCurrency(product.effectivePrice ?? product.price) }}</div>
                      </div>
                    </NuxtLink>
                  </div>
                </div>
              </div>
            </div>

            <nav class="flex flex-col px-5">
              <NuxtLink to="/" class="py-3.5 ed-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4A4038] hover:text-[#97401F] border-b border-[#DAD2C4]" @click="mobileMenuOpen = false">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="py-3.5 ed-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4A4038] hover:text-[#97401F] border-b border-[#DAD2C4]" @click="mobileMenuOpen = false">{{ storefrontContent.nav.shop }}</NuxtLink>
              <NuxtLink to="/contact" class="py-3.5 ed-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4A4038] hover:text-[#97401F] border-b border-[#DAD2C4]" @click="mobileMenuOpen = false">{{ storefrontContent.nav.contact }}</NuxtLink>
            </nav>
            <!-- Language: the header switcher is desktop-only, so the drawer carries it on mobile. -->
            <div class="px-5 py-3">
              <LocaleSwitcher show-labels />
            </div>

            <div v-if="tenantCategories && tenantCategories.length" class="px-5 py-4">
              <button
                type="button"
                class="w-full flex items-center justify-between text-start py-2"
                @click="mobileCategoriesDropdownOpen = !mobileCategoriesDropdownOpen"
              >
                <span class="ed-label !mb-0">{{ storefrontContent.nav.categories || 'Categories' }}</span>
                <Icon
                  name="lucide:chevron-down"
                  class="w-4 h-4 text-[#8A7E6E] transition-transform"
                  :class="mobileCategoriesDropdownOpen ? 'rotate-180' : ''"
                />
              </button>
              <div v-show="mobileCategoriesDropdownOpen" class="flex flex-col">
                <NuxtLink
                  v-for="cat in tenantCategories"
                  :key="cat.id"
                  :to="'/category/' + cat.slug"
                  class="py-2.5 ed-ui text-sm text-[#4A4038] hover:text-[#97401F] transition-colors"
                  @click="mobileMenuOpen = false"
                >
                  {{ categoryDisplayTitle(cat) }}
                </NuxtLink>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Main -->
      <main class="flex-grow">
        <slot />
      </main>

      <!-- Footer -->
      <footer class="bg-[#1E1912] text-[#E8E0D2] mt-24">
        <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 pt-16 pb-9">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 mb-14">
            <!-- Masthead column -->
            <div class="md:col-span-5">
              <h3 class="ed-display text-[28px] leading-none !text-[#F4EFE6] mb-5">{{ tenantName }}</h3>
              <p class="text-[15px] leading-relaxed text-[#E8E0D2]/60 max-w-sm mb-7">
                {{ storeSettings?.description || storefrontContent.footer.copyright(tenantName) }}
              </p>
              <ul v-if="primaryContactInfos.length" class="space-y-3 text-sm">
                <li v-for="info in primaryContactInfos" :key="info.id" class="flex items-start gap-3">
                  <Icon :name="kindDef(info.kind).iconName" class="w-4 h-4 text-[#B8532E] mt-1 shrink-0" />
                  <a
                    v-if="hrefFor(info)"
                    :href="hrefFor(info)!"
                    class="ed-ui text-[#E8E0D2]/70 hover:text-[#F4EFE6] transition-colors"
                    :target="isExternalHref(hrefFor(info)!) ? '_blank' : undefined"
                    :rel="isExternalHref(hrefFor(info)!) ? 'noopener noreferrer' : undefined"
                  >{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</a>
                  <span v-else class="ed-ui text-[#E8E0D2]/70">{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                </li>
              </ul>
              <div v-if="socialContactInfosWithHref.length" class="flex gap-2.5 mt-6">
                <a
                  v-for="info in socialContactInfosWithHref"
                  :key="info.id"
                  :href="info.href"
                  class="h-10 w-10 border border-[#E8E0D2]/20 flex items-center justify-center text-[#E8E0D2]/75 hover:bg-[#B8532E] hover:border-[#B8532E] hover:text-[#F4EFE6] transition-colors"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="kindDef(info.kind).iconName" class="w-[18px] h-[18px]" />
                </a>
              </div>
            </div>

            <div class="md:col-span-3 md:col-start-7">
              <h4 class="ed-label !text-[#E8E0D2]/45 mb-5">{{ storefrontContent.nav.shop }}</h4>
              <ul class="space-y-2.5 ed-ui text-sm text-[#E8E0D2]/70">
                <li><NuxtLink to="/products" class="hover:text-[#F4EFE6] transition-colors">{{ storefrontContent.nav.shop }}</NuxtLink></li>
                <li v-for="cat in (tenantCategories || []).slice(0, 5)" :key="cat.id">
                  <NuxtLink :to="`/category/${cat.slug}`" class="hover:text-[#F4EFE6] transition-colors">{{ categoryDisplayTitle(cat) }}</NuxtLink>
                </li>
              </ul>
            </div>

            <div class="md:col-span-3" v-if="legalLinks.contact.enabled || legalLinks.terms.enabled || legalLinks.privacy.enabled || legalLinks.returns.enabled">
              <h4 class="ed-label !text-[#E8E0D2]/45 mb-5">{{ storefrontContent.footer.termsPrivacy }}</h4>
              <ul class="space-y-2.5 ed-ui text-sm text-[#E8E0D2]/70">
                <li v-if="legalLinks.contact.enabled"><NuxtLink :to="legalLinks.contact.path" class="hover:text-[#F4EFE6] transition-colors">{{ storefrontContent.footer.contactUs }}</NuxtLink></li>
                <li v-if="legalLinks.terms.enabled"><NuxtLink :to="legalLinks.terms.path" class="hover:text-[#F4EFE6] transition-colors">{{ storefrontContent.footer.termsOfService }}</NuxtLink></li>
                <li v-if="legalLinks.privacy.enabled"><NuxtLink :to="legalLinks.privacy.path" class="hover:text-[#F4EFE6] transition-colors">{{ storefrontContent.footer.privacyPolicy }}</NuxtLink></li>
                <li v-if="legalLinks.returns.enabled"><NuxtLink :to="legalLinks.returns.path" class="hover:text-[#F4EFE6] transition-colors">{{ storefrontContent.footer.returnPolicy }}</NuxtLink></li>
              </ul>
            </div>
          </div>

          <div class="pt-7 border-t border-[#E8E0D2]/15 flex flex-col sm:flex-row items-center justify-between gap-3 ed-ui text-xs text-[#E8E0D2]/40">
            <span>© {{ currentYear }} {{ tenantName }}</span>
            <StorefrontSharedPoweredBy />
          </div>
        </div>
      </footer>
    </div>
  </StoreThemeProvider>
</template>

<style scoped>
.ed-nav-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: var(--ed-accent, #B8532E);
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: transform 0.3s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }
[dir='rtl'] .slide-enter-from, [dir='rtl'] .slide-leave-to { transform: translateX(100%); }
.search-reveal-enter-active, .search-reveal-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.search-reveal-enter-from, .search-reveal-leave-to { opacity: 0; transform: translateY(-6px); }

@media (prefers-reduced-motion: reduce) {
  .fade-enter-active, .fade-leave-active,
  .slide-enter-active, .slide-leave-active,
  .search-reveal-enter-active, .search-reveal-leave-active { transition: none; }
}
</style>
