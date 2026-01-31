<script setup lang="ts">
const props = defineProps<{
    product: any
    viewMode?: 'grid' | 'list'
}>()

const emit = defineEmits<{
    (e: 'quick-view', product: any): void
}>()

const { format: formatPrice } = useCurrency()

const primaryImage = computed(() => {
    if (props.product?.productImages?.length > 0) {
        return props.product.productImages[0].url
    }
    if (props.product?.images?.length > 0) {
        return props.product.images[0]
    }
    return 'https://placehold.co/400x400?text=No+Image'
})

const productPrice = computed(() => {
    return formatPrice(Number(props.product?.price || 0))
})

const isInStock = computed(() => {
    const stock = Number(props.product?.stock ?? 0)
    return stock > 0
})
</script>

<template>
  <!-- List View -->
  <div
    v-if="viewMode === 'list'"
    class="group relative flex flex-row gap-6 p-4 bg-[#1a0a2e]/90 rounded-2xl border border-purple-500/30 hover:border-pink-500/50 transition-all overflow-hidden"
  >
    <!-- Glow on hover -->
    <div class="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
    
    <!-- Image -->
    <NuxtLink
      :to="`/p/${product.slug}`"
      class="relative w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-purple-900/30"
    >
      <img
        :src="primaryImage"
        :alt="product.title"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      >
    </NuxtLink>

    <!-- Details -->
    <div class="flex-1 flex flex-col justify-center relative z-10">
      <NuxtLink :to="`/p/${product.slug}`">
        <h3 class="font-bold text-white text-lg group-hover:text-pink-400 transition-colors line-clamp-1 mb-2">
          {{ product.title }}
        </h3>
      </NuxtLink>
      <p class="text-purple-300/60 text-sm line-clamp-2 mb-3">
        {{ product.shortDescription || 'Premium quality product with exceptional design and functionality.' }}
      </p>
      <div class="flex items-center gap-4">
        <span class="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">
          {{ productPrice }}
        </span>
        <span
          v-if="!isInStock"
          class="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-1 rounded-full border border-red-500/30"
        >
          Out of Stock
        </span>
      </div>
    </div>

    <!-- Quick View Button -->
    <div class="flex items-center">
      <button
        type="button"
        class="p-3 rounded-full bg-purple-900/50 border border-purple-500/30 hover:bg-pink-500/20 hover:border-pink-500/50 transition-all"
        title="Quick View"
        @click.prevent="emit('quick-view', product)"
      >
        <Icon name="lucide:eye" class="w-5 h-5 text-purple-300" />
      </button>
    </div>
  </div>

  <!-- Grid View (Default) -->
  <div
    v-else
    class="group relative bg-[#1a0a2e]/90 rounded-2xl border border-purple-500/30 hover:border-pink-500/50 transition-all overflow-hidden"
  >
    <!-- Glow effect -->
    <div class="absolute -inset-0.5 bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
    
    <!-- Image Container -->
    <NuxtLink
      :to="`/p/${product.slug}`"
      class="block relative aspect-square overflow-hidden"
    >
      <img
        :src="primaryImage"
        :alt="product.title"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      >
      
      <!-- Hover overlay -->
      <div class="absolute inset-0 bg-gradient-to-t from-[#1a0a2e]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <!-- Quick View Button -->
      <button
        type="button"
        class="absolute bottom-4 right-4 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-pink-500/30 hover:border-pink-500/50 transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
        title="Quick View"
        @click.prevent="emit('quick-view', product)"
      >
        <Icon name="lucide:eye" class="w-5 h-5 text-white" />
      </button>

      <!-- Stock Badge -->
      <div v-if="!isInStock" class="absolute top-3 left-3 px-3 py-1 bg-red-500/90 text-white text-xs font-bold rounded-full">
        Out of Stock
      </div>
    </NuxtLink>

    <!-- Product Info -->
    <div class="p-4">
      <NuxtLink :to="`/p/${product.slug}`">
        <h3 class="font-bold text-white text-base group-hover:text-pink-400 transition-colors line-clamp-2 mb-2 leading-tight">
          {{ product.title }}
        </h3>
      </NuxtLink>
      
      <div class="flex items-center justify-between">
        <span class="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">
          {{ productPrice }}
        </span>
        
        <!-- Add to Cart mini button -->
        <button
          type="button"
          class="p-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 shadow-lg shadow-pink-500/30 hover:from-pink-600 hover:to-orange-600 transition-all active:scale-95"
          :disabled="!isInStock"
          title="Add to Cart"
        >
          <Icon name="lucide:plus" class="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  </div>
</template>
