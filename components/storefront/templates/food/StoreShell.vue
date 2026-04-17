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
const socialContactInfosWithHref = computed(() =>
    activeContactInfos.value
        .filter((i) => CONTACT_INFO_DEF_BY_KIND[i.kind].category === 'social')
        .map((i) => ({ ...i, href: buildContactInfoHref(i.kind, i.value) }))
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

// Search Logic
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const searchLoading = ref(false)
const isSearchDropdownOpen = ref(false)
let searchTimeout: any

watch(searchQuery, (newVal) => {
    if (newVal.length >= 3) {
        searchLoading.value = true
        isSearchDropdownOpen.value = true
        clearTimeout(searchTimeout)
        searchTimeout = setTimeout(async () => {
            try {
                const url = useTenantApiUrl('/api/products')
                const data = await $fetch<any[]>(url, {
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


// Mobile menu
const mobileMenuOpen = ref(false)
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
    <div class="min-h-screen flex flex-col font-sans text-stone-600 bg-[#f8faf9] relative selection:bg-orange-100 selection:text-orange-900">
      <!-- Top Announcement Bar -->
      <!-- Top Announcement Bar -->
      <StorefrontSharedAnnouncementBar 
        v-if="!hideNavigation && !hideAnnouncementBar"
        background-color="bg-brand-600"
        text-color="text-white"
      />
  
      <!-- Floating Navigation Pill -->
      <header 
        v-if="!hideNavigation" 
        :class="['sticky top-4 z-50 transition-all duration-300 px-4 sm:px-6 lg:px-8 pointer-events-none', { 'hidden md:block': mobileHeaderHidden }]"
      >
        <div class="max-w-7xl mx-auto pointer-events-auto">
          <div class="bg-white/90 backdrop-blur-md rounded-[2rem] shadow-xl shadow-stone-200/50 border border-white/50 px-6 h-20 flex items-center justify-between gap-8 transition-all hover:bg-white/95">
            
            <!-- Logo (Left) -->
            <NuxtLink
              to="/"
              class="flex-shrink-0 flex items-center gap-3 group relative"
            >
              <div class="relative">
                 <div class="absolute -inset-2 bg-brand-100/50 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                 <template v-if="storeSettings?.logoUrl">
                    <img 
                    :src="storeSettings.logoUrl" 
                    :alt="tenantName" 
                    class="h-10 max-w-[140px] object-contain relative z-10"
                    >
                 </template>
                 <template v-else>
                    <div class="h-11 w-11 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-200 relative z-10 transform group-hover:rotate-12 transition-transform duration-300">
                        <Icon name="lucide:chef-hat" class="w-6 h-6" />
                    </div>
                 </template>
              </div>
              <span class="text-2xl font-bold text-stone-900 group-hover:text-brand-600 transition-colors tracking-tight">{{ tenantName }}</span>
            </NuxtLink>

            <!-- Desktop Menu (Center) -->
            <nav class="hidden lg:flex items-center gap-1 bg-stone-50/50 rounded-full px-2 py-1.5 border border-stone-100/50">
                <NuxtLink to="/" class="px-5 py-2 text-sm font-bold text-stone-600 rounded-full transition-all hover:bg-white hover:text-brand-600 hover:shadow-sm" active-class="bg-white text-brand-600 shadow-sm">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="px-5 py-2 text-sm font-bold text-stone-600 rounded-full transition-all hover:bg-white hover:text-brand-600 hover:shadow-sm" active-class="bg-white text-brand-600 shadow-sm">{{ storefrontContent.nav.shop }}</NuxtLink>

              <!-- Categories Dropdown -->
              <div class="relative group flex items-center h-full">
                <button class="px-5 py-2 text-sm font-bold text-stone-600 rounded-full transition-all hover:bg-white hover:text-brand-600 hover:shadow-sm flex items-center gap-1 cursor-pointer">
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

              <NuxtLink to="/contact" class="px-5 py-2 text-sm font-bold text-stone-600 rounded-full transition-all hover:bg-white hover:text-brand-600 hover:shadow-sm" active-class="bg-white text-brand-600 shadow-sm">{{ storefrontContent.nav.contact }}</NuxtLink>
            </nav>

            <!-- Actions (Right) -->
            <div class="flex items-center gap-3">
               <!-- Search Box with Live Feed -->
              <div class="relative group hidden lg:flex items-center">
                <input 
                  type="text" 
                  v-model="searchQuery"
                  :placeholder="storefrontContent.search?.placeholder || 'Search...'"
                  class="w-[120px] sm:w-[160px] h-11 bg-stone-50/50 border border-stone-200 text-stone-900 text-sm rounded-full focus:ring-2 focus:ring-brand-500 focus:bg-white block pl-4 pr-10 transition-all shadow-sm group-hover:bg-white" 
                  @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null"
                  @blur="setTimeout(() => isSearchDropdownOpen = false, 200)"
                >
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Icon name="lucide:search" class="w-5 h-5 text-stone-400 group-hover:text-brand-500 transition-colors" />
                </div>
                
                <!-- Search Dropdown -->
                <div
                  v-show="isSearchDropdownOpen"
                  class="absolute top-[100%] right-0 mt-2 w-64 bg-white border border-stone-100 shadow-xl z-50 rounded-[1.5rem] p-2 overflow-hidden text-left pointer-events-auto"
                >
                  <div v-if="searchLoading" class="px-4 py-3 text-sm text-stone-500">Searching...</div>
                  <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-stone-500">No products found.</div>
                  <div v-else class="flex flex-col gap-1">
                    <NuxtLink
                      v-for="product in searchResults"
                      :key="product.id"
                      :to="`/p/${product.slug}`"
                      class="flex items-center gap-3 px-3 py-2 hover:bg-stone-50 rounded-[1.2rem] transition-colors"
                      @click="isSearchDropdownOpen = false"
                    >
                      <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-10 h-10 object-cover rounded-full shadow-sm" />
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-bold text-stone-900 truncate">{{ product.title }}</div>
                        <div class="text-xs text-brand-600 font-bold mt-0.5">{{ product.price }} {{ currencyCode }}</div>
                      </div>
                    </NuxtLink>
                  </div>
                </div>
              </div>

              <div class="h-8 w-px bg-stone-200 hidden sm:block" />

              <LocaleSwitcher class="hidden lg:inline-flex" />

              <button
                class="relative hidden sm:flex h-11 w-11 items-center justify-center text-stone-500 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors"
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
              <!-- Cart with pill shape -->
              <NuxtLink
                v-if="storeSettings?.cartEnabled !== false"
                to="/cart"
                class="group relative h-11 pl-4 pr-5 flex items-center gap-2 rounded-full bg-stone-900 text-white shadow-lg hover:bg-brand-600 hover:shadow-brand-200 transition-all duration-300"
              >
                <div class="relative">
                    <Icon name="lucide:shopping-basket" class="w-5 h-5 group-hover:animate-bounce" />
                    <span v-if="cartStore.itemCount > 0" class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-stone-900 group-hover:border-brand-600"></span>
                </div>
                <span class="font-bold text-sm">{{ cartStore.itemCount }} <span class="hidden xl:inline text-xs opacity-70 font-normal">items</span></span>
              </NuxtLink>
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
                      v-for="product in searchResults"
                      :key="product.id"
                      :to="'/p/' + product.slug"
                      class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                      @click="isSearchDropdownOpen = false; mobileMenuOpen = false"
                    >
                      <img :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'" class="w-10 h-10 object-cover rounded shadow-sm" />
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

      <!-- Organic Footer -->
      <footer class="mt-auto relative bg-[#1c1917] text-stone-300 pt-24 pb-12 overflow-hidden">
        <!-- Wavy Top Border (SVG) -->
        <div class="absolute top-0 left-0 w-full overflow-hidden leading-none rotate-180 text-[#f8faf9]">
            <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" class="relative block w-[calc(110%+1.3px)] h-[80px]">
                <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" class="fill-current"></path>
                <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" class="fill-current"></path>
                <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" class="fill-current"></path>
            </svg>
        </div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
            
            <!-- Brand Column (Large) -->
            <div class="md:col-span-5 space-y-6">
               <div class="inline-flex items-center gap-3 bg-stone-800/50 px-4 py-2 rounded-full border border-stone-700/50">
                   <div class="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center text-white">
                        <Icon name="lucide:chef-hat" class="w-4 h-4" />
                   </div>
                   <span class="text-xl font-bold text-white tracking-wide">{{ tenantName }}</span>
               </div>
               <p class="text-stone-400 leading-relaxed max-w-sm">
                   Shop the best products for your needs. Quality guaranteed.
               </p>
               <ul v-if="primaryContactInfos.length" class="space-y-3 text-sm text-stone-400">
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
               <div v-if="socialContactInfosWithHref.length" class="flex gap-4 pt-4">
                 <a
                   v-for="info in socialContactInfosWithHref"
                   :key="info.id"
                   :href="info.href"
                   class="h-12 w-12 rounded-full bg-stone-800 flex items-center justify-center hover:bg-brand-600 hover:rotate-12 transition-all duration-300 text-white border border-stone-700 hover:border-brand-500"
                   :target="isExternalHref(info.href) ? '_blank' : undefined"
                   :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                 >
                   <Icon :name="kindDef(info.kind).iconName" class="w-5 h-5" />
                 </a>
               </div>
            </div>

            <!-- Links Columns (Masonry style spacing) -->
            <div class="md:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-8">
               <div>
                 <h4 class="text-white font-bold mb-6 text-lg">{{ storefrontContent.footer.contact }}</h4>
                 <ul class="space-y-4 text-sm text-stone-400">
                    <li><a href="#" class="hover:text-brand-400 transition-colors flex items-center gap-2 group"><span class="w-1.5 h-1.5 rounded-full bg-stone-600 group-hover:bg-brand-500 transition-colors"></span> {{ storefrontContent.footer.contactUs }}</a></li>
                    <li><a href="#" class="hover:text-brand-400 transition-colors flex items-center gap-2 group"><span class="w-1.5 h-1.5 rounded-full bg-stone-600 group-hover:bg-brand-500 transition-colors"></span> {{ storefrontContent.footer.aboutUs }}</a></li>
                 </ul>
               </div>
               <div>
                 <h4 class="text-white font-bold mb-6 text-lg">{{ storefrontContent.footer.termsPrivacy }}</h4>
                 <ul class="space-y-4 text-sm text-stone-400">
                    <li><a href="#" class="hover:text-brand-400 transition-colors flex items-center gap-2 group"><span class="w-1.5 h-1.5 rounded-full bg-stone-600 group-hover:bg-brand-500 transition-colors"></span> {{ storefrontContent.footer.termsOfService }}</a></li>
                    <li><a href="#" class="hover:text-brand-400 transition-colors flex items-center gap-2 group"><span class="w-1.5 h-1.5 rounded-full bg-stone-600 group-hover:bg-brand-500 transition-colors"></span> {{ storefrontContent.footer.privacyPolicy }}</a></li>
                    <li><a href="#" class="hover:text-brand-400 transition-colors flex items-center gap-2 group"><span class="w-1.5 h-1.5 rounded-full bg-stone-600 group-hover:bg-brand-500 transition-colors"></span> {{ storefrontContent.footer.returnPolicy }}</a></li>
                 </ul>
               </div>
                <div>
                 <h4 class="text-white font-bold mb-6 text-lg">{{ storefrontContent.footer.help }}</h4>
                 <ul class="space-y-4 text-sm text-stone-400">
                    <li><a href="#" class="hover:text-brand-400 transition-colors flex items-center gap-2 group"><span class="w-1.5 h-1.5 rounded-full bg-stone-600 group-hover:bg-brand-500 transition-colors"></span> {{ storefrontContent.footer.faq }}</a></li>
                    <li><a href="#" class="hover:text-brand-400 transition-colors flex items-center gap-2 group"><span class="w-1.5 h-1.5 rounded-full bg-stone-600 group-hover:bg-brand-500 transition-colors"></span> {{ storefrontContent.footer.shippingInfo }}</a></li>
                 </ul>
               </div>
            </div>
          </div>

          <div class="pt-8 border-t border-stone-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-stone-600">
            <div>{{ storefrontContent.footer.copyright(tenantName) }}</div>
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
