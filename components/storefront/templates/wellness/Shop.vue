<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/wellness/ProductCard.vue'

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
const minPriceInput = ref<number | null>(null)
const maxPriceInput = ref<number | null>(null)

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
        const minMatches = minPriceInput.value === null || minPriceInput.value === '' ? true : price >= Number(minPriceInput.value)
        const maxMatches = maxPriceInput.value === null || maxPriceInput.value === '' ? true : price <= Number(maxPriceInput.value)
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
  <div class="min-h-screen bg-stone-50 py-8 lg:py-12 font-wellness relative text-stone-700">
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
        class="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 lg:hidden"
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
        class="fixed inset-y-0 right-0 w-[320px] bg-stone-50 z-50 shadow-2xl p-8 overflow-y-auto lg:hidden border-l border-stone-100"
      >
        <div class="flex items-center justify-between mb-8">
          <h3 class="font-bold text-stone-900 text-xl font-wellness">
            {{ storefrontContent.actions.filters }}
          </h3>
          <button
            class="p-2 -mr-2 text-stone-400 hover:text-stone-900 transition-colors"
            @click="isFilterDrawerOpen = false"
          >
            <Icon name="lucide:x" class="w-6 h-6" />
          </button>
        </div>
            
        <div class="space-y-10">
          <!-- Categories -->
          <div>
            <h4 class="font-bold text-stone-900 mb-5 text-sm uppercase tracking-widest font-wellness">
              Categories
            </h4>
            <div class="space-y-4">
              <label
                v-for="cat in filters.categories"
                :key="cat.id"
                class="flex items-center gap-4 cursor-pointer group select-none"
              >
                <div class="relative flex items-center">
                  <input 
                    v-model="selectedCategories" 
                    type="checkbox"
                    :value="cat.id"
                    class="peer h-5 w-5 rounded-md border-stone-300 text-stone-800 focus:ring-stone-500 transition-all checked:bg-stone-800 checked:border-transparent bg-white" 
                  >
                </div>
                <span class="text-base text-stone-600 group-hover:text-stone-900 transition-colors font-medium">{{ cat.title }}</span>
              </label>
            </div>
          </div>

          <!-- Apply Button Mobile -->
          <div class="pt-8 mt-4 sticky bottom-0 pb-safe">
            <button
              class="w-full py-4 bg-stone-900 text-white font-bold rounded-full shadow-lg hover:bg-stone-800 active:scale-95 transition-all text-base"
              @click="isFilterDrawerOpen = false"
            >
              {{ storefrontContent.shop.showResults(filteredProducts.length) }}
            </button>
          </div>
        </div>
      </aside>
    </Transition>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header / Title Section -->
      <div class="mb-8 lg:mb-12">
        <h1 class="text-4xl lg:text-5xl font-bold text-stone-900 font-wellness mb-4 tracking-tight">
          Shop Collection
        </h1>
        <p class="text-lg text-stone-500 max-w-2xl font-light">
          Curated essentials for your daily rituals and wellbeing.
        </p>

        <!-- Specials Pills -->
        <div class="flex flex-wrap gap-3 mt-8 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
          <button
            class="px-6 py-2.5 rounded-full bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors shadow-sm whitespace-nowrap"
            @click="resetFilters"
          >
            {{ storefrontContent.shop.allProducts }}
          </button>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-12">
        <!-- Tablet/Desktop Sidebar Filters -->
        <aside class="hidden lg:block w-72 flex-shrink-0 space-y-10 sticky top-32 h-fit">
          <div class="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm">
            <!-- Filter Header -->
            <div class="flex items-center justify-between mb-8 border-b border-stone-100 pb-6">
              <h3 class="font-bold text-stone-900 text-xl font-wellness">
                {{ storefrontContent.actions.filters }}
              </h3>
              <button
                class="text-xs font-bold text-stone-500 hover:text-stone-900 uppercase tracking-widest transition-colors"
                @click="resetFilters"
              >
                {{ storefrontContent.actions.reset }}
              </button>
            </div>

            <div class="space-y-10">
              <!-- Categories -->
              <div>
                <h4 class="font-bold text-stone-900 mb-5 text-xs uppercase tracking-widest font-wellness">
                  Categories
                </h4>
                <div class="space-y-3.5">
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
                        class="peer h-4 w-4 rounded border-stone-300 text-stone-800 focus:ring-stone-500 transition-all checked:bg-stone-800 checked:border-transparent bg-stone-50" 
                      >
                    </div>
                    <span class="text-sm text-stone-600 group-hover:text-stone-900 transition-colors font-medium">{{ cat.title }}</span>
                  </label>
                </div>
              </div>

              <!-- Price Filter -->
              <div>
                <h4 class="font-bold text-stone-900 mb-5 text-xs uppercase tracking-widest font-wellness">
                  {{ storefrontContent.shop.priceRange.label }}
                </h4>
                <div class="flex items-center gap-3">
                   <div class="relative w-full">
                      <span class="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-medium rtl:left-auto rtl:right-4">{{ currencyCode }}</span>
                      <input 
                        v-model.number="minPriceInput"
                        type="number" 
                        :placeholder="storefrontContent.shop.priceRange.min"
                        class="w-full bg-stone-50 border border-stone-200 rounded-2xl py-2.5 pl-8 rtl:pl-3 rtl:pr-8 pr-3 text-sm focus:ring-stone-500 focus:border-stone-500 text-stone-700 placeholder:text-stone-300 outline-none transition-all"
                      >
                   </div>
                   <span class="text-stone-300">-</span>
                   <div class="relative w-full">
                      <span class="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-medium rtl:left-auto rtl:right-4">{{ currencyCode }}</span>
                      <input 
                        v-model.number="maxPriceInput"
                        type="number"
                        :placeholder="storefrontContent.shop.priceRange.max" 
                        class="w-full bg-stone-50 border border-stone-200 rounded-2xl py-2.5 pl-8 rtl:pl-3 rtl:pr-8 pr-3 text-sm focus:ring-stone-500 focus:border-stone-500 text-stone-700 placeholder:text-stone-300 outline-none transition-all"
                      >
                   </div>
                </div>
                <!-- Simple Range Slider Visual Placeholder -->
                 <div class="mt-6 relative h-1 bg-stone-100 rounded-full">
                     <div class="absolute left-0 top-0 h-full bg-stone-300 rounded-full" style="width: 100%"></div>
                     <div class="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-stone-400 rounded-full shadow-sm cursor-pointer hover:scale-110 transition-transform"></div>
                     <div class="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-stone-400 rounded-full shadow-sm cursor-pointer hover:scale-110 transition-transform"></div>
                 </div>
              </div>
            </div>
          </div>

          <!-- Best Sellers Widget -->
          <div class="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm">
             <h4 class="font-bold text-stone-900 mb-6 text-xs uppercase tracking-widest font-wellness">
               {{ storefrontContent.shop.sidebar.bestSellers }}
             </h4>
             <div class="space-y-6">
                <NuxtLink
                  v-for="p in sidebarProducts"
                  :key="p.id"
                  :to="`/p/${p.slug}`"
                  class="flex gap-4 group"
                >
                  <div class="w-16 h-16 bg-stone-100 rounded-2xl overflow-hidden flex-shrink-0 border border-stone-50">
                    <img
                      :src="p.images && p.images[0] ? p.images[0] : 'https://placehold.co/100x100'"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      :alt="p.title"
                    >
                  </div>
                  <div class="py-1">
                    <h5 class="text-sm font-bold text-stone-900 line-clamp-2 group-hover:text-amber-700 transition-colors font-wellness leading-snug mb-1">
                      {{ p.title }}
                    </h5>
                    <span class="text-xs font-semibold text-stone-500">{{ formatCurrency(p.price) }}</span>
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
                class="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-full text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5"
              >
                  <span>{{ filters.categories.find(c => c.id === catId)?.title || storefrontContent.shop.categoryFallback }}</span>
                  <button @click="removeCategory(catId)" class="hover:text-stone-300 transition-colors">
                      <Icon name="lucide:x" class="w-3.5 h-3.5" />
                  </button>
              </div>
              <button @click="resetFilters" class="px-3 py-2 text-sm text-stone-500 hover:text-stone-900 transition-colors underline-offset-4 hover:underline font-medium">
                  {{ storefrontContent.actions.clearAll }}
              </button>
          </div>
          <!-- Toolbar -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <!-- Mobile Filter Toggle -->
            <button
              class="w-full sm:hidden flex items-center justify-center gap-2 px-6 py-4 bg-white border border-stone-200 rounded-[2rem] text-stone-900 font-bold shadow-sm active:scale-95 transition-all text-sm uppercase tracking-wide"
              @click="isFilterDrawerOpen = true"
            >
              <Icon name="lucide:sliders-horizontal" class="w-4 h-4" />
              {{ storefrontContent.shop.filtersAndSort }}
            </button>

            <!-- Search in results -->
            <div class="relative max-w-md w-full">
              <input 
                v-model="searchQuery" 
                type="text"
                :placeholder="storefrontContent.shop.searchWithinResultsPlaceholder" 
                class="w-full bg-white border border-stone-200 text-stone-900 text-sm rounded-full focus:ring-2 focus:ring-stone-100 focus:border-stone-400 block pl-12 rtl:pl-6 rtl:pr-12 pr-6 py-3.5 shadow-sm transition-all hover:bg-stone-50 placeholder:text-stone-400" 
              >
              <div class="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-4 rtl:pl-0 rtl:pr-4 pointer-events-none">
                <Icon name="lucide:search" class="w-5 h-5 text-stone-400" />
              </div>
            </div>

            <!-- Sort Dropdown -->
            <div class="hidden sm:flex items-center gap-4 w-full sm:w-auto">
              <span class="text-sm text-stone-500 whitespace-nowrap font-medium">{{ storefrontContent.shop.sortBy }}</span>
              <div class="relative w-full sm:w-56">
                <select
                  v-model="sortOption"
                  class="w-full appearance-none bg-white rounded-full border border-stone-200 text-sm py-3.5 pl-6 pr-12 focus:border-stone-400 focus:ring-stone-100 shadow-sm cursor-pointer hover:bg-stone-50 transition-colors text-stone-800 font-medium outline-none"
                >
                  <option value="relevance">{{ storefrontContent.shop.sort.relevance }}</option>
                  <option value="priceAsc">{{ storefrontContent.shop.sort.priceLowToHigh }}</option>
                  <option value="priceDesc">{{ storefrontContent.shop.sort.priceHighToLow }}</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <Icon name="lucide:chevron-down" class="w-4 h-4 text-stone-400" />
                </div>
              </div>
            </div>

             <!-- View Toggle -->
            <div class="hidden sm:flex items-center bg-white rounded-full border border-stone-200 p-1.5 shadow-sm gap-1">
                <button 
                    class="p-2.5 rounded-full transition-all duration-300"
                    :class="viewMode === 'grid' ? 'bg-stone-100 text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'"
                    @click="viewMode = 'grid'"
                    :title="storefrontContent.shop.view.gridTitle"
                >
                    <Icon name="lucide:layout-grid" class="w-4 h-4" />
                </button>
                <button 
                    class="p-2.5 rounded-full transition-all duration-300"
                    :class="viewMode === 'list' ? 'bg-stone-100 text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'"
                    @click="viewMode = 'list'"
                    :title="storefrontContent.shop.view.listTitle"
                >
                    <Icon name="lucide:list" class="w-4 h-4" />
                </button>
            </div>
          </div>

          <!-- Grid -->
          <div
            v-if="filteredProducts.length === 0"
            class="bg-white rounded-[2.5rem] border border-stone-100 shadow-sm p-16 text-center"
          >
            <div class="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="lucide:package-open" class="w-8 h-8 text-stone-300" />
            </div>
            <h3 class="text-xl font-bold text-stone-900 font-wellness mb-2">
              {{ storefrontContent.shop.results.noResults }}
            </h3>
            <p class="text-stone-500 max-w-sm mx-auto">
              {{ storefrontContent.shop.results.noResultsHint }}
            </p>
            <button
              class="mt-8 px-8 py-3 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-colors font-medium shadow-md hover:-translate-y-0.5 duration-300"
              @click="resetFilters"
            >
              {{ storefrontContent.actions.clearAll }}
            </button>
          </div>

          <div
            v-else
            :class="[
                viewMode === 'list' 
                    ? 'flex flex-col gap-6' 
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
          <div class="mt-20 flex justify-center">
            <nav class="flex items-center gap-3 p-2 bg-white rounded-full border border-stone-100 shadow-sm">
              <button
                class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-50 text-stone-400 disabled:opacity-30 transition-colors"
                disabled
              >
                <Icon name="lucide:chevron-left" class="w-5 h-5" />
              </button>
                          
              <div class="flex items-center px-2 gap-2">
                <button class="w-10 h-10 rounded-full bg-stone-900 text-white font-bold text-sm shadow-md">
                  1
                </button>
                <button class="w-10 h-10 rounded-full hover:bg-stone-50 text-stone-600 font-medium text-sm transition-colors">
                  2
                </button>
                <button class="w-10 h-10 rounded-full hover:bg-stone-50 text-stone-600 font-medium text-sm transition-colors">
                  3
                </button>
                <span class="text-stone-300 px-1 font-serif">...</span>
                <button class="w-10 h-10 rounded-full hover:bg-stone-50 text-stone-600 font-medium text-sm transition-colors">
                  16
                </button>
              </div>

              <button class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-50 text-stone-600 hover:text-stone-900 transition-colors">
                <Icon name="lucide:chevron-right" class="w-5 h-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Quick View Modal -->
  <Transition
      enter-active-class="transition duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
  >
      <div v-if="isQuickViewOpen && quickViewProduct" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-stone-900/40 backdrop-blur-md" @click="closeQuickView"></div>
          <div class="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-10 flex flex-col md:flex-row overflow-hidden border border-stone-100">
              <button @click="closeQuickView" class="absolute top-6 right-6 z-20 p-2 bg-white/80 backdrop-blur rounded-full hover:bg-white transition-colors shadow-sm text-stone-500 hover:text-stone-900">
                  <Icon name="lucide:x" class="w-5 h-5" />
              </button>
              
              <div class="w-full md:w-1/2 aspect-square md:aspect-auto bg-stone-50 relative">
                  <img 
                    :src="quickViewProduct.images && quickViewProduct.images[0] ? quickViewProduct.images[0] : 'https://placehold.co/600x600'" 
                    class="w-full h-full object-cover"
                  >
              </div>
              <div class="w-full md:w-1/2 p-10 md:p-14 flex flex-col">
                  <div>
                    <span class="inline-block px-4 py-1.5 bg-brand-50 text-brand-700 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-brand-100">{{ storefrontContent.product.inStock }}</span>
                    <h2 class="text-3xl md:text-4xl font-bold text-stone-900 mb-3 font-wellness">{{ quickViewProduct.title }}</h2>
                    <div class="text-2xl font-medium text-stone-600 mb-8 flex items-center gap-3 font-wellness">
                        {{ formatCurrency(quickViewProduct.price) }}
                    </div>
                    <p class="text-stone-600 leading-relaxed mb-10 font-light text-lg">
                        {{ quickViewProduct.description || storefrontContent.product.descriptionFallback }}
                    </p>
                  </div>

                  <div class="mt-auto space-y-4">
                      <button class="w-full py-5 bg-stone-900 text-white font-bold rounded-full hover:bg-stone-800 transition-colors shadow-xl shadow-stone-200 active:scale-95 flex items-center justify-center gap-3 text-lg">
                        <Icon name="lucide:shopping-bag" class="w-5 h-5" />
                        {{ storefrontContent.actions.addToCart }}
                      </button>
                      <NuxtLink :to="`/p/${quickViewProduct.slug}`" class="block w-full py-5 border border-stone-200 text-stone-700 font-bold rounded-full hover:bg-stone-50 transition-colors text-center" @click="closeQuickView">
                        {{ storefrontContent.product.viewFullDetails }}
                      </NuxtLink>
                  </div>
              </div>
          </div>
      </div>
  </Transition>
</template>
