<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import StoreThemeProvider from './ThemeProvider.vue'

const cartStore = useCartStore()
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')
const storeSettings = useState<any>('storeSettings')
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
    <div class="min-h-screen flex flex-col max-w-[1920px] mx-auto bg-gradient-to-b from-amber-50/30 to-white">
      <!-- Top Announcement Bar -->
      <div v-if="!hideNavigation && !hideAnnouncementBar" class="bg-brand-100/50 text-brand-800 text-xs font-medium py-2 px-4 text-center">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
          <span class="inline-block px-3 py-1 bg-white/50 rounded-full backdrop-blur-sm">{{ tenantName }} 6% | 4,000 {{ currencyCode }} min | 3 item(s)</span>
          <button class="text-brand-600 hover:text-brand-800">
            &times;
          </button>
        </div>
      </div>

      <!-- Header -->
      <header v-if="!hideNavigation" :class="['sticky top-4 z-50 px-4 md:px-8', { 'hidden md:block': mobileHeaderHidden }]">
        <div class="max-w-7xl mx-auto bg-white/80 backdrop-blur-lg border border-white/50 shadow-soft rounded-[2rem] px-6 py-4 flex items-center justify-between gap-4 transition-all duration-500 hover:shadow-lg hover:bg-white/95">
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
            <NuxtLink 
              v-for="item in categories" 
              :key="item.name" 
              :to="item.href"
              class="font-medium text-slate-500 px-5 py-2 rounded-full hover:bg-white hover:text-brand-500 hover:shadow-sm transition-all text-sm"
              active-class="bg-white text-brand-500 shadow-sm"
            >
              {{ item.name }}
            </NuxtLink>
          </nav>

          <!-- Actions -->
          <div class="flex items-center gap-3">
            <!-- Icons -->
            <button
              class="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-brand-500 hover:bg-slate-50 rounded-full transition-colors"
              title="Wishlist"
            >
              <Icon name="lucide:heart" class="w-5 h-5" />
            </button>
            <button
              class="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-brand-500 hover:bg-slate-50 rounded-full transition-colors"
              title="Account"
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
              <ul class="space-y-4 text-sm">
                <li class="flex items-start gap-3">
                  <Icon name="lucide:phone" class="w-5 h-5 text-brand-400 mt-0.5" />
                  <span class="text-slate-500">0770838576</span>
                </li>
                <li class="flex items-start gap-3">
                  <Icon name="lucide:mail" class="w-5 h-5 text-brand-400 mt-0.5" />
                  <span class="text-slate-500">noukhba.contact@gmail.com</span>
                </li>
              </ul>
              <div class="flex gap-4 mt-6">
                <a
                  href="#"
                  class="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-brand-50 transition-colors text-slate-400 hover:text-brand-500"
                >
                  <Icon name="lucide:facebook" class="w-5 h-5" />
                </a>
                <a
                  href="#"
                  class="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-brand-50 transition-colors text-slate-400 hover:text-brand-500"
                >
                  <Icon name="lucide:instagram" class="w-5 h-5" />
                </a>
              </div>
            </div>

            <!-- Links Column -->
            <div>
              <h4 class="font-medium text-slate-800 mb-6">
                Contact
              </h4>
              <ul class="space-y-3 text-sm text-slate-500">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-500 transition-colors"
                  >Contact Us</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-500 transition-colors"
                  >About Us</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="font-medium text-slate-800 mb-6">
                Terms & Privacy
              </h4>
              <ul class="space-y-3 text-sm text-slate-500">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-500 transition-colors"
                  >Terms of Service</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-500 transition-colors"
                  >Privacy Policy</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-500 transition-colors"
                  >Return Policy</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="font-medium text-slate-800 mb-6">
                Help
              </h4>
              <ul class="space-y-3 text-sm text-slate-500">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-500 transition-colors"
                  >FAQ</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-500 transition-colors"
                  >Shipping Info</a>
                </li>
              </ul>
            </div>
          </div>

          <div class="pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
            &copy; {{ currentYear }} {{ tenantName }} — All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  </StoreThemeProvider>
</template>
