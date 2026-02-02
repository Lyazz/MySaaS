<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import StoreThemeProvider from './ThemeProvider.vue'
import { CONTACT_INFO_DEF_BY_KIND, buildContactInfoHref, type ContactInfoKind } from '~/shared/contact-infos'

const cartStore = useCartStore()
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')
const storeSettings = useState<any>('storeSettings')
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
    const base = [
        { name: 'Home', href: '/' },
        { name: 'Shop', href: '/products' },
    ]
    
    // Add top 3 categories
    if (tenantCategories.value) {
        tenantCategories.value.slice(0, 3).forEach(cat => {
            base.push({ name: cat.title, href: `/c/${cat.slug}` })
        })
    }
    
    // Add Contact at the end
    base.push({ name: 'Contact', href: '/contact' })
    return base
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
            <NuxtLink 
              v-for="item in categories" 
              :key="item.name" 
              :to="item.href"
              class="font-street text-xl uppercase hover:bg-brand hover:text-black hover:underline decoration-4 underline-offset-4 px-2 py-1 transition-all"
              active-class="bg-brand text-black"
            >
              {{ item.name }}
            </NuxtLink>
          </nav>

          <!-- Actions -->
          <div class="flex items-center gap-4">
            <!-- Icons -->
            <button
              class="h-10 w-10 flex items-center justify-center border-2 border-black hover:bg-brand transition-colors"
              title="Wishlist"
            >
              <Icon name="lucide:heart" class="w-5 h-5" />
            </button>
            <button
              class="h-10 w-10 flex items-center justify-center border-2 border-black hover:bg-brand transition-colors"
              title="Account"
            >
              <Icon name="lucide:user" class="w-5 h-5" />
            </button>

            <!-- Cart -->
            <NuxtLink
              v-if="storeSettings?.cartEnabled !== false"
              to="/cart"
              class="relative group"
            >
              <div class="h-12 px-6 flex items-center gap-2 bg-black text-brand border-2 border-black shadow-[4px_4px_0px_0px_rgba(255,222,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                <Icon name="lucide:handbag" class="w-5 h-5" />
                <span class="font-street text-xl">CART</span>
                <div class="bg-brand text-black font-bold h-6 w-6 flex items-center justify-center border border-black text-xs">
                  {{ cartStore.itemCount }}
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-grow bg-white">
        <slot />
      </main>

      <!-- Footer -->
      <footer class="border-t-4 border-black bg-black text-white pt-16 pb-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
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
            <div>
              <h4 class="font-street text-2xl text-brand mb-6 uppercase">
                Contact
              </h4>
              <ul class="space-y-3 font-mono text-sm uppercase text-gray-400">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand hover:bg-brand/10 px-1 transition-colors"
                  >Contact Us</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand hover:bg-brand/10 px-1 transition-colors"
                  >About Us</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="font-street text-2xl text-brand mb-6 uppercase">
                Terms & Privacy
              </h4>
              <ul class="space-y-3 font-mono text-sm uppercase text-gray-400">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand hover:bg-brand/10 px-1 transition-colors"
                  >Terms of Service</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand hover:bg-brand/10 px-1 transition-colors"
                  >Privacy Policy</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand hover:bg-brand/10 px-1 transition-colors"
                  >Return Policy</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="font-street text-2xl text-brand mb-6 uppercase">
                Help
              </h4>
              <ul class="space-y-3 font-mono text-sm uppercase text-gray-400">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand hover:bg-brand/10 px-1 transition-colors"
                  >FAQ</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand hover:bg-brand/10 px-1 transition-colors"
                  >Shipping Info</a>
                </li>
              </ul>
            </div>
          </div>

          <div class="pt-8 border-t-2 border-gray-800 text-center font-mono text-xs text-gray-500 uppercase">
            &copy; {{ currentYear }} {{ tenantName }} — All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  </StoreThemeProvider>
</template>
