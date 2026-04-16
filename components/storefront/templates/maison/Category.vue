<script setup lang="ts">
import ProductCard from './ProductCard.vue'

const props = defineProps<{
  category: any
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
  <div class="min-h-screen pb-24">
    <!-- Category Header with optional image -->
    <div class="relative h-48 md:h-64 bg-[#E8D8C8] overflow-hidden mb-12">
      <img
        v-if="category.imageUrl"
        :src="category.imageUrl"
        :alt="category.title"
        class="w-full h-full object-cover"
      >
      <div class="absolute inset-0 bg-gradient-to-b from-[#1A120A]/40 to-[#1A120A]/70" />
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <p class="text-[10px] tracking-[0.3em] uppercase text-[#C17B4E]/90 mb-3">{{ storefrontContent.category.label }}</p>
        <h1 class="font-maison-serif text-4xl md:text-5xl font-semibold text-white">{{ category.title }}</h1>
        <p v-if="category.description" class="mt-3 text-white/65 text-sm max-w-lg">{{ category.description }}</p>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-6">
      <div class="flex flex-col lg:flex-row gap-10">
        <!-- Sidebar -->
        <aside class="w-full lg:w-52 flex-shrink-0">
          <div class="sticky top-24">
            <h3 class="text-[10px] tracking-[0.25em] uppercase font-bold text-[#B0A090] mb-5">Collections</h3>
            <div class="space-y-1">
              <NuxtLink
                v-for="cat in allCategories"
                :key="cat.id"
                :to="`/c/${cat.slug}`"
                class="block px-4 py-2.5 text-sm transition-all border-l-2"
                :class="cat.id === category.id
                  ? 'border-[#C17B4E] text-[#C17B4E] font-medium bg-[#C17B4E]/5'
                  : 'border-transparent text-[#7A6558] hover:text-[#2C2420] hover:border-[#D4C4B4]'"
              >
                {{ cat.title }}
              </NuxtLink>
            </div>
          </div>
        </aside>

        <!-- Grid -->
        <div class="flex-1">
          <div
            v-if="categoryProducts.length === 0"
            class="bg-white border border-[#E8E0D4] p-16 text-center"
          >
            <Icon name="lucide:sofa" class="w-12 h-12 text-[#D4C4B4] mx-auto mb-4" />
            <p class="font-maison-serif text-xl text-[#2C2420] mb-2">{{ storefrontContent.shop.results.noResults }}</p>
            <p class="text-sm text-[#7A6558] mb-6">{{ storefrontContent.category.emptyHint }}</p>
            <NuxtLink
              to="/products"
              class="inline-flex items-center gap-2 px-6 py-3 bg-[#2C2420] text-white text-xs tracking-[0.15em] uppercase hover:bg-[#C17B4E] transition-colors"
            >
              {{ storefrontContent.shop.allProducts }}
            </NuxtLink>
          </div>

          <div v-else>
            <div class="flex items-center justify-between mb-6">
              <p class="text-xs text-[#B0A090] tracking-wider">{{ categoryProducts.length }} produits</p>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
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
  </div>
</template>
