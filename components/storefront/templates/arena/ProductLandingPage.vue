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
  <div class="bg-[#06080c] min-h-screen pb-28 md:pb-12 overflow-x-hidden w-full text-slate-300">
    <!-- HUD signal strip -->
    <div class="bg-black border-b border-white/[0.06]">
      <div class="h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-60" />
      <div class="max-w-[1400px] mx-auto px-5 lg:px-10 py-3 flex items-center gap-3">
        <Icon name="lucide:zap" class="w-3.5 h-3.5 text-brand-500" />
        
        <span class="hidden md:inline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 ml-3">{{ product?.title }}</span>
      </div>
    </div>

    <!-- Full-width rich description hero -->
    <div v-if="product?.description" class="w-full animate-fade-in-up">
      <SafeRichText
        class="prose prose-invert prose-lg md:prose-xl prose-img:w-full prose-img:my-0 prose-headings:text-white prose-headings:uppercase prose-headings:tracking-tight prose-p:text-slate-300 prose-strong:text-white prose-a:text-brand-500 max-w-none"
        :html="product.description"
      />
    </div>
    <div v-else class="w-full bg-black border-b border-white/[0.06] animate-fade-in-up">
      <div class="max-w-[1400px] mx-auto px-5 lg:px-10 py-12">
        <p class="flex items-center gap-3 mb-3">
          <span class="w-8 h-px bg-brand-500" />
          
        </p>
        <p class="text-base lg:text-lg text-slate-400 leading-relaxed max-w-3xl">
          
        </p>
      </div>
    </div>

    <!-- Order section -->
    <div class="max-w-[1400px] mx-auto px-5 lg:px-10 py-12 lg:py-20">
      <div class="lg:grid lg:grid-cols-12 lg:gap-10 xl:gap-14 items-start">
        <div class="lg:col-span-7 mb-8 lg:mb-0 animate-fade-in-up">
          <div class="relative bg-[#0b0f14] border border-white/[0.06] p-4 lg:p-6">
            <span class="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-brand-500" />
            <span class="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-brand-500" />
            <span class="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-brand-500" />
            <ProductGallery :images="images" :title="product?.title" />
          </div>
        </div>

        <div class="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-24 animate-fade-in-up" style="animation-delay: 0.1s">
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

    <!-- Mobile sticky CTA -->
    <div
      v-if="cartEnabled"
      class="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-[#0b0f14] border-t border-brand-500/30 backdrop-blur"
    >
      <div class="h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
      <div class="px-4 py-3 flex items-center justify-between gap-3">
        <div class="flex flex-col min-w-0">
          <span class="text-[9px] font-black uppercase tracking-[0.28em] text-brand-500">{{ storefrontContent.productForm.totalPrice }}</span>
          <span class="text-xl font-black text-white tracking-[-0.02em] truncate">{{ formatPrice(Number(product?.price || 0)) }}</span>
        </div>
        <button
          onclick="window.scrollTo({ top: 0, behavior: 'smooth' })"
          class="inline-flex items-center gap-2 bg-brand-500 text-[#02060a] px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] hover:bg-white transition-colors [clip-path:polygon(5%_0,100%_0,95%_100%,0_100%)]"
        >
          {{ storefrontContent.actions.orderNow }}
          <Icon name="lucide:arrow-up-right" class="w-3.5 h-3.5" />
        </button>
      </div>
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
