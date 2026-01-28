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
              <div class="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white">
                <svg
                  class="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                /></svg>
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
                  class="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
                >Features</a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
                >Pricing</a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
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
                  class="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
                >Documentation</a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
                >API Status</a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
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
              <svg
                class="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              ><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
            </a>
            <a
              href="#"
              class="text-slate-400 hover:text-slate-500"
            >
              <span class="sr-only">GitHub</span>
              <svg
                class="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              ><path
                fill-rule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clip-rule="evenodd"
              /></svg>
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
