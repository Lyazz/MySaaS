<script setup lang="ts">
// The card arrives as a prop: the registry imports this file, so resolving the
// card from the registry here would be a circular import.
defineProps<{
  products: any[]
  card: any
}>()

const storefrontContent = useStorefrontContent()
const favorites = useFavorites()
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4">
    <div class="max-w-7xl mx-auto">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-12">
        <h1 class="font-street text-5xl md:text-7xl uppercase leading-none bg-white border-4 border-black px-6 py-2 shadow-[8px_8px_0_0_#000]">
          {{ storefrontContent.wishlist.title }}
        </h1>
        <button
          v-if="favorites.count.value > 0"
          type="button"
          class="font-mono text-sm uppercase underline hover:bg-black hover:text-white px-1 transition-colors"
          @click="favorites.clear()"
        >
          {{ storefrontContent.actions.clearAll }}
        </button>
      </div>

      <div
        v-if="favorites.count.value === 0"
        class="text-center py-24 bg-white border-4 border-black shadow-[12px_12px_0_0_#000]"
      >
        <div class="mx-auto h-32 w-32 bg-gray-100 border-4 border-black flex items-center justify-center mb-8">
          <Icon name="lucide:heart" class="h-16 w-16 text-gray-400" />
        </div>
        <h2 class="font-street text-4xl uppercase mb-4">
          {{ storefrontContent.wishlist.emptyTitle }}
        </h2>
        <p class="font-mono text-gray-500 mb-8 uppercase">
          {{ storefrontContent.wishlist.emptySubtitle }}
        </p>
        <NuxtLink
          to="/products"
          class="inline-block bg-brand text-black font-street text-2xl uppercase px-8 py-3 border-2 border-black hover:shadow-[4px_4px_0_0_#000] transition-all"
        >
          {{ storefrontContent.actions.startBrowsing }}
        </NuxtLink>
      </div>

      <div
        v-else
        class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-y-10"
      >
        <component
          :is="card"
          v-for="product in products"
          :key="product.id"
          :product="product"
        />
      </div>
    </div>
  </div>
</template>
