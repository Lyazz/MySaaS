<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import StoreThemeProvider from './ThemeProvider.vue'
import { CONTACT_INFO_DEF_BY_KIND, buildContactInfoHref, type ContactInfoKind } from '~/shared/contact-infos'

const cartStore = useCartStore()
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
})

// Build dynamic menu (same as Modern)
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
    <div class="min-h-screen flex flex-col font-sans text-purple-200 bg-[#0d0515]">
      <!-- Top Announcement Bar -->
      <!-- Top Announcement Bar -->
      <StorefrontSharedAnnouncementBar 
        v-if="!hideNavigation && !hideAnnouncementBar"
        background-color="bg-gradient-to-r from-pink-600 to-orange-500"
        text-color="text-white"
      />

      <!-- Header -->
      <header v-if="!hideNavigation" :class="['bg-[#1a0a2e]/95 border-b border-purple-500/20 sticky top-0 z-50 backdrop-blur-md', { 'hidden md:block': mobileHeaderHidden }]">
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
                <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/30">
                  <Icon name="lucide:store" class="w-6 h-6" />
                </div>
              </template>
              <span class="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 group-hover:from-pink-300 group-hover:to-orange-300 transition-colors tracking-tight">{{ tenantName }}</span>
            </NuxtLink>

            <!-- Search Bar (Centered & Rounded) -->
            <div class="flex-1 max-w-lg hidden md:block">
              <div class="relative group">
                <input 
                  type="text" 
                  :placeholder="storefrontContent.search.placeholder"
                  class="w-full h-10 bg-purple-900/30 border border-purple-500/30 text-white text-sm rounded-full focus:ring-2 focus:ring-pink-500 focus:border-transparent block pl-5 pr-10 transition-all shadow-sm group-hover:bg-purple-900/50 placeholder:text-purple-400/50" 
                >
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Icon name="lucide:search" class="w-5 h-5 text-purple-400 group-hover:text-pink-400 transition-colors" />
                </div>
              </div>
            </div>

            <!-- Navigation & Actions -->
            <div class="flex items-center gap-6">
              <!-- Desktop Menu -->
              <nav class="hidden lg:flex items-center gap-6">
                <NuxtLink to="/" class="text-sm font-medium text-purple-200/70 hover:text-pink-400 transition-colors" active-class="text-pink-400 font-semibold">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="text-sm font-medium text-purple-200/70 hover:text-pink-400 transition-colors" active-class="text-pink-400 font-semibold">{{ storefrontContent.nav.shop }}</NuxtLink>

              <!-- Categories Dropdown -->
              <div class="relative group flex items-center h-full">
                <button class="text-sm font-medium text-purple-200/70 hover:text-pink-400 transition-colors flex items-center gap-1 cursor-pointer">
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

              <NuxtLink to="/contact" class="text-sm font-medium text-purple-200/70 hover:text-pink-400 transition-colors" active-class="text-pink-400 font-semibold">{{ storefrontContent.nav.contact }}</NuxtLink>
              </nav>

              <div class="h-6 w-px bg-purple-500/30 hidden lg:block" />

              <!-- Icons -->
              <div class="flex items-center gap-3">
                <LocaleSwitcher class="hidden lg:inline-flex border-purple-500/30 bg-purple-900/20" />
                <button
                  class="h-10 w-10 flex items-center justify-center text-purple-300 hover:text-pink-400 hover:bg-purple-900/50 rounded-full transition-colors"
                  :title="storefrontContent.header.wishlistTitle"
                >
                  <Icon name="lucide:heart" class="w-5 h-5" />
                </button>
                <button
                  class="h-10 w-10 flex items-center justify-center text-purple-300 hover:text-pink-400 hover:bg-purple-900/50 rounded-full transition-colors"
                  :title="storefrontContent.header.accountTitle"
                >
                  <Icon name="lucide:user" class="w-5 h-5" />
                </button>

                <!-- Cart -->
                <NuxtLink
                  v-if="storeSettings?.cartEnabled !== false"
                  to="/cart"
                  class="group relative h-10 flex items-center justify-center px-4 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-lg shadow-pink-500/30 hover:from-pink-600 hover:to-orange-600 transition-all hover:shadow-xl"
                >
                  <Icon name="lucide:handbag" class="w-5 h-5" />
                  <span
                    v-if="cartStore.itemCount > 0"
                    class="ml-1 text-xs font-bold"
                  >{{ cartStore.itemCount }}</span>
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-grow">
        <slot />
      </main>

      <!-- Footer -->
      <footer class="relative z-10 bg-[#1a0a2e] text-purple-100 pt-16 pb-8 border-t border-purple-500/20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <!-- Brand Column -->
            <div class="col-span-1 md:col-span-1">
              <h3 class="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 text-lg font-bold mb-6">
                {{ tenantName }}
              </h3>
              <ul v-if="primaryContactInfos.length" class="space-y-4 text-sm text-purple-100">
                <li v-for="info in primaryContactInfos" :key="info.id" class="flex items-start gap-3">
                  <Icon :name="kindDef(info.kind).iconName" class="w-5 h-5 text-pink-400 mt-0.5" />
                  <a
                    v-if="hrefFor(info)"
                    :href="hrefFor(info)!"
                    class="hover:text-pink-300 transition-colors text-purple-100"
                    :target="isExternalHref(hrefFor(info)!) ? '_blank' : undefined"
                    :rel="isExternalHref(hrefFor(info)!) ? 'noopener noreferrer' : undefined"
                  >
                    <span>{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                  </a>
                  <span v-else class="text-purple-100">{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                </li>
              </ul>
              <div v-if="socialContactInfosWithHref.length" class="flex gap-4 mt-6">
                <a
                  v-for="info in socialContactInfosWithHref"
                  :key="info.id"
                  :href="info.href"
                  class="h-10 w-10 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center hover:bg-pink-500/20 hover:border-pink-500/50 transition-colors text-white"
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
              <ul class="space-y-3 text-sm text-purple-200">
                <li>
                  <a
                    href="#"
                    class="hover:text-pink-400 transition-colors"
                  >{{ storefrontContent.footer.contactUs }}</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-pink-400 transition-colors"
                  >{{ storefrontContent.footer.aboutUs }}</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="text-white font-semibold mb-6">
                {{ storefrontContent.footer.termsPrivacy }}
              </h4>
              <ul class="space-y-3 text-sm text-purple-200">
                <li>
                  <a
                    href="#"
                    class="hover:text-pink-400 transition-colors"
                  >{{ storefrontContent.footer.termsOfService }}</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-pink-400 transition-colors"
                  >{{ storefrontContent.footer.privacyPolicy }}</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-pink-400 transition-colors"
                  >{{ storefrontContent.footer.returnPolicy }}</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="text-white font-semibold mb-6">
                {{ storefrontContent.footer.help }}
              </h4>
              <ul class="space-y-3 text-sm text-purple-200">
                <li>
                  <a
                    href="#"
                    class="hover:text-pink-400 transition-colors"
                  >{{ storefrontContent.footer.faq }}</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-pink-400 transition-colors"
                  >{{ storefrontContent.footer.shippingInfo }}</a>
                </li>
              </ul>
            </div>
          </div>

          <div class="pt-8 border-t border-purple-500/20 text-center text-xs text-purple-300">
            {{ storefrontContent.footer.copyright(tenantName) }}
          </div>
        </div>
      </footer>
      

    </div>
  </StoreThemeProvider>
</template>
