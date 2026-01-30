<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import StoreThemeProvider from '../../StoreThemeProvider.vue'

const cartStore = useCartStore()
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')
const storeSettings = useState<any>('storeSettings')
</script>

<template>
  <StoreThemeProvider>
    <div class="min-h-screen flex flex-col">
      <header class="bg-white/80 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-200/60 shadow-sm transition-all duration-300">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-20 items-center">
            <div class="flex-shrink-0 flex items-center gap-2">
              <template v-if="storeSettings?.logoUrl">
                <img 
                  :src="storeSettings.logoUrl" 
                  :alt="tenantName" 
                  class="h-8 max-w-[120px] object-contain"
                >
              </template>
              <template v-else>
                <div class="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white shadow-md">
                  <Icon name="lucide:store" class="w-5 h-5" />
                </div>
              </template>
              <NuxtLink
                to="/"
                class="text-2xl font-sans font-bold text-slate-900 tracking-tight hover-text-brand transition-colors"
              >
                {{ tenantName }}
              </NuxtLink>
            </div>

            <div class="flex items-center space-x-8">
              <nav class="hidden md:flex space-x-8">
                <NuxtLink
                  to="/"
                  class="text-sm font-medium text-slate-600 hover:text-brand transition-colors"
                >
                  Home
                </NuxtLink>
                <NuxtLink
                  to="/products"
                  class="text-sm font-medium text-slate-600 hover:text-brand transition-colors"
                >
                  Products
                </NuxtLink>
                <NuxtLink
                  to="/about"
                  class="text-sm font-medium text-slate-600 hover:text-brand transition-colors"
                >
                  About
                </NuxtLink>
                <NuxtLink
                  to="/contact"
                  class="text-sm font-medium text-slate-600 hover:text-brand transition-colors"
                >
                  Contact
                </NuxtLink>
              </nav>

              <div class="h-6 w-px bg-slate-200 hidden md:block" />

              <div class="flex items-center space-x-4">
                <NuxtLink
                  v-if="storeSettings?.cartEnabled !== false"
                  to="/cart"
                  class="relative group p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <Icon name="lucide:shopping-bag" class="w-6 h-6 text-slate-600 group-hover:text-brand transition-colors" />
                  <span
                    v-if="cartStore.itemCount > 0"
                    class="absolute -top-0.5 -right-0.5 bg-brand text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white shadow-sm"
                  >
                    {{ cartStore.itemCount }}
                  </span>
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main class="flex-grow">
        <slot />
      </main>

      <footer class="bg-white border-t border-slate-200 mt-auto">
        <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div class="col-span-1 md:col-span-2">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-6 h-6 rounded bg-brand flex items-center justify-center text-white">
                    <Icon name="lucide:store" class="w-3 h-3" />
                </div>
                <span class="text-xl font-sans font-bold text-slate-900">{{ tenantName }}</span>
              </div>
              <p class="text-slate-500 text-sm leading-relaxed max-w-xs">
                Powered by MySaaS.
              </p>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-slate-900 tracking-wider uppercase mb-4">
                Shop
              </h3>
              <ul class="space-y-3">
                <li>
                  <NuxtLink
                    to="/products"
                    class="text-sm text-slate-500 hover-text-brand transition-colors"
                  >
                    All Products
                  </NuxtLink>
                </li>
                <li>
                  <NuxtLink
                    v-if="storeSettings?.cartEnabled !== false"
                    to="/checkout"
                    class="text-sm text-slate-500 hover-text-brand transition-colors"
                  >
                    Checkout
                  </NuxtLink>
                </li>
              </ul>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-slate-900 tracking-wider uppercase mb-4">
                Pages
              </h3>
              <ul class="space-y-3">
                <li>
                  <NuxtLink
                    to="/about"
                    class="text-sm text-slate-500 hover-text-brand transition-colors"
                  >
                    About
                  </NuxtLink>
                </li>
                <li>
                  <NuxtLink
                    to="/contact"
                    class="text-sm text-slate-500 hover-text-brand transition-colors"
                  >
                    Contact
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </div>
          <div class="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p class="text-center text-sm text-slate-400">
              &copy; {{ new Date().getFullYear() }} {{ tenantName }}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  </StoreThemeProvider>
</template>
