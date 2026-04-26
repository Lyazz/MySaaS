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
  <div class="space-y-6">
    <!-- Title Section -->
    <div>
      <span
        class="inline-block px-3 py-1 bg-brand-50 text-brand-500 rounded-full text-xs font-medium mb-3"
      >
        {{ product?.category?.title || 'Collection' }}
      </span>
      <h1
        class="font-cozy font-black text-3xl md:text-4xl text-slate-800 leading-tight mb-4"
      >
        {{ product?.title }}
      </h1>

      <StorefrontSharedCountdownTimer
        v-if="product?.showCountdown && product?.promotionEndDate"
        :end-date="product.promotionEndDate"
        theme="danger"
        show-icon
        class="mb-4"
      />
      <div class="flex items-center gap-4">
        <span class="text-3xl font-bold text-brand-500">
          {{ formatPrice(currentPrice) }}
        </span>
        <span
          v-if="product?.compareAtPrice"
          class="text-xl text-slate-400 line-through"
        >
          {{ formatPrice(product.compareAtPrice) }}
        </span>
      </div>
    </div>

    <!-- Option Selectors -->
    <div
      v-if="product?.options && product.options.length > 0"
      class="space-y-6 pt-6 border-t border-slate-100"
    >
      <div v-for="option in product.options" :key="option.id">
        <label class="block text-sm font-medium text-slate-600 mb-3">{{
          option.name
        }}</label>

        <!-- Dropdown Type -->
        <div v-if="option.displayType === 'dropdown'" class="relative max-w-xs">
          <select
            :value="selectedOptions[option.id] || ''"
            @change="
              setOption(option.id, ($event.target as HTMLSelectElement).value)
            "
            class="block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none appearance-none cursor-pointer"
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
            class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
          >
            <Icon name="lucide:chevron-down" class="w-5 h-5" />
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
              'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 relative',
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'opacity-30 cursor-not-allowed border-slate-200'
                : optionValueState(option.id, value.id) === 'out_of_stock'
                  ? 'opacity-60 cursor-pointer border-slate-200'
                  : 'hover:scale-110 cursor-pointer border-slate-200',
              selectedOptions[option.id] === value.id
                ? 'ring-2 ring-offset-2 ring-brand-400 scale-110 border-brand-400'
                : '',
            ]"
            :style="{ backgroundColor: value.meta || '#eee' }"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="
              `${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()
            "
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <Icon
              v-if="selectedOptions[option.id] === value.id"
              name="lucide:check"
              class="w-5 h-5 text-white drop-shadow-sm"
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
                    : 'bg-slate-400'
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
              'w-16 h-16 rounded-xl border-2 transition-all duration-200 overflow-hidden relative',
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'opacity-40 grayscale cursor-not-allowed border-slate-200'
                : optionValueState(option.id, value.id) === 'out_of_stock'
                  ? 'opacity-70 cursor-pointer border-slate-200'
                  : 'hover:shadow-lg cursor-pointer border-slate-200',
              selectedOptions[option.id] === value.id
                ? 'border-brand-400 ring-2 ring-brand-200 shadow-lg'
                : '',
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
              class="absolute inset-x-1 bottom-1 bg-white/90 text-[10px] font-medium text-red-500 px-1 py-0.5 rounded"
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
              class="w-4 h-4 text-brand-500 border-slate-300 focus:ring-brand-200 disabled:opacity-50"
              @change="setOptionIfAllowed(option.id, value.id)"
            />
            <label
              :for="`${option.id}-${value.id}`"
              class="ml-3 text-sm"
              :class="{
                'text-slate-400 line-through':
                  optionValueState(option.id, value.id) !== 'available',
                'text-red-500':
                  optionValueState(option.id, value.id) === 'out_of_stock',
                'text-slate-700':
                  optionValueState(option.id, value.id) === 'available',
              }"
            >
              {{ value.label }}
              <span class="text-xs">{{
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
            class="px-4 py-2 rounded-full text-sm font-medium transition-all"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                : selectedOptions[option.id] === value.id
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-200'
                  : optionValueState(option.id, value.id) === 'out_of_stock'
                    ? 'bg-slate-100 text-red-500 hover:bg-red-50'
                    : 'bg-slate-100 text-slate-700 hover:bg-brand-50 hover:text-brand-600',
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
          </button>
        </div>
      </div>
    </div>

    <!-- Mini Description -->
    <p
      v-if="product?.miniDescription"
      class="text-slate-500 leading-relaxed pt-4 border-t border-slate-100"
    >
      {{ product.miniDescription }}
    </p>
  </div>
</template>
