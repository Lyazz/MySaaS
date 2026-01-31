<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const props = defineProps<{
    product: any
    viewMode?: 'grid' | 'list'
}>()

const cartStore = useCartStore()
const { format: formatPrice } = useCurrency()
const { currencyCode } = useCurrency()

// Ensure image exists
const mainImage = computed(() => {
    if (props.product?.productImages?.length > 0) return props.product.productImages[0].url
    if (props.product?.images?.length > 0) return props.product.images[0]
    return 'https://placehold.co/600x600/black/yellow?text=NO+IMAGE'
})

const isHovered = ref(false)

function handleAddToCart() {
  cartStore.addItem({
    productId: props.product.id,
    title: props.product.title,
    slug: props.product.slug,
    price: Number(props.product.price),
    stock: props.product.stock,
    image: mainImage.value
  })
}
</script>

<template>
    <div 
        class="group relative bg-white border-2 border-black transition-all duration-200"
        :class="[
            viewMode === 'list' ? 'flex gap-6 p-4' : 'flex flex-col',
            'hover:shadow-[8px_8px_0px_0px_var(--brand)] hover:-translate-y-1 hover:-translate-x-1'
        ]"
        @mouseenter="isHovered = true"
        @mouseleave="isHovered = false"
    >
        <!-- Badge -->
        <div v-if="product.isNew" class="absolute top-2 left-2 z-10 bg-brand text-black px-3 py-1 border-2 border-black font-street uppercase transform -rotate-2 group-hover:rotate-0 transition-transform">
            NEW DROP
        </div>

        <!-- Image -->
        <div 
            class="relative overflow-hidden border-b-2 border-black aspect-square bg-gray-100"
            :class="[ viewMode === 'list' ? 'w-48 border-2 mb-0' : 'w-full' ]"
        >
            <NuxtLink :to="`/p/${product.slug}`" class="block w-full h-full">
                 <img 
                    :src="mainImage" 
                    :alt="product.title" 
                    class="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all duration-300"
                >
            </NuxtLink>
           
            <!-- Quick Add Overlay (Street Style) -->
            <button 
                @click.prevent="handleAddToCart"
                class="absolute bottom-0 left-0 w-full bg-black text-white py-3 font-street text-xl uppercase tracking-widest translate-y-full group-hover:translate-y-0 transition-transform duration-200 hover:bg-brand hover:text-black border-t-2 border-black"
            >
                Add To Cart
            </button>
        </div>

        <!-- Details -->
        <div class="p-4 flex flex-col flex-grow">
            <h3 class="font-street text-2xl leading-none mb-2 uppercase truncate">
                <NuxtLink :to="`/p/${product.slug}`">
                    {{ product.title }}
                </NuxtLink>
            </h3>
            
            <div class="flex items-center justify-between mt-auto">
                <span class="font-mono font-bold text-lg bg-black text-white px-2 py-0.5">
                    {{ formatPrice(product.price) }}
                </span>
                
                <div class="font-mono text-xs text-gray-500 uppercase">
                    {{ product.category?.title || 'Collection' }}
                </div>
            </div>
        </div>
    </div>
</template>
