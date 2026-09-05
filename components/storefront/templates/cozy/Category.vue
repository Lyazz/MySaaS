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

/* Same staggered rhythm as the shop, so a department reads as a chapter of it. */
const isWideCell = (index: number) => index % 3 === 0
</script>

<template>
  <div class="ed-theme">
    <!-- Chapter opener: the department gets its own plate -->
    <section class="border-b border-[#DAD2C4]">
      <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-10 md:py-16">
        <nav class="flex items-center gap-2.5 ed-ui text-xs text-[#8A7E6E] mb-8">
          <NuxtLink to="/" class="hover:text-[#262019] transition-colors">{{ storefrontContent.nav.home }}</NuxtLink>
          <span>/</span>
          <NuxtLink to="/products" class="hover:text-[#262019] transition-colors">{{ storefrontContent.nav.shop }}</NuxtLink>
          <span>/</span>
          <span class="text-[#262019]">{{ category.title }}</span>
        </nav>

        <div class="grid lg:grid-cols-12 gap-8 lg:gap-12 items-end">
          <div class="lg:col-span-7">
            <p class="ed-kicker mb-5">{{ storefrontContent.category.label }}</p>
            <h1 class="ed-display text-4xl md:text-[4rem] leading-[1.03] text-[#262019]">{{ category.title }}</h1>
          </div>
          <div class="lg:col-span-5">
            <p class="ed-dropcap text-[16px] leading-[1.75] text-[#4A4038]">
              {{ category.description || storefrontContent.category.description }}
            </p>
            <p class="ed-ui text-[12px] uppercase tracking-[0.16em] text-[#8A7E6E] mt-6 pt-4 border-t border-[#DAD2C4] tabular-nums">
              {{ storefrontContent.category.showingResults(categoryProducts.length) }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-10 md:py-14">
      <!-- Other departments run across, not down a sidebar -->
      <div v-if="allCategories && allCategories.length" class="flex flex-wrap items-center gap-x-7 gap-y-2 mb-10 md:mb-14 pb-5 border-b border-[#DAD2C4]">
        <NuxtLink
          to="/products"
          class="ed-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A7E6E] hover:text-[#262019] transition-colors"
        >{{ storefrontContent.shop.allProducts }}</NuxtLink>
        <NuxtLink
          v-for="(cat, index) in allCategories"
          :key="cat.id"
          :to="`/category/${cat.slug}`"
          class="ed-ui text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors flex items-baseline gap-2"
          :class="cat.id === category.id ? 'text-[#B8532E]' : 'text-[#8A7E6E] hover:text-[#262019]'"
        >
          <span class="tabular-nums opacity-50">{{ String(index + 1).padStart(2, '0') }}</span>
          {{ categoryDisplayTitle(cat) }}
        </NuxtLink>
      </div>

      <div v-if="categoryProducts.length === 0" class="border border-dashed border-[#C4B8A4] py-16 text-center">
        <p class="ed-display text-xl text-[#262019]">{{ storefrontContent.shop.results.noResults }}</p>
        <p class="ed-ui text-sm text-[#8A7E6E] mt-1">{{ storefrontContent.category.emptyHint }}</p>
        <NuxtLink to="/products" class="ed-btn-line mt-6">{{ storefrontContent.shop.allProducts }}</NuxtLink>
      </div>

      <div v-else class="grid grid-cols-2 md:grid-cols-12 gap-x-5 gap-y-10 md:gap-x-8 md:gap-y-14 items-start">
        <div
          v-for="(product, index) in categoryProducts"
          :key="product.id"
          :class="isWideCell(index) ? 'col-span-2 md:col-span-6' : 'col-span-1 md:col-span-3'"
        >
          <ProductCard :product="product" :view-mode="isWideCell(index) ? 'feature' : 'grid'" />
        </div>
      </div>
    </div>
  </div>
</template>
