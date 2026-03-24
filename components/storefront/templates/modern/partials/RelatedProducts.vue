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
  return product?.images?.[0] || 'https://placehold.co/600x400'
}
</script>

<template>
  <div v-if="products && products.length > 0" class="mt-16 border-t border-slate-200 pt-12 animate-fade-in-up">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-2xl font-bold text-slate-900 tracking-tight">{{ $t('storefront.product.youMayAlsoLike') }}</h2>
      </div>

      <!-- Mobile Horizontal Scroll / Desktop Grid -->
      <div class="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div class="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory pb-6 sm:pb-0 scrollbar-hide">
          
          <NuxtLink 
            v-for="product in products" 
            :key="product.id"
            :to="`/p/${product.slug}`"
            class="group bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-lg hover:border-brand-200 transition-all duration-300 flex flex-col flex-none w-[260px] sm:w-auto snap-center sm:snap-none"
          >
            <!-- Image Container -->
            <div class="aspect-square bg-slate-50 rounded-xl overflow-hidden mb-4 relative z-0">
              <img 
                :src="getProductMainImage(product)" 
                :alt="product.title"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div class="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors duration-300 z-10" />
            </div>

            <!-- Content -->
            <div class="flex flex-col flex-grow">
              <h3 class="text-slate-900 font-bold text-base line-clamp-2 mb-2 group-hover:text-brand-600 transition-colors">
                {{ product.title }}
              </h3>
              
              <div class="mt-auto flex items-center justify-between">
                <span class="text-lg font-black text-brand-600">
                  {{ formatPrice(Number(product.price)) }}
                </span>
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-full group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
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
