<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/ModernProductCard.vue'

const props = defineProps<{
    category: any,
    products: any[] // All products passed, we filter here
}>()

// Filter products for this category
const categoryProducts = computed(() => {
    const id = props.category.id
    return (props.products ?? []).filter((p: any) => p.isActive && p.stock > 0 && p.categoryId === id)
})

// Mock sidebar filters
const filters = {
    categories: ['Bags', 'Books', 'English Books', 'Fantasy', 'Horror', 'Mystery', 'Self-Development', 'كتب دينية', 'Packs', 'Series', 'Stationery', 'Notebooks', 'Tech'],
    brands: ['Nike', 'Adidas', 'Puma', 'Reebok'],
    colors: ['Green', 'Blue', 'Brown', 'Gray', 'Pink', 'Beige'],
    sizes: ['Small', 'Medium', 'Large']
}
</script>

<template>
  <div class="bg-[#f8faf9] min-h-screen py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <!-- Breadcrumb -->
          <nav class="flex mb-8 text-sm text-slate-500">
             <NuxtLink to="/" class="hover:text-brand-600">Home</NuxtLink>
             <span class="mx-2">/</span>
             <span class="font-medium text-slate-900">{{ category.title }}</span>
          </nav>

          <div class="flex flex-col lg:flex-row gap-8">
              
              <!-- Sidebar Filters -->
              <aside class="w-full lg:w-64 flex-shrink-0 space-y-8">
                   <!-- Categories -->
                  <div>
                      <div class="flex items-center justify-between mb-4">
                          <h3 class="font-bold text-slate-900">Categories</h3>
                          <button class="text-xs text-brand-600 hover:underline">Reset</button>
                      </div>
                      <div class="space-y-2">
                          <label v-for="cat in filters.categories" :key="cat" class="flex items-center gap-3 cursor-pointer group">
                               <div class="relative flex items-center">
                                  <input type="checkbox" class="peer h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 transition-all checked:bg-brand-600 checked:border-transparent" />
                                </div>
                              <span class="text-sm text-slate-600 group-hover:text-brand-600 transition-colors">{{ cat }}</span>
                          </label>
                      </div>
                  </div>

                   <!-- Price Range (Mock) -->
                   <div>
                       <h3 class="font-bold text-slate-900 mb-4">Price</h3>
                       <div class="flex items-center gap-3">
                           <input type="number" placeholder="Min" class="w-full rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500" />
                           <span class="text-slate-400">-</span>
                           <input type="number" placeholder="Max" class="w-full rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500" />
                       </div>
                   </div>

              </aside>

              <!-- Main Content -->
              <div class="flex-1">
                  <!-- Header -->
                  <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                           <h1 class="text-2xl font-bold text-slate-900">{{ category.title }}</h1>
                           <p class="text-slate-500 text-sm mt-1">Showing {{ categoryProducts.length }} results</p>
                      </div>
                      
                      <!-- Sort -->
                      <div class="flex items-center gap-3">
                          <span class="text-sm text-slate-500">Sort by:</span>
                          <select class="rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500">
                              <option>Most Popular</option>
                              <option>Newest</option>
                              <option>Price: Low to High</option>
                              <option>Price: High to Low</option>
                          </select>
                      </div>
                  </div>

                  <!-- Grid -->
                   <div v-if="categoryProducts.length === 0" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                        <svg class="w-16 h-16 text-slate-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <h3 class="text-lg font-medium text-slate-900">No products found</h3>
                        <p class="text-slate-500 mt-1">Try adjusting your filters or check back later.</p>
                  </div>
                  <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                       <ProductCard v-for="product in categoryProducts" :key="product.id" :product="product" />
                  </div>

              </div>
          </div>
      </div>
  </div>
</template>
