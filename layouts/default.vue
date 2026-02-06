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

    <MarketingFooter />
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
