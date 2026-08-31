<script setup lang="ts">
import ProductCard from './ProductCard.vue'
import CategoryPlaceholder from '~/components/storefront/CategoryPlaceholder.vue'

const props = defineProps<{
  category: any,
  products: any[] // All products passed, we filter here
}>()

const storefrontContent = useStorefrontContent()

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: allCategories } = await useFetch<any[]>(categoriesUrl, {
  headers: useTenantApiHeaders(),
  lazy: true
})

const categoryProducts = computed(() => {
  const id = props.category.id
  return (props.products ?? []).filter((p: any) => p.isActive && p.stock > 0 && [...((Array.isArray(p.categoryIds) ? p.categoryIds : [])), p.categoryId].filter(Boolean).includes(id))
})

type SortOption = 'mostPopular' | 'newest' | 'priceLowToHigh' | 'priceHighToLow'
const sortOption = ref<SortOption>('mostPopular')

const sortedProducts = computed(() => {
  const result = [...categoryProducts.value]
  if (sortOption.value === 'newest') {
    result.sort((a, b) => Number(new Date(b.createdAt ?? 0)) - Number(new Date(a.createdAt ?? 0)))
  } else if (sortOption.value === 'priceLowToHigh') {
    result.sort((a, b) => Number(a.price) - Number(b.price))
  } else if (sortOption.value === 'priceHighToLow') {
    result.sort((a, b) => Number(b.price) - Number(a.price))
  }
  return result
})

/*
 * The tile rail shows where you can go from here: children of this category
 * when it has any, otherwise its siblings — never a flat dump of everything.
 */
const relatedCategories = computed(() => {
  const all = allCategories.value || []
  const children = all.filter((c) => c.parentId === props.category.id)
  if (children.length > 0) return children
  const siblings = all.filter((c) => (c.parentId || null) === (props.category.parentId || null) && c.id !== props.category.id)
  return siblings.length > 0 ? siblings : all.filter((c) => c.id !== props.category.id)
})

const tileTints = ['var(--kw-pink-soft)', 'var(--kw-sky-soft)', 'var(--kw-lemon-soft)', 'var(--kw-mint-soft)', 'var(--kw-lilac-soft)']
const tintAt = (index: number) => tileTints[index % tileTints.length]
</script>

<template>
  <div class="bg-[var(--kw-cream)] min-h-screen pb-16">
    <!-- ══ Cover ══════════════════════════════════════════════════════ -->
    <section class="kw-band-mint kw-scallop pt-8 pb-16 md:pb-20">
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <nav class="flex items-center gap-2 text-xs font-bold text-[var(--kw-ink-soft)] mb-8">
          <NuxtLink
            to="/"
            class="hover:text-[var(--kw-pink-deep)] transition-colors"
          >
            {{ storefrontContent.nav.home }}
          </NuxtLink>
          <Icon
            name="lucide:chevron-right"
            class="w-3.5 h-3.5 opacity-50 rtl:rotate-180"
          />
          <NuxtLink
            to="/products"
            class="hover:text-[var(--kw-pink-deep)] transition-colors"
          >
            {{ storefrontContent.nav.shop }}
          </NuxtLink>
          <Icon
            name="lucide:chevron-right"
            class="w-3.5 h-3.5 opacity-50 rtl:rotate-180"
          />
          <span class="text-[var(--kw-ink)]">{{ category.title }}</span>
        </nav>

        <div class="grid md:grid-cols-[1fr_auto] gap-8 items-center">
          <div class="kw-rise">
            <p class="kw-kicker mb-3">
              {{ storefrontContent.category.label }}
            </p>
            <h1 class="kw-display text-3xl md:text-[3rem] mb-4">
              {{ category.title }}
            </h1>
            <p class="kw-lede max-w-xl mb-6">
              {{ category.description || storefrontContent.category.description }}
            </p>
            <span class="kw-chip !cursor-default">
              <span class="kw-num text-[var(--kw-pink-deep)]">{{ categoryProducts.length }}</span>
              {{ storefrontContent.category.productsAvailableLabel }}
            </span>
          </div>

          <div
            v-if="category.imageUrl"
            class="kw-blob kw-float w-40 h-40 md:w-56 md:h-56 overflow-hidden justify-self-center md:justify-self-end"
            style="box-shadow: 0 0 0 4px rgba(255,255,255,.85)"
          >
            <img
              :src="category.imageUrl"
              :alt="category.title"
              class="w-full h-full object-cover"
            >
          </div>
        </div>
      </div>
    </section>

    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
      <!-- ══ Related category tiles ═══════════════════════════════════ -->
      <section
        v-if="relatedCategories.length"
        class="pt-12 pb-4"
      >
        <div class="flex gap-4 md:gap-6 overflow-x-auto kw-hide-scroll pt-3 pb-5 snap-x">
          <NuxtLink
            v-for="(cat, index) in relatedCategories"
            :key="cat.id"
            :to="`/category/${cat.slug}`"
            class="group snap-start flex-shrink-0 w-20 sm:w-24 text-center"
          >
            <div
              class="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-2.5 transition-transform duration-300 group-hover:-translate-y-1.5"
              :style="{ background: tintAt(index), boxShadow: `0 0 0 2px var(--kw-line)` }"
            >
              <img
                v-if="cat.imageUrl"
                :src="cat.imageUrl"
                :alt="cat.title"
                class="w-full h-full object-cover"
              >
              <CategoryPlaceholder
                v-else
                :title="cat.title"
                class="w-full h-full"
              />
            </div>
            <p class="text-[11px] sm:text-xs font-extrabold leading-tight line-clamp-2 group-hover:text-[var(--kw-pink-deep)] transition-colors">
              {{ cat.title }}
            </p>
          </NuxtLink>
        </div>
      </section>

      <!-- ══ Sort bar ═════════════════════════════════════════════════ -->
      <div class="kw-card-flat p-3 my-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p class="kw-title text-sm ms-2">
          {{ storefrontContent.category.showingResults(categoryProducts.length) }}
        </p>
        <div class="relative sm:w-56">
          <select
            v-model="sortOption"
            class="kw-field h-11 pe-10 appearance-none cursor-pointer bg-[var(--kw-cream-2)] border-transparent"
          >
            <option value="mostPopular">
              {{ storefrontContent.category.sort.mostPopular }}
            </option>
            <option value="newest">
              {{ storefrontContent.category.sort.newest }}
            </option>
            <option value="priceLowToHigh">
              {{ storefrontContent.category.sort.priceLowToHigh }}
            </option>
            <option value="priceHighToLow">
              {{ storefrontContent.category.sort.priceHighToLow }}
            </option>
          </select>
          <Icon
            name="lucide:chevron-down"
            class="w-4 h-4 text-[var(--kw-ink-faint)] absolute end-4 top-1/2 -translate-y-1/2 pointer-events-none"
          />
        </div>
      </div>

      <!-- ══ Grid ═════════════════════════════════════════════════════ -->
      <div
        v-if="sortedProducts.length === 0"
        class="kw-card p-14 text-center"
      >
        <span
          class="w-20 h-20 kw-blob mx-auto mb-6 flex items-center justify-center"
          style="background: var(--kw-sky-soft)"
        >
          <Icon
            name="lucide:package-open"
            class="w-9 h-9 text-[var(--kw-sky-deep)]"
          />
        </span>
        <h3 class="kw-title text-xl mb-2">
          {{ storefrontContent.shop.results.noResults }}
        </h3>
        <p class="kw-lede mb-7">
          {{ storefrontContent.category.emptyHint }}
        </p>
        <NuxtLink
          to="/products"
          class="kw-btn"
        >
          {{ storefrontContent.shop.allProducts }}
        </NuxtLink>
      </div>

      <div
        v-else
        class="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10"
      >
        <ProductCard
          v-for="product in sortedProducts"
          :key="product.id"
          :product="product"
        />
      </div>
    </div>
  </div>
</template>
