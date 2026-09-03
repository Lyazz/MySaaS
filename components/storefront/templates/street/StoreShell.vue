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
})


// Mobile menu
const mobileMenuOpen = ref(false)
const mobileCategoriesDropdownOpen = ref(false)
watch(mobileMenuOpen, (open) => {
    if (!open) mobileCategoriesDropdownOpen.value = false
})

// Drawer search — mirrors the other templates' StoreShell search.
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const searchLoading = ref(false)
const isSearchDropdownOpen = ref(false)
// Suggestions must price like the rest of the storefront: promo first, raw price only as a fallback.
const applySearchResultPricing = (products: any) => (Array.isArray(products) ? products : []).map((product: any) => {
    const pricing = buildActiveProductPricing(product)
    return {
        ...product,
        effectivePrice: pricing.effectivePrice,
        promotionDiscountPercent: pricing.promotionDiscountPercent
    }
})
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
let searchTimeout: any

watch(searchQuery, (newVal) => {
    if ((newVal?.length ?? 0) >= 3) {
        searchLoading.value = true
        isSearchDropdownOpen.value = true
        clearTimeout(searchTimeout)
        searchTimeout = setTimeout(async () => {
            try {
                const data = await $fetch<any[]>(useTenantApiUrl('/api/products'), {
                    headers: useTenantApiHeaders(),
                    query: { q: newVal },
                })
                searchResults.value = applySearchResultPricing(data)
            } catch (e) {
                console.error('Search error:', e)
                searchResults.value = []
            } finally {
                searchLoading.value = false
            }
        }, 500)
    } else {
        clearTimeout(searchTimeout)
        searchResults.value = []
        searchLoading.value = false
        isSearchDropdownOpen.value = false
    }
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

const currentYear = new Date().getFullYear()
</script>

<template>
  <StoreThemeProvider>
    <div class="min-h-screen flex flex-col border-x-4 border-black max-w-[1920px] mx-auto bg-white shadow-[8px_0_0_0_#000,-8px_0_0_0_#000]">
      <!-- Top Announcement Bar -->
      <!-- Top Announcement Bar -->
      <StorefrontSharedAnnouncementBar
        v-if="!hideNavigation && !hideAnnouncementBar"
        background-color="bg-brand border-b-4 border-black"
        text-color="text-black font-mono uppercase"
      />
      <StorefrontSharedClearanceBanner v-if="!hideNavigation && !hideAnnouncementBar" />
      <StorefrontSharedClearanceAnnouncementDialog />

      <!-- Header -->
      <header v-if="!hideNavigation" :class="['sticky top-0 z-50 bg-white border-b-4 border-black', { 'hidden md:block': mobileHeaderHidden }]">
        <div class="max-w-7xl mx-auto px-4 py-4 md:py-6 flex items-center justify-between gap-4">
          <!-- Logo -->
          <NuxtLink to="/" class="flex-shrink-0">
            <template v-if="storeSettings?.logoUrl">
              <img 
                :src="storeSettings.logoUrl" 
                :alt="tenantName" 
                class="h-10 md:h-14 object-contain grayscale contrast-125 hover:contrast-100 transition-all border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-y-1 hover:translate-x-1 hover:shadow-none bg-white p-1"
              >
            </template>
            <template v-else>
              <h1 class="text-4xl md:text-6xl font-street uppercase leading-none tracking-tighter bg-brand px-2 border-2 border-black shadow-[4px_4px_0px_0px_#000]">
                {{ tenantName }}
              </h1>
            </template>
          </NuxtLink>

          <!-- Desktop Menu -->
          <nav class="hidden lg:flex items-center gap-6">
            <NuxtLink to="/" class="font-street text-xl uppercase hover:bg-brand hover:text-black hover:underline decoration-4 underline-offset-4 px-2 py-1 transition-all" active-class="bg-brand text-black">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="font-street text-xl uppercase hover:bg-brand hover:text-black hover:underline decoration-4 underline-offset-4 px-2 py-1 transition-all" active-class="bg-brand text-black">{{ storefrontContent.nav.shop }}</NuxtLink>

              <!-- Categories Dropdown -->
              <div class="relative group flex items-center h-full">
                <button class="font-street text-xl uppercase hover:bg-brand hover:text-black hover:underline decoration-4 underline-offset-4 px-2 py-1 transition-all flex items-center gap-1 cursor-pointer">
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

              <NuxtLink to="/contact" class="font-street text-xl uppercase hover:bg-brand hover:text-black hover:underline decoration-4 underline-offset-4 px-2 py-1 transition-all" active-class="bg-brand text-black">{{ storefrontContent.nav.contact }}</NuxtLink>
          </nav>

          <!-- Actions -->
          <div class="flex items-center gap-4">
            <!-- Icons -->
            <LocaleSwitcher class="hidden lg:inline-flex border-black bg-white" />
            <button
              class="relative h-10 w-10 flex items-center justify-center border-2 border-black hover:bg-brand transition-colors"
              :title="storefrontContent.header.wishlistTitle"
              @click="navigateTo('/wishlist')"
            >
              <Icon name="lucide:heart" class="w-5 h-5" />
              <ClientOnly>
                <span
                  v-if="favorites.count.value > 0"
                  class="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white absolute -top-1 -end-1 border-2 border-black"
                >{{ favorites.count.value }}</span>
              </ClientOnly>
            </button>
            <!-- Cart -->
            <NuxtLink
              v-if="storeSettings?.cartEnabled !== false"
              to="/cart"
              class="relative group"
            >
              <div class="h-12 px-3 lg:px-6 flex items-center gap-2 bg-black text-brand border-2 border-black shadow-[4px_4px_0px_0px_rgba(255,222,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                <Icon name="lucide:handbag" class="w-5 h-5" />
                <span class="font-street text-xl hidden lg:inline">{{ storefrontContent.cart.label }}</span>
                <div class="bg-brand text-black font-bold h-6 w-6 flex items-center justify-center border border-black text-xs">
                  {{ cartStore.itemCount }}
                </div>
              </div>
            </NuxtLink>
                <!-- Hamburger (Mobile) -->
               <button class="lg:hidden p-1" @click="mobileMenuOpen = true">
                 <Icon name="lucide:menu" class="w-6 h-6" />
               </button>

          </div>
        </div>
      </header>

      <!-- Mobile Drawer -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="mobileMenuOpen" class="fixed inset-0 bg-black/40 z-[60]" @click="mobileMenuOpen = false" />
        </Transition>
        <Transition name="slide">
          <div v-if="mobileMenuOpen" class="fixed top-0 start-0 bottom-0 w-[85%] max-w-xs bg-white z-[61] border-e-4 border-black shadow-[8px_0_0_0_rgba(0,0,0,0.15)] flex flex-col overflow-y-auto">
            <!-- Drawer header -->
            <div class="flex items-center justify-between px-5 py-4 border-b-4 border-black">
              <span class="font-street text-2xl uppercase leading-none">{{ tenantName }}</span>
              <button @click="mobileMenuOpen = false" class="p-1 border-2 border-black hover:bg-brand transition-colors">
                <Icon name="lucide:x" class="w-5 h-5" />
              </button>
            </div>

            <!-- Search -->
            <div class="px-5 py-4">
              <div class="relative">
                <input
                  type="text"
                  v-model="searchQuery"
                  :placeholder="storefrontContent.search.placeholder"
                  class="w-full border-2 border-black bg-gray-100 py-2.5 ps-4 pe-10 font-mono text-sm uppercase placeholder:text-gray-400 text-black outline-none focus:shadow-[4px_4px_0_0_var(--brand)] transition-all"
                  @focus="openSearchDropdown"
                  @blur="closeSearchDropdownSoon"
                >
                <Icon name="lucide:search" class="w-4 h-4 text-black absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />

                <div
                  v-show="isSearchDropdownOpen"
                  class="absolute top-[100%] start-0 end-0 mt-1 bg-white border-2 border-black shadow-[4px_4px_0_0_#000] z-50 overflow-hidden pointer-events-auto"
                >
                  <div v-if="searchLoading" class="px-4 py-3 font-mono text-xs uppercase text-gray-500">{{ storefrontContent.search.searching }}</div>
                  <div v-else-if="searchResults.length === 0" class="px-4 py-3 font-mono text-xs uppercase text-gray-500">{{ storefrontContent.search.noResults }}</div>
                  <div v-else class="flex flex-col">
                    <NuxtLink
                      v-for="product in searchResults"
                      :key="product.id"
                      :to="'/product/' + product.slug"
                      class="flex items-center gap-3 px-4 py-3 hover:bg-brand transition-colors border-b-2 border-black last:border-0"
                      @click="isSearchDropdownOpen = false; mobileMenuOpen = false"
                    >
                      <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-10 h-10 object-cover border-2 border-black" />
                      <div class="flex-1 min-w-0">
                        <div class="font-street text-base uppercase leading-none truncate">{{ product.title }}</div>
                        <div class="font-mono text-xs font-bold mt-1">
                          {{ formatCurrency(product.effectivePrice ?? product.price) }}
                          <span v-if="product.promotionDiscountPercent" class="ms-1 text-[10px] text-red-600">-{{ product.promotionDiscountPercent }}%</span>
                        </div>
                      </div>
                    </NuxtLink>
                  </div>
                </div>
              </div>
            </div>

            <!-- Nav links -->
            <nav class="flex flex-col px-5">
              <NuxtLink to="/" class="py-3 font-street text-2xl uppercase border-b-2 border-black hover:bg-brand hover:text-black px-2 -mx-2 transition-colors" @click="mobileMenuOpen = false">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="py-3 font-street text-2xl uppercase border-b-2 border-black hover:bg-brand hover:text-black px-2 -mx-2 transition-colors" @click="mobileMenuOpen = false">{{ storefrontContent.nav.shop }}</NuxtLink>
              <NuxtLink to="/contact" class="py-3 font-street text-2xl uppercase border-b-2 border-black hover:bg-brand hover:text-black px-2 -mx-2 transition-colors" @click="mobileMenuOpen = false">{{ storefrontContent.nav.contact }}</NuxtLink>
            </nav>
            <!-- Language: the header switcher is desktop-only, so the drawer carries it on mobile. -->
            <div class="px-5 py-3">
              <LocaleSwitcher show-labels />
            </div>

            <!-- Categories -->
            <div v-if="tenantCategories && tenantCategories.length" class="px-5 py-4">
  <button
    type="button"
    class="w-full flex items-center justify-between text-start mb-2"
    @click="mobileCategoriesDropdownOpen = !mobileCategoriesDropdownOpen"
  >
    <h4 class="font-street text-lg uppercase">
      {{ storefrontContent.nav.categories || 'Categories' }}
    </h4>
    <Icon
      name="lucide:chevron-down"
      class="w-4 h-4 text-black transition-transform"
      :class="mobileCategoriesDropdownOpen ? 'rotate-180' : ''"
    />
  </button>
  <div v-show="mobileCategoriesDropdownOpen" class="flex flex-col">
    <NuxtLink
      v-for="cat in tenantCategories"
      :key="cat.id"
      :to="'/category/' + cat.slug"
      class="py-2 font-mono text-sm uppercase text-gray-600 hover:text-black hover:bg-brand px-2 -mx-2 transition-colors"
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
      <main class="flex-grow bg-white">
        <slot />
      </main>

      <!-- Footer -->
      <footer class="border-t-4 border-black bg-black text-white pt-16 pb-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <!-- Brand Column -->
            <div class="col-span-1 md:col-span-1">
              <h3 class="font-street text-4xl mb-6 bg-white text-black inline-block px-2 border-2 border-brand shadow-[4px_4px_0px_0px_var(--brand)]">
                {{ tenantName }}
              </h3>
              <ul v-if="primaryContactInfos.length" class="space-y-4 font-mono text-sm uppercase">
                <li v-for="info in primaryContactInfos" :key="info.id" class="flex items-start gap-3">
                  <Icon :name="kindDef(info.kind).iconName" class="w-5 h-5 text-brand mt-0.5" />
                  <a
                    v-if="hrefFor(info)"
                    :href="hrefFor(info)!"
                    class="hover:text-brand transition-colors"
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
                  class="w-12 h-12 border-2 border-white flex items-center justify-center hover:bg-brand hover:border-brand hover:text-black transition-all shadow-[4px_4px_0px_0px_#fff] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="kindDef(info.kind).iconName" class="w-5 h-5" />
                </a>
              </div>
            </div>

            <!-- Links Column -->
            <div v-if="legalLinks.contact.enabled">
              <h4 class="font-street text-2xl text-brand mb-6 uppercase">
                {{ storefrontContent.footer.contact }}
              </h4>
              <ul class="space-y-3 font-mono text-sm uppercase text-gray-400">
                <li>
                  <NuxtLink v-if="legalLinks.contact.enabled" :to="legalLinks.contact.path" class="hover:text-brand hover:bg-brand/10 px-1 transition-colors">{{ storefrontContent.footer.contactUs }}</NuxtLink>
                </li>
</ul>
            </div>
            <div v-if="legalLinks.terms.enabled || legalLinks.privacy.enabled || legalLinks.returns.enabled">
              <h4 class="font-street text-2xl text-brand mb-6 uppercase">
                {{ storefrontContent.footer.termsPrivacy }}
              </h4>
              <ul class="space-y-3 font-mono text-sm uppercase text-gray-400">
                <li>
                  <NuxtLink v-if="legalLinks.terms.enabled" :to="legalLinks.terms.path" class="hover:text-brand hover:bg-brand/10 px-1 transition-colors">{{ storefrontContent.footer.termsOfService }}</NuxtLink>
                </li>
                <li>
                  <NuxtLink v-if="legalLinks.privacy.enabled" :to="legalLinks.privacy.path" class="hover:text-brand hover:bg-brand/10 px-1 transition-colors">{{ storefrontContent.footer.privacyPolicy }}</NuxtLink>
                </li>
                <li>
                  <NuxtLink v-if="legalLinks.returns.enabled" :to="legalLinks.returns.path" class="hover:text-brand hover:bg-brand/10 px-1 transition-colors">{{ storefrontContent.footer.returnPolicy }}</NuxtLink>
                </li>
              </ul>
            </div>
          </div>

          <div class="pt-8 border-t-2 border-gray-800 text-center font-mono text-xs text-gray-500 uppercase">
            {{ storefrontContent.footer.copyright(tenantName) }}
            <div class="mt-2 normal-case"><StorefrontSharedPoweredBy /></div>
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
