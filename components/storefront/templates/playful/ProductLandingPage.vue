<script setup lang="ts">
import { useCartStore } from '~/stores/cart';
import ProductGallery from './partials/ProductGallery.vue';
import ProductDetails from './partials/ProductDetails.vue';
import ProductOrderForm from './partials/ProductOrderForm.vue';
import {
  findBestVariantForSelection,
  getPreferredInitialSelection,
  type SelectedOptions,
} from './variant-ux';
import { buildScopedProductPricing } from '~/shared/pricing/product-pricing';

const props = defineProps<{
  product: any;
}>();

const cartStore = useCartStore();
const storefrontContent = useStorefrontContent();
const storeSettings = useState<any>('storeSettings');
const { currencyCode, format: formatPrice } = useCurrency();
const cartEnabled = computed(() => storeSettings.value?.cartEnabled !== false);

const selectedOptions = ref<SelectedOptions>({});

watch(
  () => props.product,
  (newProduct) => {
    if (!newProduct?.options || newProduct.options.length === 0) {
      selectedOptions.value = {};
      return;
    }
    selectedOptions.value = getPreferredInitialSelection(newProduct);
  },
  { immediate: true }
);

const currentVariant = computed(() => {
  if (!props.product?.variants || props.product.variants.length === 0)
    return null;
  if (!props.product?.options || props.product.options.length === 0)
    return props.product.variants[0] ?? null;
  if (Object.keys(selectedOptions.value).length === 0) return null;
  return findBestVariantForSelection({
    product: props.product,
    selectedOptions: selectedOptions.value,
  });
});

const currentPrice = computed(() =>
  buildScopedProductPricing(props.product, currentVariant.value).effectivePrice
);

const currentStock = computed(() => {
  if (!currentVariant.value) return props.product?.stock;
  if (currentVariant.value.trackInventory === false)
    return Number.POSITIVE_INFINITY;
  const stock = Number(currentVariant.value.stock ?? 0);
  const reserved = Number(currentVariant.value.reserved ?? 0);
  const safety = Number(currentVariant.value.safetyStock ?? 0);
  return Math.max(stock - reserved - safety, 0);
});

const images = computed(() => {
  if (currentVariant.value?.images?.length > 0)
    return currentVariant.value.images.map((vi: any) => vi.image.url);
  if (props.product?.productImages?.length > 0)
    return props.product.productImages.map((pi: any) => pi.url);
  if (props.product?.images?.length > 0) return props.product.images;
  return ['/blank.svg?v=2'];
});

const cartImage = computed(() => images.value[0]);

watch([() => props.product, selectedOptions], ([product]) => {
  if (!product?.variants || product.variants.length === 0) return;
  const best = findBestVariantForSelection({
    product,
    selectedOptions: selectedOptions.value,
  });
  if (!best) selectedOptions.value = getPreferredInitialSelection(product);
});

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
    class="bg-[#fffbf0] min-h-screen py-6 pb-28 md:pb-10 overflow-x-hidden"
    style="font-family: 'DM Sans', sans-serif"
  >
    <!-- Full-width description -->
    <div class="w-full mb-8 animate-fade-in-up">
      <SafeRichText
        v-if="product?.description"
        class="prose prose-lg md:prose-xl prose-img:rounded-3xl prose-img:w-full max-w-none text-stone-800"
        :html="product.description"
      />
      <p v-else class="text-stone-500 text-lg leading-relaxed px-4">
        Experience premium quality with our latest collection.
      </p>
    </div>

    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
        <!-- Gallery -->
        <div class="lg:col-span-6 mb-8 lg:mb-0 relative z-10">
          <ProductGallery :images="images" :title="product?.title" />
        </div>

        <!-- Details + Form -->
        <div
          class="lg:col-span-6 flex flex-col gap-7 lg:sticky lg:top-8 bg-white rounded-3xl border-3 border-violet-100 shadow-[0_4px_0_0_#ddd6fe] p-6 md:p-8"
        >
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

    <!-- Mobile sticky bar -->
    <Transition
      enter-active-class="transform transition ease-out duration-300"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
    >
      <div
        class="fixed bottom-4 left-4 right-4 lg:hidden z-40 flex items-center justify-between p-4 bg-[#fffbf0] border-3 border-violet-100 rounded-3xl shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.15)]"
      >
        <div class="flex flex-col">
          <span class="text-xs text-stone-500 font-medium">{{
            storefrontContent.productForm.totalPrice
          }}</span>
          <span
            class="font-black text-violet-700 text-xl leading-none"
            style="font-family: 'Fredoka', sans-serif"
            >{{ formatPrice(currentPrice) }}</span
          >
        </div>
        <button
          class="bg-amber-400 text-amber-900 px-7 py-3.5 rounded-full font-black border-3 border-amber-300 shadow-[0_4px_0_0_#d97706] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2"
          style="font-family: 'Fredoka', sans-serif"
          @click="() => window.scrollTo({ top: 0, behavior: 'smooth' })"
        >
          <Icon name="lucide:arrow-up" class="w-4 h-4 stroke-[2.5]" />
          {{ storefrontContent.actions.orderNow }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
