<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import StoreThemeProvider from './ThemeProvider.vue'
import { CONTACT_INFO_DEF_BY_KIND, buildContactInfoHref, type ContactInfoKind } from '~/shared/contact-infos'

const cartStore = useCartStore()
const favorites = useFavorites()
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Maison')
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

const mobileMenuOpen = ref(false)
const scrolled = ref(false)
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const searchLoading = ref(false)
const isSearchDropdownOpen = ref(false)

const props = defineProps<{
    hideNavigation?: boolean
    mobileHeaderHidden?: boolean
    hideAnnouncementBar?: boolean
}>()

const currentYear = new Date().getFullYear()

onMounted(() => {
    const handleScroll = () => { scrolled.value = window.scrollY > 40 }
    window.addEventListener('scroll', handleScroll, { passive: true })
    onUnmounted(() => window.removeEventListener('scroll', handleScroll))
})

watch(searchQuery, async (q) => {
    if (q.length < 3) { searchResults.value = []; isSearchDropdownOpen.value = false; return }
    searchLoading.value = true
    isSearchDropdownOpen.value = true
    try {
        const url = useTenantApiUrl(`/api/products/search?q=${encodeURIComponent(q)}&limit=6`)
        const data = await $fetch<any[]>(url, { headers: useTenantApiHeaders() || {} })
        searchResults.value = Array.isArray(data) ? data : []
    } catch { searchResults.value = [] }
    finally { searchLoading.value = false }
})
</script>

<template>
  <StoreThemeProvider>
    <div class="min-h-screen flex flex-col">
      <!-- Announcement Bar -->
      <StorefrontSharedAnnouncementBar v-if="!hideNavigation && !hideAnnouncementBar" />

      <!-- Header -->
      <header
        v-if="!hideNavigation"
        :class="[
          'sticky top-0 z-50 transition-all duration-500',
          scrolled
            ? 'bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E8E0D4] shadow-sm'
            : 'bg-transparent',
          { 'hidden md:block': mobileHeaderHidden }
        ]"
      >
        <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <!-- Logo -->
          <NuxtLink to="/" class="flex-shrink-0 flex items-center gap-3 group">
            <template v-if="storeSettings?.logoUrl">
              <img
                :src="storeSettings.logoUrl"
                :alt="tenantName"
                class="h-9 max-w-[130px] object-contain"
              >
            </template>
            <template v-else>
              <span class="font-maison-serif text-2xl font-semibold text-[#2C2420] tracking-wide group-hover:text-[#C17B4E] transition-colors">
                {{ tenantName }}
              </span>
            </template>
          </NuxtLink>

          <!-- Desktop Nav -->
          <nav class="hidden lg:flex items-center gap-8">
            <NuxtLink
              to="/"
              class="text-xs tracking-[0.18em] uppercase font-medium text-[#7A6558] hover:text-[#C17B4E] transition-colors"
              active-class="text-[#C17B4E]"
            >
              {{ storefrontContent.nav.home }}
            </NuxtLink>
            <NuxtLink
              to="/products"
              class="text-xs tracking-[0.18em] uppercase font-medium text-[#7A6558] hover:text-[#C17B4E] transition-colors"
              active-class="text-[#C17B4E]"
            >
              {{ storefrontContent.nav.shop }}
            </NuxtLink>

            <!-- Categories dropdown -->
            <div class="relative group flex items-center">
              <button class="text-xs tracking-[0.18em] uppercase font-medium text-[#7A6558] hover:text-[#C17B4E] transition-colors flex items-center gap-1 cursor-pointer">
                {{ storefrontContent.nav.categories || 'Collections' }}
                <Icon name="lucide:chevron-down" class="w-3 h-3 mt-0.5" />
              </button>
              <div class="absolute top-full left-0 mt-3 w-52 bg-[#FAF8F5] border border-[#E8E0D4] shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <NuxtLink
                  v-for="cat in tenantCategories"
                  :key="cat.id"
                  :to="`/c/${cat.slug}`"
                  class="block px-5 py-3 text-xs tracking-wider uppercase text-[#7A6558] hover:bg-[#F0EBE3] hover:text-[#C17B4E] transition-colors border-b border-[#F0EBE3] last:border-0"
                >
                  {{ cat.title }}
                </NuxtLink>
              </div>
            </div>

            <NuxtLink
              to="/contact"
              class="text-xs tracking-[0.18em] uppercase font-medium text-[#7A6558] hover:text-[#C17B4E] transition-colors"
              active-class="text-[#C17B4E]"
            >
              {{ storefrontContent.nav.contact }}
            </NuxtLink>
          </nav>

          <!-- Actions -->
          <div class="flex items-center gap-4">
            <LocaleSwitcher class="hidden lg:inline-flex" />
            <button
              class="relative h-9 w-9 flex items-center justify-center text-[#7A6558] hover:text-[#C17B4E] transition-colors"
              :title="storefrontContent.header.wishlistTitle"
              @click="navigateTo('/wishlist')"
            >
              <Icon name="lucide:heart" class="w-5 h-5" />
              <ClientOnly>
                <span
                  v-if="favorites.count.value > 0"
                  class="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#C17B4E] text-[10px] font-bold text-white absolute -top-1 -right-1"
                >{{ favorites.count.value }}</span>
              </ClientOnly>
            </button>

            <NuxtLink
              v-if="storeSettings?.cartEnabled !== false"
              to="/cart"
              class="relative h-9 w-9 flex items-center justify-center text-[#7A6558] hover:text-[#C17B4E] transition-colors"
            >
              <Icon name="lucide:shopping-bag" class="w-5 h-5" />
              <ClientOnly>
                <span
                  v-if="cartStore.itemCount > 0"
                  class="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#C17B4E] text-[10px] font-bold text-white absolute -top-1 -right-1"
                >{{ cartStore.itemCount }}</span>
              </ClientOnly>
            </NuxtLink>

            <!-- Hamburger mobile -->
            <button class="lg:hidden p-1 text-[#7A6558]" @click="mobileMenuOpen = true">
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
          <div v-if="mobileMenuOpen" class="fixed top-0 left-0 bottom-0 w-[85%] max-w-xs bg-[#FAF8F5] z-[61] shadow-2xl flex flex-col overflow-y-auto">
            <div class="flex items-center justify-between px-6 py-5 border-b border-[#E8E0D4]">
              <span class="font-maison-serif text-xl font-semibold text-[#2C2420]">{{ tenantName }}</span>
              <button @click="mobileMenuOpen = false" class="p-1 text-[#7A6558] hover:text-[#2C2420]">
                <Icon name="lucide:x" class="w-5 h-5" />
              </button>
            </div>

            <!-- Search -->
            <div class="px-6 py-4 border-b border-[#E8E0D4]">
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  :placeholder="storefrontContent.search?.placeholder || 'Rechercher...'"
                  class="w-full border border-[#E8E0D4] bg-white rounded-lg py-2.5 pl-4 pr-10 text-sm placeholder:text-[#B0A090] text-[#2C2420] outline-none focus:border-[#C17B4E] focus:ring-1 focus:ring-[#C17B4E]/30"
                  @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null"
                  @blur="setTimeout(() => isSearchDropdownOpen = false, 200)"
                >
                <Icon name="lucide:search" class="w-4 h-4 text-[#B0A090] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <div
                  v-show="isSearchDropdownOpen"
                  class="absolute top-[100%] left-0 right-0 mt-1 bg-[#FAF8F5] border border-[#E8E0D4] shadow-xl z-50"
                >
                  <div v-if="searchLoading" class="px-4 py-3 text-sm text-[#7A6558]">Recherche...</div>
                  <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-[#7A6558]">Aucun produit.</div>
                  <div v-else class="flex flex-col">
                    <NuxtLink
                      v-for="product in searchResults"
                      :key="product.id"
                      :to="'/p/' + product.slug"
                      class="flex items-center gap-3 px-4 py-3 hover:bg-[#F0EBE3] transition-colors border-b border-[#F0EBE3] last:border-0"
                      @click="isSearchDropdownOpen = false; mobileMenuOpen = false"
                    >
                      <img v-if="product.images?.length" :src="product.images[0]" class="w-10 h-10 object-cover rounded" />
                      <div v-else class="w-10 h-10 bg-[#E8E0D4] rounded flex items-center justify-center">
                        <Icon name="lucide:image" class="w-4 h-4 text-[#B0A090]" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-[#2C2420] truncate">{{ product.title }}</div>
                        <div class="text-xs text-[#C17B4E] font-semibold mt-0.5">{{ product.price }} {{ currencyCode }}</div>
                      </div>
                    </NuxtLink>
                  </div>
                </div>
              </div>
            </div>

            <!-- Nav links -->
            <nav class="flex flex-col px-6 py-3 gap-1">
              <NuxtLink to="/" class="py-3 text-xs tracking-[0.18em] uppercase font-medium text-[#7A6558] hover:text-[#C17B4E] border-b border-[#F0EBE3]" @click="mobileMenuOpen = false">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="py-3 text-xs tracking-[0.18em] uppercase font-medium text-[#7A6558] hover:text-[#C17B4E] border-b border-[#F0EBE3]" @click="mobileMenuOpen = false">{{ storefrontContent.nav.shop }}</NuxtLink>
              <NuxtLink to="/contact" class="py-3 text-xs tracking-[0.18em] uppercase font-medium text-[#7A6558] hover:text-[#C17B4E] border-b border-[#F0EBE3]" @click="mobileMenuOpen = false">{{ storefrontContent.nav.contact }}</NuxtLink>
            </nav>

            <!-- Categories -->
            <div v-if="tenantCategories && tenantCategories.length" class="px-6 py-4">
              <h4 class="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B0A090] mb-3">Collections</h4>
              <div class="flex flex-col gap-1">
                <NuxtLink
                  v-for="cat in tenantCategories"
                  :key="cat.id"
                  :to="'/c/' + cat.slug"
                  class="py-2 text-sm text-[#7A6558] hover:text-[#C17B4E] transition-colors"
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
      <footer class="mt-24 bg-[#2C2420] text-[#D4C4B4]">
        <div class="max-w-7xl mx-auto px-6 py-16">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <!-- Brand -->
            <div class="col-span-1 md:col-span-1">
              <h3 class="font-maison-serif text-2xl font-semibold text-white mb-4">{{ tenantName }}</h3>
              <p class="text-sm text-[#A09080] leading-relaxed mb-6">
                Art de vivre, décoration intérieure & accessoires maison soigneusement sélectionnés.
              </p>
              <ul v-if="primaryContactInfos.length" class="space-y-3 text-sm">
                <li v-for="info in primaryContactInfos" :key="info.id" class="flex items-start gap-3">
                  <Icon :name="kindDef(info.kind).iconName" class="w-4 h-4 text-[#C17B4E] mt-0.5 shrink-0" />
                  <a
                    v-if="hrefFor(info)"
                    :href="hrefFor(info)!"
                    class="hover:text-white transition-colors text-[#A09080]"
                    :target="isExternalHref(hrefFor(info)!) ? '_blank' : undefined"
                    :rel="isExternalHref(hrefFor(info)!) ? 'noopener noreferrer' : undefined"
                  >
                    <span>{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                  </a>
                  <span v-else class="text-[#A09080]">{{ info.label ? `${info.label}: ` : '' }}{{ info.value }}</span>
                </li>
              </ul>
              <div v-if="socialContactInfosWithHref.length" class="flex gap-3 mt-6">
                <a
                  v-for="info in socialContactInfosWithHref"
                  :key="info.id"
                  :href="info.href"
                  class="h-9 w-9 rounded-sm bg-[#3D342F] flex items-center justify-center hover:bg-[#C17B4E] transition-colors text-[#A09080] hover:text-white"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >
                  <Icon :name="kindDef(info.kind).iconName" class="w-4 h-4" />
                </a>
              </div>
            </div>

            <!-- Collections -->
            <div>
              <h4 class="text-[10px] tracking-[0.2em] uppercase font-bold text-[#C17B4E] mb-5">Collections</h4>
              <ul class="space-y-3 text-sm text-[#A09080]">
                <li v-for="cat in (tenantCategories || []).slice(0, 5)" :key="cat.id">
                  <NuxtLink :to="`/c/${cat.slug}`" class="hover:text-white transition-colors">{{ cat.title }}</NuxtLink>
                </li>
              </ul>
            </div>

            <!-- Service -->
            <div>
              <h4 class="text-[10px] tracking-[0.2em] uppercase font-bold text-[#C17B4E] mb-5">{{ storefrontContent.footer.contact }}</h4>
              <ul class="space-y-3 text-sm text-[#A09080]">
                <li><a href="/contact" class="hover:text-white transition-colors">{{ storefrontContent.footer.contactUs }}</a></li>
                <li><a href="/about" class="hover:text-white transition-colors">{{ storefrontContent.footer.aboutUs }}</a></li>
              </ul>
            </div>

            <!-- Legal -->
            <div>
              <h4 class="text-[10px] tracking-[0.2em] uppercase font-bold text-[#C17B4E] mb-5">{{ storefrontContent.footer.termsPrivacy }}</h4>
              <ul class="space-y-3 text-sm text-[#A09080]">
                <li><a href="#" class="hover:text-white transition-colors">{{ storefrontContent.footer.termsOfService }}</a></li>
                <li><a href="#" class="hover:text-white transition-colors">{{ storefrontContent.footer.privacyPolicy }}</a></li>
                <li><a href="#" class="hover:text-white transition-colors">{{ storefrontContent.footer.returnPolicy }}</a></li>
              </ul>
            </div>
          </div>

          <div class="pt-8 border-t border-[#3D342F] flex flex-col md:flex-row items-center justify-between gap-4">
            <p class="text-xs text-[#6A5A50] tracking-wider">{{ storefrontContent.footer.copyright(tenantName) }}</p>
            <p class="text-xs text-[#6A5A50] tracking-wider uppercase">Art de Vivre · Algérie</p>
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
