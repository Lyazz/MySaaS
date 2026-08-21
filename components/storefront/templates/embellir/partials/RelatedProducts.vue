<script setup lang="ts">
import { useCurrency } from '~/composables/useCurrency'

defineProps<{
  products: any[]
}>()

const { format: formatPrice } = useCurrency()
const { t } = useI18n({ useScope: 'global' })

const getProductMainImage = (product: any) => {
  if (product?.productImages && product.productImages.length > 0) {
    const main = product.productImages.find((img: any) => img?.isMain)
    return main?.url || product.productImages[0]?.url
  }
  return product?.images?.[0] || '/blank.svg?v=2'
}
</script>

<template>
  <section v-if="products && products.length > 0" class="bg-[#F2ECE1] pb-16 md:pb-24">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-4 text-[#CBBDAB] mb-10">
        <span class="h-px flex-1 bg-current" />
        <span class="emb-star w-3.5 h-3.5 text-[#DFA254]" />
        <span class="h-px flex-1 bg-current" />
      </div>

      <h2 class="emb-display text-2xl md:text-3xl text-[#16211E] mb-8">
        {{ t('storefront.product.youMayAlsoLike') }}
      </h2>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-7">
        <NuxtLink
          v-for="product in products"
          :key="product.id"
          :to="`/product/${product.slug}`"
          class="group flex flex-col"
        >
          <div class="emb-plate aspect-square w-full">
            <div class="emb-plate-inner emb-glaze-sweep bg-[#F2ECE1]">
              <img
                :src="getProductMainImage(product)"
                :alt="product.title"
                class="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
              >
            </div>
          </div>

          <h3 class="mt-4 text-[15px] font-medium text-[#16211E] line-clamp-2 group-hover:text-brand-700 transition-colors">
            {{ product.title }}
          </h3>
          <span class="emb-display text-lg text-brand-700 tabular-nums mt-2">
            {{ formatPrice(Number(product.price)) }}
          </span>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
