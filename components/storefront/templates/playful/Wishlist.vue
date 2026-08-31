<script setup lang="ts">
/*
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
  <div class="bg-[var(--kw-cream)] min-h-screen pb-16">
    <section class="kw-band-pink kw-scallop pt-10 pb-16 md:pt-14 md:pb-20 mb-10">
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <ClientOnly>
            <p
              v-if="favorites.count.value > 0"
              class="kw-kicker mb-3"
            >
              {{ storefrontContent.common.productsCount(favorites.count.value) }}
            </p>
          </ClientOnly>
          <h1 class="kw-display text-3xl md:text-[2.8rem] mb-2">
            {{ storefrontContent.wishlist.title }}
          </h1>
          <p class="kw-lede">
            {{ storefrontContent.wishlist.emptySubtitle }}
          </p>
        </div>
        <ClientOnly>
          <button
            v-if="favorites.count.value > 0"
            type="button"
            class="kw-chip"
            @click="favorites.clear()"
          >
            <Icon
              name="lucide:trash-2"
              class="w-3.5 h-3.5"
            />
            {{ storefrontContent.actions.clearAll }}
          </button>
        </ClientOnly>
      </div>
    </section>

    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
      <ClientOnly>
        <div
          v-if="favorites.count.value === 0"
          class="kw-card p-14 text-center"
        >
          <span
            class="kw-blob kw-float w-24 h-24 mx-auto mb-7 flex items-center justify-center"
            style="background: linear-gradient(140deg, var(--kw-pink-soft), var(--kw-lilac-soft))"
          >
            <Icon
              name="lucide:heart"
              class="w-10 h-10 text-[var(--kw-pink-deep)]"
            />
          </span>
          <h2 class="kw-title text-xl mb-2">
            {{ storefrontContent.wishlist.emptyTitle }}
          </h2>
          <p class="kw-lede mb-8">
            {{ storefrontContent.wishlist.emptySubtitle }}
          </p>
          <NuxtLink
            to="/products"
            class="kw-btn"
          >
            {{ storefrontContent.actions.startBrowsing }}
            <Icon
              name="lucide:arrow-right"
              class="w-4 h-4 rtl:rotate-180"
            />
          </NuxtLink>
        </div>

        <div
          v-else
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10"
        >
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
