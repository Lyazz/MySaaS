<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/ModernProductCard.vue'

const props = defineProps<{
    products: any[]
}>()

// Fetch dynamic categories for filters
const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: categoryData } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders(),
    lazy: true // Non-blocking
})

// Dynamic Filters
const filters = computed(() => ({
    categories: categoryData.value || [],
}))

// Filtering Logic
const selectedCategories = ref<string[]>([])
const searchQuery = ref('')
const sortOption = ref('Relevance')

const filteredProducts = computed(() => {
    let result = [...props.products]

    // Filter by Category
    if (selectedCategories.value.length > 0) {
        // Assuming products have 'category' string or 'categoryId'
        // If categories are strings in product.category
        // Or if we need to match by ID.
        // Let's check product structure in index.vue: type Product = { ... categoryId ... }
        // categoryData has id and title.
        // If product has categoryId, we filter by that.
        // If product has category name directly?
        // Let's Try to filter by checking if product.categoryId matches selected category IDs
        // OR if product.category (string) matches title.
        // Safe bet: Match by ID if available, else Title.
        // Current filters.categories is array of objects.
        const selectedIds = selectedCategories.value 
        result = result.filter(p => {
             // Check if p.categoryId is in selectedIds (which are IDs)
             // OR check relative to titles if we bound titles.
             // We will bind IDs in the checkbox value.
             return selectedIds.includes(p.categoryId) 
        })
    }

    // Filter by Search
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(p => p.title.toLowerCase().includes(q))
    }

    // Sort
    if (sortOption.value === 'Price: Low to High') {
        result.sort((a, b) => Number(a.price) - Number(b.price))
    } else if (sortOption.value === 'Price: High to Low') {
        result.sort((a, b) => Number(b.price) - Number(a.price))
    }
    // Add other sort logic if needed

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

// Reset Filters
const resetFilters = () => {
    selectedCategories.value = []
    searchQuery.value = ''
    sortOption.value = 'Relevance'
}
</script>

<template>
  <div class="bg-[#f8faf9] min-h-screen py-8 lg:py-12 font-sans relative">
      <!-- Mobile Filter Drawer Overlay -->
      <Transition
        enter-active-class="transition-opacity duration-300 ease-in-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-300 ease-in-out"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="isFilterDrawerOpen" class="fixed inset-0 bg-black/50 z-40 lg:hidden" @click="isFilterDrawerOpen = false"></div>
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
        <aside v-if="isFilterDrawerOpen" class="fixed inset-y-0 right-0 w-[300px] bg-white z-50 shadow-2xl p-6 overflow-y-auto lg:hidden">
            <div class="flex items-center justify-between mb-6">
                <h3 class="font-bold text-slate-900 text-lg">Filters</h3>
                <button @click="isFilterDrawerOpen = false" class="p-2 -mr-2 text-slate-500 hover:text-slate-900">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            
            <div class="space-y-8">
                <!-- Categories -->
                <div>
                    <h4 class="font-bold text-slate-900 mb-4 text-xs uppercase tracking-wider">Categories</h4>
                    <div class="space-y-3">
                        <label v-for="cat in filters.categories" :key="cat.id" class="flex items-center gap-3 cursor-pointer group select-none">
                             <div class="relative flex items-center">
                                <input 
                                    type="checkbox" 
                                    :value="cat.id"
                                    v-model="selectedCategories"
                                    class="peer h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 transition-all checked:bg-brand-600 checked:border-transparent" 
                                />
                              </div>
                            <span class="text-base text-slate-600 group-hover:text-brand-600 transition-colors">{{ cat.title }}</span>
                        </label>
                    </div>
                </div>

                 <!-- Price Filter (Placeholder removed or kept simple? User said remove all placeholders. Keeping logic minimal or removing mock brands) -->
                 
                 <!-- Apply Button Mobile -->
                 <div class="pt-8 mt-4 sticky bottom-0 bg-white pb-safe">
                     <button @click="isFilterDrawerOpen = false" class="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform">Show Results ({{ filteredProducts.length }})</button>
                 </div>
            </div>
        </aside>
      </Transition>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <!-- Header / Title Section -->
          <div class="mb-8 lg:mb-10">
             <h1 class="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-2">{{ pageTitle }}</h1>
             <p class="text-slate-500 text-sm lg:text-base">Explore our latest collection of premium products.</p>
             
             <!-- Specials Pills (Still useful navigation, keeping for now as they are feature toggles often) -->
             <div class="flex flex-wrap gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
                 <button @click="resetFilters" class="px-5 py-2 rounded-full bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm whitespace-nowrap">All Products</button>
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
              <aside class="hidden lg:block w-64 flex-shrink-0 space-y-8 bg-white p-6 rounded-2xl border border-slate-100 h-fit sticky top-24 shadow-sm">
                  
                  <!-- Filter Header -->
                   <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                          <h3 class="font-bold text-slate-900 text-lg">Filters</h3>
                          <button @click="resetFilters" class="text-xs font-semibold text-brand-600 hover:text-brand-700 uppercase tracking-wide">Reset</button>
                   </div>

                   <!-- Categories -->
                  <div>
                      <h4 class="font-bold text-slate-900 mb-4 text-xs uppercase tracking-wider">Categories</h4>
                      <div class="space-y-3">
                          <label v-for="cat in filters.categories" :key="cat.id" class="flex items-center gap-3 cursor-pointer group select-none">
                               <div class="relative flex items-center">
                                  <input 
                                    type="checkbox" 
                                    :value="cat.id"
                                    v-model="selectedCategories"
                                    class="peer h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 transition-all checked:bg-brand-600 checked:border-transparent" 
                                  />
                                </div>
                              <span class="text-sm text-slate-600 group-hover:text-brand-600 transition-colors">{{ cat.title }}</span>
                          </label>
                      </div>
                  </div>

                   <!-- Removed Fake Brands, Colors, Sizes -->
                   
                   <!-- Price Range Input (Can keep if functional, or remove if no logic. Removing to clean up placeholders as requested) -->
                   <!-- Leaving implementation simple: Category filter is the main "Dynamic Name" driver. -->

              </aside>

              <!-- Main Content -->
              <div class="flex-1">
                  <!-- Toolbar -->
                  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                      <!-- Mobile Filter Toggle (Visible only on mobile) -->
                      <button @click="isFilterDrawerOpen = true" class="w-full sm:hidden flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold shadow-sm active:scale-95 transition-all">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                          Filters & Sort
                      </button>

                      <!-- Search in results -->
                      <div class="relative max-w-md w-full">
                           <input 
                                type="text" 
                                v-model="searchQuery"
                                placeholder="Search within results..." 
                                class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-full focus:ring-2 focus:ring-brand-100 focus:border-brand-500 block pl-5 pr-10 py-3 shadow-sm transition-shadow hover:shadow-md" 
                            />
                            <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                      </div>

                      <!-- Sort Dropdown -->
                      <div class="hidden sm:flex items-center gap-3 w-full sm:w-auto">
                          <span class="text-sm text-slate-500 whitespace-nowrap">Sort by:</span>
                          <div class="relative w-full sm:w-48">
                              <select v-model="sortOption" class="w-full appearance-none bg-white rounded-full border border-slate-200 text-sm py-3 pl-4 pr-10 focus:border-brand-500 focus:ring-brand-500 shadow-sm cursor-pointer hover:border-brand-300 transition-colors text-slate-700 font-medium">
                                  <option>Relevance</option>
                                  <option>Price: Low to High</option>
                                  <option>Price: High to Low</option>
                                  <!-- <option>Newest Arrivals</option> -->
                              </select>
                              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                  <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                              </div>
                          </div>
                      </div>
                  </div>

                  <!-- Grid -->
                  <div v-if="filteredProducts.length === 0" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                        <svg class="w-16 h-16 text-slate-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <h3 class="text-lg font-medium text-slate-900">No products found</h3>
                        <p class="text-slate-500 mt-1">Try clearing filters or search for something else.</p>
                        <button @click="resetFilters" class="mt-6 px-6 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-colors">Clear All</button>
                  </div>

                  <div v-else class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-y-10">
                       <ProductCard v-for="product in filteredProducts" :key="product.id" :product="product" />
                  </div>

                  
                  <!-- Pagination Mock -->
                  <div class="mt-16 flex justify-center">
                      <nav class="flex items-center gap-2 p-1 bg-white rounded-full border border-slate-200 shadow-sm">
                          <button class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-500 disabled:opacity-30 transition-colors" disabled>
                              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                          </button>
                          
                          <div class="flex items-center px-2 gap-1">
                              <button class="w-10 h-10 rounded-full bg-brand-600 text-white font-bold text-sm shadow-md">1</button>
                              <button class="w-10 h-10 rounded-full hover:bg-slate-50 text-slate-600 font-medium text-sm transition-colors">2</button>
                              <button class="w-10 h-10 rounded-full hover:bg-slate-50 text-slate-600 font-medium text-sm transition-colors">3</button>
                              <span class="text-slate-400 px-1">...</span>
                              <button class="w-10 h-10 rounded-full hover:bg-slate-50 text-slate-600 font-medium text-sm transition-colors">16</button>
                          </div>

                          <button class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-600 hover:text-brand-600 transition-colors">
                              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                          </button>
                      </nav>
                  </div>

              </div>
          </div>
      </div>
  </div>
</template>
