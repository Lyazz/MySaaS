<script setup lang="ts">
import { useCurrency } from '~/composables/useCurrency'

defineProps<{
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

const tints = ['var(--kw-pink-soft)', 'var(--kw-sky-soft)', 'var(--kw-lemon-soft)', 'var(--kw-mint-soft)', 'var(--kw-lilac-soft)']
const tintAt = (index: number) => tints[index % tints.length]
</script>

<template>
  <section
    v-if="products && products.length > 0"
    class="kw-band-lilac mt-20 py-14 md:py-20"
  >
    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-3 mb-9">
        <span
          class="w-2.5 h-2.5 rounded-full"
          style="background: var(--kw-pink)"
        />
        <h2 class="kw-display text-2xl md:text-3xl">
          {{ $t('storefront.product.youMayAlsoLike') }}
        </h2>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-8">
        <NuxtLink
          v-for="(product, index) in products"
          :key="product.id"
          :to="`/product/${product.slug}`"
          class="group flex flex-col"
        >
          <div
            class="relative w-full aspect-[4/5] rounded-[var(--kw-r-lg)] overflow-hidden transition-transform duration-400 group-hover:-translate-y-1.5"
            :style="{ background: tintAt(index) }"
          >
            <img
              :src="getProductMainImage(product)"
              :alt="product.title"
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            >
          </div>

          <div class="pt-3.5 px-1 flex items-start justify-between gap-3">
            <h3 class="kw-title text-sm leading-snug line-clamp-2 group-hover:text-[var(--kw-pink-deep)] transition-colors">
              {{ product.title }}
            </h3>
            <span class="kw-num text-sm text-[var(--kw-pink-deep)] whitespace-nowrap flex-shrink-0">{{ formatPrice(Number(product.price)) }}</span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
