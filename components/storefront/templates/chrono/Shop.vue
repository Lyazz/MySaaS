<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/chrono/ProductCard.vue'
import { normalizeSearchText } from '~/shared/text/normalize-search'
const props = defineProps<{
    products: any[]
}>()

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: categoryData } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders(),
    lazy: true
})

const { format: formatCurrency } = useCurrency()
const storefrontContent = useStorefrontContent()

const categoryDisplayTitle = (category: any): string => {
    if (!category) return ""
    return category.parentId ? ("-> " + category.title) : category.title
}


const filters = computed(() => ({
    categories: categoryData.value || [],
}))

const selectedCategories = ref<string[]>([])
const route = useRoute()
const searchQuery = ref((route.query.q as string) || '')

watch(() => route.query.q, (newQ) => {
    if (newQ !== undefined) {
        searchQuery.value = newQ as string
    }
})
const sortOption = ref<'relevance' | 'priceAsc' | 'priceDesc'>('relevance')
const viewMode = ref<'grid' | 'list'>('grid')

const priceRange = computed(() => {
    const prices = props.products
        .map((product) => Number(product?.price))
        .filter((price): price is number => Number.isFinite(price))

    if (prices.length === 0) {
        return { min: 0, max: 0 }
    }

    return {
        min: Math.min(...prices),
        max: Math.max(...prices),
    }
})
const minPriceInput = ref<number | null>(null)
const maxPriceInput = ref<number | null>(null)

const isQuickViewOpen = ref(false)
const quickViewProduct = ref<any>(null)
const sidebarProducts = computed(() => props.products.slice(0, 2))

const filteredProducts = computed(() => {
    let result = [...props.products]
    if (selectedCategories.value.length > 0) {
        const selectedIds = selectedCategories.value 
        result = result.filter(p => selectedIds.some((id) => [ ...((Array.isArray(p.categoryIds) ? p.categoryIds : [])), p.categoryId ].filter(Boolean).includes(id)))
    }
    if (searchQuery.value) {
        const q = normalizeSearchText(searchQuery.value)
        result = result.filter(p => normalizeSearchText(p.title).includes(q) || (p.searchKeywords && normalizeSearchText(p.searchKeywords).includes(q)))
    }
    result = result.filter(p => {
        const price = Number(p.price)
        const minMatches = minPriceInput.value == null ? true : price >= Number(minPriceInput.value)
        const maxMatches = maxPriceInput.value == null ? true : price <= Number(maxPriceInput.value)
        return minMatches && maxMatches
    })
    if (sortOption.value === 'priceAsc') {
        result.sort((a, b) => Number(a.price) - Number(b.price))
    } else if (sortOption.value === 'priceDesc') {
        result.sort((a, b) => Number(b.price) - Number(a.price))
    }
    return result
})

const {
    currentPage,
    totalPages,
    pageNumbers,
    paginatedProducts,
    canGoPrev,
    canGoNext,
    goToPage,
    goToPrevPage,
    goToNextPage
} = useProductPagination(filteredProducts, 12)


const pageTitle = computed(() => {
    const content = storefrontContent.value
    if (selectedCategories.value.length === 1) {
        const cat = filters.value.categories.find(c => c.id === selectedCategories.value[0])
        return cat ? cat.title : content.shop.catalogTitle
    }
    if (selectedCategories.value.length > 1) return content.shop.filteredTitle
    return content.shop.catalogTitle
})

const isFilterDrawerOpen = ref(false)

const toggleCategory = (catId: string) => {
    const idx = selectedCategories.value.indexOf(catId)
    if (idx === -1) selectedCategories.value.push(catId)
    else selectedCategories.value.splice(idx, 1)
}

const removeCategory = (catId: string) => {
    const idx = selectedCategories.value.indexOf(catId)
    if (idx !== -1) selectedCategories.value.splice(idx, 1)
}

const resetFilters = () => {
    selectedCategories.value = []
    searchQuery.value = ''
    sortOption.value = 'relevance'
    minPriceInput.value = null
    maxPriceInput.value = null
}

const openQuickView = (product: any) => {
    quickViewProduct.value = product
    isQuickViewOpen.value = true
}

const closeQuickView = () => {
    isQuickViewOpen.value = false
    quickViewProduct.value = null
}
</script>

<template>
  <div class="min-h-screen py-8 lg:py-12 relative" style="background-color:#0E1117; font-family:'Cormorant Garamond',serif;">
    <!-- Mobile Filter Drawer Overlay -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-in-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300 ease-in-out"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isFilterDrawerOpen"
        class="fixed inset-0 bg-black/70 z-40 lg:hidden"
        @click="isFilterDrawerOpen = false"
      />
    </Transition>

    <!-- Mobile Filter Drawer -->
    <Transition
      enter-active-class="transition-transform duration-300 ease-in-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300 ease-in-out"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="isFilterDrawerOpen"
        class="fixed inset-y-0 right-0 w-[300px] bg-[#0B0E16] z-50 shadow-2xl p-6 overflow-y-auto lg:hidden border-l border-[#A67C52]/10"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-bold text-[#A67C52] text-lg tracking-wider uppercase">
            {{ storefrontContent.actions.filters }}
          </h3>
          <button class="p-2 -mr-2 text-gray-500 hover:text-[#A67C52]" @click="isFilterDrawerOpen = false">
            <Icon name="lucide:x" class="w-6 h-6" />
          </button>
        </div>
            
        <div class="space-y-8">
          <div>
            <h4 class="font-bold text-[#A67C52] mb-4 text-xs uppercase tracking-[0.2em]">{{ storefrontContent.shop.categories }}</h4>
            <div class="space-y-3">
              <label v-for="cat in filters.categories" :key="cat.id" class="flex items-center gap-3 cursor-pointer group select-none">
                <input v-model="selectedCategories" type="checkbox" :value="cat.id" class="peer h-5 w-5 border-[#A67C52]/30 bg-transparent text-[#A67C52] focus:ring-[#A67C52]" style="border-radius: 2px;" >
                <span class="text-base text-gray-400 group-hover:text-[#A67C52] transition-colors">{{ categoryDisplayTitle(cat) }}</span>
              </label>
            </div>
          </div>

          <div class="mb-6">
            <StorefrontPriceRangeFilter
              v-model:min-price="minPriceInput"
              v-model:max-price="maxPriceInput"
              :min-bound="priceRange.min"
              :max-bound="priceRange.max"
              :step="1"
            />
          </div>
                 
          <div class="pt-8 mt-4 sticky bottom-0 bg-[#0B0E16] pb-safe">
            <button class="w-full py-3 bg-[#A67C52] text-black font-bold tracking-wider uppercase active:scale-95 transition-transform" style="border-radius: 2px;" @click="isFilterDrawerOpen = false">
              {{ storefrontContent.shop.showResults(filteredProducts.length) }}
            </button>
          </div>
        </div>
      </aside>
    </Transition>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="mb-8 lg:mb-10">
        <div class="flex flex-wrap gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
          <button
            class="px-5 py-2 bg-[#A67C52] text-black text-sm font-bold tracking-wider uppercase hover:bg-[#d4b85c] transition-colors whitespace-nowrap"
            style="border-radius: 2px;"
            @click="resetFilters"
          >
            {{ storefrontContent.shop.allProducts }}
          </button>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-10">
        <!-- Desktop Sidebar -->
        <aside class="hidden lg:block w-64 flex-shrink-0 space-y-8 bg-[#0B0E16] p-6 border border-[#A67C52]/10 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 custom-scrollbar" style="border-radius: 2px;">
          <div class="flex items-center justify-between mb-4 border-b border-[#A67C52]/10 pb-4">
            <h3 class="font-bold text-[#A67C52] text-lg tracking-wider uppercase">{{ storefrontContent.actions.filters }}</h3>
            <button class="text-xs font-semibold text-[#A67C52] hover:text-white uppercase tracking-wide" @click="resetFilters">{{ storefrontContent.actions.reset }}</button>
          </div>

          <div>
            <h4 class="font-bold text-[#A67C52] mb-4 text-xs uppercase tracking-[0.2em]">{{ storefrontContent.shop.categories }}</h4>
            <div class="space-y-3">
              <label v-for="cat in filters.categories" :key="cat.id" class="flex items-center gap-3 cursor-pointer group select-none">
                <input v-model="selectedCategories" type="checkbox" :value="cat.id" class="peer h-4 w-4 border-[#A67C52]/30 bg-transparent text-[#A67C52] focus:ring-[#A67C52]" style="border-radius: 2px;" >
                <span class="text-sm text-gray-400 group-hover:text-[#A67C52] transition-colors">{{ categoryDisplayTitle(cat) }}</span>
              </label>
            </div>
          </div>

          <div>
            <h4 class="font-bold text-[#A67C52] mb-4 text-xs uppercase tracking-[0.2em]">{{ storefrontContent.shop.priceRange.label }}</h4>
            <StorefrontPriceRangeFilter
              v-model:min-price="minPriceInput"
              v-model:max-price="maxPriceInput"
              :min-bound="priceRange.min"
              :max-bound="priceRange.max"
              :step="1"
            />
          </div>

          <!-- Best Sellers Widget -->
          <div class="pt-8 border-t border-[#A67C52]/10">
            <h4 class="font-bold text-[#A67C52] mb-4 text-xs uppercase tracking-[0.2em]">{{ storefrontContent.shop.sidebar.bestSellers }}</h4>
            <div class="space-y-4">
              <NuxtLink v-for="p in sidebarProducts" :key="p.id" :to="`/product/${p.slug}`" class="flex gap-3 group">
                <div class="w-16 h-16 bg-[#131720] overflow-hidden flex-shrink-0 border border-[#A67C52]/10" style="border-radius: 2px;">
                  <img :src="p.images && p.images[0] ? p.images[0] : '/blank.svg?v=2'" class="w-full h-full object-cover group-hover:scale-110 transition-transform" :alt="p.title" >
                </div>
                <div>
                  <h5 class="text-sm font-bold text-gray-300 line-clamp-2 group-hover:text-[#A67C52] transition-colors">{{ p.title }}</h5>
                  <span class="text-xs font-semibold text-[#A67C52]">{{ formatCurrency(p.price) }}</span>
                </div>
              </NuxtLink>
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <div class="flex-1">
          <!-- Active Filters -->
          <div v-if="selectedCategories.length > 0" class="flex flex-wrap gap-2 mb-6">
              <div v-for="catId in selectedCategories" :key="catId" class="flex items-center gap-2 px-3 py-1.5 bg-[#A67C52]/10 text-[#A67C52] text-sm font-semibold border border-[#A67C52]/20" style="border-radius: 2px;">
                <span>{{ categoryDisplayTitle(filters.categories.find(c => c.id === catId)) || storefrontContent.shop.categoryFallback }}</span>
                <button @click="removeCategory(catId)" class="hover:text-white"><Icon name="lucide:x" class="w-4 h-4" /></button>
              </div>
              <button @click="resetFilters" class="text-sm text-gray-500 hover:text-[#A67C52] underline underline-offset-2">{{ storefrontContent.actions.clearAll }}</button>
          </div>

          <!-- Toolbar -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <button class="w-full sm:hidden flex items-center justify-center gap-2 px-4 py-3 bg-[#0B0E16] border border-[#A67C52]/20 text-[#A67C52] font-bold active:scale-95 transition-all" style="border-radius: 2px;" @click="isFilterDrawerOpen = true">
              <Icon name="lucide:sliders-horizontal" class="w-5 h-5" />
              {{ storefrontContent.shop.filtersAndSort }}
            </button>

            <div class="relative max-w-md w-full">
              <input v-model="searchQuery" type="text" :placeholder="storefrontContent.shop.searchWithinResultsPlaceholder" class="w-full bg-[#0B0E16] border border-[#A67C52]/20 text-gray-300 text-sm focus:ring-2 focus:ring-[#A67C52]/30 focus:border-[#A67C52] block pl-5 pr-10 py-3 transition-shadow placeholder:text-gray-600" style="border-radius: 2px;" >
              <div class="absolute inset-y-0 end-0 flex items-center pe-4 pointer-events-none">
                <Icon name="lucide:search" class="w-5 h-5 text-gray-600" />
              </div>
            </div>

            <div class="hidden sm:flex items-center gap-3 w-full sm:w-auto">
              <span class="text-sm text-gray-500 whitespace-nowrap">{{ storefrontContent.shop.sortBy }}</span>
              <select v-model="sortOption" class="appearance-none bg-[#0B0E16] border border-[#A67C52]/20 text-sm py-3 pl-4 pr-10 focus:border-[#A67C52] focus:ring-[#A67C52] cursor-pointer text-gray-300 font-medium" style="border-radius: 2px;">
                <option value="relevance">{{ storefrontContent.shop.sort.relevance }}</option>
                <option value="priceAsc">{{ storefrontContent.shop.sort.priceLowToHigh }}</option>
                <option value="priceDesc">{{ storefrontContent.shop.sort.priceHighToLow }}</option>
              </select>
            </div>

            <div class="hidden sm:flex items-center bg-[#0B0E16] border border-[#A67C52]/20 p-1" style="border-radius: 2px;">
                <button class="p-2 transition-all" :class="viewMode === 'grid' ? 'bg-[#A67C52]/10 text-[#A67C52]' : 'text-gray-600 hover:text-gray-400'" @click="viewMode = 'grid'" :title="storefrontContent.shop.view.gridTitle">
                    <Icon name="lucide:layout-grid" class="w-5 h-5" />
                </button>
                <button class="p-2 transition-all" :class="viewMode === 'list' ? 'bg-[#A67C52]/10 text-[#A67C52]' : 'text-gray-600 hover:text-gray-400'" @click="viewMode = 'list'" :title="storefrontContent.shop.view.listTitle">
                    <Icon name="lucide:list" class="w-5 h-5" />
                </button>
            </div>
          </div>

          <!-- Grid -->
          <div v-if="filteredProducts.length === 0" class="bg-[#0B0E16] border border-[#A67C52]/10 p-12 text-center" style="border-radius: 2px;">
            <Icon name="lucide:package-open" class="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-white">{{ storefrontContent.shop.results.noResults }}</h3>
            <p class="text-gray-500 mt-1">{{ storefrontContent.shop.results.noResultsHint }}</p>
            <button class="mt-6 px-6 py-2 bg-[#A67C52] text-black font-bold tracking-wider uppercase hover:bg-[#d4b85c] transition-colors" style="border-radius: 2px;" @click="resetFilters">{{ storefrontContent.actions.clearAll }}</button>
          </div>

          <div v-else :class="[viewMode === 'list' ? 'flex flex-col gap-4' : 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-y-10']">
            <ProductCard v-for="product in paginatedProducts" :key="product.id" :product="product" :view-mode="viewMode" @quick-view="openQuickView" />
          <StorefrontProductPagination
            :current-page="currentPage"
            :total-pages="totalPages"
            :page-numbers="pageNumbers"
            :can-go-prev="canGoPrev"
            :can-go-next="canGoNext"
            @go-to-page="goToPage"
            @go-prev="goToPrevPage"
            @go-next="goToNextPage"
          />

          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Quick View Modal -->
  <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
  >
      <div v-if="isQuickViewOpen && quickViewProduct" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="closeQuickView"></div>
          <div class="bg-[#0B0E16] border border-[#A67C52]/20 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-10 flex flex-col md:flex-row overflow-hidden" style="border-radius: 2px;">
              <button @click="closeQuickView" class="absolute top-4 right-4 z-20 p-2 bg-black/50 border border-[#A67C52]/20 hover:bg-[#A67C52] hover:text-black transition-colors" style="border-radius: 2px;">
                  <Icon name="lucide:x" class="w-6 h-6 text-[#A67C52]" />
              </button>
              
              <div class="w-full md:w-1/2 aspect-square md:aspect-auto bg-[#131720] relative">
                  <img :src="quickViewProduct.images && quickViewProduct.images[0] ? quickViewProduct.images[0] : '/blank.svg?v=2'" class="w-full h-full object-cover" >
              </div>
              <div class="w-full md:w-1/2 p-8 md:p-12 flex flex-col" style="background-color:#0E1117; font-family:'Cormorant Garamond',serif;">
                  <div>
                    <span class="inline-block px-3 py-1 bg-[#A67C52]/10 text-[#A67C52] text-xs font-bold uppercase tracking-[0.2em] mb-4 border border-[#A67C52]/20" style="border-radius: 2px;">{{ storefrontContent.product.inStock }}</span>
                    <h2 class="text-3xl font-bold text-white mb-2">{{ quickViewProduct.title }}</h2>
                    <div class="text-2xl font-bold text-[#A67C52] mb-6 flex items-center gap-3">{{ formatCurrency(quickViewProduct.price) }}</div>
                    <p class="text-gray-400 leading-relaxed mb-8">{{ quickViewProduct.description || storefrontContent.product.descriptionFallback }}</p>
                  </div>

                  <div class="mt-auto space-y-4">
                      <button class="w-full py-4 bg-[#A67C52] text-black font-bold tracking-wider uppercase hover:bg-[#d4b85c] transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2" style="border-radius: 2px;">
                        <Icon name="lucide:handbag" class="w-5 h-5" />
                        {{ storefrontContent.actions.addToCart }}
                      </button>
                      <NuxtLink :to="`/product/${quickViewProduct.slug}`" class="block w-full py-4 border border-[#A67C52]/30 text-[#A67C52] font-bold tracking-wider uppercase hover:bg-[#A67C52]/10 transition-colors text-center" style="border-radius: 2px;" @click="closeQuickView">
                        {{ storefrontContent.product.viewFullDetails }}
                      </NuxtLink>
                  </div>
              </div>
          </div>
      </div>
  </Transition>
</template>
