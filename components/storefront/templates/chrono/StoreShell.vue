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
    <div class="min-h-screen flex flex-col" style="font-family: 'Cormorant Garamond', serif; background-color: #0E1117; color: #E8E0D5;">
      <!-- Top Announcement Bar -->
      <StorefrontSharedAnnouncementBar
        v-if="!hideNavigation && !hideAnnouncementBar"
        background-color="bg-[#1A1F2E]"
        text-color="text-[#D4C5A9]"
      />
      <StorefrontSharedClearanceBanner v-if="!hideNavigation && !hideAnnouncementBar" />
      <StorefrontSharedClearanceAnnouncementDialog />

      <!-- Header -->
      <header v-if="!hideNavigation" :class="['sticky top-0 z-50 backdrop-blur-md border-b', { 'hidden md:block': mobileHeaderHidden }]" style="background-color: rgba(14,17,23,0.96); border-color: rgba(212,197,169,0.12);">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="h-16 md:h-20 flex items-center justify-between gap-4">
            <!-- Logo -->
            <NuxtLink to="/" class="flex-shrink-0 flex items-center gap-3 group">
              <template v-if="storeSettings?.logoUrl">
                <img 
                  :src="storeSettings.logoUrl" 
                  :alt="tenantName" 
                  class="h-10 max-w-[140px] object-contain"
                >
              </template>
              <template v-else>
                <div class="h-10 w-10 border border-[#D4C5A9]/30 bg-[#1A1F2E] flex items-center justify-center rounded-sm">
                  <Icon name="lucide:watch" class="w-5 h-5 text-[#A67C52]" />
                </div>
              </template>
              <div class="flex flex-col leading-tight">
                <span class="text-lg font-semibold tracking-[0.18em] uppercase" style="color: #E8E0D5; letter-spacing: 0.18em;">{{ tenantName }}</span>
                <span v-if="storeSettings?.description" class="text-[9px] tracking-[0.35em] uppercase truncate max-w-[200px]" style="color: #A67C52;">{{ storeSettings.description }}</span>
              </div>
            </NuxtLink>

            <!-- Navigation & Actions -->
            <div class="flex items-center gap-6">
              <!-- Desktop Menu -->
              <nav class="hidden lg:flex items-center gap-8">
                <NuxtLink to="/" class="text-xs font-medium tracking-[0.2em] uppercase transition-colors duration-200" active-class="!text-[#D4C5A9]">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="text-xs font-medium tracking-[0.2em] uppercase transition-colors duration-200" active-class="!text-[#D4C5A9]">{{ storefrontContent.nav.shop }}</NuxtLink>

              <!-- Categories Dropdown -->
              <div class="relative group flex items-center h-full">
                <button class="text-xs font-medium tracking-[0.2em] uppercase transition-colors duration-200 flex items-center gap-1 cursor-pointer">
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

              <NuxtLink to="/contact" class="text-xs font-medium tracking-[0.2em] uppercase transition-colors duration-200" active-class="!text-[#D4C5A9]">{{ storefrontContent.nav.contact }}</NuxtLink>
              </nav>

              <div class="h-5 w-px bg-[#D4C5A9]/10 hidden lg:block" />

              <!-- Icons -->
              <div class="flex items-center gap-2">
                <LocaleSwitcher class="hidden lg:inline-flex" />
                <button
                  class="relative h-10 w-10 flex items-center justify-center transition-colors"
                  style="color: #6B7280;"
                  :title="storefrontContent.header.wishlistTitle"
                  @click="navigateTo('/wishlist')"
                  @mouseover="($event.target as HTMLElement).closest('button')!.style.color = '#D4C5A9'"
                  @mouseleave="($event.target as HTMLElement).closest('button')!.style.color = '#6B7280'"
                >
                  <Icon name="lucide:heart" class="w-5 h-5" />
                  <span
                    v-if="favorites.count.value > 0"
                    class="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#0E1117] text-[10px] font-bold text-[#D4C5A9] absolute -top-1 -right-1"
                  >{{ favorites.count.value }}</span>
                </button>
                <!-- Cart -->
                <NuxtLink
                  v-if="storeSettings?.cartEnabled !== false"
                  to="/cart"
                  class="group relative h-10 flex items-center justify-center px-4 rounded-sm transition-all duration-200 text-sm tracking-wider"
                  style="background-color: #1F2533; border: 1px solid rgba(212,197,169,0.2); color: #D4C5A9;"
                  @mouseover="($event.target as HTMLElement).closest('a')!.style.backgroundColor = '#A67C52'; ($event.target as HTMLElement).closest('a')!.style.color = '#fff'; ($event.target as HTMLElement).closest('a')!.style.borderColor = '#A67C52'"
                  @mouseleave="($event.target as HTMLElement).closest('a')!.style.backgroundColor = '#1F2533'; ($event.target as HTMLElement).closest('a')!.style.color = '#D4C5A9'; ($event.target as HTMLElement).closest('a')!.style.borderColor = 'rgba(212,197,169,0.2)'"
                >
                  <Icon name="lucide:shopping-bag" class="w-4 h-4" />
                  <span v-if="cartStore.itemCount > 0" class="ms-1.5 text-xs font-bold">{{ cartStore.itemCount }}</span>
                </NuxtLink>
                <!-- Hamburger (Mobile) -->
              <button class="lg:hidden p-1" style="color: #E8E0D5;" @click="mobileMenuOpen = true">
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
          <div v-if="mobileMenuOpen" class="fixed top-0 start-0 bottom-0 w-[85%] max-w-xs z-[61] shadow-2xl flex flex-col overflow-y-auto" style="background-color: #0E1117;">
            <div class="flex items-center justify-between px-5 py-4 border-b" style="border-color: rgba(212,197,169,0.12);">
              <span class="text-lg font-bold" style="color: #E8E0D5;">{{ tenantName }}</span>
              <button @click="mobileMenuOpen = false" class="p-1" style="color: #6B7280;">
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
                  class="w-full rounded-lg py-2.5 ps-4 pe-10 text-sm outline-none"
                  style="background-color: #1A1F2E; border: 1px solid rgba(212,197,169,0.15); color: #E8E0D5;"
                  @focus="openSearchDropdown"
                  @blur="closeSearchDropdownSoon"
                >
                <Icon name="lucide:search" class="w-4 h-4 absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" style="color: #6B7280;" />

                <div
                  v-show="isSearchDropdownOpen"
                  class="absolute top-[100%] start-0 end-0 mt-1 shadow-xl z-50 rounded-lg overflow-hidden pointer-events-auto"
                  style="background-color: #1A1F2E; border: 1px solid rgba(212,197,169,0.12);"
                >
                  <div v-if="searchLoading" class="px-4 py-3 text-sm" style="color: #7A7060;">{{ storefrontContent.search.searching }}</div>
                  <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm" style="color: #7A7060;">{{ storefrontContent.search.noResults }}</div>
                  <div v-else class="flex flex-col">
                    <NuxtLink
                      v-for="product in visibleSearchResults"
                      :key="product.id"
                      :to="`/product/${product.slug}`"
                      class="flex items-center gap-3 px-4 py-3 transition-colors"
                      style="border-bottom: 1px solid rgba(212,197,169,0.06);"
                      @click="isSearchDropdownOpen = false; mobileMenuOpen = false"
                    >
                      <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-10 h-10 object-cover rounded shadow-sm" />
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium truncate" style="color: #E8E0D5;">{{ product.title }}</div>
                        <div class="text-xs font-bold mt-0.5" style="color: #A67C52;">{{ formatCurrency(product.effectivePrice ?? product.price) }}<span v-if="product.promotionDiscountPercent" class="ms-1 text-[10px] text-rose-600">-{{ product.promotionDiscountPercent }}%</span></div>
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
              <NuxtLink to="/" class="py-3 text-sm font-medium" style="color: #D4C5A9; border-bottom: 1px solid rgba(212,197,169,0.06);" @click="mobileMenuOpen = false">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="py-3 text-sm font-medium" style="color: #D4C5A9; border-bottom: 1px solid rgba(212,197,169,0.06);" @click="mobileMenuOpen = false">{{ storefrontContent.nav.shop }}</NuxtLink>
              <NuxtLink to="/contact" class="py-3 text-sm font-medium" style="color: #D4C5A9; border-bottom: 1px solid rgba(212,197,169,0.06);" @click="mobileMenuOpen = false">{{ storefrontContent.nav.contact }}</NuxtLink>
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
      <footer class="pt-16 pb-8 border-t" style="background-color: #080B12; border-color: rgba(212,197,169,0.08); color: #7A7060;">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <!-- Brand Column -->
            <div class="col-span-1 md:col-span-1">
              <div class="mb-2">
                <h3 class="text-base font-semibold mb-1 tracking-[0.15em] uppercase" style="color: #E8E0D5;">
                  {{ tenantName }}
                </h3>
                <div class="w-8 h-px mb-6" style="background-color: #A67C52;"></div>
              </div>
              <ul v-if="primaryContactInfos.length" class="space-y-4 text-sm">
                <li v-for="info in primaryContactInfos" :key="info.id" class="flex items-start gap-3">
                  <Icon :name="kindDef(info.kind).iconName" class="w-4 h-4 mt-0.5" style="color: #A67C52;" />
                  <a
                    v-if="hrefFor(info)"
                    :href="hrefFor(info)!"
                    class="transition-colors text-sm"
                    style="color: #7A7060;"
                    :target="isExternalHref(hrefFor(info)!) ? '_blank' : undefined"
                    :rel="isExternalHref(hrefFor(info)!) ? 'noopener noreferrer' : undefined"
                  >
                    <span>{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                  </a>
                  <span v-else class="text-sm" style="color: #7A7060;">{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                </li>
              </ul>
              <div v-if="socialContactInfosWithHref.length" class="flex gap-3 mt-6">
                <a
                  v-for="info in socialContactInfosWithHref"
                  :key="info.id"
                  :href="info.href"
                  class="h-9 w-9 border rounded-sm flex items-center justify-center transition-all text-sm"
                  style="border-color: rgba(212,197,169,0.15); color: #7A7060;"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="kindDef(info.kind).iconName" class="w-4 h-4" />
                </a>
              </div>
            </div>

            <!-- Links Columns -->
            <div v-if="legalLinks.contact.enabled">
              <h4 class="font-semibold mb-5 tracking-[0.15em] uppercase text-xs" style="color: #D4C5A9;">
                {{ storefrontContent.footer.contact }}
              </h4>
              <ul class="space-y-3 text-sm" style="color: #7A7060;">
                <li><NuxtLink v-if="legalLinks.contact.enabled" :to="legalLinks.contact.path" class="transition-colors hover:text-[#D4C5A9]">{{ storefrontContent.footer.contactUs }}</NuxtLink></li>
              </ul>
            </div>
            <div v-if="legalLinks.terms.enabled || legalLinks.privacy.enabled || legalLinks.returns.enabled">
              <h4 class="font-semibold mb-5 tracking-[0.15em] uppercase text-xs" style="color: #D4C5A9;">
                {{ storefrontContent.footer.termsPrivacy }}
              </h4>
              <ul class="space-y-3 text-sm" style="color: #7A7060;">
                <li><NuxtLink v-if="legalLinks.terms.enabled" :to="legalLinks.terms.path" class="transition-colors hover:text-[#D4C5A9]">{{ storefrontContent.footer.termsOfService }}</NuxtLink></li>
                <li><NuxtLink v-if="legalLinks.privacy.enabled" :to="legalLinks.privacy.path" class="transition-colors hover:text-[#D4C5A9]">{{ storefrontContent.footer.privacyPolicy }}</NuxtLink></li>
                <li><NuxtLink v-if="legalLinks.returns.enabled" :to="legalLinks.returns.path" class="transition-colors hover:text-[#D4C5A9]">{{ storefrontContent.footer.returnPolicy }}</NuxtLink></li>
              </ul>
            </div>
          </div>

          <div class="pt-8 border-t text-center text-xs" style="border-color: rgba(212,197,169,0.08); color: #4A4540;">
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
</style>
