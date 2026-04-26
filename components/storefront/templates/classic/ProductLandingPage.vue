<script setup lang="ts">
import { useCartStore } from '~/stores/cart';
import ProductGallery from './partials/ProductGallery.vue';
import ProductDetails from './partials/ProductDetails.vue';
import ProductOrderForm from './partials/ProductOrderForm.vue';
import { buildProductPricing } from '~/shared/pricing/product-pricing';

const props = defineProps<{
  product: any;
}>();

const cartStore = useCartStore();
const storefrontContent = useStorefrontContent();
const storeSettings = useState<any>('storeSettings');
const { currencyCode, format: formatPrice } = useCurrency();
const cartEnabled = computed(() => storeSettings.value?.cartEnabled !== false);

// Option Selection Logic
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
  if (currentVariant.value) {
    return buildProductPricing(props.product, currentVariant.value.price)
      .effectivePrice;
  }
  return buildProductPricing(props.product).effectivePrice;
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
</script>

<template>
  <div
    class="bg-white min-h-screen py-10 font-serif pb-24 md:pb-20 overflow-x-hidden w-full"
  >
    <!-- Description Section (Clean & Centered) -->
    <div class="max-w-4xl mx-auto mb-16 animate-fade-in-up px-4 text-center">
      <h1
        class="text-3xl md:text-5xl font-serif font-bold text-slate-900 mb-8 leading-tight"
      >
        {{ product?.title }}
      </h1>
      <SafeRichText
        v-if="product?.description"
        class="prose prose-lg md:prose-xl prose-slate mx-auto prose-img:rounded-none prose-img:w-full prose-headings:font-serif prose-headings:font-bold prose-p:font-light prose-a:text-slate-900"
        :html="product.description"
      />
      <!-- Fallback Description -->
      <p v-else class="text-slate-600 text-xl leading-relaxed font-light">
        Experience premium quality with our latest collection. Designed for
        modern living, this product combines style and functionality seamlessly.
      </p>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6">
      <div class="flex flex-col gap-12">
        <!-- Product Components (Gallery + Details + Form) -->
        <div class="lg:grid lg:grid-cols-12 lg:gap-16 items-start">
          <!-- Left Column: Gallery -->
          <div class="lg:col-span-7 mb-12 lg:mb-0">
            <ProductGallery :images="images" :title="product?.title" />
          </div>

          <!-- Right Column: Details + Form -->
          <div class="lg:col-span-5 flex flex-col gap-10 lg:sticky lg:top-8">
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

    <!-- Mobile Sticky Bottom Bar (Minimal) -->
    <div
      v-if="cartEnabled"
      class="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-slate-100 md:hidden z-40 flex items-center justify-between"
    >
      <div class="flex flex-col">
        <span
          class="text-[10px] font-bold uppercase tracking-widest text-slate-500"
          >{{ storefrontContent.productForm.totalPrice }}</span
        >
        <span class="font-serif font-bold text-slate-900 text-lg">{{
          formatPrice(currentPrice)
        }}</span>
      </div>
      <button
        onclick="window.scrollTo({ top: 0, behavior: 'smooth' })"
        class="bg-slate-900 text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
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
