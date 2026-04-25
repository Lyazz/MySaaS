<script setup lang="ts">
import ProductCard from './ProductCard.vue'

const props = defineProps<{
    products: any[]
}>()

// Fetch dynamic categories for filters
const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: categoryData } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders(),
    lazy: true // Non-blocking
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
  <div class="bg-[#f8faf9] min-h-screen py-8 lg:py-16 font-sans relative selection:bg-brand-100 selection:text-brand-900">
    <!-- Decorative Background Elements -->
    <div class="absolute top-0 left-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl opacity-60 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
    <div class="absolute bottom-0 right-0 w-96 h-96 bg-lime-50 rounded-full blur-3xl opacity-60 translate-x-1/3 translate-y-1/3 pointer-events-none" />

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
        class="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-40 lg:hidden"
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
        class="fixed inset-y-0 right-0 w-[320px] bg-[#f8faf9] z-50 shadow-2xl p-6 overflow-y-auto lg:hidden border-l border-stone-200"
      >
        <div class="flex items-center justify-between mb-8">
          <h3 class="font-bold text-stone-900 text-2xl">
            Filters
          </h3>
          <button
            class="p-2 -mr-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
            @click="isFilterDrawerOpen = false"
          >
            <Icon name="lucide:x" class="w-6 h-6" />
          </button>
        </div>
            
        <div class="space-y-8">
          <!-- Categories -->
          <div>
            <h4 class="font-bold text-brand-600 mb-4 text-xs uppercase tracking-widest border-b border-brand-200 pb-2">
              Categories
            </h4>
            <div class="space-y-3">
              <label
                v-for="cat in filters.categories"
                :key="cat.id"
                class="flex items-center gap-3 cursor-pointer group select-none hover:bg-white p-2 rounded-lg transition-colors border border-transparent hover:border-brand-100 hover:shadow-sm"
              >
                <div class="relative flex items-center">
                  <input 
                    v-model="selectedCategories" 
                    type="checkbox"
                    :value="cat.id"
                    class="peer h-5 w-5 rounded border-stone-300 text-brand-600 focus:ring-brand-500 transition-all checked:bg-brand-600 checked:border-transparent" 
                  >
                </div>
                <span class="text-base text-stone-700 font-medium group-hover:text-brand-700 transition-colors">{{ categoryDisplayTitle(cat) }}</span>
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
          <div class="pt-8 mt-4 sticky bottom-0 bg-[#fffbf2] pb-safe border-t border-dashed border-stone-300">
            <button
              class="w-full py-4 bg-stone-900 text-white font-bold rounded-[2rem] shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
              @click="isFilterDrawerOpen = false"
            >
              {{ storefrontContent.shop.showResults(filteredProducts.length) }}
            </button>
          </div>
        </div>
      </aside>
    </Transition>

    <!-- Header / Title Section -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 mb-12">
        <!-- Header Removed -->
        <div class="text-center max-w-2xl mx-auto">
        </div>

        <!-- Specials Pills -->
        <div class="flex flex-wrap justify-center gap-3 mt-8">
            <button
            class="px-6 py-2.5 rounded-full bg-stone-900 text-white text-sm font-bold shadow-md hover:bg-brand-600 hover:scale-105 transition-all"
            @click="resetFilters"
            >
            {{ storefrontContent.shop.allProducts }}
          </button>
             <!-- Placeholder for future dynamic pills -->
        </div>
    </div>


    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div class="flex flex-col lg:flex-row gap-12 items-start">
        
        <!-- Ticket Sidebar (Desktop) -->
        <aside class="hidden lg:block w-72 flex-shrink-0 sticky top-32 max-h-[calc(100vh-9rem)] overflow-y-auto pr-2 custom-scrollbar">
            <div class="bg-white p-8 rounded-xl shadow-sm relative border border-stone-200">
                 
                 <div class="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
                    <h3 class="font-bold text-stone-900 text-xl tracking-tight">
                        Filters
                    </h3>
                    <button
                        class="text-[10px] font-bold text-brand-600 hover:text-brand-800 uppercase tracking-widest bg-brand-50 px-2 py-1 rounded hover:bg-brand-100 transition-colors"
                        @click="resetFilters"
                    >
                        {{ storefrontContent.actions.reset }}
                    </button>
                </div>

                <!-- Categories -->
                <div class="mb-8">
                    <h4 class="font-bold text-stone-400 mb-4 text-xs uppercase tracking-widest">
                    {{ storefrontContent.shop.categories }}
                    </h4>
                    <div class="space-y-2">
                    <label
                        v-for="cat in filters.categories"
                        :key="cat.id"
                        class="flex items-center gap-3 cursor-pointer group select-none py-2 hover:translate-x-1 transition-transform"
                    >
                        <div class="relative flex items-center">
                        <input 
                            v-model="selectedCategories" 
                            type="checkbox"
                            :value="cat.id"
                            class="peer h-4 w-4 rounded-md border-stone-400 text-stone-900 focus:ring-stone-500 transition-all checked:bg-stone-900 checked:border-transparent" 
                        >
                        </div>
                        <span class="text-sm font-medium text-stone-600 group-hover:text-stone-900 transition-colors">{{ categoryDisplayTitle(cat) }}</span>
                    </label>
                    </div>
                </div>

                <!-- Price Filter -->
                <div>
                    <h4 class="font-bold text-stone-400 mb-4 text-xs uppercase tracking-widest">
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
            </div>
        </aside>

        <!-- Main Grid -->
        <div class="flex-1">
          <!-- Toolbar -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm border border-stone-100">
            <!-- Mobile Filter Toggle -->
            <button
              class="w-full sm:hidden flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 rounded-lg text-stone-900 font-bold shadow-sm active:scale-95 transition-all"
              @click="isFilterDrawerOpen = true"
            >
              <Icon name="lucide:sliders-horizontal" class="w-5 h-5" />
              Filters
            </button>

            <!-- Search -->
            <div class="relative max-w-sm w-full">
              <input 
                v-model="searchQuery" 
                type="text"
                :placeholder="storefrontContent.shop.searchPlaceholder" 
                class="w-full bg-stone-50 border-none text-stone-900 text-sm rounded-lg focus:ring-2 focus:ring-brand-200 block pl-10 rtl:pl-3 rtl:pr-10 h-11 transition-all hover:bg-stone-100 placeholder-stone-400 font-medium" 
              >
              <div class="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 pointer-events-none">
                <Icon name="lucide:search" class="w-5 h-5 text-stone-400" />
              </div>
            </div>

            <!-- Sort & View -->
            <div class="hidden sm:flex items-center gap-4 w-full sm:w-auto">
              <div class="relative w-full sm:w-48">
                <select
                  v-model="sortOption"
                  class="w-full appearance-none bg-transparent text-sm py-2 pl-2 pr-8 cursor-pointer text-stone-600 font-bold hover:text-stone-900 focus:ring-0 border-none text-right"
                >
                  <option value="relevance">{{ storefrontContent.shop.sort.relevance }}</option>
                  <option value="priceAsc">{{ storefrontContent.shop.sort.priceLowToHigh }}</option>
                  <option value="priceDesc">{{ storefrontContent.shop.sort.priceHighToLow }}</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <Icon name="lucide:chevron-down" class="w-4 h-4 text-stone-500" />
                </div>
              </div>

               <div class="h-6 w-px bg-stone-200"></div>

               <!-- View Toggle -->
                <div class="flex items-center gap-1">
                    <button 
                        class="p-2 rounded-md transition-all"
                        :class="viewMode === 'grid' ? 'bg-stone-100 text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'"
                        @click="viewMode = 'grid'"
                        :title="storefrontContent.shop.view.gridTitle"
                    >
                        <Icon name="lucide:layout-grid" class="w-5 h-5" />
                    </button>
                    <button 
                        class="p-2 rounded-md transition-all"
                        :class="viewMode === 'list' ? 'bg-stone-100 text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'"
                        @click="viewMode = 'list'"
                        :title="storefrontContent.shop.view.listTitle"
                    >
                        <Icon name="lucide:list" class="w-5 h-5" />
                    </button>
                </div>
            </div>
          </div>
          
           <!-- Active Filters Chips -->
          <div v-if="selectedCategories.length > 0" class="flex flex-wrap gap-2 mb-8 ml-2">
              <div 
                v-for="catId in selectedCategories" 
                :key="catId"
                class="flex items-center gap-2 px-3 py-1 bg-white text-stone-600 rounded-full text-sm font-medium border border-stone-200 shadow-sm"
              >
                  <span class="w-2 h-2 rounded-full bg-brand-500"></span>
                  <span>{{ categoryDisplayTitle(filters.categories.find(c => c.id === catId)) }}</span>
                  <button @click="removeCategory(catId)" class="hover:text-red-500 ml-1">
                      <Icon name="lucide:x" class="w-3.5 h-3.5" />
                  </button>
              </div>
              <button @click="resetFilters" class="text-sm font-bold text-stone-400 hover:text-stone-600 underline underline-offset-4 px-2 decoration-2 decoration-brand-200">
                  {{ storefrontContent.actions.clearAll }}
              </button>
          </div>

          <!-- Empty State -->
          <div
            v-if="filteredProducts.length === 0"
            class="bg-white rounded-2xl border border-stone-100 shadow-sm p-16 text-center"
          >
            <div class="w-24 h-24 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Icon name="lucide:search-x" class="w-10 h-10 text-stone-300" />
            </div>
            <h3 class="text-2xl font-bold text-stone-900 mb-2">
              {{ storefrontContent.shop.results.noResults }}
            </h3>
            <p class="text-stone-500 max-w-xs mx-auto mb-8">
              {{ storefrontContent.shop.results.noResultsHint }}
            </p>
            <button
              class="px-8 py-3 bg-stone-900 text-white font-bold rounded-full hover:bg-brand-600 transition-colors shadow-lg"
              @click="resetFilters"
            >
              {{ storefrontContent.actions.clearAll }}
            </button>
          </div>

          <!-- Product Grid -->
          <div
            v-else
            :class="[
                viewMode === 'list' 
                    ? 'flex flex-col gap-6' 
                    : 'grid grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8'
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
  </div>

  <!-- Quick View Modal (Styled) -->
  <Transition
      enter-active-class="transition duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
      enter-from-class="opacity-0 translate-y-10 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-10 scale-95"
  >
      <div v-if="isQuickViewOpen && quickViewProduct" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-stone-900/40 backdrop-blur-md" @click="closeQuickView"></div>
          <div class="bg-white rounded-[3rem] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative z-10 flex flex-col md:flex-row overflow-hidden border-8 border-white">
              <button @click="closeQuickView" class="absolute top-6 right-6 z-20 p-2 bg-white rounded-full hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-all shadow-sm">
                  <Icon name="lucide:x" class="w-6 h-6" />
              </button>
              
              <!-- Image Side -->
              <div class="w-full md:w-1/2 bg-stone-100 relative group overflow-hidden">
                  <img 
                    :src="quickViewProduct.images && quickViewProduct.images[0] ? quickViewProduct.images[0] : '/blank.svg?v=2'" 
                    class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  >
                   <div class="absolute bottom-6 left-6 rtl:left-auto rtl:right-6 inline-block px-4 py-2 bg-white/90 backdrop-blur rounded-full text-xs font-bold uppercase tracking-widest text-brand-700 shadow-lg">
                        {{ storefrontContent.product.inStock }}
                   </div>
              </div>

              <!-- Content Side -->
              <div class="w-full md:w-1/2 p-10 md:p-14 flex flex-col items-start text-left">
                  <div class="w-12 h-1 bg-brand-500 mb-8 rounded-full"></div>
                  
                  <h2 class="text-4xl md:text-5xl font-bold text-stone-900 mb-4 leading-tight">{{ quickViewProduct.title }}</h2>
                  
                  <div class="flex items-baseline gap-2 mb-8">
                     <span class="text-3xl font-bold text-stone-900">{{ formatCurrency(quickViewProduct.price) }}</span>
                     <span class="text-sm text-stone-400 font-medium">{{ storefrontContent.product.perUnit }}</span>
                  </div>

                  <p class="text-stone-600 leading-relaxed text-lg mb-10 font-medium opacity-80">
                      {{ quickViewProduct.description || storefrontContent.product.descriptionFallback }}
                  </p>

                  <div class="mt-auto w-full space-y-4">
                      <button class="w-full py-5 bg-stone-900 text-white text-lg font-bold rounded-[2rem] hover:bg-brand-600 transition-colors shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center gap-3">
                        <Icon name="lucide:shopping-basket" class="w-6 h-6" />
                        {{ storefrontContent.actions.addToCart }}
                      </button>
                      <NuxtLink :to="`/product/${quickViewProduct.slug}`" class="block w-full py-4 text-stone-500 font-bold hover:text-brand-600 transition-colors text-center text-sm uppercase tracking-widest" @click="closeQuickView">
                        View Product Details
                      </NuxtLink>
                  </div>
              </div>
          </div>
      </div>
  </Transition>
</template>

<style scoped>
.ticket-border {
    position: relative;
    /* This simulates the jagged edge if we wanted it via mask or clip-path, but border-dashed is surprisingly effective for a 'ticket' look */
}
</style>
