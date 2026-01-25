<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/ModernProductCard.vue'

const props = defineProps<{
    products: any[]
}>()

// Mock sidebar filters - strictly matching the Nokhba screenshot logic (Checkboxes for Categories)
const filters = {
    categories: ['Bags', 'Books', 'English Books', 'Fantasy', 'Horror', 'Mystery', 'Self-Development', 'كتب دينية', 'Packs', 'Series', 'Stationery', 'Notebooks', 'Tech'],
    brands: ['Nike', 'Adidas', 'Puma'],
    colors: ['Green', 'Blue', 'Brown', 'Beige', 'White'],
    sizes: ['Small', 'Medium', 'Large']
}
</script>

<template>
  <div class="bg-[#f8faf9] min-h-screen py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <!-- Header / Title Section -->
          <div class="mb-8">
             <h1 class="text-3xl font-bold text-slate-900">Full catalog</h1>
             
             <!-- Specials Pills -->
             <div class="flex flex-wrap gap-2 mt-4">
                 <button class="px-4 py-1.5 rounded-full bg-brand-100 text-brand-700 text-sm font-medium hover:bg-brand-200 transition-colors">All</button>
                 <button class="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">Hot deals</button>
                 <button class="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">New</button>
                 <button class="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">Best sellers</button>
                 <button class="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">Discounts</button>
             </div>
          </div>

          <div class="flex flex-col lg:flex-row gap-8">
              
              <!-- Sidebar Filters -->
              <aside class="w-full lg:w-64 flex-shrink-0 space-y-8">
                  
                  <!-- Filter Header -->
                   <div class="flex items-center justify-between mb-2">
                          <h3 class="font-bold text-slate-900 text-lg">Filters</h3>
                          <button class="text-sm text-brand-600 hover:underline">Reset</button>
                   </div>

                   <!-- Categories -->
                  <div>
                      <h4 class="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wide">Categories</h4>
                      <div class="space-y-2.5">
                          <label v-for="cat in filters.categories" :key="cat" class="flex items-center gap-3 cursor-pointer group">
                               <div class="relative flex items-center">
                                  <input type="checkbox" class="peer h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 transition-all checked:bg-brand-600 checked:border-transparent" />
                                </div>
                              <span class="text-sm text-slate-600 group-hover:text-brand-600 transition-colors">{{ cat }}</span>
                          </label>
                      </div>
                  </div>

                   <!-- Other Filters (Brand) -->
                   <div class="pt-6 border-t border-slate-200">
                       <h4 class="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wide">Brand</h4>
                       <div class="space-y-2.5">
                            <label v-for="brand in filters.brands" :key="brand" class="flex items-center gap-3 cursor-pointer group">
                               <div class="relative flex items-center">
                                  <input type="checkbox" class="peer h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 transition-all checked:bg-brand-600 checked:border-transparent" />
                                </div>
                              <span class="text-sm text-slate-600 group-hover:text-brand-600 transition-colors">{{ brand }}</span>
                          </label>
                       </div>
                   </div>

                   <!-- Color Filter -->
                    <div class="pt-6 border-t border-slate-200">
                       <h4 class="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wide">Color</h4>
                       <div class="flex flex-wrap gap-2">
                           <button v-for="color in filters.colors" :key="color" class="px-3 py-1 rounded-full border border-slate-200 text-xs text-slate-600 hover:border-brand-500 hover:text-brand-600 transition-colors bg-white">
                               {{ color }}
                           </button>
                       </div>
                   </div>
                   
                   <!-- Price Range Input -->
                    <div class="pt-6 border-t border-slate-200">
                       <h4 class="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wide">Price</h4>
                       <div class="flex items-center gap-2">
                           <input type="number" placeholder="100" class="w-full rounded-lg border-slate-200 text-sm py-2 px-3 focus:border-brand-500 focus:ring-brand-500" />
                           <span class="text-slate-400">-</span>
                           <input type="number" placeholder="8000" class="w-full rounded-lg border-slate-200 text-sm py-2 px-3 focus:border-brand-500 focus:ring-brand-500" />
                           <span class="text-slate-500 text-sm">DZD</span>
                       </div>
                   </div>

              </aside>

              <!-- Main Content -->
              <div class="flex-1">
                  <!-- Toolbar -->
                  <div class="flex justify-between items-center mb-6">
                      <!-- Search in results -->
                      <div class="relative max-w-md w-full">
                           <input 
                                type="text" 
                                placeholder="Search products..." 
                                class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-full focus:ring-2 focus:ring-brand-500 focus:border-transparent block pl-5 p-2.5 shadow-sm" 
                            />
                            <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                      </div>

                      <!-- Sort Dropdown -->
                      <div class="ml-4 flex items-center gap-2 flex-shrink-0">
                          <select class="rounded-full border-slate-200 text-sm py-2 px-4 pr-8 focus:border-brand-500 focus:ring-brand-500 bg-white shadow-sm cursor-pointer">
                              <option>Relevance</option>
                              <option>Price: Low to High</option>
                              <option>Price: High to Low</option>
                              <option>Newest Arrivals</option>
                          </select>
                      </div>
                  </div>

                  <!-- Grid -->
                  <div v-if="products.length === 0" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                        <svg class="w-16 h-16 text-slate-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <h3 class="text-lg font-medium text-slate-900">No products found</h3>
                        <p class="text-slate-500 mt-1">Try clearing filters or search for something else.</p>
                  </div>

                  <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                       <ProductCard v-for="product in products" :key="product.id" :product="product" />
                  </div>
                  
                  <!-- Pagination Mock -->
                  <div class="mt-12 flex justify-center">
                      <nav class="flex items-center gap-2 text-sm font-medium text-slate-600">
                          <button class="p-2 hover:text-brand-600 disabled:opacity-50">&larr;</button>
                          <span class="text-brand-600">Page 1 / 16</span>
                          <button class="p-2 hover:text-brand-600">&rarr;</button>
                      </nav>
                  </div>

              </div>
          </div>
      </div>
  </div>
</template>
