<script setup lang="ts">
defineProps<{
  tenantName: string
  featuredProducts: any[]
  pending: boolean
}>()
</script>

<template>
  <div class="bg-slate-50 min-h-[calc(100vh-theme('spacing.20'))]">
    <!-- Hero Section -->
    <section class="relative overflow-hidden pt-16 pb-24">
      <div class="absolute inset-0 bg-gradient-to-br from-slate-50 to-white/0 pointer-events-none" />
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <span
          class="inline-block py-1 px-3 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-medium mb-6 animate-fadeIn"
        >
          Welcome
        </span>

        <h1 class="text-5xl md:text-7xl font-sans font-bold text-slate-900 tracking-tight mb-6 animate-slideUp">
          <span class="text-brand">{{ tenantName }}</span>
        </h1>

        <p
          class="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-slideUp"
          style="animation-delay: 100ms"
        >
          Discover our premium collection of products. Quality and satisfaction guaranteed.
        </p>

        <div
          class="flex flex-col sm:flex-row gap-4 justify-center animate-slideUp"
          style="animation-delay: 200ms"
        >
          <NuxtLink
            to="/products"
            class="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-xl text-white bg-brand hover:opacity-90 shadow-lg transition-all duration-200 hover:-translate-y-0.5"
          >
            Shop All Products
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Featured Products Grid -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-2xl font-bold text-slate-900">
          Featured Products
        </h2>
        <NuxtLink
          to="/products"
          class="text-brand font-medium hover:opacity-80 flex items-center gap-1 group"
        >
          View all
          <svg
            class="w-4 h-4 transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </NuxtLink>
      </div>

      <div
        v-if="pending"
        class="text-center py-12"
      >
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
        <p class="mt-2 text-slate-500">
          Loading products...
        </p>
      </div>

      <div
        v-else-if="featuredProducts.length === 0"
        class="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-100"
      >
        <svg
          class="w-12 h-12 text-slate-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
        <p class="text-slate-500">
          No products available yet. Check back soon!
        </p>
      </div>

      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        <ProductCard
          v-for="product in featuredProducts"
          :key="product.id"
          :product="product"
          class="animate-fadeIn"
        />
      </div>
    </section>
  </div>
</template>

