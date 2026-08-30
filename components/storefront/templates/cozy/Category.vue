<script setup lang="ts">
import ProductCard from './ProductCard.vue'

const props = defineProps<{
  category: any
  products: any[]
}>()

const storefrontContent = useStorefrontContent()

const categoryDisplayTitle = (category: any): string => {
  if (!category) return ''
  return category.parentId ? '— ' + category.title : category.title
}

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: allCategories } = await useFetch<any[]>(categoriesUrl, {
  headers: useTenantApiHeaders(),
  lazy: true
})

const categoryProducts = computed(() => {
  const id = props.category.id
  return (props.products ?? []).filter((p: any) => p.isActive && p.stock > 0 && [...((Array.isArray(p.categoryIds) ? p.categoryIds : [])), p.categoryId].filter(Boolean).includes(id))
})
</script>

<template>
  <div class="ed-theme">
    <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-10 md:py-16">
      <!-- Header -->
      <div class="border-b border-[#262019] pb-8 mb-12">
        <nav class="flex items-center gap-2.5 ed-ui text-xs text-[#8A7E6E] mb-6">
          <NuxtLink to="/" class="hover:text-[#262019] transition-colors">{{ storefrontContent.nav.home }}</NuxtLink>
          <span>/</span>
          <NuxtLink to="/products" class="hover:text-[#262019] transition-colors">{{ storefrontContent.nav.shop }}</NuxtLink>
          <span>/</span>
          <span class="text-[#262019]">{{ category.title }}</span>
        </nav>
        <p class="ed-kicker mb-4">{{ storefrontContent.category.label }}</p>
        <div class="grid lg:grid-cols-12 gap-6 items-end">
          <h1 class="lg:col-span-8 ed-display text-4xl md:text-6xl text-[#262019]">{{ category.title }}</h1>
          <p class="lg:col-span-4 text-[15px] text-[#4A4038] leading-relaxed lg:pb-2">
            {{ category.description || storefrontContent.category.description }}
          </p>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-10 lg:gap-14">
        <!-- Sidebar -->
        <aside class="w-full lg:w-56 flex-shrink-0">
          <div class="lg:sticky lg:top-24">
            <h3 class="ed-label pb-3 border-b border-[#262019]">{{ storefrontContent.shop.categories }}</h3>
            <div class="flex flex-wrap lg:flex-col gap-x-2 gap-y-0.5 mt-3">
              <NuxtLink
                v-for="cat in allCategories"
                :key="cat.id"
                :to="`/category/${cat.slug}`"
                class="ed-ui text-[13px] py-2 transition-colors"
                :class="cat.id === category.id ? 'text-[#B8532E] font-semibold' : 'text-[#8A7E6E] hover:text-[#262019]'"
              >
                {{ categoryDisplayTitle(cat) }}
              </NuxtLink>
            </div>
          </div>
        </aside>

        <!-- Grid -->
        <div class="flex-1 min-w-0">
          <p class="ed-ui text-[13px] text-[#8A7E6E] mb-8 tabular-nums">
            {{ storefrontContent.category.showingResults(categoryProducts.length) }}
          </p>

          <div v-if="categoryProducts.length === 0" class="border border-dashed border-[#C4B8A4] py-16 text-center">
            <p class="ed-display text-xl text-[#262019]">{{ storefrontContent.shop.results.noResults }}</p>
            <p class="ed-ui text-sm text-[#8A7E6E] mt-1">{{ storefrontContent.category.emptyHint }}</p>
            <NuxtLink to="/products" class="ed-btn-line mt-6">{{ storefrontContent.shop.allProducts }}</NuxtLink>
          </div>

          <div v-else class="grid grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-12 md:gap-x-8 md:gap-y-16">
            <ProductCard v-for="product in categoryProducts" :key="product.id" :product="product" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
