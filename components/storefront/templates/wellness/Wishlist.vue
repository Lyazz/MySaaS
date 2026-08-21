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
  <div class="bg-wl-paper min-h-screen font-wellness text-wl-ink py-10 lg:py-14">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Ruled header, with the kept count sitting in the rule as label data -->
      <div class="wl-ruled wl-ruled--start mb-3">
        <h1 class="wl-display text-3xl lg:text-[2.5rem] text-wl-ink leading-none">
          {{ storefrontContent.wishlist.title }}
        </h1>
        <ClientOnly>
          <button
            v-if="favorites.count.value > 0"
            type="button"
            class="wl-label text-wl-muted hover:text-wl-ink transition-colors flex-shrink-0"
            @click="favorites.clear()"
          >
            {{ storefrontContent.actions.clearAll }}
          </button>
        </ClientOnly>
      </div>
      <p class="text-wl-muted max-w-xl leading-relaxed mb-10">
        {{ storefrontContent.wishlist.emptySubtitle }}
      </p>

      <ClientOnly>
        <div
          v-if="favorites.count.value === 0"
          class="border border-wl-rule bg-wl-card p-14 text-center"
        >
          <div class="mx-auto w-14 h-14 border border-wl-rule flex items-center justify-center text-wl-muted">
            <Icon name="lucide:heart" class="w-6 h-6" />
          </div>
          <div class="wl-display text-2xl text-wl-ink mt-6 mb-3">
            {{ storefrontContent.wishlist.emptyTitle }}
          </div>
          <div class="text-wl-muted leading-relaxed">
            {{ storefrontContent.wishlist.emptySubtitle }}
          </div>
          <div class="mt-8">
            <NuxtLink
              to="/products"
              class="inline-flex items-center justify-center wl-cta px-8 py-3.5 wl-label"
            >
              {{ storefrontContent.actions.startBrowsing }}
            </NuxtLink>
          </div>
        </div>

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6 lg:gap-y-10">
          <component
            :is="card"
            v-for="product in products"
            :key="product.id"
            :product="product"
          />
        </div>
      </ClientOnly>
    </div>
  </div>
</template>
