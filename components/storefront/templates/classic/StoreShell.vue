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

</script>

<template>
  <StoreThemeProvider>
    <div class="min-h-screen flex flex-col font-serif text-slate-600 bg-white">
      <!-- Top Announcement Bar (Minimal) -->
      <!-- Top Announcement Bar (Minimal) -->
      <StorefrontSharedAnnouncementBar 
        v-if="!hideNavigation && !hideAnnouncementBar"
        background-color="bg-slate-900"
        text-color="text-white"
      />

      <!-- Header -->
      <header v-if="!hideNavigation" :class="['bg-white border-b border-slate-100 sticky top-0 z-50', { 'hidden md:block': mobileHeaderHidden }]">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="h-20 md:h-24 flex items-center justify-between gap-8">
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
                <div class="h-10 w-10 bg-slate-900 text-white flex items-center justify-center">
                  <Icon name="lucide:store" class="w-5 h-5" />
                </div>
              </template>
              <span class="text-2xl font-serif font-bold text-slate-900 tracking-tight">{{ tenantName }}</span>
            </NuxtLink>

            <!-- Desktop Menu (Centered) -->
            <nav class="hidden lg:flex items-center gap-8">
              <NuxtLink to="/" class="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors" active-class="text-slate-900">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors" active-class="text-slate-900">{{ storefrontContent.nav.shop }}</NuxtLink>

              <!-- Categories Dropdown -->
              <div class="relative group flex items-center h-full">
                <button class="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer">
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

              <NuxtLink to="/contact" class="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors" active-class="text-slate-900">{{ storefrontContent.nav.contact }}</NuxtLink>
            </nav>

            <!-- Actions -->
            <div class="flex items-center gap-6">
               <!-- Search (Minimal Icon Trigger or Expanded) -->
               <div class="hidden md:flex relative group items-center">
                  <input 
                    type="text" 
                    :placeholder="storefrontContent.search.placeholder"
                    class="w-48 border-b border-slate-300 bg-transparent py-1 text-sm focus:border-slate-900 focus:ring-0 placeholder:text-slate-400 text-slate-900 transition-all outline-none"
                  >
                  <Icon name="lucide:search" class="w-4 h-4 text-slate-900 absolute right-0 pointer-events-none" />
               </div>

              <div class="h-4 w-px bg-slate-200 hidden lg:block" />

              <div class="flex items-center gap-4">
                <LocaleSwitcher class="hidden lg:inline-flex" />
                <button
                  class="text-slate-900 hover:text-slate-600 transition-colors"
                  :title="storefrontContent.header.wishlistTitle"
                >
                  <Icon name="lucide:heart" class="w-5 h-5" />
                </button>
                <button
                  class="text-slate-900 hover:text-slate-600 transition-colors"
                  :title="storefrontContent.header.accountTitle"
                >
                  <Icon name="lucide:user" class="w-5 h-5" />
                </button>

                <!-- Cart -->
                <NuxtLink
                  v-if="storeSettings?.cartEnabled !== false"
                  to="/cart"
                  class="relative flex items-center gap-2 text-slate-900 hover:text-brand-600 transition-colors"
                >
                  <Icon name="lucide:shopping-bag" class="w-5 h-5" />
                  <span
                    v-if="cartStore.itemCount > 0"
                    class="flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white absolute -top-1 -right-1"
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

      <!-- Footer (Minimal Light) -->
      <footer class="bg-white pt-20 pb-12 border-t border-slate-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <!-- Brand Column -->
            <div class="col-span-1 md:col-span-1">
              <h3 class="text-2xl font-serif font-bold text-slate-900 mb-6">
                {{ tenantName }}
              </h3>
              <ul v-if="primaryContactInfos.length" class="space-y-4 text-sm text-slate-500">
                <li v-for="info in primaryContactInfos" :key="info.id" class="flex items-start gap-3">
                  <Icon :name="kindDef(info.kind).iconName" class="w-4 h-4 text-slate-400 mt-0.5" />
                  <a
                    v-if="hrefFor(info)"
                    :href="hrefFor(info)!"
                    class="hover:text-slate-900 transition-colors"
                    :target="isExternalHref(hrefFor(info)!) ? '_blank' : undefined"
                    :rel="isExternalHref(hrefFor(info)!) ? 'noopener noreferrer' : undefined"
                  >
                    <span>{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                  </a>
                  <span v-else>{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                </li>
              </ul>
              <div v-if="socialContactInfosWithHref.length" class="flex gap-4 mt-8">
                <a
                  v-for="info in socialContactInfosWithHref"
                  :key="info.id"
                  :href="info.href"
                  class="text-slate-400 hover:text-slate-900 transition-colors"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="kindDef(info.kind).iconName" class="w-5 h-5" />
                </a>
              </div>
            </div>

            <!-- Links Column -->
            <div>
              <h4 class="font-bold text-slate-900 text-xs uppercase tracking-widest mb-6">
                {{ storefrontContent.footer.contact }}
              </h4>
              <ul class="space-y-4 text-sm text-slate-500">
                <li><a href="#" class="hover:text-slate-900 transition-colors">{{ storefrontContent.footer.aboutUs }}</a></li>
                <li><a href="#" class="hover:text-slate-900 transition-colors">{{ storefrontContent.footer.contactUs }}</a></li>
              </ul>
            </div>
            <div>
              <h4 class="font-bold text-slate-900 text-xs uppercase tracking-widest mb-6">
                {{ storefrontContent.footer.termsPrivacy }}
              </h4>
              <ul class="space-y-4 text-sm text-slate-500">
                <li><a href="#" class="hover:text-slate-900 transition-colors">{{ storefrontContent.footer.termsOfService }}</a></li>
                <li><a href="#" class="hover:text-slate-900 transition-colors">{{ storefrontContent.footer.privacyPolicy }}</a></li>
                <li><a href="#" class="hover:text-slate-900 transition-colors">{{ storefrontContent.footer.returnPolicy }}</a></li>
              </ul>
            </div>
            <div>
              <h4 class="font-bold text-slate-900 text-xs uppercase tracking-widest mb-6">
                {{ storefrontContent.footer.help }}
              </h4>
              <ul class="space-y-4 text-sm text-slate-500">
                <li><a href="#" class="hover:text-slate-900 transition-colors">{{ storefrontContent.footer.faq }}</a></li>
                <li><a href="#" class="hover:text-slate-900 transition-colors">{{ storefrontContent.footer.shippingInfo }}</a></li>
              </ul>
            </div>
          </div>

          <div class="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>{{ storefrontContent.footer.copyright(tenantName) }}</p>
          </div>
        </div>
      </footer>
    </div>
  </StoreThemeProvider>
</template>
