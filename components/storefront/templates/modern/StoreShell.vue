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
   // lazy: true
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
    base.push({ name: 'Contact', href: '/contact' }) // contact is usually static or handled elsewhere
    return base
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
    <div class="min-h-screen flex flex-col font-sans text-slate-600 bg-[#f8faf9]">
      <!-- Top Announcement Bar -->
      <div v-if="!hideNavigation && !hideAnnouncementBar" class="bg-brand-600 text-white text-xs font-medium py-2 px-4 text-center">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
          <span>{{ tenantName }} 6% | 4,000 {{ currencyCode }} min | 3 item(s)</span>
          <button class="text-white/80 hover:text-white">
            &times;
          </button>
        </div>
      </div>

      <!-- Header -->
      <header v-if="!hideNavigation" :class="['bg-white border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50', { 'hidden md:block': mobileHeaderHidden }]">
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
                <div class="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
                  <!-- Placeholder Logo Icon -->
                  <Icon name="lucide:store" class="w-6 h-6" />
                </div>
              </template>
              <span class="text-xl font-bold text-slate-900 group-hover:text-brand-600 transition-colors tracking-tight">{{ tenantName }}</span>
            </NuxtLink>

            <!-- Search Bar (Centered & Rounded) -->
            <div class="flex-1 max-w-lg hidden md:block">
              <div class="relative group">
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  class="w-full h-10 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-full focus:ring-2 focus:ring-brand-500 focus:border-transparent block pl-5 pr-10 transition-all shadow-sm group-hover:bg-white" 
                >
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Icon name="lucide:search" class="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
                </div>
              </div>
            </div>

            <!-- Navigation & Actions -->
            <div class="flex items-center gap-6">
              <!-- Desktop Menu -->
              <nav class="hidden lg:flex items-center gap-6">
                <NuxtLink 
                  v-for="item in categories" 
                  :key="item.name" 
                  :to="item.href"
                  class="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors"
                  active-class="text-brand-600 font-semibold"
                >
                  {{ item.name }}
                </NuxtLink>
              </nav>

              <div class="h-6 w-px bg-slate-200 hidden lg:block" />

              <!-- Icons -->
              <div class="flex items-center gap-3">
                <button
                  class="h-10 w-10 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:bg-slate-50 rounded-full transition-colors"
                  title="Wishlist"
                >
                  <Icon name="lucide:heart" class="w-5 h-5" />
                </button>
                <button
                  class="h-10 w-10 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:bg-slate-50 rounded-full transition-colors"
                  title="Account"
                >
                  <Icon name="lucide:user" class="w-5 h-5" />
                </button>

                <!-- Cart -->
                <NuxtLink
                  v-if="storeSettings?.cartEnabled !== false"
                  to="/cart"
                  class="group relative h-10 flex items-center justify-center px-4 rounded-full bg-brand-600 text-white shadow-md hover:bg-brand-700 transition-all hover:shadow-lg"
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
      <footer class="bg-navy-900/95 text-slate-300 pt-16 pb-8 border-t border-navy-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <!-- Brand Column -->
            <div class="col-span-1 md:col-span-1">
              <h3 class="text-white text-lg font-bold mb-6">
                {{ tenantName }}
              </h3>
              <ul class="space-y-4 text-sm">
                <li class="flex items-start gap-3">
                  <Icon name="lucide:phone" class="w-5 h-5 text-brand-500 mt-0.5" />
                  <span>0770838576</span>
                </li>
                <li class="flex items-start gap-3">
                  <Icon name="lucide:mail" class="w-5 h-5 text-brand-500 mt-0.5" />
                  <span>noukhba.contact@gmail.com</span>
                </li>
              </ul>
              <div class="flex gap-4 mt-6">
                <a
                  href="#"
                  class="h-10 w-10 rounded-full bg-navy-800 flex items-center justify-center hover:bg-brand-600 transition-colors text-white"
                >
                  <Icon name="lucide:facebook" class="w-5 h-5" />
                </a>
                <a
                  href="#"
                  class="h-10 w-10 rounded-full bg-navy-800 flex items-center justify-center hover:bg-brand-600 transition-colors text-white"
                >
                  <Icon name="lucide:instagram" class="w-5 h-5" />
                </a>
              </div>
            </div>

            <!-- Links Column -->
            <div>
              <h4 class="text-white font-semibold mb-6">
                Contact
              </h4>
              <ul class="space-y-3 text-sm text-slate-400">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-400 transition-colors"
                  >Contact Us</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-400 transition-colors"
                  >About Us</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="text-white font-semibold mb-6">
                Terms & Privacy
              </h4>
              <ul class="space-y-3 text-sm text-slate-400">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-400 transition-colors"
                  >Terms of Service</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-400 transition-colors"
                  >Privacy Policy</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-400 transition-colors"
                  >Return Policy</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="text-white font-semibold mb-6">
                Help
              </h4>
              <ul class="space-y-3 text-sm text-slate-400">
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-400 transition-colors"
                  >FAQ</a>
                </li>
                <li>
                  <a
                    href="#"
                    class="hover:text-brand-400 transition-colors"
                  >Shipping Info</a>
                </li>
              </ul>
            </div>
          </div>

          <div class="pt-8 border-t border-navy-800 text-center text-xs text-slate-500">
            &copy; 2026 {{ tenantName }} — All rights reserved.
          </div>
        </div>
      </footer>
      

    </div>
  </StoreThemeProvider>
</template>
