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
const { currencyCode, format: formatPrice } = useCurrency();
const cartEnabled = computed(() => storeSettings.value?.cartEnabled !== false);

// Option Selection Logic
const selectedOptions = ref<SelectedOptions>({});

// Initialize options
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

// Recovery watch
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
  <div
    class="synthwave-landing min-h-screen py-6 font-sans pb-24 md:pb-10 overflow-x-hidden w-full relative"
  >
    <!-- Synthwave Background -->
    <div class="fixed inset-0 z-0 pointer-events-none">
      <!-- Gradient background -->
      <div
        class="absolute inset-0 bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0515]"
      ></div>
      <!-- Sun/horizon glow -->
      <div
        class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[50%] bg-gradient-to-t from-[#ff2d95]/20 via-[#ff6b35]/10 to-transparent"
      ></div>
      <!-- Grid floor -->
      <div
        class="absolute bottom-0 left-0 right-0 h-[40%] bg-[linear-gradient(rgba(255,45,149,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,45,149,0.15)_1px,transparent_1px)] bg-[size:40px_40px] [perspective:500px] [transform:rotateX(60deg)] origin-bottom opacity-60"
      ></div>
    </div>

    <!-- Description Section -->
    <div class="relative z-10 w-full mb-8 animate-fade-in-up">
      <CommonSafeRichText
        v-if="product?.description"
        class="prose prose-lg md:prose-xl prose-invert prose-img:rounded-xl prose-img:w-full prose-img:shadow-lg prose-p:text-purple-100/90 prose-headings:text-transparent prose-headings:bg-clip-text prose-headings:bg-gradient-to-r prose-headings:from-pink-400 prose-headings:to-orange-400 max-w-none"
        :html="product.description"
      />
      <p v-else class="text-purple-200/80 text-lg leading-relaxed px-4">
        Experience premium quality with our latest collection.
      </p>
    </div>

    <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
      <div class="flex flex-col gap-8">
        <div class="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
          <!-- Left Column: Gallery -->
          <div class="lg:col-span-7 mb-8 lg:mb-0">
            <div class="relative">
              <!-- Neon border glow -->
              <div
                class="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-2xl blur opacity-30"
              ></div>
              <div
                class="relative bg-[#1a0a2e]/90 rounded-2xl border border-pink-500/30 overflow-hidden backdrop-blur-sm"
              >
                <ProductGallery :images="images" :title="product?.title" />
              </div>
            </div>
          </div>

          <!-- Right Column: Details + Form -->
          <div class="lg:col-span-5 flex flex-col gap-8 lg:sticky lg:top-8">
            <div class="relative">
              <div
                class="absolute -inset-1 bg-gradient-to-br from-orange-500/30 to-pink-500/30 rounded-2xl blur"
              ></div>
              <div
                class="relative bg-[#1a0a2e]/95 rounded-2xl border border-orange-500/30 p-6 backdrop-blur-sm"
              >
                <ProductDetails
                  :product="product"
                  :current-price="currentPrice"
                  v-model:selected-options="selectedOptions"
                />
              </div>
            </div>

            <div class="relative">
              <div
                class="absolute -inset-1 bg-gradient-to-br from-cyan-500/30 to-pink-500/30 rounded-2xl blur"
              ></div>
              <div
                class="relative bg-[#1a0a2e]/95 rounded-2xl border border-cyan-500/30 p-6 backdrop-blur-sm"
              >
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
      </div>
    </div>

    <!-- Mobile Sticky Bottom Bar -->
    <div
      v-if="cartEnabled"
      class="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-r from-[#1a0a2e] to-[#2d1b4e] border-t border-pink-500/30 md:hidden z-40 flex items-center justify-between shadow-[0_-5px_30px_rgba(255,45,149,0.2)] backdrop-blur-md"
    >
      <div class="flex flex-col">
        <span
          class="text-xs text-purple-300/70 font-medium uppercase tracking-wider"
          >{{ storefrontContent.productForm.totalPrice }}</span
        >
        <span
          class="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 text-lg"
          >{{ formatPrice(Number(product?.price || 0)) }}</span
        >
      </div>
      <button
        onclick="window.scrollTo({ top: 0, behavior: 'smooth' })"
        class="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:from-pink-600 hover:to-orange-600 transition-all shadow-lg shadow-pink-500/30 uppercase tracking-wide"
      >
        {{ storefrontContent.actions.orderNow }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.synthwave-landing {
  font-family: 'Inter', system-ui, sans-serif;
}

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
