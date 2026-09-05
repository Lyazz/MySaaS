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
    class="bg-slate-50 min-h-screen py-6 font-sans pb-24 md:pb-10 overflow-x-hidden w-full"
  >
    <!-- Description Section (Raw & Full Width & No Margins) -->
    <div class="w-full mb-8 animate-fade-in-up">
      <CommonSafeRichText
        v-if="product?.description"
        class="prose prose-lg md:prose-xl prose-img:rounded-xl prose-img:w-full prose-img:shadow-sm max-w-none text-slate-800"
        :html="product.description"
      />
      <!-- Fallback Description -->
      <p v-else class="text-slate-600 text-lg leading-relaxed px-4">
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
    </div>

    <!-- Mobile Sticky Bottom Bar (Optional, for Landing Pages) -->
    <div
      v-if="cartEnabled"
      class="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-slate-100 md:hidden z-40 flex items-center justify-between shadow-[0_-5px_15px_rgba(0,0,0,0.05)]"
    >
      <div class="flex flex-col">
        <span class="text-xs text-slate-500 font-medium">{{
          storefrontContent.productForm.totalPrice
        }}</span>
        <span class="font-bold text-brand-600 text-lg">{{
          formatPrice(Number(product?.price || 0))
        }}</span>
      </div>
      <!-- Scroll to Form or Add to Cart? For simplicity, scroll to top or just have a CTA -->
      <button
        onclick="window.scrollTo({ top: 0, behavior: 'smooth' })"
        class="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20"
      >
        {{ storefrontContent.actions.orderNow }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* `forwards` from `opacity: 0` hides SSR content until the animation runs. */
@media (prefers-reduced-motion: no-preference) {
    .animate-fade-in-up {
        animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
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
