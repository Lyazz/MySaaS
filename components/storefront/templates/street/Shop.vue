<script setup lang="ts">
import ProductCard from './ProductCard.vue'

const props = defineProps<{
    products: any[]
}>()

// Fetch dynamic categories for filters
const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: categoryData } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders(),
    lazy: true
})

const { format: formatCurrency } = useCurrency()
const storefrontContent = useStorefrontContent()

const categoryDisplayTitle = (category: any): string => {
    if (!category) return ""
    return category.parentId ? ("-> " + category.title) : category.title
}


// Dynamic Filters
const filters = computed(() => ({
    categories: categoryData.value || [],
}))

// Filtering Logic
const selectedCategories = ref<string[]>([])
const searchQuery = ref('')
const sortOption = ref<'relevance' | 'priceAsc' | 'priceDesc'>('relevance')
const viewMode = ref<'grid' | 'list'>('grid')

// Price Range State
const priceRange = computed(() => {
    const prices = props.products
        .map((product) => Number(product?.price))
        .filter((price): price is number => Number.isFinite(price))

    if (prices.length === 0) {
        return { min: 0, max: 0 }
    }

    return {
        min: Math.min(...prices),
        max: Math.max(...prices),
    }
})
const minPriceInput = ref<number | null>(null)
const maxPriceInput = ref<number | null>(null)

// Quick View State
const isQuickViewOpen = ref(false)
const quickViewProduct = ref<any>(null)

// Mobile Filter Drawer
const isFilterDrawerOpen = ref(false)

const filteredProducts = computed(() => {
    let result = [...props.products]

    // Filter by Category
    if (selectedCategories.value.length > 0) {
        const selectedIds = selectedCategories.value 
        result = result.filter(p => selectedIds.some((id) => [ ...((Array.isArray(p.categoryIds) ? p.categoryIds : [])), p.categoryId ].filter(Boolean).includes(id)))
    }

    // Filter by Search
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(p => p.title.toLowerCase().includes(q))
    }

    // Filter by Price
    result = result.filter(p => {
        const price = Number(p.price)
        const minMatches = minPriceInput.value == null ? true : price >= Number(minPriceInput.value)
        const maxMatches = maxPriceInput.value == null ? true : price <= Number(maxPriceInput.value)
        return minMatches && maxMatches
    })

    // Sort
    if (sortOption.value === 'priceAsc') {
        result.sort((a, b) => Number(a.price) - Number(b.price))
    } else if (sortOption.value === 'priceDesc') {
        result.sort((a, b) => Number(b.price) - Number(a.price))
    }

    return result
})

const {
    currentPage,
    totalPages,
    pageNumbers,
    paginatedProducts,
    canGoPrev,
    canGoNext,
    goToPage,
    goToPrevPage,
    goToNextPage
} = useProductPagination(filteredProducts, 12)


const pageTitle = computed(() => {
    const content = storefrontContent.value
    if (selectedCategories.value.length === 1) {
        const cat = filters.value.categories.find(c => c.id === selectedCategories.value[0])
        return cat ? cat.title : content.shop.catalogTitle
    }
    if (selectedCategories.value.length > 1) {
        return content.shop.filteredTitle
    }
    return content.shop.catalogTitle
})

// Toggle Category Selection
const toggleCategory = (catId: string) => {
    const idx = selectedCategories.value.indexOf(catId)
    if (idx === -1) selectedCategories.value.push(catId)
    else selectedCategories.value.splice(idx, 1)
}

const removeCategory = (catId: string) => {
    const idx = selectedCategories.value.indexOf(catId)
    if (idx !== -1) selectedCategories.value.splice(idx, 1)
}

// Reset Filters
const resetFilters = () => {
    selectedCategories.value = []
    searchQuery.value = ''
    sortOption.value = 'relevance'
    minPriceInput.value = null
    maxPriceInput.value = null
}

const openQuickView = (product: any) => {
    quickViewProduct.value = product
    isQuickViewOpen.value = true
}

const closeQuickView = () => {
    isQuickViewOpen.value = false
    quickViewProduct.value = null
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-24">
    <!-- Mobile Filter Drawer Overlay -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-in-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300 ease-in-out"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isFilterDrawerOpen"
        class="fixed inset-0 bg-black/50 z-40 lg:hidden"
        @click="isFilterDrawerOpen = false"
      />
    </Transition>

    <!-- Mobile Filter Drawer -->
    <Transition
      enter-active-class="transition-transform duration-300 ease-in-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300 ease-in-out"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="isFilterDrawerOpen"
        class="fixed inset-y-0 right-0 w-[300px] bg-white z-50 border-l-4 border-black p-6 overflow-y-auto lg:hidden"
      >
        <div class="flex items-center justify-between mb-6 border-b-4 border-black pb-4">
          <h3 class="font-street text-2xl uppercase">{{ storefrontContent.actions.filters }}</h3>
          <button
            class="p-2 hover:bg-black hover:text-white transition-colors"
            @click="isFilterDrawerOpen = false"
          >
            <Icon name="lucide:x" class="w-6 h-6" />
          </button>
        </div>
            
        <div class="space-y-8">
          <!-- Categories -->
          <div>
            <h4 class="font-street text-lg uppercase mb-4">{{ storefrontContent.shop.categories }}</h4>
            <div class="space-y-3">
              <label
                v-for="cat in filters.categories"
                :key="cat.id"
                class="flex items-center gap-3 cursor-pointer group select-none"
              >
                <input 
                  v-model="selectedCategories" 
                  type="checkbox"
                  :value="cat.id"
                  class="w-5 h-5 border-2 border-black checked:bg-brand checked:border-brand" 
                >
                <span class="font-mono text-sm uppercase group-hover:text-brand transition-colors">{{ categoryDisplayTitle(cat) }}</span>
              </label>
            </div>
          </div>

          <div class="mb-6">
            <StorefrontPriceRangeFilter
              v-model:min-price="minPriceInput"
              v-model:max-price="maxPriceInput"
              :min-bound="priceRange.min"
              :max-bound="priceRange.max"
              :step="1"
            />
          </div>

          <!-- Apply Button Mobile -->
          <div class="pt-8 sticky bottom-0 bg-white pb-safe">
            <button
              class="w-full py-3 bg-brand border-2 border-black font-street text-xl uppercase shadow-[4px_4px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
              @click="isFilterDrawerOpen = false"
            >
              {{ storefrontContent.shop.showResults(filteredProducts.length) }}
            </button>
          </div>
        </div>
      </aside>
    </Transition>

    <!-- Header Removed -->

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex flex-col lg:flex-row gap-10">
        <!-- Tablet/Desktop Sidebar Filters (Hidden on Mobile) -->
        <aside class="hidden lg:block w-64 flex-shrink-0 space-y-8 bg-white p-6 border-4 border-black sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 custom-scrollbar shadow-[8px_8px_0_0_#000]">
          <!-- Filter Header -->
          <div class="flex items-center justify-between mb-4 border-b-4 border-black pb-4">
            <h3 class="font-street text-xl uppercase">
              {{ storefrontContent.actions.filters }}
            </h3>
            <button
              class="font-mono text-xs uppercase underline hover:bg-black hover:text-white px-1"
              @click="resetFilters"
            >
              {{ storefrontContent.actions.reset }}
            </button>
          </div>

          <!-- Categories -->
          <div>
            <h4 class="font-street text-lg uppercase mb-4">
              {{ storefrontContent.shop.categories }}
            </h4>
            <div class="space-y-3">
              <label
                v-for="cat in filters.categories"
                :key="cat.id"
                class="flex items-center gap-3 cursor-pointer group select-none"
              >
                <input 
                  v-model="selectedCategories" 
                  type="checkbox"
                  :value="cat.id"
                  class="w-4 h-4 border-2 border-black checked:bg-brand checked:border-brand" 
                >
                <span class="font-mono text-sm uppercase group-hover:text-brand transition-colors">{{ categoryDisplayTitle(cat) }}</span>
              </label>
            </div>
          </div>

          <!-- Price Filter -->
          <div>
            <h4 class="font-street text-lg uppercase mb-4">
              {{ storefrontContent.shop.priceRange.label }}
            </h4>
            <StorefrontPriceRangeFilter
              v-model:min-price="minPriceInput"
              v-model:max-price="maxPriceInput"
              :min-bound="priceRange.min"
              :max-bound="priceRange.max"
              :step="1"
            />
          </div>
        </aside>

        <!-- Main Content -->
        <div class="flex-1">
          <!-- Active Filters Chips -->
          <div v-if="selectedCategories.length > 0" class="flex flex-wrap gap-2 mb-6">
              <div 
                v-for="catId in selectedCategories" 
                :key="catId"
                class="flex items-center gap-2 px-3 py-1 bg-brand border-2 border-black font-mono text-xs uppercase"
              >
                <span>{{ categoryDisplayTitle(filters.categories.find(c => c.id === catId)) || storefrontContent.shop.categoryFallback }}</span>
                <button @click="removeCategory(catId)" class="hover:text-white">
                    <Icon name="lucide:x" class="w-4 h-4" />
                </button>
              </div>
              <button @click="resetFilters" class="font-mono text-xs uppercase underline hover:bg-black hover:text-white px-1">
                  {{ storefrontContent.actions.clearAll }}
              </button>
          </div>
          
          <!-- Toolbar -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <!-- Mobile Filter Toggle (Visible only on mobile) -->
            <button
              class="w-full sm:hidden flex items-center justify-center gap-2 px-4 py-3 bg-white border-4 border-black font-street text-xl uppercase shadow-[4px_4px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none"
              @click="isFilterDrawerOpen = true"
            >
              <Icon name="lucide:sliders-horizontal" class="w-5 h-5" />
              {{ storefrontContent.shop.filtersAndSort }}
            </button>

            <!-- Search in results -->
            <div class="relative max-w-md w-full">
              <input 
                v-model="searchQuery" 
                type="text"
                :placeholder="storefrontContent.shop.searchWithinResultsPlaceholder" 
                class="w-full bg-white border-4 border-black font-mono text-sm uppercase pl-4 pr-10 py-3 focus:shadow-[4px_4px_0_0_#000] outline-none transition-shadow" 
              >
              <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <Icon name="lucide:search" class="w-5 h-5" />
              </div>
            </div>

            <!-- Sort Dropdown -->
            <div class="hidden sm:flex items-center gap-3 w-full sm:w-auto">
              <span class="font-street text-lg uppercase">{{ storefrontContent.shop.sortBy }}</span>
              <div class="relative w-full sm:w-48">
                <select
                  v-model="sortOption"
                  class="w-full appearance-none bg-white border-4 border-black font-mono text-sm uppercase py-3 pl-4 pr-10 cursor-pointer hover:shadow-[4px_4px_0_0_#000] transition-shadow"
                >
                  <option value="relevance">{{ storefrontContent.shop.sort.relevance }}</option>
                  <option value="priceAsc">{{ storefrontContent.shop.sort.priceLowToHigh }}</option>
                  <option value="priceDesc">{{ storefrontContent.shop.sort.priceHighToLow }}</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Icon name="lucide:chevron-down" class="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <!-- Grid -->
          <div
            v-if="filteredProducts.length === 0"
            class="bg-white border-4 border-dashed border-black p-12 text-center"
          >
            <Icon name="lucide:package-open" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 class="font-street text-2xl uppercase">
              {{ storefrontContent.shop.results.noResults }}
            </h3>
            <p class="font-mono text-sm uppercase text-gray-500 mt-2">
              {{ storefrontContent.shop.results.noResultsHint }}
            </p>
            <button
              class="mt-6 px-6 py-2 bg-black text-brand font-street text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_var(--brand)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              @click="resetFilters"
            >
              {{ storefrontContent.actions.clearAll }}
            </button>
          </div>

          <div
            v-else
            class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-y-10"
          >
            <ProductCard
              v-for="product in paginatedProducts"
              :key="product.id"
              :product="product"
              @quick-view="openQuickView"
            />
          <StorefrontProductPagination
            :current-page="currentPage"
            :total-pages="totalPages"
            :page-numbers="pageNumbers"
            :can-go-prev="canGoPrev"
            :can-go-next="canGoNext"
            @go-to-page="goToPage"
            @go-prev="goToPrevPage"
            @go-next="goToNextPage"
          />

          </div>
        </div>
      </div>
    </div>

    <!-- Quick View Modal -->
    <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
    >
        <div v-if="isQuickViewOpen && quickViewProduct" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/60" @click="closeQuickView"></div>
            <div class="bg-white border-4 border-black shadow-[12px_12px_0_0_var(--brand)] max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-10 flex flex-col md:flex-row overflow-hidden">
                <button @click="closeQuickView" class="absolute top-4 right-4 z-20 p-2 bg-white border-2 border-black hover:bg-brand transition-colors">
                    <Icon name="lucide:x" class="w-6 h-6" />
                </button>
                
                <div class="w-full md:w-1/2 aspect-square md:aspect-auto bg-gray-100 relative border-r-4 border-black">
                    <img 
                      :src="quickViewProduct.images && quickViewProduct.images[0] ? quickViewProduct.images[0] : '/blank.svg?v=2'" 
                      class="w-full h-full object-cover"
                    >
                </div>
                <div class="w-full md:w-1/2 p-8 flex flex-col">
                    <div>
                      <span class="inline-block px-3 py-1 bg-black text-white font-mono text-xs uppercase mb-4">{{ storefrontContent.product.inStock }}</span>
                      <h2 class="font-street text-4xl uppercase mb-4">{{ quickViewProduct.title }}</h2>
                      <div class="font-mono text-2xl font-bold mb-6 bg-brand inline-block px-2 border-2 border-black">
                          {{ formatCurrency(quickViewProduct.price) }}
                      </div>
                      <p class="font-mono text-sm text-gray-600 leading-relaxed mb-8">
                          {{ quickViewProduct.description || storefrontContent.product.descriptionFallback }}
                      </p>
                    </div>

                    <div class="mt-auto space-y-4">
                        <button class="w-full py-4 bg-black text-white font-street text-2xl uppercase border-2 border-black hover:bg-brand hover:text-black transition-colors shadow-[4px_4px_0_0_var(--brand)] hover:shadow-none">
                          {{ storefrontContent.actions.addToCart }}
                        </button>
                        <NuxtLink :to="`/p/${quickViewProduct.slug}`" class="block w-full py-3 border-2 border-black font-mono text-sm uppercase text-center hover:bg-gray-100 transition-colors" @click="closeQuickView">
                          {{ storefrontContent.product.viewFullDetails }}
                        </NuxtLink>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
  </div>
</template>
