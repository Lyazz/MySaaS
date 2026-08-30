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

const props = defineProps<{
  product: any;
}>();

const cartStore = useCartStore();
const storefrontContent = useStorefrontContent();
const storeSettings = useState<any>('storeSettings');
const { format: formatPrice } = useCurrency();
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

const images = computed(() => {
  if (currentVariant.value?.images?.length > 0) {
    const variantImages = currentVariant.value.images
      .map((vi: any) => vi?.image?.url)
      .filter(Boolean);
    if (variantImages.length > 0) return variantImages;
  }
  if (props.product?.productImages?.length > 0) {
    const prodImages = props.product.productImages
      .map((pi: any) => pi?.url)
      .filter(Boolean);
    if (prodImages.length > 0) return prodImages;
  }
  if (props.product?.images?.length > 0) {
    return props.product.images.filter(Boolean);
  }
  return ['/blank.svg?v=2'];
});

const cartImage = computed(() => images.value[0]);

watch([() => props.product, selectedOptions], ([product]) => {
  if (!product?.variants || product.variants.length === 0) return;
  const best = findBestVariantForSelection({
    product,
    selectedOptions: selectedOptions.value,
  });
  if (!best) {
    selectedOptions.value = getPreferredInitialSelection(product);
  }
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
  <div class="ed-theme pb-28 md:pb-12">
    <!-- Full-width editorial description -->
    <div class="border-b border-[#DAD2C4]">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 py-10 md:py-14">
        <SafeRichText
          v-if="product?.description"
          class="ed-prose text-[17px]"
          :html="product.description"
        />
        <p v-else class="ed-prose text-[17px] text-[#4A4038]">
          {{ storefrontContent.product.descriptionFallback }}
        </p>
      </div>
    </div>

    <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10 md:py-14">
      <div class="lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-16 items-start">
        <div class="lg:col-span-7">
          <ProductGallery :images="images" :title="product?.title" />
        </div>
        <div class="lg:col-span-5 lg:sticky lg:top-24 self-start mt-10 lg:mt-0 space-y-8">
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
    <div
      v-if="cartEnabled"
      class="fixed bottom-0 start-0 w-full px-4 py-3 bg-[#F4EFE6] border-t border-[#262019] md:hidden z-40 flex items-center justify-between gap-4"
    >
      <div class="flex flex-col">
        <span class="ed-ui text-[10px] uppercase tracking-[0.14em] text-[#8A7E6E]">{{ storefrontContent.productForm.totalPrice }}</span>
        <span class="ed-display text-xl text-[#B8532E]">{{ formatPrice(currentPrice) }}</span>
      </div>
      <button
        class="ed-btn-solid"
        onclick="window.scrollTo({ top: 0, behavior: 'smooth' })"
      >
        {{ storefrontContent.actions.orderNow }}
      </button>
    </div>
  </div>
</template>
