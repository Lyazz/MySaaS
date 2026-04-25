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

const questions = computed(() => []) // ... unused in displayed snippet but preserving structural integrity if needed
// Actually, looking at previous file view, no props were defined.
// Adding props definition.

</script>

<template>
  <StoreThemeProvider>
    <div class="min-h-screen flex flex-col font-wellness text-stone-600 bg-stone-50">
      <!-- Top Announcement Bar -->
      <!-- Top Announcement Bar -->
      <StorefrontSharedAnnouncementBar 
        v-if="!hideNavigation && !hideAnnouncementBar"
        background-color="bg-brand-600"
        text-color="text-white"
      />

      <!-- Header -->
      <!-- Header (Wellness Redesign) -->
      <header v-if="!hideNavigation" :class="['bg-stone-50/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-300', { 'hidden md:block': mobileHeaderHidden }]">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="h-24 flex items-center justify-between gap-8">
            <!-- Left: Logo -->
            <div class="flex-shrink-0 flex items-center">
              <NuxtLink to="/" class="group">
                <template v-if="storeSettings?.logoUrl">
                  <img 
                    :src="storeSettings.logoUrl" 
                    :alt="tenantName" 
                    class="h-10 md:h-12 max-w-[180px] object-contain transition-transform duration-500 group-hover:scale-105"
                  >
                </template>
                <template v-else>
                  <div class="flex items-center gap-2">
                    <div class="h-10 w-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">
                       <Icon name="lucide:flower-2" class="w-6 h-6" />
                    </div>
                    <span class="text-2xl font-wellness font-bold text-stone-800 tracking-tight ml-2">{{ tenantName }}</span>
                  </div>
                </template>
              </NuxtLink>
            </div>

            <!-- Center: Navigation (Pill Style) -->
            <nav class="hidden lg:flex items-center justify-center gap-2 flex-1">
              <NuxtLink to="/" class="px-5 py-2 rounded-full text-sm font-medium text-stone-600 hover:bg-white hover:text-brand-700 hover:shadow-sm transition-all duration-300 ease-out" active-class="bg-white text-brand-800 shadow-sm ring-1 ring-stone-200">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="px-5 py-2 rounded-full text-sm font-medium text-stone-600 hover:bg-white hover:text-brand-700 hover:shadow-sm transition-all duration-300 ease-out" active-class="bg-white text-brand-800 shadow-sm ring-1 ring-stone-200">{{ storefrontContent.nav.shop }}</NuxtLink>

              <!-- Categories Dropdown -->
              <div class="relative group flex items-center h-full">
                <button class="px-5 py-2 rounded-full text-sm font-medium text-stone-600 hover:bg-white hover:text-brand-700 hover:shadow-sm transition-all duration-300 ease-out flex items-center gap-1 cursor-pointer">
                  {{ storefrontContent.nav.categories || 'Categories' }}
                  <Icon name="lucide:chevron-down" class="w-4 h-4" />
                </button>
                <div class="absolute top-[80%] left-0 mt-2 w-48 bg-white border border-slate-100 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 rounded-md overflow-hidden">
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

              <NuxtLink to="/contact" class="px-5 py-2 rounded-full text-sm font-medium text-stone-600 hover:bg-white hover:text-brand-700 hover:shadow-sm transition-all duration-300 ease-out" active-class="bg-white text-brand-800 shadow-sm ring-1 ring-stone-200">{{ storefrontContent.nav.contact }}</NuxtLink>
            </nav>

            <!-- Right: Actions & Search -->
            <div class="flex items-center justify-end gap-4 flex-shrink-0">
               <!-- Search Box with Live Feed -->
               <div class="relative group hidden lg:flex items-center">
                  <input
                    type="text"
                    v-model="searchQuery"
                    :placeholder="storefrontContent.search?.placeholder || 'Search...'"
                    class="w-[120px] sm:w-[160px] p-2 pl-4 pr-10 text-sm text-stone-800 bg-white/60 focus:bg-white border border-stone-200 focus:border-brand-500 rounded-full outline-none transition-all placeholder:text-stone-400"
                    @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null"
                    @blur="setTimeout(() => isSearchDropdownOpen = false, 200)"
                  >
                  <Icon name="lucide:search" class="w-4 h-4 text-stone-400 absolute right-3 pointer-events-none" />

                  <!-- Search Dropdown -->
                  <div
                    v-show="isSearchDropdownOpen"
                    class="absolute top-[100%] right-0 mt-2 w-64 bg-white border border-stone-100 shadow-xl z-50 rounded-[1.5rem] p-2 overflow-hidden text-left pointer-events-auto"
                  >
                    <div v-if="searchLoading" class="px-4 py-3 text-sm text-stone-500">Searching...</div>
                    <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-stone-500">No products found.</div>
                    <div v-else class="flex flex-col gap-1">
                      <NuxtLink
                        v-for="product in visibleSearchResults"
                        :key="product.id"
                        :to="`/product/${product.slug}`"
                        class="flex items-center gap-3 px-3 py-2 hover:bg-stone-50 rounded-[1.2rem] transition-colors"
                        @click="isSearchDropdownOpen = false"
                      >
                        <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-10 h-10 object-cover rounded-[1rem] shadow-sm" />
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-bold text-stone-900 truncate">{{ product.title }}</div>
                          <div class="text-xs text-brand-600 font-bold mt-0.5">{{ formatCurrency(product.effectivePrice ?? product.price) }}<span v-if="product.promotionDiscountPercent" class="ml-1 text-[10px] text-rose-600">-{{ product.promotionDiscountPercent }}%</span></div>
                        </div>
                      </NuxtLink>
                    <button
                      v-if="hasMoreSearchResults"
                      type="button"
                      class="w-full px-4 py-3 text-left text-sm font-semibold text-current hover:opacity-80 transition-opacity"
                      @mousedown.prevent
                      @click="showMoreSearchResults"
                    >
                      See more
                    </button>
                    </div>
                  </div>
               </div>

               <div class="h-6 w-px bg-stone-200 hidden lg:block" />

               <div class="flex items-center gap-2">
                 <LocaleSwitcher class="hidden lg:inline-flex" />
                  <button
                    class="relative p-3 text-stone-500 hover:text-brand-700 hover:bg-white rounded-full transition-all"
                    :title="storefrontContent.header.wishlistTitle"
                    @click="navigateTo('/wishlist')"
                  >
                    <Icon name="lucide:heart" class="w-5 h-5" />
                    <ClientOnly>
                      <span
                        v-if="favorites.count.value > 0"
                        class="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-stone-900 text-[10px] font-bold text-white absolute -top-1 -right-1"
                      >{{ favorites.count.value }}</span>
                    </ClientOnly>
                  </button>
                  <!-- Cart (Organic Pill) -->
                  <NuxtLink
                    v-if="storeSettings?.cartEnabled !== false"
                    to="/cart"
                    class="group relative flex items-center gap-2 px-4 py-2 rounded-full bg-brand-700 text-white shadow-md hover:bg-brand-800 transition-all hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <Icon name="lucide:shopping-bag" class="w-4 h-4" />
                    <span v-if="cartStore.itemCount > 0" class="text-xs font-bold">{{ cartStore.itemCount }}</span>
                  </NuxtLink>
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
          <div v-if="mobileMenuOpen" class="fixed top-0 left-0 bottom-0 w-[85%] max-w-xs bg-white z-[61] shadow-2xl flex flex-col overflow-y-auto">
            <!-- Drawer header -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <span class="text-lg font-bold text-slate-900">{{ tenantName }}</span>
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
                  class="w-full border border-slate-200 bg-slate-50 rounded-lg py-2.5 pl-4 pr-10 text-sm placeholder:text-slate-400 text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null"
                  @blur="setTimeout(() => isSearchDropdownOpen = false, 200)"
                >
                <Icon name="lucide:search" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />

                <div
                  v-show="isSearchDropdownOpen"
                  class="absolute top-[100%] left-0 right-0 mt-1 bg-white border border-slate-100 shadow-xl z-50 rounded-lg overflow-hidden pointer-events-auto"
                >
                  <div v-if="searchLoading" class="px-4 py-3 text-sm text-slate-500">Searching...</div>
                  <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-slate-500">No products found.</div>
                  <div v-else class="flex flex-col">
                    <NuxtLink
                      v-for="product in visibleSearchResults"
                      :key="product.id"
                      :to="'/product/' + product.slug"
                      class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                      @click="isSearchDropdownOpen = false; mobileMenuOpen = false"
                    >
                      <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-10 h-10 object-cover rounded shadow-sm" />
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-slate-900 truncate">{{ product.title }}</div>
                        <div class="text-xs text-brand-600 font-bold mt-0.5">{{ formatCurrency(product.effectivePrice ?? product.price) }}<span v-if="product.promotionDiscountPercent" class="ml-1 text-[10px] text-rose-600">-{{ product.promotionDiscountPercent }}%</span></div>
                      </div>
                    </NuxtLink>
                  <button
                    v-if="hasMoreSearchResults"
                    type="button"
                    class="w-full px-4 py-3 text-left text-sm font-semibold text-current hover:opacity-80 transition-opacity"
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
    class="w-full flex items-center justify-between text-left"
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

      <!-- Footer -->
      <!-- Footer (Wellness Redesign) -->
      <footer class="bg-stone-100 text-stone-600 pt-20 pb-10 border-t border-stone-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <!-- Brand Column -->
            <div class="col-span-1 md:col-span-1">
              <h3 class="font-wellness text-2xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                 <Icon name="lucide:flower-2" class="w-6 h-6 text-brand-600" />
                 {{ tenantName }}
              </h3>
              
              <ul v-if="primaryContactInfos.length" class="space-y-3 text-sm">
                <li v-for="info in primaryContactInfos" :key="info.id" class="flex items-start gap-3">
                  <Icon :name="kindDef(info.kind).iconName" class="w-4 h-4 text-brand-600 mt-1" />
                  <a
                    v-if="hrefFor(info)"
                    :href="hrefFor(info)!"
                    class="hover:text-brand-700 transition-colors"
                    :target="isExternalHref(hrefFor(info)!) ? '_blank' : undefined"
                    :rel="isExternalHref(hrefFor(info)!) ? 'noopener noreferrer' : undefined"
                  >
                    <span>{{ info.value }}</span>
                  </a>
                  <span v-else>{{ info.value }}</span>
                </li>
              </ul>
              
              <!-- Dynamic Socials (Wellness Style) -->
              <div v-if="socialContactInfosWithHref.length" class="flex gap-3 mt-8">
                <a
                  v-for="info in socialContactInfosWithHref"
                  :key="info.id"
                  :href="info.href"
                  class="h-9 w-9 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-white hover:bg-brand-600 hover:border-brand-600 transition-all shadow-sm"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="kindDef(info.kind).iconName" class="w-4 h-4" />
                </a>
              </div>
            </div>

            <!-- Links Column (Contact) -->
            <div>
              <h4 class="font-wellness font-semibold text-stone-900 mb-6">{{ storefrontContent.footer.contact }}</h4>
              <ul class="space-y-3 text-sm">
                <li><a href="#" class="hover:text-brand-700 transition-colors">{{ storefrontContent.footer.contactUs }}</a></li>
                <li><a href="#" class="hover:text-brand-700 transition-colors">{{ storefrontContent.footer.aboutUs }}</a></li>
              </ul>
            </div>

            <!-- Terms & Privacy Column -->
            <div>
               <h4 class="font-wellness font-semibold text-stone-900 mb-6">{{ storefrontContent.footer.termsPrivacy }}</h4>
               <ul class="space-y-3 text-sm">
                 <li><a href="#" class="hover:text-brand-700 transition-colors">{{ storefrontContent.footer.termsOfService }}</a></li>
                 <li><a href="#" class="hover:text-brand-700 transition-colors">{{ storefrontContent.footer.privacyPolicy }}</a></li>
                 <li><a href="#" class="hover:text-brand-700 transition-colors">{{ storefrontContent.footer.returnPolicy }}</a></li>
               </ul>
            </div>

            <!-- Help Column -->
            <div>
               <h4 class="font-wellness font-semibold text-stone-900 mb-6">{{ storefrontContent.footer.help }}</h4>
               <ul class="space-y-3 text-sm">
                 <li><a href="#" class="hover:text-brand-700 transition-colors">{{ storefrontContent.footer.faq }}</a></li>
                 <li><a href="#" class="hover:text-brand-700 transition-colors">{{ storefrontContent.footer.shippingInfo }}</a></li>
               </ul>
            </div>
          </div>

          <!-- Bottom -->
          <div class="pt-8 border-t border-stone-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-stone-400">
            <div>{{ storefrontContent.footer.copyright(tenantName) }}</div>
            <div class="hidden md:block">
               <!-- Payment icons or other bottom elements could go here -->
            </div>
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
