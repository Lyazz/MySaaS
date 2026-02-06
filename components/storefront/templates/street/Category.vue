<script setup lang="ts">
import ProductCard from './ProductCard.vue'

const props = defineProps<{
    category: any,
    products: any[]
}>()

const storefrontContent = useStorefrontContent()

// Fetch dynamic categories for sidebar
const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: allCategories } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders(),
    lazy: true
})

const categoryProducts = computed(() => {
    const id = props.category.id
    return (props.products ?? []).filter((p: any) => p.isActive && p.stock > 0 && p.categoryId === id)
})

const sortedProducts = computed(() => {
    const result = [...categoryProducts.value]
    return result
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-24">
    <!-- Header -->
    <div class="bg-white border-b-4 border-black py-12 px-4 md:px-8 text-center">
        <h1 class="font-street text-6xl md:text-8xl uppercase leading-none inline-block border-4 border-black px-6 shadow-[8px_8px_0_0_var(--brand)] bg-white">
            {{ category.title }}
        </h1>
        <p class="mt-6 font-mono text-xl uppercase max-w-2xl mx-auto border-l-4 border-black pl-4 text-left">
            {{ category.description || storefrontContent.category.description }}
        </p>
    </div>

    <div class="max-w-[1920px] mx-auto px-4 md:px-8 py-12 flex flex-col lg:flex-row gap-12">
        
        <!-- Sidebar -->
        <aside class="w-full lg:w-64 flex-shrink-0">
            <h3 class="font-street text-3xl uppercase mb-6 bg-black text-white p-2 text-center">{{ storefrontContent.shop.categories }}</h3>
            <div class="border-4 border-black bg-white p-4 space-y-2 shadow-[8px_8px_0_0_#000]">
                <NuxtLink 
                    v-for="cat in allCategories" 
                    :key="cat.id" 
                    :to="`/c/${cat.slug}`"
                    class="block font-mono text-sm uppercase hover:bg-brand hover:text-black px-2 py-1 transition-colors"
                    :class="cat.id === category.id ? 'bg-black text-brand font-bold' : ''"
                >
                    {{ cat.title }}
                </NuxtLink>
            </div>
        </aside>

        <!-- Main -->
        <div class="flex-1">
            <div v-if="categoryProducts.length === 0" class="border-4 border-black p-12 text-center bg-white shadow-[12px_12px_0_0_#000]">
                <h3 class="font-street text-4xl uppercase mb-4">{{ storefrontContent.shop.results.noResults }}</h3>
                <p class="font-mono text-sm uppercase text-slate-600 mb-6">{{ storefrontContent.category.emptyHint }}</p>
                <NuxtLink to="/products" class="inline-block bg-brand border-2 border-black px-6 py-2 font-street text-xl uppercase hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0_0_#000] transition-all">
                    {{ storefrontContent.shop.allProducts }}
                </NuxtLink>
            </div>
            
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                <ProductCard 
                    v-for="product in sortedProducts" 
                    :key="product.id" 
                    :product="product" 
                />
            </div>
        </div>
    </div>
  </div>
</template>
