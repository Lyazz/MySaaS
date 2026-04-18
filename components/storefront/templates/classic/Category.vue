<script setup lang="ts">
import ProductCard from './ProductCard.vue'

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
  <div class="bg-white min-h-screen py-8 lg:py-12 font-serif">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Minimal Breadcrumb -->
      <nav class="flex mb-12 text-xs uppercase tracking-widest text-slate-500 justify-center">
        <NuxtLink to="/" class="hover:text-slate-900 transition-colors">{{ storefrontContent.nav.home }}</NuxtLink>
        <span class="mx-3 text-slate-300">/</span>
        <NuxtLink to="/products" class="hover:text-slate-900 transition-colors">{{ storefrontContent.nav.shop }}</NuxtLink>
        <span class="mx-3 text-slate-300">/</span>
        <span class="text-slate-900 font-bold border-b border-slate-900">{{ category.title }}</span>
      </nav>

      <!-- Minimal Category Header -->
      <div class="mb-16 text-center max-w-3xl mx-auto">
         <h1 class="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-6">
            {{ category.title }}
         </h1>
         <p class="text-slate-500 leading-relaxed font-light text-lg">
             {{ category.description || storefrontContent.category.description }}
         </p>
      </div>

      <div class="flex flex-col lg:flex-row gap-12">
        <!-- Sidebar Navigation -->
        <aside class="w-full lg:w-64 flex-shrink-0 space-y-10">
          <div>
            <h3 class="font-bold text-slate-900 text-xs uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">
               {{ storefrontContent.shop.categories }}
            </h3>
            <div class="space-y-3">
              <NuxtLink 
                v-for="cat in allCategories" 
                :key="cat.id" 
                :to="`/c/${cat.slug}`"
                class="block py-1 text-sm transition-colors group flex items-center justify-between"
                :class="cat.id === category.id ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'"
              >
                <span>{{ categoryDisplayTitle(cat) }}</span>
                <span v-if="cat.id === category.id" class="w-1.5 h-1.5 bg-slate-900 rounded-full"></span>
              </NuxtLink>
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <div class="flex-1">
          <!-- Toolbar -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <span class="text-sm text-slate-500 font-medium">
              {{ storefrontContent.category.showingResults(categoryProducts.length) }}
            </span>
                      
            <!-- Sort -->
            <div class="flex items-center gap-3">
              <span class="text-sm text-slate-500">{{ storefrontContent.category.sortBy }}</span>
              <div class="relative">
                  <select 
                      v-model="sortOption"
                      class="appearance-none bg-transparent border-none text-sm py-2 pr-8 pl-0 focus:ring-0 cursor-pointer text-slate-900 font-bold hover:text-slate-700 transition-colors"
                  >
                    <option value="mostPopular">{{ storefrontContent.category.sort.mostPopular }}</option>
                    <option value="newest">{{ storefrontContent.category.sort.newest }}</option>
                    <option value="priceLowToHigh">{{ storefrontContent.category.sort.priceLowToHigh }}</option>
                    <option value="priceHighToLow">{{ storefrontContent.category.sort.priceHighToLow }}</option>
                  </select>
                  <Icon name="lucide:chevron-down" class="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rtl:right-auto rtl:left-0" />
              </div>
            </div>
          </div>

          <!-- Grid -->
          <div
            v-if="categoryProducts.length === 0"
            class="bg-gray-50 border border-slate-100 p-16 text-center"
          >
            <Icon name="lucide:package-open" class="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 class="text-lg font-serif text-slate-900">
              {{ storefrontContent.shop.results.noResults }}
            </h3>
            <p class="text-slate-500 mt-2 text-sm">
              {{ storefrontContent.category.emptyHint }}
            </p>
            <NuxtLink
              to="/products"
              class="inline-block mt-6 px-8 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
            >
              {{ storefrontContent.shop.allProducts }}
            </NuxtLink>
          </div>
          <div
            v-else
            class="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10"
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
