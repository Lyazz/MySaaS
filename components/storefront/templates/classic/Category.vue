<script setup lang="ts">
import ProductCard from '~/components/ProductCard.vue'

const props = defineProps<{
    category: any,
    products: any[]
}>()

const categoryProducts = computed(() => {
    // Logic was previously: (products.value ?? []).filter(...)
    // Assuming 'products' passed in are ALREADY filtered or we filter here.
    // The previous page logic filtered client side. We will assume the parent page does the heavy lifting or passes raw list.
    // Let's assume passed products are ALL products and we filter, to match previous behavior exactly.
    const id = props.category.id
    return (props.products ?? []).filter((p: any) => p.isActive && p.stock > 0 && p.categoryId === id)
})
</script>

<template>
  <div class="py-10">
    <div class="max-w-7xl mx-auto px-4">
      <NuxtLink
        to="/products"
        class="text-teal-600 hover:underline mb-6 inline-flex items-center gap-2"
      >
        <span aria-hidden="true">&larr;</span> Back to Products
      </NuxtLink>

      <div
        v-if="category.imageUrl"
        class="relative overflow-hidden rounded-xl border border-slate-200 mb-6 bg-slate-50"
      >
        <img
          :src="category.imageUrl"
          :alt="category.title"
          class="w-full h-52 sm:h-64 object-contain"
        >
        <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        <div class="absolute bottom-0 left-0 p-6 text-white">
          <p class="text-xs uppercase tracking-wide text-white/70 mb-1">
            Category
          </p>
          <h1 class="text-3xl font-bold">
            {{ category.title }}
          </h1>
        </div>
      </div>

      <template v-if="!category.imageUrl">
        <h1 class="text-3xl font-bold text-slate-900 mb-2">
          {{ category.title }}
        </h1>
        <p class="text-slate-600 mb-8">
          Browse products in this category.
        </p>
      </template>

      <div
        v-if="categoryProducts.length === 0"
        class="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center"
      >
        <p class="text-slate-600">
          No products available in this category yet.
        </p>
      </div>

      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        <ProductCard
          v-for="product in categoryProducts"
          :key="product.id"
          :product="product"
        />
      </div>
    </div>
  </div>
</template>
