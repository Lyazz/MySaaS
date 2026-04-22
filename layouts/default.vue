<template>
  <div class="marketing-shell flex min-h-screen flex-col font-sans">
    <MarketingNavBar />

    <main class="relative z-10 flex-grow">
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
