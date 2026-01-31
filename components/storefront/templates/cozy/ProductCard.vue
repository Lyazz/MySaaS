<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const props = defineProps<{
    product: any
    viewMode?: 'grid' | 'list'
}>()

const cartStore = useCartStore()
const { format: formatPrice } = useCurrency()

// Ensure image exists
const mainImage = computed(() => {
    if (props.product?.productImages?.length > 0) return props.product.productImages[0].url
    if (props.product?.images?.length > 0) return props.product.images[0]
    return 'https://placehold.co/600x600/e2e8f0/64748b?text=Cozy'
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
        class="group relative bg-white rounded-[2rem] p-4 transition-all duration-500 hover:shadow-xl hover:shadow-brand-100/50 hover:-translate-y-1"
        :class="[ viewMode === 'list' ? 'flex gap-6 items-center' : 'flex flex-col' ]"
        @mouseenter="isHovered = true"
        @mouseleave="isHovered = false"
    >
        <!-- Image Container -->
        <div 
            class="relative overflow-hidden rounded-[1.5rem] bg-slate-50 aspect-square"
            :class="[ viewMode === 'list' ? 'w-48 mb-0' : 'w-full mb-4' ]"
        >
            <NuxtLink :to="`/p/${product.slug}`" class="block w-full h-full">
                 <img 
                    :src="mainImage" 
                    :alt="product.title" 
                    class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                >
            </NuxtLink>
            
            <!-- Floating Add Button -->
            <button 
                @click.prevent="handleAddToCart"
                class="absolute bottom-4 right-4 w-12 h-12 bg-white/90 backdrop-blur-md text-brand-600 rounded-full flex items-center justify-center shadow-lg transform translate-y-16 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-brand-500 hover:text-white"
            >
                <Icon name="lucide:plus" class="w-6 h-6" />
            </button>
        </div>

        <!-- Details -->
        <div class="flex-grow flex flex-col items-center text-center">
            <div class="text-[10px] font-bold tracking-widest text-brand-400 uppercase mb-2">
                {{ product.category?.title || 'Essentials' }}
            </div>
            
            <h3 class="font-cozy font-bold text-lg text-slate-700 mb-2 leading-tight">
                <NuxtLink :to="`/p/${product.slug}`">
                    {{ product.title }}
                </NuxtLink>
            </h3>
            
            <span class="font-bold text-brand-600 bg-brand-50 px-4 py-1 rounded-full text-sm mt-auto">
                {{ formatPrice(product.price) }}
            </span>
        </div>
    </div>
</template>
