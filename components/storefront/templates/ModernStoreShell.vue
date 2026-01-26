<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import StoreThemeProvider from '../StoreThemeProvider.vue'

const cartStore = useCartStore()
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')

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
</script>

<template>
  <StoreThemeProvider>
    <div class="min-h-screen flex flex-col font-sans text-slate-600 bg-[#f8faf9]">
      
      <!-- Top Announcement Bar -->
      <div class="bg-brand-600 text-white text-xs font-medium py-2 px-4 text-center">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
            <span>{{ tenantName }} 6% | 4,000 DZD min | 3 item(s)</span>
            <button class="text-white/80 hover:text-white">&times;</button>
        </div>
      </div>

      <!-- Header -->
      <header class="bg-white border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="h-20 flex items-center justify-between gap-4">
            
            <!-- Logo -->
            <NuxtLink to="/" class="flex-shrink-0 flex items-center gap-2 group">
              <div class="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
                 <!-- Placeholder Logo Icon -->
                 <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <span class="text-xl font-bold text-slate-900 group-hover:text-brand-600 transition-colors tracking-tight">{{ tenantName }}</span>
            </NuxtLink>

            <!-- Search Bar (Centered & Rounded) -->
            <div class="flex-1 max-w-lg hidden md:block">
                <div class="relative group">
                    <input 
                        type="text" 
                        placeholder="Search products..." 
                        class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-full focus:ring-2 focus:ring-brand-500 focus:border-transparent block w-full pl-5 p-2.5 transition-all shadow-sm group-hover:bg-white" 
                    />
                    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg class="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
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

                <div class="h-6 w-px bg-slate-200 hidden lg:block"></div>

                <!-- Icons -->
                <div class="flex items-center gap-3">
                    <button class="p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-50 rounded-full transition-colors" title="Wishlist">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                    </button>
                     <button class="p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-50 rounded-full transition-colors" title="Account">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    </button>

                     <!-- Cart -->
                    <NuxtLink to="/cart" class="group relative flex items-center justify-center p-2 rounded-full bg-brand-600 text-white shadow-md hover:bg-brand-700 transition-all hover:shadow-lg">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        <span v-if="cartStore.itemCount > 0" class="ml-1 text-xs font-bold">{{ cartStore.itemCount }}</span>
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
              <h3 class="text-white text-lg font-bold mb-6">{{ tenantName }}</h3>
              <ul class="space-y-4 text-sm">
                <li class="flex items-start gap-3">
                    <svg class="w-5 h-5 text-brand-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                    <span>0770838576</span>
                </li>
                 <li class="flex items-start gap-3">
                    <svg class="w-5 h-5 text-brand-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    <span>noukhba.contact@gmail.com</span>
                </li>
              </ul>
               <div class="flex gap-4 mt-6">
                <a href="#" class="h-10 w-10 rounded-full bg-navy-800 flex items-center justify-center hover:bg-brand-600 transition-colors text-white">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                 <a href="#" class="h-10 w-10 rounded-full bg-navy-800 flex items-center justify-center hover:bg-brand-600 transition-colors text-white">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.069-4.85.069-3.204 0-3.584-.012-4.849-.069-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
               </div>
            </div>

            <!-- Links Column -->
            <div>
                 <h4 class="text-white font-semibold mb-6">Contact</h4>
                 <ul class="space-y-3 text-sm text-slate-400">
                    <li><a href="#" class="hover:text-brand-400 transition-colors">Contact Us</a></li>
                    <li><a href="#" class="hover:text-brand-400 transition-colors">About Us</a></li>
                 </ul>
            </div>
               <div>
                 <h4 class="text-white font-semibold mb-6">Terms & Privacy</h4>
                 <ul class="space-y-3 text-sm text-slate-400">
                    <li><a href="#" class="hover:text-brand-400 transition-colors">Terms of Service</a></li>
                    <li><a href="#" class="hover:text-brand-400 transition-colors">Privacy Policy</a></li>
                     <li><a href="#" class="hover:text-brand-400 transition-colors">Return Policy</a></li>
                 </ul>
            </div>
             <div>
                 <h4 class="text-white font-semibold mb-6">Help</h4>
                 <ul class="space-y-3 text-sm text-slate-400">
                    <li><a href="#" class="hover:text-brand-400 transition-colors">FAQ</a></li>
                    <li><a href="#" class="hover:text-brand-400 transition-colors">Shipping Info</a></li>
                 </ul>
            </div>
 
          </div>

          <div class="pt-8 border-t border-navy-800 text-center text-xs text-slate-500">
            &copy; 2026 {{ tenantName }} — All rights reserved.
          </div>
        </div>
      </footer>
      
      <!-- WhatsApp Floating Button -->
      <a href="#" class="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[#25D366] text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>

    </div>
  </StoreThemeProvider>
</template>
