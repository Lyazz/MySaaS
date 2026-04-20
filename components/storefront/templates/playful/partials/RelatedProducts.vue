<script setup lang="ts">
import { useCurrency } from '~/composables/useCurrency'

const props = defineProps<{
  products: any[]
}>()

const { format: formatPrice } = useCurrency()

const getProductMainImage = (product: any) => {
  if (product?.productImages && product.productImages.length > 0) {
    const main = product.productImages.find((img: any) => img?.isMain)
    return main?.url || product.productImages[0]?.url
  }
  return product?.images?.[0] || '/blank.svg?v=2'
}
</script>

<template>
  <div v-if="products && products.length > 0" class="mt-16 border-t-3 border-violet-100 pt-12 animate-fade-in-up" style="font-family: 'DM Sans', sans-serif">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-3 mb-8">
        <span class="w-2.5 h-2.5 rounded-full bg-violet-400 inline-block" />
        <span class="w-2 h-2 rounded-full bg-amber-400 inline-block" />
        <h2 class="text-2xl font-black text-stone-900" style="font-family: 'Fredoka', sans-serif">
          {{ $t('storefront.product.youMayAlsoLike') }}
        </h2>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 gap-y-10">
        <NuxtLink
          v-for="(product, index) in products"
          :key="product.id"
          :to="`/p/${product.slug}`"
          class="group flex flex-col"
          :style="{ transform: `rotate(${index % 2 === 1 ? '-0.6deg' : '0.5deg'})`, marginTop: index % 2 === 1 ? '1.5rem' : '0' }"
        >
          <!-- Image -->
          <div class="relative w-full aspect-[4/5] rounded-3xl overflow-hidden border-3 border-violet-100 bg-violet-50 shadow-[0_4px_0_0_#ddd6fe] group-hover:-translate-y-1 group-hover:shadow-[0_8px_0_0_#ddd6fe] transition-all duration-300">
            <img
              :src="getProductMainImage(product)"
              :alt="product.title"
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            >
          </div>

          <!-- Info card overlapping image -->
          <div class="-mt-5 mx-2 bg-white rounded-3xl border-3 border-violet-100 px-3 pt-3 pb-3 shadow-sm z-10 flex items-start justify-between gap-2">
            <h3 class="font-black text-stone-900 text-xs leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors flex-1" style="font-family: 'Fredoka', sans-serif">
              {{ product.title }}
            </h3>
            <span class="font-black text-violet-700 text-sm whitespace-nowrap flex-shrink-0">
              {{ formatPrice(Number(product.price)) }}
            </span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
