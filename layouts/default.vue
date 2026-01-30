<template>
  <div class="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-600">
    <MarketingNavBar />
    <!-- Spacer for fixed header since MarketingNavBar is fixed -->
    <!-- Note: SaasLanding has its own paddingTop so we might not strictly need a spacer if the hero handles it, 
         but creating a safe zone is good practice if content starts immediately.
         However, SaasLanding uses 'pt-20' padding-top on the Hero section which exactly matches the 5rem (20 * 0.25rem = 5rem = 80px) header height.
         But since the header is 'fixed', it overlays content. 
         SaasLanding has 'pt-20' (80px) + 'lg:pt-32' (128px). 
         So we DO NOT need an extra spacer div here if the page content expects a fixed header.
         Let's omit the spacer here and rely on page padding, as is common with fixed headers. -->

    <main class="flex-grow">
      <slot />
    </main>

    <footer class="bg-white border-t border-slate-200 mt-auto">
      <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div class="col-span-1 md:col-span-2">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-6 h-6 rounded bg-teal-600 flex items-center justify-center text-white">
                <Icon name="lucide:store" class="w-3 h-3" />
              </div>
              <span class="text-xl font-sans font-bold text-slate-900">MySaaS</span>
            </div>
            <p class="text-slate-500 text-sm leading-relaxed max-w-xs">
              Empowering businesses with cutting-edge tools and a premium experience. Built for scale, designed for you.
            </p>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-slate-900 tracking-wider uppercase mb-4">
              Product
            </h3>
            <ul class="space-y-3">
              <li>
                <a
                  href="#"
                  class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
                >Features</a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
                >Pricing</a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
                >Changelog</a>
              </li>
            </ul>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-slate-900 tracking-wider uppercase mb-4">
              Support
            </h3>
            <ul class="space-y-3">
              <li>
                <a
                  href="#"
                  class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
                >Documentation</a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
                >API Status</a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
                >Contact</a>
              </li>
            </ul>
          </div>
        </div>
        <div class="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p class="text-center text-sm text-slate-400">
            &copy; {{ new Date().getFullYear() }} MySaaS Platform. All rights reserved.
          </p>
          <div class="flex space-x-6">
            <a
              href="#"
              class="text-slate-400 hover:text-slate-500"
            >
              <span class="sr-only">Twitter</span>
              <Icon name="lucide:twitter" class="h-5 w-5" />
            </a>
            <a
              href="#"
              class="text-slate-400 hover:text-slate-500"
            >
              <span class="sr-only">GitHub</span>
              <Icon name="lucide:github" class="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'

const authStore = useAuthStore()
const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')

// Load cart on mount
onMounted(() => {
  cartStore.loadFromLocalStorage()
})

function handleLogout() {
  authStore.logout()
}
</script>
