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

</script>

<template>
  <StoreThemeProvider>
    <div class="min-h-screen flex flex-col" style="font-family: 'Cormorant Garamond', serif; background-color: #0E1117; color: #E8E0D5;">
      <!-- Top Announcement Bar -->
      <StorefrontSharedAnnouncementBar 
        v-if="!hideNavigation && !hideAnnouncementBar"
        background-color="bg-[#1A1F2E]"
        text-color="text-[#D4C5A9]"
      />

      <!-- Header -->
      <header v-if="!hideNavigation" :class="['sticky top-0 z-50 backdrop-blur-md border-b', { 'hidden md:block': mobileHeaderHidden }]" style="background-color: rgba(14,17,23,0.96); border-color: rgba(212,197,169,0.12);">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="h-16 md:h-20 flex items-center justify-between gap-4">
            <!-- Logo -->
            <NuxtLink to="/" class="flex-shrink-0 flex items-center gap-3 group">
              <template v-if="storeSettings?.logoUrl">
                <img 
                  :src="storeSettings.logoUrl" 
                  :alt="tenantName" 
                  class="h-10 max-w-[140px] object-contain"
                >
              </template>
              <template v-else>
                <div class="h-10 w-10 border border-[#D4C5A9]/30 bg-[#1A1F2E] flex items-center justify-center rounded-sm">
                  <Icon name="lucide:watch" class="w-5 h-5 text-[#A67C52]" />
                </div>
              </template>
              <div class="flex flex-col leading-tight">
                <span class="text-lg font-semibold tracking-[0.18em] uppercase" style="color: #E8E0D5; letter-spacing: 0.18em;">{{ tenantName }}</span>
                <span class="text-[9px] tracking-[0.35em] uppercase" style="color: #A67C52;">MAISON DE PRESTIGE</span>
              </div>
            </NuxtLink>

            <!-- Navigation & Actions -->
            <div class="flex items-center gap-6">
              <!-- Desktop Menu -->
              <nav class="hidden lg:flex items-center gap-8">
                <NuxtLink to="/" class="text-xs font-medium tracking-[0.2em] uppercase transition-colors duration-200" active-class="!text-[#D4C5A9]">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="text-xs font-medium tracking-[0.2em] uppercase transition-colors duration-200" active-class="!text-[#D4C5A9]">{{ storefrontContent.nav.shop }}</NuxtLink>

              <!-- Categories Dropdown -->
              <div class="relative group flex items-center h-full">
                <button class="text-xs font-medium tracking-[0.2em] uppercase transition-colors duration-200 flex items-center gap-1 cursor-pointer">
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

              <NuxtLink to="/contact" class="text-xs font-medium tracking-[0.2em] uppercase transition-colors duration-200" active-class="!text-[#D4C5A9]">{{ storefrontContent.nav.contact }}</NuxtLink>
              </nav>

              <div class="h-5 w-px bg-[#D4C5A9]/10 hidden lg:block" />

              <!-- Icons -->
              <div class="flex items-center gap-2">
                <LocaleSwitcher class="hidden lg:inline-flex" />
                <button
                  class="h-10 w-10 flex items-center justify-center transition-colors"
                  style="color: #6B7280;"
                  :title="storefrontContent.header.wishlistTitle"
                  @mouseover="($event.target as HTMLElement).closest('button')!.style.color = '#D4C5A9'"
                  @mouseleave="($event.target as HTMLElement).closest('button')!.style.color = '#6B7280'"
                >
                  <Icon name="lucide:heart" class="w-5 h-5" />
                </button>
                <button
                  class="h-10 w-10 flex items-center justify-center transition-colors"
                  style="color: #6B7280;"
                  :title="storefrontContent.header.accountTitle"
                  @mouseover="($event.target as HTMLElement).closest('button')!.style.color = '#D4C5A9'"
                  @mouseleave="($event.target as HTMLElement).closest('button')!.style.color = '#6B7280'"
                >
                  <Icon name="lucide:user" class="w-5 h-5" />
                </button>

                <!-- Cart -->
                <NuxtLink
                  v-if="storeSettings?.cartEnabled !== false"
                  to="/cart"
                  class="group relative h-10 flex items-center justify-center px-4 rounded-sm transition-all duration-200 text-sm tracking-wider"
                  style="background-color: #1F2533; border: 1px solid rgba(212,197,169,0.2); color: #D4C5A9;"
                  @mouseover="($event.target as HTMLElement).closest('a')!.style.backgroundColor = '#A67C52'; ($event.target as HTMLElement).closest('a')!.style.color = '#fff'; ($event.target as HTMLElement).closest('a')!.style.borderColor = '#A67C52'"
                  @mouseleave="($event.target as HTMLElement).closest('a')!.style.backgroundColor = '#1F2533'; ($event.target as HTMLElement).closest('a')!.style.color = '#D4C5A9'; ($event.target as HTMLElement).closest('a')!.style.borderColor = 'rgba(212,197,169,0.2)'"
                >
                  <Icon name="lucide:shopping-bag" class="w-4 h-4" />
                  <span v-if="cartStore.itemCount > 0" class="ml-1.5 text-xs font-bold">{{ cartStore.itemCount }}</span>
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
      <footer class="pt-16 pb-8 border-t" style="background-color: #080B12; border-color: rgba(212,197,169,0.08); color: #7A7060;">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <!-- Brand Column -->
            <div class="col-span-1 md:col-span-1">
              <div class="mb-2">
                <h3 class="text-base font-semibold mb-1 tracking-[0.15em] uppercase" style="color: #E8E0D5;">
                  {{ tenantName }}
                </h3>
                <div class="w-8 h-px mb-6" style="background-color: #A67C52;"></div>
              </div>
              <ul v-if="primaryContactInfos.length" class="space-y-4 text-sm">
                <li v-for="info in primaryContactInfos" :key="info.id" class="flex items-start gap-3">
                  <Icon :name="kindDef(info.kind).iconName" class="w-4 h-4 mt-0.5" style="color: #A67C52;" />
                  <a
                    v-if="hrefFor(info)"
                    :href="hrefFor(info)!"
                    class="transition-colors text-sm"
                    style="color: #7A7060;"
                    :target="isExternalHref(hrefFor(info)!) ? '_blank' : undefined"
                    :rel="isExternalHref(hrefFor(info)!) ? 'noopener noreferrer' : undefined"
                  >
                    <span>{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                  </a>
                  <span v-else class="text-sm" style="color: #7A7060;">{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                </li>
              </ul>
              <div v-if="socialContactInfosWithHref.length" class="flex gap-3 mt-6">
                <a
                  v-for="info in socialContactInfosWithHref"
                  :key="info.id"
                  :href="info.href"
                  class="h-9 w-9 border rounded-sm flex items-center justify-center transition-all text-sm"
                  style="border-color: rgba(212,197,169,0.15); color: #7A7060;"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="kindDef(info.kind).iconName" class="w-4 h-4" />
                </a>
              </div>
            </div>

            <!-- Links Columns -->
            <div>
              <h4 class="font-semibold mb-5 tracking-[0.15em] uppercase text-xs" style="color: #D4C5A9;">
                {{ storefrontContent.footer.contact }}
              </h4>
              <ul class="space-y-3 text-sm" style="color: #7A7060;">
                <li><a href="#" class="transition-colors hover:text-[#D4C5A9]">{{ storefrontContent.footer.contactUs }}</a></li>
                <li><a href="#" class="transition-colors hover:text-[#D4C5A9]">{{ storefrontContent.footer.aboutUs }}</a></li>
              </ul>
            </div>
            <div>
              <h4 class="font-semibold mb-5 tracking-[0.15em] uppercase text-xs" style="color: #D4C5A9;">
                {{ storefrontContent.footer.termsPrivacy }}
              </h4>
              <ul class="space-y-3 text-sm" style="color: #7A7060;">
                <li><a href="#" class="transition-colors hover:text-[#D4C5A9]">{{ storefrontContent.footer.termsOfService }}</a></li>
                <li><a href="#" class="transition-colors hover:text-[#D4C5A9]">{{ storefrontContent.footer.privacyPolicy }}</a></li>
                <li><a href="#" class="transition-colors hover:text-[#D4C5A9]">{{ storefrontContent.footer.returnPolicy }}</a></li>
              </ul>
            </div>
            <div>
              <h4 class="font-semibold mb-5 tracking-[0.15em] uppercase text-xs" style="color: #D4C5A9;">
                {{ storefrontContent.footer.help }}
              </h4>
              <ul class="space-y-3 text-sm" style="color: #7A7060;">
                <li><a href="#" class="transition-colors hover:text-[#D4C5A9]">{{ storefrontContent.footer.faq }}</a></li>
                <li><a href="#" class="transition-colors hover:text-[#D4C5A9]">{{ storefrontContent.footer.shippingInfo }}</a></li>
              </ul>
            </div>
          </div>

          <div class="pt-8 border-t text-center text-xs" style="border-color: rgba(212,197,169,0.08); color: #4A4540;">
            {{ storefrontContent.footer.copyright(tenantName) }}
          </div>
        </div>
      </footer>

    </div>
  </StoreThemeProvider>
</template>
