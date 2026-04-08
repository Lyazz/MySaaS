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
                    :to="`/c/${cat.slug}`"
                    class="block px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-700 transition-colors"
                  >
                    {{ cat.title }}
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
              class="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-brand-500 hover:bg-slate-50 rounded-full transition-colors"
              :title="storefrontContent.header.wishlistTitle"
            >
              <Icon name="lucide:heart" class="w-5 h-5" />
            </button>
            <button
              class="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-brand-500 hover:bg-slate-50 rounded-full transition-colors"
              :title="storefrontContent.header.accountTitle"
            >
              <Icon name="lucide:user" class="w-5 h-5" />
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
          </div>
        </div>
      </header>

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
