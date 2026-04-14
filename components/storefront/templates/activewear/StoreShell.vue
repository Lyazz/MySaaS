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
   // lazy: true
})


// Mobile menu
const mobileMenuOpen = ref(false)
// Build dynamic menu

// Search Logic
const searchQuery = ref('')
const searchResults = ref([])
const searchLoading = ref(false)
const isSearchDropdownOpen = ref(false)
let searchTimeout

watch(searchQuery, (newVal) => {
    if (newVal.length >= 3) {
        searchLoading.value = true
        isSearchDropdownOpen.value = true
        clearTimeout(searchTimeout)
        searchTimeout = setTimeout(async () => {
            try {
                const url = useTenantApiUrl('/api/products')
                const data = await $fetch(url, {
                    headers: useTenantApiHeaders(),
                    query: { q: newVal }
                })
                searchResults.value = (data || []).slice(0, 5)
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
    <div class="min-h-screen flex flex-col font-activewear text-slate-300 bg-[#0a0a0a]">
      <!-- Top Announcement Bar -->
      <!-- Top Announcement Bar -->
      <StorefrontSharedAnnouncementBar 
        v-if="!hideNavigation && !hideAnnouncementBar"
        background-color="bg-brand-600"
        text-color="text-white"
      />

      <!-- Header -->
      <header v-if="!hideNavigation" :class="['bg-[#111111] border-b-2 border-brand-500 sticky top-0 z-50', { 'hidden md:block': mobileHeaderHidden }]">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="h-16 md:h-20 flex items-center justify-between gap-4">
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
                <div class="h-10 w-10 text-brand-500 flex items-center justify-center skew-x-[-10deg] border-2 border-brand-500">
                  <!-- Placeholder Logo Icon -->
                  <Icon name="lucide:zap" class="w-6 h-6 skew-x-[10deg]" />
                </div>
              </template>
              <span class="text-3xl font-black text-white uppercase italic tracking-wider group-hover:text-brand-500 transition-colors">{{ tenantName }}</span>
            </NuxtLink>

            <!-- Search Bar (Centered & Rounded) -->
               <div class="flex-1 max-w-lg hidden lg:block">
              <div class="relative group">
                <input 
                  type="text" 
                  v-model="searchQuery" :placeholder="storefrontContent.search?.placeholder || 'Search products...'" @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null" @blur="setTimeout(() => isSearchDropdownOpen = false, 200)" 
                  class="w-full h-10 bg-[#1a1a1a] border-2 border-[#333] text-white text-lg font-medium skew-x-[-10deg] focus:ring-0 focus:border-brand-500 block pl-5 pr-10 transition-all placeholder:text-zinc-600 uppercase" 
                >
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Icon name="lucide:search" class="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
                  <!-- Search Dropdown -->
                  <div
                    v-show="isSearchDropdownOpen"
                    class="absolute top-[100%] right-0 mt-2 w-64 bg-white border border-slate-100 shadow-xl z-50 rounded-md overflow-hidden text-left"
                  >
                    <div v-if="searchLoading" class="px-4 py-3 text-sm text-slate-500">Searching...</div>
                    <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-slate-500">No products found.</div>
                    <div v-else class="flex flex-col">
                      <NuxtLink
                        v-for="product in searchResults"
                        :key="product.id"
                        :to="'/p/' + product.slug"
                        class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                        @click="isSearchDropdownOpen = false"
                      >
                        <img v-if="product.images && product.images.length > 0" :src="product.images[0]" class="w-10 h-10 object-cover rounded shadow-sm" />
                        <div v-else class="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                           <Icon name="lucide:image" class="w-4 h-4 text-slate-300" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium text-slate-900 truncate">{{ product.title }}</div>
                          <div class="text-xs text-brand-600 font-bold mt-0.5">{{ product.price }} {{ currencyCode }}</div>
                        </div>
                      </NuxtLink>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <!-- Navigation & Actions -->
            <div class="flex items-center gap-6">
              <!-- Desktop Menu -->
              <nav class="hidden lg:flex items-center gap-6">
                <NuxtLink to="/" class="text-xl font-bold text-slate-300 uppercase italic tracking-wide hover:text-brand-500 hover:skew-x-[-10deg] transition-all" active-class="text-brand-500 skew-x-[-10deg]">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="text-xl font-bold text-slate-300 uppercase italic tracking-wide hover:text-brand-500 hover:skew-x-[-10deg] transition-all" active-class="text-brand-500 skew-x-[-10deg]">{{ storefrontContent.nav.shop }}</NuxtLink>

              <!-- Categories Dropdown -->
              <div class="relative group flex items-center h-full">
                <button class="text-xl font-bold text-slate-300 uppercase italic tracking-wide hover:text-brand-500 hover:skew-x-[-10deg] transition-all flex items-center gap-1 cursor-pointer">
                  {{ storefrontContent.nav.categories || 'Categories' }}
                  <Icon name="lucide:chevron-down" class="w-4 h-4" />
                </button>
                <div class="absolute top-[80%] left-0 mt-2 w-48 bg-white border border-slate-100 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 rounded-md overflow-hidden">
                  <NuxtLink
                    v-for="cat in tenantCategories"
                    :key="cat.id"
                    :to="`/c/${cat.slug}`"
                    class="block px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-700 transition-colors"
                  >
                    {{ cat.title }}
                  </NuxtLink>
                </div>
              </div>

              <NuxtLink to="/contact" class="text-xl font-bold text-slate-300 uppercase italic tracking-wide hover:text-brand-500 hover:skew-x-[-10deg] transition-all" active-class="text-brand-500 skew-x-[-10deg]">{{ storefrontContent.nav.contact }}</NuxtLink>
              </nav>

              <div class="h-6 w-px bg-slate-200 hidden lg:block" />

              <!-- Icons -->
              <div class="flex items-center gap-3">
                <LocaleSwitcher class="hidden lg:inline-flex" />
                <button
                  class="relative h-10 w-10 flex items-center justify-center text-slate-400 hover:text-brand-500 hover:bg-[#222] skew-x-[-10deg] transition-all"
                  :title="storefrontContent.header.wishlistTitle"
                  @click="navigateTo('/wishlist')"
                >
                  <Icon name="lucide:flame" class="w-5 h-5 skew-x-[10deg]" />
                  <ClientOnly>
                    <span
                      v-if="favorites.count.value > 0"
                      class="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-brand-500 text-[10px] font-black text-black absolute -top-1 -right-1 skew-x-[10deg]"
                    >{{ favorites.count.value }}</span>
                  </ClientOnly>
                </button>
                <!-- Cart -->
                <NuxtLink
                  v-if="storeSettings?.cartEnabled !== false"
                  to="/cart"
                  class="group relative h-10 flex items-center justify-center px-6 bg-brand-500 text-black font-black text-xl uppercase italic skew-x-[-15deg] hover:bg-white transition-all transform hover:-translate-y-0.5"
                >
                  <div class="skew-x-[15deg] flex items-center">
                    <Icon name="lucide:shopping-bag" class="w-5 h-5" />
                    <span
                      v-if="cartStore.itemCount > 0"
                      class="ml-1.5"
                    >{{ cartStore.itemCount }}</span>
                  </div>
                </NuxtLink>
                <!-- Hamburger (Mobile) -->
               <button class="lg:hidden p-1" @click="mobileMenuOpen = true">
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
                  class="absolute top-[100%] left-0 right-0 mt-1 bg-white border border-slate-100 shadow-xl z-50 rounded-lg overflow-hidden"
                >
                  <div v-if="searchLoading" class="px-4 py-3 text-sm text-slate-500">Searching...</div>
                  <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-slate-500">No products found.</div>
                  <div v-else class="flex flex-col">
                    <NuxtLink
                      v-for="product in searchResults"
                      :key="product.id"
                      :to="'/p/' + product.slug"
                      class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                      @click="isSearchDropdownOpen = false; mobileMenuOpen = false"
                    >
                      <img v-if="product.images && product.images.length > 0" :src="product.images[0]" class="w-10 h-10 object-cover rounded shadow-sm" />
                      <div v-else class="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                         <Icon name="lucide:image" class="w-4 h-4 text-slate-300" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-slate-900 truncate">{{ product.title }}</div>
                        <div class="text-xs text-brand-600 font-bold mt-0.5">{{ product.price }} {{ currencyCode }}</div>
                      </div>
                    </NuxtLink>
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
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{{ storefrontContent.nav.categories || 'Categories' }}</h4>
              <div class="flex flex-col gap-1">
                <NuxtLink
                  v-for="cat in tenantCategories"
                  :key="cat.id"
                  :to="'/c/' + cat.slug"
                  class="py-2 text-sm text-slate-600 hover:text-brand-600 transition-colors"
                  @click="mobileMenuOpen = false"
                >
                  {{ cat.title }}
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
      <footer class="bg-black text-slate-400 pt-16 pb-8 border-t-4 border-brand-500">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <!-- Brand Column -->
            <div class="col-span-1 md:col-span-1">
              <h3 class="text-white text-lg font-bold mb-6">
                {{ tenantName }}
              </h3>
              <ul v-if="primaryContactInfos.length" class="space-y-4 text-sm">
                <li v-for="info in primaryContactInfos" :key="info.id" class="flex items-start gap-3">
                  <Icon :name="kindDef(info.kind).iconName" class="w-5 h-5 text-brand-500 mt-0.5" />
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
                  class="h-10 w-10 rounded-full bg-navy-800 flex items-center justify-center hover:bg-brand-600 transition-colors text-white"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="kindDef(info.kind).iconName" class="w-5 h-5" />
                </a>
              </div>
            </div>

            <!-- Links Column -->
            <div>
              <h4 class="text-white font-semibold mb-6">
                {{ storefrontContent.footer.contact }}
              </h4>
              <ul class="space-y-3 text-sm text-slate-400">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-400 transition-colors"
                  >{{ storefrontContent.footer.contactUs }}</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-400 transition-colors"
                  >{{ storefrontContent.footer.aboutUs }}</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="text-white font-semibold mb-6">
                {{ storefrontContent.footer.termsPrivacy }}
              </h4>
              <ul class="space-y-3 text-sm text-slate-400">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-400 transition-colors"
                  >{{ storefrontContent.footer.termsOfService }}</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-400 transition-colors"
                  >{{ storefrontContent.footer.privacyPolicy }}</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-400 transition-colors"
                  >{{ storefrontContent.footer.returnPolicy }}</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="text-white font-semibold mb-6">
                {{ storefrontContent.footer.help }}
              </h4>
              <ul class="space-y-3 text-sm text-slate-400">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-400 transition-colors"
                  >{{ storefrontContent.footer.faq }}</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-400 transition-colors"
                  >{{ storefrontContent.footer.shippingInfo }}</a>
                </li>
              </ul>
            </div>
          </div>

          <div class="pt-8 border-t border-navy-800 text-center text-xs text-slate-500">
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
