<script setup lang="ts">
/*
 * The header search results panel. Extracted so the desktop field and the
 * below-`lg` search row render one implementation rather than two copies that
 * drift apart.
 */
defineProps<{
  loading: boolean
  results: any[]
  hasMore: boolean
}>()

const emit = defineEmits<{
  (e: 'show-more'): void
  (e: 'select'): void
}>()

const storefrontContent = useStorefrontContent()
const { format: formatCurrency } = useCurrency()
</script>

<template>
  <div class="bg-white border border-slate-100 shadow-xl rounded-md overflow-hidden text-start">
    <div
      v-if="loading"
      class="px-4 py-3 text-sm text-slate-500"
    >
      {{ storefrontContent.search.searching }}
    </div>
    <div
      v-else-if="results.length === 0"
      class="px-4 py-3 text-sm text-slate-500"
    >
      {{ storefrontContent.search.noResults }}
    </div>
    <div
      v-else
      class="flex flex-col max-h-[70vh] overflow-y-auto"
    >
      <NuxtLink
        v-for="product in results"
        :key="product.id"
        :to="'/product/' + product.slug"
        class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
        @click="emit('select')"
      >
        <img
          :src="(product.images && product.images.length > 0) ? product.images[0] : '/blank.svg?v=2'"
          :alt="product.title"
          class="w-10 h-10 object-cover rounded shadow-sm"
        >
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-slate-900 truncate">
            {{ product.title }}
          </div>
          <div class="text-xs text-brand-600 font-bold mt-0.5">
            {{ formatCurrency(product.effectivePrice ?? product.price) }}<span
              v-if="product.promotionDiscountPercent"
              class="ms-1 text-[10px] text-rose-600"
            >-{{ product.promotionDiscountPercent }}%</span>
          </div>
        </div>
      </NuxtLink>
      <button
        v-if="hasMore"
        type="button"
        class="w-full px-4 py-3 text-start text-sm font-semibold text-current hover:opacity-80 transition-opacity"
        @mousedown.prevent
        @click="emit('show-more')"
      >
        {{ storefrontContent.search.seeMore }}
      </button>
    </div>
  </div>
</template>
