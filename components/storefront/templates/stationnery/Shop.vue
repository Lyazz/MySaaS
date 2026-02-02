<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/stationnery/ProductCard.vue'

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

// Dynamic Filters
const filters = computed(() => ({
    categories: categoryData.value || [],
}))

// Filtering Logic
const selectedCategories = ref<string[]>([])
const searchQuery = ref('')
const sortOption = ref('Relevance')
const viewMode = ref<'grid' | 'list'>('grid')

// Price Range State
const priceRange = ref({ min: 0, max: 200000 })
const minPriceInput = ref(0)
const maxPriceInput = ref(200000)

// Quick View State
const isQuickViewOpen = ref(false)
const quickViewProduct = ref<any>(null)

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
    if (sortOption.value === 'Price: Low to High') {
        result.sort((a, b) => Number(a.price) - Number(b.price))
    } else if (sortOption.value === 'Price: High to Low') {
        result.sort((a, b) => Number(a.price) - Number(a.price))
    }

    return result
})

const pageTitle = computed(() => {
    if (selectedCategories.value.length === 1) {
        const cat = filters.value.categories.find(c => c.id === selectedCategories.value[0])
        return cat ? cat.title : 'Full Catalog'
    }
    if (selectedCategories.value.length > 1) {
        return 'Filtered Products'
    }
    return 'Full Catalog'
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
    sortOption.value = 'Relevance'
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
  <div class="bg-[#fdfbf7] min-h-screen py-8 lg:py-12 font-stationery relative">
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
        class="fixed inset-y-0 right-0 w-[300px] bg-[#fdfbf7] z-50 shadow-2xl p-6 overflow-y-auto lg:hidden"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-bold text-slate-900 text-lg">
            Filters
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
            <h4 class="font-bold text-slate-900 mb-4 text-xs uppercase tracking-wider">
              Categories
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
                    class="peer h-5 w-5 rounded-sm border-stone-300 text-brand-700 focus:ring-brand-500 transition-all checked:bg-brand-700 checked:border-transparent" 
                  >
                </div>
                <span class="text-base text-slate-600 group-hover:text-brand-600 transition-colors">{{ cat.title }}</span>
              </label>
            </div>
          </div>

          <!-- Price Filter (Placeholder removed or kept simple? User said remove all placeholders. Keeping logic minimal or removing mock brands) -->
                 
          <!-- Apply Button Mobile -->
          <div class="pt-8 mt-4 sticky bottom-0 bg-white pb-safe">
            <button
              class="w-full py-3 bg-brand-700 text-white font-bold rounded-sm shadow-md active:scale-95 transition-transform"
              @click="isFilterDrawerOpen = false"
            >
              Show Results ({{ filteredProducts.length }})
            </button>
          </div>
        </div>
      </aside>
    </Transition>

    <!-- Hero Banner Removed -->

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header / Title Section -->
      <div class="mb-8 lg:mb-10">
             
        <!-- Specials Pills (Still useful navigation, keeping for now as they are feature toggles often) -->
        <div class="flex flex-wrap gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
          <button
            class="px-5 py-2 rounded-sm bg-brand-700 text-white text-sm font-medium hover:bg-brand-800 transition-colors shadow-sm whitespace-nowrap"
            @click="resetFilters"
          >
            All Products
          </button>
          <!-- Placeholders commented out until backend logic exists -->
          <!-- 
                 <button class="px-5 py-2 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:border-brand-500 hover:text-brand-600 transition-colors whitespace-nowrap">Hot Deals</button>
                 <button class="px-5 py-2 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:border-brand-500 hover:text-brand-600 transition-colors whitespace-nowrap">New Arrivals</button>
                 <button class="px-5 py-2 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:border-brand-500 hover:text-brand-600 transition-colors whitespace-nowrap">Best Sellers</button>
                 <button class="px-5 py-2 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:border-brand-500 hover:text-brand-600 transition-colors whitespace-nowrap">Discounts</button>
                 -->
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-10">
        <!-- Tablet/Desktop Sidebar Filters (Hidden on Mobile) -->
        <aside class="hidden lg:block w-64 flex-shrink-0 space-y-8 bg-white p-6 rounded-sm border border-stone-200 h-fit sticky top-24 shadow-sm">
          <!-- Filter Header -->
          <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
            <h3 class="font-bold text-slate-900 text-lg">
              Filters
            </h3>
            <button
              class="text-xs font-semibold text-brand-600 hover:text-brand-700 uppercase tracking-wide"
              @click="resetFilters"
            >
              Reset
            </button>
          </div>

          <!-- Categories -->
          <div>
            <h4 class="font-bold text-slate-900 mb-4 text-xs uppercase tracking-wider">
              Categories
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
                    class="peer h-4 w-4 rounded-sm border-stone-300 text-brand-700 focus:ring-brand-500 transition-all checked:bg-brand-700 checked:border-transparent" 
                  >
                </div>
                <span class="text-sm text-slate-600 group-hover:text-brand-600 transition-colors">{{ cat.title }}</span>
              </label>
            </div>
          </div>

          <!-- Price Filter -->
          <div>
            <h4 class="font-bold text-slate-900 mb-4 text-xs uppercase tracking-wider">
              Price Range
            </h4>
            <div class="flex items-center gap-4">
               <div class="relative w-full">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{{ currencyCode }}</span>
                  <input 
                    v-model.number="minPriceInput"
                    type="number" 
                    placeholder="Min"
                    class="w-full bg-slate-50 border border-stone-200 rounded-sm py-2 pl-6 pr-2 text-sm focus:ring-brand-500 focus:border-brand-500 text-slate-700"
                  >
               </div>
               <span class="text-slate-400">-</span>
               <div class="relative w-full">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{{ currencyCode }}</span>
                  <input 
                    v-model.number="maxPriceInput"
                    type="number"
                    placeholder="Max" 
                    class="w-full bg-slate-50 border border-stone-200 rounded-sm py-2 pl-6 pr-2 text-sm focus:ring-brand-500 focus:border-brand-500 text-slate-700"
                  >
               </div>
            </div>
            <!-- Simple Range Slider Visual Placeholder -->
             <div class="mt-4 relative h-1 bg-slate-200 rounded-full">
                 <div class="absolute left-0 top-0 h-full bg-brand-500 rounded-full" style="width: 100%"></div>
                 <div class="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-brand-500 rounded-full shadow cursor-pointer"></div>
                 <div class="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-brand-500 rounded-full shadow cursor-pointer"></div>
             </div>
          </div>

          <!-- Best Sellers Widget -->
          <div class="pt-8 border-t border-slate-100">
             <h4 class="font-bold text-slate-900 mb-4 text-xs uppercase tracking-wider">
               Best Sellers
             </h4>
             <div class="space-y-4">
                 <!-- Mock Widget Items -->
                 <div class="flex gap-3 group cursor-pointer">
                     <div class="w-16 h-16 bg-slate-100 rounded-sm overflow-hidden flex-shrink-0">
                         <img src="https://placehold.co/100x100" class="w-full h-full object-cover group-hover:scale-110 transition-transform">
                     </div>
                      <div>
                          <h5 class="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-brand-600 transition-colors">Premium Headphones</h5>
                          <span class="text-xs font-semibold text-slate-500">{{ formatCurrency(299) }}</span>
                      </div>
                 </div>
                 <div class="flex gap-3 group cursor-pointer">
                     <div class="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                         <img src="https://placehold.co/100x100" class="w-full h-full object-cover group-hover:scale-110 transition-transform">
                     </div>
                      <div>
                          <h5 class="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-brand-600 transition-colors">Ergonomic Chair</h5>
                          <span class="text-xs font-semibold text-slate-500">{{ formatCurrency(549) }}</span>
                      </div>
                 </div>
                 <div class="flex gap-3 group cursor-pointer">
                     <div class="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                         <img src="https://placehold.co/100x100" class="w-full h-full object-cover group-hover:scale-110 transition-transform">
                     </div>
                      <div>
                          <h5 class="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-brand-600 transition-colors">4K Monitor</h5>
                          <span class="text-xs font-semibold text-slate-500">{{ formatCurrency(399) }}</span>
                      </div>
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
                class="flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-800 rounded-sm text-sm font-semibold border border-brand-200"
              >
                  <span>{{ filters.categories.find(c => c.id === catId)?.title || 'Category' }}</span>
                  <button @click="removeCategory(catId)" class="hover:text-brand-900">
                      <Icon name="lucide:x" class="w-4 h-4" />
                  </button>
              </div>
              <button @click="resetFilters" class="text-sm text-slate-500 hover:text-brand-600 underline underline-offset-2">
                  Clear all
              </button>
          </div>
          <!-- Toolbar -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <!-- Mobile Filter Toggle (Visible only on mobile) -->
            <button
              class="w-full sm:hidden flex items-center justify-center gap-2 px-4 py-3 bg-white border border-stone-300 rounded-sm text-slate-700 font-bold shadow-sm active:scale-95 transition-all"
              @click="isFilterDrawerOpen = true"
            >
              <Icon name="lucide:sliders-horizontal" class="w-5 h-5" />
              Filters & Sort
            </button>

            <!-- Search in results -->
            <div class="relative max-w-md w-full">
              <input 
                v-model="searchQuery" 
                type="text"
                placeholder="Search within results..." 
                class="w-full bg-white border border-stone-300 text-slate-900 text-sm rounded-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 block pl-5 pr-10 py-3 shadow-sm transition-shadow hover:shadow-md" 
              >
              <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <Icon name="lucide:search" class="w-5 h-5 text-slate-400" />
              </div>
            </div>

            <!-- Sort Dropdown -->
            <div class="hidden sm:flex items-center gap-3 w-full sm:w-auto">
              <span class="text-sm text-slate-500 whitespace-nowrap">Sort by:</span>
              <div class="relative w-full sm:w-48">
                <select
                  v-model="sortOption"
                  class="w-full appearance-none bg-white rounded-sm border border-stone-300 text-sm py-3 pl-4 pr-10 focus:border-brand-500 focus:ring-brand-500 shadow-sm cursor-pointer hover:border-brand-600 transition-colors text-slate-700 font-medium"
                >
                  <option>Relevance</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <!-- <option>Newest Arrivals</option> -->
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Icon name="lucide:chevron-down" class="w-4 h-4 text-slate-500" />
                </div>
              </div>
            </div>


             <!-- View Toggle -->
            <div class="hidden sm:flex items-center bg-white rounded-sm border border-stone-300 p-1 shadow-sm">
                <button 
                    class="p-2 rounded-sm transition-all"
                    :class="viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'"
                    @click="viewMode = 'grid'"
                    title="Grid View"
                >
                    <Icon name="lucide:layout-grid" class="w-5 h-5" />
                </button>
                <button 
                    class="p-2 rounded-sm transition-all"
                    :class="viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'"
                    @click="viewMode = 'list'"
                    title="List View"
                >
                    <Icon name="lucide:list" class="w-5 h-5" />
                </button>
            </div>
          </div>

          <!-- Grid -->
          <div
            v-if="filteredProducts.length === 0"
            class="bg-white rounded-sm border border-stone-200 shadow-sm p-12 text-center"
          >
            <Icon name="lucide:package-open" class="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-slate-900">
              No products found
            </h3>
            <p class="text-slate-500 mt-1">
              Try clearing filters or search for something else.
            </p>
            <button
              class="mt-6 px-6 py-2 bg-slate-900 text-white rounded-sm hover:bg-slate-800 transition-colors"
              @click="resetFilters"
            >
              Clear All
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
              v-for="product in filteredProducts"
              :key="product.id"
              :product="product"
              :view-mode="viewMode"
              @quick-view="openQuickView"
            />
          </div>

                  
          <!-- Pagination Mock -->
          <div class="mt-16 flex justify-center">
            <nav class="flex items-center gap-2 p-1 bg-white rounded-sm border border-stone-200 shadow-sm">
              <button
                class="w-10 h-10 flex items-center justify-center rounded-sm hover:bg-slate-50 text-slate-500 disabled:opacity-30 transition-colors"
                disabled
              >
                <Icon name="lucide:chevron-left" class="w-5 h-5" />
              </button>
                          
              <div class="flex items-center px-2 gap-1">
                <button class="w-10 h-10 rounded-sm bg-brand-700 text-white font-bold text-sm shadow-md">
                  1
                </button>
                <button class="w-10 h-10 rounded-sm hover:bg-slate-50 text-slate-600 font-medium text-sm transition-colors">
                  2
                </button>
                <button class="w-10 h-10 rounded-sm hover:bg-slate-50 text-slate-600 font-medium text-sm transition-colors">
                  3
                </button>
                <span class="text-slate-400 px-1">...</span>
                <button class="w-10 h-10 rounded-sm hover:bg-slate-50 text-slate-600 font-medium text-sm transition-colors">
                  16
                </button>
              </div>

              <button class="w-10 h-10 flex items-center justify-center rounded-sm hover:bg-slate-50 text-slate-600 hover:text-brand-700 transition-colors">
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
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
  >
      <div v-if="isQuickViewOpen && quickViewProduct" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeQuickView"></div>
          <div class="bg-white rounded-sm shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-10 flex flex-col md:flex-row overflow-hidden border border-stone-200">
              <button @click="closeQuickView" class="absolute top-4 right-4 z-20 p-2 bg-white/50 rounded-full hover:bg-white transition-colors">
                  <Icon name="lucide:x" class="w-6 h-6 text-slate-600" />
              </button>
              
              <div class="w-full md:w-1/2 aspect-square md:aspect-auto bg-gray-100 relative">
                  <img 
                    :src="quickViewProduct.images && quickViewProduct.images[0] ? quickViewProduct.images[0] : 'https://placehold.co/600x600'" 
                    class="w-full h-full object-cover"
                  >
              </div>
              <div class="w-full md:w-1/2 p-8 md:p-12 flex flex-col">
                  <div>
                    <span class="inline-block px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-xs font-bold uppercase tracking-widest mb-4">In Stock</span>
                    <h2 class="text-3xl font-bold text-slate-900 mb-2">{{ quickViewProduct.title }}</h2>
                    <div class="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                        {{ formatCurrency(quickViewProduct.price) }}
                    </div>
                    <p class="text-slate-600 leading-relaxed mb-8">
                        {{ quickViewProduct.description || 'Experience the perfect blend of style and functionality. Crafted with premium materials for lasting durability.' }}
                    </p>
                  </div>

                  <div class="mt-auto space-y-4">
                      <button class="w-full py-4 bg-slate-900 text-white font-bold rounded-sm hover:bg-brand-700 transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2">
                        <Icon name="lucide:banknote" class="w-5 h-5" />
                        Add to Cart
                      </button>
                      <NuxtLink :to="`/p/${quickViewProduct.slug}`" class="block w-full py-4 border border-stone-300 text-slate-700 font-bold rounded-sm hover:bg-slate-50 transition-colors text-center" @click="closeQuickView">
                        View Full Details
                      </NuxtLink>
                  </div>
              </div>
          </div>
      </div>
  </Transition>
</template>
