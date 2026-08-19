<script setup lang="ts">
/*
  The wishlist presentation every template used before per-template wishlists
  existed. Kept verbatim so the 15 templates that map to it are unchanged.

  The product card arrives as a prop rather than being resolved from the
  registry here — the registry imports this file, so importing it back would
  be circular.
*/
defineProps<{
  products: any[]
  card: any
}>()

const storefrontContent = useStorefrontContent()
const favorites = useFavorites()
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <div class="flex items-end justify-between gap-4 mb-8">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-slate-900">
          {{ storefrontContent.wishlist.title }}
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          {{ storefrontContent.wishlist.emptySubtitle }}
        </p>
      </div>
      <ClientOnly>
        <button
          v-if="favorites.count.value > 0"
          type="button"
          class="text-sm font-medium text-slate-700 hover:text-red-600 transition-colors"
          @click="favorites.clear()"
        >
          {{ storefrontContent.actions.clearAll }}
        </button>
      </ClientOnly>
    </div>

    <ClientOnly>
      <div
        v-if="favorites.count.value === 0"
        class="rounded-2xl border border-slate-100 bg-white p-8 text-center"
      >
        <div class="mx-auto w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
          <Icon name="lucide:heart" class="w-6 h-6" />
        </div>
        <div class="mt-4 font-semibold text-slate-900">
          {{ storefrontContent.wishlist.emptyTitle }}
        </div>
        <div class="mt-1 text-sm text-slate-500">
          {{ storefrontContent.wishlist.emptySubtitle }}
        </div>
        <div class="mt-6">
          <NuxtLink
            to="/products"
            class="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            {{ storefrontContent.actions.startBrowsing }}
          </NuxtLink>
        </div>
      </div>

      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        <component
          :is="card"
          v-for="product in products"
          :key="product.id"
          :product="product"
        />
      </div>
    </ClientOnly>
  </div>
</template>
