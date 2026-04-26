<script setup lang="ts">
import {
  getOptionValueState,
  type OptionValueState,
  type SelectedOptions,
} from '../../modern/variant-ux';

const props = defineProps<{
  product: any;
  currentPrice: number;
  originalPrice?: number;
  selectedOptions: SelectedOptions;
}>();

const emit = defineEmits(['update:selectedOptions']);

const storeSettings = useState<any>('storeSettings');
const { format: formatPrice } = useCurrency();

const setOption = (optionId: string, valueId: string) => {
  emit('update:selectedOptions', {
    ...props.selectedOptions,
    [optionId]: valueId,
  });
};

const optionValueState = (
  optionId: string,
  valueId: string
): OptionValueState => {
  if (!props.product?.variants || props.product.variants.length === 0)
    return 'available';
  return getOptionValueState({
    product: props.product,
    selectedOptions: props.selectedOptions,
    optionId,
    valueId,
  });
};

const isOptionValueUnavailable = (optionId: string, valueId: string): boolean =>
  optionValueState(optionId, valueId) === 'unavailable';

const optionValueSuffix = (optionId: string, valueId: string): string => {
  const state = optionValueState(optionId, valueId);
  if (state === 'out_of_stock') return '(Out of stock)';
  if (state === 'unavailable') return '(Unavailable)';
  return '';
};

const setOptionIfAllowed = (optionId: string, valueId: string) => {
  if (isOptionValueUnavailable(optionId, valueId)) return;
  setOption(optionId, valueId);
};
</script>

<template>
  <div
    class="flex flex-col space-y-7"
    style="animation: fadeInRight 0.6s ease forwards"
  >
    <!-- Title + Rating -->
    <div>
      <h1
        class="text-3xl md:text-4xl lg:text-5xl font-light tracking-wide leading-tight mb-3"
        style="color: #e8e0d5; font-family: 'Cormorant Garamond', serif"
      >
        {{ product?.title }}
      </h1>

      <div class="flex items-center gap-3 text-sm mb-5">
        <div class="flex" style="color: #a67c52">
          <Icon
            v-for="i in 5"
            :key="i"
            name="lucide:star"
            class="w-3.5 h-3.5 fill-current"
          />
        </div>
        <span class="font-medium" style="color: #d4c5a9">4.9 / 5</span>
        <span style="color: #5a5450">{{
          $t('storefront.product.reviewsCount', { count: 1000 })
        }}</span>
      </div>

      <!-- Price -->
      <div class="flex flex-wrap items-baseline gap-3 mb-5">
        <div
          class="text-4xl font-light tracking-tight"
          style="color: #d4c5a9; font-family: 'Cormorant Garamond', serif"
        >
          {{ formatPrice(currentPrice) }}
        </div>
        <div
          v-if="originalPrice && originalPrice > currentPrice"
          class="text-lg line-through"
          style="color: #4a4540"
        >
          {{ formatPrice(originalPrice) }}
        </div>
        <div
          v-if="originalPrice && originalPrice > currentPrice"
          class="px-2.5 py-1 text-xs font-medium"
          style="background-color: #7a1f0f; color: #fca5a5; border-radius: 1px"
        >
          -{{
            Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
          }}%
        </div>
      </div>

      <StorefrontSharedCountdownTimer
        v-if="product?.showCountdown && product?.promotionEndDate"
        :end-date="product.promotionEndDate"
        theme="danger"
        show-icon
        class="mb-5"
      />

      <!-- Demand badge -->
      <div
        class="flex items-center gap-3 p-3 border"
        style="
          background-color: #1a1f2e;
          border-color: rgba(166, 124, 82, 0.2);
          border-radius: 1px;
        "
      >
        <div class="relative flex h-2.5 w-2.5">
          <span
            class="animate-ping absolute inline-flex h-full w-full rounded-full"
            style="background-color: #a67c52; opacity: 0.6"
          ></span>
          <span
            class="relative inline-flex rounded-full h-2.5 w-2.5"
            style="background-color: #a67c52"
          ></span>
        </div>
        <span class="text-sm" style="color: #8a8070">
          <strong class="font-semibold" style="color: #d4c5a9">{{
            $t('storefront.product.highDemandBadge')
          }}</strong>
          {{ $t('storefront.product.viewingRightNow', { count: 15 }) }}
        </span>
      </div>
    </div>

    <!-- Option Selectors -->
    <div
      v-if="product?.options && product.options.length > 0"
      class="space-y-5"
    >
      <div v-for="option in product.options" :key="option.id">
        <label
          class="block text-xs font-medium tracking-[0.2em] uppercase mb-3"
          style="color: #a67c52"
          >{{ option.name }}</label
        >

        <!-- Dropdown -->
        <div v-if="option.displayType === 'dropdown'" class="relative max-w-xs">
          <select
            :value="selectedOptions[option.id] || ''"
            class="w-full h-11 px-4 text-sm appearance-none cursor-pointer outline-none transistion-all"
            style="
              background-color: #131720;
              border: 1px solid rgba(212, 197, 169, 0.15);
              color: #d4c5a9;
              border-radius: 1px;
            "
            @change="
              setOption(option.id, ($event.target as HTMLSelectElement).value)
            "
          >
            <option value="" disabled>{{ option.name }}</option>
            <option
              v-for="value in option.values"
              :key="value.id"
              :value="value.id"
              :disabled="isOptionValueUnavailable(option.id, value.id)"
              style="background-color: #131720"
            >
              {{ value.label }} {{ optionValueSuffix(option.id, value.id) }}
            </option>
          </select>
          <div
            class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style="color: #7a7060"
          >
            <Icon name="lucide:chevron-down" class="w-4 h-4" />
          </div>
        </div>

        <!-- Color Swatch -->
        <div
          v-else-if="option.displayType === 'color'"
          class="flex flex-wrap gap-3"
        >
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            :class="[
              'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 relative',
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:scale-110 cursor-pointer',
              selectedOptions[option.id] === value.id
                ? 'ring-2 ring-offset-2 scale-110 shadow-md'
                : 'ring-1 ring-black/20',
            ]"
            :style="{
              backgroundColor: value.meta || '#2A3040',
              '--tw-ring-color': '#A67C52',
              '--tw-ring-offset-color': '#0E1117',
            }"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="
              `${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()
            "
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <Icon
              v-if="selectedOptions[option.id] === value.id"
              name="lucide:check"
              class="w-4 h-4 text-white drop-shadow-sm"
            />
            <div
              v-if="optionValueState(option.id, value.id) !== 'available'"
              class="absolute inset-0 flex items-center justify-center"
            >
              <div
                class="w-full h-0.5 rotate-45 transform"
                :class="
                  optionValueState(option.id, value.id) === 'out_of_stock'
                    ? 'bg-red-400'
                    : 'bg-gray-500'
                "
              />
            </div>
          </button>
        </div>

        <!-- Default Buttons -->
        <div v-else class="flex flex-wrap gap-2">
          <button
            v-for="value in option.values"
            :key="value.id"
            class="px-4 py-2 text-sm font-medium border transition-all duration-200 relative"
            :style="
              selectedOptions[option.id] === value.id
                ? 'background-color:#A67C52; color:#fff; border-color:#A67C52; border-radius:1px;'
                : optionValueState(option.id, value.id) === 'out_of_stock'
                  ? 'background-color:transparent; color:#7A4040; border-color:rgba(200,80,80,0.25); border-radius:1px;'
                  : optionValueState(option.id, value.id) === 'unavailable'
                    ? 'background-color:transparent; color:#3A3530; border-color:rgba(212,197,169,0.06); border-radius:1px; cursor:not-allowed;'
                    : 'background-color:#131720; color:#C2B89A; border-color:rgba(212,197,169,0.12); border-radius:1px;'
            "
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <span
              :class="{
                'line-through':
                  optionValueState(option.id, value.id) !== 'available',
              }"
              >{{ value.label }}</span
            >
            <span
              v-if="optionValueState(option.id, value.id) !== 'available'"
              class="ml-2 text-[10px] font-normal"
            >
              {{ optionValueSuffix(option.id, value.id) }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mini Description -->
    <p
      v-if="product?.miniDescription"
      class="text-lg leading-relaxed"
      style="color: #8a8070"
    >
      {{ product.miniDescription }}
    </p>
  </div>
</template>

<style scoped>
@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
