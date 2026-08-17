<script setup lang="ts">
import { useCartStore } from '~/stores/cart';
import ProductGallery from './partials/ProductGallery.vue';
import ProductDetails from './partials/ProductDetails.vue';
import ProductOrderForm from './partials/ProductOrderForm.vue';

const props = defineProps<{
  product: any;
}>();

const cartStore = useCartStore();
const storefrontContent = useStorefrontContent();
const storeSettings = useState<any>('storeSettings');
const { currencyCode, format: formatPrice } = useCurrency();
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

// Price Formatting handled by useCurrency

const activeLoyaltyPreview = useActiveProductLoyaltyPreview()

watchEffect(() => {
    activeLoyaltyPreview.setPreview((currentVariant.value?.loyaltyPreview ?? props.product?.loyaltyPreview ?? null) as any)
})

onUnmounted(() => {
    activeLoyaltyPreview.reset()
})
</script>

<template>
  <div
    class="bg-wl-paper min-h-screen py-6 font-wellness pb-24 md:pb-10 overflow-x-hidden w-full text-wl-ink"
  >
    <!-- Description Section (Raw & Full Width & No Margins) -->
    <div class="w-full mb-8 animate-fade-in-up">
      <SafeRichText
        v-if="product?.description"
        class="prose prose-stone prose-lg md:prose-xl prose-img:w-full max-w-none text-wl-ink"
        :html="product.description"
      />
      <!-- Fallback Description -->
      <p v-else class="text-wl-muted text-lg leading-relaxed px-4">
        Experience premium quality with our latest collection.
      </p>
    </div>

    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <!-- NO Header/Breadcrumb as requested -->

      <div class="flex flex-col gap-8">
        <!-- Product Components (Gallery + Details + Form) -->
        <!-- On Desktop, we can use Grid. On Mobile, they stack below description. -->
        <div class="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
          <!-- Left Column: Gallery -->
          <div class="lg:col-span-7 mb-8 lg:mb-0">
            <ProductGallery :images="images" :title="product?.title" />
          </div>

          <!-- Right Column: Details + Form -->
          <div class="lg:col-span-5 flex flex-col gap-8 lg:sticky lg:top-8">
            <ProductDetails
              :product="product"
              :current-price="currentPrice"
              v-model:selected-options="selectedOptions"
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
    </div>

    <!-- Mobile Sticky Bottom Bar (Optional, for Landing Pages) -->
    <div
      v-if="cartEnabled"
      class="fixed bottom-0 left-0 w-full p-4 bg-wl-card border-t border-wl-ruleStrong md:hidden z-40 flex items-center justify-between"
    >
      <div class="flex flex-col">
        <span class="wl-label text-wl-muted">{{
          storefrontContent.productForm.totalPrice
        }}</span>
        <span class="wl-num wl-display-sm text-wl-ink text-lg">{{
          formatPrice(Number(product?.price || 0))
        }}</span>
      </div>
      <!-- Scroll to Form or Add to Cart? For simplicity, scroll to top or just have a CTA -->
      <button
        onclick="window.scrollTo({ top: 0, behavior: 'smooth' })"
        class="bg-wl-ink text-wl-paper px-8 py-3.5 wl-label hover:bg-brand-700 transition-colors"
      >
        {{ storefrontContent.actions.orderNow }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
