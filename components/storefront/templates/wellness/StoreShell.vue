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
defineProps<{
    hideNavigation?: boolean
    mobileHeaderHidden?: boolean
    hideAnnouncementBar?: boolean
}>()
</script>

<template>
  <StoreThemeProvider>
    <div class="min-h-screen flex flex-col font-wellness text-wl-ink bg-wl-paper">
      <!-- Top Announcement Bar -->
      <StorefrontSharedAnnouncementBar
        v-if="!hideNavigation && !hideAnnouncementBar"
        background-color="bg-wl-ink"
        text-color="text-wl-paper"
      />
      <div v-if="!hideNavigation && !hideAnnouncementBar" class="wl-shared-banner">
        <StorefrontSharedClearanceBanner />
      </div>
      <StorefrontSharedClearanceAnnouncementDialog root-class="cl-wellness" />

      <!-- Header — label stock, held down by a single strong rule -->
      <header v-if="!hideNavigation" :class="['bg-wl-card text-wl-ink border-b border-wl-ruleStrong shadow-wl sticky top-0 z-50', { 'hidden md:block': mobileHeaderHidden }]">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="h-20 flex items-center justify-between gap-8">
            <!-- Left: mark + wordmark. The name is always set, logo or not. -->
            <div class="min-w-0 flex items-center">
              <NuxtLink to="/" class="group flex items-center gap-3 min-w-0">
                <!--
                  Decorative alt: the store name sits beside it as real text, so
                  captioning the image would announce the name twice.
                -->
                <img
                  v-if="storeSettings?.logoUrl"
                  :src="storeSettings.logoUrl"
                  alt=""
                  class="h-9 md:h-10 max-w-[110px] object-contain flex-shrink-0"
                >
                <span v-else class="h-9 w-9 border border-wl-oliveSoft bg-wl-oliveWash flex items-center justify-center flex-shrink-0">
                   <Icon name="lucide:flower-2" class="w-4 h-4 text-wl-oliveDeep" />
                </span>

                <span
                  v-if="storeSettings?.logoUrl"
                  class="h-6 w-px bg-wl-rule flex-shrink-0 hidden sm:block"
                  aria-hidden="true"
                />

                <span class="wl-display-sm text-lg sm:text-xl text-wl-ink truncate">{{ tenantName }}</span>
              </NuxtLink>
            </div>

            <!-- Center: Navigation -->
            <nav class="hidden lg:flex items-center justify-center gap-8 flex-1">
              <NuxtLink to="/" class="wl-label text-wl-muted hover:text-wl-ink transition-colors py-1" active-class="!text-wl-ink border-b-2 border-wl-olive">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="wl-label text-wl-muted hover:text-wl-ink transition-colors py-1" active-class="!text-wl-ink border-b-2 border-wl-olive">{{ storefrontContent.nav.shop }}</NuxtLink>

              <!-- Categories Dropdown -->
              <div class="relative group flex items-center">
                <button class="wl-label text-wl-muted hover:text-wl-ink transition-colors py-1 flex items-center gap-1.5 cursor-pointer">
                  {{ storefrontContent.nav.categories || 'Categories' }}
                  <Icon name="lucide:chevron-down" class="w-3 h-3" />
                </button>
                <div class="absolute top-full start-0 pt-4 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-50">
                  <div class="wl-plate wl-plate-lg py-1">
                    <NuxtLink
                      v-for="cat in tenantCategories"
                      :key="cat.id"
                      :to="`/category/${cat.slug}`"
                      class="block px-4 py-2.5 text-sm text-wl-muted hover:text-wl-oliveDeep hover:bg-wl-oliveWash transition-colors"
                    >
                      {{ categoryDisplayTitle(cat) }}
                    </NuxtLink>
                  </div>
                </div>
              </div>

              <NuxtLink to="/contact" class="wl-label text-wl-muted hover:text-wl-ink transition-colors py-1" active-class="!text-wl-ink border-b-2 border-wl-olive">{{ storefrontContent.nav.contact }}</NuxtLink>
            </nav>

            <!-- Right: Actions & Search -->
            <div class="flex items-center justify-end gap-1 sm:gap-3 flex-shrink-0">
               <!-- Search: a ruled field, not a pill -->
               <div class="relative group hidden lg:flex items-center">
                  <input
                    type="text"
                    v-model="searchQuery"
                    :placeholder="storefrontContent.search?.placeholder || 'Search...'"
                    class="w-[150px] focus:w-[210px] py-1.5 pe-6 text-sm text-wl-ink bg-transparent border-b border-wl-rule focus:border-wl-olive outline-none transition-all duration-300 placeholder:text-wl-muted/60"
                    @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null"
                    @blur="setTimeout(() => isSearchDropdownOpen = false, 200)"
                  >
                  <Icon name="lucide:search" class="w-3.5 h-3.5 text-wl-muted absolute end-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />

                  <!-- Search Dropdown -->
                  <div
                    v-show="isSearchDropdownOpen"
                    class="absolute top-full end-0 mt-3 w-72 wl-plate wl-plate-lg z-50 overflow-hidden text-start pointer-events-auto"
                  >
                    <div v-if="searchLoading" class="px-4 py-3 text-sm text-wl-muted">Searching...</div>
                    <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-wl-muted">No products found.</div>
                    <div v-else class="flex flex-col">
                      <NuxtLink
                        v-for="product in visibleSearchResults"
                        :key="product.id"
                        :to="`/product/${product.slug}`"
                        class="flex items-center gap-3 px-3 py-2.5 hover:bg-wl-oliveWash transition-colors border-b border-wl-rule/50 last:border-0"
                        @click="isSearchDropdownOpen = false"
                      >
                        <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-11 h-11 object-cover border border-wl-rule" />
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium text-wl-ink truncate">{{ product.title }}</div>
                          <div class="wl-num text-xs text-wl-muted mt-0.5">{{ formatCurrency(product.effectivePrice ?? product.price) }}<span v-if="product.promotionDiscountPercent" class="ms-1.5 wl-label !text-[10px] text-wl-henna">-{{ product.promotionDiscountPercent }}%</span></div>
                        </div>
                      </NuxtLink>
                    <button
                      v-if="hasMoreSearchResults"
                      type="button"
                      class="w-full px-4 py-3 text-start wl-label text-wl-ink hover:bg-wl-paper transition-colors border-t border-wl-rule"
                      @mousedown.prevent
                      @click="showMoreSearchResults"
                    >
                      See more
                    </button>
                    </div>
                  </div>
               </div>

               <div class="h-5 w-px bg-wl-rule hidden lg:block" />

               <div class="flex items-center gap-1 sm:gap-2">
                 <LocaleSwitcher class="hidden lg:inline-flex" />
                  <button
                    class="relative p-2.5 text-wl-muted hover:text-wl-henna transition-colors"
                    :title="storefrontContent.header.wishlistTitle"
                    @click="navigateTo('/wishlist')"
                  >
                    <Icon name="lucide:heart" class="w-5 h-5" />
                    <ClientOnly>
                      <span
                        v-if="favorites.count.value > 0"
                        class="wl-num flex h-4 min-w-4 px-1 items-center justify-center bg-wl-ink text-[10px] font-semibold text-wl-paper absolute top-0.5 end-0.5"
                      >{{ favorites.count.value }}</span>
                    </ClientOnly>
                  </button>
                  <!-- Cart: ink that greens on hover, like every other primary action -->
                  <NuxtLink
                    v-if="storeSettings?.cartEnabled !== false"
                    to="/cart"
                    class="wl-cta group relative flex items-center gap-2 px-4 py-2"
                  >
                    <Icon name="lucide:shopping-bag" class="w-4 h-4" />
                    <span v-if="cartStore.itemCount > 0" class="wl-num text-xs font-semibold">{{ cartStore.itemCount }}</span>
                  </NuxtLink>

                  <!-- Mobile menu -->
                  <button
                    type="button"
                    class="lg:hidden p-2.5 text-wl-muted hover:text-wl-ink transition-colors"
                    :aria-expanded="mobileMenuOpen"
                    aria-controls="wellness-mobile-drawer"
                    :aria-label="storefrontContent.nav.categories || 'Categories'"
                    @click="mobileMenuOpen = true"
                  >
                    <Icon name="lucide:menu" class="w-5 h-5" />
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
          <div v-if="mobileMenuOpen" id="wellness-mobile-drawer" class="wl-root fixed top-0 start-0 bottom-0 w-[85%] max-w-xs bg-wl-paper z-[61] shadow-2xl flex flex-col overflow-y-auto font-wellness">
            <!-- Drawer header -->
            <div class="flex items-center justify-between px-5 h-20 bg-wl-card border-b-2 border-wl-olive text-wl-ink">
              <span class="wl-display-sm text-xl">{{ tenantName }}</span>
              <button @click="mobileMenuOpen = false" class="p-1 text-wl-muted hover:text-wl-ink transition-colors">
                <Icon name="lucide:x" class="w-5 h-5" />
              </button>
            </div>

            <!-- Search -->
            <div class="px-5 py-5">
              <div class="relative">
                <input
                  type="text"
                  v-model="searchQuery"
                  :placeholder="storefrontContent.search?.placeholder || 'Search products...'"
                  class="w-full border-b border-wl-ruleStrong bg-transparent py-2.5 pe-8 text-sm placeholder:text-wl-muted/60 text-wl-ink outline-none focus:border-wl-olive transition-colors"
                  @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null"
                  @blur="setTimeout(() => isSearchDropdownOpen = false, 200)"
                >
                <Icon name="lucide:search" class="w-4 h-4 text-wl-muted absolute end-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />

                <div
                  v-show="isSearchDropdownOpen"
                  class="absolute top-full start-0 end-0 mt-1 wl-plate wl-plate-lg z-50 overflow-hidden pointer-events-auto"
                >
                  <div v-if="searchLoading" class="px-4 py-3 text-sm text-wl-muted">Searching...</div>
                  <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-wl-muted">No products found.</div>
                  <div v-else class="flex flex-col">
                    <NuxtLink
                      v-for="product in visibleSearchResults"
                      :key="product.id"
                      :to="'/product/' + product.slug"
                      class="flex items-center gap-3 px-4 py-3 hover:bg-wl-oliveWash transition-colors border-b border-wl-rule/50 last:border-0"
                      @click="isSearchDropdownOpen = false; mobileMenuOpen = false"
                    >
                      <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-10 h-10 object-cover border border-wl-rule" />
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-wl-ink truncate">{{ product.title }}</div>
                                                <div class="wl-num text-xs text-wl-muted mt-0.5">{{ formatCurrency(product.effectivePrice ?? product.price) }}<span v-if="product.promotionDiscountPercent" class="ms-1.5 wl-label !text-[10px] text-wl-henna">-{{ product.promotionDiscountPercent }}%</span></div>
                      </div>
                    </NuxtLink>
                  <button
                    v-if="hasMoreSearchResults"
                    type="button"
                    class="w-full px-4 py-3 text-start wl-label text-wl-ink hover:bg-wl-paper transition-colors border-t border-wl-rule"
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
            <nav class="flex flex-col px-5">
              <NuxtLink to="/" class="py-4 wl-label text-wl-ink border-t border-wl-rule" @click="mobileMenuOpen = false">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="py-4 wl-label text-wl-ink border-t border-wl-rule" @click="mobileMenuOpen = false">{{ storefrontContent.nav.shop }}</NuxtLink>
              <NuxtLink to="/contact" class="py-4 wl-label text-wl-ink border-t border-wl-rule" @click="mobileMenuOpen = false">{{ storefrontContent.nav.contact }}</NuxtLink>
            </nav>

            <!-- Categories -->
            <div v-if="tenantCategories && tenantCategories.length" class="px-5">
              <button
                type="button"
                class="w-full flex items-center justify-between text-start py-4 border-t border-wl-rule"
                @click="mobileCategoriesDropdownOpen = !mobileCategoriesDropdownOpen"
              >
                <span class="wl-label text-wl-muted">
                  {{ storefrontContent.nav.categories || 'Categories' }}
                </span>
                <Icon
                  name="lucide:chevron-down"
                  class="w-4 h-4 text-wl-muted transition-transform"
                  :class="mobileCategoriesDropdownOpen ? 'rotate-180' : ''"
                />
              </button>
              <div v-show="mobileCategoriesDropdownOpen" class="flex flex-col pb-4">
                <NuxtLink
                  v-for="cat in tenantCategories"
                  :key="cat.id"
                  :to="'/category/' + cat.slug"
                  class="py-2.5 text-sm text-wl-muted hover:text-wl-ink transition-colors"
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

      <!--
        Footer — the base of the bottle. The one dark surface in the theme:
        glazed tile green, so the cream page above it reads as a label applied
        to something, rather than as paper floating on more paper.
      -->
      <footer class="wl-ground-deep pt-20 pb-10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 mb-16">
            <!-- Brand Column -->
            <div class="col-span-1 md:col-span-1 md:pe-12">
              <h3 class="wl-display-sm wl-on-deep text-2xl mb-6 flex items-center gap-3">
                 <Icon name="lucide:flower-2" class="w-5 h-5 text-wl-oliveSoft" />
                 {{ tenantName }}
              </h3>

              <ul v-if="primaryContactInfos.length" class="space-y-3 text-sm">
                <li v-for="info in primaryContactInfos" :key="info.id" class="flex items-start gap-3">
                  <Icon :name="kindDef(info.kind).iconName" class="w-4 h-4 text-wl-oliveSoft mt-0.5 flex-shrink-0" />
                  <a
                    v-if="hrefFor(info)"
                    :href="hrefFor(info)!"
                    class="transition-colors"
                    :target="isExternalHref(hrefFor(info)!) ? '_blank' : undefined"
                    :rel="isExternalHref(hrefFor(info)!) ? 'noopener noreferrer' : undefined"
                  >
                    <span>{{ info.value }}</span>
                  </a>
                  <span v-else>{{ info.value }}</span>
                </li>
              </ul>

              <!-- Dynamic Socials -->
              <div v-if="socialContactInfosWithHref.length" class="flex gap-2 mt-8">
                <a
                  v-for="info in socialContactInfosWithHref"
                  :key="info.id"
                  :href="info.href"
                  class="h-9 w-9 border border-white/15 flex items-center justify-center hover:bg-wl-olive hover:border-wl-olive hover:text-wl-zelligeDeep transition-colors"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="kindDef(info.kind).iconName" class="w-4 h-4" />
                </a>
              </div>
            </div>

            <!-- Links Column (Contact) -->
            <div class="md:border-s md:border-white/10 md:ps-8">
              <h4 class="wl-label text-wl-oliveSoft mb-6">{{ storefrontContent.footer.contact }}</h4>
              <ul class="space-y-3 text-sm">
                <li><NuxtLink v-if="legalLinks.contact.enabled" :to="legalLinks.contact.path" class="transition-colors">{{ storefrontContent.footer.contactUs }}</NuxtLink></li>
              </ul>
            </div>

            <!-- Terms & Privacy Column -->
            <div class="md:border-s md:border-white/10 md:ps-8">
               <h4 class="wl-label text-wl-oliveSoft mb-6">{{ storefrontContent.footer.termsPrivacy }}</h4>
               <ul class="space-y-3 text-sm">
                 <li><NuxtLink v-if="legalLinks.terms.enabled" :to="legalLinks.terms.path" class="transition-colors">{{ storefrontContent.footer.termsOfService }}</NuxtLink></li>
                 <li><NuxtLink v-if="legalLinks.privacy.enabled" :to="legalLinks.privacy.path" class="transition-colors">{{ storefrontContent.footer.privacyPolicy }}</NuxtLink></li>
                 <li><NuxtLink v-if="legalLinks.returns.enabled" :to="legalLinks.returns.path" class="transition-colors">{{ storefrontContent.footer.returnPolicy }}</NuxtLink></li>
               </ul>
            </div>

          </div>

          <!-- Bottom -->
          <div class="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 wl-label !tracking-[0.12em]">
            <div>{{ storefrontContent.footer.copyright(tenantName) }}</div>
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
</style>
