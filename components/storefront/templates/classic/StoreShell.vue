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
    // lazy: true
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
                const data = await $fetch<any[]>(url, {
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

// Mobile menu
const mobileMenuOpen = ref(false)
const mobileCategoriesDropdownOpen = ref(false)
watch(mobileMenuOpen, (open) => {
    if (!open) mobileCategoriesDropdownOpen.value = false
})

// Build dynamic menu
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

</script>

<template>
  <StoreThemeProvider>
    <div class="min-h-screen flex flex-col font-serif text-slate-600 bg-white">
      <!-- Top Announcement Bar (Minimal) -->
      <!-- Top Announcement Bar (Minimal) -->
      <StorefrontSharedAnnouncementBar
        v-if="!hideNavigation && !hideAnnouncementBar"
        background-color="bg-slate-900"
        text-color="text-white"
      />
      <StorefrontSharedClearanceBanner v-if="!hideNavigation && !hideAnnouncementBar" />
      <StorefrontSharedClearanceAnnouncementDialog />

      <!-- Header -->
      <header v-if="!hideNavigation" :class="['bg-white border-b border-slate-100 sticky top-0 z-50', { 'hidden md:block': mobileHeaderHidden }]">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="h-20 md:h-24 flex items-center justify-between gap-8">
            <!-- Logo -->
            <NuxtLink
              to="/"
              class="flex-shrink-0 flex items-center gap-2 group"
            >
              <template v-if="storeSettings?.logoUrl">
                <img 
                  :src="storeSettings.logoUrl" 
                  :alt="tenantName" 
                  class="h-10 max-w-[140px] object-contain"
                >
              </template>
              <template v-else>
                <div class="h-10 w-10 bg-slate-900 text-white flex items-center justify-center">
                  <Icon name="lucide:store" class="w-5 h-5" />
                </div>
              </template>
              <span class="text-2xl font-serif font-bold text-slate-900 tracking-tight">{{ tenantName }}</span>
            </NuxtLink>

            <!-- Desktop Menu (Centered) -->
            <nav class="hidden lg:flex items-center gap-8">
              <NuxtLink to="/" class="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors" active-class="text-slate-900">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors" active-class="text-slate-900">{{ storefrontContent.nav.shop }}</NuxtLink>

              <!-- Categories Dropdown -->
              <div class="relative group flex items-center h-full">
                <button class="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer">
                  {{ storefrontContent.nav.categories || 'Categories' }}
                  <Icon name="lucide:chevron-down" class="w-4 h-4" />
                </button>
                <div class="absolute top-[80%] start-0 mt-2 w-48 bg-white border border-slate-100 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 rounded-md overflow-hidden">
                  <NuxtLink
                    v-for="cat in tenantCategories"
                    :key="cat.id"
                    :to="`/category/${cat.slug}`"
                    class="block px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-700 transition-colors"
                  >
                    {{ categoryDisplayTitle(cat) }}
                  </NuxtLink>
                </div>
              </div>

              <NuxtLink to="/contact" class="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors" active-class="text-slate-900">{{ storefrontContent.nav.contact }}</NuxtLink>
            </nav>

            <!-- Actions -->
            <div class="flex items-center gap-4 sm:gap-6">
               <!-- Search (Desktop only) -->
               <div class="hidden sm:flex relative group items-center">
                  <input 
                    type="text" 
                    v-model="searchQuery"
                    :placeholder="storefrontContent.search?.placeholder || 'Search products...'"
                    class="w-28 sm:w-48 border-b border-slate-300 bg-transparent py-1 text-sm focus:border-slate-900 focus:ring-0 placeholder:text-slate-400 text-slate-900 transition-all outline-none"
                    @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null"
                    @blur="setTimeout(() => isSearchDropdownOpen = false, 200)"
                  >
                  <Icon name="lucide:search" class="w-4 h-4 text-slate-900 absolute end-0 pointer-events-none" />

                  <!-- Search Dropdown -->
                  <div
                    v-show="isSearchDropdownOpen"
                    class="absolute top-[100%] end-0 mt-2 w-64 bg-white border border-slate-100 shadow-xl z-50 rounded-md overflow-hidden pointer-events-auto"
                  >
                    <div v-if="searchLoading" class="px-4 py-3 text-sm text-slate-500">Searching...</div>
                    <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-slate-500">No products found.</div>
                    <div v-else class="flex flex-col">
                      <NuxtLink
                        v-for="product in visibleSearchResults"
                        :key="product.id"
                        :to="`/product/${product.slug}`"
                        class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                        @click="isSearchDropdownOpen = false"
                      >
                        <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-10 h-10 object-cover rounded shadow-sm" />
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium text-slate-900 truncate">{{ product.title }}</div>
                          <div class="text-xs text-brand-600 font-bold mt-0.5">{{ formatCurrency(product.effectivePrice ?? product.price) }}<span v-if="product.promotionDiscountPercent" class="ms-1 text-[10px] text-rose-600">-{{ product.promotionDiscountPercent }}%</span></div>
                        </div>
                      </NuxtLink>
                    <button
                      v-if="hasMoreSearchResults"
                      type="button"
                      class="w-full px-4 py-3 text-start text-sm font-semibold text-current hover:opacity-80 transition-opacity"
                      @mousedown.prevent
                      @click="showMoreSearchResults"
                    >
                      See more
                    </button>
                    </div>
                  </div>
               </div>

              <div class="h-4 w-px bg-slate-200 hidden lg:block" />

              <div class="flex items-center gap-4">
                <LocaleSwitcher class="hidden lg:inline-flex" />
                <button
                  class="relative text-slate-900 hover:text-slate-600 transition-colors"
                  :title="storefrontContent.header.wishlistTitle"
                  @click="navigateTo('/wishlist')"
                >
                  <Icon name="lucide:heart" class="w-5 h-5" />
                  <ClientOnly>
                    <span
                      v-if="favorites.count.value > 0"
                      class="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white absolute -top-1 -end-1"
                    >{{ favorites.count.value }}</span>
                  </ClientOnly>
                </button>
                <!-- Cart -->
                <NuxtLink
                  v-if="storeSettings?.cartEnabled !== false"
                  to="/cart"
                  class="relative flex items-center gap-2 text-slate-900 hover:text-brand-600 transition-colors"
                >
                  <Icon name="lucide:shopping-bag" class="w-5 h-5" />
                  <span
                    v-if="cartStore.itemCount > 0"
                    class="flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white absolute -top-1 -end-1"
                  >{{ cartStore.itemCount }}</span>
                </NuxtLink>
                <!-- Hamburger (Mobile) -->
               <button class="lg:hidden p-1 text-slate-900" @click="mobileMenuOpen = true">
                 <Icon name="lucide:menu" class="w-6 h-6" />
               </button>

              </div>
            </div>
          </div>
        </div>

      </header>

      <!-- Mobile Drawer -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="mobileMenuOpen" class="fixed inset-0 bg-black/40 z-[60]" @click="mobileMenuOpen = false" />
        </Transition>
        <Transition name="slide">
          <div v-if="mobileMenuOpen" class="fixed top-0 start-0 bottom-0 w-[85%] max-w-xs bg-white z-[61] shadow-2xl flex flex-col overflow-y-auto">
            <!-- Drawer header -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <span class="text-lg font-serif font-bold text-slate-900">{{ tenantName }}</span>
              <button @click="mobileMenuOpen = false" class="p-1 text-slate-500 hover:text-slate-900">
                <Icon name="lucide:x" class="w-5 h-5" />
              </button>
            </div>

            <!-- Search -->
            <div class="px-5 py-3">
              <div class="relative">
                <input
                  type="text"
                  v-model="searchQuery"
                  :placeholder="storefrontContent.search?.placeholder || 'Search products...'"
                  class="w-full border border-slate-200 bg-slate-50 rounded-lg py-2.5 ps-4 pe-10 text-sm placeholder:text-slate-400 text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null"
                  @blur="setTimeout(() => isSearchDropdownOpen = false, 200)"
                >
                <Icon name="lucide:search" class="w-4 h-4 text-slate-400 absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />

                <div
                  v-show="isSearchDropdownOpen"
                  class="absolute top-[100%] start-0 end-0 mt-1 bg-white border border-slate-100 shadow-xl z-50 rounded-lg overflow-hidden pointer-events-auto"
                >
                  <div v-if="searchLoading" class="px-4 py-3 text-sm text-slate-500">Searching...</div>
                  <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-slate-500">No products found.</div>
                  <div v-else class="flex flex-col">
                    <NuxtLink
                      v-for="product in visibleSearchResults"
                      :key="product.id"
                      :to="`/product/${product.slug}`"
                      class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                      @click="isSearchDropdownOpen = false; mobileMenuOpen = false"
                    >
                      <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-10 h-10 object-cover rounded shadow-sm" />
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-slate-900 truncate">{{ product.title }}</div>
                        <div class="text-xs text-brand-600 font-bold mt-0.5">{{ formatCurrency(product.effectivePrice ?? product.price) }}<span v-if="product.promotionDiscountPercent" class="ms-1 text-[10px] text-rose-600">-{{ product.promotionDiscountPercent }}%</span></div>
                      </div>
                    </NuxtLink>
                  <button
                    v-if="hasMoreSearchResults"
                    type="button"
                    class="w-full px-4 py-3 text-start text-sm font-semibold text-current hover:opacity-80 transition-opacity"
                    @mousedown.prevent
                    @click="showMoreSearchResults"
                  >
                    See more
                  </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Nav links -->
            <nav class="flex flex-col px-5 py-2 gap-1">
              <NuxtLink to="/" class="py-3 text-sm font-medium text-slate-700 hover:text-brand-600 border-b border-slate-50" @click="mobileMenuOpen = false">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="py-3 text-sm font-medium text-slate-700 hover:text-brand-600 border-b border-slate-50" @click="mobileMenuOpen = false">{{ storefrontContent.nav.shop }}</NuxtLink>
              <NuxtLink to="/contact" class="py-3 text-sm font-medium text-slate-700 hover:text-brand-600 border-b border-slate-50" @click="mobileMenuOpen = false">{{ storefrontContent.nav.contact }}</NuxtLink>
            </nav>

            <!-- Categories -->
            <div v-if="tenantCategories && tenantCategories.length" class="px-5 py-3">
  <button
    type="button"
    class="w-full flex items-center justify-between text-start"
    @click="mobileCategoriesDropdownOpen = !mobileCategoriesDropdownOpen"
  >
    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
      {{ storefrontContent.nav.categories || 'Categories' }}
    </h4>
    <Icon
      name="lucide:chevron-down"
      class="w-4 h-4 text-slate-400 transition-transform"
      :class="mobileCategoriesDropdownOpen ? 'rotate-180' : ''"
    />
  </button>
  <div v-show="mobileCategoriesDropdownOpen" class="flex flex-col gap-1">
    <NuxtLink
      v-for="cat in tenantCategories"
      :key="cat.id"
      :to="'/category/' + cat.slug"
      class="py-2 text-sm text-slate-600 hover:text-brand-600 transition-colors"
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

      <!-- Footer (Minimal Light) -->
      <footer class="bg-white pt-20 pb-12 border-t border-slate-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
            <!-- Brand Column -->
            <div class="col-span-1 md:col-span-1">
              <h3 class="text-2xl font-serif font-bold text-slate-900 mb-6">
                {{ tenantName }}
              </h3>
              <ul v-if="primaryContactInfos.length" class="space-y-4 text-sm text-slate-500">
                <li v-for="info in primaryContactInfos" :key="info.id" class="flex items-start gap-3">
                  <Icon :name="kindDef(info.kind).iconName" class="w-4 h-4 text-slate-400 mt-0.5" />
                  <a
                    v-if="hrefFor(info)"
                    :href="hrefFor(info)!"
                    class="hover:text-slate-900 transition-colors"
                    :target="isExternalHref(hrefFor(info)!) ? '_blank' : undefined"
                    :rel="isExternalHref(hrefFor(info)!) ? 'noopener noreferrer' : undefined"
                  >
                    <span>{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                  </a>
                  <span v-else>{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                </li>
              </ul>
              <div v-if="socialContactInfosWithHref.length" class="flex gap-4 mt-8">
                <a
                  v-for="info in socialContactInfosWithHref"
                  :key="info.id"
                  :href="info.href"
                  class="text-slate-400 hover:text-slate-900 transition-colors"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="kindDef(info.kind).iconName" class="w-5 h-5" />
                </a>
              </div>
            </div>

            <!-- Links Column -->
            <div>
              <h4 class="font-bold text-slate-900 text-xs uppercase tracking-widest mb-6">
                {{ storefrontContent.footer.contact }}
              </h4>
              <ul class="space-y-4 text-sm text-slate-500">
                <li><NuxtLink v-if="legalLinks.contact.enabled" :to="legalLinks.contact.path" class="hover:text-slate-900 transition-colors">{{ storefrontContent.footer.contactUs }}</NuxtLink></li>
              </ul>
            </div>
            <div>
              <h4 class="font-bold text-slate-900 text-xs uppercase tracking-widest mb-6">
                {{ storefrontContent.footer.termsPrivacy }}
              </h4>
              <ul class="space-y-4 text-sm text-slate-500">
                <li><NuxtLink v-if="legalLinks.terms.enabled" :to="legalLinks.terms.path" class="hover:text-slate-900 transition-colors">{{ storefrontContent.footer.termsOfService }}</NuxtLink></li>
                <li><NuxtLink v-if="legalLinks.privacy.enabled" :to="legalLinks.privacy.path" class="hover:text-slate-900 transition-colors">{{ storefrontContent.footer.privacyPolicy }}</NuxtLink></li>
                <li><NuxtLink v-if="legalLinks.returns.enabled" :to="legalLinks.returns.path" class="hover:text-slate-900 transition-colors">{{ storefrontContent.footer.returnPolicy }}</NuxtLink></li>
              </ul>
            </div>
          </div>

          <div class="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>{{ storefrontContent.footer.copyright(tenantName) }}</p>
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
</style>
