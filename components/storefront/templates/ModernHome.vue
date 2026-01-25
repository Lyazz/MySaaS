<script setup lang="ts">
defineProps<{
  tenantName: string
  featuredProducts: any[]
  pending: boolean
}>()
</script>

<template>
  <div class="bg-slate-50 min-h-[calc(100vh-theme('spacing.20'))]">
    <section class="relative overflow-hidden pt-12 pb-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <p class="text-sm font-semibold text-brand tracking-wide uppercase">New storefront</p>
            <h1 class="mt-3 text-4xl md:text-6xl font-display font-bold text-slate-900 tracking-tight">
              {{ tenantName }}
            </h1>
            <p class="mt-4 text-lg text-slate-600 leading-relaxed">
              A modern shopping experience with your brand identity applied everywhere.
            </p>
            <div class="mt-8 flex flex-col sm:flex-row gap-3">
              <NuxtLink
                to="/products"
                class="inline-flex items-center justify-center px-6 py-3 rounded-xl text-white bg-brand hover:opacity-90 shadow-sm font-medium"
              >
                Browse products
              </NuxtLink>
              <NuxtLink
                to="/products"
                class="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-medium"
              >
                View categories
              </NuxtLink>
            </div>
          </div>

          <div class="relative">
            <div class="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-slate-700">Featured</p>
                <div class="h-2.5 w-2.5 rounded-full bg-brand"></div>
              </div>
              <div class="mt-5">
                <div v-if="pending" class="py-10 text-center">
                  <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                  <p class="mt-2 text-slate-500">Loading…</p>
                </div>
                <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ProductCard v-for="product in featuredProducts.slice(0, 4)" :key="product.id" :product="product" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

