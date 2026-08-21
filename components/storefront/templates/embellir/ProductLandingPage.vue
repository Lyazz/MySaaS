<script setup lang="ts">
import ProductGallery from './partials/ProductGallery.vue';
import ProductDetails from './partials/ProductDetails.vue';
import ProductOrderForm from './partials/ProductOrderForm.vue';

const props = defineProps<{
  product: any;
}>();

const storefrontContent = useStorefrontContent();
const storeSettings = useState<any>('storeSettings');
const { format: formatPrice } = useCurrency();
const cartEnabled = computed(() => storeSettings.value?.cartEnabled !== false);

// Option Selection Logic (Cloned from Product.vue for reusability of logic)
const selectedOptions = ref<Record<string, string>>({});

// Initialize options
watch(
  () => props.product,
  (newProduct) => {
    if (!newProduct?.options || newProduct.options.length === 0) {
      selectedOptions.value = {};
      return;
    }
    selectedOptions.value = {};
  },
  { immediate: true }
);

const currentVariant = computed(() => {
  if (!props.product?.variants || props.product.variants.length === 0)
    return null;
  if (!props.product?.options || props.product.options.length === 0)
    return props.product.variants[0] ?? null;
  if (Object.keys(selectedOptions.value).length === 0) return null;

  return props.product.variants.find((v: any) => {
    return v.optionValues.every(
      (ov: any) =>
        selectedOptions.value[ov.optionValue.optionId] === ov.optionValueId
    );
  });
});

const currentPrice = computed(() => {
  return currentVariant.value
    ? Number(currentVariant.value.price)
    : Number(props.product?.price || 0);
});

const currentStock = computed(() => {
  if (!currentVariant.value) return props.product?.stock;
  if (currentVariant.value.trackInventory === false)
    return Number.POSITIVE_INFINITY;
  const stock = Number(currentVariant.value.stock ?? 0);
  const reserved = Number(currentVariant.value.reserved ?? 0);
  const safety = Number(currentVariant.value.safetyStock ?? 0);
  return Math.max(stock - reserved - safety, 0);
});

// Image Gallery Logic
const images = computed(() => {
  if (
    currentVariant.value &&
    currentVariant.value.images &&
    currentVariant.value.images.length > 0
  ) {
    return currentVariant.value.images.map((vi: any) => vi.image.url);
  }
  if (props.product?.productImages && props.product.productImages.length > 0) {
    return props.product.productImages.map((pi: any) => pi.url);
  }
  if (props.product?.images && props.product.images.length > 0) {
    return props.product.images;
  }
  return ['/blank.svg?v=2'];
});

const cartImage = computed(() => images.value[0]);

const activeLoyaltyPreview = useActiveProductLoyaltyPreview()

watchEffect(() => {
    activeLoyaltyPreview.setPreview((currentVariant.value?.loyaltyPreview ?? props.product?.loyaltyPreview ?? null) as any)
})

onUnmounted(() => {
    activeLoyaltyPreview.reset()
})

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="bg-[#F2ECE1] min-h-screen pb-24 md:pb-12 overflow-x-hidden w-full">
    <!-- Description first: the landing page leads with the merchant's own pitch -->
    <div class="w-full mb-10">
      <SafeRichText
        v-if="product?.description"
        class="prose prose-lg md:prose-xl prose-img:w-full max-w-none text-[#16211E]"
        :html="product.description"
      />
      <p v-else class="text-[#5A6763] text-lg leading-relaxed px-4">
        {{ storefrontContent.product.descriptionFallback }}
      </p>
    </div>

    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
        <div class="lg:col-span-7 mb-10 lg:mb-0">
          <ProductGallery :images="images" :title="product?.title" />
        </div>

        <div class="lg:col-span-5 flex flex-col gap-8 lg:sticky lg:top-8">
          <ProductDetails
            v-model:selected-options="selectedOptions"
            :product="product"
            :current-price="currentPrice"
            :hide-option-selectors="true"
          />

          <ProductOrderForm
            :product="product"
            :current-variant="currentVariant"
            :current-price="currentPrice"
            :current-stock="currentStock"
            :active-image="cartImage"
          />
        </div>
      </div>
    </div>

    <!-- Mobile bar -->
    <div
      v-if="cartEnabled"
      class="fixed bottom-0 inset-x-0 z-40 p-3 bg-[#FDFAF4] border-t border-[#CBBDAB] md:hidden flex items-center gap-3"
    >
      <div class="flex flex-col min-w-0">
        <span class="emb-label text-[#8E9793]">{{ storefrontContent.productForm.totalPrice }}</span>
        <span class="emb-display text-lg text-brand-700 leading-tight tabular-nums truncate">
          {{ formatPrice(Number(product?.price || 0)) }}
        </span>
      </div>
      <button
        type="button"
        class="flex-1 h-12 bg-brand-600 text-[#FDFAF4] emb-label hover:bg-[#DFA254] hover:text-[#062622] transition-colors flex items-center justify-center gap-2"
        @click="scrollToTop"
      >
        <span>{{ storefrontContent.actions.orderNow }}</span>
        <Icon name="lucide:arrow-up" class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
