<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/wellness/ProductCard.vue'

const props = defineProps<{
    category: any,
    products: any[] // All products passed, we filter here
}>()

const storefrontContent = useStorefrontContent()

const categoryDisplayTitle = (category: any): string => {
    if (!category) return ""
    return category.parentId ? ("-> " + category.title) : category.title
}


// Fetch dynamic categories for sidebar
const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: allCategories } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders(),
    lazy: true
})

// Filter products for this category
const categoryProducts = computed(() => {
    const id = props.category.id
    return (props.products ?? []).filter((p: any) => p.isActive && p.stock > 0 && [ ...((Array.isArray(p.categoryIds) ? p.categoryIds : [])), p.categoryId ].filter(Boolean).includes(id))
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

// Mock filters removed. We only show Categories logic for navigation.
</script>

<template>
  <div class="bg-wl-paper min-h-screen py-8 font-wellness text-wl-ink">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Breadcrumb -->
      <nav class="flex items-center mb-8 wl-label text-wl-muted">
        <NuxtLink
          to="/"
          class="hover:text-wl-ink transition-colors"
        >
          {{ storefrontContent.nav.home }}
        </NuxtLink>
        <span class="mx-2 text-wl-oliveSoft">/</span>
        <NuxtLink
          to="/products"
          class="hover:text-wl-ink transition-colors"
        >
          {{ storefrontContent.nav.shop }}
        </NuxtLink>
        <span class="mx-2 text-wl-oliveSoft">/</span>
        <span class="text-wl-ink">{{ category.title }}</span>
      </nav>

      <!-- Category plate: image behind, label panel in front -->
      <div class="wl-specimen relative overflow-hidden border border-wl-rule bg-wl-card mb-10">
        <img
          v-if="category.imageUrl"
          :src="category.imageUrl"
          :alt="category.title"
          class="absolute inset-0 w-full h-full object-cover"
        >
        <div v-if="category.imageUrl" class="absolute inset-0 bg-wl-paper/50" />
        <div class="relative p-4 sm:p-8 lg:p-10 flex">
          <div class="wl-plate wl-plate-lg relative z-10 p-6 sm:p-8 max-w-xl w-full">
            <p class="wl-eyebrow wl-label mb-3">
              {{ storefrontContent.category.label }}
            </p>
            <h1 class="wl-display text-3xl sm:text-4xl text-wl-ink leading-tight">
              {{ category.title }}
            </h1>
            <p class="mt-3 text-wl-muted text-sm leading-relaxed">
              {{ category.description || storefrontContent.category.description }}
            </p>
            <div class="flex items-baseline gap-2 mt-5 pt-4 border-t border-wl-rule">
              <span class="wl-num wl-display text-2xl text-wl-ink">
                {{ categoryProducts.length }}
              </span>
              <span class="wl-label text-wl-muted">{{ storefrontContent.category.productsAvailableLabel }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-10">
        <!-- Sidebar Filters -->
        <aside class="w-full lg:w-60 flex-shrink-0">
          <div class="lg:sticky lg:top-28">
            <h3 class="wl-label text-wl-muted pb-3 mb-1 border-b border-wl-rule">
              {{ storefrontContent.shop.categories }}
            </h3>
            <div class="flex flex-col">
              <NuxtLink
                v-for="cat in allCategories"
                :key="cat.id"
                :to="`/category/${cat.slug}`"
                class="flex items-center gap-3 py-2.5 border-b border-wl-rule/60 transition-colors"
                :class="cat.id === category.id ? 'text-wl-oliveDeep' : 'text-wl-muted hover:text-wl-oliveDeep'"
              >
                <span
                  class="w-4 h-px flex-shrink-0 transition-colors"
                  :class="cat.id === category.id ? 'bg-wl-olive h-0.5' : 'bg-wl-ruleStrong'"
                />
                <span class="text-sm">{{ categoryDisplayTitle(cat) }}</span>
              </NuxtLink>
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <div class="flex-1 min-w-0">
          <!-- Header -->
          <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 mb-8 border-b border-wl-rule">
            <div>
              <h2 class="wl-display text-2xl text-wl-ink leading-none">
                {{ category.title }}
              </h2>
              <p class="wl-label wl-num text-wl-muted mt-2.5">
                {{ storefrontContent.category.showingResults(categoryProducts.length) }}
              </p>
            </div>

            <!-- Sort -->
            <div class="flex items-center gap-3 flex-shrink-0">
              <span class="wl-label text-wl-muted whitespace-nowrap">{{ storefrontContent.category.sortBy }}</span>
              <div class="relative w-48">
                <select
                  v-model="sortOption"
                  class="wl-field w-full appearance-none text-sm py-2.5 ps-4 pe-10 cursor-pointer"
                >
                  <option value="mostPopular">{{ storefrontContent.category.sort.mostPopular }}</option>
                  <option value="newest">{{ storefrontContent.category.sort.newest }}</option>
                  <option value="priceLowToHigh">{{ storefrontContent.category.sort.priceLowToHigh }}</option>
                  <option value="priceHighToLow">{{ storefrontContent.category.sort.priceHighToLow }}</option>
                </select>
                <div class="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none">
                  <Icon name="lucide:chevron-down" class="w-4 h-4 text-wl-muted" />
                </div>
              </div>
            </div>
          </div>

          <!-- Grid -->
          <div
            v-if="sortedProducts.length === 0"
            class="wl-plate p-14 text-center"
          >
            <div class="w-14 h-14 bg-wl-oliveWash border border-wl-oliveSoft flex items-center justify-center mx-auto mb-6">
              <Icon name="lucide:package-open" class="w-6 h-6 text-wl-oliveDeep" />
            </div>
            <h3 class="wl-display text-2xl text-wl-ink mb-3">
              {{ storefrontContent.shop.results.noResults }}
            </h3>
            <p class="text-wl-muted leading-relaxed">
              {{ storefrontContent.category.emptyHint }}
            </p>
            <NuxtLink
              to="/products"
              class="inline-flex items-center justify-center mt-8 px-8 py-3.5 wl-cta wl-label"
            >
              {{ storefrontContent.shop.allProducts }}
            </NuxtLink>
          </div>
          <div
            v-else
            class="grid grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-y-10"
          >
            <ProductCard
              v-for="product in sortedProducts"
              :key="product.id"
              :product="product"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
