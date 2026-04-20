<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import StoreThemeProvider from './ThemeProvider.vue'
import { CONTACT_INFO_DEF_BY_KIND, buildContactInfoHref, type ContactInfoKind } from '~/shared/contact-infos'

const cartStore = useCartStore()
const favorites = useFavorites()
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')
const storeSettings = useState<any>('storeSettings')
const storefrontContent = useStorefrontContent()

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
const { currencyCode } = useCurrency()

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: tenantCategories } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders(),
})

const mobileMenuOpen = ref(false)

const searchQuery = ref('')
const searchResults = ref([])
const searchLoading = ref(false)
const isSearchDropdownOpen = ref(false)
const searchSuggestionLimit = 5
const visibleSearchResultCount = ref(searchSuggestionLimit)
const visibleSearchResults = computed(() => searchResults.value.slice(0, visibleSearchResultCount.value))
const hasMoreSearchResults = computed(() => searchResults.value.length > visibleSearchResultCount.value)
const showMoreSearchResults = () => { visibleSearchResultCount.value += searchSuggestionLimit }
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
                searchResults.value = data || []
            } catch (e) { console.error('Search error:', e) }
            finally { searchLoading.value = false }
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
    <div class="min-h-screen flex flex-col font-sans text-stone-700 bg-[#fffbf0]">

      <!-- Announcement Bar -->
      <StorefrontSharedAnnouncementBar
        v-if="!hideNavigation && !hideAnnouncementBar"
        background-color="bg-violet-700"
        text-color="text-white"
      />

      <!-- Header -->
      <header
        v-if="!hideNavigation"
        :class="['bg-[#fffbf0] border-b-4 border-violet-200 sticky top-0 z-50 shadow-sm', { 'hidden md:block': mobileHeaderHidden }]"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="h-16 md:h-20 flex items-center justify-between gap-4">

            <!-- Logo -->
            <NuxtLink to="/" class="flex-shrink-0 flex items-center gap-2 group">
              <template v-if="storeSettings?.logoUrl">
                <img :src="storeSettings.logoUrl" :alt="tenantName" class="h-10 max-w-[140px] object-contain">
              </template>
              <template v-else>
                <div class="h-11 w-11 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-[0_4px_0_0_#4c1d95] group-hover:-translate-y-0.5 group-active:translate-y-1 group-active:shadow-none transition-all">
                  <Icon name="lucide:store" class="w-6 h-6" />
                </div>
              </template>
              <span class="text-xl font-black text-stone-900 group-hover:text-violet-700 transition-colors tracking-tight" style="font-family: 'Fredoka', sans-serif">{{ tenantName }}</span>
            </NuxtLink>

            <!-- Search Bar -->
            <div class="flex-1 max-w-md hidden lg:block">
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  :placeholder="storefrontContent.search?.placeholder || 'Search products...'"
                  class="w-full h-11 bg-white border-3 border-violet-200 text-stone-900 text-sm rounded-full focus:ring-0 focus:border-violet-400 block pl-5 pr-10 transition-all shadow-[0_3px_0_0_#ddd6fe] focus:shadow-[0_3px_0_0_#7c3aed] outline-none"
                  @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null"
                  @blur="setTimeout(() => isSearchDropdownOpen = false, 200)"
                >
                <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <Icon name="lucide:search" class="w-4 h-4 text-violet-400" />
                </div>
                <!-- Search Dropdown -->
                <div
                  v-show="isSearchDropdownOpen"
                  class="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border-3 border-violet-100 shadow-xl z-50 rounded-2xl overflow-hidden pointer-events-auto"
                >
                  <div v-if="searchLoading" class="px-4 py-3 text-sm text-stone-500">Searching...</div>
                  <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-stone-500">No products found.</div>
                  <div v-else class="flex flex-col">
                    <NuxtLink
                      v-for="product in visibleSearchResults"
                      :key="product.id"
                      :to="'/p/' + product.slug"
                      class="flex items-center gap-3 px-4 py-3 hover:bg-violet-50 transition-colors border-b border-violet-50 last:border-0"
                      @click="isSearchDropdownOpen = false"
                    >
                      <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-10 h-10 object-cover rounded-xl border-2 border-violet-100 shadow-sm" />
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-bold text-stone-900 truncate">{{ product.title }}</div>
                        <div class="text-xs text-violet-600 font-black mt-0.5">{{ product.price }} {{ currencyCode }}</div>
                      </div>
                    </NuxtLink>
                    <button
                      v-if="hasMoreSearchResults"
                      type="button"
                      class="w-full px-4 py-3 text-left text-sm font-bold text-violet-600 hover:bg-violet-50 transition-colors"
                      @mousedown.prevent
                      @click="showMoreSearchResults"
                    >See more</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Nav + Actions -->
            <div class="flex items-center gap-4">
              <!-- Desktop Nav -->
              <nav class="hidden lg:flex items-center gap-1">
                <NuxtLink
                  to="/"
                  class="text-sm font-black px-4 py-2 rounded-full border-2 transition-all"
                  :class="$route.path === '/' ? 'bg-amber-400 text-amber-900 border-amber-300 shadow-[0_3px_0_0_#d97706] -translate-y-0.5' : 'text-stone-600 border-transparent hover:bg-violet-50 hover:border-violet-200 hover:-translate-y-0.5'"
                >{{ storefrontContent.nav.home }}</NuxtLink>

                <NuxtLink
                  to="/products"
                  class="text-sm font-black px-4 py-2 rounded-full border-2 transition-all"
                  :class="$route.path === '/products' ? 'bg-amber-400 text-amber-900 border-amber-300 shadow-[0_3px_0_0_#d97706] -translate-y-0.5' : 'text-stone-600 border-transparent hover:bg-violet-50 hover:border-violet-200 hover:-translate-y-0.5'"
                >{{ storefrontContent.nav.shop }}</NuxtLink>

                <!-- Categories Dropdown -->
                <div class="relative group flex items-center">
                  <button class="text-sm font-black px-4 py-2 rounded-full border-2 border-transparent text-stone-600 hover:bg-violet-50 hover:border-violet-200 hover:-translate-y-0.5 transition-all flex items-center gap-1">
                    {{ storefrontContent.nav.categories || 'Categories' }}
                    <Icon name="lucide:chevron-down" class="w-3.5 h-3.5" />
                  </button>
                  <div class="absolute top-full left-0 mt-2 w-52 bg-white border-3 border-violet-100 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 rounded-2xl overflow-hidden">
                    <NuxtLink
                      v-for="cat in tenantCategories"
                      :key="cat.id"
                      :to="`/c/${cat.slug}`"
                      class="block px-4 py-3 text-sm font-bold text-stone-700 hover:bg-violet-50 hover:text-violet-700 transition-colors border-b border-violet-50 last:border-0"
                    >{{ categoryDisplayTitle(cat) }}</NuxtLink>
                  </div>
                </div>

                <NuxtLink
                  to="/contact"
                  class="text-sm font-black px-4 py-2 rounded-full border-2 transition-all"
                  :class="$route.path === '/contact' ? 'bg-amber-400 text-amber-900 border-amber-300 shadow-[0_3px_0_0_#d97706] -translate-y-0.5' : 'text-stone-600 border-transparent hover:bg-violet-50 hover:border-violet-200 hover:-translate-y-0.5'"
                >{{ storefrontContent.nav.contact }}</NuxtLink>
              </nav>

              <div class="h-7 w-px bg-violet-100 hidden lg:block" />

              <!-- Icon Actions -->
              <div class="flex items-center gap-2">
                <LocaleSwitcher class="hidden lg:inline-flex" />

                <!-- Wishlist -->
                <button
                  class="relative h-10 w-10 flex items-center justify-center text-stone-500 hover:text-violet-600 hover:bg-violet-50 rounded-full border-2 border-transparent hover:border-violet-200 hover:-translate-y-0.5 transition-all"
                  :title="storefrontContent.header.wishlistTitle"
                  @click="navigateTo('/wishlist')"
                >
                  <Icon name="lucide:heart" class="w-5 h-5" />
                  <ClientOnly>
                    <span
                      v-if="favorites.count.value > 0"
                      class="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-pink-500 text-[10px] font-black text-white absolute -top-0.5 -right-0.5"
                    >{{ favorites.count.value }}</span>
                  </ClientOnly>
                </button>

                <!-- Cart -->
                <NuxtLink
                  v-if="storeSettings?.cartEnabled !== false"
                  to="/cart"
                  class="relative h-11 flex items-center justify-center px-5 rounded-full bg-violet-600 text-white font-black text-sm shadow-[0_4px_0_0_#4c1d95] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all gap-2"
                >
                  <Icon name="lucide:shopping-bag" class="w-4 h-4" />
                  <ClientOnly>
                    <span v-if="cartStore.itemCount > 0" class="bg-amber-400 text-amber-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-black">{{ cartStore.itemCount }}</span>
                  </ClientOnly>
                </NuxtLink>

                <!-- Hamburger -->
                <button class="lg:hidden p-2 rounded-full hover:bg-violet-50 transition-colors" @click="mobileMenuOpen = true">
                  <Icon name="lucide:menu" class="w-5 h-5 text-stone-700" />
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
          <div v-if="mobileMenuOpen" class="fixed top-0 left-0 bottom-0 w-[85%] max-w-xs bg-[#fffbf0] z-[61] shadow-2xl flex flex-col overflow-y-auto border-r-4 border-violet-200">
            <div class="flex items-center justify-between px-5 py-4 border-b-3 border-violet-100">
              <span class="text-lg font-black text-stone-900" style="font-family: 'Fredoka', sans-serif">{{ tenantName }}</span>
              <button class="p-1.5 rounded-full bg-violet-50 text-stone-600" @click="mobileMenuOpen = false">
                <Icon name="lucide:x" class="w-5 h-5" />
              </button>
            </div>

            <div class="px-4 py-3">
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  :placeholder="storefrontContent.search?.placeholder || 'Search...'"
                  class="w-full border-3 border-violet-200 bg-white rounded-full py-2.5 pl-4 pr-10 text-sm text-stone-900 outline-none focus:border-violet-400"
                  @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null"
                  @blur="setTimeout(() => isSearchDropdownOpen = false, 200)"
                >
                <Icon name="lucide:search" class="w-4 h-4 text-violet-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <div v-show="isSearchDropdownOpen" class="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-violet-100 shadow-xl z-50 rounded-2xl overflow-hidden pointer-events-auto">
                  <div v-if="searchLoading" class="px-4 py-3 text-sm text-stone-500">Searching...</div>
                  <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-stone-500">No products found.</div>
                  <div v-else class="flex flex-col">
                    <NuxtLink
                      v-for="product in visibleSearchResults"
                      :key="product.id"
                      :to="'/p/' + product.slug"
                      class="flex items-center gap-3 px-4 py-3 hover:bg-violet-50 transition-colors border-b border-violet-50 last:border-0"
                      @click="isSearchDropdownOpen = false; mobileMenuOpen = false"
                    >
                      <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-10 h-10 object-cover rounded-xl" />
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-bold text-stone-900 truncate">{{ product.title }}</div>
                        <div class="text-xs text-violet-600 font-black">{{ product.price }} {{ currencyCode }}</div>
                      </div>
                    </NuxtLink>
                  </div>
                </div>
              </div>
            </div>

            <nav class="flex flex-col px-4 py-2 gap-1">
              <NuxtLink to="/" class="py-3 px-3 text-sm font-black text-stone-700 hover:text-violet-700 hover:bg-violet-50 rounded-xl transition-colors border-b-2 border-violet-50" @click="mobileMenuOpen = false">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="py-3 px-3 text-sm font-black text-stone-700 hover:text-violet-700 hover:bg-violet-50 rounded-xl transition-colors border-b-2 border-violet-50" @click="mobileMenuOpen = false">{{ storefrontContent.nav.shop }}</NuxtLink>
              <NuxtLink to="/contact" class="py-3 px-3 text-sm font-black text-stone-700 hover:text-violet-700 hover:bg-violet-50 rounded-xl transition-colors border-b-2 border-violet-50" @click="mobileMenuOpen = false">{{ storefrontContent.nav.contact }}</NuxtLink>
            </nav>

            <div v-if="tenantCategories && tenantCategories.length" class="px-4 py-3">
              <h4 class="text-xs font-black uppercase tracking-wider text-violet-400 mb-2 px-3">{{ storefrontContent.nav.categories || 'Categories' }}</h4>
              <div class="flex flex-col gap-1">
                <NuxtLink
                  v-for="cat in tenantCategories"
                  :key="cat.id"
                  :to="'/c/' + cat.slug"
                  class="py-2 px-3 text-sm font-bold text-stone-600 hover:text-violet-700 hover:bg-violet-50 rounded-xl transition-colors"
                  @click="mobileMenuOpen = false"
                >{{ categoryDisplayTitle(cat) }}</NuxtLink>
              </div>
            </div>

            <div class="mt-auto px-4 py-4 border-t-2 border-violet-100">
              <NuxtLink
                v-if="storeSettings?.cartEnabled !== false"
                to="/cart"
                class="flex items-center justify-center gap-2 w-full py-3 bg-violet-600 text-white font-black rounded-full shadow-[0_4px_0_0_#4c1d95] active:translate-y-1 active:shadow-none transition-all"
                @click="mobileMenuOpen = false"
              >
                <Icon name="lucide:shopping-bag" class="w-5 h-5" />
                Cart
                <span v-if="cartStore.itemCount > 0" class="bg-amber-400 text-amber-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-black">{{ cartStore.itemCount }}</span>
              </NuxtLink>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Main Content -->
      <main class="flex-grow">
        <slot />
      </main>

      <!-- Footer Wave -->
      <div class="w-full overflow-hidden leading-none bg-[#fffbf0]">
        <svg viewBox="0 0 1200 60" preserveAspectRatio="none" class="w-full h-8 md:h-12 fill-[#1e1b4b]">
          <path d="M0,0 C300,60 900,0 1200,40 L1200,60 L0,60 Z" />
        </svg>
      </div>

      <!-- Footer -->
      <footer class="bg-[#1e1b4b] text-violet-200 pt-12 pb-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <!-- Brand -->
            <div class="col-span-1 md:col-span-1">
              <h3 class="text-amber-400 text-2xl font-black mb-5 tracking-tight" style="font-family: 'Fredoka', sans-serif">{{ tenantName }}</h3>
              <ul v-if="primaryContactInfos.length" class="space-y-3 text-sm">
                <li v-for="info in primaryContactInfos" :key="info.id" class="flex items-start gap-3">
                  <Icon :name="kindDef(info.kind).iconName" class="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <a
                    v-if="hrefFor(info)"
                    :href="hrefFor(info)!"
                    class="hover:text-white transition-colors font-medium"
                    :target="isExternalHref(hrefFor(info)!) ? '_blank' : undefined"
                    :rel="isExternalHref(hrefFor(info)!) ? 'noopener noreferrer' : undefined"
                  >{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</a>
                  <span v-else class="font-medium">{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                </li>
              </ul>
              <div v-if="socialContactInfosWithHref.length" class="flex flex-wrap gap-3 mt-6">
                <a
                  v-for="info in socialContactInfosWithHref"
                  :key="info.id"
                  :href="info.href"
                  class="h-10 w-10 rounded-full bg-violet-800 border-2 border-violet-600 flex items-center justify-center hover:bg-amber-400 hover:border-amber-300 hover:text-amber-900 hover:-translate-y-0.5 shadow-[0_3px_0_0_#312e81] hover:shadow-[0_3px_0_0_#d97706] active:translate-y-0.5 active:shadow-none transition-all text-violet-300"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="kindDef(info.kind).iconName" class="w-5 h-5" />
                </a>
              </div>
            </div>

            <!-- Links -->
            <div>
              <h4 class="text-white font-black text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                {{ storefrontContent.footer.contact }}
              </h4>
              <ul class="space-y-3 text-sm">
                <li><a href="#" class="hover:text-white hover:translate-x-1 inline-flex transition-all font-medium">{{ storefrontContent.footer.contactUs }}</a></li>
                <li><a href="#" class="hover:text-white hover:translate-x-1 inline-flex transition-all font-medium">{{ storefrontContent.footer.aboutUs }}</a></li>
              </ul>
            </div>
            <div>
              <h4 class="text-white font-black text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-pink-400 inline-block"></span>
                {{ storefrontContent.footer.termsPrivacy }}
              </h4>
              <ul class="space-y-3 text-sm">
                <li><a href="#" class="hover:text-white hover:translate-x-1 inline-flex transition-all font-medium">{{ storefrontContent.footer.termsOfService }}</a></li>
                <li><a href="#" class="hover:text-white hover:translate-x-1 inline-flex transition-all font-medium">{{ storefrontContent.footer.privacyPolicy }}</a></li>
                <li><a href="#" class="hover:text-white hover:translate-x-1 inline-flex transition-all font-medium">{{ storefrontContent.footer.returnPolicy }}</a></li>
              </ul>
            </div>
            <div>
              <h4 class="text-white font-black text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                {{ storefrontContent.footer.help }}
              </h4>
              <ul class="space-y-3 text-sm">
                <li><a href="#" class="hover:text-white hover:translate-x-1 inline-flex transition-all font-medium">{{ storefrontContent.footer.faq }}</a></li>
                <li><a href="#" class="hover:text-white hover:translate-x-1 inline-flex transition-all font-medium">{{ storefrontContent.footer.shippingInfo }}</a></li>
              </ul>
            </div>
          </div>

          <div class="pt-8 border-t border-violet-800 text-center text-sm font-bold text-violet-500">
            {{ storefrontContent.footer.copyright(tenantName) }}
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
