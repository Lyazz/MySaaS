<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')
</script>

<template>
  <StoreThemeProvider>
    <div class="min-h-screen flex flex-col">
      <header class="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200/70">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="h-16 flex items-center justify-between">
            <NuxtLink to="/" class="flex items-center gap-3 group">
              <div class="h-9 w-9 rounded-2xl bg-brand text-white shadow-sm grid place-items-center group-hover:opacity-95 transition-opacity">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div class="leading-tight">
                <div class="text-sm font-semibold text-slate-900">{{ tenantName }}</div>
                <div class="text-xs text-slate-500">Storefront</div>
              </div>
            </NuxtLink>

            <nav class="hidden md:flex items-center gap-6">
              <NuxtLink to="/" class="text-sm font-medium text-slate-700 hover:text-brand transition-colors">Home</NuxtLink>
              <NuxtLink to="/products" class="text-sm font-medium text-slate-700 hover:text-brand transition-colors">Products</NuxtLink>
              <NuxtLink to="/about" class="text-sm font-medium text-slate-700 hover:text-brand transition-colors">About</NuxtLink>
              <NuxtLink to="/contact" class="text-sm font-medium text-slate-700 hover:text-brand transition-colors">Contact</NuxtLink>
            </nav>

            <div class="flex items-center gap-3">
              <NuxtLink to="/cart" class="relative inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                <svg class="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                </svg>
                <span
                  v-if="cartStore.itemCount > 0"
                  class="absolute -top-1 -right-1 bg-brand text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white"
                >
                  {{ cartStore.itemCount }}
                </span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </header>

      <main class="flex-grow">
        <slot />
      </main>

      <footer class="border-t border-slate-200 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div class="text-sm font-semibold text-slate-900">{{ tenantName }}</div>
              <div class="text-sm text-slate-500">Powered by MySaaS.</div>
            </div>
            <div class="flex items-center gap-5 text-sm">
              <NuxtLink to="/products" class="text-slate-600 hover:text-brand transition-colors">Products</NuxtLink>
              <NuxtLink to="/about" class="text-slate-600 hover:text-brand transition-colors">About</NuxtLink>
              <NuxtLink to="/contact" class="text-slate-600 hover:text-brand transition-colors">Contact</NuxtLink>
            </div>
          </div>
          <div class="pt-6 mt-6 border-t border-slate-100 text-xs text-slate-400">
            &copy; {{ new Date().getFullYear() }} {{ tenantName }}.
          </div>
        </div>
      </footer>
    </div>
  </StoreThemeProvider>
</template>

