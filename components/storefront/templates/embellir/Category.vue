<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/embellir/ProductCard.vue'

const props = defineProps<{
    category: any,
    products: any[] // All products passed, we filter here
}>()

const storefrontContent = useStorefrontContent()

const categoryDisplayTitle = (category: any): string => {
    if (!category) return ""
    return category.parentId ? ("-> " + category.title) : category.title
}

// Fetch dynamic categories for sidebar
const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: allCategories } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders(),
    lazy: true
})

// Filter products for this category
const categoryProducts = computed(() => {
    const id = props.category.id
    return (props.products ?? []).filter((p: any) => p.isActive && p.stock > 0 && [ ...((Array.isArray(p.categoryIds) ? p.categoryIds : [])), p.categoryId ].filter(Boolean).includes(id))
})

type SortOption = 'mostPopular' | 'newest' | 'priceLowToHigh' | 'priceHighToLow'
const sortOption = ref<SortOption>('mostPopular')

const sortedProducts = computed(() => {
    const result = [...categoryProducts.value]
    if (sortOption.value === 'newest') {
        result.sort((a, b) => Number(new Date(b.createdAt ?? 0)) - Number(new Date(a.createdAt ?? 0)))
    } else if (sortOption.value === 'priceLowToHigh') {
        result.sort((a, b) => Number(a.price) - Number(b.price))
    } else if (sortOption.value === 'priceHighToLow') {
        result.sort((a, b) => Number(b.price) - Number(a.price))
    }
    return result
})

const categoriesDropdownOpen = ref(true)
</script>

<template>
  <div class="bg-[#F2ECE1] min-h-screen">
    <!-- Category head: the image set behind the glaze -->
    <div class="relative bg-brand-600 text-[#F2ECE1] overflow-hidden">
      <img
        v-if="category.imageUrl"
        :src="category.imageUrl"
        :alt="category.title"
        class="absolute inset-0 w-full h-full object-cover opacity-30"
      >
      <div v-else class="emb-zellige opacity-[0.09] absolute inset-0 pointer-events-none" />
      <div class="absolute inset-0 bg-gradient-to-t from-[#062622]/85 via-brand-600/60 to-brand-600/75" />

      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <nav class="flex items-center gap-2.5 text-xs text-[#F2ECE1]/60 mb-8">
          <NuxtLink to="/" class="hover:text-[#DFA254] transition-colors">{{ storefrontContent.nav.home }}</NuxtLink>
          <span class="emb-star w-2 h-2 text-[#DFA254]/70" />
          <NuxtLink to="/products" class="hover:text-[#DFA254] transition-colors">{{ storefrontContent.nav.shop }}</NuxtLink>
          <span class="emb-star w-2 h-2 text-[#DFA254]/70" />
          <span class="text-[#F2ECE1]">{{ category.title }}</span>
        </nav>

        <p class="emb-label text-[#DFA254] mb-3">{{ storefrontContent.category.label }}</p>
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <h1 class="emb-display text-4xl md:text-[52px] leading-none text-[#FDFAF4]">
              {{ category.title }}
            </h1>
            <p class="mt-4 text-sm text-[#F2ECE1]/70 max-w-xl leading-relaxed">
              {{ category.description || storefrontContent.category.description }}
            </p>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span class="h-12 w-12 border border-[#DFA254] text-[#DFA254] flex items-center justify-center text-sm font-bold tabular-nums">
              {{ categoryProducts.length }}
            </span>
            <span class="emb-label text-[#F2ECE1]/70 max-w-[9rem]">{{ storefrontContent.category.productsAvailableLabel }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      <div class="flex flex-col lg:flex-row gap-10">
        <!-- Sidebar -->
        <aside class="w-full lg:w-60 flex-shrink-0 lg:sticky lg:top-28 self-start">
          <div class="border border-[#CBBDAB] bg-[#FDFAF4] p-6">
            <button
              type="button"
              class="w-full flex items-center justify-between text-start pb-3 border-b border-[#CBBDAB]"
              @click="categoriesDropdownOpen = !categoriesDropdownOpen"
            >
              <span class="emb-label text-[#16211E]">{{ storefrontContent.shop.categories }}</span>
              <Icon
                name="lucide:chevron-down"
                class="w-4 h-4 text-[#8E9793] transition-transform"
                :class="categoriesDropdownOpen ? 'rotate-180' : ''"
              />
            </button>
            <div v-show="categoriesDropdownOpen" class="pt-4 flex flex-col">
              <NuxtLink
                v-for="cat in allCategories"
                :key="cat.id"
                :to="`/category/${cat.slug}`"
                class="group flex items-center gap-2.5 py-2 text-sm transition-colors"
                :class="cat.id === category.id ? 'text-brand-700 font-semibold' : 'text-[#5A6763] hover:text-brand-700'"
              >
                <span
                  class="emb-star w-2 h-2 shrink-0 transition-colors"
                  :class="cat.id === category.id ? 'text-[#DFA254]' : 'text-[#CBBDAB] group-hover:text-[#DFA254]'"
                />
                <span>{{ categoryDisplayTitle(cat) }}</span>
              </NuxtLink>
            </div>
          </div>
        </aside>

        <!-- Main -->
        <div class="flex-1 min-w-0">
          <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-4 mb-8 border-b border-[#CBBDAB]">
            <p class="text-sm text-[#5A6763]">
              {{ storefrontContent.category.showingResults(categoryProducts.length) }}
            </p>

            <div class="flex items-center gap-3">
              <span class="emb-label text-[#8E9793] whitespace-nowrap">{{ storefrontContent.category.sortBy }}</span>
              <div class="relative">
                <select
                  v-model="sortOption"
                  class="appearance-none bg-transparent border-0 border-b border-[#CBBDAB] text-sm py-2 ps-0 pe-7 text-[#16211E] font-medium focus:border-brand-600 focus:ring-0 cursor-pointer"
                >
                  <option value="mostPopular">{{ storefrontContent.category.sort.mostPopular }}</option>
                  <option value="newest">{{ storefrontContent.category.sort.newest }}</option>
                  <option value="priceLowToHigh">{{ storefrontContent.category.sort.priceLowToHigh }}</option>
                  <option value="priceHighToLow">{{ storefrontContent.category.sort.priceHighToLow }}</option>
                </select>
                <Icon name="lucide:chevron-down" class="w-4 h-4 text-[#5A6763] absolute end-0 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div
            v-if="sortedProducts.length === 0"
            class="border border-[#CBBDAB] bg-[#FDFAF4] p-12 md:p-16 text-center"
          >
            <span class="emb-star w-10 h-10 text-[#CBBDAB] mx-auto mb-5" />
            <h3 class="emb-display text-2xl text-[#16211E] mb-2">
              {{ storefrontContent.shop.results.noResults }}
            </h3>
            <p class="text-sm text-[#5A6763]">
              {{ storefrontContent.category.emptyHint }}
            </p>
            <NuxtLink
              to="/products"
              class="inline-flex items-center justify-center mt-7 h-11 px-7 bg-brand-600 text-[#FDFAF4] emb-label hover:bg-[#DFA254] hover:text-[#062622] transition-colors"
            >
              {{ storefrontContent.shop.allProducts }}
            </NuxtLink>
          </div>

          <div
            v-else
            class="grid grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7 lg:gap-y-10"
          >
            <ProductCard
              v-for="product in sortedProducts"
              :key="product.id"
              :product="product"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
