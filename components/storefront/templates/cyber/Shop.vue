<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/cyber/ProductCard.vue'

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

const isFilterDrawerOpen = ref(false)

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
  <div class="synthwave-shop min-h-screen py-8 lg:py-12 font-sans relative">
    <!-- Synthwave Background -->
    <div class="fixed inset-0 z-0 pointer-events-none">
      <div class="absolute inset-0 bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0515]"></div>
      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[40%] bg-gradient-to-t from-[#ff2d95]/15 via-[#ff6b35]/5 to-transparent"></div>
      <div class="absolute bottom-0 left-0 right-0 h-[30%] bg-[linear-gradient(rgba(255,45,149,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,45,149,0.1)_1px,transparent_1px)] bg-[size:30px_30px] [perspective:500px] [transform:rotateX(60deg)] origin-bottom opacity-40"></div>
    </div>
    
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
        class="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
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
        class="fixed inset-y-0 right-0 w-[300px] bg-gradient-to-b from-[#1a0a2e] to-[#0d0515] z-50 shadow-2xl p-6 overflow-y-auto lg:hidden border-l border-pink-500/30"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-bold text-white text-lg">{{ storefrontContent.actions.filters }}</h3>
          <button
            class="p-2 -mr-2 text-purple-400 hover:text-pink-400"
            @click="isFilterDrawerOpen = false"
          >
            <Icon name="lucide:x" class="w-6 h-6" />
          </button>
        </div>
            
        <div class="space-y-8">
          <!-- Categories -->
          <div>
            <h4 class="font-bold text-pink-400 mb-4 text-xs uppercase tracking-wider">{{ storefrontContent.shop.categories }}</h4>
            <div class="space-y-3">
              <label
                v-for="cat in filters.categories"
                :key="cat.id"
                class="flex items-center gap-3 cursor-pointer group select-none"
              >
                <div class="relative flex items-center">
                  <input 
                    v-model="selectedCategories" 
                    type="checkbox"
                    :value="cat.id"
                    class="peer h-5 w-5 rounded border-purple-500/50 bg-purple-900/30 text-pink-500 focus:ring-pink-500 transition-all checked:bg-pink-500 checked:border-transparent" 
                  >
                </div>
                <span class="text-base text-purple-200/80 group-hover:text-pink-400 transition-colors">{{ categoryDisplayTitle(cat) }}</span>
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
          <div class="pt-8 mt-4 sticky bottom-0 bg-[#1a0a2e] pb-safe">
            <button
              class="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform"
              @click="isFilterDrawerOpen = false"
            >
              {{ storefrontContent.shop.showResults(filteredProducts.length) }}
            </button>
          </div>
        </div>
      </aside>
    </Transition>

    <!-- Hero Banner Removed -->

    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header / Title Section -->
      <div class="mb-8 lg:mb-10">
             
        <!-- Category Pills -->
        <div class="flex flex-wrap gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
          <button
            class="px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 text-white text-sm font-medium hover:from-pink-600 hover:to-orange-600 transition-all shadow-sm whitespace-nowrap"
            @click="resetFilters"
          >
            {{ storefrontContent.shop.allProducts }}
          </button>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-10">
        <!-- Desktop Sidebar Filters -->
        <aside class="hidden lg:block w-64 flex-shrink-0 space-y-8 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 custom-scrollbar">
          <div class="relative">
            <div class="absolute -inset-1 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-2xl blur"></div>
            <div class="relative bg-[#1a0a2e]/95 p-6 rounded-2xl border border-pink-500/30 backdrop-blur-sm">
              <!-- Filter Header -->
              <div class="flex items-center justify-between mb-4 border-b border-purple-500/20 pb-4">
                <h3 class="font-bold text-white text-lg">{{ storefrontContent.actions.filters }}</h3>
                <button
                  class="text-xs font-semibold text-pink-400 hover:text-pink-300 uppercase tracking-wide"
                  @click="resetFilters"
                >
                  Reset
                </button>
              </div>

              <!-- Categories -->
              <div class="mb-8">
                <h4 class="font-bold text-pink-400 mb-4 text-xs uppercase tracking-wider">{{ storefrontContent.shop.categories }}</h4>
                <div class="space-y-3">
                  <label
                    v-for="cat in filters.categories"
                    :key="cat.id"
                    class="flex items-center gap-3 cursor-pointer group select-none"
                  >
                    <div class="relative flex items-center">
                      <input 
                        v-model="selectedCategories" 
                        type="checkbox"
                        :value="cat.id"
                        class="peer h-4 w-4 rounded border-purple-500/50 bg-purple-900/30 text-pink-500 focus:ring-pink-500 transition-all checked:bg-pink-500 checked:border-transparent" 
                      >
                    </div>
                    <span class="text-sm text-purple-200/80 group-hover:text-pink-400 transition-colors">{{ categoryDisplayTitle(cat) }}</span>
                  </label>
                </div>
              </div>

              <!-- Price Filter -->
              <div>
                <h4 class="font-bold text-pink-400 mb-4 text-xs uppercase tracking-wider">{{ storefrontContent.shop.priceRange.label }}</h4>
                <StorefrontPriceRangeFilter
              v-model:min-price="minPriceInput"
              v-model:max-price="maxPriceInput"
              :min-bound="priceRange.min"
              :max-bound="priceRange.max"
              :step="1"
            />
          </div>
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <div class="flex-1">
          <!-- Active Filters Chips -->
          <div v-if="selectedCategories.length > 0" class="flex flex-wrap gap-2 mb-6">
              <div 
                v-for="catId in selectedCategories" 
                :key="catId"
                class="flex items-center gap-2 px-3 py-1.5 bg-pink-500/20 text-pink-300 rounded-full text-sm font-semibold border border-pink-500/30"
              >
                <span>{{ categoryDisplayTitle(filters.categories.find(c => c.id === catId)) || storefrontContent.shop.categoryFallback }}</span>
                <button @click="removeCategory(catId)" class="hover:text-white">
                    <Icon name="lucide:x" class="w-4 h-4" />
                </button>
              </div>
              <button @click="resetFilters" class="text-sm text-purple-400 hover:text-pink-400 underline underline-offset-2">
                  {{ storefrontContent.actions.clearAll }}
              </button>
          </div>
          
          <!-- Toolbar -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <!-- Mobile Filter Toggle -->
            <button
              class="w-full sm:hidden flex items-center justify-center gap-2 px-4 py-3 bg-[#1a0a2e]/90 border border-purple-500/30 rounded-xl text-purple-200 font-bold shadow-sm active:scale-95 transition-all"
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
                class="w-full bg-[#1a0a2e]/90 border border-purple-500/30 text-white text-sm rounded-full focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 block pl-5 pr-10 py-3 shadow-sm transition-all hover:border-pink-500/50 placeholder:text-purple-400/50" 
              >
              <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <Icon name="lucide:search" class="w-5 h-5 text-purple-400/60" />
              </div>
            </div>

            <!-- Sort Dropdown -->
            <div class="hidden sm:flex items-center gap-3 w-full sm:w-auto">
              <span class="text-sm text-purple-400/70 whitespace-nowrap">{{ storefrontContent.shop.sortBy }}</span>
              <div class="relative w-full sm:w-48">
                <select
                  v-model="sortOption"
                  class="w-full appearance-none bg-[#1a0a2e]/90 rounded-full border border-purple-500/30 text-sm py-3 pl-4 pr-10 focus:border-pink-500 focus:ring-pink-500 shadow-sm cursor-pointer hover:border-pink-500/50 transition-colors text-white font-medium"
                >
                  <option class="bg-[#1a0a2e]" value="relevance">{{ storefrontContent.shop.sort.relevance }}</option>
                  <option class="bg-[#1a0a2e]" value="priceAsc">{{ storefrontContent.shop.sort.priceLowToHigh }}</option>
                  <option class="bg-[#1a0a2e]" value="priceDesc">{{ storefrontContent.shop.sort.priceHighToLow }}</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Icon name="lucide:chevron-down" class="w-4 h-4 text-purple-400" />
                </div>
              </div>
            </div>


             <!-- View Toggle -->
            <div class="hidden sm:flex items-center bg-[#1a0a2e]/90 rounded-full border border-purple-500/30 p-1 shadow-sm">
                <button 
                    class="p-2 rounded-full transition-all"
                    :class="viewMode === 'grid' ? 'bg-pink-500/30 text-pink-400' : 'text-purple-400/60 hover:text-purple-300'"
                    @click="viewMode = 'grid'"
                    :title="storefrontContent.shop.view.gridTitle"
                >
                    <Icon name="lucide:layout-grid" class="w-5 h-5" />
                </button>
                <button 
                    class="p-2 rounded-full transition-all"
                    :class="viewMode === 'list' ? 'bg-pink-500/30 text-pink-400' : 'text-purple-400/60 hover:text-purple-300'"
                    @click="viewMode = 'list'"
                    :title="storefrontContent.shop.view.listTitle"
                >
                    <Icon name="lucide:list" class="w-5 h-5" />
                </button>
            </div>
          </div>

          <!-- Grid -->
          <div
            v-if="filteredProducts.length === 0"
            class="bg-[#1a0a2e]/90 rounded-2xl border border-purple-500/30 shadow-sm p-12 text-center"
          >
            <Icon name="lucide:package-open" class="w-16 h-16 text-purple-500/30 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-white">
              {{ storefrontContent.shop.results.noResults }}
            </h3>
            <p class="text-purple-300/60 mt-1">
              {{ storefrontContent.shop.results.noResultsHint }}
            </p>
            <button
              class="mt-6 px-6 py-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-full hover:from-pink-600 hover:to-orange-600 transition-all font-bold"
              @click="resetFilters"
            >
              {{ storefrontContent.actions.clearAll }}
            </button>
          </div>

          <div
            v-else
            :class="[
                viewMode === 'list' 
                    ? 'flex flex-col gap-4' 
                    : 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-y-10'
            ]"
          >
            <ProductCard
              v-for="product in paginatedProducts"
              :key="product.id"
              :product="product"
              :view-mode="viewMode"
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
          <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="closeQuickView"></div>
          <div class="bg-gradient-to-br from-[#1a0a2e] to-[#0d0515] rounded-2xl shadow-2xl shadow-pink-500/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-10 flex flex-col md:flex-row overflow-hidden border border-pink-500/30">
              <button @click="closeQuickView" class="absolute top-4 right-4 z-20 p-2 bg-purple-900/50 rounded-full hover:bg-pink-500/30 transition-colors">
                  <Icon name="lucide:x" class="w-6 h-6 text-purple-300" />
              </button>
              
              <div class="w-full md:w-1/2 aspect-square md:aspect-auto bg-purple-900/30 relative">
                  <img 
                    :src="quickViewProduct.images && quickViewProduct.images[0] ? quickViewProduct.images[0] : '/blank.svg?v=2'" 
                    class="w-full h-full object-cover"
                  >
                  <!-- Overlay gradient -->
                  <div class="absolute inset-0 bg-gradient-to-t from-[#1a0a2e]/50 to-transparent"></div>
              </div>
              <div class="w-full md:w-1/2 p-8 md:p-12 flex flex-col">
                  <div>
                    <span class="inline-block px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-bold uppercase tracking-widest mb-4 border border-cyan-500/30">{{ storefrontContent.product.inStock }}</span>
                    <h2 class="text-3xl font-bold text-white mb-2">{{ quickViewProduct.title }}</h2>
                    <div class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 mb-6 flex items-center gap-3">
                        {{ formatCurrency(quickViewProduct.price) }}
                    </div>
                    <p class="text-purple-200/70 leading-relaxed mb-8">
                        {{ quickViewProduct.description || storefrontContent.product.descriptionFallback }}
                    </p>
                  </div>

                  <div class="mt-auto space-y-4">
                      <button class="w-full py-4 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold rounded-xl hover:from-pink-600 hover:to-orange-600 transition-all shadow-lg shadow-pink-500/30 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide">
                        <Icon name="lucide:handbag" class="w-5 h-5" />
                        {{ storefrontContent.actions.addToCart }}
                      </button>
                      <NuxtLink :to="`/product/${quickViewProduct.slug}`" class="block w-full py-4 border border-purple-500/50 text-purple-200 font-bold rounded-xl hover:bg-purple-900/30 hover:border-pink-500/50 transition-all text-center" @click="closeQuickView">
                        {{ storefrontContent.product.viewFullDetails }}
                      </NuxtLink>
                  </div>
              </div>
          </div>
      </div>
  </Transition>
</div>
</template>

<style scoped>
.synthwave-shop {
    font-family: 'Inter', system-ui, sans-serif;
}
</style>
