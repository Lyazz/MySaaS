<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/arena/ProductCard.vue'

const props = defineProps<{
    category: any,
    products: any[]
}>()

const storefrontContent = useStorefrontContent()

const categoryDisplayTitle = (category: any): string => {
    if (!category) return ""
    return category.parentId ? ("-> " + category.title) : category.title
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
  <div class="bg-[#06080c] min-h-screen text-slate-300">
    <!-- HUD breadcrumb strip -->
    <div class="border-b border-white/[0.06] bg-black">
      <div class="h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-60" />
      <div class="max-w-[1400px] mx-auto px-5 lg:px-10 py-4">
        <nav class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]">
          <NuxtLink to="/" class="text-slate-500 hover:text-brand-500 transition-colors">{{ storefrontContent.nav.home }}</NuxtLink>
          <Icon name="lucide:chevron-right" class="w-3 h-3 text-slate-600" />
          <NuxtLink to="/products" class="text-slate-500 hover:text-brand-500 transition-colors">{{ storefrontContent.nav.shop }}</NuxtLink>
          <Icon name="lucide:chevron-right" class="w-3 h-3 text-slate-600" />
          <span class="text-brand-500">{{ category.title }}</span>
        </nav>
      </div>
    </div>

    <!-- Category hero -->
    <section class="relative bg-black overflow-hidden border-b border-white/[0.06]">
      <img
        v-if="category.imageUrl"
        :src="category.imageUrl"
        :alt="category.title"
        class="absolute inset-0 w-full h-full object-cover opacity-40"
      />
      <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,8,12,0.9)_0%,rgba(6,8,12,0.6)_55%,rgba(6,8,12,0.2)_100%)]" />
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_30%,rgba(0,184,252,0.2),transparent_45%)]" />

      <div class="relative max-w-[1400px] mx-auto px-5 lg:px-10 py-16 lg:py-24 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
        <div class="max-w-2xl">
          <p class="flex items-center gap-3 mb-4">
            <span class="w-8 h-px bg-brand-500" />
            <span class="text-[10px] font-black uppercase tracking-[0.36em] text-brand-500">// {{ storefrontContent.category.label }}</span>
          </p>
          <h1 class="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-[-0.04em] text-white leading-[0.92]">
            {{ category.title }}
          </h1>
          <p class="mt-5 text-sm md:text-base text-slate-400 leading-relaxed max-w-xl">
            {{ category.description || storefrontContent.category.description }}
          </p>
        </div>
        <div class="flex items-center gap-3 border border-brand-500/40 bg-brand-500/5 px-5 py-3 self-start lg:self-end">
          <Icon name="lucide:layers" class="w-4 h-4 text-brand-500" />
          <span class="text-2xl font-black text-white">{{ categoryProducts.length }}</span>
          <span class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{{ storefrontContent.category.productsAvailableLabel }}</span>
        </div>
      </div>
    </section>

    <div class="max-w-[1400px] mx-auto px-5 lg:px-10 py-12">
      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Sidebar -->
        <aside class="w-full lg:w-72 flex-shrink-0">
          <div class="relative bg-[#0b0f14] border border-white/[0.06] p-6 lg:sticky lg:top-24">
            <span class="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-brand-500" />
            <span class="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-brand-500" />

            <button type="button" class="w-full flex items-center justify-between mb-5" @click="categoriesDropdownOpen = !categoriesDropdownOpen">
              <h3 class="text-[10px] font-black uppercase tracking-[0.32em] text-brand-500">// {{ storefrontContent.shop.categories }}</h3>
              <Icon name="lucide:chevron-down" class="w-4 h-4 text-slate-500 transition-transform" :class="categoriesDropdownOpen ? 'rotate-180' : ''" />
            </button>
            <div v-show="categoriesDropdownOpen" class="space-y-1">
              <NuxtLink
                v-for="cat in allCategories"
                :key="cat.id"
                :to="`/category/${cat.slug}`"
                class="flex items-center gap-3 group py-2 px-3 -mx-3 transition-colors border-l-2 hover:bg-white/[0.03]"
                :class="cat.id === category.id ? 'border-brand-500 bg-brand-500/10 text-brand-500' : 'border-transparent text-slate-400 hover:border-white/15 hover:text-white'"
              >
                <span class="text-xs font-mono text-slate-600">{{ String(allCategories?.indexOf(cat) ?? 0).padStart(2, '0').slice(0, 2) }}</span>
                <span class="text-sm font-bold uppercase tracking-[0.04em] flex-1">{{ categoryDisplayTitle(cat) }}</span>
                <Icon v-if="cat.id === category.id" name="lucide:chevron-right" class="w-4 h-4 text-brand-500" />
              </NuxtLink>
            </div>
          </div>
        </aside>

        <div class="flex-1 min-w-0">
          <!-- Toolbar -->
          <div class="bg-[#0b0f14] border border-white/[0.06] mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.32em] text-brand-500 mb-1">// Showing</p>
              <p class="text-sm font-bold uppercase tracking-[0.04em] text-white">{{ storefrontContent.category.showingResults(categoryProducts.length) }}</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 whitespace-nowrap">Sort</span>
              <div class="relative">
                <select
                  v-model="sortOption"
                  class="appearance-none bg-[#06080c] border border-white/10 text-white text-xs font-bold uppercase tracking-[0.14em] py-2.5 pl-4 pr-10 outline-none focus:border-brand-500 cursor-pointer"
                >
                  <option value="mostPopular">{{ storefrontContent.category.sort.mostPopular }}</option>
                  <option value="newest">{{ storefrontContent.category.sort.newest }}</option>
                  <option value="priceLowToHigh">{{ storefrontContent.category.sort.priceLowToHigh }}</option>
                  <option value="priceHighToLow">{{ storefrontContent.category.sort.priceHighToLow }}</option>
                </select>
                <Icon name="lucide:chevron-down" class="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div
            v-if="sortedProducts.length === 0"
            class="relative bg-[#0b0f14] border border-white/[0.06] p-16 text-center"
          >
            <span class="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-brand-500" />
            <span class="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-brand-500" />
            <Icon name="lucide:package-x" class="w-12 h-12 text-brand-500 mx-auto mb-5" />
            <h3 class="text-xl font-black uppercase text-white">{{ storefrontContent.shop.results.noResults }}</h3>
            <p class="text-sm text-slate-500 mt-2">{{ storefrontContent.category.emptyHint }}</p>
            <NuxtLink
              to="/products"
              class="inline-flex items-center mt-8 bg-brand-500 text-[#02060a] px-6 py-3 text-[10px] font-black uppercase tracking-[0.22em] hover:bg-white transition-colors [clip-path:polygon(6%_0,100%_0,94%_100%,0_100%)]"
            >
              {{ storefrontContent.shop.allProducts }}
            </NuxtLink>
          </div>

          <div v-else class="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            <ProductCard v-for="product in sortedProducts" :key="product.id" :product="product" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
