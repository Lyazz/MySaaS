<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/playful/ProductCard.vue'

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
  <div class="bg-[#faf5ff] min-h-screen py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Breadcrumb -->
      <nav class="flex mb-8 text-sm text-slate-500">
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

      <div class="relative overflow-hidden rounded-[2rem] bg-[#4c1d95] text-white mb-8 shadow-sm border-4 border-purple-200">
        <img
          v-if="category.imageUrl"
          :src="category.imageUrl"
          :alt="category.title"
          class="absolute inset-0 w-full h-full object-contain opacity-70 bg-[#4c1d95]"
        >
        <div class="absolute inset-0 bg-gradient-to-r from-[#4c1d95]/90 via-[#6b21a8]/80 to-[#7e22ce]/60" />
        <div class="relative p-8 sm:p-10 lg:p-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-brand-200 mb-2">
              {{ storefrontContent.category.label }}
            </p>
            <h1 class="text-3xl sm:text-4xl font-bold font-sans">
              {{ category.title }}
            </h1>
            <p class="mt-3 text-slate-200 text-sm">
              {{ category.description || storefrontContent.category.description }}
            </p>
          </div>
          <div class="flex items-center gap-3 bg-white/10 backdrop-blur rounded-full px-5 py-2 text-sm border border-white/20">
            <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-white font-semibold">
              {{ categoryProducts.length }}
            </span>
            <span class="text-slate-100">{{ storefrontContent.category.productsAvailableLabel }}</span>
          </div>
        </div>
      </div>

        <!-- Horizontal Categories (Replaces Sidebar) -->
        <div class="flex flex-wrap gap-3 mb-8 pb-6 border-b-4 border-purple-100/50">
          <!-- Iterate over fetched categories -->
          <NuxtLink 
            v-for="cat in allCategories" 
            :key="cat.id" 
            :to="`/category/${cat.slug}`"
            class="px-6 py-3 rounded-[2rem] text-sm font-black transition-all shadow-sm border-2 whitespace-nowrap"
            :class="cat.id === category.id ? 'bg-[#fbbf24] text-amber-900 border-amber-300 shadow-[0_4px_0_0_#d97706] -translate-y-1' : 'bg-white text-slate-600 border-purple-100 hover:border-amber-200 hover:-translate-y-1 hover:shadow-md'"
          >
            <span class="opacity-80 me-1">🌟</span> {{ categoryDisplayTitle(cat) }}
          </NuxtLink>
        </div>

        <!-- Main Content (Full Width) -->
        <div class="flex-1 w-full">
          <!-- Header -->
          <div class="bg-white p-6 rounded-[2rem] border-4 border-purple-100 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 class="text-2xl font-bold text-slate-900">
                {{ category.title }}
              </h1>
              <p class="text-slate-500 text-sm mt-1">
                {{ storefrontContent.category.showingResults(categoryProducts.length) }}
              </p>
            </div>
                      
            <!-- Sort -->
            <div class="flex items-center gap-3">
              <span class="text-sm font-bold text-slate-500">{{ storefrontContent.category.sortBy }}</span>
              <select v-model="sortOption" class="rounded-full border-2 border-purple-200 text-sm font-black text-slate-700 bg-purple-50 focus:border-brand-500 focus:ring-brand-500 px-4 py-2">
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
            class="bg-white rounded-[2rem] border-4 border-purple-100 shadow-sm p-12 text-center"
          >
            <Icon name="lucide:package-open" class="w-16 h-16 text-brand-300 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-slate-900">
              {{ storefrontContent.shop.results.noResults }}
            </h3>
            <p class="text-slate-500 mt-1">
              {{ storefrontContent.category.emptyHint }}
            </p>
            <NuxtLink
              to="/products"
              class="inline-flex items-center justify-center mt-6 px-8 py-3 rounded-full bg-brand-500 font-black text-white hover:bg-brand-400 hover:-translate-y-1 shadow-[0_6px_0_0_#7e22ce] active:translate-y-2 active:shadow-none transition-all"
            >
              {{ storefrontContent.shop.allProducts }}
            </NuxtLink>
          </div>
          <div
            v-else
            class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6"
          >
            <!-- Apply vertical offset to alternating columns for masonry effect -->
            <div 
              v-for="(product, index) in sortedProducts" 
              :key="product.id"
              :class="index % 2 === 1 ? 'mt-0 sm:mt-8' : 'mt-0'"
            >
              <ProductCard
                :product="product"
              />
            </div>
          </div>
        </div>
    </div>
  </div>
</template>
