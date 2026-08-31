<script setup lang="ts">
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

const storefrontContent = useStorefrontContent();
const { format: formatPrice } = useCurrency();

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

/* Templates cannot reach `window`, so the sticky bar's jump lives here. */
const scrollToTop = () => {
  if (typeof window === 'undefined') return
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="bg-[var(--kw-cream)] min-h-screen py-6 pb-28 md:pb-14 overflow-x-hidden">
    <!-- ══ Merchant's own long-form pitch ═════════════════════════════ -->
    <div class="w-full mb-10">
      <SafeRichText
        v-if="product?.description"
        class="prose prose-lg md:prose-xl prose-img:rounded-[var(--kw-r-xl)] prose-img:w-full max-w-none text-[var(--kw-ink)]"
        :html="product.description"
      />
      <p
        v-else
        class="kw-lede text-lg px-4 max-w-3xl mx-auto text-center"
      >
        {{ storefrontContent.product.descriptionFallback }}
      </p>
    </div>

    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
        <div class="lg:col-span-6 mb-10 lg:mb-0 relative z-10">
          <ProductGallery
            :images="images"
            :title="product?.title"
          />
        </div>

        <div class="lg:col-span-6 kw-card p-6 md:p-8 flex flex-col gap-7">
          <ProductDetails
            v-model:selected-options="selectedOptions"
            :product="product"
            :current-price="currentPrice"
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

    <!-- ══ Mobile jump-to-form bar ════════════════════════════════════ -->
    <div
      class="fixed bottom-4 inset-x-4 lg:hidden z-40 flex items-center justify-between gap-3 p-3.5 bg-white rounded-[var(--kw-r-lg)] border border-[var(--kw-line)]"
      style="box-shadow: 0 -6px 26px -14px rgba(74,46,77,.55)"
    >
      <div class="flex flex-col min-w-0">
        <span class="text-[11px] font-bold text-[var(--kw-ink-soft)]">{{ storefrontContent.productForm.totalPrice }}</span>
        <span class="kw-num text-xl text-[var(--kw-pink-deep)] leading-none">{{ formatPrice(currentPrice) }}</span>
      </div>
      <button
        type="button"
        class="kw-btn flex-shrink-0"
        @click="scrollToTop"
      >
        <Icon
          name="lucide:arrow-up"
          class="w-4 h-4"
        />
        {{ storefrontContent.actions.orderNow }}
      </button>
    </div>
  </div>
</template>
