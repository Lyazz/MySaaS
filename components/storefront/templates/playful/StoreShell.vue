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
    <div class="min-h-screen flex flex-col font-sans text-slate-600 bg-[#faf5ff]">
      <!-- Top Announcement Bar -->
      <!-- Top Announcement Bar -->
      <StorefrontSharedAnnouncementBar 
        v-if="!hideNavigation && !hideAnnouncementBar"
        background-color="bg-brand-600"
        text-color="text-white"
      />

      <!-- Header -->
      <header v-if="!hideNavigation" :class="['bg-white/95 border-b-4 border-brand-100 sticky top-0 z-50', { 'hidden md:block': mobileHeaderHidden }]">
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
                <div class="h-12 w-12 rounded-2xl bg-brand-100 text-brand-500 flex items-center justify-center transform group-hover:rotate-12 transition-transform shadow-sm">
                  <!-- Placeholder Logo Icon -->
                  <Icon name="lucide:store" class="w-7 h-7" />
                </div>
              </template>
              <span class="text-2xl font-black text-slate-800 group-hover:text-brand-500 transition-colors tracking-tight font-display">{{ tenantName }}</span>
            </NuxtLink>

            <!-- Search Bar (Centered & Rounded) -->
            <div class="flex-1 max-w-lg hidden md:block">
              <div class="relative group">
                <input 
                  type="text" 
                  :placeholder="storefrontContent.search.placeholder"
                  class="w-full h-12 bg-slate-50 border-2 border-brand-100 text-slate-900 text-sm rounded-full focus:ring-4 focus:ring-brand-100 focus:border-brand-300 block pl-5 pr-10 transition-all shadow-sm focus:shadow-md hover:border-brand-200" 
                >
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Icon name="lucide:search" class="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
                </div>
              </div>
            </div>

            <!-- Navigation & Actions -->
            <div class="flex items-center gap-6">
              <!-- Desktop Menu (Puzzle Tabs) -->
              <nav class="hidden lg:flex items-center gap-2">
                <NuxtLink to="/" class="text-sm font-black transition-all px-4 py-2.5 rounded-[2rem] border-2 border-transparent hover:border-purple-200 hover:-translate-y-1 hover:shadow-sm" :class="[$route.path === '/' ? 'bg-[#fbbf24] text-amber-900 border-amber-300 shadow-[0_4px_0_0_#d97706] -translate-y-1' : 'text-slate-600 bg-slate-50 border-slate-100']">
                  {{ storefrontContent.nav.home }}
                </NuxtLink>

                <NuxtLink to="/products" class="text-sm font-black transition-all px-4 py-2.5 rounded-[2rem] border-2 border-transparent hover:border-purple-200 hover:-translate-y-1 hover:shadow-sm" :class="[$route.path === '/products' ? 'bg-[#fbbf24] text-amber-900 border-amber-300 shadow-[0_4px_0_0_#d97706] -translate-y-1' : 'text-slate-600 bg-slate-50 border-slate-100']">
                  {{ storefrontContent.nav.shop }}
                </NuxtLink>

                <!-- Categories Dropdown -->
                <div class="relative group flex items-center h-full">
                  <button class="text-sm font-black transition-all px-4 py-2.5 rounded-[2rem] border-2 border-slate-100 text-slate-600 bg-slate-50 hover:border-purple-200 hover:-translate-y-1 hover:shadow-sm flex items-center gap-1 cursor-pointer">
                    {{ storefrontContent.nav.categories || 'Categories' }}
                    <Icon name="lucide:chevron-down" class="w-4 h-4" />
                  </button>
                  <div class="absolute top-[80%] left-0 mt-2 w-48 bg-white border border-slate-100 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 rounded-2xl overflow-hidden">
                    <NuxtLink
                      v-for="cat in tenantCategories"
                      :key="cat.id"
                      :to="`/c/${cat.slug}`"
                      class="block px-4 py-3 text-sm text-slate-600 font-bold hover:bg-brand-50 hover:text-brand-600 transition-colors"
                    >
                      {{ cat.title }}
                    </NuxtLink>
                  </div>
                </div>

                <NuxtLink to="/contact" class="text-sm font-black transition-all px-4 py-2.5 rounded-[2rem] border-2 border-transparent hover:border-purple-200 hover:-translate-y-1 hover:shadow-sm" :class="[$route.path === '/contact' ? 'bg-[#fbbf24] text-amber-900 border-amber-300 shadow-[0_4px_0_0_#d97706] -translate-y-1' : 'text-slate-600 bg-slate-50 border-slate-100']">
                  {{ storefrontContent.nav.contact }}
                </NuxtLink>
              </nav>

              <div class="h-8 w-px bg-slate-200 hidden lg:block mx-2" />

              <!-- Icons -->
              <div class="flex items-center gap-3">
                <LocaleSwitcher class="hidden lg:inline-flex" />
                <button
                  class="h-12 w-12 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-all hover:scale-110 active:scale-95"
                  :title="storefrontContent.header.wishlistTitle"
                >
                  <Icon name="lucide:heart" class="w-6 h-6" />
                </button>
                <button
                  class="h-12 w-12 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-all hover:scale-110 active:scale-95"
                  :title="storefrontContent.header.accountTitle"
                >
                  <Icon name="lucide:user" class="w-6 h-6" />
                </button>

                <!-- Cart -->
                <NuxtLink
                  v-if="storeSettings?.cartEnabled !== false"
                  to="/cart"
                  class="group relative h-12 flex items-center justify-center px-6 rounded-full bg-brand-500 text-white shadow-[0_6px_0_0_#7e22ce] hover:bg-brand-400 hover:-translate-y-1 transition-all active:translate-y-1 active:shadow-none"
                >
                  <Icon name="lucide:shopping-bag" class="w-5 h-5" />
                  <span
                    v-if="cartStore.itemCount > 0"
                    class="ml-2 bg-white text-brand-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
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

      <!-- Footer Waves -->
      <div class="w-full overflow-hidden leading-none bg-[#faf5ff] transform translate-y-1">
        <svg class="w-[200%] md:w-full h-12 md:h-16 text-[#f3e8ff] fill-current animate-[wave_15s_linear_infinite]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C52.16,112.92,109.13,116.7,163.78,109.52c50.6-6.66,100.82-24.33,149.61-42.34Z"></path>
        </svg>
      </div>
      <!-- Footer -->
      <footer class="bg-[#f3e8ff] text-slate-700 pt-8 pb-8 relative border-t-8 border-brand-200">
        <!-- Decorative cloud -->
        <div class="absolute -top-12 left-10 w-24 h-12 bg-white rounded-full opacity-50 blur-sm pointer-events-none hidden md:block"></div>
        <div class="absolute -top-6 right-20 w-16 h-8 bg-white rounded-full opacity-60 blur-sm pointer-events-none hidden md:block"></div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <!-- Brand Column -->
            <div class="col-span-1 md:col-span-1 relative z-10">
              <h3 class="text-brand-600 text-3xl font-black mb-6 font-display tracking-tight flex items-center gap-2">
                <span class="text-4xl">🚀</span> {{ tenantName }}
              </h3>
              <ul v-if="primaryContactInfos.length" class="space-y-4 text-sm font-medium">
                <li v-for="info in primaryContactInfos" :key="info.id" class="flex items-start gap-3 bg-white/60 p-3 rounded-2xl border-2 border-white/50 backdrop-blur-sm shadow-sm inline-flex">
                  <Icon :name="kindDef(info.kind).iconName" class="w-5 h-5 text-brand-500 mt-0.5" />
                  <a
                    v-if="hrefFor(info)"
                    :href="hrefFor(info)!"
                    class="hover:text-brand-600 font-bold transition-colors"
                    :target="isExternalHref(hrefFor(info)!) ? '_blank' : undefined"
                    :rel="isExternalHref(hrefFor(info)!) ? 'noopener noreferrer' : undefined"
                  >
                    <span>{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                  </a>
                  <span v-else>{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                </li>
              </ul>
              <div v-if="socialContactInfosWithHref.length" class="flex flex-wrap gap-4 mt-8">
                <a
                  v-for="info in socialContactInfosWithHref"
                  :key="info.id"
                  :href="info.href"
                  class="h-14 w-14 rounded-full bg-white border-4 border-purple-100 flex items-center justify-center hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50 shadow-[0_4px_0_0_#e9d5ff] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all text-slate-500"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="kindDef(info.kind).iconName" class="w-6 h-6" />
                </a>
              </div>
            </div>

            <!-- Links Column -->
            <div>
              <h4 class="text-slate-900 font-black text-lg mb-6 uppercase tracking-wider text-sm flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-brand-400"></span> {{ storefrontContent.footer.contact }}
              </h4>
              <ul class="space-y-4 text-base text-slate-600 font-bold">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-600 hover:translate-x-2 inline-block transition-transform"
                  >{{ storefrontContent.footer.contactUs }}</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-600 hover:translate-x-2 inline-block transition-transform"
                  >{{ storefrontContent.footer.aboutUs }}</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="text-slate-900 font-black text-lg mb-6 uppercase tracking-wider text-sm flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-amber-400"></span> {{ storefrontContent.footer.termsPrivacy }}
              </h4>
              <ul class="space-y-4 text-base text-slate-600 font-bold">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-600 hover:translate-x-2 inline-block transition-transform"
                  >{{ storefrontContent.footer.termsOfService }}</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-600 hover:translate-x-2 inline-block transition-transform"
                  >{{ storefrontContent.footer.privacyPolicy }}</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-600 hover:translate-x-2 inline-block transition-transform"
                  >{{ storefrontContent.footer.returnPolicy }}</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="text-slate-900 font-black text-lg mb-6 uppercase tracking-wider text-sm flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span> {{ storefrontContent.footer.help }}
              </h4>
              <ul class="space-y-4 text-base text-slate-600 font-bold">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-600 hover:translate-x-2 inline-block transition-transform"
                  >{{ storefrontContent.footer.faq }}</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-600 hover:translate-x-2 inline-block transition-transform"
                  >{{ storefrontContent.footer.shippingInfo }}</a>
                </li>
              </ul>
            </div>
          </div>

          <div class="pt-8 border-t-4 border-white/50 text-center text-sm font-black text-slate-400">
            {{ storefrontContent.footer.copyright(tenantName) }}
          </div>
        </div>
      </footer>
      

    </div>
  </StoreThemeProvider>
</template>
