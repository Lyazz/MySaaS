<script setup lang="ts">
import ProductCard from './ProductCard.vue'

const props = defineProps<{
    category: any,
    products: any[]
}>()

const storefrontContent = useStorefrontContent()

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: allCategories } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders(),
    lazy: true
})

const categoryProducts = computed(() => {
    const id = props.category.id
    return (props.products ?? []).filter((p: any) => p.isActive && p.stock > 0 && p.categoryId === id)
})
</script>

<template>
  <div class="min-h-screen px-4 py-12">
    <div class="max-w-7xl mx-auto">
        
        <!-- Header -->
        <div class="text-center mb-16 relative">
            <div class="absolute inset-0 bg-brand-50 blur-3xl rounded-full opacity-50 z-0 scale-75"></div>
            <div class="relative z-10">
                 <span class="text-brand-500 font-bold tracking-widest uppercase text-xs mb-2 block">{{ storefrontContent.category.label }}</span>
                 <h1 class="font-cozy font-black text-5xl md:text-6xl text-slate-800 mb-6">{{ category.title }}</h1>
                 <p class="max-w-xl mx-auto text-slate-500 leading-relaxed">{{ category.description || storefrontContent.category.description }}</p>
            </div>
        </div>

        <div class="flex flex-col lg:flex-row gap-12">
            
            <!-- Sidebar -->
            <aside class="w-full lg:w-48 flex-shrink-0">
                <div class="sticky top-24">
                    <h3 class="font-bold text-slate-900 mb-6 text-sm uppercase tracking-wide">{{ storefrontContent.shop.categories }}</h3>
                    <div class="space-y-2">
                        <NuxtLink 
                            v-for="cat in allCategories" 
                            :key="cat.id" 
                            :to="`/c/${cat.slug}`"
                            class="block px-4 py-2 rounded-2xl text-sm font-bold transition-all"
                            :class="cat.id === category.id ? 'bg-brand-500 text-white shadow-soft' : 'text-slate-500 hover:bg-white hover:text-slate-700'"
                        >
                            {{ cat.title }}
                        </NuxtLink>
                    </div>
                </div>
            </aside>

            <!-- Grid -->
            <div class="flex-1">
                <div v-if="categoryProducts.length === 0" class="bg-white/50 rounded-[3rem] p-16 text-center border dashed border-slate-300">
                    <p class="text-slate-600 font-bold">{{ storefrontContent.shop.results.noResults }}</p>
                    <p class="text-slate-500 mt-2">{{ storefrontContent.category.emptyHint }}</p>
                    <NuxtLink
                      to="/products"
                      class="inline-flex items-center justify-center mt-6 px-6 py-2 rounded-full bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
                    >
                      {{ storefrontContent.shop.allProducts }}
                    </NuxtLink>
                </div>
                
                <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    <ProductCard 
                        v-for="product in categoryProducts" 
                        :key="product.id" 
                        :product="product" 
                    />
                </div>
            </div>

        </div>

    </div>
  </div>
</template>
