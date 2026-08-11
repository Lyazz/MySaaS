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
  <div v-if="products && products.length > 0" class="mt-16 border-t border-[#C9A24B]/25 pt-12 animate-fade-in-up bg-[#FAF3EA]">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-2xl font-bold text-[#2E1E20] tracking-tight">{{ $t('storefront.product.youMayAlsoLike') }}</h2>
      </div>

      <!-- Product Grid -->
      <div class="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

          <NuxtLink
            v-for="product in products"
            :key="product.id"
            :to="`/product/${product.slug}`"
            class="group bg-[#FFFDF9] rounded-tl-[32px] rounded-tr-lg rounded-br-[32px] rounded-bl-lg p-4 shadow-sm border border-[#C9A24B]/30 hover:shadow-lg hover:border-brand-300 transition-all duration-300 flex flex-col"
          >
            <!-- Image Container (arch motif) -->
            <div class="aspect-square bg-[#F3E7D8] rounded-tl-[24px] rounded-tr-md rounded-br-[24px] rounded-bl-md overflow-hidden mb-4 relative z-0">
              <img
                :src="getProductMainImage(product)"
                :alt="product.title"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div class="absolute inset-0 bg-[#2E1E20]/0 group-hover:bg-[#2E1E20]/5 transition-colors duration-300 z-10" />
            </div>

            <!-- Content -->
            <div class="flex flex-col flex-grow">
              <h3 class="text-[#2E1E20] font-bold text-base line-clamp-2 mb-2 group-hover:text-brand-700 transition-colors">
                {{ product.title }}
              </h3>

              <div class="mt-auto flex items-center justify-between">
                <span class="text-lg font-black text-brand-700">
                  {{ formatPrice(Number(product.price)) }}
                </span>
                <span class="text-xs font-bold uppercase tracking-wider text-[#6B5850] bg-[#F3E7D8] px-2 py-1 rounded-full group-hover:bg-brand-50 group-hover:text-brand-700 transition-colors">
                  {{ $t('common.view') }}
                </span>
              </div>
            </div>
          </NuxtLink>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Hide scrollbar for Chrome, Safari and Opera */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
/* Hide scrollbar for IE, Edge and Firefox */
.scrollbar-hide {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

.animate-fade-in-up {
    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
