<script setup lang="ts">
import ProductCard from './ProductCard.vue'

const props = defineProps<{
    category: any
    products: any[]
}>()

const { format: formatPrice } = useCurrency()

// Filtering Logic
const sortOption = ref('Relevance')
const viewMode = ref<'grid' | 'list'>('grid')

const quickViewProduct = ref<any>(null)
const isQuickViewOpen = ref(false)

const filteredProducts = computed(() => {
    let result = [...props.products]

    if (sortOption.value === 'Price: Low to High') {
        result.sort((a, b) => Number(a.price) - Number(b.price))
    } else if (sortOption.value === 'Price: High to Low') {
        result.sort((a, b) => Number(b.price) - Number(a.price))
    }

    return result
})

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
  <div class="synthwave-category min-h-screen py-12 font-sans relative">
    <!-- Synthwave Background -->
    <div class="fixed inset-0 z-0 pointer-events-none">
      <div class="absolute inset-0 bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0515]"></div>
      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[40%] bg-gradient-to-t from-[#ff2d95]/15 via-[#ff6b35]/5 to-transparent"></div>
      <div class="absolute bottom-0 left-0 right-0 h-[30%] bg-[linear-gradient(rgba(255,45,149,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,45,149,0.1)_1px,transparent_1px)] bg-[size:30px_30px] [perspective:500px] [transform:rotateX(60deg)] origin-bottom opacity-40"></div>
    </div>

    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-10">
        <nav class="flex items-center text-sm text-purple-300/60 mb-4 font-medium">
          <NuxtLink to="/" class="hover:text-pink-400 transition-colors">Home</NuxtLink>
          <Icon name="lucide:chevron-right" class="w-4 h-4 mx-2 text-purple-500/50" />
          <NuxtLink to="/products" class="hover:text-pink-400 transition-colors">Shop</NuxtLink>
          <Icon name="lucide:chevron-right" class="w-4 h-4 mx-2 text-purple-500/50" />
          <span class="text-pink-400 font-semibold">{{ category?.title }}</span>
        </nav>

        <h1 class="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 mb-4">
          {{ category?.title }}
        </h1>
        <p v-if="category?.description" class="text-purple-200/60 text-lg max-w-2xl">
          {{ category.description }}
        </p>
      </div>

      <!-- Toolbar -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <p class="text-purple-300/60 text-sm">
          {{ filteredProducts.length }} products found
        </p>

        <div class="flex items-center gap-4">
          <!-- Sort -->
          <div class="relative">
            <select
              v-model="sortOption"
              class="appearance-none bg-[#1a0a2e]/90 rounded-full border border-purple-500/30 text-sm py-2 pl-4 pr-10 focus:border-pink-500 focus:ring-pink-500 cursor-pointer hover:border-pink-500/50 transition-colors text-white font-medium"
            >
              <option class="bg-[#1a0a2e]">Relevance</option>
              <option class="bg-[#1a0a2e]">Price: Low to High</option>
              <option class="bg-[#1a0a2e]">Price: High to Low</option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Icon name="lucide:chevron-down" class="w-4 h-4 text-purple-400" />
            </div>
          </div>

          <!-- View Toggle -->
          <div class="flex items-center bg-[#1a0a2e]/90 rounded-full border border-purple-500/30 p-1">
            <button
              class="p-2 rounded-full transition-all"
              :class="viewMode === 'grid' ? 'bg-pink-500/30 text-pink-400' : 'text-purple-400/60 hover:text-purple-300'"
              @click="viewMode = 'grid'"
            >
              <Icon name="lucide:layout-grid" class="w-5 h-5" />
            </button>
            <button
              class="p-2 rounded-full transition-all"
              :class="viewMode === 'list' ? 'bg-pink-500/30 text-pink-400' : 'text-purple-400/60 hover:text-purple-300'"
              @click="viewMode = 'list'"
            >
              <Icon name="lucide:list" class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Products Grid -->
      <div
        v-if="filteredProducts.length === 0"
        class="bg-[#1a0a2e]/90 rounded-2xl border border-purple-500/30 p-12 text-center"
      >
        <Icon name="lucide:package-open" class="w-16 h-16 text-purple-500/30 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-white">No products in this category</h3>
        <p class="text-purple-300/60 mt-1">Check back soon for new arrivals.</p>
        <NuxtLink
          to="/products"
          class="mt-6 inline-block px-6 py-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-full hover:from-pink-600 hover:to-orange-600 transition-all font-bold"
        >
          Browse All Products
        </NuxtLink>
      </div>

      <div
        v-else
        :class="[
          viewMode === 'list'
            ? 'flex flex-col gap-4'
            : 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'
        ]"
      >
        <ProductCard
          v-for="product in filteredProducts"
          :key="product.id"
          :product="product"
          :view-mode="viewMode"
          @quick-view="openQuickView"
        />
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
        <div class="bg-gradient-to-br from-[#1a0a2e] to-[#0d0515] rounded-2xl shadow-2xl shadow-pink-500/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-10 flex flex-col md:flex-row overflow-hidden border border-pink-500/30">
          <button @click="closeQuickView" class="absolute top-4 right-4 z-20 p-2 bg-purple-900/50 rounded-full hover:bg-pink-500/30 transition-colors">
            <Icon name="lucide:x" class="w-6 h-6 text-purple-300" />
          </button>

          <div class="w-full md:w-1/2 aspect-square md:aspect-auto bg-purple-900/30 relative">
            <img
              :src="quickViewProduct.images && quickViewProduct.images[0] ? quickViewProduct.images[0] : 'https://placehold.co/600x600'"
              class="w-full h-full object-cover"
            >
          </div>
          <div class="w-full md:w-1/2 p-8 md:p-12 flex flex-col">
            <div>
              <h2 class="text-3xl font-bold text-white mb-2">{{ quickViewProduct.title }}</h2>
              <div class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 mb-6">
                {{ formatPrice(quickViewProduct.price) }}
              </div>
              <p class="text-purple-200/70 leading-relaxed mb-8">
                {{ quickViewProduct.description || 'Premium quality product.' }}
              </p>
            </div>

            <div class="mt-auto space-y-4">
              <NuxtLink :to="`/p/${quickViewProduct.slug}`" class="block w-full py-4 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold rounded-xl text-center" @click="closeQuickView">
                View Details
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.synthwave-category {
    font-family: 'Inter', system-ui, sans-serif;
}
</style>
