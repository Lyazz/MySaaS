<script setup lang="ts">
const categoriesUrl = useTenantApiUrl('/api/categories')

type Category = {
  id: string
  title: string
  slug: string
}

const { data: categories, error } = await useFetch<Category[]>(categoriesUrl, {
  headers: useTenantApiHeaders()
})

if (error.value) {
  throw createError({ statusCode: 500, statusMessage: 'Failed to load categories' })
}

useTenantSeo({
  title: 'All Categories',
  description: 'Browse all categories in our store.'
})

definePageMeta({
  middleware: 'tenant-only',
  layout: 'store'
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-12">
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight sm:text-4xl font-display">
          Collections
        </h1>
        <p class="mt-4 text-lg text-gray-500 font-sans">
            Browse our curated categories to find exactly what you need.
        </p>
      </div>

      <!-- Categories Grid -->
      <div v-if="categories && categories.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <NuxtLink
          v-for="category in categories"
          :key="category.id"
          :to="`/c/${category.slug}`"
          class="group bg-white rounded-xl border border-gray-200 p-8 flex flex-col justify-between hover:shadow-lg hover:border-brand-300 transition-all duration-300 relative overflow-hidden"
        >
          <!-- Hover Accent Bar -->
          <div class="absolute top-0 left-0 w-1 h-full bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

          <!-- Text -->
          <div class="z-10">
            <h3 class="text-xl font-bold text-gray-900 group-hover:text-brand-600 transition-colors font-display">
              {{ category.title }}
            </h3>
            <div class="mt-4 flex items-center text-sm font-medium text-gray-400 group-hover:text-brand-500 transition-colors font-sans gap-2">
                <span>View Collection</span>
                <span class="transform transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-24 bg-white rounded-xl border border-dashed border-gray-300">
         <h3 class="mt-2 text-sm font-medium text-gray-900 font-display">No categories found</h3>
         <p class="mt-1 text-sm text-gray-500 font-sans">Please check back later.</p>
      </div>
    </div>
  </div>
</template>
