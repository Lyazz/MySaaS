<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/arena/ProductCard.vue'

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
const searchQuery = ref('')
const sortOption = ref<'relevance' | 'priceAsc' | 'priceDesc'>('relevance')
const viewMode = ref<'grid' | 'list'>('grid')

const priceRange = computed(() => {
    const prices = props.products
        .map((product) => Number(product?.price))
        .filter((price): price is number => Number.isFinite(price))
    if (prices.length === 0) return { min: 0, max: 0 }
    return { min: Math.min(...prices), max: Math.max(...prices) }
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
        result = result.filter(p => selectedIds.some((id) => [...((Array.isArray(p.categoryIds) ? p.categoryIds : [])), p.categoryId].filter(Boolean).includes(id)))
    }
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(p => p.title.toLowerCase().includes(q))
    }
    result = result.filter(p => {
        const price = Number(p.price)
        const minMatches = minPriceInput.value == null ? true : price >= Number(minPriceInput.value)
        const maxMatches = maxPriceInput.value == null ? true : price <= Number(maxPriceInput.value)
        return minMatches && maxMatches
    })
    if (sortOption.value === 'priceAsc') result.sort((a, b) => Number(a.price) - Number(b.price))
    else if (sortOption.value === 'priceDesc') result.sort((a, b) => Number(b.price) - Number(a.price))
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
const mobileCategoriesDropdownOpen = ref(true)
const desktopCategoriesDropdownOpen = ref(true)

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
  <div class="bg-[#06080c] min-h-screen text-slate-300">
    <!-- HUD page header strip -->
    <div class="border-b border-white/[0.06] bg-black">
      <div class="h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-60" />
      <div class="max-w-[1400px] mx-auto px-5 lg:px-10 py-12 lg:py-16">
        <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <div>
            <p class="flex items-center gap-3 mb-4">
              <span class="w-8 h-px bg-brand-500" />
            </p>
            <h1 class="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-[-0.04em] text-white leading-[0.92]">
              {{ pageTitle }}
            </h1>
          </div>

        </div>
      </div>
    </div>

    <!-- Mobile filter drawer overlay -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isFilterDrawerOpen" class="fixed inset-0 bg-black/70 z-40 lg:hidden" @click="isFilterDrawerOpen = false" />
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-300"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="isFilterDrawerOpen"
        class="fixed inset-y-0 right-0 w-[88%] max-w-sm bg-[#0b0f14] z-50 shadow-2xl border-l border-brand-500/20 flex flex-col overflow-y-auto lg:hidden"
      >
        <div class="h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
        <div class="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <h3 class="text-[12px] font-black uppercase tracking-[0.28em] text-brand-500">{{ storefrontContent.actions.filters }}</h3>
          <button class="h-8 w-8 flex items-center justify-center text-slate-400" @click="isFilterDrawerOpen = false">
            <Icon name="lucide:x" class="w-5 h-5" />
          </button>
        </div>

        <div class="flex-1 px-6 py-6 space-y-8">
          <div>
            <button type="button" class="w-full flex items-center justify-between mb-4" @click="mobileCategoriesDropdownOpen = !mobileCategoriesDropdownOpen">
              <h4 class="text-[10px] font-black uppercase tracking-[0.32em] text-white">{{ storefrontContent.shop.categories }}</h4>
              <Icon name="lucide:chevron-down" class="w-4 h-4 text-slate-400 transition-transform" :class="mobileCategoriesDropdownOpen ? 'rotate-180' : ''" />
            </button>
            <div v-show="mobileCategoriesDropdownOpen" class="space-y-2.5">
              <label v-for="cat in filters.categories" :key="cat.id" class="flex items-center gap-3 cursor-pointer group select-none py-1">
                <input v-model="selectedCategories" type="checkbox" :value="cat.id" class="h-4 w-4 bg-transparent border border-white/20 text-brand-500 focus:ring-brand-500 focus:ring-offset-0 transition-all checked:bg-brand-500 checked:border-brand-500" />
                <span class="text-sm text-slate-300 group-hover:text-brand-500 transition-colors">{{ categoryDisplayTitle(cat) }}</span>
              </label>
            </div>
          </div>

          <div>
            <h4 class="text-[10px] font-black uppercase tracking-[0.32em] text-white mb-4">{{ storefrontContent.shop.priceRange.label }}</h4>
            <StorefrontPriceRangeFilter v-model:min-price="minPriceInput" v-model:max-price="maxPriceInput" :min-bound="priceRange.min" :max-bound="priceRange.max" :step="1" />
          </div>
        </div>

        <div class="px-6 py-4 border-t border-white/[0.06] bg-[#0b0f14]">
          <button
            class="w-full py-3.5 bg-brand-500 text-[#02060a] text-[11px] font-black uppercase tracking-[0.22em] hover:bg-white transition-colors [clip-path:polygon(4%_0,100%_0,96%_100%,0_100%)]"
            @click="isFilterDrawerOpen = false"
          >
            {{ storefrontContent.shop.showResults(filteredProducts.length) }}
          </button>
        </div>
      </aside>
    </Transition>

    <div class="max-w-[1400px] mx-auto px-5 lg:px-10 py-10 lg:py-14">
      <!-- Quick filter chips -->
      <div class="flex flex-wrap gap-2 mb-8 -mx-5 px-5 overflow-x-auto scrollbar-hide lg:mx-0 lg:px-0">
        <button
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-[#02060a] text-[10px] font-black uppercase tracking-[0.22em] hover:bg-white transition-colors whitespace-nowrap [clip-path:polygon(6%_0,100%_0,94%_100%,0_100%)]"
          @click="resetFilters"
        >
          <Icon name="lucide:layers" class="w-3.5 h-3.5" />
          {{ storefrontContent.shop.allProducts }}
        </button>
      </div>

      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Desktop sidebar with corner brackets -->
        <aside class="hidden lg:block w-72 flex-shrink-0">
          <div class="relative bg-[#0b0f14] border border-white/[0.06] sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto custom-scrollbar">
            <!-- Corner brackets -->
            <span class="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-brand-500" />
            <span class="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-brand-500" />

            <div class="p-6">
              <div class="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
                <h3 class="text-[10px] font-black uppercase tracking-[0.32em] text-brand-500">{{ storefrontContent.actions.filters }}</h3>
                <button class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 hover:text-brand-500 transition-colors" @click="resetFilters">
                  {{ storefrontContent.actions.reset }}
                </button>
              </div>

              <div class="mb-8">
                <button type="button" class="w-full flex items-center justify-between mb-4" @click="desktopCategoriesDropdownOpen = !desktopCategoriesDropdownOpen">
                  <h4 class="text-[10px] font-black uppercase tracking-[0.28em] text-white">{{ storefrontContent.shop.categories }}</h4>
                  <Icon name="lucide:chevron-down" class="w-4 h-4 text-slate-500 transition-transform" :class="desktopCategoriesDropdownOpen ? 'rotate-180' : ''" />
                </button>
                <div v-show="desktopCategoriesDropdownOpen" class="space-y-2.5">
                  <label v-for="cat in filters.categories" :key="cat.id" class="flex items-center gap-3 cursor-pointer group select-none">
                    <input v-model="selectedCategories" type="checkbox" :value="cat.id" class="h-4 w-4 bg-transparent border border-white/20 text-brand-500 focus:ring-0 focus:ring-offset-0 transition-all checked:bg-brand-500 checked:border-brand-500" />
                    <span class="text-sm text-slate-300 group-hover:text-brand-500 transition-colors">{{ categoryDisplayTitle(cat) }}</span>
                  </label>
                </div>
              </div>

              <div class="mb-8 pt-6 border-t border-white/[0.06]">
                <h4 class="text-[10px] font-black uppercase tracking-[0.28em] text-white mb-4">{{ storefrontContent.shop.priceRange.label }}</h4>
                <StorefrontPriceRangeFilter v-model:min-price="minPriceInput" v-model:max-price="maxPriceInput" :min-bound="priceRange.min" :max-bound="priceRange.max" :step="1" />
              </div>

              <div class="pt-6 border-t border-white/[0.06]">
                <h4 class="text-[10px] font-black uppercase tracking-[0.28em] text-white mb-4">{{ storefrontContent.shop.sidebar.bestSellers }}</h4>
                <div class="space-y-3">
                  <NuxtLink v-for="p in sidebarProducts" :key="p.id" :to="`/product/${p.slug}`" class="flex gap-3 group p-2 -mx-2 hover:bg-white/[0.03] transition-colors">
                    <div class="w-14 h-14 bg-[#04060a] overflow-hidden flex-shrink-0">
                      <img :src="p.images && p.images[0] ? p.images[0] : '/blank.svg?v=2'" class="w-full h-full object-cover group-hover:scale-110 transition-transform" :alt="p.title" />
                    </div>
                    <div class="min-w-0">
                      <h5 class="text-xs font-black uppercase tracking-[0.04em] text-white line-clamp-2 group-hover:text-brand-500 transition-colors">{{ p.title }}</h5>
                      <span class="text-[11px] font-bold text-brand-500">{{ formatCurrency(p.price) }}</span>
                    </div>
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div class="flex-1 min-w-0">
          <!-- Active filter chips -->
          <div v-if="selectedCategories.length > 0" class="flex flex-wrap gap-2 mb-6">
            <div
              v-for="catId in selectedCategories"
              :key="catId"
              class="flex items-center gap-2 px-3 py-1.5 bg-brand-500/10 text-brand-500 text-[10px] font-black uppercase tracking-[0.22em] border border-brand-500/30"
            >
              <span>{{ categoryDisplayTitle(filters.categories.find(c => c.id === catId)) || storefrontContent.shop.categoryFallback }}</span>
              <button @click="removeCategory(catId)" class="hover:text-white">
                <Icon name="lucide:x" class="w-3.5 h-3.5" />
              </button>
            </div>
            <button @click="resetFilters" class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 hover:text-brand-500 underline underline-offset-4">
              {{ storefrontContent.actions.clearAll }}
            </button>
          </div>

          <!-- Toolbar -->
          <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
            <button
              class="w-full sm:hidden flex items-center justify-center gap-2 px-4 py-3 bg-[#0b0f14] border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.22em] active:scale-95 transition-transform"
              @click="isFilterDrawerOpen = true"
            >
              <Icon name="lucide:sliders-horizontal" class="w-4 h-4" />
              {{ storefrontContent.shop.filtersAndSort }}
            </button>

            <div class="relative flex-1 max-w-md">
              <input
                v-model="searchQuery"
                type="text"
                :placeholder="storefrontContent.shop.searchWithinResultsPlaceholder"
                class="w-full bg-[#0b0f14] border border-white/10 text-white text-sm pl-4 pr-10 py-3 outline-none focus:border-brand-500 placeholder:text-slate-600 uppercase tracking-wider"
              />
              <Icon name="lucide:search" class="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>

            <div class="hidden sm:flex items-center gap-2">
              <span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 whitespace-nowrap">{{ storefrontContent.shop.sortBy }}</span>
              <div class="relative">
                <select
                  v-model="sortOption"
                  class="appearance-none bg-[#0b0f14] border border-white/10 text-white text-xs font-bold uppercase tracking-[0.14em] py-3 pl-4 pr-10 outline-none focus:border-brand-500 cursor-pointer"
                >
                  <option value="relevance">{{ storefrontContent.shop.sort.relevance }}</option>
                  <option value="priceAsc">{{ storefrontContent.shop.sort.priceLowToHigh }}</option>
                  <option value="priceDesc">{{ storefrontContent.shop.sort.priceHighToLow }}</option>
                </select>
                <Icon name="lucide:chevron-down" class="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div class="hidden sm:flex items-center bg-[#0b0f14] border border-white/10">
              <button
                class="h-10 w-10 flex items-center justify-center transition-colors"
                :class="viewMode === 'grid' ? 'bg-brand-500 text-[#02060a]' : 'text-slate-500 hover:text-white'"
                @click="viewMode = 'grid'"
                :title="storefrontContent.shop.view.gridTitle"
              >
                <Icon name="lucide:layout-grid" class="w-4 h-4" />
              </button>
              <button
                class="h-10 w-10 flex items-center justify-center transition-colors"
                :class="viewMode === 'list' ? 'bg-brand-500 text-[#02060a]' : 'text-slate-500 hover:text-white'"
                @click="viewMode = 'list'"
                :title="storefrontContent.shop.view.listTitle"
              >
                <Icon name="lucide:list" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-if="filteredProducts.length === 0"
            class="relative bg-[#0b0f14] border border-white/[0.06] p-16 text-center"
          >
            <span class="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-brand-500" />
            <span class="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-brand-500" />
            <Icon name="lucide:package-x" class="w-12 h-12 text-brand-500 mx-auto mb-5" />
            <h3 class="text-xl font-black uppercase tracking-[-0.01em] text-white">{{ storefrontContent.shop.results.noResults }}</h3>
            <p class="text-sm text-slate-500 mt-2">{{ storefrontContent.shop.results.noResultsHint }}</p>
            <button
              class="mt-8 inline-flex items-center gap-2 bg-brand-500 text-[#02060a] px-6 py-3 text-[10px] font-black uppercase tracking-[0.22em] hover:bg-white transition-colors [clip-path:polygon(6%_0,100%_0,94%_100%,0_100%)]"
              @click="resetFilters"
            >
              {{ storefrontContent.actions.clearAll }}
            </button>
          </div>

          <div
            v-else
            :class="[
              viewMode === 'list'
                ? 'flex flex-col gap-4'
                : 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5'
            ]"
          >
            <ProductCard
              v-for="product in paginatedProducts"
              :key="product.id"
              :product="product"
              :view-mode="viewMode"
              @quick-view="openQuickView"
            />
          </div>

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

    <!-- Quick view modal -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="isQuickViewOpen && quickViewProduct" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="closeQuickView" />
        <div class="relative bg-[#0b0f14] border border-white/[0.08] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row z-10">
          <span class="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-brand-500" />
          <span class="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-brand-500" />
          <span class="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-brand-500" />
          <span class="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-brand-500" />

          <button @click="closeQuickView" class="absolute top-4 right-4 z-20 h-9 w-9 flex items-center justify-center bg-black/70 border border-white/15 text-slate-400 hover:border-brand-500 hover:text-brand-500 transition-colors">
            <Icon name="lucide:x" class="w-4 h-4" />
          </button>

          <div class="w-full md:w-1/2 aspect-square md:aspect-auto bg-[#04060a] relative">
            <img :src="quickViewProduct.images && quickViewProduct.images[0] ? quickViewProduct.images[0] : '/blank.svg?v=2'" class="w-full h-full object-cover" />
          </div>
          <div class="w-full md:w-1/2 p-8 md:p-10 flex flex-col">
            <p class="text-[10px] font-black uppercase tracking-[0.32em] text-brand-500 mb-3">{{ storefrontContent.product.inStock }}</p>
            <h2 class="text-3xl font-black uppercase tracking-[-0.02em] text-white mb-3 leading-tight">{{ quickViewProduct.title }}</h2>
            <div class="text-2xl font-black text-brand-500 mb-6">{{ formatCurrency(quickViewProduct.price) }}</div>
            <p class="text-sm text-slate-400 leading-relaxed mb-8 flex-1">
              {{ quickViewProduct.description || storefrontContent.product.descriptionFallback }}
            </p>
            <div class="space-y-3">
              <NuxtLink
                :to="`/product/${quickViewProduct.slug}`"
                class="block w-full py-4 bg-brand-500 text-[#02060a] text-center text-[11px] font-black uppercase tracking-[0.22em] hover:bg-white transition-colors [clip-path:polygon(3%_0,100%_0,97%_100%,0_100%)]"
                @click="closeQuickView"
              >
                {{ storefrontContent.product.viewFullDetails }}
              </NuxtLink>
              <button @click="closeQuickView" class="block w-full py-4 border border-white/15 text-slate-300 text-[11px] font-black uppercase tracking-[0.22em] hover:border-brand-500 hover:text-brand-500 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
