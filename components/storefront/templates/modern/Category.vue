<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/modern/ProductCard.vue'

const props = defineProps<{
    category: any,
    products: any[] // All products passed, we filter here
}>()

// Fetch dynamic categories for sidebar
const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: allCategories } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders(),
    lazy: true
})

// Filter products for this category
const categoryProducts = computed(() => {
    const id = props.category.id
    return (props.products ?? []).filter((p: any) => p.isActive && p.stock > 0 && p.categoryId === id)
})

const sortOption = ref('Most Popular')

const sortedProducts = computed(() => {
    let result = [...categoryProducts.value]
    if (sortOption.value === 'Price: Low to High') {
        result.sort((a, b) => Number(a.price) - Number(b.price))
    } else if (sortOption.value === 'Price: High to Low') {
        result.sort((a, b) => Number(b.price) - Number(a.price))
    }
    return result
})

// Mock filters removed. We only show Categories logic for navigation.
</script>

<template>
  <div class="bg-[#f8faf9] min-h-screen py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <!-- Breadcrumb -->
          <nav class="flex mb-8 text-sm text-slate-500">
             <NuxtLink to="/" class="hover:text-brand-600">Home</NuxtLink>
             <span class="mx-2">/</span>
             <NuxtLink to="/products" class="hover:text-brand-600">Shop</NuxtLink>
             <span class="mx-2">/</span>
             <span class="font-medium text-slate-900">{{ category.title }}</span>
          </nav>

          <div class="relative overflow-hidden rounded-2xl bg-slate-900 text-white mb-8 shadow-sm border border-slate-200">
            <img
              v-if="category.imageUrl"
              :src="category.imageUrl"
              :alt="category.title"
              class="absolute inset-0 w-full h-full object-contain opacity-90 bg-slate-900"
            />
            <div class="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/60 to-black/30"></div>
            <div class="relative p-8 sm:p-10 lg:p-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-[0.2em] text-brand-200 mb-2">Category</p>
                <h1 class="text-3xl sm:text-4xl font-bold font-sans">{{ category.title }}</h1>
                <p class="mt-3 text-slate-200 text-sm">Curated products ready to ship.</p>
              </div>
              <div class="flex items-center gap-3 bg-white/10 backdrop-blur rounded-full px-5 py-2 text-sm border border-white/20">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-white font-semibold">
                  {{ categoryProducts.length }}
                </span>
                <span class="text-slate-100">products available</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col lg:flex-row gap-8">
              
              <!-- Sidebar Filters -->
              <aside class="w-full lg:w-64 flex-shrink-0 space-y-8">
                   <!-- Categories -->
                  <div>
                      <div class="flex items-center justify-between mb-4">
                          <h3 class="font-bold text-slate-900">Categories</h3>
                      </div>
                      <div class="space-y-2">
                          <!-- Iterate over fetched categories -->
                          <NuxtLink 
                            v-for="cat in allCategories" 
                            :key="cat.id" 
                            :to="`/c/${cat.slug}`"
                            class="flex items-center gap-3 cursor-pointer group p-1 rounded-lg hover:bg-slate-50 transition-colors"
                            :class="cat.id === category.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600'"
                          >
                               <!-- Mock Icon or simple bullet -->
                              <span class="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-brand-500 transition-colors" :class="cat.id === category.id ? 'bg-brand-600' : ''"></span>
                              <span class="text-sm transition-colors">{{ cat.title }}</span>
                          </NuxtLink>
                      </div>
                  </div>

                   <!-- Removed Price (Mock) -->

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
