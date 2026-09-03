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
   // lazy: true
})


// Mobile menu
const mobileMenuOpen = ref(false)
const mobileCategoriesDropdownOpen = ref(false)
watch(mobileMenuOpen, (open) => {
    if (!open) mobileCategoriesDropdownOpen.value = false
})
// Build dynamic menu

// Search Logic
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

const categories = computed(() => {
    return [
        { name: storefrontContent.value.nav.home, href: '/' },
        { name: storefrontContent.value.nav.shop, href: '/products' }
    ]
})
const props = defineProps<{
    hideNavigation?: boolean
    mobileHeaderHidden?: boolean
    hideAnnouncementBar?: boolean
}>()

const questions = computed(() => []) // ... unused in displayed snippet but preserving structural integrity if needed
// Actually, looking at previous file view, no props were defined.
// Adding props definition.

// Header collapsed from 3 zones (logo | search | nav+icons) to 2 zones (logo | nav+icons).
// The search icon reveals the same search state/logic already defined above.
const isSearchOpen = ref(false)
watch(isSearchOpen, (open) => {
    if (!open) isSearchDropdownOpen.value = false
})
</script>

<template>
  <StoreThemeProvider>
    <div class="min-h-screen flex flex-col text-[#2E1E20] bg-[#FAF3EA]">
      <!-- Top Announcement Bar -->
      <StorefrontSharedAnnouncementBar
        v-if="!hideNavigation && !hideAnnouncementBar"
        background-color="bg-brand-600"
        text-color="text-white"
      />
      <StorefrontSharedClearanceBanner v-if="!hideNavigation && !hideAnnouncementBar" />
      <StorefrontSharedClearanceAnnouncementDialog />

      <!-- Header (2 zones: logo | nav + actions) -->
      <header v-if="!hideNavigation" :class="['bg-[#FFFDF9] border-b border-[#C9A24B]/35 sticky top-0 z-50', { 'hidden md:block': mobileHeaderHidden }]">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="h-16 md:h-20 flex items-center justify-between gap-4">
            <!-- Logo -->
            <NuxtLink
              to="/"
              class="flex-shrink-0 flex items-center gap-2.5 group"
            >
              <template v-if="storeSettings?.logoUrl">
                <img
                  :src="storeSettings.logoUrl"
                  :alt="tenantName"
                  class="h-10 max-w-[140px] object-contain rounded-tl-2xl rounded-br-2xl"
                >
              </template>
              <template v-else>
                <div class="h-10 w-10 rounded-tl-2xl rounded-tr-md rounded-br-2xl rounded-bl-md bg-brand-50 text-brand-700 flex items-center justify-center border border-[#C9A24B]/40">
                  <!-- Placeholder Logo Icon -->
                  <Icon name="lucide:flower-2" class="w-5 h-5" />
                </div>
              </template>
              <span class="text-xl font-bold text-[#2E1E20] group-hover:text-brand-700 transition-colors tracking-tight">{{ tenantName }}</span>
            </NuxtLink>

            <!-- Navigation & Actions -->
            <div class="flex items-center gap-6">
              <!-- Desktop Menu -->
              <nav class="hidden lg:flex items-center gap-7">
                <NuxtLink to="/" class="text-sm font-medium text-[#2E1E20]/80 hover:text-brand-700 transition-colors" active-class="text-brand-700 font-semibold">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="text-sm font-medium text-[#2E1E20]/80 hover:text-brand-700 transition-colors" active-class="text-brand-700 font-semibold">{{ storefrontContent.nav.shop }}</NuxtLink>

              <!-- Categories Dropdown -->
              <div class="relative group flex items-center h-full">
                <button class="text-sm font-medium text-[#2E1E20]/80 hover:text-brand-700 transition-colors flex items-center gap-1 cursor-pointer">
                  {{ storefrontContent.nav.categories || 'Categories' }}
                  <Icon name="lucide:chevron-down" class="w-4 h-4" />
                </button>
                <div class="absolute top-[80%] start-0 mt-2 w-48 bg-[#FFFDF9] border border-[#C9A24B]/35 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 rounded-tl-2xl rounded-tr-md rounded-br-2xl rounded-bl-md overflow-hidden">
                  <NuxtLink
                    v-for="cat in tenantCategories"
                    :key="cat.id"
                    :to="`/category/${cat.slug}`"
                    class="block px-4 py-3 text-sm text-[#2E1E20]/80 hover:bg-[#FAF3EA] hover:text-brand-700 transition-colors"
                  >
                    {{ categoryDisplayTitle(cat) }}
                  </NuxtLink>
                </div>
              </div>

              <NuxtLink to="/contact" class="text-sm font-medium text-[#2E1E20]/80 hover:text-brand-700 transition-colors" active-class="text-brand-700 font-semibold">{{ storefrontContent.nav.contact }}</NuxtLink>
              </nav>

              <div class="h-6 w-px bg-[#C9A24B]/35 hidden lg:block" />

              <!-- Icons -->
              <div class="flex items-center gap-3">
                <LocaleSwitcher class="hidden lg:inline-flex" />
                <!-- Search Trigger (reveals the same search state/results below) -->
                <button
                  class="relative h-10 w-10 hidden lg:flex items-center justify-center text-[#2E1E20]/70 hover:text-brand-700 hover:bg-[#FAF3EA] rounded-full transition-colors"
                  :class="{ 'text-brand-700 bg-[#FAF3EA]': isSearchOpen }"
                  :title="storefrontContent.search.placeholder"
                  @click="isSearchOpen = !isSearchOpen"
                >
                  <Icon :name="isSearchOpen ? 'lucide:x' : 'lucide:search'" class="w-5 h-5" />
                </button>
                <button
                  class="relative h-10 w-10 flex items-center justify-center text-[#2E1E20]/70 hover:text-brand-700 hover:bg-[#FAF3EA] rounded-full transition-colors"
                  :title="storefrontContent.header.wishlistTitle"
                  @click="navigateTo('/wishlist')"
                >
                  <Icon name="lucide:heart" class="w-5 h-5" />
                  <ClientOnly>
                    <span
                      v-if="favorites.count.value > 0"
                      class="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#2E1E20] text-[10px] font-bold text-white absolute -top-1 -end-1"
                    >{{ favorites.count.value }}</span>
                  </ClientOnly>
                </button>
                <!-- Cart -->
                <NuxtLink
                  v-if="storeSettings?.cartEnabled !== false"
                  to="/cart"
                  class="group relative h-10 flex items-center justify-center px-4 rounded-full bg-brand-600 text-white shadow-sm hover:bg-brand-700 transition-all hover:shadow-md"
                >
                  <Icon name="lucide:handbag" class="w-5 h-5" />
                  <span
                    v-if="cartStore.itemCount > 0"
                    class="ms-1 text-xs font-bold"
                  >{{ cartStore.itemCount }}</span>
                </NuxtLink>
                <!-- Hamburger (Mobile) -->
               <button class="lg:hidden p-1" @click="mobileMenuOpen = true">
                 <Icon name="lucide:menu" class="w-6 h-6" />
               </button>

              </div>
            </div>
          </div>
        </div>

        <!-- Search Reveal Panel (desktop) - same search state/logic, icon-triggered instead of always-visible -->
        <Transition name="search-reveal">
          <div v-if="isSearchOpen" class="hidden lg:block border-t border-[#C9A24B]/25 bg-[#FAF3EA]/60">
            <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
              <div class="relative group">
                <input
                  type="text"
                  v-model="searchQuery" :placeholder="storefrontContent.search.placeholder" @focus="openSearchDropdown" @blur="closeSearchDropdownSoon"
                  class="w-full h-12 bg-[#FFFDF9] border border-[#C9A24B]/35 text-[#2E1E20] text-sm rounded-tl-2xl rounded-tr-md rounded-br-2xl rounded-bl-md focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 block ps-5 pe-10 transition-all group-hover:bg-white shadow-sm"
                >
                <div class="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none">
                  <Icon name="lucide:search" class="w-4 h-4 text-[#9C8B82] group-hover:text-brand-600 transition-colors" />
                  <!-- Search Dropdown -->
                  <div
                    v-show="isSearchDropdownOpen"
                    class="absolute top-[100%] end-0 mt-2 w-64 bg-[#FFFDF9] border border-[#C9A24B]/35 shadow-xl z-50 rounded-2xl overflow-hidden text-start pointer-events-auto"
                  >
                    <div v-if="searchLoading" class="px-4 py-3 text-sm text-[#6B5850]">{{ storefrontContent.search.searching }}</div>
                    <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-[#6B5850]">{{ storefrontContent.search.noResults }}</div>
                    <div v-else class="flex flex-col">
                      <NuxtLink
                        v-for="product in visibleSearchResults"
                        :key="product.id"
                        :to="'/product/' + product.slug"
                        class="flex items-center gap-3 px-4 py-3 hover:bg-[#FAF3EA] transition-colors border-b border-[#C9A24B]/20 last:border-0"
                        @click="isSearchDropdownOpen = false; isSearchOpen = false"
                      >
                        <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-10 h-10 object-cover rounded-lg shadow-sm" />
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium text-[#2E1E20] truncate">{{ product.title }}</div>
                          <div class="text-xs text-brand-700 font-bold mt-0.5">{{ formatCurrency(product.effectivePrice ?? product.price) }}<span v-if="product.promotionDiscountPercent" class="ms-1 text-[10px] text-rose-700">-{{ product.promotionDiscountPercent }}%</span></div>
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

                </div>
              </div>
            </div>
          </div>
        </Transition>
      </header>

      <!-- Mobile Drawer -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="mobileMenuOpen" class="fixed inset-0 bg-[#2E1E20]/40 z-[60]" @click="mobileMenuOpen = false" />
        </Transition>
        <Transition name="slide">
          <div v-if="mobileMenuOpen" class="fixed top-0 start-0 bottom-0 w-[85%] max-w-xs bg-[#FFFDF9] z-[61] shadow-2xl flex flex-col overflow-y-auto">
            <!-- Drawer header -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-[#C9A24B]/35">
              <span class="text-lg font-bold text-[#2E1E20]">{{ tenantName }}</span>
              <button @click="mobileMenuOpen = false" class="p-1 text-[#2E1E20]/60 hover:text-[#2E1E20]">
                <Icon name="lucide:x" class="w-5 h-5" />
              </button>
            </div>

            <!-- Search -->
            <div class="px-5 py-3">
              <div class="relative">
                <input
                  type="text"
                  v-model="searchQuery"
                  :placeholder="storefrontContent.search.placeholder"
                  class="w-full border border-[#C9A24B]/35 bg-[#FAF3EA] rounded-xl py-2.5 ps-4 pe-10 text-sm placeholder:text-[#9C8B82] text-[#2E1E20] outline-none focus:border-brand-500"
                  @focus="openSearchDropdown"
                  @blur="closeSearchDropdownSoon"
                >
                <Icon name="lucide:search" class="w-4 h-4 text-[#9C8B82] absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />

                <div
                  v-show="isSearchDropdownOpen"
                  class="absolute top-[100%] start-0 end-0 mt-1 bg-[#FFFDF9] border border-[#C9A24B]/35 shadow-xl z-50 rounded-xl overflow-hidden pointer-events-auto"
                >
                  <div v-if="searchLoading" class="px-4 py-3 text-sm text-[#6B5850]">{{ storefrontContent.search.searching }}</div>
                  <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-[#6B5850]">{{ storefrontContent.search.noResults }}</div>
                  <div v-else class="flex flex-col">
                    <NuxtLink
                      v-for="product in visibleSearchResults"
                      :key="product.id"
                      :to="'/product/' + product.slug"
                      class="flex items-center gap-3 px-4 py-3 hover:bg-[#FAF3EA] transition-colors border-b border-[#C9A24B]/20 last:border-0"
                      @click="isSearchDropdownOpen = false; mobileMenuOpen = false"
                    >
                      <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-10 h-10 object-cover rounded-lg shadow-sm" />
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-[#2E1E20] truncate">{{ product.title }}</div>
                        <div class="text-xs text-brand-700 font-bold mt-0.5">{{ formatCurrency(product.effectivePrice ?? product.price) }}<span v-if="product.promotionDiscountPercent" class="ms-1 text-[10px] text-rose-700">-{{ product.promotionDiscountPercent }}%</span></div>
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
              </div>
            </div>

            <!-- Nav links -->
            <nav class="flex flex-col px-5 py-2 gap-1">
              <NuxtLink to="/" class="py-3 text-sm font-medium text-[#2E1E20]/85 hover:text-brand-700 border-b border-[#C9A24B]/20" @click="mobileMenuOpen = false">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="py-3 text-sm font-medium text-[#2E1E20]/85 hover:text-brand-700 border-b border-[#C9A24B]/20" @click="mobileMenuOpen = false">{{ storefrontContent.nav.shop }}</NuxtLink>
              <NuxtLink to="/contact" class="py-3 text-sm font-medium text-[#2E1E20]/85 hover:text-brand-700 border-b border-[#C9A24B]/20" @click="mobileMenuOpen = false">{{ storefrontContent.nav.contact }}</NuxtLink>
            </nav>
            <!-- Language: the header switcher is desktop-only, so the drawer carries it on mobile. -->
            <div class="px-5 py-3">
              <LocaleSwitcher show-labels />
            </div>

            <!-- Categories -->
            <div v-if="tenantCategories && tenantCategories.length" class="px-5 py-3">
              <button
                type="button"
                class="w-full flex items-center justify-between text-start"
                @click="mobileCategoriesDropdownOpen = !mobileCategoriesDropdownOpen"
              >
                <h4 class="text-xs font-bold uppercase tracking-wider text-[#9C8B82] mb-2">
                  {{ storefrontContent.nav.categories || 'Categories' }}
                </h4>
                <Icon
                  name="lucide:chevron-down"
                  class="w-4 h-4 text-[#9C8B82] transition-transform"
                  :class="mobileCategoriesDropdownOpen ? 'rotate-180' : ''"
                />
              </button>
              <div v-show="mobileCategoriesDropdownOpen" class="flex flex-col gap-1">
                <NuxtLink
                  v-for="cat in tenantCategories"
                  :key="cat.id"
                  :to="'/category/' + cat.slug"
                  class="py-2 text-sm text-[#2E1E20]/80 hover:text-brand-700 transition-colors"
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

      <!-- Footer -->
      <footer class="bg-[#2E1E20] text-[#E9DCCB] pt-16 pb-8 border-t border-[#C9A24B]/25 relative overflow-hidden">
        <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A24B]/60 to-transparent" />
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <!-- Brand Column -->
            <div class="col-span-1 md:col-span-1">
              <h3 class="text-white text-lg font-bold mb-6">
                {{ tenantName }}
              </h3>
              <ul v-if="primaryContactInfos.length" class="space-y-4 text-sm">
                <li v-for="info in primaryContactInfos" :key="info.id" class="flex items-start gap-3">
                  <Icon :name="kindDef(info.kind).iconName" class="w-5 h-5 text-[#C9A24B] mt-0.5" />
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
              <div v-if="socialContactInfosWithHref.length" class="flex gap-4 mt-6">
                <a
                  v-for="info in socialContactInfosWithHref"
                  :key="info.id"
                  :href="info.href"
                  class="h-10 w-10 rounded-full bg-white/5 border border-[#C9A24B]/25 flex items-center justify-center hover:bg-brand-600 hover:border-brand-600 transition-colors text-white"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="kindDef(info.kind).iconName" class="w-5 h-5" />
                </a>
              </div>
            </div>

            <!-- Links Column -->
            <div v-if="legalLinks.contact.enabled">
              <h4 class="text-white font-semibold mb-6">
                {{ storefrontContent.footer.contact }}
              </h4>
              <ul class="space-y-3 text-sm text-[#E9DCCB]/70">
                <li>
                  <NuxtLink v-if="legalLinks.contact.enabled" :to="legalLinks.contact.path" class="hover:text-[#C9A24B] transition-colors">{{ storefrontContent.footer.contactUs }}</NuxtLink>
                </li>
</ul>
            </div>
            <div v-if="legalLinks.terms.enabled || legalLinks.privacy.enabled || legalLinks.returns.enabled">
              <h4 class="text-white font-semibold mb-6">
                {{ storefrontContent.footer.termsPrivacy }}
              </h4>
              <ul class="space-y-3 text-sm text-[#E9DCCB]/70">
                <li>
                  <NuxtLink v-if="legalLinks.terms.enabled" :to="legalLinks.terms.path" class="hover:text-[#C9A24B] transition-colors">{{ storefrontContent.footer.termsOfService }}</NuxtLink>
                </li>
                <li>
                  <NuxtLink v-if="legalLinks.privacy.enabled" :to="legalLinks.privacy.path" class="hover:text-[#C9A24B] transition-colors">{{ storefrontContent.footer.privacyPolicy }}</NuxtLink>
                </li>
                <li>
                  <NuxtLink v-if="legalLinks.returns.enabled" :to="legalLinks.returns.path" class="hover:text-[#C9A24B] transition-colors">{{ storefrontContent.footer.returnPolicy }}</NuxtLink>
                </li>
              </ul>
            </div>
          </div>

          <div class="pt-8 border-t border-[#C9A24B]/20 text-center text-xs text-[#E9DCCB]/50">
            {{ storefrontContent.footer.copyright(tenantName) }}
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
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }
[dir='rtl'] .slide-enter-from, [dir='rtl'] .slide-leave-to { transform: translateX(100%); }
.search-reveal-enter-active, .search-reveal-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.search-reveal-enter-from, .search-reveal-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
