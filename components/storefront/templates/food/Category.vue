<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/modern/ProductCard.vue'

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
  <div class="bg-stone-50 min-h-screen py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Breadcrumb -->
      <nav class="flex mb-8 text-sm text-stone-500">
        <NuxtLink
          to="/"
          class="hover:text-brand-600"
        >
          {{ storefrontContent.nav.home }}
        </NuxtLink>
        <span class="mx-2">/</span>
        <NuxtLink
          to="/products"
          class="hover:text-brand-600"
        >
          {{ storefrontContent.nav.shop }}
        </NuxtLink>
        <span class="mx-2">/</span>
        <span class="font-medium text-slate-900">{{ category.title }}</span>
      </nav>

      <div class="relative overflow-hidden rounded-2xl bg-slate-900 text-white mb-8 shadow-sm border border-slate-200">
        <img
          v-if="category.imageUrl"
          :src="category.imageUrl"
          :alt="category.title"
          class="absolute inset-0 w-full h-full object-contain opacity-90 bg-stone-900"
        >
        <div class="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-stone-900/60 to-black/30" />
        <div class="relative p-8 sm:p-10 lg:p-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-brand-200 mb-2">
              {{ storefrontContent.category.label }}
            </p>
            <h1 class="text-3xl sm:text-4xl font-bold font-sans">
              {{ category.title }}
            </h1>
            <p class="mt-3 text-stone-200 text-sm">
              {{ category.description || storefrontContent.category.description }}
            </p>
          </div>
          <div class="flex items-center gap-3 bg-white/10 backdrop-blur rounded-full px-5 py-2 text-sm border border-white/20">
            <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-white font-semibold">
              {{ categoryProducts.length }}
            </span>
            <span class="text-stone-100">{{ storefrontContent.category.productsAvailableLabel }}</span>
          </div>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Sidebar Filters -->
        <aside class="w-full lg:w-64 flex-shrink-0 space-y-8">
          <!-- Categories -->
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-stone-900">
                {{ storefrontContent.shop.categories }}
              </h3>
            </div>
            <div class="space-y-2">
              <!-- Iterate over fetched categories -->
              <NuxtLink 
                v-for="cat in allCategories" 
                :key="cat.id" 
                :to="`/category/${cat.slug}`"
                class="flex items-center gap-3 cursor-pointer group p-1 rounded-lg hover:bg-stone-50 transition-colors"
                :class="cat.id === category.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-stone-600'"
              >
                <!-- Mock Icon or simple bullet -->
                <span
                  class="w-1.5 h-1.5 rounded-full bg-stone-300 group-hover:bg-brand-500 transition-colors"
                  :class="cat.id === category.id ? 'bg-brand-600' : ''"
                />
                <span class="text-sm transition-colors">{{ categoryDisplayTitle(cat) }}</span>
              </NuxtLink>
            </div>
          </div>

          <!-- Removed Price (Mock) -->
        </aside>

        <!-- Main Content -->
        <div class="flex-1">
          <!-- Header -->
          <div class="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 class="text-2xl font-bold text-stone-900">
                {{ category.title }}
              </h1>
              <p class="text-stone-500 text-sm mt-1">
                {{ storefrontContent.category.showingResults(categoryProducts.length) }}
              </p>
            </div>
                      
            <!-- Sort -->
            <div class="flex items-center gap-3">
              <span class="text-sm text-stone-500">{{ storefrontContent.category.sortBy }}</span>
              <select v-model="sortOption" class="rounded-lg border-stone-200 text-sm focus:border-brand-500 focus:ring-brand-500">
                <option value="mostPopular">{{ storefrontContent.category.sort.mostPopular }}</option>
                <option value="newest">{{ storefrontContent.category.sort.newest }}</option>
                <option value="priceLowToHigh">{{ storefrontContent.category.sort.priceLowToHigh }}</option>
                <option value="priceHighToLow">{{ storefrontContent.category.sort.priceHighToLow }}</option>
              </select>
            </div>
          </div>

          <!-- Grid -->
          <div
            v-if="sortedProducts.length === 0"
            class="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center"
          >
            <Icon name="lucide:package-open" class="w-16 h-16 text-stone-200 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-stone-900">
              {{ storefrontContent.shop.results.noResults }}
            </h3>
            <p class="text-stone-500 mt-1">
              {{ storefrontContent.category.emptyHint }}
            </p>
            <NuxtLink
              to="/products"
              class="inline-flex items-center justify-center mt-6 px-6 py-2 rounded-full bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
            >
              {{ storefrontContent.shop.allProducts }}
            </NuxtLink>
          </div>
          <div
            v-else
            class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6"
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
