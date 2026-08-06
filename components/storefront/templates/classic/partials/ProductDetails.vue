<script setup lang="ts">
import {
  getOptionValueState,
  type OptionValueState,
  type SelectedOptions,
} from '../variant-ux';

const props = defineProps<{
  product: any;
  currentPrice: number;
  selectedOptions: SelectedOptions;
}>();

const emit = defineEmits(['update:selectedOptions']);

const storeSettings = useState<any>('storeSettings');
const { format: formatPrice } = useCurrency();

const setOption = (optionId: string, valueId: string) => {
  const newOptions = {
    ...props.selectedOptions,
    [optionId]: valueId,
  };
  emit('update:selectedOptions', newOptions);
};

const optionValueState = (
  optionId: string,
  valueId: string
): OptionValueState => {
  // If variants aren't loaded, don't block selection in the UI.
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
  <div class="flex flex-col animate-fade-in-right space-y-8">
    <!-- Header -->
    <div>
      <h1
        class="text-3xl md:text-5xl font-serif font-bold text-slate-900 tracking-tight leading-tight mb-6"
      >
        {{ product?.title }}
      </h1>

      <div class="flex items-baseline gap-4 mb-4">
        <StorefrontSharedCountdownTimer
          v-if="product?.showCountdown && product?.promotionEndDate"
          :end-date="product.promotionEndDate"
          theme="danger"
          show-icon
          class="mb-4"
        />
        <div class="text-3xl font-serif text-slate-900">
          {{ formatPrice(currentPrice) }}
        </div>
        <div
          v-if="Number(props.product?.price) * 1.2 > 0"
          class="text-lg text-slate-400 line-through decoration-1 decoration-slate-300"
        >
          {{ formatPrice(currentPrice * 1.2) }}
        </div>
      </div>
    </div>

    <!-- Option Selectors -->
    <div
      v-if="product?.options && product.options.length > 0"
      class="space-y-6"
    >
      <div v-for="option in product.options" :key="option.id">
        <label
          class="block text-xs uppercase tracking-widest font-bold text-slate-900 mb-3"
          >{{ option.name }}</label
        >

        <!-- Dropdown Type -->
        <div v-if="option.displayType === 'dropdown'" class="relative max-w-xs">
          <select
            :value="selectedOptions[option.id] || ''"
            @change="
              setOption(option.id, ($event.target as HTMLSelectElement).value)
            "
            class="block w-full h-11 border border-slate-300 bg-white px-4 text-slate-900 focus:border-slate-900 focus:ring-0 transition-all duration-200 outline-none appearance-none cursor-pointer rounded-none"
          >
            <option value="" disabled>{{ option.name }}</option>
            <option
              v-for="value in option.values"
              :key="value.id"
              :value="value.id"
              :disabled="isOptionValueUnavailable(option.id, value.id)"
            >
              {{ value.label }} {{ optionValueSuffix(option.id, value.id) }}
            </option>
          </select>
          <div
            class="absolute end-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500"
          >
            <Icon name="lucide:chevron-down" class="w-4 h-4" />
          </div>
        </div>

        <!-- Color Swatch Type -->
        <div
          v-else-if="option.displayType === 'color'"
          class="flex flex-wrap gap-3"
        >
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            :class="[
              'w-8 h-8 flex items-center justify-center transition-all duration-200 relative',
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'opacity-30 cursor-not-allowed'
                : optionValueState(option.id, value.id) === 'out_of_stock'
                  ? 'opacity-60 cursor-pointer'
                  : 'hover:scale-105 cursor-pointer',
              selectedOptions[option.id] === value.id
                ? 'ring-1 ring-offset-2 ring-slate-900'
                : 'ring-1 ring-slate-200 hover:ring-slate-400',
            ]"
            :style="{ backgroundColor: value.meta || '#eee' }"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="
              `${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()
            "
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <!-- Slash for unavailable / out-of-stock -->
            <div
              v-if="optionValueState(option.id, value.id) !== 'available'"
              class="absolute inset-0 flex items-center justify-center"
            >
              <div
                class="w-full h-px rotate-45 transform"
                :class="
                  optionValueState(option.id, value.id) === 'out_of_stock'
                    ? 'bg-red-500'
                    : 'bg-slate-500'
                "
              />
            </div>
          </button>
        </div>

        <!-- Image Type -->
        <div
          v-else-if="option.displayType === 'image'"
          class="flex flex-wrap gap-3"
        >
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            :class="[
              'w-16 h-16 border transition-all duration-200 overflow-hidden relative',
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'opacity-40 grayscale cursor-not-allowed border-slate-200'
                : optionValueState(option.id, value.id) === 'out_of_stock'
                  ? 'opacity-70 cursor-pointer border-slate-200'
                  : 'hover:border-slate-400 cursor-pointer',
              selectedOptions[option.id] === value.id
                ? 'border-slate-900'
                : 'border-slate-200',
            ]"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="
              `${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()
            "
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <img
              v-if="value.meta"
              :src="value.meta"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-xs text-slate-400">{{ value.label }}</span>
            <div
              v-if="optionValueState(option.id, value.id) === 'out_of_stock'"
              class="absolute inset-x-0 bottom-0 bg-white/90 text-[10px] font-bold text-red-700 uppercase tracking-wider text-center py-0.5"
            >
              Out
            </div>
          </button>
        </div>

        <!-- Radio Buttons -->
        <div v-else-if="option.displayType === 'radio'" class="space-y-2">
          <div
            v-for="value in option.values"
            :key="value.id"
            class="flex items-center"
          >
            <input
              type="radio"
              :id="`${option.id}-${value.id}`"
              :name="option.id"
              :value="value.id"
              :checked="selectedOptions[option.id] === value.id"
              :disabled="isOptionValueUnavailable(option.id, value.id)"
              class="w-4 h-4 text-slate-900 border-slate-300 focus:ring-slate-900 disabled:opacity-50"
              @change="setOptionIfAllowed(option.id, value.id)"
            />
            <label
              :for="`${option.id}-${value.id}`"
              class="ms-2 block text-sm font-medium text-slate-700"
              :class="{
                'text-slate-400 line-through':
                  optionValueState(option.id, value.id) !== 'available',
                'text-red-700':
                  optionValueState(option.id, value.id) === 'out_of_stock',
              }"
            >
              {{ value.label }}
              <span class="text-xs font-normal ms-1">{{
                optionValueSuffix(option.id, value.id)
              }}</span>
            </label>
          </div>
        </div>

        <!-- Default Buttons/Tags -->
        <div v-else class="flex flex-wrap gap-2">
          <button
            v-for="value in option.values"
            :key="value.id"
            class="px-5 py-2 text-xs font-bold uppercase tracking-widest border transition-all duration-200 relative overflow-hidden"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed decoration-slate-300'
                : selectedOptions[option.id] === value.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : optionValueState(option.id, value.id) === 'out_of_stock'
                    ? 'bg-white text-red-700 border-red-200 hover:border-red-300'
                    : 'bg-white text-slate-900 border-slate-200 hover:border-slate-900',
            ]"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="
              `${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()
            "
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <span
              :class="{
                'line-through':
                  optionValueState(option.id, value.id) !== 'available',
              }"
            >
              {{ value.label }}
            </span>
            <span
              v-if="optionValueState(option.id, value.id) !== 'available'"
              class="ms-2 text-[10px] font-semibold"
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
      class="text-slate-600 mb-6 text-base leading-relaxed font-light"
    >
      {{ product.miniDescription }}
    </p>
  </div>
</template>

<style scoped>
.animate-fade-in-right {
  animation: fadeInRight 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
  opacity: 0;
}
@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
