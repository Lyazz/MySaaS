<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/nour/ProductCard.vue'

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

// Mock filters removed. We only show Categories logic for navigation.
const categoriesDropdownOpen = ref(false)
</script>

<template>
  <div class="bg-[#FAF3EA] min-h-screen py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Breadcrumb -->
      <nav class="flex mb-8 text-sm text-[#6B5850]">
        <NuxtLink
          to="/"
          class="hover:text-brand-700"
        >
          {{ storefrontContent.nav.home }}
        </NuxtLink>
        <span class="mx-2 text-[#C9A24B]">/</span>
        <NuxtLink
          to="/products"
          class="hover:text-brand-700"
        >
          {{ storefrontContent.nav.shop }}
        </NuxtLink>
        <span class="mx-2 text-[#C9A24B]">/</span>
        <span class="font-medium text-[#2E1E20]">{{ category.title }}</span>
      </nav>

      <div class="relative overflow-hidden rounded-[24px] bg-[#2E1E20] text-white mb-8 border border-[#C9A24B]/30">
        <img
          v-if="category.imageUrl"
          :src="category.imageUrl"
          :alt="category.title"
          class="absolute inset-0 w-full h-full object-cover opacity-70"
        >
        <div class="absolute inset-0 bg-gradient-to-r from-[#2E1E20]/90 via-[#2E1E20]/60 to-[#2E1E20]/20" />
        <div class="relative p-8 sm:p-10 lg:p-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.25em] text-[#E4C58F] mb-2">
              {{ storefrontContent.category.label }}
            </p>
            <h1 class="text-3xl sm:text-4xl font-bold">
              {{ category.title }}
            </h1>
            <p class="mt-3 text-white/80 text-sm max-w-xl">
              {{ category.description || storefrontContent.category.description }}
            </p>
          </div>
          <div class="flex items-center gap-3 bg-white/10 backdrop-blur rounded-full px-5 py-2 text-sm border border-[#C9A24B]/40">
            <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/15 text-white font-semibold">
              {{ categoryProducts.length }}
            </span>
            <span class="text-white/90">{{ storefrontContent.category.productsAvailableLabel }}</span>
          </div>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Sidebar Filters -->
        <aside class="w-full lg:w-64 flex-shrink-0 space-y-8">
          <!-- Categories -->
          <div>
            <button
              type="button"
              class="w-full flex items-center justify-between text-start mb-4"
              @click="categoriesDropdownOpen = !categoriesDropdownOpen"
            >
              <h3 class="font-bold text-[#2E1E20]">
                {{ storefrontContent.shop.categories }}
              </h3>
              <Icon
                name="lucide:chevron-down"
                class="w-4 h-4 text-[#9C8B82] transition-transform"
                :class="categoriesDropdownOpen ? 'rotate-180' : ''"
              />
            </button>
            <div v-show="categoriesDropdownOpen" class="space-y-2">
              <!-- Iterate over fetched categories -->
              <NuxtLink
                v-for="cat in allCategories"
                :key="cat.id"
                :to="`/category/${cat.slug}`"
                class="flex items-center gap-3 cursor-pointer group p-1.5 rounded-xl hover:bg-[#F3E7D8] transition-colors"
                :class="cat.id === category.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-[#5C4A44]'"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full bg-[#C9A24B]/50 group-hover:bg-brand-500 transition-colors"
                  :class="cat.id === category.id ? 'bg-brand-600' : ''"
                />
                <span class="text-sm transition-colors">{{ categoryDisplayTitle(cat) }}</span>
              </NuxtLink>
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <div class="flex-1">
          <!-- Header -->
          <div class="bg-[#FFFDF9] p-6 rounded-[24px] border border-[#C9A24B]/35 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 class="text-2xl font-bold text-[#2E1E20]">
                {{ category.title }}
              </h1>
              <p class="text-[#6B5850] text-sm mt-1">
                {{ storefrontContent.category.showingResults(categoryProducts.length) }}
              </p>
            </div>

            <!-- Sort -->
            <div class="flex items-center gap-3">
              <span class="text-sm text-[#6B5850]">{{ storefrontContent.category.sortBy }}</span>
              <select v-model="sortOption" class="rounded-xl border-[#C9A24B]/40 text-sm text-[#2E1E20] focus:border-brand-500 focus:ring-brand-500">
                <option value="mostPopular">{{ storefrontContent.category.sort.mostPopular }}</option>
                <option value="newest">{{ storefrontContent.category.sort.newest }}</option>
                <option value="priceLowToHigh">{{ storefrontContent.category.sort.priceLowToHigh }}</option>
                <option value="priceHighToLow">{{ storefrontContent.category.sort.priceHighToLow }}</option>
              </select>
            </div>
          </div>

          <!-- Grid -->
          <div
            v-if="sortedProducts.length === 0"
            class="bg-[#FFFDF9] rounded-[24px] border border-[#C9A24B]/35 shadow-sm p-12 text-center"
          >
            <Icon name="lucide:package-open" class="w-16 h-16 text-[#E4C58F] mx-auto mb-4" />
            <h3 class="text-lg font-medium text-[#2E1E20]">
              {{ storefrontContent.shop.results.noResults }}
            </h3>
            <p class="text-[#6B5850] mt-1">
              {{ storefrontContent.category.emptyHint }}
            </p>
            <NuxtLink
              to="/products"
              class="inline-flex items-center justify-center mt-6 px-6 py-2 rounded-full bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
            >
              {{ storefrontContent.shop.allProducts }}
            </NuxtLink>
          </div>
          <div
            v-else
            class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6"
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
