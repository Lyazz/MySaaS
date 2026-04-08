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
                    :to="`/c/${cat.slug}`"
                    class="block px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-700 transition-colors"
                  >
                    {{ cat.title }}
                  </NuxtLink>
                </div>
              </div>

              <NuxtLink to="/contact" class="px-5 py-2 rounded-full text-sm font-medium text-stone-600 hover:bg-white hover:text-brand-700 hover:shadow-sm transition-all duration-300 ease-out" active-class="bg-white text-brand-800 shadow-sm ring-1 ring-stone-200">{{ storefrontContent.nav.contact }}</NuxtLink>
            </nav>

            <!-- Right: Actions & Search -->
            <div class="flex items-center justify-end gap-4 flex-shrink-0">
               <!-- Search (Minimal Icon) -->
               <button class="p-3 text-stone-500 hover:text-brand-700 hover:bg-white rounded-full transition-all">
                  <Icon name="lucide:search" class="w-5 h-5" />
               </button>

               <div class="h-6 w-px bg-stone-200 hidden lg:block" />

               <div class="flex items-center gap-2">
                 <LocaleSwitcher class="hidden lg:inline-flex" />
                  <button
                    class="p-3 text-stone-500 hover:text-brand-700 hover:bg-white rounded-full transition-all"
                    :title="storefrontContent.header.accountTitle"
                  >
                    <Icon name="lucide:user" class="w-5 h-5" />
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
