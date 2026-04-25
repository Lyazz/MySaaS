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

const currentYear = new Date().getFullYear()
</script>

<template>
  <StoreThemeProvider>
    <div class="min-h-screen flex flex-col max-w-[1920px] mx-auto">
      <!-- Top Announcement Bar -->
      <!-- Top Announcement Bar -->
      <StorefrontSharedAnnouncementBar v-if="!hideNavigation && !hideAnnouncementBar" />

      <!-- Header -->
      <header v-if="!hideNavigation" :class="['sticky top-4 z-50 px-4 md:px-8', { 'hidden md:block': mobileHeaderHidden }]">
        <div class="max-w-7xl mx-auto bg-[#FDFBF7]/90 backdrop-blur-lg border border-white/40 shadow-soft rounded-[2rem] px-6 py-4 flex items-center justify-between gap-4 transition-all duration-500 hover:shadow-lg hover:bg-[#FDFBF7]/95">
          <!-- Logo -->
          <NuxtLink to="/" class="flex-shrink-0 flex items-center gap-2 group">
            <template v-if="storeSettings?.logoUrl">
              <img 
                :src="storeSettings.logoUrl" 
                :alt="tenantName" 
                class="h-10 max-w-[140px] object-contain group-hover:scale-105 transition-transform duration-500"
              >
            </template>
            <template v-else>
              <div class="h-10 w-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center">
                <Icon name="lucide:store" class="w-6 h-6" />
              </div>
            </template>
            <span class="font-cozy text-xl font-bold text-slate-800 group-hover:text-brand-500 transition-colors tracking-tight">{{ tenantName }}</span>
          </NuxtLink>

          <!-- Desktop Menu -->
          <nav class="hidden lg:flex items-center gap-2 bg-slate-50/50 rounded-full px-2 py-1 border border-white">
            <NuxtLink to="/" class="font-medium text-slate-500 px-5 py-2 rounded-full hover:bg-white hover:text-brand-500 hover:shadow-sm transition-all text-sm" active-class="bg-white text-brand-500 shadow-sm">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="font-medium text-slate-500 px-5 py-2 rounded-full hover:bg-white hover:text-brand-500 hover:shadow-sm transition-all text-sm" active-class="bg-white text-brand-500 shadow-sm">{{ storefrontContent.nav.shop }}</NuxtLink>

              <!-- Categories Dropdown -->
              <div class="relative group flex items-center h-full">
                <button class="font-medium text-slate-500 px-5 py-2 rounded-full hover:bg-white hover:text-brand-500 hover:shadow-sm transition-all text-sm flex items-center gap-1 cursor-pointer">
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

              <NuxtLink to="/contact" class="font-medium text-slate-500 px-5 py-2 rounded-full hover:bg-white hover:text-brand-500 hover:shadow-sm transition-all text-sm" active-class="bg-white text-brand-500 shadow-sm">{{ storefrontContent.nav.contact }}</NuxtLink>
          </nav>

          <!-- Actions -->
          <div class="flex items-center gap-3">
            <!-- Icons -->
            <LocaleSwitcher class="hidden lg:inline-flex" />
            <button
              class="relative h-10 w-10 flex items-center justify-center text-slate-400 hover:text-brand-500 hover:bg-slate-50 rounded-full transition-colors"
              :title="storefrontContent.header.wishlistTitle"
              @click="navigateTo('/wishlist')"
            >
              <Icon name="lucide:heart" class="w-5 h-5" />
              <ClientOnly>
                <span
                  v-if="favorites.count.value > 0"
                  class="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white absolute -top-1 -right-1"
                >{{ favorites.count.value }}</span>
              </ClientOnly>
            </button>
            <!-- Cart -->
            <NuxtLink
              v-if="storeSettings?.cartEnabled !== false"
              to="/cart"
              class="group relative h-10 flex items-center justify-center px-4 rounded-full bg-brand-500 text-white shadow-md hover:bg-brand-600 transition-all hover:shadow-lg"
            >
              <Icon name="lucide:handbag" class="w-5 h-5" />
              <span
                v-if="cartStore.itemCount > 0"
                class="ml-1 text-xs font-bold"
              >{{ cartStore.itemCount }}</span>
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
                      :to="'/product/' + product.slug"
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
      <main class="flex-grow mt-8 px-4 md:px-8">
        <div class="max-w-7xl mx-auto bg-white/50 rounded-[3rem] min-h-[50vh] overflow-hidden shadow-soft border border-white">
          <slot />
        </div>
      </main>

      <!-- Footer -->
      <footer class="mt-16 pb-8 px-4 md:px-8">
        <div class="max-w-7xl mx-auto bg-white rounded-[3rem] p-12 md:p-16 shadow-soft border border-slate-100">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <!-- Brand Column -->
            <div class="col-span-1 md:col-span-1">
              <h3 class="font-cozy font-bold text-lg text-slate-800 mb-6">
                {{ tenantName }}
              </h3>
              <ul v-if="primaryContactInfos.length" class="space-y-4 text-sm">
                <li v-for="info in primaryContactInfos" :key="info.id" class="flex items-start gap-3">
                  <Icon :name="kindDef(info.kind).iconName" class="w-5 h-5 text-brand-400 mt-0.5" />
                  <a
                    v-if="hrefFor(info)"
                    :href="hrefFor(info)!"
                    class="hover:text-brand-500 transition-colors text-slate-500"
                    :target="isExternalHref(hrefFor(info)!) ? '_blank' : undefined"
                    :rel="isExternalHref(hrefFor(info)!) ? 'noopener noreferrer' : undefined"
                  >
                    <span>{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                  </a>
                  <span v-else class="text-slate-500">{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                </li>
              </ul>
              <div v-if="socialContactInfosWithHref.length" class="flex gap-4 mt-6">
                <a
                  v-for="info in socialContactInfosWithHref"
                  :key="info.id"
                  :href="info.href"
                  class="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-brand-50 transition-colors text-slate-400 hover:text-brand-500"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="kindDef(info.kind).iconName" class="w-5 h-5" />
                </a>
              </div>
            </div>

            <!-- Links Column -->
            <div>
              <h4 class="font-medium text-slate-800 mb-6">
                {{ storefrontContent.footer.contact }}
              </h4>
              <ul class="space-y-3 text-sm text-slate-500">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-500 transition-colors"
                  >{{ storefrontContent.footer.contactUs }}</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-500 transition-colors"
                  >{{ storefrontContent.footer.aboutUs }}</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="font-medium text-slate-800 mb-6">
                {{ storefrontContent.footer.termsPrivacy }}
              </h4>
              <ul class="space-y-3 text-sm text-slate-500">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-500 transition-colors"
                  >{{ storefrontContent.footer.termsOfService }}</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-500 transition-colors"
                  >{{ storefrontContent.footer.privacyPolicy }}</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-500 transition-colors"
                  >{{ storefrontContent.footer.returnPolicy }}</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="font-medium text-slate-800 mb-6">
                {{ storefrontContent.footer.help }}
              </h4>
              <ul class="space-y-3 text-sm text-slate-500">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-500 transition-colors"
                  >{{ storefrontContent.footer.faq }}</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-500 transition-colors"
                  >{{ storefrontContent.footer.shippingInfo }}</a>
                </li>
              </ul>
            </div>
          </div>

          <div class="pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
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
