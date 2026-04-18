<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/chrono/ProductCard.vue'

const props = defineProps<{
    category: any,
    products: any[]
}>()

const storefrontContent = useStorefrontContent()

const categoryDisplayTitle = (category: any): string => {
    if (!category) return ""
    return category.parentId ? ("-> " + category.title) : category.title
}


const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: allCategories } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders(),
    lazy: true
})

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
</script>

<template>
  <div class="min-h-screen py-8" style="background-color:#0E1117; font-family:'Cormorant Garamond',serif;">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Breadcrumb -->
      <nav class="flex mb-8 text-sm text-gray-500">
        <NuxtLink to="/" class="hover:text-[#A67C52]">{{ storefrontContent.nav.home }}</NuxtLink>
        <span class="mx-2 text-gray-700">/</span>
        <NuxtLink to="/products" class="hover:text-[#A67C52]">{{ storefrontContent.nav.shop }}</NuxtLink>
        <span class="mx-2 text-gray-700">/</span>
        <span class="font-medium text-[#A67C52]">{{ category.title }}</span>
      </nav>

      <!-- Category Banner -->
      <div class="relative overflow-hidden bg-[#0B0E16] text-white mb-8 border border-[#A67C52]/10" style="border-radius: 2px;">
        <img
          v-if="category.imageUrl"
          :src="category.imageUrl"
          :alt="category.title"
          class="absolute inset-0 w-full h-full object-contain opacity-40 bg-black"
        >
        <div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/50" />
        <div class="relative p-8 sm:p-10 lg:p-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-[#A67C52] mb-2">
              {{ storefrontContent.category.label }}
            </p>
            <h1 class="text-3xl sm:text-4xl font-bold">
              {{ category.title }}
            </h1>
            <p class="mt-3 text-gray-400 text-sm">
              {{ category.description || storefrontContent.category.description }}
            </p>
          </div>
          <div class="flex items-center gap-3 bg-[#A67C52]/10 border border-[#A67C52]/20 px-5 py-2 text-sm" style="border-radius: 2px;">
            <span class="inline-flex items-center justify-center w-8 h-8 bg-[#A67C52]/20 text-[#A67C52] font-semibold" style="border-radius: 2px;">
              {{ categoryProducts.length }}
            </span>
            <span class="text-gray-300">{{ storefrontContent.category.productsAvailableLabel }}</span>
          </div>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Sidebar -->
        <aside class="w-full lg:w-64 flex-shrink-0 space-y-8">
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-[#A67C52] tracking-[0.15em] uppercase text-xs">
                {{ storefrontContent.shop.categories }}
              </h3>
            </div>
            <div class="space-y-2">
              <NuxtLink 
                v-for="cat in allCategories" 
                :key="cat.id" 
                :to="`/c/${cat.slug}`"
                class="flex items-center gap-3 cursor-pointer group p-2 transition-colors"
                :class="cat.id === category.id ? 'bg-[#A67C52]/10 text-[#A67C52] font-medium border-l-2 border-[#A67C52]' : 'text-gray-500 hover:text-[#A67C52]'"
              >
                <span
                  class="w-1.5 h-1.5 bg-gray-700 group-hover:bg-[#A67C52] transition-colors"
                  :class="cat.id === category.id ? 'bg-[#A67C52]' : ''"
                  style="border-radius: 1px;"
                />
                <span class="text-sm transition-colors">{{ categoryDisplayTitle(cat) }}</span>
              </NuxtLink>
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <div class="flex-1">
          <!-- Header -->
          <div class="bg-[#0B0E16] p-6 border border-[#A67C52]/10 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style="border-radius: 2px;">
            <div>
              <h1 class="text-2xl font-bold text-white">{{ category.title }}</h1>
              <p class="text-gray-500 text-sm mt-1">{{ storefrontContent.category.showingResults(categoryProducts.length) }}</p>
            </div>
                      
            <div class="flex items-center gap-3">
              <span class="text-sm text-gray-500">{{ storefrontContent.category.sortBy }}</span>
              <select v-model="sortOption" class="bg-[#131720] border-[#A67C52]/20 text-gray-300 text-sm focus:border-[#A67C52] focus:ring-[#A67C52]" style="border-radius: 2px;">
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
            class="bg-[#0B0E16] border border-[#A67C52]/10 p-12 text-center"
            style="border-radius: 2px;"
          >
            <Icon name="lucide:package-open" class="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-white">{{ storefrontContent.shop.results.noResults }}</h3>
            <p class="text-gray-500 mt-1">{{ storefrontContent.category.emptyHint }}</p>
            <NuxtLink
              to="/products"
              class="inline-flex items-center justify-center mt-6 px-6 py-2 bg-[#A67C52] text-black text-sm font-bold tracking-wider uppercase hover:bg-[#d4b85c] transition-colors"
              style="border-radius: 2px;"
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
