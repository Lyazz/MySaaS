<script setup lang="ts">
const props = defineProps<{ products: any[] }>()

const { format: formatPrice } = useCurrency()

const getProductMainImage = (product: any) => {
    if (product?.productImages?.length > 0) {
        const main = product.productImages.find((img: any) => img?.isMain)
        return main?.url || product.productImages[0]?.url
    }
    return product?.images?.[0] || '/blank.svg'
}
</script>

<template>
    <div v-if="products && products.length > 0" class="mt-16 pt-12 border-t" style="border-color:rgba(212,197,169,0.08);">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between mb-10">
                <div class="flex items-center gap-4">
                    <div class="w-8 h-px" style="background-color:#A67C52;"></div>
                    <h2 class="text-xl font-light tracking-[0.15em] uppercase" style="color:#E8E0D5; font-family:'Cormorant Garamond',serif;">{{ $t('storefront.product.youMayAlsoLike') }}</h2>
                </div>
            </div>

            <div class="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-5 overflow-x-auto snap-x snap-mandatory pb-6 sm:pb-0 scrollbar-hide">
                <NuxtLink 
                    v-for="product in products" 
                    :key="product.id"
                    :to="`/p/${product.slug}`"
                    class="group flex flex-col flex-none w-[230px] sm:w-auto snap-center sm:snap-none border transition-all duration-300 overflow-hidden"
                    style="background-color:#131720; border-color:rgba(212,197,169,0.08); border-radius:2px;"
                >
                    <div class="aspect-square overflow-hidden relative" style="background-color:#1A1F2E;">
                        <img 
                            :src="getProductMainImage(product)" 
                            :alt="product.title"
                            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style="background:linear-gradient(to top,rgba(8,11,18,0.35),transparent);" />
                    </div>

                    <div class="p-4 flex flex-col flex-grow">
                        <h3 class="font-light text-sm leading-snug line-clamp-2 mb-3 transition-colors tracking-wide" style="color:#C2B89A; font-family:'Cormorant Garamond',serif;">
                            {{ product.title }}
                        </h3>
                        <div class="mt-auto flex items-center justify-between">
                            <span class="text-base font-medium" style="color:#D4C5A9;">{{ formatPrice(Number(product.price)) }}</span>
                            <span class="text-[10px] font-medium uppercase tracking-wider px-2 py-1 border transition-colors" style="color:#A67C52; border-color:rgba(166,124,82,0.2); border-radius:1px;">
                                {{ $t('common.view') }}
                            </span>
                        </div>
                    </div>
                </NuxtLink>
            </div>
        </div>
    </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
