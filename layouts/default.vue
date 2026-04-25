<template>
  <div class="marketing-shell marketing-shell--cinematic flex min-h-screen flex-col">
    <MarketingCinematicNavCinematic />

    <main class="relative z-10 flex-grow">
      <slot />
    </main>

    <MarketingCinematicFooterCinematic />
  </div>
</template>

<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>
