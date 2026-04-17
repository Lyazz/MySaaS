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
const priceRange = ref({ min: 0, max: 200000 })
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
        result = result.filter(p => selectedIds.includes(p.categoryId))
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
  <div class="min-h-screen bg-gradient-to-b from-amber-50/30 to-white pb-24">
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
        class="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
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
        class="fixed inset-y-0 right-0 w-[320px] bg-white z-50 p-6 overflow-y-auto lg:hidden shadow-2xl rounded-l-[2rem]"
      >
        <div class="flex items-center justify-between mb-8">
          <h3 class="font-cozy font-bold text-xl text-slate-800">{{ storefrontContent.actions.filters }}</h3>
          <button
            class="p-2 hover:bg-slate-100 rounded-full transition-colors"
            @click="isFilterDrawerOpen = false"
          >
            <Icon name="lucide:x" class="w-6 h-6 text-slate-500" />
          </button>
        </div>
            
        <div class="space-y-8">
          <!-- Categories -->
          <div>
            <h4 class="font-medium text-slate-700 mb-4">{{ storefrontContent.shop.categories }}</h4>
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
                  class="w-5 h-5 rounded-lg border-slate-300 text-brand-500 focus:ring-brand-200" 
                >
                <span class="text-slate-600 group-hover:text-brand-500 transition-colors">{{ cat.title }}</span>
              </label>
            </div>
          </div>

          <div class="mb-6">
            <StorefrontPriceRangeFilter
              v-model:min-price="minPriceInput"
              v-model:max-price="maxPriceInput"
            />
          </div>

          <!-- Apply Button Mobile -->
          <div class="pt-8 sticky bottom-0 bg-white pb-safe">
            <button
              class="w-full py-4 bg-brand-500 text-white rounded-full font-bold shadow-lg shadow-brand-200 hover:bg-brand-600 transition-all"
              @click="isFilterDrawerOpen = false"
            >
              {{ storefrontContent.shop.showResults(filteredProducts.length) }}
            </button>
          </div>
        </div>
      </aside>
    </Transition>

    <!-- Header Removed -->
    <div class="py-4 px-4 text-center">
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col lg:flex-row gap-10">
        <!-- Tablet/Desktop Sidebar Filters (Hidden on Mobile) -->
        <aside class="hidden lg:block w-64 flex-shrink-0 space-y-8 bg-white p-6 rounded-[2rem] border border-slate-100 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 custom-scrollbar shadow-soft">
          <!-- Filter Header -->
          <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
            <h3 class="font-cozy font-bold text-lg text-slate-800">
              {{ storefrontContent.actions.filters }}
            </h3>
            <button
              class="text-sm text-brand-500 hover:text-brand-600"
              @click="resetFilters"
            >
              {{ storefrontContent.actions.reset }}
            </button>
          </div>

          <!-- Categories -->
          <div>
            <h4 class="font-medium text-slate-700 mb-4">
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
                  class="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-200" 
                >
                <span class="text-sm text-slate-600 group-hover:text-brand-500 transition-colors">{{ cat.title }}</span>
              </label>
            </div>
          </div>

          <!-- Price Filter -->
          <div>
            <h4 class="font-medium text-slate-700 mb-4">
              {{ storefrontContent.shop.priceRange.label }}
            </h4>
            <StorefrontPriceRangeFilter
              v-model:min-price="minPriceInput"
              v-model:max-price="maxPriceInput"
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
                class="flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-600 rounded-full text-sm"
              >
                <span>{{ filters.categories.find(c => c.id === catId)?.title || storefrontContent.shop.categoryFallback }}</span>
                <button @click="removeCategory(catId)" class="hover:text-brand-800">
                    <Icon name="lucide:x" class="w-4 h-4" />
                </button>
              </div>
              <button @click="resetFilters" class="text-sm text-slate-500 hover:text-brand-500 underline">
                  {{ storefrontContent.actions.clearAll }}
              </button>
          </div>
          
          <!-- Toolbar -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <!-- Mobile Filter Toggle (Visible only on mobile) -->
            <button
              class="w-full sm:hidden flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-full text-slate-600 font-bold shadow-sm active:scale-95 transition-all"
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
                class="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-full focus:ring-2 focus:ring-brand-200 focus:border-brand-400 block pl-5 pr-10 py-3 shadow-sm transition-shadow hover:shadow-md" 
              >
              <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <Icon name="lucide:search" class="w-5 h-5 text-slate-400" />
              </div>
            </div>

            <!-- Sort Dropdown -->
            <div class="hidden sm:flex items-center gap-3 w-full sm:w-auto">
              <span class="text-sm text-slate-500 whitespace-nowrap">{{ storefrontContent.shop.sortBy }}</span>
              <div class="relative w-full sm:w-48">
                <select
                  v-model="sortOption"
                  class="w-full appearance-none bg-white rounded-full border border-slate-200 text-sm py-3 pl-4 pr-10 focus:border-brand-400 focus:ring-brand-200 shadow-sm cursor-pointer hover:border-brand-300 transition-colors text-slate-600 font-medium"
                >
                  <option value="relevance">{{ storefrontContent.shop.sort.relevance }}</option>
                  <option value="priceAsc">{{ storefrontContent.shop.sort.priceLowToHigh }}</option>
                  <option value="priceDesc">{{ storefrontContent.shop.sort.priceHighToLow }}</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Icon name="lucide:chevron-down" class="w-4 h-4 text-slate-500" />
                </div>
              </div>
            </div>
          </div>

          <!-- Grid -->
          <div
            v-if="filteredProducts.length === 0"
            class="bg-white rounded-[2rem] border border-slate-100 shadow-soft p-12 text-center"
          >
            <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
              <Icon name="lucide:package-open" class="w-10 h-10" />
            </div>
            <h3 class="text-lg font-medium text-slate-800">
              {{ storefrontContent.shop.results.noResults }}
            </h3>
            <p class="text-slate-500 mt-1">
              {{ storefrontContent.shop.results.noResultsHint }}
            </p>
            <button
              class="mt-6 px-6 py-2 bg-brand-500 text-white rounded-full hover:bg-brand-600 transition-colors"
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
            <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeQuickView"></div>
            <div class="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-10 flex flex-col md:flex-row overflow-hidden">
                <button @click="closeQuickView" class="absolute top-4 right-4 z-20 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-slate-100 transition-colors">
                    <Icon name="lucide:x" class="w-6 h-6 text-slate-500" />
                </button>
                
                <div class="w-full md:w-1/2 aspect-square md:aspect-auto bg-slate-50 relative">
                    <img 
                      :src="quickViewProduct.images && quickViewProduct.images[0] ? quickViewProduct.images[0] : '/blank.svg?v=2'" 
                      class="w-full h-full object-cover"
                    >
                </div>
                <div class="w-full md:w-1/2 p-8 flex flex-col">
                    <div>
                      <span class="inline-block px-3 py-1 bg-brand-50 text-brand-500 rounded-full text-xs font-medium mb-4">{{ storefrontContent.product.inStock }}</span>
                      <h2 class="font-cozy font-bold text-2xl text-slate-800 mb-4">{{ quickViewProduct.title }}</h2>
                      <div class="text-2xl font-bold text-brand-500 mb-6">
                          {{ formatCurrency(quickViewProduct.price) }}
                      </div>
                      <p class="text-slate-500 leading-relaxed mb-8">
                          {{ quickViewProduct.description || storefrontContent.product.descriptionFallback }}
                      </p>
                    </div>

                    <div class="mt-auto space-y-4">
                        <button class="w-full py-4 bg-slate-800 text-white font-bold rounded-full shadow-lg hover:bg-brand-500 hover:shadow-xl transition-all">
                          {{ storefrontContent.actions.addToCart }}
                        </button>
                        <NuxtLink :to="`/p/${quickViewProduct.slug}`" class="block w-full py-3 text-center text-slate-500 hover:text-brand-500 font-medium transition-colors" @click="closeQuickView">
                          {{ storefrontContent.product.viewFullDetails }}
                        </NuxtLink>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
  </div>
</template>
