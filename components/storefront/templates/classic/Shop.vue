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

const { currencyCode, format: formatCurrency } = useCurrency()
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
const minPriceInput = ref(0)
const maxPriceInput = ref(200000)

// Quick View State
const isQuickViewOpen = ref(false)
const quickViewProduct = ref<any>(null)
const sidebarProducts = computed(() => props.products.slice(0, 2))

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
        return price >= minPriceInput.value && price <= maxPriceInput.value
    })

    // Sort
    if (sortOption.value === 'priceAsc') {
        result.sort((a, b) => Number(a.price) - Number(b.price))
    } else if (sortOption.value === 'priceDesc') {
        result.sort((a, b) => Number(b.price) - Number(a.price))
    }

    return result
})

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
    minPriceInput.value = 0
    maxPriceInput.value = 200000
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
  <div class="bg-white min-h-screen py-8 lg:py-12 font-serif relative">
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
        class="fixed inset-y-0 right-0 w-[300px] bg-white z-50 shadow-2xl p-6 overflow-y-auto lg:hidden"
      >
        <div class="flex items-center justify-between mb-8">
          <h3 class="font-serif text-slate-900 text-xl font-bold">
            {{ storefrontContent.actions.filters }}
          </h3>
          <button
            class="p-2 -mr-2 text-slate-500 hover:text-slate-900"
            @click="isFilterDrawerOpen = false"
          >
            <Icon name="lucide:x" class="w-6 h-6" />
          </button>
        </div>
            
        <div class="space-y-8">
          <!-- Categories -->
          <div>
            <h4 class="font-bold text-slate-900 mb-4 text-xs uppercase tracking-widest">
              {{ storefrontContent.shop.categories }}
            </h4>
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
                    class="peer h-4 w-4 rounded-none border-slate-300 text-slate-900 focus:ring-0 focus:ring-offset-0 transition-all checked:bg-slate-900 checked:border-transparent" 
                  >
                </div>
                <span class="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{{ cat.title }}</span>
              </label>
            </div>
          </div>
                 
          <!-- Apply Button Mobile -->
          <div class="pt-8 mt-4 sticky bottom-0 bg-white pb-safe">
            <button
              class="w-full py-4 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest active:bg-slate-800 transition-colors"
              @click="isFilterDrawerOpen = false"
            >
              {{ storefrontContent.shop.showResults(filteredProducts.length) }}
            </button>
          </div>
        </div>
      </aside>
    </Transition>

    <!-- Hero Banner Removed -->

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header / Title Section -->
      <div class="mb-12 text-center">
             
        <!-- Specials Pills (Replaced with specific simple links or removed for minimalism. Let's keep a simple tab list) -->
        <div class="flex flex-wrap justify-center gap-6 mt-8 border-b border-slate-100 pb-4">
          <button
            class="text-sm font-bold uppercase tracking-widest pb-2 border-b-2 transition-colors"
            :class="selectedCategories.length === 0 ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'"
            @click="resetFilters"
          >
            {{ storefrontContent.shop.allProducts }}
          </button>
          <!-- Add other tabs if needed -->
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-12">
        <!-- Tablet/Desktop Sidebar Filters (Hidden on Mobile) -->
        <aside class="hidden lg:block w-64 flex-shrink-0 space-y-10 h-fit sticky top-24">
          <!-- Filter Header -->
          <div class="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 class="font-bold text-slate-900 text-xs uppercase tracking-widest">
              {{ storefrontContent.actions.filters }}
            </h3>
            <button
              class="text-xs font-medium text-slate-400 hover:text-slate-900 uppercase tracking-wider transition-colors"
              @click="resetFilters"
            >
              {{ storefrontContent.actions.reset }}
            </button>
          </div>

          <!-- Categories -->
          <div>
            <h4 class="font-serif text-slate-900 mb-4 text-lg">
              {{ storefrontContent.shop.categories }}
            </h4>
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
                    class="peer h-4 w-4 rounded-none border-slate-300 text-slate-900 focus:ring-0 focus:ring-offset-0 transition-all checked:bg-slate-900 checked:border-transparent" 
                  >
                </div>
                <span class="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{{ cat.title }}</span>
              </label>
            </div>
          </div>

          <!-- Price Filter -->
          <div>
            <h4 class="font-serif text-slate-900 mb-4 text-lg">
              {{ storefrontContent.shop.priceRange.label }}
            </h4>
            <div class="flex items-center gap-4">
               <div class="relative w-full">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs rtl:left-auto rtl:right-3">{{ currencyCode }}</span>
                  <input 
                    v-model.number="minPriceInput"
                    type="number" 
                    :placeholder="storefrontContent.shop.priceRange.min"
                    class="w-full bg-white border border-slate-200 rounded-none py-2 pl-8 rtl:pl-2 rtl:pr-8 pr-2 text-sm focus:border-slate-900 focus:ring-0 text-slate-700"
                  >
               </div>
               <span class="text-slate-400">-</span>
               <div class="relative w-full">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs rtl:left-auto rtl:right-3">{{ currencyCode }}</span>
                  <input 
                    v-model.number="maxPriceInput"
                    type="number"
                    :placeholder="storefrontContent.shop.priceRange.max" 
                    class="w-full bg-white border border-slate-200 rounded-none py-2 pl-8 rtl:pl-2 rtl:pr-8 pr-2 text-sm focus:border-slate-900 focus:ring-0 text-slate-700"
                  >
               </div>
            </div>
          </div>

          <!-- Best Sellers Widget -->
          <div class="pt-8 border-t border-slate-200">
            <h4 class="font-bold text-slate-900 mb-6 text-xs uppercase tracking-widest">
              {{ storefrontContent.shop.sidebar.bestSellers }}
            </h4>
            <div class="space-y-6">
              <NuxtLink
                v-for="p in sidebarProducts"
                :key="p.id"
                :to="`/p/${p.slug}`"
                class="flex gap-4 group"
              >
                <div class="w-16 h-20 bg-slate-100 overflow-hidden flex-shrink-0">
                  <img
                    :src="p.images && p.images[0] ? p.images[0] : 'https://placehold.co/100x125'"
                    class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                    :alt="p.title"
                  >
                </div>
                <div class="py-1">
                  <h5 class="text-sm font-serif text-slate-900 line-clamp-2 group-hover:underline decoration-1 underline-offset-4 transition-all">
                    {{ p.title }}
                  </h5>
                  <span class="text-xs font-bold text-slate-500 mt-1 block">{{ formatCurrency(p.price) }}</span>
                </div>
              </NuxtLink>
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <div class="flex-1">
          <!-- Active Filters Chips -->
          <div v-if="selectedCategories.length > 0" class="flex flex-wrap gap-2 mb-8">
              <div 
                v-for="catId in selectedCategories" 
                :key="catId"
                class="flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-900 text-xs uppercase tracking-wider font-bold"
              >
                  <span>{{ filters.categories.find(c => c.id === catId)?.title || storefrontContent.shop.categoryFallback }}</span>
                  <button @click="removeCategory(catId)" class="hover:text-slate-600">
                      <Icon name="lucide:x" class="w-3 h-3" />
                  </button>
              </div>
              <button @click="resetFilters" class="text-xs text-slate-500 hover:text-slate-900 uppercase tracking-wider underline underline-offset-2">
                  {{ storefrontContent.actions.clearAll }}
              </button>
          </div>
          <!-- Toolbar -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <!-- Mobile Filter Toggle (Visible only on mobile) -->
            <button
              class="w-full sm:hidden flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-900 font-bold uppercase tracking-wider text-xs shadow-sm"
              @click="isFilterDrawerOpen = true"
            >
              <Icon name="lucide:sliders-horizontal" class="w-4 h-4" />
              {{ storefrontContent.shop.filtersAndSort }}
            </button>

            <!-- Search in results -->
            <div class="relative max-w-xs w-full">
              <input 
                v-model="searchQuery" 
                type="text"
                :placeholder="storefrontContent.shop.searchWithinResultsPlaceholder" 
                class="w-full bg-transparent border-b border-slate-300 text-slate-900 text-sm focus:border-slate-900 focus:ring-0 block px-0 py-2 placeholder-slate-400" 
              >
              <div class="absolute inset-y-0 right-0 flex items-center pointer-events-none">
                <Icon name="lucide:search" class="w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div class="flex items-center gap-6 w-full sm:w-auto">
                <!-- Sort Dropdown -->
                <div class="relative">
                  <select
                    v-model="sortOption"
                    class="appearance-none bg-transparent border-none text-sm py-2 pr-6 pl-0 focus:ring-0 cursor-pointer text-slate-700 font-medium hover:text-slate-900 transition-colors"
                  >
                    <option value="relevance">{{ storefrontContent.shop.sort.relevance }}</option>
                    <option value="priceAsc">{{ storefrontContent.shop.sort.priceLowToHigh }}</option>
                    <option value="priceDesc">{{ storefrontContent.shop.sort.priceHighToLow }}</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center pointer-events-none">
                    <Icon name="lucide:chevron-down" class="w-3 h-3 text-slate-500" />
                  </div>
                </div>

                 <!-- View Toggle -->
                <div class="hidden sm:flex items-center gap-1">
                    <button 
                        class="p-2 transition-all"
                        :class="viewMode === 'grid' ? 'text-slate-900' : 'text-slate-300 hover:text-slate-500'"
                        @click="viewMode = 'grid'"
                        :title="storefrontContent.shop.view.gridTitle"
                    >
                        <Icon name="lucide:layout-grid" class="w-5 h-5" />
                    </button>
                    <button 
                        class="p-2 transition-all"
                        :class="viewMode === 'list' ? 'text-slate-900' : 'text-slate-300 hover:text-slate-500'"
                        @click="viewMode = 'list'"
                        :title="storefrontContent.shop.view.listTitle"
                    >
                        <Icon name="lucide:list" class="w-5 h-5" />
                    </button>
                </div>
            </div>
          </div>

          <!-- Grid -->
          <div
            v-if="filteredProducts.length === 0"
            class="bg-gray-50 border border-slate-100 p-12 text-center"
          >
            <Icon name="lucide:package-open" class="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 class="text-lg font-serif text-slate-900">
              {{ storefrontContent.shop.results.noResults }}
            </h3>
            <p class="text-slate-500 mt-2 text-sm">
              {{ storefrontContent.shop.results.noResultsHint }}
            </p>
            <button
              class="mt-6 px-8 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
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
                    : 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-y-12'
            ]"
          >
            <ProductCard
              v-for="product in filteredProducts"
              :key="product.id"
              :product="product"
              :view-mode="viewMode"
              @quick-view="openQuickView"
            />
          </div>

                  
          <!-- Pagination Mock -->
          <div class="mt-20 flex justify-center border-t border-slate-100 pt-8">
            <nav class="flex items-center gap-4">
              <button
                class="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-colors"
                disabled
              >
                <Icon name="lucide:arrow-left" class="w-4 h-4" />
                Prev
              </button>
                          
              <div class="flex items-center gap-2">
                <button class="w-8 h-8 flex items-center justify-center bg-slate-900 text-white font-bold text-xs">
                  1
                </button>
                <button class="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 font-medium text-xs transition-colors">
                  2
                </button>
                <button class="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 font-medium text-xs transition-colors">
                  3
                </button>
                <span class="text-slate-400">...</span>
                <button class="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 font-medium text-xs transition-colors">
                  16
                </button>
              </div>

              <button class="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-900 hover:text-slate-600 transition-colors">
                Next
                <Icon name="lucide:arrow-right" class="w-4 h-4" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Quick View Modal -->
  <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
  >
      <div v-if="isQuickViewOpen && quickViewProduct" class="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-8">
          <div class="absolute inset-0 bg-white/90 backdrop-blur-md" @click="closeQuickView"></div>
          <div class="bg-white w-full max-w-5xl h-full md:h-auto max-h-screen md:max-h-[90vh] overflow-y-auto relative z-10 flex flex-col md:flex-row shadow-2xl">
              <button @click="closeQuickView" class="absolute top-6 right-6 z-20 p-2 text-slate-500 hover:text-slate-900 transition-colors">
                  <Icon name="lucide:x" class="w-8 h-8" />
              </button>
              
              <div class="w-full md:w-1/2 bg-gray-100 relative min-h-[40vh]">
                  <img 
                    :src="quickViewProduct.images && quickViewProduct.images[0] ? quickViewProduct.images[0] : 'https://placehold.co/600x600'" 
                    class="absolute inset-0 w-full h-full object-cover"
                  >
              </div>
              <div class="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center">
                  <div>
                    <span class="inline-block px-3 py-1 bg-slate-100 text-slate-900 text-[10px] font-bold uppercase tracking-widest mb-6">{{ storefrontContent.product.inStock }}</span>
                    <h2 class="text-3xl md:text-4xl font-serif text-slate-900 mb-4">{{ quickViewProduct.title }}</h2>
                    <div class="text-2xl text-slate-900 mb-8 font-light">
                        {{ formatCurrency(quickViewProduct.price) }}
                    </div>
                    <p class="text-slate-600 leading-relaxed mb-10 font-light">
                        {{ quickViewProduct.description || storefrontContent.product.descriptionFallback }}
                    </p>
                  </div>

                  <div class="mt-auto space-y-4 max-w-sm">
                      <button class="w-full py-4 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors">
                        {{ storefrontContent.actions.addToCart }}
                      </button>
                      <NuxtLink :to="`/p/${quickViewProduct.slug}`" class="block w-full py-4 border border-slate-200 text-slate-900 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors text-center" @click="closeQuickView">
                        {{ storefrontContent.product.viewFullDetails }}
                      </NuxtLink>
                  </div>
              </div>
          </div>
      </div>
  </Transition>
</template>
