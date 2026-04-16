<script setup lang="ts">
import ProductCard from './ProductCard.vue'

const props = defineProps<{
  products: any[]
}>()

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: categoryData } = await useFetch<any[]>(categoriesUrl, {
  headers: useTenantApiHeaders(),
  lazy: true
})

const { currencyCode } = useCurrency()
const storefrontContent = useStorefrontContent()

const filters = computed(() => ({ categories: categoryData.value || [] }))

const selectedCategories = ref<string[]>([])
const searchQuery = ref('')
const sortOption = ref<'relevance' | 'priceAsc' | 'priceDesc'>('relevance')
const minPriceInput = ref<number | null>(null)
const maxPriceInput = ref<number | null>(null)
const isFilterDrawerOpen = ref(false)

const filteredProducts = computed(() => {
  let result = [...props.products]
  if (selectedCategories.value.length > 0) {
    result = result.filter(p => selectedCategories.value.includes(p.categoryId))
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(p => p.title.toLowerCase().includes(q))
  }
  result = result.filter(p => {
    const price = Number(p.price)
    const minOk = minPriceInput.value === null || minPriceInput.value === ('' as any) ? true : price >= Number(minPriceInput.value)
    const maxOk = maxPriceInput.value === null || maxPriceInput.value === ('' as any) ? true : price <= Number(maxPriceInput.value)
    return minOk && maxOk
  })
  if (sortOption.value === 'priceAsc') result.sort((a, b) => Number(a.price) - Number(b.price))
  else if (sortOption.value === 'priceDesc') result.sort((a, b) => Number(b.price) - Number(a.price))
  return result
})

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
</script>

<template>
  <div class="min-h-screen pb-24">
    <!-- Page header -->
    <div class="bg-[#F0EBE3] py-12 mb-12 text-center">
      <p class="text-[10px] tracking-[0.3em] uppercase text-[#C17B4E] mb-3">Notre boutique</p>
      <h1 class="font-maison-serif text-4xl md:text-5xl font-semibold text-[#2C2420]">{{ storefrontContent.shop.catalogTitle }}</h1>
    </div>

    <div class="max-w-7xl mx-auto px-6">
      <!-- Mobile filter button -->
      <button
        class="lg:hidden w-full flex items-center justify-center gap-2 px-4 py-3 border border-[#E8E0D4] bg-white text-[#7A6558] text-xs tracking-[0.15em] uppercase mb-6 hover:border-[#C17B4E] transition-colors"
        @click="isFilterDrawerOpen = true"
      >
        <Icon name="lucide:sliders-horizontal" class="w-4 h-4" />
        {{ storefrontContent.actions.filters }}
      </button>

      <div class="flex gap-10">
        <!-- Desktop sidebar -->
        <aside class="hidden lg:block w-56 flex-shrink-0 sticky top-24 h-fit space-y-8">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-[10px] tracking-[0.25em] uppercase font-bold text-[#B0A090]">{{ storefrontContent.actions.filters }}</h3>
            <button class="text-[10px] uppercase tracking-wider text-[#C17B4E] hover:underline" @click="resetFilters">
              {{ storefrontContent.actions.reset }}
            </button>
          </div>

          <!-- Categories -->
          <div>
            <h4 class="text-xs font-medium text-[#2C2420] mb-4">{{ storefrontContent.shop.categories }}</h4>
            <div class="space-y-2">
              <label
                v-for="cat in filters.categories"
                :key="cat.id"
                class="flex items-center gap-3 cursor-pointer group select-none"
              >
                <input
                  v-model="selectedCategories"
                  type="checkbox"
                  :value="cat.id"
                  class="w-4 h-4 border-[#D4C4B4] text-[#C17B4E] focus:ring-[#C17B4E]/30 rounded-none"
                >
                <span class="text-sm text-[#7A6558] group-hover:text-[#2C2420] transition-colors">{{ cat.title }}</span>
              </label>
            </div>
          </div>

          <!-- Price -->
          <div>
            <h4 class="text-xs font-medium text-[#2C2420] mb-4">{{ storefrontContent.shop.priceRange.label }}</h4>
            <div class="flex items-center gap-2">
              <input
                v-model.number="minPriceInput"
                type="number"
                :placeholder="storefrontContent.shop.priceRange.min"
                class="w-full border border-[#E8E0D4] bg-white text-sm py-2 px-3 focus:border-[#C17B4E] outline-none transition-colors"
              >
              <span class="text-[#B0A090] text-xs">—</span>
              <input
                v-model.number="maxPriceInput"
                type="number"
                :placeholder="storefrontContent.shop.priceRange.max"
                class="w-full border border-[#E8E0D4] bg-white text-sm py-2 px-3 focus:border-[#C17B4E] outline-none transition-colors"
              >
            </div>
          </div>
        </aside>

        <!-- Main -->
        <div class="flex-1">
          <!-- Active filters + toolbar -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div class="flex flex-wrap gap-2">
              <div
                v-for="catId in selectedCategories"
                :key="catId"
                class="flex items-center gap-2 px-3 py-1 bg-[#F0EBE3] text-[#7A6558] text-xs tracking-wider uppercase"
              >
                <span>{{ filters.categories.find(c => c.id === catId)?.title }}</span>
                <button @click="removeCategory(catId)" class="hover:text-[#C17B4E]">
                  <Icon name="lucide:x" class="w-3 h-3" />
                </button>
              </div>
            </div>

            <div class="flex items-center gap-4 shrink-0">
              <!-- Search -->
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  :placeholder="storefrontContent.shop.searchWithinResultsPlaceholder"
                  class="border border-[#E8E0D4] bg-white text-sm py-2 pl-4 pr-9 focus:border-[#C17B4E] outline-none transition-colors"
                >
                <Icon name="lucide:search" class="w-4 h-4 text-[#B0A090] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <!-- Sort -->
              <div class="relative">
                <select
                  v-model="sortOption"
                  class="appearance-none border border-[#E8E0D4] bg-white text-xs tracking-wider uppercase py-2 pl-3 pr-8 focus:border-[#C17B4E] outline-none cursor-pointer text-[#7A6558]"
                >
                  <option value="relevance">{{ storefrontContent.shop.sort.relevance }}</option>
                  <option value="priceAsc">{{ storefrontContent.shop.sort.priceLowToHigh }}</option>
                  <option value="priceDesc">{{ storefrontContent.shop.sort.priceHighToLow }}</option>
                </select>
                <Icon name="lucide:chevron-down" class="w-3 h-3 text-[#B0A090] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <p class="text-xs text-[#B0A090] tracking-wider mb-6">{{ filteredProducts.length }} produits</p>

          <!-- Empty -->
          <div v-if="filteredProducts.length === 0" class="border border-[#E8E0D4] bg-white p-16 text-center">
            <Icon name="lucide:sofa" class="w-12 h-12 text-[#D4C4B4] mx-auto mb-4" />
            <p class="font-maison-serif text-xl text-[#2C2420] mb-2">{{ storefrontContent.shop.results.noResults }}</p>
            <p class="text-sm text-[#7A6558] mb-6">{{ storefrontContent.shop.results.noResultsHint }}</p>
            <button
              class="px-6 py-2.5 bg-[#2C2420] text-white text-xs tracking-[0.15em] uppercase hover:bg-[#C17B4E] transition-colors"
              @click="resetFilters"
            >
              {{ storefrontContent.actions.clearAll }}
            </button>
          </div>

          <div v-else class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
            <ProductCard
              v-for="product in filteredProducts"
              :key="product.id"
              :product="product"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile filter drawer -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isFilterDrawerOpen" class="fixed inset-0 bg-black/40 z-[60] lg:hidden" @click="isFilterDrawerOpen = false" />
      </Transition>
      <Transition name="slide-right">
        <aside v-if="isFilterDrawerOpen" class="fixed inset-y-0 right-0 w-80 max-w-full bg-[#FAF8F5] z-[61] p-6 overflow-y-auto lg:hidden shadow-2xl">
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-[10px] tracking-[0.25em] uppercase font-bold text-[#B0A090]">{{ storefrontContent.actions.filters }}</h3>
            <button @click="isFilterDrawerOpen = false" class="text-[#7A6558] hover:text-[#2C2420]">
              <Icon name="lucide:x" class="w-5 h-5" />
            </button>
          </div>
          <div class="space-y-8">
            <div>
              <h4 class="text-xs font-medium text-[#2C2420] mb-4">{{ storefrontContent.shop.categories }}</h4>
              <div class="space-y-3">
                <label v-for="cat in filters.categories" :key="cat.id" class="flex items-center gap-3 cursor-pointer">
                  <input v-model="selectedCategories" type="checkbox" :value="cat.id" class="w-4 h-4 border-[#D4C4B4] text-[#C17B4E] focus:ring-[#C17B4E]/30">
                  <span class="text-sm text-[#7A6558]">{{ cat.title }}</span>
                </label>
              </div>
            </div>
            <button
              class="w-full py-3 bg-[#2C2420] text-white text-xs tracking-[0.15em] uppercase hover:bg-[#C17B4E] transition-colors"
              @click="isFilterDrawerOpen = false"
            >
              {{ storefrontContent.shop.showResults(filteredProducts.length) }}
            </button>
          </div>
        </aside>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.3s ease; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); }
</style>
